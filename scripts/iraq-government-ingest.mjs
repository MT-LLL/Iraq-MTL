import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
const DEFAULT_SOURCES=[
 {name:"Iraq Ministry of Communications — Tenders",url:"https://moc.gov.iq/tenders"},
 {name:"South Refineries Company — Local Tenders",url:"https://src.gov.iq/en/muaqasat-local.aspx"},
 {name:"South Refineries Company — External Tenders",url:"https://src.gov.iq/en/muaqasat-external.aspx"},
 {name:"South Refineries Company — Local Tender Archive",url:"https://src.gov.iq/en/muaqasat-local_archive.aspx"}
];
const TERMS=["tender","tenders","procurement","bid","bidding","rfp","rfq","eoi","request for proposal","request for quotation","prequalification","contract","مناقصة","مناقصات","عطاء","طلب عروض","استدراج عروض","تجهيز","شراء","إحالة","ترسية"];
const ICT=["telecom","communication","network","fiber","fibre","data center","datacenter","cyber","security","software","information technology","ict","cctv","camera","tracking","radio","wireless","internet","server","cloud","telephone","cable","اتصالات","اتصال","شبكة","ألياف","معلوماتية","برمجيات","كاميرات","أمن سيبراني"];
function decode(s){return s.replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,"<").replace(/&gt;/gi,">").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));}
function plain(s=""){return decode(s.replace(/<!--[\s\S]*?-->/g," ").replace(/<script\b[\s\S]*?<\/script>/gi," ").replace(/<style\b[\s\S]*?<\/style>/gi," ").replace(/<br\s*\/?>/gi," ").replace(/<\/\s*(p|div|tr|li|td|th|h[1-6])\s*>/gi," | ").replace(/<[^>]+>/g," ").replace(/\s+/g," ")).trim();}
function has(s,terms=TERMS){return terms.some(t=>s.toLowerCase().includes(t.toLowerCase()));}
function sources(){const raw=process.env.IRAQ_GOV_SOURCES?.trim();if(!raw)return DEFAULT_SOURCES;const list=JSON.parse(raw);if(!Array.isArray(list)||!list.length)throw Error("IRAQ_GOV_SOURCES must be a non-empty JSON array of {name,url}");return list.filter(x=>x?.name&&x?.url).slice(0,30);}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return(h>>>0).toString(16).padStart(8,"0");}
function extract(html,source){const links=[...html.matchAll(/<a\b([^>]*?)href\s*=\s*["']([^"']+)["']([^>]*)>([\s\S]*?)<\/a>/gi)],out=[];
 for(const m of links){let url;try{url=new URL(decode(m[2]),source.url);if(!["http:","https:"].includes(url.protocol)||url.hostname.toLowerCase()!==new URL(source.url).hostname.toLowerCase())continue;url.hash="";}catch{continue;}
 const title=plain(m[4]);if(title.length<5||title.length>240)continue;
 const before=html.slice(Math.max(0,m.index-900),m.index),after=html.slice(m.index+m[0].length,m.index+m[0].length+1200);
 const context=plain((before.match(/<(tr|li|p|article|div)\b[^>]*>[\s\S]*$/i)?.[0]||"")+m[0]+after).slice(-1200),combined=title+" "+context;
 if(!has(combined))continue;
 out.push({id:"IQGOV-"+hash(url.toString().replace(/\/$/,"").toLowerCase()),sourceName:source.name,country:"Iraq",title:title.replace(/\s*\|\s*/g," ").slice(0,180),url:url.toString(),text:context.slice(0,1800)||title,isIctRelevant:has(combined,ICT)});
 }
 const unique=new Map();for(const r of out){const k=r.url.toLowerCase();if(!unique.has(k)||unique.get(k).text.length<r.text.length)unique.set(k,r);}return[...unique.values()];
}
async function fetchSource(s){const res=await fetch(s.url,{headers:{"user-agent":"Iraq-MTL-Government-Opportunity-Collector/1.0","accept-language":"en,ar;q=0.9"},signal:AbortSignal.timeout(25000)});if(!res.ok)throw Error(`${s.url} returned HTTP ${res.status}`);const html=await res.text();if(!/<html|<body|<a\b/i.test(html))throw Error("Response did not look like HTML");return extract(html,s);}
async function post(payload){const base=process.env.MSSD_SITE_URL?.trim().replace(/\/$/,""),endpoint=process.env.GOVERNMENT_INGEST_ENDPOINT?.trim()||(base?`${base}/api/government-ingest`:""),token=process.env.SOURCE_INGEST_TOKEN?.trim()||process.env.NEWS_INGEST_TOKEN?.trim()||process.env.MEED_INGEST_TOKEN?.trim();if(!endpoint)throw Error("Missing GOVERNMENT_INGEST_ENDPOINT or MSSD_SITE_URL");if(!token)throw Error("Missing SOURCE_INGEST_TOKEN, NEWS_INGEST_TOKEN or MEED_INGEST_TOKEN");
 const headers={"content-type":"application/json",authorization:`Bearer ${token}`};if(process.env.CF_ACCESS_CLIENT_ID&&process.env.CF_ACCESS_CLIENT_SECRET){headers["CF-Access-Client-Id"]=process.env.CF_ACCESS_CLIENT_ID;headers["CF-Access-Client-Secret"]=process.env.CF_ACCESS_CLIENT_SECRET;}
 const res=await fetch(endpoint,{method:"POST",headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(30000)}),body=await res.text();if(!res.ok)throw Error(`Ingest API returned HTTP ${res.status}: ${body.slice(0,500)}`);return JSON.parse(body);}
async function main(){const dir=path.join(process.cwd(),"artifacts","iraq-government");await mkdir(dir,{recursive:true});const list=sources(),errors=[],records=[];
 for(const s of list){try{const found=await fetchSource(s);records.push(...found);console.log(`[OK] ${s.name}: ${found.length} candidates`);}catch(e){errors.push(`${s.name}: ${e.message}`);console.error(`[WARN] ${s.name}: ${e.message}`);}}
 const unique=new Map();for(const r of records)unique.set(r.url.toLowerCase(),r);const candidates=[...unique.values()].slice(0,400);
 const payload={runId:"IQ-GOV-"+new Date().toISOString().replace(/[-:T.Z]/g,"").slice(0,12),generatedAt:new Date().toISOString(),source:"Iraq Government Official Websites",status:errors.length&&candidates.length?"partial":errors.length?"failed":"completed",stats:{sourceCount:list.length,fetchedCandidates:candidates.length,ictRelevant:candidates.filter(x=>x.isIctRelevant).length},records:candidates,errors};
 await writeFile(path.join(dir,"government-tender-payload.json"),JSON.stringify(payload,null,2));
 if(process.env.GOVERNMENT_INGEST_DRY_RUN==="1"){console.log(JSON.stringify({ok:true,dryRun:true,sourceCount:list.length,candidates:candidates.length,errors},null,2));return;}
 const result=await post(payload);await writeFile(path.join(dir,"government-tender-result.json"),JSON.stringify(result,null,2));console.log(JSON.stringify({ok:true,sourceCount:list.length,candidates:candidates.length,errors,result},null,2));if(!candidates.length||errors.length===list.length)process.exitCode=1;
}
main().catch(async e=>{const dir=path.join(process.cwd(),"artifacts","iraq-government");await mkdir(dir,{recursive:true}).catch(()=>{});await writeFile(path.join(dir,"government-tender-failure.json"),JSON.stringify({ok:false,error:e.message,stack:e.stack},null,2)).catch(()=>{});console.error(e);process.exit(1);});
