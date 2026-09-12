import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { strFromU8, unzipSync } from "fflate";

const read = (path) => readFile(new URL(path, import.meta.url), "utf8");
const readBytes = (path) => readFile(new URL(path, import.meta.url));

test("multi-partner push renders partner-manager matches and channel recipients", async () => {
  const [consoleSource, dataSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(consoleSource, /selectedPartnerIds/);
  assert.match(consoleSource, /partnerDirectory\.map/);
  assert.match(consoleSource, /对应华为伙伴经理/);
  assert.match(consoleSource, /manager-row/);
  assert.match(consoleSource, /recipientsFor/);
  assert.match(consoleSource, /setPartnerRecipient\(event\.target\.value\)/);
  assert.doesNotMatch(consoleSource, /textarea value=\{recipient\} readOnly/);
  assert.match(dataSource, /export const partnerDirectory/);
  assert.match(dataSource, /managerEmail/);
  assert.match(dataSource, /manager: "赵文君"/);
  assert.match(dataSource, /managerEmail: "zhaowenjun@huawei\.com"/);
  assert.match(styles, /\.partner-picker/);
  assert.match(styles, /\.manager-match/);
});

test("command dashboard keeps solution fit and live feed language-isolated", async () => {
  const [consoleSource, localization] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/localization.ts"),
  ]);

  assert.match(consoleSource, /Industry × solution heat/);
  assert.match(consoleSource, /Government \/ Digital Government/);
  assert.match(consoleSource, /Oil & Gas \/ Petrochemicals/);
  assert.match(consoleSource, /Power \/ New Energy/);
  assert.match(consoleSource, /Healthcare \/ Finance/);
  assert.match(consoleSource, /Collaboration feed/);
  assert.match(consoleSource, /All records/);
  assert.match(consoleSource, /localText\(lang, item\.action, "Activity update"\)/);
  assert.match(consoleSource, /localText\(lang, item\.time, "just now"\)/);
  assert.doesNotMatch(consoleSource, /<h2>行业 × 方案热度<\/h2>/);
  assert.doesNotMatch(consoleSource, /<h2>协同动态<\/h2>/);
  assert.match(localization, /Verified 3,024 MEED records across three countries/);
  assert.match(localization, /Imported MEED batch: 126 records, 18 duplicates merged/);
  assert.match(localization, /\(\\d\+\)分钟前/);
  assert.match(localization, /\(\\d\+\)小时前/);
});

test("adds issue-by-issue release notes for every data refresh", async () => {
  const [consoleSource, dataSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(consoleSource, /type View = "command" \| "radar" \| "updates"/);
  assert.match(consoleSource, /zh: "更新纪要"/);
  assert.match(consoleSource, /en: "Release Notes"/);
  assert.match(consoleSource, /function UpdatesView/);
  assert.match(consoleSource, /releaseUpdateLog\.map/);
  assert.match(consoleSource, /每期更新纪要/);
  assert.match(consoleSource, /Issue-by-issue release notes/);
  assert.match(consoleSource, /本期更新内容/);
  assert.match(consoleSource, /What changed/);
  assert.match(dataSource, /export type ReleaseUpdate/);
  assert.match(dataSource, /export const releaseUpdateLog/);
  assert.match(dataSource, /ISSUE-2026-W36/);
  assert.match(dataSource, /ProjectListingExport-05-09-26-16-04-28\.xlsx/);
  assert.match(dataSource, /13个高价值候选/);
  assert.match(dataSource, /13 high-value candidates/);
  assert.match(dataSource, /Basra–Haditha Strategic Crude Oil Export Pipeline/);
  assert.match(styles, /\.updates-view/);
  assert.match(styles, /\.release-timeline/);
  assert.match(styles, /\.release-opportunity-table/);
});

test("push records canonical partner and manager mappings", async () => {
  const [actions, notifications, schema, migration, envExample] = await Promise.all([
    read("../app/actions.ts"),
    read("../app/notifications.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0002_tiresome_tarot.sql"),
    read("../.env.example"),
  ]);

  assert.match(actions, /requestedPartnerIds/);
  assert.match(actions, /PARTNER_REQUIRED/);
  assert.match(actions, /RECIPIENT_REQUIRED/);
  assert.match(actions, /input\.recipient\.trim\(\)/);
  assert.match(actions, /partnerCount/);
  assert.match(actions, /managers:/);
  assert.match(actions, /status: "sending"/);
  assert.match(actions, /status: "sent"/);
  assert.match(actions, /status: "failed"/);
  assert.match(notifications, /api\.resend\.com\/emails/);
  assert.match(notifications, /gmail\.googleapis\.com\/gmail\/v1\/users\/me\/messages\/send/);
  assert.match(notifications, /oauth2\.googleapis\.com\/token/);
  assert.match(notifications, /provider: "gmail"/);
  assert.match(notifications, /api\.twilio\.com/);
  assert.match(notifications, /open\.bigmodel\.cn\/api\/paas\/v4/);
  assert.match(notifications, /ZHIPU_API_KEY/);
  assert.match(notifications, /ZHIPU_MODEL/);
  assert.match(notifications, /glm-5\.3/);
  assert.match(notifications, /api\.deepseek\.com\/chat\/completions/);
  assert.match(notifications, /DEEPSEEK_API_KEY/);
  assert.match(notifications, /deepseek-v4-flash/);
  assert.match(notifications, /emailMissing/);
  assert.match(notifications, /smsMissing/);
  assert.match(notifications, /aiMissing/);
  assert.match(notifications, /zhaowenjun@huawei\.com/);
  assert.match(envExample, /RESEND_API_KEY=/);
  assert.match(envExample, /GMAIL_CLIENT_ID=/);
  assert.match(envExample, /GMAIL_CLIENT_SECRET=/);
  assert.match(envExample, /GMAIL_REFRESH_TOKEN=/);
  assert.match(envExample, /GMAIL_FROM_EMAIL=/);
  assert.match(envExample, /TWILIO_AUTH_TOKEN=/);
  assert.match(envExample, /ZHIPU_API_KEY=/);
  assert.match(envExample, /ZHIPU_MODEL=glm-5\.3/);
  assert.match(envExample, /ZHIPU_API_BASE_URL=https:\/\/open\.bigmodel\.cn\/api\/paas\/v4/);
  assert.match(envExample, /DEEPSEEK_API_KEY=/);
  assert.match(envExample, /DEEPSEEK_MODEL=deepseek-v4-flash/);
  assert.match(envExample, /MEED_EXPORT_CSV_URL=/);
  assert.match(envExample, /MEED_API_BASE_URL=/);
  assert.match(envExample, /MEED_API_KEY=/);
  assert.match(envExample, /MEED_USERNAME=/);
  assert.match(envExample, /MEED_PASSWORD=/);
  assert.match(envExample, /MEED_SESSION_COOKIE=/);
  assert.match(envExample, /MEED_AUTH_MODE=api_or_export_preferred/);
  assert.match(schema, /metadata: text\("metadata"\)/);
  assert.match(migration, /ALTER TABLE `push_jobs` ADD `metadata`/);
});

test("exposes a dedicated email push center backed by audited Resend or Gmail delivery", async () => {
  const [consoleSource, actions, notifications, styles, localization, partnerAckPage] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/actions.ts"),
    read("../app/notifications.ts"),
    read("../app/globals.css"),
    read("../app/localization.ts"),
    read("../app/partner-ack/page.tsx"),
  ]);

  assert.match(consoleSource, /type View = "command" \| "radar" \| "updates" \| "mtl" \| "dispatch" \| "partners" \| "email"/);
  assert.match(consoleSource, /zh: "邮件推送"/);
  assert.match(consoleSource, /function EmailPushView/);
  assert.match(consoleSource, /EMAIL PUSH CENTER/);
  assert.match(consoleSource, /sendEmailPackage/);
  assert.match(consoleSource, /channel: "email"/);
  assert.match(consoleSource, /选择全量机会点/);
  assert.match(consoleSource, /Select all opportunities/);
  assert.match(consoleSource, /All opportunities are selected by default/);
  assert.match(consoleSource, /localText\(lang, action\.horizon, "Timing to be confirmed"\)/);
  assert.match(consoleSource, /localText\(lang, action\.text, "Action to be verified"\)/);
  assert.match(consoleSource, /localText\(lang, action\.owner, "owner to be assigned"\)/);
  assert.match(consoleSource, /selectAllOpportunities/);
  assert.match(consoleSource, /rankedItems\.map/);
  assert.match(consoleSource, /recordPush\(\{ audience, channel: "email", recipient, opportunityIds: items\.map\(item => item\.id\), partners, lang \}\)/);
  assert.match(consoleSource, /onSend=\{sendEmailPackage\}/);
  assert.match(actions, /recordPush/);
  assert.match(actions, /lang\?: "zh" \| "en"/);
  assert.match(actions, /lang: input\.lang \?\? "zh"/);
  assert.match(notifications, /api\.resend\.com\/emails/);
  assert.match(notifications, /GMAIL_REFRESH_TOKEN/);
  assert.match(notifications, /base64UrlEncode/);
  assert.match(notifications, /function buildContent\(opportunities: Opportunity\[\], audience: Audience, actorName: string, lang: Lang, context: PushDeliveryContext = \{\}, enhancements: Map<string, AiEnhancement> = new Map\(\)\)/);
  assert.match(notifications, /buildZhipuEnhancements/);
  assert.match(notifications, /buildAiEnhancements/);
  assert.match(notifications, /buildDeepSeekEnhancements/);
  assert.match(notifications, /Open MTL marketing war-room/);
  assert.match(notifications, /打开MTL营销作战平台/);
  assert.match(consoleSource, /function opportunityInsight/);
  assert.match(consoleSource, /opportunityInsight\(item, lang\)/);
  assert.match(consoleSource, /preview-brief-card/);
  assert.match(consoleSource, /关联华为产品 \/ 方案/);
  assert.match(consoleSource, /Related Huawei products \/ solutions/);
  assert.match(notifications, /buildOpportunityBrief/);
  assert.match(notifications, /Engagement play/);
  assert.match(notifications, /Risks \/ gaps/);
  assert.match(notifications, /Contact and procurement entry/);
  assert.match(notifications, /Preferred contact method/);
  assert.match(notifications, /Contact completeness/);
  assert.match(notifications, /Completion action/);
  assert.match(notifications, /Institution phone/);
  assert.match(notifications, /Procurement entry/);
  assert.match(notifications, /contact\.preferredMethodLabel/);
  assert.match(notifications, /contact\.preferredMethod/);
  assert.match(notifications, /contact\.completionAction/);
  assert.match(notifications, /contactText/);
  assert.match(notifications, /function partnerSafePlay/);
  assert.match(notifications, /Partner-safe opportunity brief/);
  assert.match(notifications, /Partner engagement play/);
  assert.match(notifications, /Partner confirmation requested/);
  assert.match(notifications, /Open leads and confirm receipt/);
  assert.match(notifications, /colspan="2"/);
  assert.match(notifications, /function outlookBulletRows/);
  assert.match(notifications, /partnerPackageStats/);
  assert.match(notifications, /Confirm receipt/);
  assert.match(notifications, /partnerSafeInsight/);
  assert.match(notifications, /ackUrl/);
  assert.match(notifications, /&lang=\$\{lang\}/);
  assert.match(actions, /&lang=\$\{lang\}/);
  assert.match(consoleSource, /PUSH AUDIT TRAIL/);
  assert.match(consoleSource, /pushJobs/);
  assert.match(consoleSource, /已打开未确认/);
  assert.match(consoleSource, /receiptDetail/);
  assert.match(consoleSource, /sla-pill/);
  assert.match(styles, /\.push-history-panel/);
  assert.match(styles, /\.partner-ack-page/);
  assert.match(styles, /\.ack-success-banner/);
  assert.match(styles, /\.ack-completion-card/);
  assert.match(styles, /\.ack-completion-facts/);
  assert.match(styles, /\.ack-confirm-panel/);
  assert.match(styles, /\.ack-form\.ack-form-top/);
  assert.match(partnerAckPage, /method="get" action="\/partner-ack"/);
  assert.match(partnerAckPage, /Confirm receipt and start follow-up/);
  assert.match(partnerAckPage, /openedLabel/);
  assert.match(partnerAckPage, /name="confirm" value="1"/);
  assert.match(partnerAckPage, /name="lang" value=\{lang\}/);
  assert.match(partnerAckPage, /const requestedLang: Lang = single\(params\.lang\) === "en" \? "en" : "zh"/);
  assert.doesNotMatch(partnerAckPage, /线索链接无效或已过期 \/ Invalid or expired lead link/);
  assert.match(partnerAckPage, /ack-success-banner/);
  assert.match(partnerAckPage, /伙伴协同已完成/);
  assert.match(partnerAckPage, /Partner collaboration completed/);
  assert.match(partnerAckPage, /role="status" aria-live="polite"/);
  assert.match(partnerAckPage, /Receipt and SLA synchronized/);
  assert.doesNotMatch(partnerAckPage, /"use server"/);
  assert.doesNotMatch(partnerAckPage, /redirect\(/);
  assert.match(localization, /function productRole/);
  assert.match(localization, /function contactDetails/);
  assert.match(localization, /Public email \/ mobile is matched/);
  assert.match(localization, /Huawei addressable/);
  assert.match(localization, /solutionItems/);
  assert.match(localization, /Verify ICT work packages, owner \/ consultant \/ EPC chain and procurement milestones/);
  assert.match(localization, /Jordan industry team/);
  assert.match(localization, /owner to be assigned/);
  assert.match(consoleSource, /邮件 Resend \/ Gmail API/);
  assert.match(styles, /\.email-push-grid/);
  assert.match(styles, /\.package-actions/);
  assert.match(styles, /\.email-op-list/);
  assert.match(styles, /\.preview-products/);
  assert.match(styles, /\.preview-contact-grid/);
});

test("opens delivery service setup for email and SMS configuration", async () => {
  const [consoleSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(consoleSource, /function DeliverySettingsModal/);
  assert.match(consoleSource, /DELIVERY SERVICE SETUP/);
  assert.match(consoleSource, /RESEND_FROM_EMAIL/);
  assert.match(consoleSource, /GMAIL_CLIENT_SECRET/);
  assert.match(consoleSource, /GMAIL_REFRESH_TOKEN/);
  assert.match(consoleSource, /TWILIO_MESSAGING_SERVICE_SID/);
  assert.match(consoleSource, /AI文案增强 · GLM优先/);
  assert.match(consoleSource, /ZHIPU_API_KEY/);
  assert.match(consoleSource, /ZHIPU_MODEL/);
  assert.match(consoleSource, /DEEPSEEK_API_KEY/);
  assert.match(consoleSource, /setSettingsOpen\(true\)/);
  assert.match(consoleSource, /打开配置/);
  assert.match(consoleSource, /Go test push/);
  assert.match(styles, /\.settings-modal/);
  assert.match(styles, /\.config-row/);
});

test("registration gate supports admin approval and partner-restricted lead view", async () => {
  const [accountGate, actions, adminLink, adminRoute, worker, page, partnerPortal, consoleSource, styles] = await Promise.all([
    read("../app/AccountGate.tsx"),
    read("../app/actions.ts"),
    read("../app/admin-link.ts"),
    read("../app/admin-direct/route.ts"),
    read("../worker/index.ts"),
    read("../app/page.tsx"),
    read("../app/PartnerPortal.tsx"),
    read("../app/OpsConsole.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(accountGate, /注册\{PLATFORM_ZH\}/);
  assert.match(accountGate, /伊拉克代表处面向伙伴MTL营销作战平台/);
  assert.match(accountGate, /账户等待管理员确认/);
  assert.match(accountGate, /需要先完成访问身份认证/);
  assert.match(accountGate, /submitRegistration/);
  assert.match(accountGate, /邮箱认证/);
  assert.match(accountGate, /填写资料/);
  assert.match(accountGate, /管理员审批/);
  assert.match(accountGate, /正式进入/);
  assert.match(actions, /export async function getCurrentAccountState/);
  assert.match(actions, /MSSD_ADMIN_EMAILS/);
  assert.doesNotMatch(actions, /defaultAdminEmails/);
  assert.doesNotMatch(actions, /@gmail\.com/);
  assert.match(actions, /decideRegistration/);
  assert.match(actions, /if \(!auth\) return \{ auth: null, db, profile: null \}/);
  assert.doesNotMatch(actions, /ensureDirectLinkProfile/);
  assert.match(actions, /bootstrapAdmin = isConfiguredAdminEmail\(auth\.email\)/);
  assert.match(actions, /status: bootstrapAdmin \? "approved" : "pending"/);
  assert.match(actions, /allowedIdentityTypes: IdentityType\[\] = \["partner", "huawei_cn", "huawei_local"\]/);
  assert.match(actions, /hasValidAdminLinkCookie\(auth\.email\)/);
  assert.match(adminLink, /HMAC/);
  assert.match(adminRoute, /httpOnly: true/);
  assert.match(adminRoute, /oai-authenticated-user-email/);
  assert.match(worker, /\/cdn-cgi\/access\/logout/);
  assert.match(worker, /mssd_admin_link=; Max-Age=0/);
  assert.match(worker, /cf-access-jwt-assertion/);
  assert.match(worker, /RSASSA-PKCS1-v1_5/);
  assert.match(worker, /audience\.includes\(expectedAudience\)/);
  assert.match(worker, /payload\.iss !== expectedIssuer/);
  assert.match(worker, /headers\.delete\("oai-authenticated-user-email"\)/);
  assert.match(page, /getCurrentAccountState/);
  assert.doesNotMatch(page, /publicSandboxProfile/);
  assert.match(page, /return <AccountGate authUser=\{accountState\.authUser\} profile=\{accountState\.profile\}/);
  assert.match(page, /return <PartnerPortal profile=\{accountState\.profile\} items=\{partnerSafeOpportunities\(\)\}/);
  assert.doesNotMatch(consoleSource, /<AccountGate/);
  assert.doesNotMatch(partnerPortal, /from "\.\/data"/);
  assert.match(partnerPortal, /Data scope is redacted/);
  assert.match(consoleSource, /getPendingRegistrations/);
  assert.match(consoleSource, /window\.setInterval\(refresh, 30000\)/);
  assert.match(consoleSource, /item\.id === "approvals" \? String\(pendingAccounts\.length\)/);
  assert.match(consoleSource, /注册审核待办/);
  assert.match(consoleSource, /isPartnerUser \? navItems\.filter\(item=>item\.id === "radar"\)/);
  assert.match(consoleSource, /Partner restricted view/);
  assert.match(consoleSource, /internal scores, win assessment, competitive strategy, owner, golden seed and other partner information are not shown/i);
  assert.match(consoleSource, /partnerSafeOpportunityInsight/);
  assert.match(consoleSource, /canInternal \? <ScoreRing/);
  assert.match(styles, /\.partner-safe-badge/);
  assert.match(styles, /\.partner-access-notice/);
});

test("repositions the app as an Iraq partner MTL marketing war-room", async () => {
  const [consoleSource, dataSource, layout, accountGate, notifications, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/layout.tsx"),
    read("../app/AccountGate.tsx"),
    read("../app/notifications.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(layout, /伊拉克代表处面向伙伴MTL营销作战平台/);
  assert.match(accountGate, /IRAQ PARTNER MTL MARKETING WAR-ROOM/);
  assert.match(notifications, /IRAQ PARTNER MTL MARKETING WAR-ROOM/);
  assert.match(consoleSource, /MTL MARKETING WAR-ROOM/);
  assert.match(consoleSource, /type View = "command" \| "radar" \| "updates" \| "mtl"/);
  assert.match(consoleSource, /marketingContentLibrary/);
  assert.match(consoleSource, /function MtlContentView/);
  assert.match(consoleSource, /function MtlContentImportModal/);
  assert.match(consoleSource, /活动\/拜访纪要/);
  assert.match(consoleSource, /营销物料/);
  assert.match(consoleSource, /圈子活动/);
  assert.match(consoleSource, /PROCESS SIMULATION/);
  assert.match(consoleSource, /流程模拟与优化结果/);
  assert.match(consoleSource, /批量上传文件/);
  assert.match(consoleSource, /pushHighPriority/);
  assert.match(dataSource, /export type MarketingContent/);
  assert.match(dataSource, /marketingContentLibrary/);
  assert.match(dataSource, /meeting_minutes/);
  assert.match(dataSource, /marketing_material/);
  assert.match(dataSource, /circle_event/);
  assert.match(styles, /\.mtl-grid/);
  assert.match(styles, /\.mtl-card/);
  assert.match(styles, /\.mtl-flow-row/);
});

test("routes industry-tagged leads to solution owners for confirmation", async () => {
  const [consoleSource, actions, dataSource, schema, migration, page, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/actions.ts"),
    read("../app/data.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0003_lead_distributions.sql"),
    read("../app/page.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(dataSource, /export const industryDispatchDirectory/);
  assert.match(dataSource, /DISP-MECH-SM/);
  assert.match(dataSource, /Machinery & Electronic/);
  assert.match(dataSource, /Water Transport/);
  assert.match(dataSource, /系统部长/);
  assert.match(actions, /export async function createLeadDistribution/);
  assert.match(actions, /export async function respondLeadDistribution/);
  assert.match(actions, /lead\.distributed/);
  assert.match(actions, /lead\.\$\{status\}/);
  assert.match(schema, /leadDistributions/);
  assert.match(migration, /CREATE TABLE `lead_distributions`/);
  assert.match(page, /getLeadDistributions/);
  assert.match(consoleSource, /function LeadDispatchModal/);
  assert.match(consoleSource, /function DispatchView/);
  assert.match(consoleSource, /matchedDispatchOwners/);
  assert.match(consoleSource, /批量分发/);
  assert.match(consoleSource, /分发确认/);
  assert.match(consoleSource, /respondLeadDistribution/);
  assert.match(styles, /\.lead-dispatch-modal/);
  assert.match(styles, /\.dispatch-queue/);
  assert.match(styles, /\.dispatch-directory-grid/);
});

test("recommends opportunities by partner manager and partner fit", async () => {
  const [consoleSource, dataSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(consoleSource, /function partnerOpportunityScore/);
  assert.match(consoleSource, /function productLineAnalysis/);
  assert.match(consoleSource, /function operationStrategy/);
  assert.match(consoleSource, /PARTNER MANAGER RECOMMENDER/);
  assert.match(consoleSource, /产品线选项/);
  assert.match(consoleSource, /项目打法/);
  assert.match(consoleSource, /onPush\(\[rec\.item\]\)/);
  assert.match(dataSource, /manager: "赵文君"/);
  assert.match(styles, /\.recommendation-panel/);
  assert.match(styles, /\.partner-recommend-card/);
});

test("runs weekly source scans without prompt and records audit history", async () => {
  const [actions, schema, migration, worker, wrangler, page, consoleSource, styles] = await Promise.all([
    read("../app/actions.ts"),
    read("../db/schema.ts"),
    read("../drizzle/0004_source_scan_runs.sql"),
    read("../worker/index.ts"),
    read("../wrangler.toml"),
    read("../app/page.tsx"),
    read("../app/OpsConsole.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(schema, /sourceScanRuns/);
  assert.match(migration, /CREATE TABLE `source_scan_runs`/);
  assert.match(actions, /export async function runWeeklySourceScan/);
  assert.match(actions, /source_scan\.completed/);
  assert.match(actions, /sourceConnectorConfig\.officialTenderScan\.promotedIds/);
  assert.match(actions, /MEED_EXPORT_CSV_URL/);
  assert.match(actions, /MEED_USERNAME\/MEED_PASSWORD/);
  assert.match(actions, /MEED_SESSION_COOKIE/);
  assert.match(worker, /async scheduled/);
  assert.match(worker, /recordScheduledSourceScan/);
  assert.match(worker, /source_scan\.scheduled_completed/);
  assert.match(worker, /function meedConnectorRuntime/);
  assert.match(worker, /service_account_login/);
  assert.match(worker, /session_cookie/);
  assert.match(worker, /JONEPS-2026003010-02/);
  assert.match(wrangler, /crons = \["0 4 \* \* 1"\]/);
  assert.match(page, /getSourceScanRuns/);
  assert.match(consoleSource, /WEEKLY AUTO SCANNER/);
  assert.match(consoleSource, /Run scan now/);
  assert.match(styles, /\.auto-scan-panel/);
  assert.match(styles, /\.scan-run-row/);
});

test("wires GitHub Actions MEED web-login ingestion into the platform", async () => {
  const [workflow, script, route, consoleSource, dataSource, envExample, packageJson, docs, styles] = await Promise.all([
    read("../.github/workflows/meed-weekly-ingest.yml"),
    read("../scripts/meed-github-ingest.mjs"),
    read("../app/api/meed-ingest/route.ts"),
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../.env.example"),
    read("../package.json"),
    read("../docs/MEED_GITHUB_ACTIONS.md"),
    read("../app/globals.css"),
  ]);

  assert.match(workflow, /MEED Weekly Ingest/);
  assert.match(workflow, /workflow_dispatch/);
  assert.match(workflow, /20 4 \* \* 1/);
  assert.match(workflow, /MEED_USERNAME: \$\{\{ secrets\.MEED_USERNAME \}\}/);
  assert.match(workflow, /MEED_PASSWORD: \$\{\{ secrets\.MEED_PASSWORD \}\}/);
  assert.match(workflow, /MEED_INGEST_TOKEN: \$\{\{ secrets\.MEED_INGEST_TOKEN \}\}/);
  assert.match(workflow, /CF_ACCESS_CLIENT_ID: \$\{\{ secrets\.CF_ACCESS_CLIENT_ID \}\}/);
  assert.match(workflow, /CF_ACCESS_CLIENT_SECRET: \$\{\{ secrets\.CF_ACCESS_CLIENT_SECRET \}\}/);
  assert.match(workflow, /node scripts\/meed-github-ingest\.mjs/);
  assert.match(script, /import\("playwright"\)/);
  assert.match(script, /download to excel/i);
  assert.match(script, /CF-Access-Client-Id/);
  assert.match(script, /CF-Access-Client-Secret/);
  assert.match(script, /parseWorkbook/);
  assert.match(script, /MEED_PROJECT_SEARCH_URL/);
  assert.match(script, /MEED_INGEST_ENDPOINT/);
  assert.match(route, /MEED_INGEST_TOKEN/);
  assert.match(route, /UNAUTHORIZED/);
  assert.match(route, /ON CONFLICT\(id\) DO UPDATE/);
  assert.match(route, /source_scan_runs/);
  assert.match(route, /github-actions/);
  assert.match(dataSource, /githubActionsCollector/);
  assert.match(consoleSource, /GitHub Actions MEED自动采集器/);
  assert.match(consoleSource, /requiredSecrets/);
  assert.match(styles, /\.github-collector-card/);
  assert.match(envExample, /MEED_INGEST_TOKEN=/);
  assert.match(envExample, /MEED_INGEST_ENDPOINT=/);
  assert.match(envExample, /CF_ACCESS_CLIENT_ID=/);
  assert.match(packageJson, /meed:github-ingest/);
  assert.match(docs, /GitHub Repository Secrets/);
  assert.match(docs, /Cloudflare Worker Secret/);
});

test("wires Telegram tender radar into scheduled GitHub ingestion", async () => {
  const [workflow, script, route, dataSource, consoleSource, styles, envExample, packageJson, docs] = await Promise.all([
    read("../.github/workflows/telegram-tender-radar.yml"),
    read("../scripts/telegram-tender-ingest.mjs"),
    read("../app/api/telegram-ingest/route.ts"),
    read("../app/data.ts"),
    read("../app/OpsConsole.tsx"),
    read("../app/globals.css"),
    read("../.env.example"),
    read("../package.json"),
    read("../docs/TELEGRAM_TENDER_RADAR.md"),
  ]);

  assert.match(workflow, /Telegram Tender Radar/);
  assert.match(workflow, /TELEGRAM_CHANNELS/);
  assert.match(workflow, /TELEGRAM_BOT_TOKEN/);
  assert.match(workflow, /NEWS_INGEST_TOKEN/);
  assert.match(script, /https:\/\/t\.me\/s\//);
  assert.match(script, /TELEGRAM_BOT_TOKEN/);
  assert.match(script, /tenderTerms/);
  assert.match(route, /telegram\.tender_ingested/);
  assert.match(route, /SOURCE_INGEST_TOKEN/);
  assert.match(route, /NEWS_INGEST_TOKEN/);
  assert.match(dataSource, /telegramTenderRadar/);
  assert.match(dataSource, /Telegram Lebanon Tender Pack/);
  assert.match(dataSource, /Telegram Jordan Tender Pack/);
  assert.match(dataSource, /Telegram Iraq Tender Pack/);
  assert.match(consoleSource, /telegram-collector-card/);
  assert.match(styles, /\.telegram-collector-card/);
  assert.match(envExample, /TELEGRAM_INGEST_ENDPOINT=/);
  assert.match(envExample, /TELEGRAM_CHANNELS=/);
  assert.match(packageJson, /telegram:tender-ingest/);
  assert.match(docs, /not a general news monitor/);
});

test("ingests the latest MEED Levant delta and supports custom-header export", async () => {
  const [consoleSource, dataSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(dataSource, /MEED-IQ-48010/);
  assert.match(dataSource, /MEED-IQ-553724/);
  assert.match(dataSource, /export const meedLatestIngestion/);
  assert.match(dataSource, /totalNetValue: "\$19\.95B"/);
  assert.match(consoleSource, /function ExportModal/);
  assert.match(consoleSource, /自定义表头导出/);
  assert.match(consoleSource, /available fields are role-controlled/);
  assert.match(consoleSource, /Export CSV/);
  assert.match(consoleSource, /Export Excel/);
  assert.match(consoleSource, /LEVANT OPPORTUNITY MAP/);
  assert.match(styles, /\.export-columns/);
  assert.match(styles, /\.latest-ingestion-card/);
});

test("expands the radar with active MEED projects and official tender sources", async () => {
  const [consoleSource, dataSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(dataSource, /recent30Days: 136/);
  assert.match(dataSource, /sourceConnectorConfig/);
  assert.match(dataSource, /MEED_EXPORT_CSV_URL/);
  assert.match(dataSource, /MEED_USERNAME/);
  assert.match(dataSource, /MEED_PASSWORD/);
  assert.match(dataSource, /MEED_SESSION_COOKIE/);
  assert.match(dataSource, /MEED_AUTH_MODE/);
  assert.match(dataSource, /JONEPS-2026003010-02/);
  assert.match(dataSource, /PPA-LB-12638/);
  assert.match(dataSource, /Jordan Government MPLS Lines and SD-WAN License Renewal/);
  assert.match(dataSource, /Ogero KYOCERA Document Equipment Maintenance/);
  assert.match(dataSource, /id: "364062"/);
  assert.match(dataSource, /JONEPS-2026002489-02/);
  assert.match(dataSource, /SRC-587-2026/);
  assert.match(dataSource, /CDR-1248/);
  assert.match(dataSource, /MEMR-11M-2026/);
  assert.match(dataSource, /PPA-LB-12343/);
  assert.match(dataSource, /Iraq National Investment Commission/);
  assert.match(dataSource, /Iraq Ministry of Communications/);
  assert.match(dataSource, /Iraq Ministry of Electricity/);
  assert.match(dataSource, /Iraq Ministry of Transport/);
  assert.match(dataSource, /Iraq ITPC/);
  assert.match(dataSource, /Iraq Ministry of Planning/);
  assert.match(dataSource, /Jordan NEPCO/);
  assert.match(dataSource, /Jordan MWI/);
  assert.match(dataSource, /Jordan ASEZA/);
  assert.match(dataSource, /Lebanon EDL/);
  assert.match(dataSource, /EU International Partnerships/);
  assert.match(dataSource, /GIZ Iraq Tenders/);
  assert.match(dataSource, /countrySourceStrategies/);
  assert.match(dataSource, /opportunityRadarLayers/);
  assert.match(dataSource, /sourceScanCadencePlan/);
  assert.match(dataSource, /sourceKeywordLibrary/);
  assert.match(dataSource, /商机形成层/);
  assert.match(dataSource, /正式竞争层/);
  assert.match(dataSource, /ألياف ضوئية/);
  assert.match(dataSource, /Jordan MEMR/);
  assert.match(dataSource, /Ogero Bids/);
  assert.match(dataSource, /Touch Business Opportunities/);
  assert.match(dataSource, /Alfa Business Opportunity/);
  assert.match(dataSource, /Lebanon TRA/);
  assert.match(dataSource, /运营商\/ISP/);
  assert.match(dataSource, /Machinery & Electronic/);
  assert.match(dataSource, /huaweiOfficialSolutionCatalog/);
  assert.match(dataSource, /Huawei Enterprise Products & Solutions/);
  assert.match(dataSource, /CloudEngine/);
  assert.match(dataSource, /OptiXaccess/);
  assert.match(dataSource, /OceanStor/);
  assert.match(dataSource, /matchHuaweiOfficialSolutions/);
  assert.match(dataSource, /seedSolutions\(seed\.industry, seed\.title\)/);
  assert.match(dataSource, /enrichmentSourcePlaybook/);
  assert.match(dataSource, /enrichmentFieldMatrix/);
  assert.match(dataSource, /export const sourceCoverage/);
  assert.match(consoleSource, /MULTI-SOURCE COVERAGE/);
  assert.match(consoleSource, /countrySourceStrategies\.map/);
  assert.match(consoleSource, /opportunityRadarLayers\.map/);
  assert.match(consoleSource, /sourceScanCadencePlan\.map/);
  assert.match(consoleSource, /sourceKeywordLibrary/);
  assert.match(consoleSource, /MEED CONNECTOR BINDING/);
  assert.match(consoleSource, /sourceConnectorConfig\.meed\.projectSearchUrl/);
  assert.match(consoleSource, /SOURCE ENRICHMENT PLAYBOOK/);
  assert.match(consoleSource, /<option>WATCH<\/option>/);
  assert.match(styles, /\.source-registry/);
  assert.match(styles, /\.country-source-grid/);
  assert.match(styles, /\.radar-layer-grid/);
  assert.match(styles, /\.cadence-keyword-grid/);
  assert.match(styles, /\.meed-binding-card/);
  assert.match(styles, /\.coverage-kpis/);
  assert.match(styles, /\.playbook-grid/);
  assert.match(styles, /\.field-matrix/);
});

test("adds the 2026-09-05 MEED export delta with roles and priority candidates", async () => {
  const [dataSource, contactsSource, consoleSource] = await Promise.all([
    read("../app/data.ts"),
    read("../app/meed-contacts.ts"),
    read("../app/OpsConsole.tsx"),
  ]);

  assert.match(dataSource, /verifiedAt: "2026-09-05 16:04 Baghdad"/);
  assert.match(dataSource, /totalRecords: 27/);
  assert.match(dataSource, /totalNetValue: "\$19\.95B"/);
  for (const id of ["48010", "553724", "400385", "466173", "575330", "39209"]) {
    assert.match(dataSource, new RegExp(`id: "${id}"`));
  }
  assert.match(dataSource, /MoO Strategic Crude Oil Export Pipeline: Basra - Haditha/);
  assert.match(dataSource, /Al-Youssifiyah Thermal Power Plant 1400 MW/);
  assert.match(dataSource, /三国3027条、活跃1063条、近30天136条/);
  assert.match(contactsSource, /MEED-IQ-48010/);
  assert.match(contactsSource, /MEED-IQ-553724/);
  assert.match(contactsSource, /MEED-JO-575330/);
  assert.match(contactsSource, /MEED Projects with Roles · 2026-09-05 export/);
  assert.match(consoleSource, /MEED \+ LEVANT MAP/);
});

test("supports audited manual opportunity entry into D1 and the live radar", async () => {
  const [consoleSource, actions, page, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/actions.ts"),
    read("../app/page.tsx"),
    read("../app/globals.css"),
  ]);

  assert.match(consoleSource, /function ManualImportModal/);
  assert.match(consoleSource, /手工录入机会/);
  assert.match(consoleSource, /setManualOpportunities/);
  assert.match(actions, /export async function createManualOpportunity/);
  assert.match(actions, /opportunity\.manual_created/);
  assert.match(actions, /db\.insert\(storedOpportunities\)/);
  assert.match(actions, /export async function getManualOpportunities/);
  assert.match(page, /initialManualOpportunities/);
  assert.match(styles, /\.manual-import-modal/);
  assert.match(styles, /\.manual-form/);
});

test("exports opportunities with the internal response import template", async () => {
  const [consoleSource, templateSource, styles, templateWorkbook] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/response-import-template.ts"),
    read("../app/globals.css"),
    readBytes("../public/templates/response-import-template-202605.xlsx"),
  ]);

  const expectedHeaders = [
    "Last Name",
    "First Name",
    "Email (Fill in telephone number or email mandatory)",
    "Telephone (Fill in telephone number or email mandatory)",
    "Country/Region (Mandatory)",
    "Company Name",
    "Industry L1",
    "Industry L2",
    "Action Type (Mandatory)",
    "Tactic Code (Mandatory)",
    "Agree to Contact (Mandatory)",
    "Response Collect Time (Mandatory)Please choose the correct time, otherwise the statistics of the marketing effect will be affected.",
    "Response Platform Name (Mandatory)",
    "State/Province",
    "City",
    "District/County",
    "Job Title",
    "Relationship With The Company",
    "Preferred Products",
    "Offer ID",
    "Offer Name",
    "Offer URL",
    "Utm_Campaign",
    "Utm_Medium",
    "Utm_Source",
    "Source",
    "Utm_Content",
    "Utm_Term",
    "Utm_Object",
  ];
  const positions = expectedHeaders.map(header => templateSource.indexOf(`"${header}"`));
  assert.equal(positions.length, 29);
  assert.ok(positions.every(position => position > -1), "all template headers should be present");
  assert.deepEqual(positions, [...positions].sort((a, b) => a - b), "headers should keep the source template order");
  assert.match(templateSource, /responseTemplateHeaders/);
  assert.match(templateSource, /responseTemplateDropdowns/);
  assert.match(templateSource, /validateResponseTemplateRows/);
  assert.match(templateSource, /MAX_RESPONSE_TEMPLATE_ROWS = 499/);
  assert.match(templateSource, /FIXED_RESPONSE_TACTIC_CODE = "01CHN0226A2O03M"/);
  assert.match(templateSource, /key: "tacticCode"[\s\S]*FIXED_RESPONSE_TACTIC_CODE/);
  assert.match(templateSource, /platformName: "Others"/);
  assert.match(templateSource, /key: "platform"[\s\S]*pickAllowed\(context\.platformName, responseTemplateDropdowns\.platformName, "Others"\)/);
  assert.match(templateSource, /CJK_TEXT/);
  assert.match(templateSource, /responseLocation/);
  assert.match(templateSource, /locationMatchesCountry/);
  assert.match(templateSource, /must include Email or Telephone/);
  assert.match(templateSource, /countryProcurementFallback/);
  assert.match(templateSource, /englishOpportunityTitle/);
  assert.match(templateSource, /stripCjk/);
  assert.match(templateSource, /Jordan JONEPS procurement entry/);
  assert.match(templateSource, /Lebanon Public Procurement Authority/);
  assert.match(templateSource, /preserveDataImportHeaderAndTemplate/);
  assert.match(templateSource, /xl\/worksheets\/sheet2\.xml/);
  assert.match(templateSource, /zipSync/);
  assert.doesNotMatch(templateSource, /function worksheetXml/);
  assert.doesNotMatch(templateSource, /function createZip/);
  assert.match(templateSource, /column: "E"/);
  assert.match(templateSource, /column: "G"/);
  assert.match(templateSource, /column: "H"/);
  assert.match(templateSource, /column: "I"/);
  assert.match(templateSource, /column: "K"/);
  assert.match(templateSource, /column: "M"/);
  assert.match(templateSource, /column: "Q"/);
  assert.match(templateSource, /column: "R"/);
  assert.match(templateSource, /column: "S"/);
  assert.match(consoleSource, /内部Response导入模板/);
  assert.match(consoleSource, /responseTemplateDropdowns\.actionType/);
  assert.match(consoleSource, /responseTemplateDropdowns\.platformName/);
  assert.match(consoleSource, /createResponseTemplateXlsx/);
  assert.match(consoleSource, /validateResponseTemplateRows/);
  assert.match(consoleSource, /responsePreflightErrors/);
  assert.doesNotMatch(consoleSource, /responsePreflightErrors\.length > 0\} onClick=\{exportResponseTemplate\}/);
  assert.match(consoleSource, /auto-fills institution or procurement-entry phone numbers/);
  assert.match(consoleSource, /MAX_RESPONSE_TEMPLATE_ROWS/);
  assert.match(consoleSource, /FIXED_RESPONSE_TACTIC_CODE/);
  assert.match(consoleSource, /readOnly/);
  assert.match(consoleSource, /defaultSelected:false/);
  assert.match(consoleSource, /column\.value\(item,lang\)/);
  assert.match(consoleSource, /value:\(item,lang\)=>lang==="zh"\?item\.title:item\.titleEn/);
  assert.match(templateSource, /Government & Public Services/);
  assert.match(templateSource, /Oil & Gas/);
  assert.match(templateSource, /Huawei Cloud/);
  assert.doesNotMatch(templateSource, /join\\(", "\\)/, "Preferred Products should be one dropdown value, not comma-joined values");
  assert.match(styles, /\.response-template-panel/);
  assert.match(styles, /\.response-preflight/);
  assert.match(styles, /\.template-column-preview/);

  const templateZip = unzipSync(new Uint8Array(templateWorkbook));
  const workbookXml = strFromU8(templateZip["xl/workbook.xml"]);
  const dataImportSheetXml = strFromU8(templateZip["xl/worksheets/sheet2.xml"]);
  const sheetRelsXml = strFromU8(templateZip["xl/worksheets/_rels/sheet2.xml.rels"]);
  assert.match(workbookXml, /<sheet name="Template Description"/);
  assert.match(workbookXml, /<sheet name="Data Import"/);
  assert.match(workbookXml, /<sheet name="Option"[^>]*state="hidden"/);
  assert.match(dataImportSheetXml, /<dimension ref="A1:AD500"/);
  assert.match(dataImportSheetXml, /<row r="1"[^>]*ht="75\.5"/);
  assert.match(dataImportSheetXml, /<dataValidations count="8"/);
  assert.match(dataImportSheetXml, /<formula1>Country_Region<\/formula1>/);
  assert.match(dataImportSheetXml, /<formula1>IndustryL1显示名称<\/formula1>/);
  assert.match(dataImportSheetXml, /<formula1>Response_Collection_Platform<\/formula1>/);
  assert.match(dataImportSheetXml, /<xm:sqref>H2:H1048576<\/xm:sqref>/);
  assert.match(sheetRelsXml, /comments1\.xml/);
});

test("maps MEED role contacts into details and response exports", async () => {
  const [consoleSource, dataSource, templateSource, contactSource, styles] = await Promise.all([
    read("../app/OpsConsole.tsx"),
    read("../app/data.ts"),
    read("../app/response-import-template.ts"),
    read("../app/meed-contacts.ts"),
    read("../app/globals.css"),
  ]);

  assert.match(dataSource, /meedContactDirectory/);
  assert.match(dataSource, /contacts\?: OpportunityContact/);
  assert.match(dataSource, /email\?: string/);
  assert.match(dataSource, /officialSourceContacts/);
  assert.match(dataSource, /attachContacts/);
  assert.match(consoleSource, /MEED角色链/);
  assert.match(consoleSource, /官方联系人/);
  assert.match(consoleSource, /function contactStatus/);
  assert.match(consoleSource, /联系人状态/);
  assert.match(consoleSource, /Contact status/);
  assert.match(consoleSource, /首选触达方式/);
  assert.match(consoleSource, /Preferred contact method/);
  assert.match(consoleSource, /preferred-contact-card/);
  assert.match(consoleSource, /有直线电话/);
  assert.match(consoleSource, /Institution phone/);
  assert.match(consoleSource, /contact-status-badge/);
  assert.match(consoleSource, /contact-view/);
  assert.match(consoleSource, /contact\.email/);
  assert.match(consoleSource, /contact\.companyPhone/);
  assert.match(templateSource, /primaryContact/);
  assert.match(templateSource, /contactEmail/);
  assert.match(templateSource, /contactTelephone/);
  assert.match(contactSource, /companyPhone/);
  assert.match(styles, /\.preferred-contact-card/);
  assert.match(templateSource, /contactCompany/);
  assert.match(contactSource, /MEED-IQ-364062/);
  assert.match(contactSource, /MEED-IQ-513263/);
  assert.match(contactSource, /Rosneft/);
  assert.match(styles, /\.contact-list/);
  assert.match(styles, /\.contact-card/);
  assert.match(styles, /\.contact-status-badge/);
});
