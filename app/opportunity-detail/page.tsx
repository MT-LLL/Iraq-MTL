import { getInternalOpportunityDetail } from "../actions";
import { contactDetails } from "../localization";

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
  const contact = contactDetails(item, lang);
  const contacts = item.contacts ?? [];
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
  return <main style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f3f8f7,#edf4f5 48%,#f8faf9)", padding: "32px 18px", color: "#15313a" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ position: "relative", overflow: "hidden", borderRadius: 22, padding: "34px 38px", marginBottom: 20, color: "#fff", background: "linear-gradient(125deg,#102f3a,#075f64 58%,#0c8b83)", boxShadow: "0 18px 50px rgba(15,70,75,.22)" }}>
        <div style={{ position: "absolute", right: -80, top: -110, width: 330, height: 330, borderRadius: "50%", border: "1px solid rgba(255,255,255,.14)" }} />
        <div style={{ position: "relative", display: "flex", gap: 28, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ maxWidth: 790 }}>
            <span style={{ display: "inline-block", padding: "6px 10px", borderRadius: 999, background: "rgba(255,255,255,.12)", fontSize: 11, letterSpacing: 1.2, fontWeight: 700 }}>IRAQ MTL · OPPORTUNITY INTELLIGENCE</span>
            <h1 style={{ fontSize: "clamp(28px,4vw,46px)", lineHeight: 1.16, margin: "18px 0 12px", letterSpacing: "-.03em" }}>{lang === "zh" ? item.title : item.titleEn}</h1>
            <p style={{ margin: 0, color: "#d9f0ee", fontSize: 15 }}>{item.country} · {item.city || tr(lang, "城市待确认", "City TBC")} · {item.industry || tr(lang, "行业待确认", "Industry TBC")} · {item.stage}</p>
          </div>
          <div style={{ minWidth: 190, padding: "18px 20px", borderRadius: 16, background: "rgba(3,24,29,.28)", border: "1px solid rgba(255,255,255,.16)" }}>
            <div style={{ fontSize: 11, color: "#bce5e1", letterSpacing: 1 }}>{tr(lang, "GPT 综合评分", "GPT OPPORTUNITY SCORE")}</div>
            <div style={{ fontSize: 48, fontWeight: 800, lineHeight: 1, margin: "8px 0" }}>{analysis?.fitScore ?? item.score}<span style={{ fontSize: 16 }}>/100</span></div>
            <div style={{ display: "inline-block", padding: "5px 9px", borderRadius: 999, background: "rgba(255,255,255,.12)", fontSize: 12 }}>{analysis?.priority || item.priority}</div>
          </div>
        </div>
      </header>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 14, marginBottom: 20 }}>
        {[[tr(lang,"项目金额","PROJECT VALUE"), item.value, "◆"],[tr(lang,"可服务空间","ADDRESSABLE SPACE"), item.addressable, "◈"],[tr(lang,"关键时间窗口","TIME WINDOW"), item.deadline, "◷"],[tr(lang,"资金状态","FUNDING STATUS"), item.funding, "●"]].map(([label,value,icon]) => <div key={String(label)} style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 16, padding: "18px 19px", boxShadow: "0 8px 24px rgba(29,68,72,.06)" }}><div style={{ display: "flex", justifyContent: "space-between", color: "#628087", fontSize: 11, letterSpacing: .7 }}><span>{label}</span><span style={{ color: "#0b8a82" }}>{icon}</span></div><strong style={{ display: "block", marginTop: 10, fontSize: 19, lineHeight: 1.3, color: "#183940" }}>{String(value || "—")}</strong></div>)}
      </section>
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0,1.65fr) minmax(300px,.85fr)", gap: 18, alignItems: "start" }}>
        <div>
          <section style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}><div style={{ color: "#0b837c", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>{tr(lang,"01 · GPT 核心推断","01 · GPT CORE ASSESSMENT")}</div><p style={{ ...textStyle, margin: "14px 0 0", fontSize: 16, color: "#25474e" }}>{demand}</p>{factsVsInference ? <div style={{ marginTop: 18, padding: "15px 17px", borderLeft: "4px solid #0b8a82", background: "#f2f8f7" }}><b>{tr(lang,"事实与推断","FACTS VS. INFERENCE")}</b><p style={{ ...textStyle, margin: "8px 0 0" }}>{factsVsInference}</p></div> : null}</section>
          <section style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}><div style={{ color: "#0b837c", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>{tr(lang,"02 · 华为方案推荐","02 · HUAWEI SOLUTION RECOMMENDATION")}</div>{solutions.length ? <div style={{ display: "grid", gap: 10, marginTop: 16 }}>{solutions.map((solution,index) => <div key={index} style={{ display: "flex", gap: 14, padding: "15px 16px", borderRadius: 12, background: "linear-gradient(90deg,#f1f8f7,#fff)", border: "1px solid #d8e9e6" }}><span style={{ flex: "0 0 28px", height: 28, borderRadius: "50%", display: "grid", placeItems: "center", background: "#0b837c", color: "#fff", fontWeight: 800 }}>{index+1}</span><div style={{ fontWeight: 700, lineHeight: 1.55 }}>{solution}</div></div>)}</div> : <p style={textStyle}>{tr(lang,"尚无已保存的 GPT 方案推荐。","No saved GPT solution recommendations yet.")}</p>}{rationale ? <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid #e5efec" }}><b>{tr(lang,"评分依据与匹配逻辑","SCORING RATIONALE & FIT LOGIC")}</b><p style={{ ...textStyle, margin: "8px 0 0" }}>{rationale}</p></div> : null}</section>
          <section style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 18, padding: "24px 26px", marginBottom: 16 }}><div style={{ color: "#0b837c", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>{tr(lang,"03 · 项目背景","03 · PROJECT BACKGROUND")}</div><p style={{ ...textStyle, margin: "14px 0 0" }}>{item.summary}</p></section>
          <section style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 18, padding: "24px 26px" }}><div style={{ color: "#0b837c", fontSize: 12, fontWeight: 800, letterSpacing: 1 }}>{tr(lang,"04 · 项目里程碑与进展","04 · MILESTONES & UPDATES")}</div>{[item.keyProjectMilestones || item.deadline,item.newsAndUpdates,item.latestNews].filter(Boolean).map((entry,index)=><div key={index} style={{ display: "flex", gap: 14, marginTop: 18 }}><span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0b8a82", marginTop: 7, flex: "0 0 auto" }} /><p style={{ ...textStyle, margin: 0 }}>{entry}</p></div>)}</section>
        </div>
        <aside>
          <section style={{ background: "#102f3a", color: "#fff", borderRadius: 18, padding: "22px", marginBottom: 16 }}><div style={{ color: "#80d8d1", fontSize: 11, letterSpacing: 1, fontWeight: 800 }}>{tr(lang,"风险雷达","RISK RADAR")}</div><h2 style={{ fontSize: 20, margin: "10px 0 14px" }}>{tr(lang,"风险与待核实事项","RISKS & ITEMS TO VERIFY")}</h2>{risks.length ? <ol style={{ paddingLeft: 20, margin: 0, color: "#d7e8e7", lineHeight: 1.75 }}>{risks.map((risk,index)=><li key={index} style={{ marginBottom: 9 }}>{risk}</li>)}</ol> : <p style={{ color:"#c5d9d8" }}>{tr(lang,"暂无单独记录的风险项。","No separately recorded risk items.")}</p>}</section>
          <section style={{ background: "#fff", border: "1px solid #dce9e6", borderRadius: 18, padding: "22px" }}><div style={{ color: "#0b837c", fontSize: 11, letterSpacing: 1, fontWeight: 800 }}>{tr(lang,"行动建议","NEXT ACTIONS")}</div>{actions.length ? <ol style={{ paddingLeft: 22, lineHeight: 1.75, color:"#315158", marginBottom:0 }}>{actions.map((action,index)=><li key={index} style={{ marginTop: 10 }}>{action}</li>)}</ol> : <p style={textStyle}>—</p>}</section>
        </aside>
      </section>
      <footer style={{ marginTop: 22, padding: "16px 2px", color: "#71868b", fontSize: 12, borderTop: "1px solid #d8e4e1" }}>{tr(lang, "IRAQ MTL Opportunity Intelligence · 内部经营资料，仅供获授权的华为内部人员使用。", "IRAQ MTL Opportunity Intelligence · Internal sales information for authorized Huawei personnel only.")}</footer>
    </div>
  </main>;
}
