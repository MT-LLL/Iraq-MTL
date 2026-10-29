import { OpsConsole } from "./OpsConsole";
import { AccountGate } from "./AccountGate";
import { PartnerPortal, type PartnerOpportunityView } from "./PartnerPortal";
import { getNotificationConfiguration } from "./notifications";
import { getCurrentAccountState, getLatestOpportunityRefreshAt, getCollaborationActivity, getLeadDistributions, getManualOpportunities, getOpportunityTracking, getPartnerShareableOpportunities, getPushJobs, getSourceScanRunCount, getSourceScanRuns } from "./actions";
import type { Opportunity } from "./data";
import { localText, localTerm, opportunityBrief } from "./localization";

export const dynamic = "force-dynamic";

async function safeDashboardLoad<T>(label: string, load: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await load();
  } catch (error) {
    console.error(`[MTL] Dashboard data unavailable (${label}):`, error);
    return fallback;
  }
}

function partnerSafeOpportunities(catalog: Opportunity[]): PartnerOpportunityView[] {
  // Stable ID de-duplication: dynamic D1 records override catalog entries if IDs ever overlap.
  const unique = [...new Map(catalog.map(item => [item.id, item])).values()];
  return unique.map(item => {
    const zh = opportunityBrief(item, "zh");
    const en = opportunityBrief(item, "en");
    return {
      id: item.id,
      title: { zh: item.title, en: item.titleEn },
      country: { zh: localTerm("zh", item.country), en: localTerm("en", item.country) },
      city: { zh: localText("zh", item.city), en: localText("en", item.city) },
      industry: { zh: localTerm("zh", item.industry), en: localTerm("en", item.industry) },
      stage: { zh: localText("zh", item.stage), en: localText("en", item.stage) },
      summary: {
        zh: `${item.title}当前处于${localText("zh", item.stage)}阶段。伙伴可围绕公开项目范围、关键节点、采购入口、本地交付和华为方案方向开展前期协同。`,
        en: `${item.titleEn} is currently at ${localText("en", item.stage)} stage. Partners can collaborate around public scope, milestones, procurement entry, local delivery and Huawei solution directions.`,
      },
      value: { zh: zh.value, en: en.value },
      deadline: { zh: zh.deadline, en: en.deadline },
      funding: { zh: zh.funding, en: en.funding },
      source: { zh: zh.source, en: en.source },
      updated: { zh: zh.updated, en: en.updated },
      solutions: item.solutions.slice(0, 4).map((_, index) => ({
        domain: { zh: zh.solutionItems[index]?.domain ?? "华为方案", en: en.solutionItems[index]?.domain ?? "Huawei solution" },
        name: { zh: zh.solutionItems[index]?.name ?? "待匹配", en: en.solutionItems[index]?.name ?? "To be scoped" },
        role: { zh: zh.solutionItems[index]?.role ?? "结合招标范围进一步澄清。", en: en.solutionItems[index]?.role ?? "Refine against the tender scope." },
      })),
      contact: {
        status: { zh: zh.contactDetails.status, en: en.contactDetails.status },
        name: { zh: zh.contactDetails.name, en: en.contactDetails.name },
        role: { zh: zh.contactDetails.role, en: en.contactDetails.role },
        company: { zh: zh.contactDetails.company, en: en.contactDetails.company },
        email: { zh: zh.contactDetails.email, en: en.contactDetails.email },
        phone: { zh: zh.contactDetails.phone, en: en.contactDetails.phone },
        companyPhone: { zh: zh.contactDetails.companyPhone, en: en.contactDetails.companyPhone },
        procurementEntry: en.contactDetails.procurementEntry,
        source: { zh: zh.contactDetails.source, en: en.contactDetails.source },
      },
    };
  });
}

export default async function Home() {
  const accountState = await getCurrentAccountState();
  if (!accountState.profile || accountState.profile.status !== "approved") {
    return <AccountGate authUser={accountState.authUser} profile={accountState.profile}/>;
  }

  const [latestOpportunityRefreshAt, opportunityTracking] = await Promise.all([
    safeDashboardLoad("latest-refresh-time", () => getLatestOpportunityRefreshAt(), null),
    safeDashboardLoad("opportunity-tracking", () => getOpportunityTracking(), []),
  ]);
  const archivedIds = new Set(opportunityTracking.filter(row => row.status === "archived").map(row => row.opportunityId));

  if (accountState.profile.identityType === "partner") {
    const partnerApprovedD1Opportunities = await safeDashboardLoad("partner-opportunities", () => getPartnerShareableOpportunities(), []);
    const partnerCatalog = partnerSafeOpportunities(partnerApprovedD1Opportunities)
      .filter(item => !archivedIds.has(item.id));
    return <PartnerPortal profile={accountState.profile} items={partnerCatalog} latestOpportunityRefreshAt={latestOpportunityRefreshAt}/>;
  }

  // Load and hydrate the D1 opportunity catalog once per dashboard request.
  // Lead distributions and push jobs reuse it instead of re-reading every
  // opportunity row and reparsing solution_matches multiple times.
  const manualOpportunities = await safeDashboardLoad("manual-opportunities", () => getManualOpportunities(), []);
  const [leadDistributions, sourceScanRuns, sourceScanRunCount, pushJobs, collaborationActivity] = await Promise.all([
    safeDashboardLoad("lead-distributions", () => getLeadDistributions(manualOpportunities), []),
    safeDashboardLoad("source-scan-runs", () => getSourceScanRuns(), []),
    safeDashboardLoad("source-scan-run-count", () => getSourceScanRunCount(), 0),
    safeDashboardLoad("push-jobs", () => getPushJobs(manualOpportunities), []),
    safeDashboardLoad("collaboration-activity", () => getCollaborationActivity(), []),
  ]);
  return <OpsConsole authUser={accountState.authUser} initialProfile={accountState.profile} initialPending={accountState.pending} initialManualOpportunities={manualOpportunities} initialLeadDistributions={leadDistributions} initialSourceScanRuns={sourceScanRuns} initialSourceScanRunCount={sourceScanRunCount} initialPushJobs={pushJobs} initialCollaborationActivity={collaborationActivity} initialOpportunityTracking={opportunityTracking} latestOpportunityRefreshAt={latestOpportunityRefreshAt} deliveryStatus={getNotificationConfiguration()}/>;
}
