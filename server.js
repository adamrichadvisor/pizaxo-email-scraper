const express = require("express");
const cors = require("cors");
const cheerio = require("cheerio");
const dns = require("dns").promises;
const net = require("net");

const app = express();
app.use(cors());
app.use(express.json());

// Cache
const cache = new Map();
const TTL = 86400000;
const getC = (k) => { const e = cache.get(k); return e && Date.now() - e.t < TTL ? e.d : null; };
const setC = (k, d) => cache.set(k, { d, t: Date.now() });

function getDomain(url) {
  if (!url) return null;
  try { return new URL(url.startsWith("http") ? url : "https://" + url).hostname.replace(/^www\./, ""); }
  catch { return null; }
}

const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

function perms(fn, ln, domain) {
  if (!fn || !ln || !domain) return [];
  const f = fn.toLowerCase(), l = ln.toLowerCase(), fi = f[0], li = l[0];
  return [
    f+"."+l+"@"+domain, f+"@"+domain, f+l+"@"+domain,
    fi+l+"@"+domain, fi+"."+l+"@"+domain, f+"_"+l+"@"+domain,
    f+"-"+l+"@"+domain, l+"."+f+"@"+domain, l+f+"@"+domain,
    l+"@"+domain, fi+li+"@"+domain, f+"."+li+"@"+domain,
  ];
}

// ── WEBSITE SCRAPER ──
async function fetchPage(url) {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 8000);
    const r = await fetch(url, {
      signal: c.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PizaxoBot/1.0)" },
      redirect: "follow",
    });
    clearTimeout(t);
    if (!r.ok) return null;
    const ct = r.headers.get("content-type") || "";
    if (!ct.includes("text/html")) return null;
    return await r.text();
  } catch { return null; }
}

async function scrapeWebsite(websiteUrl) {
  const domain = getDomain(websiteUrl);
  if (!domain) return { emails: [], phones: [], domain: null };

  const ck = "s:" + domain;
  const hit = getC(ck);
  if (hit) return hit;

  const base = new URL(websiteUrl.startsWith("http") ? websiteUrl : "https://" + websiteUrl).origin;
  const paths = ["/", "/contact", "/contact-us", "/about", "/about-us", "/team", "/our-team", "/people", "/leadership"];
  const allEmails = new Set();
  const allPhones = new Set();
  const pagesOk = [];

  for (const p of paths) {
    const html = await fetchPage(base + p);
    if (!html) continue;
    pagesOk.push(p);
    const $ = cheerio.load(html);
    const text = $("body").text();

    // Emails from text
    (text.match(EMAIL_RE) || []).forEach(e => {
      const lo = e.toLowerCase();
      if (!lo.includes("noreply") && !lo.includes(".png") && !lo.includes(".jpg") && !lo.includes("example.com"))
        allEmails.add(lo);
    });
    // Emails from mailto links
    $('a[href^="mailto:"]').each((_, el) => {
      const m = $(el).attr("href")?.replace("mailto:", "").split("?")[0];
      if (m && m.includes("@")) allEmails.add(m.toLowerCase());
    });
    // Phones from tel links
    $('a[href^="tel:"]').each((_, el) => {
      const t = $(el).attr("href")?.replace("tel:", "");
      if (t) allPhones.add(t.trim());
    });
  }

  const result = { domain, emails: [...allEmails], phones: [...allPhones].slice(0, 5), pages: pagesOk };
  setC(ck, result);
  return result;
}

// ── GOOGLE SEARCH (DuckDuckGo fallback, no API key needed) ──
async function searchWeb(query) {
  const gx = process.env.GOOGLE_CX, gk = process.env.GOOGLE_API_KEY;
  if (gx && gk) {
    try {
      const r = await fetch("https://www.googleapis.com/customsearch/v1?q=" + encodeURIComponent(query) + "&key=" + gk + "&cx=" + gx + "&num=10");
      const d = await r.json();
      return (d.items || []).map(i => ({ title: i.title, snippet: i.snippet, link: i.link }));
    } catch { return []; }
  }
  try {
    const r = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query), {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PizaxoBot/1.0)" },
    });
    const html = await r.text();
    const $ = cheerio.load(html);
    const results = [];
    $(".result__body").each((_, el) => {
      results.push({
        title: $(el).find(".result__a").text().trim(),
        snippet: $(el).find(".result__snippet").text().trim(),
        link: $(el).find(".result__a").attr("href") || "",
      });
    });
    return results.slice(0, 10);
  } catch { return []; }
}

async function googleEmailSearch(name, company, domain) {
  const ck = "g:" + name + ":" + domain;
  const hit = getC(ck);
  if (hit) return hit;

  const allEmails = new Set();
  const liUrls = [];

  if (domain) {
    const r1 = await searchWeb('"@' + domain + '" email');
    r1.forEach(r => { ((r.snippet + " " + r.title).match(EMAIL_RE) || []).forEach(e => { if (e.endsWith("@" + domain)) allEmails.add(e.toLowerCase()); }); });
  }
  if (name && domain) {
    const r2 = await searchWeb('"' + name + '" "@' + domain + '"');
    r2.forEach(r => { ((r.snippet + " " + r.title).match(EMAIL_RE) || []).forEach(e => allEmails.add(e.toLowerCase())); });
  }
  if (name && company) {
    const r3 = await searchWeb('"' + name + '" "' + company + '" email contact');
    r3.forEach(r => { ((r.snippet + " " + r.title).match(EMAIL_RE) || []).forEach(e => allEmails.add(e.toLowerCase())); });
    const r4 = await searchWeb('site:linkedin.com/in "' + name + '" "' + company + '"');
    r4.forEach(r => { if (r.link && r.link.includes("linkedin.com/in/")) liUrls.push(r.link); });
  }

  const result = {
    emails: [...allEmails].filter(e => !e.includes("example.com")),
    linkedinUrls: [...new Set(liUrls)].slice(0, 3),
  };
  setC(ck, result);
  return result;
}

// ── SMTP VERIFY ──
async function getMX(domain) {
  try { const r = await dns.resolveMx(domain); return r.sort((a, b) => a.priority - b.priority).map(r => r.exchange); }
  catch { return []; }
}

function smtpCheck(email, mx) {
  return new Promise(resolve => {
    const sock = net.createConnection(25, mx);
    let step = 0;
    const timer = setTimeout(() => { sock.destroy(); resolve({ valid: null, reason: "timeout" }); }, 7000);
    sock.on("data", data => {
      const code = parseInt(data.toString().substring(0, 3));
      if (step === 0 && code === 220) { sock.write("EHLO pizaxo.com\r\n"); step = 1; }
      else if (step === 1 && (code === 250 || code === 220)) { sock.write("MAIL FROM:<verify@pizaxo.com>\r\n"); step = 2; }
      else if (step === 2 && code === 250) { sock.write("RCPT TO:<" + email + ">\r\n"); step = 3; }
      else if (step === 3) {
        clearTimeout(timer); sock.write("QUIT\r\n"); sock.end();
        if (code === 250) resolve({ valid: true, reason: "accepted" });
        else if (code >= 550) resolve({ valid: false, reason: "rejected" });
        else resolve({ valid: null, reason: "unknown", code });
      }
      else if (code >= 500) { clearTimeout(timer); sock.end(); resolve({ valid: null, reason: "error", code }); }
    });
    sock.on("error", () => { clearTimeout(timer); resolve({ valid: null, reason: "conn_fail" }); });
    sock.setTimeout(7000);
  });
}

async function verifyEmail(email) {
  const ck = "v:" + email;
  const hit = getC(ck);
  if (hit) return hit;
  const domain = email.split("@")[1];
  if (!domain) return { valid: false, reason: "bad_format" };
  const mxs = await getMX(domain);
  if (!mxs.length) return { valid: false, reason: "no_mx" };
  for (const mx of mxs.slice(0, 2)) {
    const r = await smtpCheck(email, mx);
    r.mx = mx; r.email = email;
    if (r.valid === true || r.valid === false) { setC(ck, r); return r; }
  }
  return { valid: null, reason: "inconclusive", email, mxExists: true };
}

// ── MAIN PIPELINE ──
async function findEmail(params) {
  const { ownerName, companyName, website } = params;
  const domain = getDomain(website);
  const parts = (ownerName || "").trim().split(/\s+/);
  const fn = parts[0] || null, ln = parts.slice(1).join(" ") || null;

  const result = {
    verifiedEmail: null, confidence: 0, verificationStatus: null,
    websiteEmails: [], websitePhones: [], websitePattern: null,
    googleEmails: [], googleLinkedIn: [],
    allCandidates: [], domain, searchedAt: new Date().toISOString(),
  };

  const candidates = [];

  // Step 1: Website scrape
  if (website) {
    console.log("[1] Scraping: " + website);
    const ws = await scrapeWebsite(website);
    result.websiteEmails = ws.emails;
    result.websitePhones = ws.phones;
    if (fn && ln) {
      const match = ws.emails.find(e => { const l = e.split("@")[0]; return l.includes(fn.toLowerCase()) || l.includes(ln.toLowerCase()); });
      if (match) candidates.push({ email: match, confidence: 90, source: "website-direct" });
    }
    ws.emails.filter(e => domain && e.endsWith("@" + domain)).forEach(e => candidates.push({ email: e, confidence: 70, source: "website" }));
  }

  // Step 2: Google OSINT
  if (fn || companyName) {
    console.log("[2] Google: " + ownerName + " @ " + companyName);
    const gs = await googleEmailSearch(ownerName, companyName, domain);
    result.googleEmails = gs.emails;
    result.googleLinkedIn = gs.linkedinUrls;
    gs.emails.forEach(e => {
      const isDom = domain && e.endsWith("@" + domain);
      const hasN = fn && (e.includes(fn.toLowerCase()) || (ln && e.includes(ln.toLowerCase())));
      candidates.push({ email: e, confidence: isDom && hasN ? 88 : isDom ? 75 : hasN ? 65 : 50, source: "google" });
    });
  }

  // Step 3: Permutations
  if (fn && ln && domain) {
    console.log("[3] Permutations: " + fn + " " + ln + " @ " + domain);
    const ps = perms(fn, ln, domain);
    ps.forEach((e, i) => candidates.push({ email: e, confidence: Math.max(30, 55 - i * 3), source: "permutation" }));
  }

  // Dedup + rank
  const seen = new Set();
  const ranked = candidates.filter(c => { const k = c.email.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; }).sort((a, b) => b.confidence - a.confidence);

  // Step 4: SMTP verify top 5
  console.log("[4] Verifying top " + Math.min(ranked.length, 5));
  for (const c of ranked.slice(0, 5)) {
    const v = await verifyEmail(c.email);
    if (v.valid === true) {
      result.verifiedEmail = c.email;
      result.confidence = Math.max(c.confidence, 95);
      result.verificationStatus = "valid";
      console.log("  ✅ " + c.email);
      break;
    } else if (v.valid === false) {
      console.log("  ❌ " + c.email);
      continue;
    } else {
      if (!result.verifiedEmail || c.confidence > result.confidence) {
        result.verifiedEmail = c.email;
        result.confidence = c.confidence;
        result.verificationStatus = v.reason || "unverified";
      }
    }
  }
  if (!result.verifiedEmail && ranked.length) {
    result.verifiedEmail = ranked[0].email;
    result.confidence = ranked[0].confidence;
    result.verificationStatus = "unverified";
  }
  result.allCandidates = ranked.slice(0, 15);
  return result;
}

// ── ROUTES ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", name: "Pizaxo Email Scraper", version: "2.0.0",
    engines: { website_scraper: true, google_osint: true, smtp_verifier: true },
    google_api: !!(process.env.GOOGLE_CX && process.env.GOOGLE_API_KEY), cache: cache.size });
});

app.post("/api/find-email", async (req, res) => {
  try {
    const { ownerName, companyName, website } = req.body;
    if (!website && !ownerName) return res.status(400).json({ error: "website or ownerName needed" });
    console.log("\n📧 " + (ownerName || "?") + " @ " + (companyName || "?"));
    const r = await findEmail({ ownerName, companyName, website });
    console.log("→ " + (r.verifiedEmail || "none") + " (" + r.confidence + "%)");
    res.json(r);
  } catch (e) { console.error(e); res.status(500).json({ error: e.message }); }
});

app.post("/api/scrape-website", async (req, res) => {
  try { res.json(await scrapeWebsite(req.body.website)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/verify-email", async (req, res) => {
  try { res.json(await verifyEmail(req.body.email)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/bulk-find", async (req, res) => {
  try {
    const results = [];
    for (const lead of (req.body.leads || []).slice(0, 30)) {
      results.push({ ...lead, emailResult: await findEmail(lead) });
      await new Promise(r => setTimeout(r, 300));
    }
    res.json({ results, total: results.length });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── START ──
const PORT = process.env.PORT || 3456;
app.listen(PORT, "0.0.0.0", () => {
  console.log("Pizaxo Email Scraper running on port " + PORT);
});
