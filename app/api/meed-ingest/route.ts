import { env } from "cloudflare:workers";

type MeedRecord = {
  meedId?: string;
  title?: string;
  country?: string;
  city?: string;
  industry?: string;
  sector?: string;
  subSector?: string;
  stage?: string;
  status?: string;
  valueUsdM?: number | null;
  updatedOn?: string;
  awardDate?: string;
  completionDate?: string;
  sourceUrl?: string;
};

type MeedIngestPayload = {
  runId?: string;
  generatedAt?: string;
  source?: string;
  searchUrl?: string;
  status?: "completed" | "partial" | "failed";
  stats?: {
    sourceRows?: number;
    validCountryRecords?: number;
    activeOrWatch?: number;
    preAward?: number;
    recent30Days?: number;
    promotedCount?: number;
    totalNetValueUsdM?: number;
  };
  records?: MeedRecord[];
  errors?: string[];
};

type EnvWithSecrets = {
  DB?: D1Database;
  MEED_INGEST_TOKEN?: string;
};

const countryMap: Record<string, { zh: string; code: string; fallbackCity: string }> = {
  iraq: { zh: "伊拉克", code: "IQ", fallbackCity: "Baghdad" },
  jordan: { zh: "约旦", code: "JO", fallbackCity: "Amman" },
  lebanon: { zh: "黎巴嫩", code: "LB", fallbackCity: "Beirut" },
};

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

function configuredEnv() {
  return env as unknown as EnvWithSecrets;
}

function tokenFrom(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (header.toLowerCase().startsWith("bearer ")) return header.slice(7).trim();
  return request.headers.get("x-mssd-ingest-token")?.trim() || "";
}

function assertAuthorized(request: Request) {
  const expected = configuredEnv().MEED_INGEST_TOKEN?.trim();
  if (!expected || expected.length < 24) return false;
  return tokenFrom(request) === expected;
}

function safeText(value: unknown, fallback = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function normalizeCountry(value: string | undefined) {
  const key = safeText(value).toLowerCase();
  return countryMap[key] ?? null;
}

function normalizeIndustry(record: MeedRecord) {
  const text = `${record.industry ?? ""} ${record.sector ?? ""} ${record.subSector ?? ""} ${record.title ?? ""}`.toLowerCase();
  if (/oil|gas|petroleum|pipeline|refinery/.test(text)) return "Oil & Gas";
  if (/power|electric|substation|solar|bess|energy/.test(text)) return "Electricity";
  if (/rail|metro/.test(text)) return "Railway";
  if (/road|traffic|highway|airport|transport/.test(text)) return "Road";
  if (/port|marine|water transport/.test(text)) return "Water Transport";
  if (/hospital|health|medical/.test(text)) return "Healthcare";
  if (/school|university|education/.test(text)) return "Education";
  if (/retail|wholesale|mall|hotel|commercial/.test(text)) return "Retail & Wholesale";
  if (/telecom|ict|data center|datacentre|software|industrial|manufacturing|plant/.test(text)) return "Machinery & Electronic";
  return "Government Sector";
}

function scoreRecord(record: MeedRecord) {
  const value = Number(record.valueUsdM ?? 0);
  const stage = safeText(record.stage || record.status).toLowerCase();
  const preAward = /study|design|feed|bid|pq|pre-qual|tender/.test(stage);
  const active = !/complete|cancel/.test(stage);
  const score = Math.min(86, 44 + (value >= 1000 ? 18 : value >= 300 ? 12 : value >= 50 ? 7 : 3) + (preAward ? 16 : active ? 8 : 0));
  const priority = score >= 74 ? "P1" : score >= 62 ? "P2" : "WATCH";
  return { score, priority };
}

function dateToMs(value: string | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : null;
}

function sourceRunId(payload: MeedIngestPayload) {
  return safeText(payload.runId, `MEED-GHA-${Date.now().toString(36).toUpperCase()}`).slice(0, 80);
}

async function upsertOpportunity(db: D1Database, record: MeedRecord, now: number) {
  const country = normalizeCountry(record.country);
  const meedId = safeText(record.meedId);
  const title = safeText(record.title);
  if (!country || !meedId || !title) return { skipped: true, existing: false };

  const id = `MEED-${country.code}-${meedId}`;
  const existing = await db.prepare("SELECT id FROM opportunities WHERE id = ?").bind(id).first<{ id: string }>();
  const industry = normalizeIndustry(record);
  const stage = safeText(record.stage || record.status, "待核实");
  const city = safeText(record.city, country.fallbackCity);
  const { score, priority } = scoreRecord(record);
  const projectValue = Number.isFinite(Number(record.valueUsdM)) ? Number(record.valueUsdM) : null;
  const sourceUrl = safeText(record.sourceUrl || "");
  const summary = `GitHub Actions从MEED自动采集：${title}，当前阶段${stage}，行业${industry}。需人工复核资金路径、ICT工作包、联系人和截标日期后进入正式经营。`;
  const updatedAt = dateToMs(record.updatedOn) ?? now;

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
      project_value = excluded.project_value,
      addressable_value = excluded.addressable_value,
      funding_status = excluded.funding_status,
      bid_deadline = excluded.bid_deadline,
      participation_space = excluded.participation_space,
      win_band = excluded.win_band,
      summary = excluded.summary,
      source_name = excluded.source_name,
      source_url = excluded.source_url,
      source_license = excluded.source_license,
      review_status = excluded.review_status,
      updated_at = excluded.updated_at
  `).bind(
    id,
    meedId,
    title,
    title,
    country.zh,
    city,
    industry,
    stage,
    priority,
    score,
    0.64,
    projectValue,
    projectValue ? Math.round(projectValue * 0.035 * 10) / 10 : null,
    "USD",
    "MEED待核实",
    dateToMs(record.awardDate),
    priority === "P1" ? "高" : "中",
    priority === "P1" ? "中高" : "中",
    summary,
    "MEED Projects GitHub Actions",
    sourceUrl,
    "MEED licensed export; internal use subject to subscription terms",
    "pending",
    0,
    now,
    updatedAt,
  ).run();

  return { skipped: false, existing: Boolean(existing), id };
}

export async function POST(request: Request) {
  if (!assertAuthorized(request)) return json({ ok: false, error: "UNAUTHORIZED" }, 401);
  const db = configuredEnv().DB;
  if (!db) return json({ ok: false, error: "D1_NOT_CONFIGURED" }, 500);

  let payload: MeedIngestPayload;
  try {
    payload = await request.json() as MeedIngestPayload;
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }

  const now = Date.now();
  const runId = sourceRunId(payload);
  const records = Array.isArray(payload.records) ? payload.records.slice(0, 250) : [];
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const opportunityIds: string[] = [];

  for (const record of records) {
    const result = await upsertOpportunity(db, record, now);
    if (result.skipped) {
      skipped += 1;
    } else if (result.existing) {
      updated += 1;
    } else {
      inserted += 1;
    }
    if ("id" in result && result.id) opportunityIds.push(result.id);
  }

  const stats = payload.stats ?? {};
  const sourceCount = 1;
  const status = payload.status === "failed" ? "failed" : payload.status === "partial" ? "partial" : "completed";
  const finishedAt = Date.now();
  const nextRunAt = finishedAt + 7 * 86400000;
  const metadata = JSON.stringify({
    source: payload.source || "MEED Projects GitHub Actions",
    searchUrl: payload.searchUrl || "",
    generatedAt: payload.generatedAt || new Date(now).toISOString(),
    stats,
    inserted,
    updated,
    skipped,
    opportunityIds,
    errors: payload.errors ?? [],
  });
  const summary = status === "failed"
    ? `GitHub Actions MEED采集失败：${(payload.errors ?? ["unknown error"]).join("; ").slice(0, 480)}`
    : `GitHub Actions MEED采集完成：新增${inserted}条，更新${updated}条，跳过${skipped}条；源文件${stats.sourceRows ?? records.length}条，候选${stats.promotedCount ?? records.length}条。`;

  await db.prepare("INSERT INTO source_scan_runs (id, trigger, status, source_count, new_lead_count, updated_lead_count, promoted_count, summary, metadata, started_at, finished_at, next_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, "github_actions", status, sourceCount, inserted, updated, stats.promotedCount ?? opportunityIds.length, summary, metadata, now, finishedAt, nextRunAt)
    .run();
  await db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "github-actions", "meed.github_actions_ingested", "source_scan_run", runId, metadata, finishedAt)
    .run();

  return json({ ok: true, runId, inserted, updated, skipped, opportunityIds, status });
}
