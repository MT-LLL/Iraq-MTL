import { env } from "cloudflare:workers";

type TelegramTenderRecord = {
  id?: string;
  channel?: string;
  channelTitle?: string;
  country?: string;
  url?: string;
  publishedAt?: string;
  text?: string;
  title?: string;
  lang?: string;
};

type TelegramTenderIngestPayload = {
  runId?: string;
  generatedAt?: string;
  source?: string;
  status?: "completed" | "partial" | "failed";
  stats?: {
    channels?: number;
    fetchedMessages?: number;
    relevantMessages?: number;
    promotedCount?: number;
  };
  records?: TelegramTenderRecord[];
  errors?: string[];
};

type EnvWithSecrets = {
  DB?: D1Database;
  SOURCE_INGEST_TOKEN?: string;
  NEWS_INGEST_TOKEN?: string;
  MEED_INGEST_TOKEN?: string;
};

const countryMap: Record<string, { zh: string; code: string; fallbackCity: string }> = {
  iraq: { zh: "伊拉克", code: "IQ", fallbackCity: "Baghdad" },
  "العراق": { zh: "伊拉克", code: "IQ", fallbackCity: "Baghdad" },
  jordan: { zh: "约旦", code: "JO", fallbackCity: "Amman" },
  "الأردن": { zh: "约旦", code: "JO", fallbackCity: "Amman" },
  lebanon: { zh: "黎巴嫩", code: "LB", fallbackCity: "Beirut" },
  "لبنان": { zh: "黎巴嫩", code: "LB", fallbackCity: "Beirut" },
};

const tenderTerms = [
  "tender", "bid", "rfp", "rfq", "eoi", "prequalification", "pre-qualification", "procurement",
  "expression of interest", "invitation to bid", "invitation for bids", "call for tenders",
  "contract award", "awarded contract", "clarification", "extension", "closing date", "deadline",
  "purchase order", "request for quotation", "request for proposal", "auction", "supplier registration",
  "vendor registration", "مناقصة", "عطاء", "استدراج عروض", "طلب عروض", "طلب تقديم عروض",
  "طلب إبداء اهتمام", "إبداء اهتمام", "تأهيل مسبق", "تمديد", "توضيح", "إحالة", "ترسية",
  "إعلان شراء", "شراء عام", "توريد", "استشارة", "دعوة",
];

function configuredEnv() {
  return env as unknown as EnvWithSecrets;
}

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function tokenFrom(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-mssd-ingest-token")?.trim() || "";
}

function assertAuthorized(request: Request) {
  const environment = configuredEnv();
  const expected = (environment.SOURCE_INGEST_TOKEN || environment.NEWS_INGEST_TOKEN || environment.MEED_INGEST_TOKEN || "").trim();
  return expected.length >= 24 && tokenFrom(request) === expected;
}

function safeText(value: unknown, fallback = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function normalizeCountry(value: string | undefined) {
  const key = safeText(value).toLowerCase();
  return countryMap[key] ?? countryMap[key.replace(/^the\s+/, "")] ?? null;
}

function normalizeIndustry(textInput: string) {
  const text = textInput.toLowerCase();
  if (/oil|gas|petroleum|pipeline|refinery|نفط|غاز|مصفاة/.test(text)) return "Oil & Gas";
  if (/power|electric|substation|solar|bess|energy|كهرباء|طاقة|شمسي/.test(text)) return "Electricity";
  if (/rail|metro|سكك|قطار|مترو/.test(text)) return "Railway";
  if (/road|traffic|highway|transport|طريق|مرور|نقل/.test(text)) return "Road";
  if (/port|marine|water transport|harbour|harbor|ميناء|بحر/.test(text)) return "Water Transport";
  if (/hospital|health|medical|مستشفى|صحة|طبي/.test(text)) return "Healthcare";
  if (/school|university|education|مدرسة|جامعة|تعليم/.test(text)) return "Education";
  if (/retail|wholesale|mall|hotel|commercial|تجارة|سوق|فندق/.test(text)) return "Retail & Wholesale";
  if (/telecom|ict|data center|datacentre|software|fiber|network|cloud|industrial|اتصالات|شبكة|ألياف|سحابي|مركز بيانات/.test(text)) return "Machinery & Electronic";
  return "Government Sector";
}

function looksRelevant(text: string) {
  const lower = text.toLowerCase();
  return tenderTerms.some(term => lower.includes(term.toLowerCase()));
}

function titleFrom(record: TelegramTenderRecord) {
  const explicit = safeText(record.title);
  if (explicit) return explicit.slice(0, 180);
  const text = safeText(record.text, "Telegram tender signal");
  const firstSentence = text.split(/[.!؟。؛\n]/).find(Boolean) || text;
  return firstSentence.slice(0, 180);
}

function scoreTender(text: string) {
  let score = 42;
  if (/tender|bid|rfp|rfq|procurement|مناقصة|عطاء|استدراج عروض|طلب عروض/i.test(text)) score += 24;
  if (/prequalification|pre-qualification|eoi|expression of interest|تأهيل مسبق|إبداء اهتمام/i.test(text)) score += 14;
  if (/award|awarded|contract award|إحالة|ترسية/i.test(text)) score += 10;
  if (/deadline|closing date|extension|clarification|تمديد|توضيح/i.test(text)) score += 8;
  if (/data center|cloud|fiber|network|telecom|power|oil|gas|اتصالات|شبكة|ألياف|كهرباء|نفط|غاز/i.test(text)) score += 12;
  const capped = Math.min(score, 84);
  return { score: capped, priority: capped >= 74 ? "P1" : capped >= 62 ? "P2" : "WATCH" };
}

function dateToMs(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : fallback;
}

function sourceRunId(payload: TelegramTenderIngestPayload) {
  return safeText(payload.runId, `TG-TENDER-${Date.now().toString(36).toUpperCase()}`).slice(0, 80);
}

function stableRecordId(record: TelegramTenderRecord, countryCode: string) {
  const raw = safeText(record.id || record.url || `${record.channel}-${record.publishedAt}-${titleFrom(record)}`);
  const sanitized = raw.replace(/^https?:\/\//, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").slice(-90);
  return `TG-${countryCode}-${sanitized || crypto.randomUUID().slice(0, 12)}`;
}

async function upsertTenderSignal(db: D1Database, record: TelegramTenderRecord, now: number) {
  const country = normalizeCountry(record.country);
  const text = safeText(record.text);
  if (!country || !text || !looksRelevant(text)) return { skipped: true, existing: false };

  const id = stableRecordId(record, country.code);
  const existing = await db.prepare("SELECT id FROM opportunities WHERE id = ?").bind(id).first<{ id: string }>();
  const title = titleFrom(record);
  const industry = normalizeIndustry(`${title} ${text}`);
  const { score, priority } = scoreTender(`${title} ${text}`);
  const sourceName = `Telegram Tender · ${safeText(record.channelTitle || record.channel, "Public Channel")}`;
  const sourceUrl = safeText(record.url);
  const publishedAt = dateToMs(record.publishedAt, now);
  const stage = /award|awarded|إحالة|ترسية/i.test(text) ? "Telegram公告：授标/结果" : /clarification|extension|تمديد|توضيح/i.test(text) ? "Telegram公告：澄清/延期" : "Telegram公告：招投标信息";
  const summary = `Telegram招投标公告线索：${text.slice(0, 420)}${text.length > 420 ? "…" : ""}。需复核正式采购编号、截标日期、采购单位、联系人、附件和可拆分ICT工作包。`;

  await db.prepare(`
    INSERT INTO opportunities (
      id, external_id, title, title_en, country, city, industry, stage, priority, score, confidence,
      project_value, addressable_value, currency, funding_status, bid_deadline, participation_space, win_band,
      summary, source_name, source_url, source_license, review_status, is_golden_seed, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      title_en = excluded.title_en,
      country = excluded.country,
      city = excluded.city,
      industry = excluded.industry,
      stage = excluded.stage,
      priority = excluded.priority,
      score = excluded.score,
      confidence = excluded.confidence,
      funding_status = excluded.funding_status,
      summary = excluded.summary,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_license = excluded.source_license,
      updated_at = excluded.updated_at
  `).bind(
    id,
    safeText(record.id || record.url),
    title,
    title,
    country.zh,
    country.fallbackCity,
    industry,
    stage,
    priority,
    score,
    0.52,
    null,
    null,
    "USD",
    "招投标公告待核实",
    null,
    priority === "P1" ? "中" : "低",
    "中",
    summary,
    sourceName,
    sourceUrl,
    "Public Telegram tender channel preview or authorized Telegram API; verify sharing rights before external redistribution",
    "pending",
    0,
    now,
    publishedAt,
  ).run();

  await db.prepare("INSERT INTO evidence (id, opportunity_id, kind, excerpt, source_url, collected_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), id, "telegram_tender", text.slice(0, 900), sourceUrl, now)
    .run();

  return { skipped: false, existing: Boolean(existing), id };
}

export async function POST(request: Request) {
  if (!assertAuthorized(request)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  const db = configuredEnv().DB;
  if (!db) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 500);

  let payload: TelegramTenderIngestPayload;
  try {
    payload = await request.json() as TelegramTenderIngestPayload;
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const now = Date.now();
  const runId = sourceRunId(payload);
  const records = Array.isArray(payload.records) ? payload.records.slice(0, 400) : [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const opportunityIds: string[] = [];

  for (const record of records) {
    const result = await upsertTenderSignal(db, record, now);
    if (result.skipped) skipped += 1;
    else if (result.existing) updated += 1;
    else inserted += 1;
    if ("id" in result && result.id) opportunityIds.push(result.id);
  }

  const stats = payload.stats ?? {};
  const status = payload.status === "failed" ? "failed" : payload.status === "partial" ? "partial" : "completed";
  const finishedAt = Date.now();
  const nextRunAt = finishedAt + 24 * 3600000;
  const metadata = JSON.stringify({
    source: payload.source || "Telegram Tender Radar",
    generatedAt: payload.generatedAt || new Date(now).toISOString(),
    stats,
    inserted,
    updated,
    skipped,
    opportunityIds,
    errors: payload.errors ?? [],
  });
  const summary = status === "failed"
    ? `Telegram招投标雷达采集失败：${(payload.errors ?? ["unknown error"]).join("; ").slice(0, 480)}`
    : `Telegram招投标雷达采集完成：抓取${stats.fetchedMessages ?? records.length}条，命中${stats.relevantMessages ?? opportunityIds.length}条；新增${inserted}条，更新${updated}条，跳过${skipped}条。`;

  await db.prepare("INSERT INTO source_scan_runs (id, trigger, status, source_count, new_lead_count, updated_lead_count, promoted_count, summary, metadata, started_at, finished_at, next_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, "github_actions_telegram", status, stats.channels ?? 0, inserted, updated, opportunityIds.length, summary, metadata, now, finishedAt, nextRunAt)
    .run();
  await db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "github-actions", "telegram.tender_ingested", "source_scan_run", runId, metadata, finishedAt)
    .run();

  return json({ ok: true, runId, inserted, updated, skipped, opportunityIds, status });
}
