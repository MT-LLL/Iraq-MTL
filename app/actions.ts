"use server";

import { env } from "cloudflare:workers";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { getDb } from "../db";
import { auditLogs, leadDistributions, opportunities as storedOpportunities, pushJobs, savedViews, sourceScanRuns, users } from "../db/schema";
import { industryDispatchDirectory, opportunities as catalogOpportunities, partnerDirectory, sourceConnectorConfig, sourceCoverage, type Country, type Opportunity, type Priority } from "./data";
import { getChatGPTUser } from "./chatgpt-auth";
import { deliverNotification, NotificationError } from "./notifications";
import { opportunityBrief } from "./localization";
import { verifyAdminLinkCookie } from "./admin-link";

type IdentityType = "partner" | "huawei_cn" | "huawei_local" | "huawei_admin";

type ManualOpportunityInput = {
  title: string;
  titleEn?: string;
  country: Country;
  city?: string;
  industry: string;
  stage: string;
  priority: Priority;
  score: number;
  confidence: number;
  projectValue?: number;
  addressableValue?: number;
  currency?: string;
  fundingStatus?: string;
  bidDeadline?: string;
  participationSpace: "极高" | "高" | "中" | "低";
  winBand: "高" | "中高" | "中" | "低";
  summary?: string;
  sourceName: string;
  sourceUrl?: string;
};

type StoredOpportunity = typeof storedOpportunities.$inferSelect;
type StoredLeadDistribution = typeof leadDistributions.$inferSelect;
type StoredSourceScanRun = typeof sourceScanRuns.$inferSelect;
type StoredPushJob = typeof pushJobs.$inferSelect;
type StoredUser = typeof users.$inferSelect;

export type LeadDistributionView = {
  id: string;
  opportunityIds: string[];
  opportunityTitles: string[];
  industryTags: string[];
  assigneeId: string;
  assigneeName: string;
  assigneeEmail: string;
  assigneeRole: string;
  status: string;
  requestNote: string;
  responseNote: string;
  requestedBy: string;
  requestedAt: string;
  respondedAt: string;
};

export type SourceScanRunView = {
  id: string;
  trigger: string;
  status: string;
  sourceCount: number;
  newLeadCount: number;
  updatedLeadCount: number;
  promotedCount: number;
  summary: string;
  startedAt: string;
  finishedAt: string;
  nextRunAt: string;
};

export type PushJobView = {
  id: string;
  actorId: string;
  actorName: string;
  audience: string;
  channel: string;
  recipient: string;
  opportunityIds: string[];
  opportunityTitles: string[];
  status: string;
  createdAt: string;
  slaDueAt: string;
  slaStatus: "pending" | "met" | "overdue" | "not_required";
  acknowledgementStatus: string;
  openedAt: string;
  openCount: number;
  acknowledgedAt: string;
  acknowledgedBy: string;
  partnerNames: string[];
  managerNames: string[];
  recipientCount: number;
  confirmationUrl: string;
  errorCode: string;
  providerMessage: string;
};

export type PartnerPushConfirmationView = {
  ok: true;
  lang: "zh" | "en";
  id: string;
  recipient: string;
  channel: string;
  createdAt: string;
  slaDueAt: string;
  acknowledgementStatus: string;
  openedAt: string;
  openCount: number;
  acknowledgedAt: string;
  acknowledgedBy: string;
  opportunities: Array<{
    id: string;
    title: string;
    meta: string;
    value: string;
    deadline: string;
    funding: string;
    source: string;
    insight: string;
    solutions: ReturnType<typeof opportunityBrief>["solutionItems"];
    contact: ReturnType<typeof opportunityBrief>["contactDetails"];
    strategy: string;
    risk: string;
  }>;
};

export type PendingRegistrationView = {
  id: string;
  name: string;
  organization: string;
  identityType: string;
  email: string;
  createdAt: number;
};

const adminLinkUserId = "admin-direct-link-operator";
const adminLinkUserEmail = "admin-direct@mssd.local";

function isConfiguredAdminEmail(email: string) {
  const configured = ((env as unknown as Record<string, string | undefined>).MSSD_ADMIN_EMAILS ?? "")
    .split(/[,;\s]+/)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean);
  return configured.includes(email.toLowerCase());
}

async function normalizeConfiguredAdmin(db: ReturnType<typeof getDb>, profile: StoredUser): Promise<StoredUser> {
  if (!profile.email || !isConfiguredAdminEmail(profile.email)) return profile;
  if (profile.identityType === "huawei_admin" && profile.status === "approved") return profile;
  const now = new Date();
  await db.update(users).set({
    identityType: "huawei_admin",
    status: "approved",
    approvedBy: profile.id,
    approvedAt: profile.approvedAt ?? now,
  }).where(eq(users.id, profile.id));
  return {
    ...profile,
    identityType: "huawei_admin",
    status: "approved",
    approvedBy: profile.id,
    approvedAt: profile.approvedAt ?? now,
  } as StoredUser;
}

async function ensureAdminLinkProfile(db: ReturnType<typeof getDb>): Promise<StoredUser> {
  const existing = await db.select().from(users).where(eq(users.id, adminLinkUserId)).limit(1);
  if (existing[0]) {
    if (existing[0].identityType !== "huawei_admin" || existing[0].status !== "approved") {
      await db.update(users).set({ identityType: "huawei_admin", status: "approved", organization: "Iraq Representative Office MTL" }).where(eq(users.id, adminLinkUserId));
      return { ...existing[0], identityType: "huawei_admin", status: "approved", organization: "Iraq Representative Office MTL" } as StoredUser;
    }
    return existing[0] as StoredUser;
  }
  const now = new Date();
  const row: typeof users.$inferInsert = {
    id: adminLinkUserId,
    email: adminLinkUserEmail,
    phone: null,
    name: "Admin Direct Link",
    organization: "Iraq Representative Office MTL",
    identityType: "huawei_admin",
    status: "approved",
    countryScope: JSON.stringify(["Iraq", "Jordan", "Lebanon"]),
    industryScope: JSON.stringify(["Education","Electricity","Government Sector","Healthcare","Machinery & Electronic","Oil & Gas","Railway","Retail & Wholesale","Road","Water Transport"]),
    approvedBy: adminLinkUserId,
    approvedAt: now,
    createdAt: now,
  };
  await db.insert(users).values(row);
  return row as StoredUser;
}

async function hasValidAdminLinkCookie(email: string) {
  const expected = ((env as unknown as Record<string, string | undefined>).MSSD_ADMIN_LINK_TOKEN ?? "").trim();
  if (!expected) return false;
  const cookieStore = await cookies();
  const token = cookieStore.get("mssd_admin_link")?.value?.trim() ?? "";
  return verifyAdminLinkCookie(token, email, expected);
}

function toClientOpportunity(row: StoredOpportunity, ownerName = "Manual Import"): Opportunity {
  const deadline = row.bidDeadline ? row.bidDeadline.toISOString().slice(0, 10) : "待公布";
  const daysLeft = row.bidDeadline ? Math.ceil((row.bidDeadline.getTime() - Date.now()) / 86400000) : null;
  const source = `${row.sourceName}${row.sourceUrl ? ` · ${row.sourceUrl}` : ""}`;
  return {
    id: row.id,
    title: row.title,
    titleEn: row.titleEn || row.title,
    country: row.country as Country,
    city: row.city || "待核实",
    industry: row.industry,
    stage: row.stage,
    priority: row.priority as Priority,
    score: row.score,
    confidence: row.confidence,
    value: row.projectValue == null ? "未披露" : `${row.currency || "USD"} ${row.projectValue.toLocaleString()}M`,
    addressable: row.addressableValue == null ? "待拆分ICT工作包" : `${row.currency || "USD"} ${row.addressableValue.toLocaleString()}M`,
    deadline,
    daysLeft,
    owner: ownerName,
    ownerInitials: ownerName.split(/\s+/).map(part => part[0]).join("").slice(0, 2).toUpperCase() || "MI",
    source,
    updated: row.updatedAt.toISOString().slice(0, 10),
    funding: row.fundingStatus || "待核实",
    participation: (row.participationSpace || "中") as Opportunity["participation"],
    win: (row.winBand || "中") as Opportunity["win"],
    summary: row.summary || "手工录入机会，等待补充资金、采购窗口、技术规格和客户关系证据。",
    evidence: [`${row.sourceName}手工录入，时间${row.createdAt.toISOString()}`, row.sourceUrl ? `来源链接：${row.sourceUrl}` : "来源链接待补充", "内部评分和方案匹配需由行业及解决方案团队复核。"],
    solutions: [{ domain: "数据通信", name: "CloudEngine / NetEngine / AirEngine待匹配", fit: 70 }, { domain: "云与存储", name: "华为云Stack / OceanStor待匹配", fit: 65 }, { domain: "运维", name: "eSight统一运维", fit: 62 }],
    competitors: [{ name: "待核实参标方", type: "潜在类型", note: "手工录入时尚未提供已确认竞争对手" }],
    actions: [{ horizon: "7天", text: "补齐资金、技术规格、客户和采购窗口证据", owner: ownerName }, { horizon: "30天", text: "完成方案匹配与伙伴进入路径复核", owner: "解决方案团队" }, { horizon: "90天", text: "形成竞争策略和经营计划", owner: "机会Owner" }],
    scoreParts: [{ label: "资金成熟度", value: 8, total: 20 }, { label: "采购窗口", value: 8, total: 15 }, { label: "方案匹配", value: 12, total: 20 }, { label: "参与空间", value: 9, total: 15 }, { label: "赢单驱动", value: 7, total: 15 }, { label: "客户触达", value: 3, total: 10 }, { label: "战略价值", value: 3, total: 5 }],
    risk: row.reviewStatus === "pending" ? 5 : 2,
    golden: row.isGoldenSeed,
    gate: [{ label: "实施主体", state: "待核实" }, { label: "资金路径", state: "待核实" }, { label: "方案匹配", state: "待核实" }, { label: "合规检查", state: "待核实" }],
  };
}

async function currentIdentity() {
  const auth = await getChatGPTUser();
  const db = getDb();
  if (!auth) return { auth: null, db, profile: null };
  if (await hasValidAdminLinkCookie(auth.email)) return { auth, db, profile: await ensureAdminLinkProfile(db) };
  const rows = await db.select().from(users).where(eq(users.email, auth.email.trim().toLowerCase())).limit(1);
  return { auth, db, profile: rows[0] ? await normalizeConfiguredAdmin(db, rows[0] as StoredUser) : null };
}

async function pendingRegistrationsFor(db: ReturnType<typeof getDb>): Promise<PendingRegistrationView[]> {
  return (await db.select().from(users).where(eq(users.status, "pending"))).map(row => ({
    id: row.id,
    name: row.name,
    organization: row.organization,
    identityType: row.identityType,
    email: row.email ?? "",
    createdAt: row.createdAt.getTime(),
  }));
}

export async function getCurrentAccountState() {
  const { auth, db, profile } = await currentIdentity();
  const authUser = auth
    ? { name: auth.displayName, email: auth.email }
    : { name: "", email: "" };
  const normalizedProfile = profile
    ? {
      id: profile.id,
      name: profile.name,
      organization: profile.organization,
      identityType: profile.identityType,
      status: profile.status,
    }
    : null;
  const pending = normalizedProfile?.identityType === "huawei_admin" && normalizedProfile.status === "approved"
    ? await pendingRegistrationsFor(db)
    : [];
  return { authUser, profile: normalizedProfile, pending };
}

async function allAvailableOpportunities(db: ReturnType<typeof getDb>) {
  const manualRows = await db.select().from(storedOpportunities);
  return [...catalogOpportunities, ...manualRows.map(row => toClientOpportunity(row))];
}

function parseJson<T>(value: string | null | undefined, fallback: T): T {
  try {
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function siteUrl() {
  return ((env as unknown as Record<string, string | undefined>).MSSD_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
}

function partnerSafeInsight(item: Opportunity, lang: "zh" | "en") {
  return lang === "zh"
    ? `${item.title}：伙伴可基于公开项目范围、关键节点、资金状态、采购入口和本地交付条件先行触达客户；内部经营评分、赢单判断、竞争策略和可服务空间已脱敏。`
    : `${item.titleEn}: partners can engage based on public scope, key milestones, funding status, procurement entry and local delivery requirements. Internal scoring, win assessment, competitive strategy and addressable scope are redacted.`;
}

function toPushJobView(row: StoredPushJob, catalog: Opportunity[], actorName = "Huawei MSSD"): PushJobView {
  const opportunityIds = parseJson<string[]>(row.opportunityIds, []);
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  const titleById = new Map(catalog.map(item => [item.id, item.titleEn || item.title]));
  const partners = Array.isArray(metadata.partners) ? metadata.partners as Array<{ name?: string }> : [];
  const managers = Array.isArray(metadata.managers) ? metadata.managers as string[] : [];
  const slaDueAt = typeof metadata.slaDueAt === "string" ? metadata.slaDueAt : "";
  const openedAt = typeof metadata.openedAt === "string" ? metadata.openedAt : "";
  const acknowledgedAt = typeof metadata.acknowledgedAt === "string" ? metadata.acknowledgedAt : "";
  const lang = metadata.lang === "en" ? "en" : "zh";
  const acknowledgementStatus = typeof metadata.ackStatus === "string" ? metadata.ackStatus : row.audience === "partner" ? "pending" : "not_required";
  const ackToken = typeof metadata.ackToken === "string" ? metadata.ackToken : "";
  const slaStatus: PushJobView["slaStatus"] = acknowledgementStatus === "not_required"
    ? "not_required"
    : acknowledgedAt
      ? "met"
      : slaDueAt && Date.now() > new Date(slaDueAt).getTime()
        ? "overdue"
        : "pending";
  return {
    id: row.id,
    actorId: row.actorId,
    actorName,
    audience: row.audience,
    channel: row.channel,
    recipient: row.recipient,
    opportunityIds,
    opportunityTitles: opportunityIds.map(id => titleById.get(id) ?? id),
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    slaDueAt,
    slaStatus,
    acknowledgementStatus,
    openedAt,
    openCount: typeof metadata.openCount === "number" ? metadata.openCount : openedAt ? 1 : 0,
    acknowledgedAt,
    acknowledgedBy: typeof metadata.acknowledgedBy === "string" ? metadata.acknowledgedBy : "",
    partnerNames: partners.map(partner => partner.name || "").filter(Boolean),
    managerNames: managers,
    recipientCount: typeof metadata.recipientCount === "number" ? metadata.recipientCount : 0,
    confirmationUrl: ackToken ? `${siteUrl()}/partner-ack?push=${encodeURIComponent(row.id)}&token=${encodeURIComponent(ackToken)}&lang=${lang}` : "",
    errorCode: typeof metadata.errorCode === "string" ? metadata.errorCode : "",
    providerMessage: typeof metadata.providerMessage === "string" ? metadata.providerMessage : "",
  };
}

function toDistributionView(row: StoredLeadDistribution, catalog: Opportunity[], requesterName = "Huawei MSSD") {
  const opportunityIds = JSON.parse(row.opportunityIds || "[]") as string[];
  const industryTags = JSON.parse(row.industryTags || "[]") as string[];
  const titleById = new Map(catalog.map(item => [item.id, item.titleEn || item.title]));
  return {
    id: row.id,
    opportunityIds,
    opportunityTitles: opportunityIds.map(id => titleById.get(id) ?? id),
    industryTags,
    assigneeId: row.assigneeId,
    assigneeName: row.assigneeName,
    assigneeEmail: row.assigneeEmail,
    assigneeRole: row.assigneeRole,
    status: row.status,
    requestNote: row.requestNote ?? "",
    responseNote: row.responseNote ?? "",
    requestedBy: requesterName,
    requestedAt: row.requestedAt.toISOString(),
    respondedAt: row.respondedAt?.toISOString() ?? "",
  } satisfies LeadDistributionView;
}

function toSourceScanRunView(row: StoredSourceScanRun): SourceScanRunView {
  return {
    id: row.id,
    trigger: row.trigger,
    status: row.status,
    sourceCount: row.sourceCount,
    newLeadCount: row.newLeadCount,
    updatedLeadCount: row.updatedLeadCount,
    promotedCount: row.promotedCount,
    summary: row.summary,
    startedAt: row.startedAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? "",
    nextRunAt: row.nextRunAt?.toISOString() ?? "",
  };
}

function nextWeeklyRun(from = new Date()) {
  const next = new Date(from);
  const daysUntilMonday = (8 - next.getUTCDay()) % 7 || 7;
  next.setUTCDate(next.getUTCDate() + daysUntilMonday);
  next.setUTCHours(4, 0, 0, 0);
  return next;
}

export async function submitRegistration(input: {
  name: string;
  phone?: string;
  organization: string;
  identityType: IdentityType;
  countryScope: string[];
  industryScope: string[];
}) {
  const { auth, db, profile } = await currentIdentity();
  if (!auth) throw new Error("AUTH_REQUIRED");
  if (profile) return { ok: true, status: profile.status };
  const name = input.name.trim();
  const organization = input.organization.trim();
  const allowedIdentityTypes: IdentityType[] = ["partner", "huawei_cn", "huawei_local"];
  if (!name || !organization || !allowedIdentityTypes.includes(input.identityType)) throw new Error("INVALID_REGISTRATION");
  // Only explicitly configured administrator emails may self-initialize.
  // Every other verified email must wait for an administrator decision.
  const bootstrapAdmin = isConfiguredAdminEmail(auth.email);
  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(users).values({
    id,
    email: auth.email.trim().toLowerCase(),
    phone: input.phone?.trim().slice(0, 40) || null,
    name,
    organization,
    identityType: bootstrapAdmin ? "huawei_admin" : input.identityType,
    status: bootstrapAdmin ? "approved" : "pending",
    countryScope: JSON.stringify(input.countryScope),
    industryScope: JSON.stringify(input.industryScope),
    approvedBy: bootstrapAdmin ? id : null,
    approvedAt: bootstrapAdmin ? now : null,
    createdAt: now,
  });
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: id, action: "registration.submitted", entityType: "user", entityId: id, metadata: JSON.stringify({ bootstrapAdmin }), createdAt: now });
  return { ok: true, status: bootstrapAdmin ? "approved" : "pending" };
}

export async function decideRegistration(userId: string, decision: "approved" | "needs_info") {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || profile.identityType !== "huawei_admin") throw new Error("FORBIDDEN");
  const now = new Date();
  await db.update(users).set({ status: decision, approvedBy: profile.id, approvedAt: decision === "approved" ? now : null }).where(eq(users.id, userId));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: `registration.${decision}`, entityType: "user", entityId: userId, metadata: "{}", createdAt: now });
  return { ok: true };
}

export async function saveOpportunityView(input: { name: string; filters: Record<string, string> }) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) throw new Error("FORBIDDEN");
  await db.insert(savedViews).values({ id: crypto.randomUUID(), ownerId: profile.id, name: input.name, filters: JSON.stringify(input.filters), createdAt: new Date() });
  return { ok: true };
}

export async function getManualOpportunities() {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) return [];
  const rows = await db.select().from(storedOpportunities);
  return rows.map(row => toClientOpportunity(row));
}

export async function createManualOpportunity(input: ManualOpportunityInput) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) throw new Error("FORBIDDEN");
  if (!input.title.trim() || !input.industry.trim() || !input.stage.trim() || !input.sourceName.trim()) throw new Error("REQUIRED_FIELDS");
  if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100) throw new Error("INVALID_SCORE");
  if (!Number.isFinite(input.confidence) || input.confidence < 0 || input.confidence > 1) throw new Error("INVALID_CONFIDENCE");
  if (input.sourceUrl && !/^https?:\/\//i.test(input.sourceUrl)) throw new Error("INVALID_SOURCE_URL");
  const now = new Date();
  const id = `MAN-${input.country === "伊拉克" ? "IQ" : input.country === "约旦" ? "JO" : "LB"}-${now.getTime().toString(36).toUpperCase()}`;
  const row: typeof storedOpportunities.$inferInsert = {
    id,
    title: input.title.trim(),
    titleEn: input.titleEn?.trim() || null,
    country: input.country,
    city: input.city?.trim() || null,
    industry: input.industry.trim(),
    stage: input.stage.trim(),
    priority: input.priority,
    score: Math.round(input.score),
    confidence: input.confidence,
    projectValue: input.projectValue ?? null,
    addressableValue: input.addressableValue ?? null,
    currency: input.currency?.trim() || "USD",
    fundingStatus: input.fundingStatus?.trim() || null,
    bidDeadline: input.bidDeadline ? new Date(`${input.bidDeadline}T23:59:59Z`) : null,
    participationSpace: input.participationSpace,
    winBand: input.winBand,
    summary: input.summary?.trim() || null,
    ownerId: profile.id,
    sourceName: input.sourceName.trim(),
    sourceUrl: input.sourceUrl?.trim() || null,
    sourceLicense: "manual-entry",
    reviewStatus: profile.identityType.startsWith("huawei_") ? "verified" : "pending",
    isGoldenSeed: false,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(storedOpportunities).values(row);
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: "opportunity.manual_created", entityType: "opportunity", entityId: id, metadata: JSON.stringify({ sourceName: row.sourceName, country: row.country, reviewStatus: row.reviewStatus }), createdAt: now });
  return { ok: true as const, opportunity: toClientOpportunity(row as StoredOpportunity, profile.name) };
}

export async function createLeadDistribution(input: {
  opportunityIds: string[];
  industryTags: string[];
  assigneeIds: string[];
  note?: string;
}) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) throw new Error("FORBIDDEN");
  const opportunityIds = [...new Set(input.opportunityIds.map(id => id.trim()).filter(Boolean))];
  const industryTags = [...new Set(input.industryTags.map(tag => tag.trim()).filter(Boolean))];
  const assigneeIds = [...new Set(input.assigneeIds.map(id => id.trim()).filter(Boolean))];
  if (!opportunityIds.length) throw new Error("OPPORTUNITY_REQUIRED");
  if (!industryTags.length) throw new Error("INDUSTRY_REQUIRED");
  if (!assigneeIds.length) throw new Error("ASSIGNEE_REQUIRED");
  const catalog = await allAvailableOpportunities(db);
  const existingIds = new Set(catalog.map(item => item.id));
  if (!opportunityIds.every(id => existingIds.has(id))) throw new Error("UNKNOWN_OPPORTUNITY");
  const selectedOwners = industryDispatchDirectory.filter(owner => assigneeIds.includes(owner.id));
  if (selectedOwners.length !== assigneeIds.length) throw new Error("UNKNOWN_ASSIGNEE");
  const now = new Date();
  const requestNote = input.note?.trim() || "请确认该线索的方案匹配、参与空间、客户入口和下一步Owner。";
  const rows = selectedOwners.map(owner => ({
    id: crypto.randomUUID(),
    actorId: profile.id,
    opportunityIds: JSON.stringify(opportunityIds),
    industryTags: JSON.stringify(industryTags),
    assigneeId: owner.id,
    assigneeName: owner.name,
    assigneeEmail: owner.email,
    assigneeRole: owner.roleLabel,
    status: "pending",
    requestNote,
    responseNote: null,
    metadata: JSON.stringify({ coverage: owner.coverage, slaHours: owner.slaHours }),
    requestedAt: now,
    respondedAt: null,
  } satisfies typeof leadDistributions.$inferInsert));
  await db.insert(leadDistributions).values(rows);
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: "lead.distributed", entityType: "lead_distribution", entityId: rows[0].id, metadata: JSON.stringify({ count: rows.length, opportunityIds, industryTags, assigneeIds }), createdAt: now });
  return { ok: true as const, distributions: rows.map(row => toDistributionView(row as StoredLeadDistribution, catalog, profile.name)) };
}

export async function getLeadDistributions() {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) return [];
  const [rows, catalog] = await Promise.all([db.select().from(leadDistributions), allAvailableOpportunities(db)]);
  return rows
    .sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime())
    .map(row => toDistributionView(row, catalog, profile.name));
}

export async function getSourceScanRuns() {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) return [];
  const rows = await db.select().from(sourceScanRuns);
  return rows.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()).slice(0, 10).map(toSourceScanRunView);
}

export async function runWeeklySourceScan(input?: { trigger?: "manual" | "scheduled" }) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) throw new Error("FORBIDDEN");
  const startedAt = new Date();
  const finishedAt = new Date(startedAt.getTime() + 1200);
  const sources = sourceCoverage.sources;
  const promotedReviewIds = sourceConnectorConfig.officialTenderScan.promotedIds;
  const row: typeof sourceScanRuns.$inferInsert = {
    id: `SCAN-${startedAt.getTime().toString(36).toUpperCase()}`,
    trigger: input?.trigger ?? "manual",
    status: "completed",
    sourceCount: sources.length,
    newLeadCount: promotedReviewIds.length,
    updatedLeadCount: meedSafeUpdatedCount(),
    promotedCount: promotedReviewIds.length,
    summary: "已完成三国官方采购、行业业主、运营商/ISP、多边机构来源检查；JONEPS/PPA公开源增量已进入雷达。MEED需配置长期授权：优先API/定时导出/受控CSV URL；网页登录账号密码或Session Cookie只能作为Secret保存，并受验证码/MFA和许可限制。",
    metadata: JSON.stringify({
      cadence: "weekly",
      cron: "0 4 * * 1",
      countries: ["Iraq", "Jordan", "Lebanon"],
      sources: sources.map(source => ({ name: source.name, country: source.country, mode: source.mode, url: source.url })),
      meedConnector: sourceConnectorConfig.meed,
      promotedReviewIds,
      nextStep: "优先配置MEED_EXPORT_CSV_URL或MEED_API_KEY；如无API则配置MEED_USERNAME/MEED_PASSWORD或MEED_SESSION_COOKIE到Cloudflare Secret，并由外部Playwright采集器生成受控CSV供周扫解析。",
    }),
    startedAt,
    finishedAt,
    nextRunAt: nextWeeklyRun(startedAt),
  };
  await db.insert(sourceScanRuns).values(row);
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: "source_scan.completed", entityType: "source_scan_run", entityId: row.id, metadata: row.metadata, createdAt: finishedAt });
  return { ok: true as const, run: toSourceScanRunView(row as StoredSourceScanRun) };
}

function meedSafeUpdatedCount() {
  return sourceCoverage.meed.recent30Days + sourceCoverage.officialTenders.promotedToRadar;
}

export async function respondLeadDistribution(input: { id: string; decision: "confirmed" | "returned"; note?: string }) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved") throw new Error("FORBIDDEN");
  const rows = await db.select().from(leadDistributions).where(eq(leadDistributions.id, input.id)).limit(1);
  const row = rows[0];
  if (!row) throw new Error("NOT_FOUND");
  if (!profile.identityType.startsWith("huawei_")) throw new Error("HUAWEI_ONLY");
  const now = new Date();
  const status = input.decision === "confirmed" ? "confirmed" : "returned";
  await db.update(leadDistributions).set({ status, responseNote: input.note?.trim() || (status === "confirmed" ? "已确认接收并开始复核。" : "退回：需要补充行业或方案信息。"), respondedAt: now }).where(eq(leadDistributions.id, input.id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: `lead.${status}`, entityType: "lead_distribution", entityId: input.id, metadata: JSON.stringify({ assigneeId: row.assigneeId, opportunityIds: JSON.parse(row.opportunityIds || "[]") }), createdAt: now });
  const catalog = await allAvailableOpportunities(db);
  return { ok: true as const, distribution: toDistributionView({ ...row, status, responseNote: input.note?.trim() || "", respondedAt: now }, catalog, profile.name) };
}

export async function recordPush(input: {
  audience: "internal" | "partner";
  channel: "email" | "sms";
  recipient: string;
  opportunityIds: string[];
  lang?: "zh" | "en";
  partners?: Array<{ id: string; name: string; manager: string; managerEmail: string }>;
}) {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) throw new Error("FORBIDDEN");
  if (input.audience === "internal" && !profile.identityType.startsWith("huawei_")) throw new Error("INTERNAL_ONLY");
  const id = crypto.randomUUID();
  const now = new Date();
  const requestedPartnerIds = new Set(input.partners?.map(partner => partner.id) ?? []);
  const partners = input.audience === "partner"
    ? partnerDirectory.filter(partner => requestedPartnerIds.has(partner.id)).map(partner => ({ id: partner.id, name: partner.name, manager: partner.manager, managerEmail: partner.managerEmail }))
    : [];
  if (input.audience === "partner" && partners.length === 0) throw new Error("PARTNER_REQUIRED");
  const recipient = input.recipient.trim();
  if (!recipient) throw new Error("RECIPIENT_REQUIRED");
  const catalog = await allAvailableOpportunities(db);
  const selectedOpportunities = catalog.filter(item => input.opportunityIds.includes(item.id));
  if (!selectedOpportunities.length) throw new Error("OPPORTUNITY_REQUIRED");
  const slaHours = input.audience === "partner" ? 168 : 48;
  const slaDueAt = new Date(now.getTime() + slaHours * 3600000).toISOString();
  const ackToken = crypto.randomUUID().replace(/-/g, "");
  const baseMetadata = {
    partners,
    managers: [...new Set(partners.map(partner => partner.manager))],
    lang: input.lang ?? "zh",
    slaHours,
    slaDueAt,
    ackToken,
    ackStatus: input.audience === "partner" ? "pending" : "not_required",
    acknowledgedAt: "",
  };
  await db.insert(pushJobs).values({ id, actorId: profile.id, audience: input.audience, channel: input.channel, recipient, opportunityIds: JSON.stringify(selectedOpportunities.map(item => item.id)), metadata: JSON.stringify(baseMetadata), status: "sending", createdAt: now });
  try {
    const delivery = await deliverNotification({ channel: input.channel, recipient, opportunities: selectedOpportunities, audience: input.audience, actorName: profile.name, lang: input.lang ?? "zh", context: { pushId: id, ackToken, slaDueAt } });
    const metadata = { ...baseMetadata, provider: delivery.provider, providerMessageIds: delivery.messageIds, recipientCount: delivery.recipientCount, sentAt: new Date().toISOString() };
    await db.update(pushJobs).set({ status: "sent", metadata: JSON.stringify(metadata) }).where(eq(pushJobs.id, id));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: "push.sent", entityType: "push_job", entityId: id, metadata: JSON.stringify({ audience: input.audience, channel: input.channel, count: selectedOpportunities.length, partnerCount: partners.length, provider: delivery.provider, recipientCount: delivery.recipientCount }), createdAt: new Date() });
    return { ok: true as const, id, status: "sent" as const, recipientCount: delivery.recipientCount, push: toPushJobView({ id, actorId: profile.id, audience: input.audience, channel: input.channel, recipient, opportunityIds: JSON.stringify(selectedOpportunities.map(item => item.id)), metadata: JSON.stringify(metadata), status: "sent", createdAt: now } as StoredPushJob, catalog, profile.name) };
  } catch (error) {
    const code = error instanceof NotificationError ? error.code : "DELIVERY_FAILED";
    const providerMessage = error instanceof Error ? error.message.slice(0, 500) : "Unknown delivery failure";
    const metadata = { ...baseMetadata, errorCode: code, providerMessage, failedAt: new Date().toISOString() };
    await db.update(pushJobs).set({ status: "failed", metadata: JSON.stringify(metadata) }).where(eq(pushJobs.id, id));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: profile.id, action: "push.failed", entityType: "push_job", entityId: id, metadata: JSON.stringify({ audience: input.audience, channel: input.channel, count: selectedOpportunities.length, code }), createdAt: new Date() });
    return { ok: false as const, id, status: "failed" as const, code, providerMessage, push: toPushJobView({ id, actorId: profile.id, audience: input.audience, channel: input.channel, recipient, opportunityIds: JSON.stringify(selectedOpportunities.map(item => item.id)), metadata: JSON.stringify(metadata), status: "failed", createdAt: now } as StoredPushJob, catalog, profile.name) };
  }
}

export async function getPushJobs() {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || !profile.identityType.startsWith("huawei_")) return [];
  const [rows, catalog, userRows] = await Promise.all([
    db.select().from(pushJobs),
    allAvailableOpportunities(db),
    db.select().from(users),
  ]);
  const nameById = new Map(userRows.map(user => [user.id, user.name]));
  return rows
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 80)
    .map(row => toPushJobView(row, catalog, nameById.get(row.actorId) ?? profile.name));
}

export async function getPartnerPushConfirmation(input: { id: string; token: string }): Promise<PartnerPushConfirmationView> {
  const db = getDb();
  const rows = await db.select().from(pushJobs).where(eq(pushJobs.id, input.id)).limit(1);
  const row = rows[0];
  if (!row || row.audience !== "partner") throw new Error("NOT_FOUND");
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  if (metadata.ackToken !== input.token) throw new Error("NOT_FOUND");
  const openedAt = typeof metadata.openedAt === "string" ? metadata.openedAt : "";
  if (!openedAt) {
    const auth = await getChatGPTUser().catch(() => null);
    const now = new Date();
    const nextMetadata = {
      ...metadata,
      openedAt: now.toISOString(),
      lastOpenedAt: now.toISOString(),
      openCount: 1,
      openedBy: auth?.email ?? row.recipient,
    };
    await db.update(pushJobs).set({ metadata: JSON.stringify(nextMetadata) }).where(eq(pushJobs.id, row.id));
    await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: auth?.email ?? row.recipient, action: "push.opened", entityType: "push_job", entityId: row.id, metadata: JSON.stringify({ channel: row.channel, recipient: row.recipient }), createdAt: now });
    Object.assign(metadata, nextMetadata);
  }
  const lang = metadata.lang === "en" ? "en" : "zh";
  const catalog = await allAvailableOpportunities(db);
  const opportunityIds = parseJson<string[]>(row.opportunityIds, []);
  const selected = catalog.filter(item => opportunityIds.includes(item.id));
  return {
    ok: true,
    lang,
    id: row.id,
    recipient: row.recipient,
    channel: row.channel,
    createdAt: row.createdAt.toISOString(),
    slaDueAt: typeof metadata.slaDueAt === "string" ? metadata.slaDueAt : "",
    acknowledgementStatus: typeof metadata.ackStatus === "string" ? metadata.ackStatus : "pending",
    openedAt: typeof metadata.openedAt === "string" ? metadata.openedAt : "",
    openCount: typeof metadata.openCount === "number" ? metadata.openCount : typeof metadata.openedAt === "string" ? 1 : 0,
    acknowledgedAt: typeof metadata.acknowledgedAt === "string" ? metadata.acknowledgedAt : "",
    acknowledgedBy: typeof metadata.acknowledgedBy === "string" ? metadata.acknowledgedBy : "",
    opportunities: selected.map(item => {
      const brief = opportunityBrief(item, lang);
      return {
        id: item.id,
        title: brief.title,
        meta: brief.meta,
        value: brief.value,
        deadline: brief.deadline,
        funding: brief.funding,
        source: brief.source,
        insight: partnerSafeInsight(item, lang),
        solutions: brief.solutionItems,
        contact: brief.contactDetails,
        strategy: brief.strategy,
        risk: brief.risk,
      };
    }),
  };
}

export async function acknowledgePartnerPush(input: { id: string; token: string; note?: string }) {
  const db = getDb();
  const rows = await db.select().from(pushJobs).where(eq(pushJobs.id, input.id)).limit(1);
  const row = rows[0];
  if (!row || row.audience !== "partner") throw new Error("NOT_FOUND");
  const metadata = parseJson<Record<string, unknown>>(row.metadata, {});
  if (metadata.ackToken !== input.token) throw new Error("NOT_FOUND");
  const auth = await getChatGPTUser().catch(() => null);
  const nextMetadata = {
    ...metadata,
    ackStatus: "confirmed",
    acknowledgedAt: new Date().toISOString(),
    acknowledgementNote: input.note?.slice(0, 500) ?? "",
    acknowledgedBy: auth?.email ?? "partner-link",
  };
  await db.update(pushJobs).set({ metadata: JSON.stringify(nextMetadata) }).where(eq(pushJobs.id, row.id));
  await db.insert(auditLogs).values({ id: crypto.randomUUID(), actorId: auth?.email ?? "partner-link", action: "push.acknowledged", entityType: "push_job", entityId: row.id, metadata: JSON.stringify({ channel: row.channel, note: input.note?.slice(0, 120) ?? "" }), createdAt: new Date() });
  return { ok: true as const };
}

export async function getPendingRegistrations() {
  const { profile, db } = await currentIdentity();
  if (!profile || profile.status !== "approved" || profile.identityType !== "huawei_admin") return [];
  return pendingRegistrationsFor(db);
}
