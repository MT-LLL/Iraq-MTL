import { OpsConsole } from "./OpsConsole";
import { AccountGate } from "./AccountGate";
import { PartnerPortal, type PartnerOpportunityView } from "./PartnerPortal";
import { getNotificationConfiguration } from "./notifications";
import { getCurrentAccountState, getLeadDistributions, getManualOpportunities, getPushJobs, getSourceScanRuns } from "./actions";
import { opportunities } from "./data";
import { localText, localTerm, opportunityBrief } from "./localization";

export const dynamic = "force-dynamic";

function partnerSafeOpportunities(): PartnerOpportunityView[] {
  return opportunities.map(item => {
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
  if (accountState.profile.identityType === "partner") {
    return <PartnerPortal profile={accountState.profile} items={partnerSafeOpportunities()}/>;
  }
  const [manualOpportunities, leadDistributions, sourceScanRuns, pushJobs] = await Promise.all([getManualOpportunities(), getLeadDistributions(), getSourceScanRuns(), getPushJobs()]);
  return <OpsConsole authUser={accountState.authUser} initialProfile={accountState.profile} initialPending={accountState.pending} initialManualOpportunities={manualOpportunities} initialLeadDistributions={leadDistributions} initialSourceScanRuns={sourceScanRuns} initialPushJobs={pushJobs} deliveryStatus={getNotificationConfiguration()}/>;
}
