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
  titleEn?: string;
  translatedText?: string;
  translationStatus?: string;
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

const industryContextTerms = [
  "data center", "datacentre", "cloud", "fiber", "fibre", "telecom", "network", "ict", "software", "cybersecurity", "cctv", "smart city", "digital",
  "power", "electric", "substation", "solar", "bess", "energy", "oil", "gas", "petroleum", "pipeline", "refinery",
  "hospital", "health", "medical", "airport", "rail", "road", "transport", "port", "water", "sewage", "infrastructure",
  "اتصالات", "شبكة", "ألياف", "كهرباء", "طاقة", "نفط", "غاز", "مستشفى", "صحة", "مطار", "ميناء", "طريق", "سكك", "مياه", "بنية تحتية",
];

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

function hasTerm(text: string, terms: string[]) {
  const lower = text.toLowerCase();
  return terms.some(term => lower.includes(term.toLowerCase()));
}

function looksRelevant(text: string) {
  return hasTerm(text, tenderTerms) && hasTerm(text, industryContextTerms);
}

function titleFrom(record: TelegramTenderRecord) {
  const explicit = safeText(record.titleEn || record.title);
  if (explicit) return explicit.slice(0, 180);
  const text = safeText(record.text, "Telegram tender signal");
  const firstSentence = text.split(/[.!؟。؛\n]/).find(Boolean) || text;
  return firstSentence.slice(0, 180);
}

function scoreTender(text: string) {
  let score = 28;
  if (/tender|bid|rfp|rfq|procurement|مناقصة|عطاء|استدراج عروض|طلب عروض/i.test(text)) score += 22;
  if (/prequalification|pre-qualification|eoi|expression of interest|تأهيل مسبق|إبداء اهتمام/i.test(text)) score += 10;
  if (/award|awarded|contract award|إحالة|ترسية/i.test(text)) score += 8;
  if (/deadline|closing date|extension|clarification|تمديد|توضيح/i.test(text)) score += 6;
  if (/data center|datacentre|cloud|fiber|network|telecom|ict|software|cybersecurity|power|oil|gas|اتصالات|شبكة|ألياف|كهرباء|نفط|غاز/i.test(text)) score += 12;
  if (/iraq|iraqi|jordan|jordanian|lebanon|lebanese|العراق|الأردن|لبنان/i.test(text)) score += 4;
  const capped = Math.min(score, 78);
  return { score: capped, priority: capped >= 68 ? "P1" : capped >= 54 ? "P2" : "WATCH" };
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
  const translatedText = safeText(record.translatedText);
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  if (!country || !text || !looksRelevant(`${record.titleEn || record.title || ""} ${translatedText} ${text}`)) return { skipped: true, existing: false };
  if (hasArabic && (!translatedText || /[\u0600-\u06FF]/.test(translatedText) || record.translationStatus !== "translated")) return { skipped: true, existing: false };

  const id = stableRecordId(record, country.code);
  const existing = await db.prepare("SELECT id FROM opportunities WHERE id = ?").bind(id).first<{ id: string }>();
  const title = titleFrom(record);
  const analysisText = `${title} ${translatedText || text}`;
  const industry = normalizeIndustry(analysisText);
  const { score, priority } = scoreTender(analysisText);
  const sourceName = `Telegram Tender · ${safeText(record.channelTitle || record.channel, "Public Channel")}`;
  const sourceUrl = safeText(record.url);
  const publishedAt = dateToMs(record.publishedAt, now);
  // Confidence reflects evidence completeness, not proof that the tender is valid.
  const hasTenderReference = /\b(?:RFP|RFQ|EOI|ITB|ITT|tender\s*(?:no|number|#))\s*[-:#]?\s*[A-Z0-9/-]{3,}/i.test(analysisText);
  const confidence = Math.min(0.70, Math.round((0.35 + (sourceUrl ? 0.10 : 0) + (publishedAt ? 0.08 : 0) + (record.translationStatus === "translated" || !hasArabic ? 0.05 : 0) + (hasTenderReference ? 0.12 : 0)) * 100) / 100);
  const stage = /award|awarded|contract award|إحالة|ترسية/i.test(analysisText) ? "Award / result notice" : /clarification|extension|تمديد|توضيح/i.test(analysisText) ? "Clarification / extension notice" : "Tender / procurement notice";
  const summary = `Telegram procurement lead (machine-translated where applicable): ${(translatedText || text).slice(0, 900)}${(translatedText || text).length > 900 ? "…" : ""} Review the original source to verify tender ID, deadline, procuring entity, contacts, attachments and ICT work packages.`;

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
    confidence,
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

  const evidenceExcerpt = translatedText
    ? `English translation: ${translatedText.slice(0, 1400)}\n\nOriginal source text: ${text.slice(0, 1400)}`
    : text.slice(0, 900);
  const existingEvidence = sourceUrl
    ? await db.prepare("SELECT id FROM evidence WHERE opportunity_id = ? AND kind = ? AND source_url = ? LIMIT 1").bind(id, "telegram_tender", sourceUrl).first<{ id: string }>()
    : await db.prepare("SELECT id FROM evidence WHERE opportunity_id = ? AND kind = ? AND excerpt = ? LIMIT 1").bind(id, "telegram_tender", evidenceExcerpt).first<{ id: string }>();
  if (existingEvidence) {
    await db.prepare("UPDATE evidence SET excerpt = ?, collected_at = ? WHERE id = ?").bind(evidenceExcerpt, now, existingEvidence.id).run();
  } else {
    await db.prepare("INSERT INTO evidence (id, opportunity_id, kind, excerpt, source_url, collected_at) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), id, "telegram_tender", evidenceExcerpt, sourceUrl, now)
      .run();
  }

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
    ? `Telegram Tender Radar failed: ${(payload.errors ?? ["unknown error"]).join("; ").slice(0, 480)}`
    : `Telegram Tender Radar: fetched ${stats.fetchedMessages ?? records.length}, tender/sector matches ${stats.relevantMessages ?? opportunityIds.length}, translated ${stats.translatedMessages ?? 0}, inserted ${inserted}, updated ${updated}, skipped ${skipped}. Verified promotions: 0; manual review required.`

  await db.prepare("INSERT INTO source_scan_runs (id, trigger, status, source_count, new_lead_count, updated_lead_count, promoted_count, summary, metadata, started_at, finished_at, next_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, "github_actions_telegram", status, stats.channels ?? 0, inserted, updated, 0, summary, metadata, now, finishedAt, nextRunAt)
    .run();
  await db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "github-actions", "telegram.tender_ingested", "source_scan_run", runId, metadata, finishedAt)
    .run();

  return json({ ok: true, runId, inserted, updated, skipped, opportunityIds, status });
}
