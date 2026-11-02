import { getInternalOpportunityDetail } from "../actions";

type SearchParams = Record<string, string | string[] | undefined>;
type Lang = "zh" | "en";

function tr(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function OpportunityDetailPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await Promise.resolve(searchParams ?? {});
  const id = single(params.id);
  const lang: Lang = single(params.lang) === "en" ? "en" : "zh";
  let item: Awaited<ReturnType<typeof getInternalOpportunityDetail>>;
  try {
    item = await getInternalOpportunityDetail(id);
  } catch {
    return <main className="partner-ack-page"><section className="partner-ack-shell error">
      <span className="section-kicker">MTL OPPORTUNITY DETAIL</span>
      <h1>{tr(lang, "无法打开该机会点详情", "Unable to open this opportunity detail")}</h1>
      <p>{tr(lang, "请先使用获授权的华为内部账号登录 MTL 平台，然后重新打开邮件中的链接。", "Sign in to MTL with an authorized Huawei internal account, then reopen the email link.")}</p>
    </section></main>;
  }
  const analysis = item.opportunityAnalysis;
  const localized = analysis?.bilingualAnalysis?.[lang];
  const demand = localized?.demandSummary || analysis?.demandSummary || tr(lang, "该机会点尚未保存GPT分析。", "No saved GPT analysis is available for this opportunity.");
  const solutions = localized?.recommendedHuaweiSolutions?.length ? localized.recommendedHuaweiSolutions : analysis?.recommendedHuaweiSolutions || [];
  const rationale = localized?.scoreRationale || analysis?.scoreRationale || "";
  const risks = localized?.risks?.length ? localized.risks : analysis?.risks || [];
  const actions = localized?.nextActions?.length ? localized.nextActions : analysis?.nextActions || [];
  const evidence = localized?.evidence?.length ? localized.evidence : analysis?.evidence || [];
  const factsVsInference = localized?.factsVsInference || analysis?.factsVsInference || "";
  const textStyle = { lineHeight: 1.75, color: "#405b62", fontSize: 14, whiteSpace: "pre-wrap" as const };
  const sectionStyle = { background: "#fff", border: "1px solid #dce7e3", borderRadius: 12, padding: "18px 20px", marginBottom: 14 };
  return <main className="partner-ack-page">
    <section className="partner-ack-shell">
      <header className="partner-ack-hero">
        <div>
          <span className="section-kicker">IRAQ MTL · INTERNAL OPPORTUNITY BRIEF</span>
          <h1>{lang === "zh" ? item.title : item.titleEn}</h1>
          <p>{item.country} · {item.city} · {item.industry} · {item.stage}</p>
        </div>
        <div className="ack-status-card">
          <small>{tr(lang, "GPT匹配评分", "GPT fit score")}</small>
          <strong>{analysis?.fitScore ?? item.score}/100</strong>
          <span>{analysis?.priority || item.priority}</span>
          <small>{tr(lang, "更新时间", "Updated")}: {item.updated}</small>
        </div>
      </header>
      <section style={sectionStyle}>
        <h2>{tr(lang, "项目背景", "Project background")}</h2>
        <p style={textStyle}>{item.summary}</p>
        <div className="ack-facts">
          <div><small>{tr(lang, "项目金额", "Project value")}</small><strong>{item.value}</strong></div>
          <div><small>{tr(lang, "可服务空间", "Addressable scope")}</small><strong>{item.addressable}</strong></div>
          <div><small>{tr(lang, "关键时间窗口", "Key time window")}</small><strong>{item.deadline}</strong></div>
          <div><small>{tr(lang, "资金状态", "Funding status")}</small><strong>{item.funding}</strong></div>
        </div>
      </section>
      <section style={sectionStyle}>
        <h2>{tr(lang, "GPT核心推断", "GPT core assessment")}</h2>
        <p style={textStyle}>{demand}</p>
        {factsVsInference ? <><h3>{tr(lang, "事实与推断", "Facts vs. inference")}</h3><p style={textStyle}>{factsVsInference}</p></> : null}
        {rationale ? <><h3>{tr(lang, "评分依据与匹配逻辑", "Scoring rationale and fit logic")}</h3><p style={textStyle}>{rationale}</p></> : null}
      </section>
      <section style={sectionStyle}>
        <h2>{tr(lang, "GPT推荐的华为方案", "Huawei solutions recommended by GPT")}</h2>
        {solutions.length ? <ul style={textStyle}>{solutions.map((solution, index) => <li key={index}>{solution}</li>)}</ul> : <p style={textStyle}>{tr(lang, "尚无已保存的GPT方案推荐。", "No saved GPT solution recommendations yet.")}</p>}
      </section>
      <section style={sectionStyle}>
        <h2>{tr(lang, "风险与待核实事项", "Risks and items to verify")}</h2>
        {risks.length ? <ul style={textStyle}>{risks.map((risk, index) => <li key={index}>{risk}</li>)}</ul> : <p style={textStyle}>{tr(lang, "暂无单独记录的风险项。", "No separately recorded risk items.")}</p>}
        <h3>{tr(lang, "建议下一步", "Recommended next actions")}</h3>
        {actions.length ? <ol style={textStyle}>{actions.map((action, index) => <li key={index}>{action}</li>)}</ol> : null}
      </section>
      <section style={sectionStyle}>
        <h2>{tr(lang, "项目里程碑与最新进展", "Milestones and latest updates")}</h2>
        <p style={textStyle}>{item.keyProjectMilestones || item.deadline}</p>
        <p style={textStyle}>{item.newsAndUpdates || tr(lang, "暂无已记录的进展更新。", "No progress updates recorded.")}</p>
        <p style={textStyle}>{item.latestNews || tr(lang, "暂无最新新闻。", "No latest news recorded.")}</p>
      </section>
      {evidence.length ? <section style={sectionStyle}>
        <h2>{tr(lang, "分析证据", "Analysis evidence")}</h2>
        <ul style={textStyle}>{evidence.map((entry, index) => <li key={index}>{entry}</li>)}</ul>
      </section> : null}
      <footer style={{ color: "#72858a", fontSize: 12, padding: "8px 2px" }}>
        {tr(lang, "内部经营资料，仅供获授权的华为内部人员使用。", "Internal sales information for authorized Huawei personnel only.")}
      </footer>
    </section>
  </main>;
}
