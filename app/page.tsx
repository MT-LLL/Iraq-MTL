import { OpsConsole } from "./OpsConsole";
import { AccountGate } from "./AccountGate";
import { getNotificationConfiguration } from "./notifications";
import { getCurrentAccountState, getLatestOpportunityRefreshAt, getLeadDistributions, getManualOpportunities, getOpportunityTracking, getPushJobs, getSourceScanRuns } from "./actions";

export const dynamic = "force-dynamic";

export default async function Home() {
  const accountState = await getCurrentAccountState();
  if (!accountState.profile || accountState.profile.status !== "approved") {
    return <AccountGate authUser={accountState.authUser} profile={accountState.profile}/>;
  }

  // Partner self-service access is paused. Do not expose the static demo catalog
  // through a partner-facing page while the internal-only workflow is in effect.
  if (accountState.profile.identityType === "partner") {
    return <main style={{ padding: "32px", maxWidth: "760px", margin: "0 auto" }}>
      <h1>伙伴登录暂未开放</h1>
      <p>当前平台仅供授权的华为内部人员使用。机会点将由华为内部人员审核后，通过邮件发送给伙伴。</p>
    </main>;
  }

  const [latestOpportunityRefreshAt, opportunityTracking, manualOpportunities, leadDistributions, sourceScanRuns, pushJobs] = await Promise.all([
    getLatestOpportunityRefreshAt(),
    getOpportunityTracking(),
    getManualOpportunities(),
    getLeadDistributions(),
    getSourceScanRuns(),
    getPushJobs(),
  ]);
  return <OpsConsole authUser={accountState.authUser} initialProfile={accountState.profile} initialPending={accountState.pending} initialManualOpportunities={manualOpportunities} initialLeadDistributions={leadDistributions} initialSourceScanRuns={sourceScanRuns} initialPushJobs={pushJobs} initialOpportunityTracking={opportunityTracking} latestOpportunityRefreshAt={latestOpportunityRefreshAt} deliveryStatus={getNotificationConfiguration()}/>;
}
