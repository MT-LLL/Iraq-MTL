import { env } from "cloudflare:workers";

type MeedRecord = {
  meedId?: string;
  parentMeedId?: string;
  title?: string;
  projectDescription?: string;
  projectObjectives?: string;
  projectScope?: string;
  keyProjectMilestones?: string;
  newsAndUpdates?: string;
  latestNews?: string;
  country?: string;
  city?: string;
  industry?: string;
  sector?: string;
  subSector?: string;
  stage?: string;
  status?: string;
  valueUsdM?: number | null;
  netValueUsdM?: number | null;
  projectValueUsdM?: number | null;
  contractValueUsdM?: number | null;
  amountSource?: string;
  updatedOn?: string;
  awardDate?: string;
  completionDate?: string;
  sourceUrl?: string;
  contacts?: Array<{
    role?: string;
    company?: string;
    name?: string;
    title?: string;
    email?: string;
    phone?: string;
    companyPhone?: string;
    source?: string;
  }>;
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
    totalProjectValueUsdM?: number;
    totalContractValueUsdM?: number;
    amountCoverage?: {
      netValue?: number;
      projectValue?: number;
      contractValue?: number;
      unavailable?: number;
    };
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

function stableContactId(opportunityId: string, contact: NonNullable<MeedRecord["contacts"]>[number]) {
  const raw = [opportunityId, safeText(contact.role), safeText(contact.company), safeText(contact.name), safeText(contact.title), safeText(contact.source)].join("|");
  let hash = 2166136261;
  for (let index = 0; index < raw.length; index++) {
    hash ^= raw.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `oc-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function sourceRunId(payload: MeedIngestPayload) {
  return safeText(payload.runId, `MEED-GHA-${Date.now().toString(36).toUpperCase()}`).slice(0, 80);
}

function mergeParentChildRecords(records: MeedRecord[]) {
  const byId = new Map<string, MeedRecord>();
  for (const record of records) {
    const id = safeText(record.meedId);
    if (id) byId.set(id, record);
  }
  const childrenByParent = new Map<string, MeedRecord[]>();
  for (const record of records) {
    const parentId = safeText(record.parentMeedId);
    if (!parentId || parentId === safeText(record.meedId) || !byId.has(parentId)) continue;
    const children = childrenByParent.get(parentId) ?? [];
    children.push(record);
    childrenByParent.set(parentId, children);
  }
  const removedChildIds = new Set<string>();
  const merged = new Map<string, MeedRecord>();
  for (const record of records) {
    const id = safeText(record.meedId);
    if (!id || removedChildIds.has(id)) continue;
    const children = childrenByParent.get(id);
    if (!children?.length) {
      merged.set(id, record);
      continue;
    }
    // A parent amount is a roll-up total; sum children only if the parent amount is absent.
    const parentValue = Number(record.valueUsdM);
    const hasParentValue = record.valueUsdM !== null && record.valueUsdM !== undefined && Number.isFinite(parentValue) && parentValue > 0;
    const childValues = children.map((child) => Number(child.valueUsdM)).filter((value) => Number.isFinite(value) && value >= 0);
    const valueUsdM = hasParentValue ? parentValue : childValues.length ? childValues.reduce((sum, value) => sum + value, 0) : null;
    // Child projects can carry the only available role/contact chain. Preserve
    // those records when consolidating child rows under the parent opportunity.
    const contactKey = (contact: NonNullable<MeedRecord["contacts"]>[number]) => [
      contact.role, contact.company, contact.name, contact.title,
      contact.email, contact.phone, contact.companyPhone,
    ].map((value) => safeText(value).toLowerCase()).join("|");
    const contactsByKey = new Map<string, NonNullable<MeedRecord["contacts"]>[number]>();
    for (const contact of [...(record.contacts ?? []), ...children.flatMap((child) => child.contacts ?? [])]) {
      const key = contactKey(contact);
      if (key.replace(/\|/g, "")) contactsByKey.set(key, contact);
    }
    const mergeText = (primary: unknown, secondary: "keyProjectMilestones" | "newsAndUpdates" | "latestNews") => [...new Set([primary, ...children.map(child => child[secondary])].map(value => safeText(value)).filter(Boolean))].join("\n\n");
    merged.set(id, {
      ...record,
      valueUsdM,
      keyProjectMilestones: mergeText(record.keyProjectMilestones, "keyProjectMilestones"),
      newsAndUpdates: mergeText(record.newsAndUpdates, "newsAndUpdates"),
      latestNews: mergeText(record.latestNews, "latestNews"),
      contacts: [...contactsByKey.values()],
    });
    for (const child of children) removedChildIds.add(safeText(child.meedId));
  }
  return [...merged.values()];
}

async function upsertOpportunity(db: D1Database, record: MeedRecord, now: number) {
  const country = normalizeCountry(record.country);
  const meedId = safeText(record.meedId);
  const title = safeText(record.title);
  if (!country || !meedId || !title) return { skipped: true, existing: false };

  const id = `MEED-${country.code}-${meedId}`;
  const existing = await db.prepare("SELECT id, title, country, industry, stage, priority, score, project_value, bid_deadline, summary, key_project_milestones, news_and_updates, latest_news FROM opportunities WHERE id = ?").bind(id).first<{ id: string; title: string; country: string; industry: string; stage: string; priority: string; score: number; project_value: number | null; bid_deadline: number | null; summary: string | null; key_project_milestones: string | null; news_and_updates: string | null; latest_news: string | null }>();
  const industry = normalizeIndustry(record);
  const stage = safeText(record.stage || record.status, "待核实");
  const city = safeText(record.city, country.fallbackCity);
  // The persisted opportunity amount is NetValue, falling back to ProjectValue.
  // ContractValue is intentionally kept as separate source metadata and is never
  // substituted for either field. valueUsdM remains for older payload compatibility.
  const selectedAmount = record.netValueUsdM ?? record.projectValueUsdM ?? record.valueUsdM;
  const hasProjectValue = selectedAmount !== null && selectedAmount !== undefined && String(selectedAmount).trim() !== "";
  const projectValue = hasProjectValue && Number.isFinite(Number(selectedAmount)) ? Number(selectedAmount) : null;
  const sourceUrl = safeText(record.sourceUrl || "");
  const sourceDescription = [record.projectDescription, record.projectScope, record.projectObjectives]
    .map((value) => safeText(value))
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join("\n\n");
  const keyProjectMilestones = safeText(record.keyProjectMilestones).slice(0, 12000);
  const newsAndUpdates = safeText(record.newsAndUpdates).slice(0, 12000);
  const latestNews = safeText(record.latestNews).slice(0, 12000);
  const summary = sourceDescription
    ? sourceDescription.slice(0, 6000)
    : `MEED原始导出暂未提供可用的项目背景/介绍字段。当前已核实的结构化信息：项目“${title}”，国家${country.zh}，行业${industry}，阶段${stage}。请打开原始MEED记录核验项目范围、建设目标和采购包；不得仅根据标题推测项目内容。`;
  const scoring = scoreOpportunity({
    title, titleEn: title, industry, stage, summary,
    projectScope: record.projectScope, projectValue,
    fundingStatus: "MEED待核实",
    bidDeadline: record.awardDate, contactsCount: 0,
    milestones: keyProjectMilestones,
  });
  const { score, priority, confidence } = scoring;
  const updatedAt = dateToMs(record.updatedOn) ?? now;
  const changedFields = existing ? ([["title", existing.title, title], ["country", existing.country, country.zh], ["industry", existing.industry, industry], ["stage", existing.stage, stage], ["priority", existing.priority, priority], ["score", existing.score, score], ["projectValue", existing.project_value, projectValue], ["bidDeadline", existing.bid_deadline, dateToMs(record.awardDate)], ["summary", existing.summary, summary], ["keyProjectMilestones", existing.key_project_milestones, keyProjectMilestones], ["newsAndUpdates", existing.news_and_updates, newsAndUpdates], ["latestNews", existing.latest_news, latestNews]] as const).filter(([, before, after]) => (before ?? null) !== (after ?? null)).map(([field]) => field) : [];

  await db.prepare(`
    INSERT INTO opportunities (
      id, external_id, title, title_en, country, city, industry, stage, priority, score, confidence,
      project_value, addressable_value, currency, funding_status, bid_deadline, participation_space, win_band,
      summary, key_project_milestones, news_and_updates, latest_news, source_name, source_url, source_license, review_status, is_golden_seed, created_at, updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      currency = excluded.currency,
      addressable_value = excluded.addressable_value,
      funding_status = excluded.funding_status,
      bid_deadline = excluded.bid_deadline,
      participation_space = excluded.participation_space,
      win_band = excluded.win_band,
      summary = excluded.summary,
      key_project_milestones = excluded.key_project_milestones,
      news_and_updates = excluded.news_and_updates,
      latest_news = excluded.latest_news,
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
    confidence,
    projectValue,
    projectValue ? Math.round(projectValue * 0.035 * 10) / 10 : null,
    "USD",
    "MEED待核实",
    dateToMs(record.awardDate),
    priority === "P1" ? "高" : "中",
    priority === "P1" ? "中高" : "中",
    summary,
    keyProjectMilestones,
    newsAndUpdates,
    latestNews,
    "MEED Projects GitHub Actions",
    sourceUrl,
    "MEED licensed export; internal use subject to subscription terms",
    "pending",
    0,
    now,
    updatedAt,
  ).run();

  // Persist contact/role-chain records separately from the project row. Existing
  // contacts are upserted by a stable ID, so weekly imports do not create duplicates.
  for (const contact of (record.contacts ?? []).slice(0, 50)) {
    const normalized = {
      role: safeText(contact.role),
      company: safeText(contact.company),
      name: safeText(contact.name),
      title: safeText(contact.title),
      email: safeText(contact.email),
      phone: safeText(contact.phone),
      companyPhone: safeText(contact.companyPhone),
      source: safeText(contact.source, "MEED Projects with Roles"),
    };
    if (!normalized.role && !normalized.company && !normalized.name && !normalized.email && !normalized.phone && !normalized.companyPhone) continue;
    const contactId = stableContactId(id, normalized);
    await db.prepare(`
      INSERT INTO opportunity_contacts
        (id, opportunity_id, role, company, name, title, email, phone, company_phone, source, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role, company = excluded.company, name = excluded.name,
        title = excluded.title, email = excluded.email, phone = excluded.phone,
        company_phone = excluded.company_phone, source = excluded.source, updated_at = excluded.updated_at
    `).bind(contactId, id, normalized.role, normalized.company, normalized.name, normalized.title, normalized.email, normalized.phone, normalized.companyPhone, normalized.source, now).run();
  }

  const persisted = await db.prepare("SELECT id, title, project_value, currency, summary, key_project_milestones, news_and_updates, latest_news FROM opportunities WHERE id = ?")
    .bind(id)
    .first<{ id: string; title: string; project_value: number | null; currency: string | null; summary: string | null; key_project_milestones: string | null; news_and_updates: string | null; latest_news: string | null }>();
  const amountMatches = (persisted?.project_value ?? null) === (projectValue ?? null);
  const summaryMatches = persisted?.summary === summary;
  const detailFieldsMatch = persisted?.key_project_milestones === keyProjectMilestones && persisted?.news_and_updates === newsAndUpdates && persisted?.latest_news === latestNews;
  const readbackVerified = Boolean(persisted && persisted.id === id && persisted.title === title && amountMatches && persisted.currency === "USD" && summaryMatches && detailFieldsMatch);
  return { skipped: false, existing: Boolean(existing), changedFields, id, title, country: country.zh, industry, priority, score, projectValue, readbackVerified, readback: persisted ?? null };
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
  const incomingRecords = Array.isArray(payload.records) ? payload.records.slice(0, 250) : [];
  const records = mergeParentChildRecords(incomingRecords);
  const mergedParentChildCount = incomingRecords.length - records.length;
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const opportunityIds: string[] = [];
  const changedOpportunities: Array<{ id: string; title: string; changedFields: string[] }> = [];
  const newlyAdded: Array<{ id: string; title: string; country: string; industry: string; priority: string; score: number; projectValue: number | null }> = [];
  const readbackFailures: Array<{ id: string; expectedProjectValue: number | null; persisted: unknown }> = [];

  for (const record of records) {
    const result = await upsertOpportunity(db, record, now);
    if (result.skipped) {
      skipped += 1;
    } else if (result.existing) {
      if (result.changedFields.length > 0) {
        updated += 1;
        changedOpportunities.push({ id: result.id, title: result.title, changedFields: result.changedFields });
      }
    } else {
      inserted += 1;
      newlyAdded.push({ id: result.id, title: result.title, country: result.country, industry: result.industry, priority: result.priority, score: result.score, projectValue: result.projectValue });
    }
    if ("id" in result && result.id) opportunityIds.push(result.id);
    if ("readbackVerified" in result && !result.readbackVerified) {
      readbackFailures.push({ id: result.id, expectedProjectValue: result.projectValue, persisted: result.readback });
    }
  }

  const stats = payload.stats ?? {};
  const sourceCount = 1;
  const hasErrors = Array.isArray(payload.errors) && payload.errors.length > 0;
  const status = payload.status === "failed" ? "failed" : payload.status === "partial" || hasErrors || records.length === 0 || readbackFailures.length > 0 ? "partial" : "completed";
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
    mergedParentChildCount,
    readbackVerified: readbackFailures.length === 0,
    readbackFailureCount: readbackFailures.length,
    readbackFailures,
    opportunityIds,
    changedOpportunities,
    newlyAddedCount: inserted,
    changedCount: updated,
    comparisonAvailable: status === "completed",
    newlyAddedTop5: status === "completed" ? newlyAdded.sort((a, b) => b.score - a.score).slice(0, 5) : [],
    errors: payload.errors ?? [],
  });
  const summary = status === "failed"
    ? `GitHub Actions MEED采集失败：${(payload.errors ?? ["unknown error"]).join("; ").slice(0, 480)}`
    : status === "partial"
      ? `GitHub Actions MEED采集部分完成（结果不作为完整对比）：暂新增${inserted}条，检测到变化${updated}条，跳过${skipped}条。`
      : `GitHub Actions MEED清单刷新完成：新增${inserted}条，实际变化${updated}条，跳过${skipped}条；源文件${stats.sourceRows ?? records.length}条，候选${stats.promotedCount ?? records.length}条。`;

  await db.prepare("INSERT INTO source_scan_runs (id, trigger, status, source_count, new_lead_count, updated_lead_count, promoted_count, summary, metadata, started_at, finished_at, next_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(runId, "github_actions", status, sourceCount, inserted, updated, stats.promotedCount ?? opportunityIds.length, summary, metadata, now, finishedAt, nextRunAt)
    .run();
  await db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), "github-actions", "meed.github_actions_ingested", "source_scan_run", runId, metadata, finishedAt)
    .run();

  return json({ ok: readbackFailures.length === 0, runId, inserted, updated, skipped, mergedParentChildCount, readbackVerified: readbackFailures.length === 0, readbackFailureCount: readbackFailures.length, readbackFailures, opportunityIds, status }, readbackFailures.length === 0 ? 200 : 500);
}
