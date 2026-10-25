import { env } from "cloudflare:workers";
type RecordItem = { id?: string; sourceName?: string; country?: string; title?: string; url?: string; text?: string; isIctRelevant?: boolean };
type Payload = { runId?: string; generatedAt?: string; source?: string; status?: "completed" | "partial" | "failed"; stats?: { sourceCount?: number; fetchedCandidates?: number; ictRelevant?: number }; records?: RecordItem[]; errors?: string[] };
type RuntimeEnv = { DB?: D1Database; SOURCE_INGEST_TOKEN?: string; NEWS_INGEST_TOKEN?: string; MEED_INGEST_TOKEN?: string };
const e = () => env as unknown as RuntimeEnv;
const clean = (v: unknown, d = "") => String(v ?? "").replace(/\s+/g, " ").trim() || d;
const json = (v: unknown, s = 200) => Response.json(v, { status: s });
function auth(req: Request) {
  const x = e(), expected = (x.SOURCE_INGEST_TOKEN || x.NEWS_INGEST_TOKEN || x.MEED_INGEST_TOKEN || "").trim();
  const h = req.headers.get("authorization") || "";
  const token = h.toLowerCase().startsWith("bearer ") ? h.slice(7).trim() : (req.headers.get("x-mssd-ingest-token") || "").trim();
  return expected.length >= 24 && token === expected;
}
function hash(s: string) { let h = 2166136261; for (let i=0;i<s.length;i++) { h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return (h>>>0).toString(16).padStart(8,"0"); }
function industry(s: string) {
  if (/oil|gas|petroleum|refinery|pipeline|نفط|غاز|مصفاة/i.test(s)) return "Oil & Gas";
  if (/electric|power|substation|energy|كهرباء|طاقة/i.test(s)) return "Electricity";
  if (/telecom|communication|network|fiber|fibre|data center|datacenter|cyber|software|ict|cctv|camera|tracking|radio|wireless|internet|server|cloud|telephone|cable|اتصالات|شبكة|ألياف|كاميرات|برمجيات/i.test(s)) return "Machinery & Electronic";
  if (/road|transport|traffic|airport|port|نقل|طريق|ميناء|مطار/i.test(s)) return "Road";
  if (/hospital|medical|health|مستشفى|صحة|طبي/i.test(s)) return "Healthcare";
  if (/school|university|education|مدرسة|جامعة|تعليم/i.test(s)) return "Education";
  return "Government Sector";
}
function score(s: string) { let n=50; if (/tender|bid|rfp|rfq|procurement|مناقصة|عطاء|طلب عروض|استدراج عروض/i.test(s)) n+=16; if (/telecom|communication|network|fiber|data center|cyber|ict|software|اتصالات|شبكة|ألياف/i.test(s)) n+=14; if (/deadline|closing date|prequalification|eoi|آخر موعد|تأهيل مسبق|إبداء اهتمام/i.test(s)) n+=8; n=Math.min(n,84); return { score:n, priority:n>=74?"P1":n>=62?"P2":"WATCH" }; }
export async function POST(request: Request) {
  if (!auth(request)) return json({ ok:false, error:"UNAUTHORIZED" },401);
  const db=e().DB; if (!db) return json({ok:false,error:"D1_NOT_CONFIGURED"},500);
  let p: Payload; try { p=await request.json() as Payload; } catch { return json({ok:false,error:"INVALID_JSON"},400); }
  const now=Date.now(), runId=clean(p.runId,`IQ-GOV-${now.toString(36).toUpperCase()}`).slice(0,80);
  const records=Array.isArray(p.records)?p.records.slice(0,400):[];
  let inserted=0,updated=0,skipped=0; const ids:string[]=[];
  for (const r of records) {
    const title=clean(r.title), url=clean(r.url), excerpt=clean(r.text);
    let host=""; try { host=new URL(url).hostname.toLowerCase(); } catch { skipped++; continue; }
    if (!title || !/^https?:\/\//i.test(url) || !/(^|\.)gov\.iq$/.test(host)) { skipped++; continue; }
    const id=`IQGOV-${hash(url.replace(/\/$/,"").toLowerCase())}`;
    const old=await db.prepare("SELECT id FROM opportunities WHERE id = ?").bind(id).first<{id:string}>();
    const combined=`${title} ${excerpt}`, sc=score(combined), sourceName=clean(r.sourceName,"Iraq Government Official Website");
    const summary=`伊拉克政府官网公告采集线索：${excerpt.slice(0,420)}${excerpt.length>420?"…":""}。采购编号、截止日期、金额及ICT范围需以官方公告原文复核。`;
    await db.prepare(`INSERT INTO opportunities (id,external_id,title,title_en,country,city,industry,stage,priority,score,confidence,project_value,addressable_value,currency,funding_status,bid_deadline,participation_space,win_band,summary,source_name,source_url,source_license,review_status,is_golden_seed,created_at,updated_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(id) DO UPDATE SET title=excluded.title,title_en=excluded.title_en,industry=excluded.industry,stage=excluded.stage,priority=excluded.priority,score=excluded.score,confidence=excluded.confidence,summary=excluded.summary,source_name=excluded.source_name,source_url=excluded.source_url,source_license=excluded.source_license,updated_at=excluded.updated_at`)
      .bind(id,clean(r.id,url),title,title,"伊拉克","Baghdad",industry(combined),"政府公告待核实",sc.priority,sc.score,r.isIctRelevant?0.62:0.48,null,null,"USD","官方公告待核实",null,r.isIctRelevant?"中":"低","中",summary,sourceName,url,"Official Iraqi government website; public notice link","pending",0,now,now).run();
    await db.prepare("INSERT INTO evidence (id,opportunity_id,kind,excerpt,source_url,collected_at) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(),id,"iraq_government_notice",(excerpt||title).slice(0,900),url,now).run();
    if(old) updated++; else inserted++; ids.push(id);
  }
  const status=p.status==="failed"?"failed":p.status==="partial"?"partial":"completed", finished=Date.now();
  const metadata=JSON.stringify({source:p.source||"Iraq Government Official Websites",generatedAt:p.generatedAt||new Date(now).toISOString(),stats:p.stats||{},inserted,updated,skipped,opportunityIds:ids,errors:p.errors||[]});
  const summary=`伊拉克政府官网采集${status==="failed"?"失败":status==="partial"?"部分完成":"完成"}：候选${records.length}条，新增${inserted}条，更新${updated}条，跳过${skipped}条。`;
  await db.prepare("INSERT INTO source_scan_runs (id,trigger,status,source_count,new_lead_count,updated_lead_count,promoted_count,summary,metadata,started_at,finished_at,next_run_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)")
    .bind(runId,"github_actions_iraq_government",status,p.stats?.sourceCount??0,inserted,updated,ids.length,summary,metadata,now,finished,finished+86400000).run();
  await db.prepare("INSERT INTO audit_logs (id,actor_id,action,entity_type,entity_id,metadata,created_at) VALUES (?,?,?,?,?,?,?)")
    .bind(crypto.randomUUID(),"github-actions","iraq_government.notice_ingested","source_scan_run",runId,metadata,finished).run();
  return json({ok:true,runId,inserted,updated,skipped,opportunityIds:ids,status});
}