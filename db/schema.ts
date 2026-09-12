import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  phone: text("phone"),
  name: text("name").notNull(),
  organization: text("organization").notNull(),
  identityType: text("identity_type").notNull(),
  status: text("status").notNull().default("pending"),
  countryScope: text("country_scope").notNull().default("[]"),
  industryScope: text("industry_scope").notNull().default("[]"),
  approvedBy: text("approved_by"),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const opportunities = sqliteTable("opportunities", {
  id: text("id").primaryKey(),
  externalId: text("external_id"),
  eplusId: text("eplus_id"),
  title: text("title").notNull(),
  titleEn: text("title_en"),
  country: text("country").notNull(),
  city: text("city"),
  industry: text("industry").notNull(),
  stage: text("stage").notNull(),
  priority: text("priority").notNull(),
  score: integer("score").notNull(),
  confidence: real("confidence").notNull(),
  projectValue: real("project_value"),
  addressableValue: real("addressable_value"),
  currency: text("currency"),
  fundingStatus: text("funding_status"),
  bidDeadline: integer("bid_deadline", { mode: "timestamp_ms" }),
  participationSpace: text("participation_space"),
  winBand: text("win_band"),
  summary: text("summary"),
  ownerId: text("owner_id").references(() => users.id),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  sourceLicense: text("source_license"),
  reviewStatus: text("review_status").notNull().default("pending"),
  isGoldenSeed: integer("is_golden_seed", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id),
  kind: text("kind").notNull(),
  excerpt: text("excerpt").notNull(),
  sourceUrl: text("source_url"),
  collectedAt: integer("collected_at", { mode: "timestamp_ms" }).notNull(),
});

export const partnerLocks = sqliteTable("partner_locks", {
  id: text("id").primaryKey(),
  opportunityId: text("opportunity_id").notNull().references(() => opportunities.id),
  partnerOrganization: text("partner_organization").notNull(),
  workPackage: text("work_package").notNull(),
  huaweiOwnerId: text("huawei_owner_id").references(() => users.id),
  status: text("status").notNull(),
  nonExclusive: integer("non_exclusive", { mode: "boolean" }).notNull().default(true),
  acceptedAt: integer("accepted_at", { mode: "timestamp_ms" }),
  lastProgressAt: integer("last_progress_at", { mode: "timestamp_ms" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  ipHash: text("ip_hash"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const pushJobs = sqliteTable("push_jobs", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  audience: text("audience").notNull(),
  channel: text("channel").notNull(),
  recipient: text("recipient").notNull(),
  opportunityIds: text("opportunity_ids").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  status: text("status").notNull().default("recorded"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const leadDistributions = sqliteTable("lead_distributions", {
  id: text("id").primaryKey(),
  actorId: text("actor_id").notNull(),
  opportunityIds: text("opportunity_ids").notNull(),
  industryTags: text("industry_tags").notNull(),
  assigneeId: text("assignee_id").notNull(),
  assigneeName: text("assignee_name").notNull(),
  assigneeEmail: text("assignee_email").notNull(),
  assigneeRole: text("assignee_role").notNull(),
  status: text("status").notNull().default("pending"),
  requestNote: text("request_note"),
  responseNote: text("response_note"),
  metadata: text("metadata").notNull().default("{}"),
  requestedAt: integer("requested_at", { mode: "timestamp_ms" }).notNull(),
  respondedAt: integer("responded_at", { mode: "timestamp_ms" }),
});

export const sourceScanRuns = sqliteTable("source_scan_runs", {
  id: text("id").primaryKey(),
  trigger: text("trigger").notNull(),
  status: text("status").notNull(),
  sourceCount: integer("source_count").notNull(),
  newLeadCount: integer("new_lead_count").notNull().default(0),
  updatedLeadCount: integer("updated_lead_count").notNull().default(0),
  promotedCount: integer("promoted_count").notNull().default(0),
  summary: text("summary").notNull(),
  metadata: text("metadata").notNull().default("{}"),
  startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
  nextRunAt: integer("next_run_at", { mode: "timestamp_ms" }),
});

export const savedViews = sqliteTable("saved_views", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  filters: text("filters").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});
