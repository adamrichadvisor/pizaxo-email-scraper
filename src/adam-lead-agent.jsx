import { useState, useRef } from "react";

const REGION_GROUPS = {
  "🇺🇸 North America": ["United States","Canada","Mexico"],
  "🇬🇧 Europe": ["United Kingdom","France","Germany","Spain","Italy","Belgium","Netherlands","Sweden","Denmark","Norway","Finland","Ireland","Czech Republic","Hungary","Bulgaria","Iceland","Poland","Romania","Austria","Switzerland","Portugal","Greece","Croatia","Serbia","Lithuania","Estonia","Latvia"],
  "🇮🇳 Asia Pacific": ["India","South Korea","Japan","China","Hong Kong","Singapore","Thailand","Philippines","Malaysia","Vietnam","Taiwan","Indonesia","Bangladesh","Sri Lanka","Pakistan","Myanmar"],
  "🇦🇪 Middle East & Africa": ["UAE","Saudi Arabia","Qatar","Bahrain","Kuwait","Oman","Israel","Turkey","Egypt","South Africa","Nigeria","Kenya","Morocco","Tunisia","Jordan","Lebanon"],
  "🇦🇺 Oceania": ["Australia","New Zealand","Fiji"],
  "🇧🇷 South America": ["Brazil","Argentina","Colombia","Chile","Peru","Uruguay","Ecuador","Venezuela"],
  "🇷🇺 CIS & Central Asia": ["Russia","Ukraine","Georgia","Kazakhstan","Uzbekistan","Belarus"],
};
const ALL_REGIONS = Object.values(REGION_GROUPS).flat();

// Full business-directory taxonomy — every industry / business type.
const CATEGORY_GROUPS = {
  "🍽 Food & Dining": ["Restaurants","Cafés & Coffee Shops","Bars & Pubs","Bakeries","Catering","Food Trucks","Fast Food","Fine Dining","Breweries & Wineries"],
  "🛍 Retail & Shopping": ["Clothing & Apparel","Electronics","Grocery Stores","Furniture & Home Decor","Jewelry","Bookstores","Sporting Goods","Convenience Stores","Florists","Gift Shops"],
  "🏥 Health & Medical": ["Doctors & Clinics","Dentists","Hospitals","Pharmacies","Mental Health","Physiotherapy","Optometrists","Chiropractors","Veterinary","Medical Labs"],
  "💄 Beauty & Wellness": ["Hair Salons","Spas","Nail Salons","Barbershops","Gyms & Fitness","Yoga Studios","Massage Therapy","Tattoo & Piercing","Skincare Clinics"],
  "🏠 Home Services": ["Plumbing","Electricians","HVAC","Cleaning Services","Landscaping","Pest Control","Roofing","Painting","Movers","Locksmiths","Interior Design"],
  "🔧 Automotive": ["Car Dealerships","Auto Repair","Car Wash & Detailing","Tire Shops","Body Shops","Car Rental","Towing","Motorcycle Dealers","Auto Parts"],
  "🏗 Construction & Trades": ["General Contractors","Carpentry","Masonry","Welding","Flooring","Concrete","Demolition","Architecture Firms","Engineering Firms"],
  "💼 Professional Services": ["Lawyers & Law Firms","Accountants","Business Consultants","Insurance Agencies","Notaries","HR & Staffing","Translation Services","Legal Services"],
  "💰 Finance & Banking": ["Banks","Credit Unions","Financial Advisors","Mortgage Brokers","Investment Firms","Tax Services","Bookkeeping","Fintech"],
  "🏢 Real Estate": ["Real Estate Agents","Property Management","Commercial Real Estate","Appraisers","Real Estate Developers","Title Companies"],
  "💻 Technology & IT": ["Software Development","IT Services","Web Design","Cybersecurity","Cloud Services","Hardware","AI / Machine Learning","App Development","SaaS"],
  "📣 Marketing & Media": ["Advertising Agencies","Digital Marketing","SEO Agencies","PR Firms","Graphic Design","Video Production","Photography","VFX & Animation","Branding Studios"],
  "🎓 Education & Training": ["Schools","Universities & Colleges","Tutoring","Language Schools","Vocational Training","Online Courses","Coaching","Daycares"],
  "🚚 Transport & Logistics": ["Shipping & Freight","Courier Services","Warehousing","Trucking","Taxi & Rideshare","Logistics","Customs Brokers"],
  "🏭 Manufacturing & Industrial": ["Factories","Machinery","Packaging","Textiles","Chemicals","Metals & Steel","Plastics","Industrial Equipment"],
  "🌾 Agriculture & Food Production": ["Farms","Dairy","Fisheries","Agritech","Food Processing","Nurseries & Greenhouses"],
  "🎉 Events & Entertainment": ["Event Planning","Wedding Services","DJs & Bands","Venues","Party Rentals","Talent Agencies","Nightclubs"],
  "🏨 Travel & Hospitality": ["Hotels","Travel Agencies","Tour Operators","Resorts","Hostels","Vacation Rentals","Airlines"],
  "🐾 Pets & Animals": ["Pet Stores","Pet Grooming","Pet Boarding","Pet Training","Animal Shelters"],
  "🏦 Energy & Utilities": ["Solar","Oil & Gas","Electric Utilities","Water Services","Waste Management","Renewable Energy"],
  "⚖️ Government & Nonprofit": ["NGOs","Charities","Associations","Government Agencies","Religious Organizations"],
  "🛡 Security & Safety": ["Security Guards","Alarm Systems","Fire Safety","Private Investigators","Cybersecurity Firms"],
};
const ALL_CATEGORIES = Object.values(CATEGORY_GROUPS).flat();

const TIERS = [
  {id:"tier1",label:"Tier 1 — Enterprise / Chain",color:"#D97706"},
  {id:"tier2",label:"Tier 2 — Mid-size / Local",color:"#2563EB"},
  {id:"tier3",label:"Tier 3 — Small / Emerging",color:"#059669"},
];

function Dots(){return <span style={{display:"inline-flex",gap:3}}>{[0,1,2].map(i=><span key={i} style={{width:6,height:6,borderRadius:"50%",background:"#D97706",animation:`ldp 1.2s ease ${i*.2}s infinite`}}/>)}</span>}

function Row({icon,label,value,color,link,mail,phone}){
  if(!value||value==="unknown"||value==="")return null;
  const c=color||"#1e293b";
  const inner=link?<a href={value.startsWith("http")?value:`https://${value}`} target="_blank" rel="noopener noreferrer" style={{color:"#2563EB",textDecoration:"underline",wordBreak:"break-all",fontWeight:500}} onClick={e=>e.stopPropagation()}>{value.replace(/^https?:\/\/(www\.)?/,"").slice(0,50)} ↗</a>
    :mail?<a href={`mailto:${value.split(",")[0].trim()}`} style={{color:"#059669",textDecoration:"underline",fontWeight:600}} onClick={e=>e.stopPropagation()}>{value}</a>
    :phone?<a href={`tel:${value.replace(/\s/g,"")}`} style={{color:"#2563EB",textDecoration:"underline"}} onClick={e=>e.stopPropagation()}>{value}</a>
    :<span style={{color:c,fontWeight:400}}>{value}</span>;
  return(
    <div style={{fontSize:14,display:"flex",alignItems:"flex-start",gap:8,marginBottom:2}}>
      <span style={{width:20,textAlign:"center",flexShrink:0}}>{icon}</span>
      <span style={{color:"#64748b",minWidth:100,flexShrink:0,fontWeight:600,fontSize:13}}>{label}</span>
      {inner}
    </div>
  );
}

function Card({lead,i}){
  const [open,setOpen]=useState(false);
  const tier=TIERS.find(t=>t.id===lead.tier)||TIERS[1];
  const has=v=>v&&v!=="unknown"&&v!=="";
  return(
    <div onClick={()=>setOpen(!open)} style={{background:"#fff",border:"1px solid #e2e8f0",borderLeft:`4px solid ${tier.color}`,borderRadius:10,padding:"14px 18px",cursor:"pointer",animation:`fadeSlide .3s ease ${Math.min(i*.03,.5)}s both`,boxShadow:"0 1px 3px rgba(0,0,0,.06)",transition:"box-shadow .15s"}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 12px rgba(0,0,0,.1)"}
      onMouseLeave={e=>e.currentTarget.style.boxShadow="0 1px 3px rgba(0,0,0,.06)"}>
      <div style={{display:"flex",justifyContent:"space-between"}}>
        <div style={{flex:1}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5,flexWrap:"wrap"}}>
            <span style={{fontSize:16,fontWeight:700,color:"#0f172a"}}>{lead.name}</span>
            <span style={{fontSize:10,padding:"2px 10px",borderRadius:12,background:tier.color+"18",color:tier.color,fontWeight:700,letterSpacing:.3}}>{tier.id.replace("tier","T")}</span>
            {has(lead.category)&&<span style={{fontSize:10,padding:"2px 10px",borderRadius:12,background:"#ede9fe",color:"#6d28d9",fontWeight:700}}>🏷 {lead.category}</span>}
            {has(lead.email)&&<span style={{fontSize:10,padding:"2px 10px",borderRadius:12,background:"#dcfce7",color:"#166534",fontWeight:700}}>📧 EMAIL FOUND</span>}
          </div>
          <div style={{fontSize:13,color:"#475569",display:"flex",gap:12,flexWrap:"wrap",fontWeight:500}}>
            <span>📍 {lead.city}, {lead.country}</span>
            {has(lead.owner)&&<span>👤 {lead.owner}</span>}
            {has(lead.email)&&<span style={{color:"#166534",fontWeight:600}}>📧 {lead.email}</span>}
            {!has(lead.email)&&has(lead.companyEmail)&&<span style={{color:"#1d4ed8"}}>📧 {lead.companyEmail}</span>}
          </div>
        </div>
        <span style={{fontSize:12,color:"#94a3b8",transform:open?"rotate(180deg)":"none",transition:".2s",fontWeight:700}}>▼</span>
      </div>
      {open&&(
        <div style={{marginTop:14,paddingTop:14,borderTop:"2px solid #f1f5f9",display:"flex",flexDirection:"column",gap:5}}>
          <Row icon="📧" label="Owner Email" value={lead.email} mail/>
          <Row icon="📧" label="Company Email" value={lead.companyEmail} mail/>
          <Row icon="👤" label="Owner" value={has(lead.owner)?`${lead.owner}${has(lead.title)?` — ${lead.title}`:""}`:""}/>
          <Row icon="📞" label="Phone" value={lead.phone} phone/>
          <Row icon="🌐" label="Website" value={lead.website} link/>
          <Row icon="🔗" label="LinkedIn" value={lead.linkedin} link/>
          <Row icon="🏷" label="Category" value={lead.category} color="#6d28d9"/>
          <Row icon="🔑" label="Email Pattern" value={lead.pattern}/>
          <Row icon="🎯" label="Services" value={lead.specialty}/>
          {lead.projects?.length>0&&<Row icon="🏆" label="Notable Clients/Work" value={lead.projects.join(", ")}/>}
          <Row icon="👥" label="Team Size" value={lead.artists}/>
          {lead.otherEmails?.length>0&&<Row icon="📋" label="Other Emails" value={lead.otherEmails.join(", ")} mail/>}
        </div>
      )}
    </div>
  );
}

export default function App(){
  const [leads,setLeads]=useState([]);
  const [status,setStatus]=useState("idle");
  const [regions,setRegions]=useState(["United States","United Kingdom","Canada","India","Australia","Germany","France","UAE","Singapore"]);
  const [tiers,setTiers]=useState(["tier1","tier2","tier3"]);
  const [categories,setCategories]=useState([]); // empty = search all business types together (no split)
  const [logs,setLogs]=useState([]);
  const [filter,setFilter]=useState("");
  const [sort,setSort]=useState("tier");
  const [cFilter,setCF]=useState("all");
  const [catFilter,setCatFilter]=useState("all");
  const abortRef=useRef({signal:{aborted:false}});
  const logRef=useRef(null);
  const emailRe=/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

  const log=msg=>setLogs(p=>{const n=[...p,{t:new Date().toLocaleTimeString(),m:msg}];setTimeout(()=>logRef.current?.scrollTo(0,99999),50);return n;});
  const has=v=>v&&v!=="unknown"&&v!=="";

  const callClaude=async(prompt,sys)=>{
    const r=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:4000,system:sys,messages:[{role:"user",content:prompt}],tools:[{type:"web_search_20250305",name:"web_search"}]})});
    const d=await r.json();
    return (d.content||[]).map(b=>b.type==="text"?b.text:"").join("\n");
  };

  const findCompanyWithEmail=async(region,tierLabel,category)=>{
    const catLine=category?`in the "${category}" category`:"(any business type)";
    const catSys=category?` Focus only on businesses in the "${category}" category.`:"";
    const text=await callClaude(
`Search the web and find real businesses/companies in ${region} ${catLine}, at the ${tierLabel} level.

For EACH business, search their website contact page and the web for email addresses.

Report each business in EXACTLY this format:

COMPANY: [name]
CITY: [city]
COUNTRY: [country]
WEBSITE: [url]
OWNER: [owner / founder / CEO / manager name]
TITLE: [their title]
OWNER_EMAIL: [their personal work email address]
COMPANY_EMAIL: [general contact email like info@ or contact@]
PHONE: [phone from website]
LINKEDIN: [owner LinkedIn URL]
EMAIL_PATTERN: [email pattern at this domain]
SPECIALTY: [main services or products offered]
PROJECTS: [notable clients or recent work, separated by semicolons]
ARTISTS: [number of employees / team size]
---

Find at least 5 businesses. For each business you MUST search their website for email addresses. Look at contact pages, about pages, and footer. Also search Google for "@theirdomain.com" to find published emails. If you know the email pattern, construct the owner's email.`,
`You are a business directory researcher finding real companies with verified contact details.${catSys} For EACH business, you MUST search their website for email addresses — check contact page, about page, team page, footer. Also search Google for published emails at their domain. Only report real, currently operating businesses.`
    );

    const companies=[];
    const blocks=text.split("---").filter(b=>b.includes("COMPANY:"));

    for(const block of blocks){
      const get=key=>{const m=block.match(new RegExp(key+`:\\s*(.+?)(?:\\n|$)`,"i"));return m?m[1].trim().replace(/^\[|\]$/g,""):""};
      const name=get("COMPANY");
      if(!name||name.length<2)continue;

      const blockEmails=[...new Set((block.match(emailRe)||[]).map(e=>e.toLowerCase()))].filter(e=>!e.includes("example.com")&&!e.includes("noreply")&&!e.includes("schema.org")&&e.length>5);

      const ownerEmail=get("OWNER_EMAIL");
      const companyEmail=get("COMPANY_EMAIL");
      const website=get("WEBSITE");
      const domain=(()=>{if(!website)return null;try{return new URL(website.startsWith("http")?website:"https://"+website).hostname.replace("www.","");}catch{return null;}})();

      let bestEmail=has(ownerEmail)&&ownerEmail.includes("@")?ownerEmail:"";
      if(!has(bestEmail)){
        const ownerName=get("OWNER").toLowerCase();
        const fn=ownerName.split(/\s+/)[0]||"";
        const ln=ownerName.split(/\s+/).slice(1).join("").replace(/\s/g,"")||"";
        const nameMatch=blockEmails.find(e=>{const l=e.split("@")[0];return fn&&(l.includes(fn)||(ln&&l.includes(ln)));});
        if(nameMatch)bestEmail=nameMatch;
        else if(domain&&fn&&ln){
          const pattern=get("EMAIL_PATTERN").toLowerCase();
          if(pattern.includes("first.last"))bestEmail=`${fn}.${ln}@${domain}`;
          else if(pattern.includes("firstlast"))bestEmail=`${fn}${ln}@${domain}`;
          else if(pattern.includes("flast"))bestEmail=`${fn[0]}${ln}@${domain}`;
          else bestEmail=`${fn}.${ln}@${domain}`;
        }
      }

      let coEmail=has(companyEmail)&&companyEmail.includes("@")?companyEmail:"";
      if(!has(coEmail)){
        const generic=blockEmails.find(e=>["info","contact","hello","enquiries","office","studio","mail","general","reception","sales","support","admin"].includes(e.split("@")[0]));
        if(generic)coEmail=generic;
      }

      companies.push({
        name,city:get("CITY"),country:get("COUNTRY")||region,tier:"tier2",category:category||"",
        website,owner:get("OWNER"),title:get("TITLE"),
        email:bestEmail,companyEmail:coEmail,
        phone:get("PHONE"),linkedin:get("LINKEDIN"),
        pattern:get("EMAIL_PATTERN"),specialty:get("SPECIALTY"),
        projects:get("PROJECTS").split(/[;]/).map(s=>s.trim()).filter(Boolean),
        artists:get("ARTISTS"),
        otherEmails:blockEmails.filter(e=>e!==bestEmail&&e!==coEmail).slice(0,5),
      });
    }
    return companies;
  };

  const runAll=async()=>{
    if(status!=="idle"&&status!=="done"){abortRef.current.signal.aborted=true;setStatus("idle");return;}
    abortRef.current={signal:{aborted:false}};
    setStatus("searching");setLogs([]);setLeads([]);
    const catList=categories.length?categories:[null];
    log("🚀 Adam Lead Agent — scanning directory for businesses + emails...");
    log(`🌍 ${regions.length} regions × ${tiers.length} tiers × ${categories.length||"all"} categories = ${regions.length*tiers.length*catList.length} searches\n`);

    const all=[];const seen=new Set();
    for(const region of regions){
      for(const tierId of tiers){
        const tierLabel=TIERS.find(t=>t.id===tierId)?.label||tierId;
        for(const category of catList){
          if(abortRef.current.signal.aborted)break;
          log(`🔍 ${region} → ${tierLabel}${category?` → 🏷 ${category}`:""}`);
          try{
            const companies=await findCompanyWithEmail(region,tierLabel,category);
            const fresh=companies.filter(c=>{const k=c.name.toLowerCase();if(seen.has(k))return false;seen.add(k);c.tier=tierId;c.category=category||"";return true;});
            if(fresh.length){
              all.push(...fresh);setLeads([...all]);
              const we=fresh.filter(c=>has(c.email)||has(c.companyEmail)).length;
              log(`✅ +${fresh.length} leads (${we} with emails) — ${region}${category?` / ${category}`:""}`);
            }else log(`— 0 new — ${region}${category?` / ${category}`:""}`);
          }catch(err){log(`⚠️ ${region}: ${err.message}`);}
        }
        if(abortRef.current.signal.aborted)break;
      }
      if(abortRef.current.signal.aborted)break;
    }
    const te=all.filter(l=>has(l.email)).length;
    const ce=all.filter(l=>has(l.companyEmail)).length;
    log(`\n🏁 DONE — ${all.length} leads | ${te} owner emails | ${ce} company emails`);
    log(`📥 Click ↓ CSV to download!`);
    setStatus("done");
  };

  const toggleR=r=>setRegions(p=>p.includes(r)?p.filter(x=>x!==r):[...p,r]);
  const toggleT=t=>setTiers(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const toggleC=c=>setCategories(p=>p.includes(c)?p.filter(x=>x!==c):[...p,c]);
  const selectG=g=>{const c=REGION_GROUPS[g];c.every(x=>regions.includes(x))?setRegions(p=>p.filter(x=>!c.includes(x))):setRegions(p=>[...new Set([...p,...c])]);};
  const selectCG=g=>{const c=CATEGORY_GROUPS[g];c.every(x=>categories.includes(x))?setCategories(p=>p.filter(x=>!c.includes(x))):setCategories(p=>[...new Set([...p,...c])]);};
  const allCatsSelected=ALL_CATEGORIES.every(c=>categories.includes(c));
  const toggleAllCats=()=>setCategories(allCatsSelected?[]:[...ALL_CATEGORIES]);

  const catList=categories.length?categories:[null];
  const searchCount=regions.length*tiers.length*catList.length;

  const filtered=leads
    .filter(l=>{if(cFilter==="with-email")return has(l.email)||has(l.companyEmail);if(cFilter==="owner-email")return has(l.email);if(cFilter==="no-email")return!has(l.email)&&!has(l.companyEmail);return true;})
    .filter(l=>catFilter==="all"||l.category===catFilter)
    .filter(l=>!filter||JSON.stringify(l).toLowerCase().includes(filter.toLowerCase()))
    .sort((a,b)=>{if(sort==="name")return a.name.localeCompare(b.name);if(sort==="country")return(a.country||"").localeCompare(b.country||"");if(sort==="category")return(a.category||"").localeCompare(b.category||"");return TIERS.findIndex(t=>t.id===a.tier)-TIERS.findIndex(t=>t.id===b.tier);});

  const foundCats=[...new Set(leads.map(l=>l.category).filter(Boolean))].sort();

  const dl=(c,f,t)=>{const b=new Blob([c],{type:t});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=f;a.style.display="none";document.body.appendChild(a);a.click();document.body.removeChild(a);setTimeout(()=>URL.revokeObjectURL(u),200);};
  const downloadCSV=()=>{
    const h=["Company","City","Country","Tier","Category","Website","Owner Name","Owner Title","OWNER EMAIL","COMPANY EMAIL","Phone","LinkedIn","Email Pattern","Other Emails","Services","Notable Clients/Work","Team Size"];
    const rows=filtered.map(l=>[l.name,l.city,l.country,l.tier,l.category,l.website,l.owner,l.title,l.email,l.companyEmail,l.phone,l.linkedin,l.pattern,(l.otherEmails||[]).join("; "),l.specialty,(l.projects||[]).join("; "),l.artists]);
    dl("\uFEFF"+[h,...rows].map(r=>r.map(c=>`"${String(c||"").replace(/"/g,'""')}"`).join(",")).join("\r\n"),`adam-leads-${new Date().toISOString().slice(0,10)}.csv`,"text/csv;charset=utf-8;");
    log(`📥 CSV downloaded — ${filtered.length} leads`);
  };
  const downloadJSON=()=>{dl(JSON.stringify(filtered,null,2),`adam-leads-${new Date().toISOString().slice(0,10)}.json`,"application/json");};

  const cs={total:leads.length,ownerEmail:leads.filter(l=>has(l.email)).length,coEmail:leads.filter(l=>has(l.companyEmail)).length,anyEmail:leads.filter(l=>has(l.email)||has(l.companyEmail)).length};
  const busy=status!=="idle"&&status!=="done";
  const chip=(a,c)=>({padding:"6px 12px",borderRadius:8,border:a?`2px solid ${c}`:"2px solid #e2e8f0",background:a?c+"15":"#fff",color:a?c:"#94a3b8",fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all .15s"});

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:"#f8fafc",color:"#1e293b",minHeight:"100vh",padding:"24px 18px"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap');
        @keyframes fadeSlide{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        @keyframes glow{0%,100%{box-shadow:0 0 15px rgba(217,119,6,.2)}50%{box-shadow:0 0 30px rgba(217,119,6,.4)}}
        @keyframes ldp{0%,80%,100%{opacity:.3;transform:scale(.8)}40%{opacity:1;transform:scale(1.1)}}
        *{box-sizing:border-box}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:3px}
        select,input{border:2px solid #e2e8f0 !important}
        select:focus,input:focus{border-color:#D97706 !important;outline:none}
      `}</style>

      {/* Header */}
      <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:24}}>
        <div style={{width:48,height:48,borderRadius:14,background:"linear-gradient(135deg,#D97706,#B45309)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,fontWeight:800,color:"#fff",fontFamily:"Space Grotesk",boxShadow:"0 4px 12px rgba(217,119,6,.3)"}}>A</div>
        <div>
          <h1 style={{fontFamily:"Space Grotesk",fontSize:24,fontWeight:700,color:"#0f172a",margin:0}}>Adam Lead Agent</h1>
          <p style={{fontSize:14,color:"#64748b",margin:0,fontWeight:500}}>Find businesses worldwide with verified emails — any category, any region</p>
        </div>
      </div>

      {/* Regions */}
      <div style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:14,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:12}}>🌍 Markets / Regions — <span style={{color:"#D97706"}}>{regions.length}</span> of {ALL_REGIONS.length} selected</div>
        {Object.entries(REGION_GROUPS).map(([group,countries])=>{
          const allSel=countries.every(c=>regions.includes(c));
          const someSel=countries.some(c=>regions.includes(c));
          return(
            <div key={group} style={{marginBottom:12}}>
              <div onClick={()=>selectG(group)} style={{fontSize:14,fontWeight:700,color:allSel?"#D97706":someSel?"#B45309":"#64748b",cursor:"pointer",marginBottom:6,userSelect:"none"}}>
                {allSel?"☑ ":someSel?"◧ ":"☐ "}{group}
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:500,marginLeft:6}}>({countries.length})</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:8}}>
                {countries.map(c=><button key={c} onClick={()=>toggleR(c)} style={chip(regions.includes(c),"#D97706")}>{c}</button>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Categories */}
      <div style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:14,padding:18,marginBottom:14,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6,flexWrap:"wrap",gap:8}}>
          <div style={{fontSize:14,fontWeight:700,color:"#0f172a"}}>🏷 Business Categories — <span style={{color:"#7c3aed"}}>{categories.length}</span> of {ALL_CATEGORIES.length} selected</div>
          <button onClick={toggleAllCats} style={{...chip(allCatsSelected,"#7c3aed"),fontWeight:700}}>{allCatsSelected?"Clear all":"Select all categories"}</button>
        </div>
        <div style={{fontSize:12,color:"#94a3b8",fontWeight:500,marginBottom:12}}>
          {categories.length?`Each region × tier is searched separately for each selected category.`:`None selected → searches all business types together (no category split).`}
        </div>
        {Object.entries(CATEGORY_GROUPS).map(([group,cats])=>{
          const allSel=cats.every(c=>categories.includes(c));
          const someSel=cats.some(c=>categories.includes(c));
          return(
            <div key={group} style={{marginBottom:12}}>
              <div onClick={()=>selectCG(group)} style={{fontSize:14,fontWeight:700,color:allSel?"#7c3aed":someSel?"#8b5cf6":"#64748b",cursor:"pointer",marginBottom:6,userSelect:"none"}}>
                {allSel?"☑ ":someSel?"◧ ":"☐ "}{group}
                <span style={{fontSize:12,color:"#94a3b8",fontWeight:500,marginLeft:6}}>({cats.length})</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:5,paddingLeft:8}}>
                {cats.map(c=><button key={c} onClick={()=>toggleC(c)} style={chip(categories.includes(c),"#7c3aed")}>{c}</button>)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tiers + Run */}
      <div style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:14,padding:18,marginBottom:18,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
        <div style={{fontSize:14,fontWeight:700,color:"#0f172a",marginBottom:10}}>Business Size</div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:16}}>
          {TIERS.map(t=><button key={t.id} onClick={()=>toggleT(t.id)} style={chip(tiers.includes(t.id),t.color)}>{t.label}</button>)}
        </div>
        <div style={{display:"flex",gap:12,alignItems:"center",flexWrap:"wrap"}}>
          <button onClick={runAll} style={{padding:"14px 32px",borderRadius:12,border:"none",background:busy?"linear-gradient(135deg,#dc2626,#b91c1c)":"linear-gradient(135deg,#D97706,#B45309)",color:"#fff",fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"Space Grotesk",animation:busy?"glow 2s infinite":"none",letterSpacing:.3,boxShadow:busy?"none":"0 4px 14px rgba(217,119,6,.3)"}}>
            {busy?"■  STOP SCAN":"▶  FIND BUSINESSES + EMAILS"}
          </button>
          <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 16px",borderRadius:12,background:busy?"#fef3c7":status==="done"?"#dcfce7":"#f1f5f9",color:busy?"#92400e":status==="done"?"#166534":"#64748b",fontSize:13,fontWeight:600}}>
            {busy&&<Dots/>}{busy?"Scanning...":status==="done"?"✓ Complete":"Ready to scan"}
          </div>
          {!busy&&<div style={{display:"inline-flex",alignItems:"center",gap:6,padding:"8px 14px",borderRadius:12,background:searchCount>120?"#fef2f2":"#f1f5f9",color:searchCount>120?"#b91c1c":"#475569",fontSize:13,fontWeight:600}}>
            🔎 {searchCount} searches queued{searchCount>120?" — consider narrowing":""}
          </div>}
        </div>
      </div>

      {/* Stats */}
      {leads.length>0&&(<>
        <div style={{display:"flex",gap:10,marginBottom:14,flexWrap:"wrap"}}>
          {[{l:"Owner Emails",v:cs.ownerEmail,c:"#059669",bg:"#dcfce7"},{l:"Company Emails",v:cs.coEmail,c:"#2563EB",bg:"#dbeafe"},{l:"Any Email",v:cs.anyEmail,c:"#D97706",bg:"#fef3c7"},{l:"Total Leads",v:cs.total,c:"#475569",bg:"#f1f5f9"}].map(s=>(
            <div key={s.l} style={{flex:"1 1 110px",background:s.bg,borderRadius:12,padding:"12px 16px",border:"1px solid #e2e8f0"}}>
              <div style={{fontSize:26,fontWeight:800,color:s.c,fontFamily:"Space Grotesk"}}>{s.v}</div>
              <div style={{fontSize:12,color:"#64748b",fontWeight:600}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:8,marginBottom:16,alignItems:"center",flexWrap:"wrap"}}>
          <input type="text" placeholder="Search leads..." value={filter} onChange={e=>setFilter(e.target.value)} style={{flex:"1 1 160px",padding:"10px 14px",borderRadius:10,background:"#fff",color:"#0f172a",fontSize:13,fontFamily:"inherit"}}/>
          {foundCats.length>0&&<select value={catFilter} onChange={e=>setCatFilter(e.target.value)} style={{padding:"10px 10px",borderRadius:10,background:"#fff",color:"#475569",fontSize:12,fontFamily:"inherit"}}>
            <option value="all">All Categories</option>
            {foundCats.map(c=><option key={c} value={c}>{c}</option>)}
          </select>}
          <select value={cFilter} onChange={e=>setCF(e.target.value)} style={{padding:"10px 10px",borderRadius:10,background:"#fff",color:"#475569",fontSize:12,fontFamily:"inherit"}}>
            <option value="all">All Leads</option>
            <option value="with-email">Has Email</option>
            <option value="owner-email">Owner Email Only</option>
            <option value="no-email">No Email</option>
          </select>
          <select value={sort} onChange={e=>setSort(e.target.value)} style={{padding:"10px 10px",borderRadius:10,background:"#fff",color:"#475569",fontSize:12,fontFamily:"inherit"}}>
            <option value="tier">Sort: Tier</option>
            <option value="name">Sort: Name</option>
            <option value="country">Sort: Country</option>
            <option value="category">Sort: Category</option>
          </select>
          <button onClick={downloadCSV} style={{padding:"10px 18px",borderRadius:10,border:"2px solid #059669",background:"#dcfce7",color:"#166534",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>↓ Download CSV</button>
          <button onClick={downloadJSON} style={{padding:"10px 18px",borderRadius:10,border:"2px solid #7c3aed",background:"#f5f3ff",color:"#6d28d9",fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>↓ JSON</button>
          <span style={{fontSize:12,color:"#94a3b8",fontWeight:600}}>{filtered.length} shown</span>
        </div>
      </>)}

      {/* Cards */}
      <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
        {filtered.map((l,i)=><Card key={`${l.name}-${i}`} lead={l} i={i}/>)}
      </div>

      {/* Log */}
      {logs.length>0&&(
        <div ref={logRef} style={{background:"#fff",border:"2px solid #e2e8f0",borderRadius:14,padding:16,maxHeight:240,overflowY:"auto",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
          <div style={{fontSize:13,fontWeight:700,color:"#475569",marginBottom:8}}>Agent Log</div>
          {logs.map((l,i)=><div key={i} style={{fontSize:12,color:"#64748b",marginBottom:3,display:"flex",gap:10,lineHeight:1.5}}><span style={{color:"#94a3b8",minWidth:68,flexShrink:0,fontWeight:500}}>{l.t}</span><span style={{color:"#334155"}}>{l.m}</span></div>)}
        </div>
      )}
    </div>
  );
}
