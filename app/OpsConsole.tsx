"use client";

import { useEffect, useMemo, useState } from "react";
import { activity, countrySourceStrategies, enrichmentFieldMatrix, enrichmentSourcePlaybook, industryDispatchDirectory, marketingContentLibrary, meedAudit, meedLatestIngestion, meedLiveVerification, opportunities, opportunityRadarLayers, partnerDirectory, releaseUpdateLog, sourceConnectorConfig, sourceCoverage, sourceKeywordLibrary, sourceScanCadencePlan, type Country, type MarketingContent, type MarketingContentType, type Opportunity, type PartnerDirectoryEntry, type Priority } from "./data";
import { createLeadDistribution, createManualOpportunity, decideRegistration, getPendingRegistrations, recordPush, respondLeadDistribution, runWeeklySourceScan, saveOpportunityView, type LeadDistributionView, type PendingRegistrationView, type PushJobView, type SourceScanRunView } from "./actions";
import type { AppProfile } from "./AccountGate";
import { FIXED_RESPONSE_TACTIC_CODE, MAX_RESPONSE_TEMPLATE_ROWS, createResponseTemplateXlsx, defaultResponseTemplateContext, inferPreferredProducts, inferTemplateIndustry, responseTemplateColumns, responseTemplateDropdowns, validateResponseTemplateRows, type ResponseTemplateContext } from "./response-import-template";
import { localText, opportunityBrief as pushOpportunityBrief } from "./localization";

type View = "command" | "radar" | "updates" | "mtl" | "dispatch" | "partners" | "email" | "approvals" | "imports";
type Lang = "zh" | "en";
type DeliveryStatus = { email: boolean; sms: boolean; ai?: boolean; emailMissing?: string[]; smsMissing?: string[]; aiMissing?: string[]; emailProvider?: "resend" | "gmail"; aiProvider?: "zhipu" | "deepseek"; aiModel?: string };
const PLATFORM_ZH = "伊拉克代表处面向伙伴MTL营销作战平台";
const PLATFORM_EN = "Iraq Partner MTL Marketing War-room";

const navItems: { id: View; zh: string; en: string; glyph: string; badge?: string }[] = [
  { id: "command", zh: "经营总览", en: "Command Center", glyph: "⌁" },
  { id: "radar", zh: "机会雷达", en: "Opportunity Radar", glyph: "◎" },
  { id: "updates", zh: "更新纪要", en: "Release Notes", glyph: "▤", badge: "2" },
  { id: "mtl", zh: "MTL内容库", en: "MTL Library", glyph: "▣" },
  { id: "dispatch", zh: "线索分发", en: "Lead Dispatch", glyph: "⇄", badge: "0" },
  { id: "partners", zh: "伙伴协同", en: "Partner Collaboration", glyph: "◇", badge: "3" },
  { id: "email", zh: "邮件推送", en: "Email Push", glyph: "✉" },
  { id: "approvals", zh: "账户审批", en: "Account Approval", glyph: "✓" },
  { id: "imports", zh: "数据与导入", en: "Data & Imports", glyph: "↥" },
];

const tr = (lang: Lang, zh: string, en: string) => lang === "zh" ? zh : en;
const deliveryFailureText = (lang: Lang, code?: string, providerMessage?: string) => {
  const detail = [code, providerMessage].filter(Boolean).join(" · ");
  if (!detail) return tr(lang, "发送失败，请核对接收人、角色权限或服务凭据", "Delivery failed; verify recipients, role permission or service credentials");
  return tr(lang, `发送失败：${detail}`, `Delivery failed: ${detail}`);
};
const countryEn: Record<string, string> = { 伊拉克: "Iraq", 约旦: "Jordan", 黎巴嫩: "Lebanon" };
const industryZh: Record<string, string> = {
  Education: "教育",
  Electricity: "电力",
  "Government Sector": "政府行业",
  Healthcare: "医疗",
  "Machinery & Electronic": "机械电子",
  "Oil & Gas": "油气",
  Railway: "铁路",
  "Retail & Wholesale": "零售批发",
  Road: "道路交通",
  "Water Transport": "水运",
};
const termEn: Record<string, string> = {
  交通: "Transport", 政府: "Government", 油气: "Oil & Gas", 医疗: "Healthcare", 电力: "Power",
  水务: "Water", 金融: "Finance", 商业: "Commercial", 教育: "Education", 军队: "Military", 工业: "Industry", 运营商: "Carrier",
  内政: "Interior", 公共安全: "Public Safety",
  前期研究: "Study", "在建（98%）": "Under Construction (98%)",
  线索发现: "Lead discovery", 公开招标: "Open tender", 主合同招标: "Main contract tender", 主合同资格预审: "Main contract prequalification",
  资格预审: "Pre-qualification", 融资确认: "Funding confirmation", 概念设计: "Concept design", 方案征询: "RFI", "EPC 招标": "EPC tender",
  核心: "Core", 优选: "Preferred", 认证: "Certified",
  实施主体: "Implementing entity", 资金路径: "Funding path", 方案匹配: "Solution fit", 合规检查: "Compliance",
  通过: "Passed", 待核实: "Verify", 风险: "Risk", 极高: "Very high", 高: "High", 中高: "Medium-high", 中: "Medium", 低: "Low",
  已确认: "Confirmed", 潜在类型: "Potential type",
  数据通信: "Data Communication", 云与存储: "Cloud & Storage", 运维: "O&M", 光网络: "Optical Network", 无线: "Wireless",
  资金成熟度: "Funding maturity", 采购窗口: "Procurement window", 赢单驱动: "Win drivers", 客户触达: "Customer access", 战略价值: "Strategic value",
};
const localTerm = (lang: Lang, value: string) => lang === "zh" ? (industryZh[value] ?? value) : (termEn[value] ?? countryEn[value] ?? value);

const englishTextReplacements: Array<[RegExp, string]> = [
  [/官方公告/g, "official notice"],
  [/融资机构公告/g, "financing institution notice"],
  [/业主公告/g, "owner notice"],
  [/邮件线索/g, "email lead"],
  [/招标公告/g, "tender notice"],
  [/可服务空间/g, "addressable scope"],
  [/待拆分ICT工作包/g, "ICT work package to be scoped"],
  [/待确认/g, "TBC"],
  [/待公布/g, "TBA"],
  [/待核实/g, "to be verified"],
  [/财政预算/g, "fiscal budget"],
  [/多边资金/g, "multilateral funding"],
  [/业主自筹/g, "owner-funded"],
  [/政府/g, "government"],
  [/交通/g, "transport"],
  [/油气/g, "oil and gas"],
  [/电力/g, "power"],
  [/医疗/g, "healthcare"],
  [/商业/g, "commercial"],
  [/水务/g, "water"],
  [/军队/g, "military"],
  [/工业/g, "industry"],
  [/核心/g, "core"],
  [/优选/g, "preferred"],
  [/认证/g, "certified"],
  [/中高/g, "medium-high"],
  [/高/g, "high"],
  [/低/g, "low"],
  [/中/g, "medium"],
];

function exportText(lang: Lang, value: string) {
  if (lang === "zh") return value;
  let text = localTerm(lang, value);
  englishTextReplacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text.replace(/；/g, "; ").replace(/：/g, ": ").replace(/，/g, ", ").replace(/。/g, ". ");
}

function opportunityInsight(item: Opportunity, lang: Lang) {
  if (lang === "zh") return item.summary;
  return `${item.titleEn} is a ${localTerm(lang, item.country)} ${localTerm(lang, item.industry)} opportunity at ${exportText(lang, item.stage)} stage. Huawei participation space is ${localTerm(lang, item.participation)}, win assessment is ${localTerm(lang, item.win)}, and the estimated addressable scope is ${exportText(lang, item.addressable)}. Recommended next step: validate the owner entry point, budget path and ICT work packages before partner engagement.`;
}

function partnerSafeOpportunityInsight(item: Opportunity, lang: Lang) {
  const title = lang === "zh" ? item.title : item.titleEn;
  return tr(
    lang,
    `${title} 当前处于${localTerm(lang,item.stage)}阶段。伙伴可查看项目公开范围、关键节点、联系人/采购入口和可协同的华为方案方向；内部评分、赢单判断、竞争策略、Owner和其他伙伴信息已隐藏。`,
    `${title} is currently at ${localTerm(lang,item.stage)} stage. Partners can view public scope, key milestones, contact / procurement entry and Huawei solution directions for collaboration; internal score, win assessment, competitive strategy, owner and other partner information are hidden.`
  );
}

const priorityClass: Record<Priority, string> = { P0: "p0", P1: "p1", P2: "p2", WATCH: "watch" };
const priorityRank: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, WATCH: 3 };
const industryTagOptions = ["Education","Electricity","Government Sector","Healthcare","Machinery & Electronic","Oil & Gas","Railway","Retail & Wholesale","Road","Water Transport"];
const mtlContentTypeLabel: Record<MarketingContentType, { zh: string; en: string }> = {
  opportunity: { zh: "机会包", en: "Opportunity package" },
  meeting_minutes: { zh: "活动/拜访纪要", en: "Meeting minutes" },
  marketing_material: { zh: "营销物料", en: "Marketing material" },
  circle_event: { zh: "圈子活动", en: "Circle event" },
};
const mtlStatusClass: Record<MarketingContent["status"], string> = { ready: "active", draft: "review", review: "review" };
const mtlStatusLabel = (lang: Lang, status: MarketingContent["status"]) =>
  status === "ready" ? tr(lang, "可推送", "Ready") : status === "review" ? tr(lang, "待审核", "Review") : tr(lang, "草稿", "Draft");
const mtlAudienceLabel = (lang: Lang, audience: MarketingContent["audience"]) =>
  audience === "partner" ? tr(lang, "伙伴可见", "Partner") : audience === "internal" ? tr(lang, "仅内部", "Internal") : tr(lang, "内外双版", "Both");
function mtlIndustryLabel(lang: Lang, value: string) {
  if (lang === "zh") return value;
  return value
    .replace(/政府/g, "Government")
    .replace(/油气/g, "Oil & Gas")
    .replace(/电力/g, "Power")
    .replace(/交通/g, "Transport")
    .replace(/医疗/g, "Healthcare")
    .replace(/商业/g, "Commercial");
}

function standardDispatchIndustry(item: Opportunity) {
  const text = `${item.industry} ${item.title} ${item.titleEn}`;
  if (/教育|学校|大学|education|school|university/i.test(text)) return "Education";
  if (/电力|电网|新能源|光伏|储能|electric|power|solar|substation|bess/i.test(text)) return "Electricity";
  if (/医疗|医院|卫生|health|hospital|medical/i.test(text)) return "Healthcare";
  if (/油气|石油|天然气|炼化|油库|oil|gas|refinery|petroleum|hydrogenation/i.test(text)) return "Oil & Gas";
  if (/铁路|轨交|metro|rail/i.test(text)) return "Railway";
  if (/港口|航运|水运|port|harbour|harbor|marine|water transport/i.test(text)) return "Water Transport";
  if (/交通|道路|公路|road|traffic|highway|ring road/i.test(text)) return "Road";
  if (/商业|零售|批发|retail|wholesale|commercial|business/i.test(text)) return "Retail & Wholesale";
  if (/工业|制造|机械|电子|运营商|通信|ICT|ISP|Ogero|Alfa|Touch|software|machinery|electronic|telecom|carrier/i.test(text)) return "Machinery & Electronic";
  return "Government Sector";
}

function matchedDispatchOwners(tags: string[]) {
  return industryDispatchDirectory.filter(owner => tags.includes(owner.industry));
}

type ExportColumnDefinition = { key: string; zh: string; en: string; defaultSelected?: boolean; value: (item: Opportunity, lang: Lang) => string|number };
const exportColumnDefinitions: ExportColumnDefinition[] = [
  { key:"id", zh:"机会编号", en:"Opportunity ID", value:item=>item.id },
  { key:"title", zh:"项目名称", en:"Project Name", value:(item,lang)=>lang==="zh"?item.title:item.titleEn },
  { key:"alternateTitle", zh:"英文名称（可选）", en:"Chinese Name (Optional)", defaultSelected:false, value:(item,lang)=>lang==="zh"?item.titleEn:item.title },
  { key:"country", zh:"国家", en:"Country", value:(item,lang)=>localTerm(lang,item.country) },
  { key:"city", zh:"城市", en:"City", value:(item,lang)=>exportText(lang,item.city) },
  { key:"industry", zh:"行业", en:"Industry", value:(item,lang)=>localTerm(lang,item.industry) },
  { key:"stage", zh:"阶段", en:"Stage", value:(item,lang)=>exportText(lang,item.stage) },
  { key:"priority", zh:"优先级", en:"Priority", value:item=>item.priority },
  { key:"score", zh:"内部评分", en:"Internal Score", value:item=>item.score },
  { key:"confidence", zh:"置信度", en:"Confidence", value:item=>`${Math.round(item.confidence*100)}%` },
  { key:"value", zh:"项目金额", en:"Project Value", value:(item,lang)=>exportText(lang,item.value) },
  { key:"addressable", zh:"华为可服务空间", en:"Huawei Addressable", value:(item,lang)=>exportText(lang,item.addressable) },
  { key:"deadline", zh:"关键节点", en:"Key Milestone", value:(item,lang)=>exportText(lang,item.deadline) },
  { key:"owner", zh:"机会Owner", en:"Opportunity Owner", value:item=>item.owner },
  { key:"source", zh:"数据来源", en:"Source", value:(item,lang)=>exportText(lang,item.source) },
  { key:"updated", zh:"更新时间", en:"Updated On", value:item=>item.updated },
  { key:"funding", zh:"资金状态", en:"Funding Status", value:(item,lang)=>exportText(lang,item.funding) },
  { key:"participation", zh:"参与空间", en:"Participation Space", value:(item,lang)=>localTerm(lang,item.participation) },
  { key:"win", zh:"赢单判断", en:"Win Assessment", value:(item,lang)=>localTerm(lang,item.win) },
  { key:"solutions", zh:"匹配方案", en:"Matched Solutions", value:(item,lang)=>item.solutions.map(solution=>`${exportText(lang,solution.name)} (${solution.fit}%)`).join(lang==="zh"?"；":"; ") },
  { key:"competitors", zh:"潜在竞争对手", en:"Potential Competitors", value:(item,lang)=>item.competitors.map(competitor=>`${competitor.name}: ${localTerm(lang,competitor.type)}${lang==="zh" ? `：${competitor.note}` : ""}`).join(lang==="zh"?"；":"; ") },
  { key:"summary", zh:"机会洞察", en:"Opportunity Insight", value:(item,lang)=>lang==="zh"?item.summary:`${item.titleEn} is a ${localTerm(lang,item.country)} ${localTerm(lang,item.industry)} opportunity at ${exportText(lang,item.stage)} stage. Huawei participation space is ${localTerm(lang,item.participation)} and win assessment is ${localTerm(lang,item.win)}. Source: ${exportText(lang,item.source)}.` },
];

function ScoreRing({ value, size = "normal" }: { value: number; size?: "normal" | "large" }) {
  return (
    <div className={`score-ring ${size}`} style={{ "--score": `${value * 3.6}deg` } as React.CSSProperties}>
      <div><strong>{value}</strong><span>/100</span></div>
    </div>
  );
}

function contactStatus(item: Opportunity, lang: Lang) {
  const contacts = item.contacts ?? [];
  const hasEmail = contacts.some(contact => Boolean(contact.email));
  const hasDirectPhone = contacts.some(contact => Boolean(contact.phone));
  const hasInstitutionPhone = contacts.some(contact => Boolean(contact.companyPhone));
  if (hasEmail && hasDirectPhone) return { className: "direct", label: tr(lang, "邮箱+电话", "Email + phone"), note: tr(lang, "已匹配项目联系人方式", "Project contact is matched") };
  if (hasEmail) return { className: "direct", label: tr(lang, "有邮箱", "Email matched"), note: tr(lang, "已匹配项目联系人邮箱", "Project contact email is matched") };
  if (hasDirectPhone) return { className: "direct", label: tr(lang, "有直线电话", "Direct phone"), note: tr(lang, "MEED角色链已匹配联系人电话", "MEED role chain includes a contact phone") };
  if (hasInstitutionPhone) return { className: "institution", label: tr(lang, "仅机构电话", "Institution phone"), note: tr(lang, "源站未披露个人邮箱/手机，需通过采购入口补齐", "No personal email / mobile disclosed; complete through procurement entry") };
  return { className: "missing", label: tr(lang, "联系人待补齐", "Contact missing"), note: tr(lang, "源站未披露联系方式，需要伙伴或官方公告补齐", "No contact disclosed; complete via partner or official notice") };
}

function OpportunityList({ items, activeId, selectedIds, lang, canInternal, onSelect, onPush, onToggle }: { items: Opportunity[]; activeId: string; selectedIds: Set<string>; lang: Lang; canInternal: boolean; onSelect: (item: Opportunity) => void; onPush: (item: Opportunity) => void; onToggle: (item: Opportunity) => void }) {
  return (
    <div className="opportunity-list">
      {items.map((item) => {
        const contact = contactStatus(item, lang);
        return (
        <div className="opportunity-row-wrap" key={item.id}>
          <label className="op-select" title={tr(lang,"选择用于批量推送","Select for bulk push")}><input type="checkbox" checked={selectedIds.has(item.id)} onChange={() => onToggle(item)}/><span></span></label>
          <button className={`opportunity-row ${activeId === item.id ? "active" : ""}`} onClick={() => onSelect(item)}>
            <span className={`priority-pill ${canInternal ? priorityClass[item.priority] : "watch"}`}>{canInternal ? item.priority : tr(lang,"共享","Shared")}</span>
            <span className="op-main"><strong>{lang === "zh" ? item.title : item.titleEn}</strong><small>{localTerm(lang,item.country)} · {localTerm(lang,item.industry)} · {localTerm(lang,item.stage)}</small><em className={`contact-status-badge ${contact.className}`}>{contact.label}</em></span>
            <span className="op-value"><strong>{canInternal ? exportText(lang,item.addressable) : exportText(lang,item.value)}</strong><small>{canInternal ? tr(lang,"可服务空间","Addressable") : tr(lang,"项目金额","Project value")}</small></span>
            <span className={`deadline ${item.daysLeft !== null && item.daysLeft <= 14 ? "late" : ""}`}>
              <strong>{item.daysLeft === null ? tr(lang,"待确认","TBC") : tr(lang,`${item.daysLeft}天`,`${item.daysLeft}d`)}</strong><small>{tr(lang,"至关键节点","to milestone")}</small>
            </span>
            <span className="mini-score">{canInternal ? item.score : "SAFE"}</span>
          </button>
          {canInternal ? <button className="quick-push" onClick={() => onPush(item)} title={tr(lang,"打开伙伴安全推送预览","Open partner-safe push preview")}><span>↗</span>{tr(lang,"一键推送","1-click push")}</button> : null}
        </div>
        );
      })}
    </div>
  );
}

function DetailPanel({ item, lang, canInternal, onShare, onDispatch, onGolden }: { item: Opportunity; lang: Lang; canInternal: boolean; onShare: () => void; onDispatch: () => void; onGolden: () => void }) {
  const [tab, setTab] = useState<"insight" | "score" | "contacts" | "evidence" | "actions">("insight");
  const contact = contactStatus(item, lang);
  const availableTabs = canInternal
    ? ([['insight',tr(lang,'AI 洞察','AI Insight')],['score',tr(lang,'评分拆解','Score Breakdown')],['contacts',tr(lang,'联系人','Contacts')],['evidence',tr(lang,'来源证据','Evidence')],['actions',tr(lang,'行动计划','Action Plan')]] as const)
    : ([['insight',tr(lang,'线索全貌','Lead Overview')],['contacts',tr(lang,'联系人','Contacts')],['evidence',tr(lang,'公开来源','Public Sources')],['actions',tr(lang,'伙伴动作','Partner Actions')]] as const);
  return (
    <section className="detail-panel">
      <div className="detail-head">
        <div>
          <div className="eyebrow"><span className={`priority-pill ${priorityClass[item.priority]}`}>{item.priority}</span>{item.id} · {item.source}</div>
          <h2>{lang === "zh" ? item.title : item.titleEn}</h2>
          <p className="en-title">{lang === "zh" ? item.titleEn : item.title}</p>
          <div className="tag-row"><span>{localTerm(lang,item.country)} · {item.city}</span><span>{localTerm(lang,item.industry)}</span><span>{localTerm(lang,item.stage)}</span><span>{tr(lang,"更新","Updated")} {item.updated}</span></div>
        </div>
        {canInternal ? <ScoreRing value={item.score} size="large" /> : <span className="partner-safe-badge">{tr(lang,"伙伴安全版","Partner-safe")}</span>}
      </div>

      {canInternal ? <div className="hard-gates">
        {item.gate.map((gate) => <div key={gate.label}><span className={`gate-dot ${gate.state}`}></span><small>{localTerm(lang,gate.label)}</small><strong>{localTerm(lang,gate.state)}</strong></div>)}
      </div> : <div className="partner-access-notice"><strong>{tr(lang,"伙伴受限视图","Partner restricted view")}</strong><span>{tr(lang,"已隐藏内部评分、赢单判断、竞争态势、机会Owner、其他伙伴与金种子审批信息；如需更多背景，请通过伙伴经理申请。","Internal score, win assessment, competition, opportunity owner, other partners and golden-seed approval information are hidden. Request more context through the partner manager.")}</span></div>}

      <div className="detail-tabs" role="tablist">
        {availableTabs.map(([id,label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>{label}{id === "evidence" && <span>{item.evidence.length}</span>}{id === "contacts" && item.contacts?.length ? <span>{item.contacts.length}</span> : null}</button>
        ))}
      </div>

      {tab === "insight" && <div className="tab-content insight-view">
        <div className="ai-summary">
          <div className="ai-mark">AI</div>
          <div><div className="section-label">{canInternal ? tr(lang,"机会判断","Opportunity assessment") : tr(lang,"公开线索摘要","Public lead summary")} {canInternal ? <span>{tr(lang,"置信度","Confidence")} {Math.round(item.confidence * 100)}%</span> : <span>{tr(lang,"伙伴安全版","Partner-safe")}</span>}</div><p>{canInternal ? opportunityInsight(item, lang) : partnerSafeOpportunityInsight(item, lang)}</p></div>
        </div>
        <div className="metric-grid">
          <div><small>{tr(lang,"项目总额","Project value")}</small><strong>{exportText(lang,item.value)}</strong></div>
          {canInternal ? <div><small>{tr(lang,"华为可服务空间","Huawei addressable")}</small><strong>{exportText(lang,item.addressable)}</strong></div> : null}
          {canInternal ? <div><small>{tr(lang,"参与空间","Participation space")}</small><strong>{localTerm(lang,item.participation)}</strong></div> : null}
          {canInternal ? <div><small>{tr(lang,"赢单判断","Win assessment")}</small><strong>{localTerm(lang,item.win)}</strong></div> : null}
          <div><small>{tr(lang,"资金状态","Funding status")}</small><strong className="smaller">{exportText(lang,item.funding)}</strong></div>
          <div><small>{tr(lang,"关键节点","Key milestone")}</small><strong className={item.daysLeft !== null && item.daysLeft <= 14 ? "danger-text" : ""}>{exportText(lang,item.deadline)}</strong></div>
          <div><small>{tr(lang,"联系人状态","Contact status")}</small><strong className="smaller">{contact.label}</strong><em>{contact.note}</em></div>
        </div>
        <div className="two-column">
          <div className="subsection">
            <div className="section-label">{tr(lang,"方案组合","Solution portfolio")} <span>{item.solutions.length} {tr(lang,"个工作包","work packages")}</span></div>
            <div className="solution-list">{item.solutions.map((solution) => <div key={solution.name}><span className="solution-icon">{solution.domain.slice(0,1)}</span><span><strong>{exportText(lang,solution.name)}</strong><small>{exportText(lang,solution.domain)}</small></span><span className="fit">{solution.fit}%</span></div>)}</div>
          </div>
          {canInternal ? <div className="subsection">
            <div className="section-label">{tr(lang,"竞争态势","Competition")} <span>{tr(lang,"证据约束","Evidence-bound")}</span></div>
            <div className="competitor-list">{item.competitors.map((competitor) => <div key={competitor.name}><span className="type-chip">{localTerm(lang,competitor.type)}</span><strong>{competitor.name}</strong><small>{exportText(lang,competitor.note)}</small></div>)}</div>
          </div> : <div className="subsection partner-safe-panel"><div className="section-label">{tr(lang,"伙伴可协同事项","Partner collaboration")}</div><p>{tr(lang,"请围绕客户入口、投标资格、本地交付、售后服务和需要华为澄清的技术问题进行反馈。","Please provide feedback on customer access, bid qualification, local delivery, service capability and technical clarifications needed from Huawei.")}</p></div>}
        </div>
      </div>}

      {canInternal && tab === "score" && <div className="tab-content score-view">
        <div className="score-explainer"><ScoreRing value={item.score} size="large"/><div><h3>{item.priority} · {item.priority === "P0" ? tr(lang,"重点经营","Key engagement") : item.priority === "P1" ? tr(lang,"优先培育","Priority nurture") : tr(lang,"选择性跟踪","Selective watch")}</h3><p>{tr(lang,`基础维度合计 ${item.score + item.risk} 分，风险扣减 ${item.risk} 分。P0 需同时满足四项硬门槛。`,`Base score ${item.score + item.risk}, risk deduction ${item.risk}. P0 opportunities must pass all four hard gates.`)}</p></div></div>
        <div className="score-bars">{item.scoreParts.map(part => <div key={part.label}><span>{localTerm(lang,part.label)}</span><div><i style={{width:`${part.value / part.total * 100}%`}}></i></div><strong>{part.value}/{part.total}</strong></div>)}</div>
      </div>}

      {tab === "contacts" && <div className="tab-content contact-view">
        {item.contacts?.length ? <>
          <div className="contact-note"><strong>{tr(lang,"MEED角色链 + 官方联系人","MEED role chain + official contacts")}</strong><span>{tr(lang,"优先展示 MEED 角色链，其次展示官方招投标/业主采购页面的机构级邮箱或电话；导入内部系统前仍建议人工核验。","MEED role-chain contacts are prioritized, followed by institution-level email or phone from official tender / owner procurement pages. Verify before internal import.")}</span></div>
          <div className="contact-list">{item.contacts.map((contact,index)=><div className="contact-card" key={`${contact.role}-${contact.company}-${index}`}>
            <span className="contact-role">{contact.role || tr(lang,"角色待核实","Role TBC")}</span>
            <div><strong>{contact.company || tr(lang,"公司待核实","Company TBC")}</strong><small>{contact.source}</small></div>
            <div><small>{tr(lang,"联系人","Contact")}</small><strong>{contact.name || tr(lang,"未披露","Not disclosed")}</strong></div>
            <div><small>{tr(lang,"职位","Title")}</small><strong>{contact.title || "—"}</strong></div>
            <div><small>{tr(lang,"邮箱","Email")}</small><strong>{contact.email || "—"}</strong></div>
            <div><small>{tr(lang,"电话","Phone")}</small><strong>{contact.phone || contact.companyPhone || "—"}</strong>{contact.phone && contact.companyPhone ? <em>{tr(lang,"公司","Company")}: {contact.companyPhone}</em> : null}</div>
          </div>)}</div>
        </> : <div className="empty-contact"><strong>{tr(lang,"暂无已匹配联系人","No matched contacts yet")}</strong><span>{tr(lang,"可通过MEED角色表、官方招标公告、业主采购页或手工维护补齐。","Complete this through MEED roles, official tender notices, owner procurement pages or manual maintenance.")}</span></div>}
      </div>}

      {tab === "evidence" && <div className="tab-content evidence-view">
        <div className="source-card"><span className="source-logo">M+</span><div><strong>{item.source}</strong><small>{tr(lang,"最近校验","Last verified")}：{item.updated} · {tr(lang,"原始记录受许可策略控制","Original record governed by license policy")}</small></div><button>{tr(lang,"查看原始记录","View source")} ↗</button></div>
        {item.evidence.map((evidence, index) => <div className="evidence-item" key={evidence}><span>{String(index + 1).padStart(2,'0')}</span><p>{exportText(lang,evidence)}</p><small>{tr(lang,"已引用","Cited")}</small></div>)}
        <div className="evidence-note">{tr(lang,"AI 只基于已保存证据生成判断。缺失字段会降低置信度，不会被自动补全。","AI conclusions use saved evidence only. Missing fields lower confidence and are never fabricated.")}</div>
      </div>}

      {tab === "actions" && <div className="tab-content action-view">
        {item.actions.map((action, index) => <div className="action-item" key={action.horizon}><button aria-label={tr(lang,"标记完成","Mark done")}>{action.done ? "✓" : index + 1}</button><div><span>{localText(lang, action.horizon, "Timing to be confirmed")}</span><strong>{canInternal ? localText(lang, action.text, "Action to be verified") : tr(lang,"反馈客户入口、投标资格和资源投入","Confirm customer access, bid qualification and resource commitment")}</strong>{canInternal ? <small>{tr(lang,"建议 Owner：","Suggested owner: ")}{localText(lang, action.owner, "owner to be assigned")}</small> : <small>{tr(lang,"通过伙伴经理汇总反馈","Feedback through the Huawei partner manager")}</small>}</div></div>)}
        {canInternal ? <button className="add-action">＋ {tr(lang,"添加跟进动作","Add follow-up")}</button> : null}
      </div>}

      <div className="detail-footer">
        <div className="owner-block"><span className="avatar">{canInternal ? item.ownerInitials : "ZW"}</span><span><small>{canInternal ? tr(lang,"机会 Owner","Opportunity owner") : tr(lang,"华为伙伴经理","Huawei partner manager")}</small><strong>{canInternal ? item.owner : "赵文君"}</strong></span></div>
        {canInternal ? <div className="detail-actions">
          <button className={`secondary ${item.golden ? "selected" : ""}`} onClick={onGolden}>{item.golden ? tr(lang,"★ 已入金种子","★ Golden seed") : tr(lang,"☆ 提交金种子","☆ Submit seed")}</button>
          <button className="secondary" onClick={onDispatch}>⇄ {tr(lang,"分发确认","Dispatch confirmation")}</button>
          <button className="primary quick-main" onClick={onShare}>↗ {tr(lang,"一键推送伙伴","1-click partner push")}</button>
        </div> : <div className="detail-actions"><button className="primary quick-main" onClick={() => window.location.href = "mailto:zhaowenjun@huawei.com"}>{tr(lang,"联系伙伴经理","Contact partner manager")}</button></div>}
      </div>
    </section>
  );
}

function CommandView({ lang, items, openOpportunity, quickPush, openCountry }: { lang: Lang; items: Opportunity[]; openOpportunity: (item: Opportunity) => void; quickPush: (item: Opportunity) => void; openCountry: (country: Country) => void }) {
  const focus = items[0];
  const countryCounts = { 伊拉克: items.filter(item=>item.country==='伊拉克').length, 约旦: items.filter(item=>item.country==='约旦').length, 黎巴嫩: items.filter(item=>item.country==='黎巴嫩').length };
  const maxCountryCount = Math.max(...Object.values(countryCounts),1);
  const sectorRows = [
    { zh: "政府 / 数字政府", en: "Government / Digital Government", zhSolutions: "云 · 存储 · 数据通信", enSolutions: "Cloud · Storage · Datacom", heat: 88, count: 5 },
    { zh: "油气 / 石化", en: "Oil & Gas / Petrochemicals", zhSolutions: "无线 · 数通 · 边缘计算", enSolutions: "Wireless · Datacom · Edge Computing", heat: 79, count: 4 },
    { zh: "交通", en: "Transport", zhSolutions: "数据通信 · 云 · 存储", enSolutions: "Datacom · Cloud · Storage", heat: 84, count: 3 },
    { zh: "电力 / 新能源", en: "Power / New Energy", zhSolutions: "数通 · 运维 · 数字能源", enSolutions: "Datacom · O&M · Digital Energy", heat: 61, count: 3 },
    { zh: "医疗 / 金融", en: "Healthcare / Finance", zhSolutions: "全光 · 存储 · 协作", enSolutions: "All-optical · Storage · Collaboration", heat: 73, count: 3 },
  ];
  return <>
    <section className="command-hero">
      <div className="hero-copy"><span className="live-dot">{tr(lang,"MTL作战底座已上线","MTL WAR-ROOM ONLINE")}</span><h1>{tr(lang,"先看值得赢的，","Focus on what is winnable.")}<br/><em>{tr(lang,"再决定怎么打。","Then decide how to engage.")}</em></h1><p>{tr(lang,`已审计 ${meedAudit.validCountryRecords.toLocaleString()} 条三国记录；${meedAudit.activeOrWatch.toLocaleString()} 条进入活跃/观察池，${meedAudit.preAward} 条处于招标前窗口。机会、纪要、物料和活动统一进入伙伴营销作战闭环。`,`Audited ${meedAudit.validCountryRecords.toLocaleString()} three-country records; ${meedAudit.activeOrWatch.toLocaleString()} entered the active/watch pool and ${meedAudit.preAward} are in pre-award stages. Opportunities, minutes, materials and events now run through one partner marketing loop.`)}</p><div className="hero-buttons"><button onClick={() => openOpportunity(focus)}>{tr(lang,"查看机会工作台","Open opportunity workspace")} <span>↗</span></button><button className="hero-push" onClick={() => quickPush(focus)}>↗ {tr(lang,"一键推送","1-click push")}</button></div></div>
      <div className="hero-spotlight">
        <div className="spotlight-top"><span>{tr(lang,"今日首要机会","TODAY'S TOP OPPORTUNITY")}</span><span className="signal">{tr(lang,"强信号","Strong signal")}</span></div>
        <h3>{lang === "zh" ? focus.title : focus.titleEn}</h3><p>{opportunityInsight(focus, lang)}</p>
        <div className="spotlight-bottom"><ScoreRing value={focus.score}/><div><small>{tr(lang,"可服务空间","Addressable")}</small><strong>{focus.addressable}</strong></div><div><small>{tr(lang,"最佳动作","Best action")}</small><strong>{tr(lang,"顾问架构交流","Consultant workshop")}</strong></div></div>
      </div>
      <div className="hero-pattern"><i></i><i></i><i></i></div>
    </section>

    <section className="stats-strip">
      <div><span className="stat-icon cyan">↑</span><p><small>{tr(lang,"三国有效记录","Valid 3-country records")}</small><strong>{meedAudit.validCountryRecords.toLocaleString()}</strong><em>{tr(lang,"已完成去重","Deduplicated")}</em></p></div>
      <div><span className="stat-icon coral">◆</span><p><small>{tr(lang,"优先人工复核","Priority human review")}</small><strong>{meedAudit.candidates.length}</strong><em>{tr(lang,"非正式 P0","Not formal P0")}</em></p></div>
      <div><span className="stat-icon violet">◫</span><p><small>{tr(lang,"招标前窗口","Pre-award window")}</small><strong>{meedAudit.preAward}</strong><em>{tr(lang,"需补充截标日","Bid dates needed")}</em></p></div>
      <div><span className="stat-icon green">⇄</span><p><small>{tr(lang,"授标 / 在建","Awarded / construction")}</small><strong>{meedAudit.awardedOrConstruction}</strong><em>{tr(lang,"筛查扩容包","Check expansion packages")}</em></p></div>
    </section>

    <div className="dashboard-grid">
      <section className="panel focus-list">
        <div className="panel-head"><div><span className="section-kicker">FOCUS NOW</span><h2>{tr(lang,"重点机会","Priority opportunities")}</h2></div><button onClick={() => openOpportunity(focus)}>{tr(lang,"查看全部","View all")} →</button></div>
        {items.slice(0,4).map((item, index) => <button className="focus-item" key={item.id} onClick={() => openOpportunity(item)}>
          <span className="rank">0{index + 1}</span><span className="focus-name"><strong>{lang === "zh" ? item.title : item.titleEn}</strong><small>{localTerm(lang,item.country)} · {localTerm(lang,item.industry)} · {localTerm(lang,item.stage)}</small></span><span className="focus-space"><small>{tr(lang,"空间","Space")}</small><strong>{exportText(lang,item.addressable)}</strong></span><span className={`focus-priority ${priorityClass[item.priority]}`}>{item.priority}<small>{item.score}{tr(lang,"分"," pts")}</small></span><span className="arrow">›</span>
        </button>)}
      </section>
      <section className="panel market-map">
        <div className="panel-head"><div><span className="section-kicker">LEVANT OPPORTUNITY MAP</span><h2>{tr(lang,"区域机会分布","Regional distribution")}</h2></div><span className="sample-label">{tr(lang,"更新至 8月17日","Updated 17 Aug")}</span></div>
        <div className="map-canvas">
          <div className="map-lines"></div>
          <button className="country-node iraq" onClick={()=>openCountry('伊拉克')}><i>{countryCounts.伊拉克}</i><span><strong>{localTerm(lang,'伊拉克')}</strong><small>{countryCounts.伊拉克} {tr(lang,"个经营机会","opportunities")}</small></span></button>
          <button className="country-node jordan" onClick={()=>openCountry('约旦')}><i>{countryCounts.约旦}</i><span><strong>{localTerm(lang,'约旦')}</strong><small>{countryCounts.约旦} {tr(lang,"个经营机会","opportunities")}</small></span></button>
          <button className="country-node lebanon" onClick={()=>openCountry('黎巴嫩')}><i>{countryCounts.黎巴嫩}</i><span><strong>{localTerm(lang,'黎巴嫩')}</strong><small>{countryCounts.黎巴嫩} {tr(lang,"个经营机会","opportunities")}</small></span></button>
          <span className="map-label gulf">GULF</span><span className="map-label levant">LEVANT</span>
        </div>
        <div className="country-bars"><div><span>{localTerm(lang,'伊拉克')}</span><i><b style={{width:`${countryCounts.伊拉克/maxCountryCount*100}%`}}></b></i><strong>{countryCounts.伊拉克}</strong></div><div><span>{localTerm(lang,'约旦')}</span><i><b style={{width:`${countryCounts.约旦/maxCountryCount*100}%`}}></b></i><strong>{countryCounts.约旦}</strong></div><div><span>{localTerm(lang,'黎巴嫩')}</span><i><b style={{width:`${countryCounts.黎巴嫩/maxCountryCount*100}%`}}></b></i><strong>{countryCounts.黎巴嫩}</strong></div></div>
      </section>
    </div>
    <div className="dashboard-grid lower">
      <section className="panel sector-panel"><div className="panel-head"><div><span className="section-kicker">SOLUTION FIT</span><h2>{tr(lang,"行业 × 方案热度","Industry × solution heat")}</h2></div></div><div className="sector-list">
        {sectorRows.map(row => <div key={row.zh}><span><strong>{lang === "zh" ? row.zh : row.en}</strong><small>{lang === "zh" ? row.zhSolutions : row.enSolutions}</small></span><i><b style={{width:`${row.heat}%`}}></b></i><em>{row.count} {tr(lang,"项","items")}</em></div>)}
      </div></section>
      <section className="panel activity-panel"><div className="panel-head"><div><span className="section-kicker">LIVE FEED</span><h2>{tr(lang,"协同动态","Collaboration feed")}</h2></div><button>{tr(lang,"全部记录","All records")} →</button></div><div className="activity-list">{activity.map(item => <div key={item.action}><i className={item.tone}></i><p><strong>{item.actor}</strong><span>{localText(lang, item.action, "Activity update")}</span><small>{localText(lang, item.time, "just now")}</small></p></div>)}</div></section>
    </div>
  </>;
}

function UpdatesView({ lang }: { lang: Lang }) {
  const latest = releaseUpdateLog[0];
  const statusLabel = (status: "published" | "review" | "planned") =>
    status === "published" ? tr(lang, "已发布", "Published") : status === "review" ? tr(lang, "复核中", "In review") : tr(lang, "计划中", "Planned");
  return <div className="workspace-view updates-view">
    <div className="view-intro">
      <div>
        <span className="section-kicker">RELEASE NOTES</span>
        <h1>{tr(lang, "每期更新纪要", "Issue-by-issue release notes")}</h1>
        <p>{tr(lang, "沉淀每一期数据增量、重点机会、功能变化和下一步动作，方便经营复盘与汇报。", "Tracks each issue's data delta, key opportunities, product changes and next actions for review and reporting.")}</p>
      </div>
      <div className="release-hero-badge">
        <small>{tr(lang, "最新一期", "Latest issue")}</small>
        <strong>{tr(lang, latest.period, latest.periodEn)}</strong>
      </div>
    </div>

    <section className="panel release-overview-card">
      <div className="panel-head">
        <div>
          <span className="section-kicker">{latest.id} · {latest.publishedAt}</span>
          <h2>{tr(lang, latest.title, latest.titleEn)}</h2>
          <span>{tr(lang, latest.dataSource, latest.dataSourceEn)}</span>
        </div>
        <em className={`status ${latest.status === "published" ? "active" : "review"}`}>{statusLabel(latest.status)}</em>
      </div>
      <div className="release-stat-grid">
        {latest.stats.map(stat => <div key={stat.label}>
          <strong>{stat.value}</strong>
          <span>{tr(lang, stat.label, stat.labelEn)}</span>
          <small>{tr(lang, stat.note, stat.noteEn)}</small>
        </div>)}
      </div>
      <div className="release-highlight-grid">
        {(lang === "zh" ? latest.highlights : latest.highlightsEn).map((highlight, index) => <p key={highlight}><b>0{index + 1}</b>{highlight}</p>)}
      </div>
    </section>

    <div className="release-timeline">
      {releaseUpdateLog.map((issue, index) => <article className="release-card" key={issue.id}>
        <div className="release-index"><span>{String(index + 1).padStart(2, "0")}</span><i></i></div>
        <div className="release-body">
          <header>
            <div>
              <span className="section-kicker">{issue.id} · {tr(lang, issue.period, issue.periodEn)}</span>
              <h2>{tr(lang, issue.title, issue.titleEn)}</h2>
              <small>{tr(lang, "数据源：", "Data source: ")}{tr(lang, issue.dataSource, issue.dataSourceEn)}</small>
            </div>
            <em className={`status ${issue.status === "published" ? "active" : "review"}`}>{statusLabel(issue.status)}</em>
          </header>
          <div className="release-mini-stats">
            {issue.stats.map(stat => <div key={stat.label}><strong>{stat.value}</strong><span>{tr(lang, stat.label, stat.labelEn)}</span></div>)}
          </div>
          <div className="release-sections">
            <section>
              <h3>{tr(lang, "本期更新内容", "What changed")}</h3>
              {(lang === "zh" ? issue.highlights : issue.highlightsEn).map(text => <p key={text}>✓ {text}</p>)}
            </section>
            <section>
              <h3>{tr(lang, "平台功能变化", "Platform updates")}</h3>
              {(lang === "zh" ? issue.platformUpdates : issue.platformUpdatesEn).map(text => <p key={text}>• {text}</p>)}
            </section>
          </div>
          <div className="release-opportunity-table">
            <div className="release-opportunity-head"><span>{tr(lang, "重点机会", "Key opportunity")}</span><span>{tr(lang, "金额", "Value")}</span><span>{tr(lang, "优先级", "Priority")}</span><span>{tr(lang, "动作建议", "Recommended action")}</span></div>
            {issue.keyOpportunities.map(opportunity => <div className="release-opportunity-row" key={opportunity.id}>
              <span><strong>{lang === "zh" ? opportunity.title : opportunity.titleEn}</strong><small>{opportunity.id}</small></span>
              <span>{opportunity.value}</span>
              <span><em className={priorityClass[opportunity.priority]}>{opportunity.priority}</em></span>
              <span>{tr(lang, opportunity.action, opportunity.actionEn)}</span>
            </div>)}
          </div>
          <div className="release-next-actions">
            <strong>{tr(lang, "下一步计划", "Next actions")}</strong>
            {(lang === "zh" ? issue.nextActions : issue.nextActionsEn).map(action => <span key={action}>{action}</span>)}
          </div>
        </div>
      </article>)}
    </div>
  </div>;
}

function partnerOpportunityScore(partner: PartnerDirectoryEntry, item: Opportunity) {
  const countryScore = partner.country === item.country ? 32 : 8;
  const tierScore = partner.tier === "核心" ? 18 : partner.tier === "优选" ? 14 : 10;
  const priorityScore = item.priority === "P0" ? 22 : item.priority === "P1" ? 18 : item.priority === "P2" ? 10 : 4;
  const partnerHistory = item.partner === partner.name ? 16 : item.partner ? 5 : 10;
  const fitScore = Math.round(item.solutions.reduce((sum, solution) => sum + solution.fit, 0) / Math.max(1, item.solutions.length) / 5);
  return Math.min(100, countryScore + tierScore + priorityScore + partnerHistory + fitScore);
}

function productLineAnalysis(item: Opportunity) {
  return item.solutions.slice(0, 3).map(solution => `${solution.domain}：${solution.name}(${solution.fit}%)`).join("；");
}

function operationStrategy(partner: PartnerDirectoryEntry, item: Opportunity) {
  const route = item.country === partner.country ? "本地伙伴先触达业主/顾问，华为同步拉通产品线" : "由伙伴经理判断是否跨国协同，优先补本地交付资源";
  const work = item.priority === "P0" ? "P0打法：7天内确认客户入口、预算、技术边界和竞争名单，30天内形成联合方案与投标Go/No-Go。" : "培育打法：先拿TOR/BOQ或公开招标文件，拆ICT工作包，再决定是否伙伴互锁。";
  return `${route}；${work}`;
}

function managerPartnerRecommendations(items: Opportunity[]) {
  return partnerDirectory.map(partner => {
    const recommendations = items
      .map(item => ({ item, score: partnerOpportunityScore(partner, item) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ item, score }) => ({
        item,
        score,
        reason: `${partner.country === item.country ? "国家匹配" : "跨国可协同"} · ${partner.tier}伙伴 · ${item.priority}/${item.score}分 · ${item.participation}参与空间`,
        productLines: productLineAnalysis(item),
        strategy: operationStrategy(partner, item),
      }));
    return { partner, recommendations };
  });
}

function PartnersView({ lang, items, onToast, onPush }: { lang: Lang; items: Opportunity[]; onToast: (message: string) => void; onPush: (items: Opportunity[]) => void }) {
  const locked = items.filter(item => item.partner);
  const recommendations = managerPartnerRecommendations(items);
  return <div className="workspace-view"><div className="view-intro"><div><span className="section-kicker">PARTNER COLLABORATION</span><h1>{tr(lang,"伙伴协同","Partner Collaboration")}</h1><p>{tr(lang,"非独家互锁 · 默认有效期 6 个月 · 过程可追踪","Non-exclusive lock · 6-month validity · traceable progress")}</p></div><button className="primary" onClick={() => onToast(tr(lang,"已创建伙伴邀请草稿","Partner invitation draft created"))}>＋ {tr(lang,"发起伙伴协同","Start partner collaboration")}</button></div>
    <div className="workflow-banner"><div><strong>2</strong><span>等待伙伴响应</span></div><i></i><div><strong>7</strong><span>互锁培育中</span></div><i></i><div><strong>1</strong><span>60天无进展复核</span></div><i></i><div><strong>3</strong><span>90天内到期</span></div></div>
    <section className="panel recommendation-panel"><div className="panel-head"><div><span className="section-kicker">PARTNER MANAGER RECOMMENDER</span><h2>{tr(lang,"伙伴经理机会推荐","Partner-manager opportunity recommendations")}</h2><span>{tr(lang,"按伙伴国家、等级、互锁历史、机会优先级和产品线契合度自动推荐。","Recommended by partner country, tier, lock history, opportunity priority and product-line fit.")}</span></div><em className="status active">{recommendations.length} {tr(lang,"家伙伴","partners")}</em></div>
      <div className="recommendation-grid">{recommendations.map(group => <article className="partner-recommend-card" key={group.partner.id}><div className="recommend-head"><span className="avatar">{group.partner.managerInitials}</span><div><strong>{group.partner.manager}</strong><small>{group.partner.managerEmail}</small></div><em>{localTerm(lang,group.partner.country)} · {localTerm(lang,group.partner.tier)}</em></div><h3>{group.partner.name}</h3>
        <div className="recommend-list">{group.recommendations.map(rec => <div className="recommend-item" key={rec.item.id}><div><span className={`priority-pill ${priorityClass[rec.item.priority]}`}>{rec.item.priority}</span><strong>{lang==="zh"?rec.item.title:rec.item.titleEn}</strong><small>{rec.reason}</small></div><div className="recommend-score"><b>{rec.score}</b><span>{tr(lang,"推荐分","fit")}</span></div><p><b>{tr(lang,"产品线选项：","Product lines:")}</b>{rec.productLines}</p><p><b>{tr(lang,"项目打法：","Engagement play:")}</b>{rec.strategy}</p><div className="recommend-actions"><button onClick={()=>onPush([rec.item])}>↗ {tr(lang,"推送伙伴","Push")}</button><button onClick={()=>onToast(tr(lang,`已为${group.partner.name}生成${rec.item.id}跟进任务`,`Follow-up task created for ${group.partner.name} / ${rec.item.id}`))}>⇄ {tr(lang,"生成跟进","Create follow-up")}</button></div></div>)}</div>
      </article>)}</div>
    </section>
    <section className="panel table-panel"><div className="panel-head"><div><h2>伙伴互锁台账</h2><span>每30天需更新一次有效进展</span></div><div className="table-tools"><button>筛选</button><button>导出</button></div></div>
      <div className="partner-table"><div className="table-header"><span>机会 / 工作包</span><span>伙伴</span><span>华为 Owner</span><span>最近进展</span><span>有效期</span><span>状态</span></div>{locked.map((item,index) => <div className="table-row" key={item.id}><span><strong>{item.title}</strong><small>{item.id} · {item.solutions[0].domain}</small></span><span><strong>{item.partner}</strong><small>{item.country}</small></span><span><span className="person"><i>{item.ownerInitials}</i>{item.owner}</span></span><span><strong>{index === 0 ? '8月12日' : index === 1 ? '8月5日' : '7月28日'}</strong><small>{index === 2 ? '16天后提醒' : '进展正常'}</small></span><span><strong>{item.lockUntil}</strong><small>非独家</small></span><span><em className={index === 2 ? 'status review' : 'status active'}>{index === 2 ? '待复核' : '培育中'}</em></span></div>)}</div>
    </section>
  </div>;
}

function MtlContentView({ lang, assets, opportunities, onCreate, onToast, onOpenPush }: {
  lang: Lang;
  assets: MarketingContent[];
  opportunities: Opportunity[];
  onCreate: (assets: MarketingContent[]) => void;
  onToast: (message: string) => void;
  onOpenPush: () => void;
}) {
  const [type, setType] = useState<MarketingContentType | "all">("all");
  const [importOpen, setImportOpen] = useState(false);
  const highPriorityCount = opportunities.filter(item => item.priority === "P0" || item.priority === "P1").length;
  const filteredAssets = assets.filter(asset => type === "all" || asset.type === type);
  const typeCounts = Object.keys(mtlContentTypeLabel).map(key => {
    const typedKey = key as MarketingContentType;
    return { type: typedKey, count: assets.filter(asset => asset.type === typedKey).length };
  });
  const flowChecks = [
    { step: tr(lang, "管理者导入上传", "Manager import / upload"), result: tr(lang, "机会、纪要、物料、活动均可进入内容库", "Opportunities, minutes, materials and events can enter the library") },
    { step: tr(lang, "标签与受众识别", "Tag and audience routing"), result: tr(lang, "按国家、行业、伙伴/内部版本自动分层", "Routed by country, industry and partner/internal version") },
    { step: tr(lang, "脱敏与审批", "Redaction and approval"), result: tr(lang, "伙伴版隐藏评分、竞争策略、Owner和可服务空间", "Partner view hides score, strategy, owner and addressable scope") },
    { step: tr(lang, "批量推送与回执", "Bulk push and acknowledgement"), result: tr(lang, "邮件/SMS推送后进入SLA跟踪和伙伴确认页", "Email/SMS pushes enter SLA tracking and partner acknowledgement") },
    { step: tr(lang, "沉淀复盘", "Closed-loop review"), result: tr(lang, "推送账号、时间、内容、伙伴响应均留痕", "Sender, time, content and partner response are audited") },
  ];
  return <div className="workspace-view mtl-view">
    <div className="view-intro"><div><span className="section-kicker">MTL MARKETING WAR-ROOM</span><h1>{tr(lang,"MTL内容库与营销作战","MTL Library & Marketing Operations")}</h1><p>{tr(lang,"不仅管理机会点，也管理营销活动纪要、营销物料和圈子活动，支撑伙伴分层触达与闭环追踪。","Manages not only opportunities, but also meeting minutes, marketing materials and circle events for partner targeting and closed-loop tracking.")}</p></div><div className="import-actions"><button onClick={onOpenPush}>↗ {tr(lang,"推送高优先级机会","Push high-priority opportunities")}</button><button className="primary" onClick={()=>setImportOpen(true)}>＋ {tr(lang,"导入/上传MTL信息","Import / upload MTL content")}</button></div></div>
    <section className="stats-strip mtl-stats">
      <div><span className="stat-icon cyan">▣</span><p><small>{tr(lang,"MTL内容资产","MTL content assets")}</small><strong>{assets.length}</strong><em>{tr(lang,"已进入内容库","in library")}</em></p></div>
      <div><span className="stat-icon coral">◆</span><p><small>{tr(lang,"P0/P1重点机会","P0/P1 priorities")}</small><strong>{highPriorityCount}</strong><em>{tr(lang,"可绑定营销动作","actionable")}</em></p></div>
      <div><span className="stat-icon violet">✓</span><p><small>{tr(lang,"可推送资产","Ready assets")}</small><strong>{assets.filter(asset=>asset.status==="ready").length}</strong><em>{tr(lang,"已脱敏/审核","reviewed")}</em></p></div>
      <div><span className="stat-icon green">⇄</span><p><small>{tr(lang,"伙伴触达流程","Partner flow")}</small><strong>5</strong><em>{tr(lang,"流程已模拟","simulated")}</em></p></div>
    </section>
    <div className="mtl-grid">
      <section className="panel mtl-library-panel">
        <div className="panel-head"><div><span className="section-kicker">CONTENT LIBRARY</span><h2>{tr(lang,"统一营销内容池","Unified marketing content pool")}</h2><span>{tr(lang,"管理者可导入机会线索、活动纪要、营销物料和圈子活动，后续可接ePlus/Google表。","Managers can import opportunity leads, minutes, materials and circle events; later connect to ePlus / Google Sheets.")}</span></div><em className="status active">{filteredAssets.length} {tr(lang,"条","items")}</em></div>
        <div className="mtl-type-tabs"><button className={type==="all"?"active":""} onClick={()=>setType("all")}>{tr(lang,"全部","All")} <span>{assets.length}</span></button>{typeCounts.map(row=><button className={type===row.type?"active":""} key={row.type} onClick={()=>setType(row.type)}>{tr(lang,mtlContentTypeLabel[row.type].zh,mtlContentTypeLabel[row.type].en)} <span>{row.count}</span></button>)}</div>
        <div className="mtl-card-list">{filteredAssets.map(asset=><article className="mtl-card" key={asset.id}>
          <header><span>{asset.id}</span><em className={`status ${mtlStatusClass[asset.status]}`}>{mtlStatusLabel(lang, asset.status)}</em></header>
          <h3>{lang==="zh"?asset.title:asset.titleEn}</h3>
          <p>{lang === "zh" ? asset.summary : asset.summaryEn}</p>
          <div className="mtl-meta"><span>{tr(lang,mtlContentTypeLabel[asset.type].zh,mtlContentTypeLabel[asset.type].en)}</span><span>{asset.country === "三国" ? tr(lang,"三国","Three countries") : localTerm(lang, asset.country)}</span><span>{mtlIndustryLabel(lang, asset.industry)}</span><span>{mtlAudienceLabel(lang, asset.audience)}</span></div>
          <div className="mtl-solutions">{asset.relatedSolutions.map(solution=><small key={solution}>{solution}</small>)}</div>
          <footer><span><b>{tr(lang,"Owner","Owner")}</b>{asset.owner}</span><span><b>{tr(lang,"推荐动作","Recommended action")}</b>{lang === "zh" ? asset.recommendedAction : asset.recommendedActionEn}</span></footer>
          <div className="mtl-actions"><button onClick={()=>onToast(tr(lang,"已生成伙伴安全版预览","Partner-safe preview generated"))}>{tr(lang,"生成伙伴版","Create partner version")}</button><button onClick={onOpenPush}>↗ {tr(lang,"绑定推送","Bind push")}</button></div>
        </article>)}</div>
      </section>
      <section className="panel mtl-flow-panel">
        <div className="panel-head"><div><span className="section-kicker">PROCESS SIMULATION</span><h2>{tr(lang,"流程模拟与优化结果","Process simulation & optimization")}</h2><span>{tr(lang,"已按管理员导入、分层脱敏、伙伴推送、确认回执和SLA复盘模拟主流程。","Main flows simulated: manager import, redaction, partner push, acknowledgement and SLA review.")}</span></div><em className="status active">{tr(lang,"通过","Passed")}</em></div>
        <div className="mtl-flow-list">{flowChecks.map((row,index)=><div className="mtl-flow-row" key={row.step}><span>{String(index+1).padStart(2,"0")}</span><div><strong>{row.step}</strong><small>{row.result}</small></div><em>✓</em></div>)}</div>
        <div className="audit-warning"><strong>{tr(lang,"本轮优化：","Optimization:")}</strong>{tr(lang,"平台定位已升级为MTL营销作战平台；内容对象从单一机会点扩展为机会、纪要、物料、活动，后续所有推送均可统一进入审计与SLA闭环。","The platform is repositioned as an MTL marketing war-room; content expands from opportunities to opportunities, minutes, materials and events, all ready for unified audit and SLA tracking.")}</div>
      </section>
    </div>
    {importOpen && <MtlContentImportModal lang={lang} close={()=>setImportOpen(false)} onCreate={(rows)=>{onCreate(rows); setImportOpen(false); onToast(tr(lang,`已导入 ${rows.length} 条MTL信息`,`Imported ${rows.length} MTL content item(s)`));}}/>}
  </div>;
}

function MtlContentImportModal({ lang, close, onCreate }: { lang: Lang; close: () => void; onCreate: (assets: MarketingContent[]) => void }) {
  const [form, setForm] = useState({ title: "", titleEn: "", type: "marketing_material" as MarketingContentType, country: "伊拉克" as Country | "三国", industry: "Government Sector", audience: "partner" as MarketingContent["audience"], status: "review" as MarketingContent["status"], owner: "MSSD Marketing Team", source: "管理员上传", summary: "" });
  const update = (key: string, value: string) => setForm(current => ({ ...current, [key]: value }));
  const buildAsset = (name?: string): MarketingContent => ({
    id: `MTL-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
    type: form.type,
    title: form.title.trim() || name || "新导入MTL内容",
    titleEn: form.titleEn.trim() || form.title.trim() || name || "New MTL content",
    country: form.country,
    industry: form.industry,
    audience: form.audience,
    status: form.status,
    owner: form.owner,
    source: form.source,
    updated: new Date().toISOString().slice(0,10),
    summary: form.summary || "由管理员导入，待补充摘要、适用行业、目标伙伴和推送策略。",
    summaryEn: form.summary ? "Manager-imported content. English summary needs review before external delivery." : "Manager-imported content pending summary, applicable industry, target partner and push strategy.",
    relatedSolutions: ["CloudEngine", "Huawei Cloud Stack", "OceanStor"],
    recommendedAction: "先完成内容审核和伙伴安全脱敏，再绑定相关机会点进行批量推送。",
    recommendedActionEn: "Complete content review and partner-safe redaction first, then bind related opportunities for batch push.",
  });
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    onCreate([buildAsset()]);
  };
  const uploadFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    onCreate(files.map(file => buildAsset(file.name)));
  };
  return <div className="modal-backdrop" onMouseDown={close}><form className="modal-card mtl-import-modal" onMouseDown={event=>event.stopPropagation()} onSubmit={submit}>
    <div className="modal-head"><div><span className="section-kicker">MTL CONTENT IMPORT</span><h2>{tr(lang,"导入/上传MTL信息","Import / upload MTL content")}</h2></div><button type="button" onClick={close}>×</button></div>
    <div className="manual-form">
      <label className="wide"><span>{tr(lang,"标题","Title")}</span><input value={form.title} onChange={event=>update("title",event.target.value)} placeholder={tr(lang,"如：油气客户拜访纪要","e.g. Oil & gas customer meeting minutes")}/></label>
      <label className="wide"><span>{tr(lang,"英文标题","English title")}</span><input value={form.titleEn} onChange={event=>update("titleEn",event.target.value)}/></label>
      <label><span>{tr(lang,"内容类型","Content type")}</span><select value={form.type} onChange={event=>update("type",event.target.value)}>{Object.entries(mtlContentTypeLabel).map(([key,label])=><option key={key} value={key}>{tr(lang,label.zh,label.en)}</option>)}</select></label>
      <label><span>{tr(lang,"国家","Country")}</span><select value={form.country} onChange={event=>update("country",event.target.value)}><option>伊拉克</option><option>约旦</option><option>黎巴嫩</option><option>三国</option></select></label>
      <label><span>{tr(lang,"行业标签","Industry tag")}</span><input value={form.industry} onChange={event=>update("industry",event.target.value)} list="mtl-industries"/><datalist id="mtl-industries">{industryTagOptions.map(option=><option key={option} value={option}/>)}</datalist></label>
      <label><span>{tr(lang,"推送受众","Audience")}</span><select value={form.audience} onChange={event=>update("audience",event.target.value)}><option value="partner">{tr(lang,"伙伴可见","Partner")}</option><option value="internal">{tr(lang,"仅内部","Internal")}</option><option value="both">{tr(lang,"内外双版","Both")}</option></select></label>
      <label><span>{tr(lang,"状态","Status")}</span><select value={form.status} onChange={event=>update("status",event.target.value)}><option value="review">{tr(lang,"待审核","Review")}</option><option value="draft">{tr(lang,"草稿","Draft")}</option><option value="ready">{tr(lang,"可推送","Ready")}</option></select></label>
      <label><span>Owner</span><input value={form.owner} onChange={event=>update("owner",event.target.value)}/></label>
      <label className="wide"><span>{tr(lang,"来源","Source")}</span><input value={form.source} onChange={event=>update("source",event.target.value)}/></label>
      <label className="wide"><span>{tr(lang,"摘要","Summary")}</span><textarea rows={4} value={form.summary} onChange={event=>update("summary",event.target.value)}/></label>
      <label className="wide file-drop"><span>{tr(lang,"批量上传文件","Batch upload files")}</span><input type="file" multiple onChange={uploadFiles}/><small>{tr(lang,"支持先按文件名创建内容记录，后续版本可解析PPT/PDF/Excel正文并自动打标签。","Creates records from file names first; later versions can parse PPT/PDF/Excel bodies and auto-tag them.")}</small></label>
    </div>
    <div className="modal-actions"><button type="button" onClick={close}>{tr(lang,"取消","Cancel")}</button><button className="primary" type="submit">{tr(lang,"保存到内容库","Save to library")}</button></div>
  </form></div>;
}

function EmailPushView({ lang, items, canInternal, deliveryStatus, pushJobs, onConfigure, onSend }: {
  lang: Lang;
  items: Opportunity[];
  canInternal: boolean;
  deliveryStatus: DeliveryStatus;
  pushJobs: PushJobView[];
  onConfigure: () => void;
  onSend: (audience: "internal" | "partner", recipient: string, items: Opportunity[], partners: Array<Pick<PartnerDirectoryEntry, "id" | "name" | "manager" | "managerEmail">>) => Promise<void>;
}) {
  const rankedItems = [...items].sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority] || b.score - a.score);
  const priorityItems = rankedItems.filter(item => item.priority === "P0" || item.priority === "P1");
  const [audience, setAudience] = useState<"partner" | "internal">("partner");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(items.map(item => item.id)));
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(() => new Set([partnerDirectory[0].id]));
  const [partnerRecipient, setPartnerRecipient] = useState(partnerDirectory[0].email);
  const [internalRecipient, setInternalRecipient] = useState("");
  const [sending, setSending] = useState(false);
  const selectedPartners = partnerDirectory.filter(partner => selectedPartnerIds.has(partner.id));
  const selectedItems = items.filter(item => selectedIds.has(item.id));
  const recipient = audience === "internal" ? internalRecipient : partnerRecipient;
  const hasDemoRecipient = audience === "partner" && selectedPartners.some(partner => partnerRecipient.includes(partner.email));
  useEffect(() => { setSelectedIds(new Set(items.map(item => item.id))); }, [items]);
  const formatTime = (value: string) => value ? new Date(value).toLocaleString(lang === "zh" ? "zh-CN" : "en-US") : tr(lang, "待生成", "TBD");
  const slaText = (job: PushJobView) => job.slaStatus === "met" ? tr(lang, "已确认", "Met") : job.slaStatus === "overdue" ? tr(lang, "已超时", "Overdue") : job.slaStatus === "pending" ? tr(lang, "等待确认", "Pending") : tr(lang, "无需回执", "N/A");
  const receiptLabel = (job: PushJobView) => {
    if (job.status === "failed") return tr(lang, "发送失败", "Failed");
    if (job.acknowledgementStatus === "confirmed" || job.acknowledgedAt) return tr(lang, "已确认回执", "Confirmed");
    if (job.openedAt) return tr(lang, "已打开未确认", "Opened");
    return slaText(job);
  };
  const receiptClass = (job: PushJobView) => job.status === "failed" ? "overdue" : job.acknowledgedAt ? "met" : job.openedAt ? "pending opened" : job.slaStatus;
  const receiptDetail = (job: PushJobView) => {
    if (job.status === "failed") return [job.errorCode, job.providerMessage].filter(Boolean).join(" · ");
    if (job.acknowledgedAt) return `${formatTime(job.acknowledgedAt)}${job.acknowledgedBy ? ` · ${job.acknowledgedBy}` : ""}`;
    if (job.openedAt) return `${formatTime(job.openedAt)} · ${job.openCount || 1} ${tr(lang, "次打开", "open(s)")}`;
    return formatTime(job.slaDueAt);
  };
  const recipientsFor = (ids: Set<string>) => partnerDirectory.filter(partner => ids.has(partner.id)).map(partner => partner.email).join(", ");
  const togglePartner = (partnerId: string) => {
    const next = new Set(selectedPartnerIds);
    if (next.has(partnerId)) next.delete(partnerId); else next.add(partnerId);
    setSelectedPartnerIds(next);
    setPartnerRecipient(recipientsFor(next));
  };
  const toggleOpportunity = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedIds(next);
  };
  const selectAllOpportunities = () => setSelectedIds(new Set(items.map(item => item.id)));
  const selectPriorityOpportunities = () => setSelectedIds(new Set(priorityItems.map(item => item.id)));
  const clearOpportunities = () => setSelectedIds(new Set());
  const sendBlockReason = !deliveryStatus.email
    ? tr(lang, "邮件服务未启用，请先完成 Gmail/Resend 配置。", "Email service is not enabled. Complete Gmail or Resend setup first.")
    : sending
      ? tr(lang, "邮件正在发送中，请稍候。", "Email is sending; please wait.")
      : !selectedItems.length
        ? tr(lang, "请至少选择 1 个机会点。", "Select at least one opportunity.")
        : !recipient.trim()
          ? tr(lang, "请输入接收人邮箱。", "Enter recipient email address.")
          : hasDemoRecipient
            ? tr(lang, "请把演示伙伴邮箱替换为真实邮箱。", "Replace demo partner email addresses with real recipients.")
            : audience === "partner" && !selectedPartners.length
              ? tr(lang, "请至少选择 1 家伙伴。", "Select at least one partner.")
              : audience === "internal" && recipient.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean).some(item => !item.toLowerCase().endsWith("@huawei.com"))
                ? tr(lang, "内部邮件只能发送给 @huawei.com 邮箱；如需发 Gmail，请切换为伙伴邮件。", "Internal email can only be sent to @huawei.com. Switch to partner email for Gmail testing.")
                : "";
  const sendDisabled = Boolean(sendBlockReason);
  const submit = async () => {
    if (sendBlockReason) return;
    setSending(true);
    try {
      await onSend(audience, recipient, selectedItems, selectedPartners.map(partner => ({ id: partner.id, name: partner.name, manager: partner.manager, managerEmail: partner.managerEmail })));
    } finally {
      setSending(false);
    }
  };
  return <div className="workspace-view email-view"><div className="view-intro"><div><span className="section-kicker">EMAIL PUSH CENTER</span><h1>{tr(lang,"邮件推送中心","Email Push Center")}</h1><p>{tr(lang,"面向伙伴或内部团队发送机会包，自动区分伙伴安全版和内部经营版。","Send opportunity packs to partners or internal teams with partner-safe and internal sales views.")}</p></div><button className="primary" onClick={deliveryStatus.email ? submit : onConfigure} disabled={sendDisabled} title={sendBlockReason}>{deliveryStatus.email ? (sending ? tr(lang,"发送中…","Sending…") : tr(lang,"发送邮件","Send email")) : tr(lang,"配置邮件服务","Configure email")} →</button></div>
    <div className={`delivery-notice ${deliveryStatus.email?'ready':'pending'}`}><strong>{deliveryStatus.email?'✓':'!'}</strong><span>{deliveryStatus.email?tr(lang,`${deliveryStatus.emailProvider==="gmail"?"Gmail API":"Resend"}邮件服务已启用，发送记录会写入审计日志。`,`${deliveryStatus.emailProvider==="gmail"?"Gmail API":"Resend"} email is enabled; sends are audit-logged.`):tr(lang,`邮件服务未启用，缺少Resend或Gmail配置：${(deliveryStatus.emailMissing??[]).join("、") || "邮件凭据"}`,`Email is not enabled. Missing Resend or Gmail setup: ${(deliveryStatus.emailMissing??[]).join(", ") || "email credentials"}`)}</span>{!deliveryStatus.email&&<button onClick={onConfigure}>{tr(lang,"打开配置","Open setup")}</button>}</div>
    {sendBlockReason ? <div className="send-blocker">! {sendBlockReason}</div> : null}
    <div className="email-push-grid">
      <section className="panel email-target-panel"><div className="panel-head"><div><span className="section-kicker">RECIPIENTS</span><h2>{tr(lang,"接收对象","Recipients")}</h2><span>{tr(lang,"伙伴安全版会移除内部评分、竞争策略和其他伙伴信息。","Partner-safe emails remove internal scores, competitive strategy and other partner details.")}</span></div></div>
        <div className="audience-switch embedded"><button className={audience==='partner'?'active':''} onClick={()=>setAudience('partner')}><strong>{tr(lang,"伙伴邮件","Partner email")}</strong><small>{tr(lang,"可多选伙伴并自动带出伙伴经理","Multi-partner with manager matching")}</small></button>{canInternal&&<button className={audience==='internal'?'active internal':''} onClick={()=>setAudience('internal')}><strong>{tr(lang,"内部邮件","Internal email")}</strong><small>{tr(lang,"仅限授权华为邮箱","Authorized Huawei emails only")}</small></button>}</div>
        {audience === "partner" ? <><div className="partner-picker compact">{partnerDirectory.map(partner=><label className={selectedPartnerIds.has(partner.id)?'selected':''} key={partner.id}><input type="checkbox" checked={selectedPartnerIds.has(partner.id)} onChange={()=>togglePartner(partner.id)}/><span className="partner-check">✓</span><span><strong>{partner.name}</strong><small>{partner.manager} · {partner.managerEmail}</small></span></label>)}</div><label>{tr(lang,"伙伴收件人","Partner recipients")}<textarea value={partnerRecipient} onChange={event=>setPartnerRecipient(event.target.value)} placeholder="partner@example.com"/><small>{tr(lang,"演示伙伴邮箱必须替换为真实邮箱后才能发送。","Demo partner emails must be replaced before sending.")}</small></label>{hasDemoRecipient&&<div className="recipient-warning">! {tr(lang,"请替换演示邮箱地址","Replace demo email addresses")}</div>}</> : <label>{tr(lang,"内部收件人","Internal recipients")}<textarea value={internalRecipient} onChange={event=>setInternalRecipient(event.target.value)} placeholder="name@huawei.com, team@huawei.com"/><small>{tr(lang,"内部经营版只能发送给 @huawei.com 授权邮箱。","Internal sales view can only be sent to authorized @huawei.com emails.")}</small></label>}
      </section>
      <section className="panel email-package-panel"><div className="panel-head"><div><span className="section-kicker">OPPORTUNITY PACKAGE</span><h2>{tr(lang,"选择机会包","Select opportunity pack")}</h2><span>{tr(lang,"默认选中全量机会点，也可一键切换为P0/P1重点机会。","All opportunities are selected by default; you can switch to P0/P1 priority opportunities in one click.")}</span></div><em className="status active">{selectedItems.length}/{items.length} {tr(lang,"已选","selected")}</em></div>
        <div className="package-actions"><button onClick={selectAllOpportunities}>✓ {tr(lang,"选择全量机会点","Select all opportunities")}</button><button onClick={selectPriorityOpportunities}>☆ {tr(lang,"仅选P0/P1","P0/P1 only")}</button><button onClick={clearOpportunities}>× {tr(lang,"清空","Clear")}</button></div>
        <div className="email-op-list">{rankedItems.map(item=><label className={selectedIds.has(item.id)?"selected":""} key={item.id}><input type="checkbox" checked={selectedIds.has(item.id)} onChange={()=>toggleOpportunity(item.id)}/><span className={`priority-pill ${priorityClass[item.priority]}`}>{item.priority}</span><div><strong>{lang==="zh"?item.title:item.titleEn}</strong><small>{localTerm(lang,item.country)} · {localTerm(lang,item.industry)} · {audience === "internal" ? tr(lang,"内部评分","Internal score") + ` ${item.score}` : tr(lang,"项目金额","Project value") + ` ${exportText(lang,item.value)}`}</small></div><em>{audience === "internal" ? item.score : "SAFE"}</em></label>)}</div>
        <div className="email-summary"><strong>{audience === "internal" ? tr(lang,"内部经营版字段","Internal sales fields") : tr(lang,"伙伴安全版字段","Partner-safe fields")}</strong><span>{audience === "internal" ? tr(lang,"项目摘要、内部评分、竞争策略、Owner、伙伴信息、关键动作；邮件中不外显华为可服务空间。","Project summary, internal score, competitive strategy, owner, partner info and actions; Huawei addressable scope is redacted from email.") : tr(lang,"项目摘要、公开里程碑、匹配方案、联系人、确认链接和伙伴动作，不含内部评分、可服务空间和竞争策略。","Project summary, public milestones, matched solutions, contacts, confirmation link and partner actions; no internal scores, addressable scope or competitive strategy.")}</span></div>
      </section>
    </div>
    <section className="panel push-history-panel">
      <div className="panel-head"><div><span className="section-kicker">PUSH AUDIT TRAIL</span><h2>{tr(lang,"推送记录与SLA","Push records & SLA")}</h2><span>{tr(lang,"记录推送账号、时间、机会包、接收人、伙伴回执和SLA状态。","Tracks sender, time, opportunity pack, recipient, partner acknowledgement and SLA status.")}</span></div><em className="status active">{pushJobs.length} {tr(lang,"条记录","records")}</em></div>
      <div className="push-history-list">
        {pushJobs.length ? pushJobs.map(job => <article className="push-history-row" key={job.id}>
          <div><strong>{job.actorName}</strong><small>{formatTime(job.createdAt)} · {job.channel.toUpperCase()} · {job.audience === "partner" ? tr(lang,"伙伴","Partner") : tr(lang,"内部","Internal")}</small></div>
          <div><strong>{job.opportunityTitles.slice(0, 2).join(lang === "zh" ? "、" : ", ")}{job.opportunityTitles.length > 2 ? tr(lang,` 等${job.opportunityTitles.length}项`,` and ${job.opportunityTitles.length - 2} more`) : ""}</strong><small>{job.partnerNames.length ? job.partnerNames.join(lang === "zh" ? "、" : ", ") : job.recipient}</small></div>
          <div><strong>{job.recipientCount || job.recipient.split(/[,;\n]+/).filter(Boolean).length}</strong><small>{tr(lang,"接收人","recipients")}</small></div>
          <div><span className={`sla-pill ${receiptClass(job)}`}>{receiptLabel(job)}</span><small>{receiptDetail(job)}</small></div>
        </article>) : <div className="empty-state compact">{tr(lang,"暂无邮件推送记录；发送后会自动出现在这里。","No push records yet; sends will appear here automatically.")}</div>}
      </div>
    </section>
  </div>;
}

function ApprovalsView({ lang, queue, onQueueChange, onRefresh, refreshing, onToast }: { lang: Lang; queue: PendingRegistrationView[]; onQueueChange: (queue: PendingRegistrationView[]) => void; onRefresh: () => void; refreshing: boolean; onToast: (message: string) => void }) {
  const identityLabel = (identityType: string) => identityType === "partner" ? tr(lang,"伙伴","Partner") : identityType === "huawei_cn" ? tr(lang,"华为中方员工","Huawei CN employee") : identityType === "huawei_local" ? tr(lang,"华为本地员工","Huawei local employee") : identityType;
  const decide = async (id: string, approved: boolean) => { const user = queue.find(item => item.id === id); try { await decideRegistration(id,approved?'approved':'needs_info'); onQueueChange(queue.filter(item => item.id !== id)); onToast(approved ? tr(lang,`${user?.name} 的账户申请已批准`,`${user?.name}'s account was approved`) : tr(lang,`${user?.name} 的申请已退回补充`,`${user?.name}'s application was returned`)); } catch { onToast(tr(lang,'操作失败：仅华为管理员可审批','Action failed: Huawei administrator access required')); } };
  return <div className="workspace-view"><div className="view-intro"><div><span className="section-kicker">ACCESS CONTROL</span><h1>{tr(lang,"账户审批","Account Approval")}</h1><p>{tr(lang,"邮箱验证码仅完成身份认证；身份、企业关系和数据范围需由华为管理员确认。","Email OTP verifies identity only; a Huawei administrator must approve role, organization and data scope.")}</p></div><span className="admin-badge">{tr(lang,"管理员操作区","Admin workspace")}</span></div>
    <div className="approval-summary"><div><strong>{queue.length}</strong><span>{tr(lang,"待审批","Pending")}</span></div><div><strong>≤30s</strong><span>{tr(lang,"待办刷新","Queue refresh")}</span></div><div><strong>4</strong><span>{tr(lang,"准入步骤","Access steps")}</span></div><div><strong>100%</strong><span>{tr(lang,"审计留痕","Audit trail")}</span></div></div>
    <section className="panel approval-panel"><div className="panel-head"><div><h2>{tr(lang,"注册审核待办","Registration review queue")}</h2><span>{tr(lang,"核验身份后批准进入，或退回补充资料","Verify the applicant, then approve access or request more information")}</span></div><button onClick={onRefresh} disabled={refreshing}>{refreshing ? tr(lang,"刷新中…","Refreshing…") : tr(lang,"刷新待办","Refresh queue")}</button></div>{queue.length === 0 ? <div className="empty-state">✓ {tr(lang,"当前没有待处理申请","No pending registration requests")}</div> : <div className="approval-list">{queue.map(user => <div className="approval-card" key={user.id}><span className="avatar large">{user.name.split(' ').map(p=>p[0]).join('').slice(0,2)}</span><div className="applicant"><strong>{user.name}</strong><span>{user.organization}</span><small>{user.email} · {new Date(user.createdAt).toLocaleDateString(lang==='zh'?'zh-CN':'en-GB')} {tr(lang,"提交","submitted")}</small></div><div className="application-scope"><small>{tr(lang,"申请身份","Requested role")}</small><strong>{identityLabel(user.identityType)}</strong><span>Iraq</span></div><div className="risk-note"><small>{tr(lang,"核验提示","Verification")}</small><strong>{user.email.endsWith('@huawei.com')?tr(lang,'华为域账号','Huawei domain'):tr(lang,'企业关系待核验','Verify company relationship')}</strong></div><div className="approval-actions"><button onClick={() => decide(user.id,false)}>{tr(lang,"要求补充","Request details")}</button><button className="approve" onClick={() => decide(user.id,true)}>{tr(lang,"批准并授权","Approve access")}</button></div></div>)}</div>}
    </section>
  </div>;
}

function ImportsView({ lang, scanRuns, onScanNow, onManualImport, onTemplateExport }: { lang: Lang; scanRuns: SourceScanRunView[]; onScanNow: () => void; onManualImport: () => void; onTemplateExport: () => void }) {
  return <div className="workspace-view"><div className="view-intro"><div><span className="section-kicker">DATA PIPELINE</span><h1>{tr(lang,"数据与导入","Data & Imports")}</h1><p>{tr(lang,"授权来源、字段映射、去重与证据留痕","Authorized sources, field mapping, deduplication and evidence trail")}</p></div><div className="import-actions"><button onClick={onTemplateExport}>⇩ {tr(lang,"按Response模板导出","Export Response template")}</button><button className="primary" onClick={onManualImport}>＋ {tr(lang,"手工录入机会","Manual opportunity entry")}</button></div></div>
    <div className="connector-grid"><div className="connector featured"><span className="source-logo">M+</span><div><strong>MEED Projects + Levant Map</strong><small>{tr(lang,"需绑定API或定期导出后才能自动解析","API or scheduled export feed is required for automated parsing")}</small></div><em className="pending">{tr(lang,sourceConnectorConfig.meed.status,sourceConnectorConfig.meed.statusEn)}</em></div><div className="connector featured"><span>政</span><div><strong>{tr(lang,"三国政府采购源","Three-country procurement")}</strong><small>ITP · SRC · JONEPS · CDR · PPA</small></div><em>{sourceCoverage.officialTenders.promotedToRadar} {tr(lang,"条已录入","added")}</em></div><div className="connector featured"><span>TG</span><div><strong>Telegram Tender Radar</strong><small>{tr(lang,"公开频道招投标日报 + 可选Bot API","Daily public tender scan + optional Bot API")}</small></div><em>{tr(lang,sourceConnectorConfig.telegramTenderRadar.status,sourceConnectorConfig.telegramTenderRadar.statusEn)}</em></div><div className="connector"><span>＋</span><div><strong>UNGM · World Bank · EBRD</strong><small>{tr(lang,"国际融资和联合国采购监控","IFI and UN procurement monitoring")}</small></div><em>{tr(lang,"已纳入","Included")}</em></div></div>

    <section className="panel meed-binding-card">
      <div className="panel-head"><div><span className="section-kicker">MEED CONNECTOR BINDING</span><h2>{tr(lang,"MEED招投标源绑定","MEED tender source binding")}</h2><span>{tr(lang,"先绑定保存的MEED筛选链接和导出源，后续再升级为正式API同步。","Bind the saved MEED search URL and export feed first; upgrade to formal API sync later.")}</span></div><a href={sourceConnectorConfig.meed.projectSearchUrl} target="_blank" rel="noreferrer">{tr(lang,"打开MEED筛选页","Open MEED saved search")} ↗</a></div>
      <div className="meed-binding-grid">
        <div><small>{tr(lang,"当前状态","Current status")}</small><strong>{tr(lang,sourceConnectorConfig.meed.status,sourceConnectorConfig.meed.statusEn)}</strong><p>{tr(lang,sourceConnectorConfig.meed.note,sourceConnectorConfig.meed.noteEn)}</p></div>
        <div><small>{tr(lang,"生产环境变量","Production env keys")}</small>{sourceConnectorConfig.meed.envKeys.map(key=><code key={key}>{key}</code>)}</div>
        <div><small>{tr(lang,"支持导入文件","Supported MEED exports")}</small>{sourceConnectorConfig.meed.supportedImportFiles.map(file=><code key={file}>{file}</code>)}</div>
        <div><small>{tr(lang,"本次公开源增量","Latest public-source delta")}</small><strong>{sourceConnectorConfig.officialTenderScan.promotedIds.length} {tr(lang,"条已补进雷达","items added to radar")}</strong><p>{tr(lang,`已补录：${sourceConnectorConfig.officialTenderScan.promotedIds.join("、")}`,`Added: ${sourceConnectorConfig.officialTenderScan.promotedIds.join(", ")}`)}</p></div>
      </div>
      <div className="github-collector-card">
        <div><span>GH</span><strong>{tr(lang,"GitHub Actions MEED自动采集器","GitHub Actions MEED collector")}</strong><em className="status active">{tr(lang,sourceConnectorConfig.githubActionsCollector.status,sourceConnectorConfig.githubActionsCollector.statusEn)}</em></div>
        <p>{tr(lang,`工作流：${sourceConnectorConfig.githubActionsCollector.workflow}；脚本：${sourceConnectorConfig.githubActionsCollector.script}；接口：${sourceConnectorConfig.githubActionsCollector.ingestApi}；计划：${sourceConnectorConfig.githubActionsCollector.schedule}。`,`Workflow: ${sourceConnectorConfig.githubActionsCollector.workflow}; script: ${sourceConnectorConfig.githubActionsCollector.script}; API: ${sourceConnectorConfig.githubActionsCollector.ingestApi}; schedule: ${sourceConnectorConfig.githubActionsCollector.scheduleEn}.`)}</p>
        <div className="collector-secret-list">
          <small>{tr(lang,"必须配置","Required secrets")}</small>
          {sourceConnectorConfig.githubActionsCollector.requiredSecrets.map(secret=><code key={secret}>{secret}</code>)}
          <small>{tr(lang,"可选定位器","Optional selectors")}</small>
          {sourceConnectorConfig.githubActionsCollector.optionalSecrets.map(secret=><code key={secret}>{secret}</code>)}
        </div>
        <small>{tr(lang,"输出物：Excel原始文件、结构化payload；如登录被验证码/MFA阻断，会上传失败截图。","Outputs: raw Excel and structured payload; if CAPTCHA/MFA blocks login, a failure screenshot is uploaded.")}</small>
      </div>
      <div className="github-collector-card telegram-collector-card">
        <div><span>TG</span><strong>{tr(lang,"Telegram招投标雷达自动采集器","Telegram Tender Radar collector")}</strong><em className="status active">{tr(lang,sourceConnectorConfig.telegramTenderRadar.status,sourceConnectorConfig.telegramTenderRadar.statusEn)}</em></div>
        <p>{tr(lang,`工作流：${sourceConnectorConfig.telegramTenderRadar.workflow}；脚本：${sourceConnectorConfig.telegramTenderRadar.script}；接口：${sourceConnectorConfig.telegramTenderRadar.ingestApi}；计划：${sourceConnectorConfig.telegramTenderRadar.schedule}。`,`Workflow: ${sourceConnectorConfig.telegramTenderRadar.workflow}; script: ${sourceConnectorConfig.telegramTenderRadar.script}; API: ${sourceConnectorConfig.telegramTenderRadar.ingestApi}; schedule: ${sourceConnectorConfig.telegramTenderRadar.scheduleEn}.`)}</p>
        <div className="collector-channel-list">
          {sourceConnectorConfig.telegramTenderRadar.channels.map(channel=><code key={channel}>@{channel}</code>)}
        </div>
        <div className="collector-secret-list">
          <small>{tr(lang,"必须配置","Required secrets")}</small>
          {sourceConnectorConfig.telegramTenderRadar.requiredSecrets.map(secret=><code key={secret}>{secret}</code>)}
          <small>{tr(lang,"可选配置","Optional settings")}</small>
          {sourceConnectorConfig.telegramTenderRadar.optionalSecrets.map(secret=><code key={secret}>{secret}</code>)}
        </div>
        <small>{tr(lang,sourceConnectorConfig.telegramTenderRadar.note,sourceConnectorConfig.telegramTenderRadar.noteEn)}</small>
      </div>
    </section>

    <section className="panel auto-scan-panel">
      <div className="panel-head"><div><span className="section-kicker">WEEKLY AUTO SCANNER · 0 4 * * 1 UTC</span><h2>{tr(lang,"每周自动线索扫描","Weekly automated lead scan")}</h2><span>{tr(lang,"无需提示词：后台每周扫描MEED、三国官方采购、行业业主、运营商/ISP和多边机构来源。","No prompt needed: the backend scans MEED, official tender portals, industry owners, telco/ISP and IFI sources weekly.")}</span></div><button onClick={onScanNow}>↻ {tr(lang,"立即扫描一次","Run scan now")}</button></div>
      <div className="scan-kpis"><div><strong>{sourceCoverage.sources.length}</strong><span>{tr(lang,"来源","sources")}</span></div><div><strong>{scanRuns[0]?.updatedLeadCount ?? sourceCoverage.meed.recent30Days}</strong><span>{tr(lang,"更新线索池","updated pool")}</span></div><div><strong>{scanRuns[0]?.promotedCount ?? 0}</strong><span>{tr(lang,"候选复核","review candidates")}</span></div><div><strong>{scanRuns[0]?.nextRunAt ? new Date(scanRuns[0].nextRunAt).toLocaleDateString() : tr(lang,"下周一","next Monday")}</strong><span>{tr(lang,"下次计划","next run")}</span></div></div>
      <div className="scan-flow"><span>MEED+</span><i></i><span>Official Tenders</span><i></i><span>Owner Portals</span><i></i><span>IFI Funding</span><i></i><span>{tr(lang,"候选池/雷达","Candidate pool / radar")}</span></div>
      <div className="scan-runs"><div className="scan-runs-head"><span>{tr(lang,"批次","Run")}</span><span>{tr(lang,"触发","Trigger")}</span><span>{tr(lang,"状态","Status")}</span><span>{tr(lang,"结果","Result")}</span><span>{tr(lang,"时间","Time")}</span></div>{scanRuns.length ? scanRuns.map(run=><div className="scan-run-row" key={run.id}><span><strong>{run.id}</strong><small>{run.sourceCount} sources</small></span><span>{run.trigger}</span><span><em className={run.status==="completed"?"active":"review"}>{run.status}</em></span><span>{run.newLeadCount} new · {run.updatedLeadCount} updated · {run.promotedCount} promoted</span><span>{new Date(run.startedAt).toLocaleString()}</span></div>) : <div className="empty-state compact">{tr(lang,"暂无扫描批次；发布后将按每周计划自动执行，也可手动触发。","No scan runs yet; after publishing it will run weekly, or can be triggered manually.")}</div>}</div>
      <div className="audit-warning"><strong>{tr(lang,"自动化边界：","Automation boundary:")}</strong>{tr(lang,"系统会自动扫描和留痕；MEED等需要登录/API的来源需配置授权后才能自动解析为新机会，未验证字段不会自动写成高优先级机会。","The system scans and records runs automatically; sources requiring login/API such as MEED need credentials before parsing into new opportunities. Unverified fields are not promoted as high-priority opportunities.")}</div>
    </section>

    <section className="panel source-coverage-card">
      <div className="panel-head"><div><span className="section-kicker">MULTI-SOURCE COVERAGE · {sourceCoverage.verifiedAt}</span><h2>{tr(lang,"机会来源覆盖","Opportunity source coverage")}</h2><span>{tr(lang,"MEED用于项目生命周期，官方门户用于真实招标窗口，国际机构用于资金与采购验证","MEED for project lifecycle, official portals for live bid windows, and IFIs for funding/procurement validation")}</span></div><em className="status active">{sourceCoverage.sources.length} {tr(lang,"个来源","sources")}</em></div>
      <div className="coverage-kpis"><div><strong>{sourceCoverage.meed.total.toLocaleString()}</strong><span>{tr(lang,"MEED三国全量","MEED full pool")}</span></div><div><strong>{sourceCoverage.meed.active}</strong><span>{tr(lang,"执行/即将启动","active/upcoming")}</span></div><div><strong>{sourceCoverage.meed.recent30Days}</strong><span>{tr(lang,"近30天更新","updated in 30 days")}</span></div><div><strong>{sourceCoverage.meed.promotedToRadar + sourceCoverage.officialTenders.promotedToRadar}</strong><span>{tr(lang,"本轮进入雷达","promoted this run")}</span></div></div>
      <div className="country-source-grid">{countrySourceStrategies.map(strategy=><article key={strategy.country}><div><span>{tr(lang,strategy.country,strategy.countryEn)}</span><strong>{tr(lang,strategy.headline,strategy.headlineEn)}</strong></div><p>{tr(lang,strategy.logic,strategy.logicEn)}</p><div className="source-chip-row">{strategy.primarySources.map(source=><em key={source}>{source}</em>)}</div><small>{tr(lang,"前期信号：","Early signals: ")}{(lang==="zh"?strategy.earlySignals:strategy.earlySignalsEn).join(lang==="zh" ? "、" : ", ")}</small><b>{tr(lang,strategy.risk,strategy.riskEn)}</b></article>)}</div>
      <div className="radar-layer-grid">{opportunityRadarLayers.map((layer,index)=><div key={layer.layer}><span>0{index+1}</span><strong>{tr(lang,layer.layer,layer.layerEn)}</strong><p>{tr(lang,layer.signals,layer.signalsEn)}</p><em>{tr(lang,layer.value,layer.valueEn)}</em></div>)}</div>
      <div className="source-registry"><div className="source-registry-head"><span>{tr(lang,"优先级 / 来源","Priority / Source")}</span><span>{tr(lang,"覆盖区域","Coverage")}</span><span>{tr(lang,"采集方式","Acquisition")}</span><span>{tr(lang,"状态","Status")}</span></div>{sourceCoverage.sources.map(source=><a className="source-registry-row" href={source.url} target="_blank" rel="noreferrer" key={source.name}><span><strong><i>{source.priority}</i>{source.name}</strong><small>{source.url.replace(/^https?:\/\//,'').split('/')[0]}</small></span><span>{tr(lang,source.country,source.countryEn ?? source.country)}</span><span>{tr(lang,source.mode,source.modeEn ?? source.mode)}</span><span><em className={source.status.includes('录入')||source.status.includes('核验')||source.status.includes('监控')?'active':'review'}>{tr(lang,source.status,source.statusEn ?? source.status)}</em></span></a>)}</div>
      <div className="cadence-keyword-grid">
        <div className="cadence-card"><h3>{tr(lang,"扫描频率打法","Scan cadence playbook")}</h3>{sourceScanCadencePlan.map(plan=><div key={plan.cadence}><strong>{tr(lang,plan.cadence,plan.cadenceEn)}</strong><span>{plan.sources}</span><small>{tr(lang,plan.reason,plan.reasonEn)}</small></div>)}</div>
        <div className="keyword-card"><h3>{tr(lang,"华为机会关键词库","Huawei opportunity keyword library")}</h3>{Object.entries(sourceKeywordLibrary).map(([group, words])=><div key={group}><strong>{group.toUpperCase()}</strong><p>{words.join(" · ")}</p></div>)}</div>
      </div>
      <div className="audit-warning"><strong>{tr(lang,"同步边界：","Sync boundary:")}</strong>{tr(lang,"MEED当前为登录会话核验，ITP受Cloudflare限制，尚未建立正式API自动同步；系统不会把无法访问或已过期的公告伪装成有效机会。","MEED is currently verified through an authenticated session and ITP is Cloudflare-restricted; formal API sync is not yet available. Inaccessible or expired notices are never presented as valid opportunities.")}</div>
    </section>

    <section className="panel latest-ingestion-card">
      <div className="panel-head"><div><span className="section-kicker">MEED + LEVANT MAP · {meedLatestIngestion.verifiedAt}</span><h2>{tr(lang,"黎凡特三国最新机会增量","Latest Levant opportunity delta")}</h2><span>{tr(lang,`${meedLatestIngestion.window}在线核验；黎巴嫩本窗口无新增更新`,`Online verification for ${meedLatestIngestion.window}; no Lebanon updates in this window`)}</span></div><em className="status active">{tr(lang,"已录入机会池","Added to pipeline")}</em></div>
      <div className="latest-summary"><div><strong>{meedLatestIngestion.totalRecords}</strong><span>{tr(lang,"最新记录","latest records")}</span></div><div><strong>{meedLatestIngestion.totalNetValue}</strong><span>{tr(lang,"合计净值","total net value")}</span></div><div><strong>1</strong><span>{tr(lang,"条件培育","conditional nurture")}</span></div><div><strong>1</strong><span>{tr(lang,"观察/运维","watch / O&M")}</span></div></div>
      <div className="latest-table"><div className="latest-header"><span>MEED ID</span><span>{tr(lang,"项目","Project")}</span><span>{tr(lang,"国家/行业","Country / industry")}</span><span>{tr(lang,"阶段","Stage")}</span><span>{tr(lang,"净值","Net value")}</span><span>{tr(lang,"经营判断","Disposition")}</span></div>{meedLatestIngestion.records.map(record=><div className="latest-row" key={record.id}><span><strong>#{record.id}</strong><small>{record.updated}</small></span><span><strong>{record.title}</strong><small>{record.opportunityId}</small></span><span><strong>{record.country}</strong><small>{record.industry}</small></span><span>{record.stage}</span><span><strong>{record.value}</strong></span><span><em className={record.disposition.startsWith('P1')?'p1':'watch'}>{record.disposition}</em></span></div>)}</div>
      <div className="audit-warning"><strong>{tr(lang,"录入边界：","Ingestion boundary:")}</strong>{tr(lang,"仅使用本次MEED在线清单可验证字段。方案、可服务空间和竞争类型为内部分析，资金、ICT工作包、顾问/EPC及截标日未确认时均标记待核实。","Only fields visible in this MEED listing are treated as verified. Solutions, addressable space and competitor types are internal analysis; funding, ICT scope, consultant/EPC and bid dates remain unverified unless evidenced.")}</div>
    </section>

    <section className="panel live-verify-card">
      <div className="panel-head"><div><span className="section-kicker">MEED ONLINE VERIFICATION · {meedLiveVerification.verifiedAt}</span><h2>{tr(lang,"伊拉克在线增量核验","Iraq Online Delta Verification")}</h2><span>{tr(lang,"以 2026-08-07 导出为基线；人工登录核验，不代表已建立自动同步","Compared with the 2026-08-07 export; manually verified, not an automated sync")}</span></div><em className="status active">{tr(lang,"登录核验完成","Verified online")}</em></div>
      <div className="live-kpis"><div><strong>{meedLiveVerification.updatedSinceExport}</strong><span>{tr(lang,"导出后更新","updated since export")}</span></div><div><strong>{meedLiveVerification.createdSinceExport}</strong><span>{tr(lang,"导出后新增","new since export")}</span></div><div><strong>{meedLiveVerification.materialStatusChanges}</strong><span>{tr(lang,"实质状态变化","material status changes")}</span></div><div><strong>{meedLiveVerification.priorityReviews.length}</strong><span>{tr(lang,"优先复核项目","priority reviews")}</span></div></div>
      <div className="live-section-title"><strong>{tr(lang,"销售意义变化","Sales-relevant changes")}</strong><small>{tr(lang,"自动触发漏斗降级、归档或复核建议","Triggers downgrade, archive or review recommendations")}</small></div>
      <div className="change-grid">{meedLiveVerification.statusChanges.map(change=><div key={change.id}><span>MEED #{change.id}</span><strong>{change.title}</strong><p><del>{change.before}</del><b>→</b><em>{change.after}</em></p><small>{change.action}</small></div>)}</div>
      <div className="live-section-title"><strong>{tr(lang,"华为优先经营判断","Huawei priority engagement assessment")}</strong><small>{tr(lang,"结合在线里程碑、实施角色、方案匹配和风险","Based on online milestones, delivery roles, solution fit and risk")}</small></div>
      <div className="live-review-list">{meedLiveVerification.priorityReviews.map(review=><article key={review.id}><div className="review-rank"><span>MEED #{review.id}</span><em className={review.judgment.startsWith('P0')?'p0':review.judgment.startsWith('P1')?'p1':'watch'}>{review.judgment}</em></div><h3>{review.title}</h3><div className="review-meta"><span>{review.value}</span><span>{review.stage}</span><span>Confidence {review.confidence}</span></div><p><strong>{tr(lang,"关键信号","Signal")}</strong>{review.signal}</p><p><strong>{tr(lang,"进入路径","Entry path")}</strong>{review.entry}</p><p><strong>{tr(lang,"匹配方案","Solutions")}</strong>{review.solutions}</p><div className="review-risk">⚠ {review.risk}</div><button onClick={()=>onToast(tr(lang,`已创建 ${review.id} 经营复核任务`,`Engagement review created for ${review.id}`))}>{tr(lang,"创建经营任务","Create engagement task")} →</button></article>)}</div>
    </section>

    <section className="panel meed-audit-card">
      <div className="panel-head"><div><span className="section-kicker">MEED EXPORT AUDIT · {meedAudit.auditedAt}</span><h2>{tr(lang,"MEED 全量导出审计","MEED Full Export Audit")}</h2><span>{tr(lang,"两个 ProjectListing 文件为同一批 ID，已去重且未重复计数","The two ProjectListing files contain the same IDs and were not double-counted")}</span></div><em className="status active">{tr(lang,"初筛完成","Screened")}</em></div>
      <div className="audit-kpis">
        <div><strong>{meedAudit.validCountryRecords.toLocaleString()}</strong><span>{tr(lang,"三国有效记录","valid 3-country records")}</span></div>
        <div><strong>{meedAudit.activeOrWatch.toLocaleString()}</strong><span>{tr(lang,"活跃 / 观察池","active / watch pool")}</span></div>
        <div><strong>{meedAudit.preAward.toLocaleString()}</strong><span>{tr(lang,"招标前窗口","pre-award window")}</span></div>
        <div><strong>{(meedAudit.archivedComplete + meedAudit.archivedCancelled).toLocaleString()}</strong><span>{tr(lang,"完工 / 取消归档","completed / cancelled archive")}</span></div>
      </div>
      <div className="audit-stage-note">{tr(lang,`另有 ${meedAudit.awardedOrConstruction} 条已授标/在建项目可检查扩容包，${meedAudit.onHold} 条暂停项目进入观察池。`,`A further ${meedAudit.awardedOrConstruction} awarded/under-construction records may contain expansion packages; ${meedAudit.onHold} on-hold records remain on watch.`)}</div>
      <div className="candidate-head"><div><strong>{tr(lang,"优先人工复核候选","Priority candidates for human review")}</strong><small>{tr(lang,"初步方案契合度，不等同于赢单率或正式 P0 评级","Preliminary solution fit — not win probability or a formal P0 rating")}</small></div></div>
      <div className="candidate-table"><div className="candidate-header"><span>{tr(lang,"项目","Project")}</span><span>{tr(lang,"国家 / 行业 / 阶段","Country / industry / stage")}</span><span>{tr(lang,"项目额","Value")}</span><span>{tr(lang,"初筛契合度","Fit")}</span><span>{tr(lang,"匹配方向","Solution directions")}</span><span></span></div>{meedAudit.candidates.map(candidate => <div className="candidate-row" key={candidate.id}><span><strong>{candidate.title}</strong><small>MEED #{candidate.id}</small></span><span>{candidate.country}<small>{candidate.industry} · {candidate.stage}</small></span><span><strong>{candidate.value}</strong></span><span><em>{candidate.fitScore}</em><small>/100</small></span><span>{candidate.solutions}</span><span><button onClick={() => onToast(tr(lang,`已为 MEED #${candidate.id} 创建复核草稿`,`Review draft created for MEED #${candidate.id}`))}>{tr(lang,"复核","Review")}</button></span></div>)}</div>
      <div className="audit-warning"><strong>{tr(lang,"判定边界：","Assessment boundary:")}</strong>{tr(lang,"导出中缺少可验证的资金路径、ICT 工作包、技术规格、客户关系、伙伴覆盖、已确认竞争对手和截标日期，因此当前不能宣称“高赢单率”。","The exports do not provide verified funding paths, ICT work packages, technical specifications, customer relationships, partner coverage, confirmed competitors or bid deadlines, so a high win probability cannot yet be claimed.")}</div>
    </section>

    <section className="panel response-template-panel"><div className="panel-head"><div><span className="section-kicker">RESPONSE IMPORT TEMPLATE 202605</span><h2>{tr(lang,"内部系统表头映射","Internal system header mapping")}</h2><span>{tr(lang,"机会点会转成营销响应线索：Response模板统一英文；C/D至少一个联系人字段、N/O必须与国家匹配","Opportunities are converted into nurture responses: Response rows are English-only; C/D require at least one contact field and N/O must match country")}</span></div><button onClick={onTemplateExport}>{tr(lang,"导出模板","Export template")} →</button></div>
      <div className="response-template-kpis"><div><strong>29</strong><span>{tr(lang,"固定字段","fixed headers")}</span></div><div><strong>500</strong><span>{tr(lang,"单批上限","rows per batch")}</span></div><div><strong>8</strong><span>{tr(lang,"一级行业下拉值","L1 industries")}</span></div><div><strong>29</strong><span>{tr(lang,"产品兴趣选项","product options")}</span></div></div>
      <div className="mapping-strip"><span>政府/军队/水务 → Government & Public Services / Government Sector</span><span>电力/油气 → Energy / Electricity 或 Oil & Gas</span><span>金融/商业 → Others / Retail & Wholesale</span><span>运营商/ICT → Manufacturing / Machinery & Electronic</span></div>
    </section>

    <section className="panel enrichment-panel"><div className="panel-head"><div><span className="section-kicker">SOURCE ENRICHMENT PLAYBOOK</span><h2>{tr(lang,"机会与线索补齐规则","Opportunity and lead enrichment rules")}</h2><span>{tr(lang,"每个来源负责补不同字段：MEED看生命周期，官方采购看截标，多边机构看资金，伙伴反馈看真实关系","Each source fills different gaps: MEED for lifecycle, official portals for deadlines, IFIs for funding, partner feedback for real relationships")}</span></div><em className="status active">{sourceCoverage.sources.length} {tr(lang,"个来源","sources")}</em></div>
      <div className="playbook-grid">{enrichmentSourcePlaybook.map(row=><div key={row.layer}><span>{row.layer}</span><strong>{row.source}</strong><small>{row.country} · {row.cadence}</small><p>{row.fields}</p><em>{row.use}</em></div>)}</div>
      <div className="field-matrix"><div className="field-matrix-head"><span>{tr(lang,"待补字段","Field gap")}</span><span>{tr(lang,"优先来源","Primary source")}</span><span>{tr(lang,"备选来源","Fallback")}</span><span>{tr(lang,"系统规则","Policy")}</span></div>{enrichmentFieldMatrix.map(row=><div className="field-matrix-row" key={row.field}><span><strong>{row.field}</strong></span><span>{row.primary}</span><span>{row.fallback}</span><span>{row.policy}</span></div>)}</div>
    </section>

    <section className="panel pipeline-panel"><div className="panel-head"><div><h2>{tr(lang,"最近导入批次","Recent import batches")}</h2><span>{tr(lang,"所有自动合并均可回滚","All automated merges are reversible")}</span></div><button>{tr(lang,"字段映射模板","Field mapping template")}</button></div>
      <div className="pipeline-table"><div className="table-header"><span>批次</span><span>来源</span><span>记录</span><span>结构化</span><span>去重</span><span>复核</span><span>状态</span></div>
      {[['IMP-260813-04','MEED ProjectListing Export','3,014','3,009','2 duplicate files','360','Screened'],['IMP-260812-03','Jordan procurement CSV','48','48','3','0','Complete'],['IMP-260810-02','Partner opportunity list.xlsx','37','35','6','4','Review']].map((row,index)=><div className="table-row" key={row[0]}>{row.map((cell,i)=><span key={i}>{i===0?<><strong>{cell}</strong><small>{index===0?tr(lang,'2026-08-13 已审计','Audited 2026-08-13'):tr(lang,'已保留原文件','Original retained')}</small></>:i===6?<em className={`status ${cell==='Complete'||cell==='Screened'?'active':'review'}`}>{cell}</em>:cell}</span>)}</div>)}</div>
    </section>
  </div>;
}

function ManualImportModal({ lang, close, onCreated, onToast }: { lang: Lang; close: () => void; onCreated: (item: Opportunity) => void; onToast: (message: string) => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title:"", titleEn:"", country:"伊拉克" as Country, city:"", industry:"政府", stage:"线索发现", priority:"P2" as Priority, score:"55", confidence:"70", projectValue:"", addressableValue:"", currency:"USD", fundingStatus:"", bidDeadline:"", participationSpace:"中" as Opportunity["participation"], winBand:"中" as Opportunity["win"], sourceName:"手工录入", sourceUrl:"", summary:"" });
  const update = (key:string,value:string) => setForm(current=>({...current,[key]:value}));
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.industry.trim() || !form.stage.trim() || !form.sourceName.trim()) { onToast(tr(lang,"请填写项目名称、行业、阶段和来源","Enter title, industry, stage and source")); return; }
    setSaving(true);
    try {
      const result = await createManualOpportunity({ ...form, score:Number(form.score), confidence:Number(form.confidence)/100, projectValue:form.projectValue?Number(form.projectValue):undefined, addressableValue:form.addressableValue?Number(form.addressableValue):undefined, bidDeadline:form.bidDeadline||undefined });
      onCreated(result.opportunity);
      onToast(tr(lang,`机会 ${result.opportunity.id} 已录入并进入雷达`,`Opportunity ${result.opportunity.id} added to the radar`));
      close();
    } catch (error) {
      onToast(error instanceof Error && error.message.includes("INVALID_SOURCE_URL") ? tr(lang,"来源链接必须以 http:// 或 https:// 开头","Source URL must start with http:// or https://") : tr(lang,"录入失败，请检查字段或账户权限","Import failed; check fields or account permission"));
    } finally { setSaving(false); }
  };
  return <div className="modal-backdrop"><form className="modal-card manual-import-modal" onSubmit={submit}>
    <div className="modal-head"><div><span className="section-kicker">MANUAL OPPORTUNITY ENTRY</span><h2>{tr(lang,"手工录入机会","Manual opportunity entry")}</h2></div><button type="button" onClick={close}>×</button></div>
    <div className="manual-form">
      <label className="wide"><span>{tr(lang,"项目名称 *","Opportunity title *")}</span><input value={form.title} onChange={e=>update("title",e.target.value)} placeholder={tr(lang,"输入中文或常用项目名称","Enter the project title")}/></label>
      <label className="wide"><span>{tr(lang,"英文名称","English title")}</span><input value={form.titleEn} onChange={e=>update("titleEn",e.target.value)}/></label>
      <label><span>{tr(lang,"国家 *","Country *")}</span><select value={form.country} onChange={e=>update("country",e.target.value)}><option>伊拉克</option><option>约旦</option><option>黎巴嫩</option></select></label>
      <label><span>{tr(lang,"城市","City")}</span><input value={form.city} onChange={e=>update("city",e.target.value)}/></label>
      <label><span>{tr(lang,"行业 *","Industry *")}</span><input list="manual-industries" value={form.industry} onChange={e=>update("industry",e.target.value)}/><datalist id="manual-industries"><option value="政府"/><option value="运营商"/><option value="电力"/><option value="油气"/><option value="交通"/><option value="医疗"/><option value="金融"/><option value="商业"/><option value="教育"/><option value="军队"/></datalist></label>
      <label><span>{tr(lang,"项目阶段 *","Stage *")}</span><input list="manual-stages" value={form.stage} onChange={e=>update("stage",e.target.value)}/><datalist id="manual-stages"><option value="线索发现"/><option value="Study"/><option value="Design"/><option value="FEED"/><option value="Main Contract PQ"/><option value="Main Contract Bid"/><option value="Bid Evaluation"/><option value="Contract Awarded"/></datalist></label>
      <label><span>{tr(lang,"优先级","Priority")}</span><select value={form.priority} onChange={e=>update("priority",e.target.value)}><option>P0</option><option>P1</option><option>P2</option><option>WATCH</option></select></label>
      <label><span>{tr(lang,"内部评分","Internal score")}</span><input type="number" min="0" max="100" value={form.score} onChange={e=>update("score",e.target.value)}/></label>
      <label><span>{tr(lang,"证据置信度 %","Evidence confidence %")}</span><input type="number" min="0" max="100" value={form.confidence} onChange={e=>update("confidence",e.target.value)}/></label>
      <label><span>{tr(lang,"项目金额（百万）","Project value (million)")}</span><input type="number" min="0" step="0.01" value={form.projectValue} onChange={e=>update("projectValue",e.target.value)}/></label>
      <label><span>{tr(lang,"华为可服务金额（百万）","Huawei addressable (million)")}</span><input type="number" min="0" step="0.01" value={form.addressableValue} onChange={e=>update("addressableValue",e.target.value)}/></label>
      <label><span>{tr(lang,"币种","Currency")}</span><select value={form.currency} onChange={e=>update("currency",e.target.value)}><option>USD</option><option>IQD</option><option>JOD</option><option>EUR</option></select></label>
      <label><span>{tr(lang,"截标日期","Bid deadline")}</span><input type="date" value={form.bidDeadline} onChange={e=>update("bidDeadline",e.target.value)}/></label>
      <label><span>{tr(lang,"参与空间","Participation")}</span><select value={form.participationSpace} onChange={e=>update("participationSpace",e.target.value)}><option>极高</option><option>高</option><option>中</option><option>低</option></select></label>
      <label><span>{tr(lang,"赢单判断","Win band")}</span><select value={form.winBand} onChange={e=>update("winBand",e.target.value)}><option>高</option><option>中高</option><option>中</option><option>低</option></select></label>
      <label className="wide"><span>{tr(lang,"资金状态","Funding status")}</span><input value={form.fundingStatus} onChange={e=>update("fundingStatus",e.target.value)}/></label>
      <label><span>{tr(lang,"来源名称 *","Source name *")}</span><input value={form.sourceName} onChange={e=>update("sourceName",e.target.value)}/></label>
      <label><span>{tr(lang,"来源链接","Source URL")}</span><input value={form.sourceUrl} onChange={e=>update("sourceUrl",e.target.value)} placeholder="https://..."/></label>
      <label className="wide"><span>{tr(lang,"机会摘要与补充证据","Summary and evidence")}</span><textarea value={form.summary} onChange={e=>update("summary",e.target.value)} rows={4}/></label>
    </div>
    <div className="manual-entry-note">{tr(lang,"华为员工录入后直接进入雷达；伙伴录入记录进入待复核状态。所有创建操作写入审计日志。","Huawei staff entries appear immediately; partner entries are marked pending review. Every creation is audit-logged.")}</div>
    <div className="modal-actions"><button type="button" onClick={close}>{tr(lang,"取消","Cancel")}</button><button className="primary" type="submit" disabled={saving}>{saving?tr(lang,"保存中…","Saving…"):tr(lang,"保存并进入雷达","Save to radar")}</button></div>
  </form></div>;
}

function LeadDispatchModal({ items, lang, close, onCreated, onToast }: { items: Opportunity[]; lang: Lang; close: () => void; onCreated: (rows: LeadDistributionView[]) => void; onToast: (message: string) => void }) {
  const defaultTags = [...new Set(items.map(item => standardDispatchIndustry(item)).filter(Boolean))];
  const [tags, setTags] = useState<Set<string>>(() => new Set(defaultTags.length ? defaultTags : ["Government Sector"]));
  const [selectedAssignees, setSelectedAssignees] = useState<Set<string>>(() => new Set(matchedDispatchOwners(defaultTags.length ? defaultTags : ["Government Sector"]).map(owner => owner.id)));
  const [note, setNote] = useState("请确认该线索的方案匹配、参与空间、客户入口、竞争对手和下一步Owner。");
  const [saving, setSaving] = useState(false);
  const selectedTags = [...tags];
  const matchedOwners = matchedDispatchOwners(selectedTags);
  const toggleTag = (tag: string) => {
    const next = new Set(tags);
    if (next.has(tag)) next.delete(tag); else next.add(tag);
    if (!next.size) next.add(tag);
    setTags(next);
    setSelectedAssignees(new Set(matchedDispatchOwners([...next]).map(owner => owner.id)));
  };
  const toggleAssignee = (id: string) => {
    const next = new Set(selectedAssignees);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelectedAssignees(next);
  };
  const submit = async () => {
    if (!items.length || !selectedTags.length || !selectedAssignees.size) { onToast(tr(lang,"请选择线索、行业标签和接收人","Select leads, industry tags and assignees")); return; }
    setSaving(true);
    try {
      const result = await createLeadDistribution({ opportunityIds: items.map(item => item.id), industryTags: selectedTags, assigneeIds: [...selectedAssignees], note });
      onCreated(result.distributions);
      onToast(tr(lang,`已分发给 ${result.distributions.length} 个行业责任人，等待确认`,`Dispatched to ${result.distributions.length} industry owner(s), awaiting confirmation`));
      close();
    } catch {
      onToast(tr(lang,"分发失败：请确认当前账户有华为内部权限","Dispatch failed: confirm Huawei internal permission"));
    } finally {
      setSaving(false);
    }
  };
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal lead-dispatch-modal" onMouseDown={event=>event.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">LEAD DISPATCH ROUTER</span><h2>{tr(lang,"按行业标签分发确认","Dispatch by industry tag")}</h2></div><button onClick={close}>×</button></div>
    <div className="dispatch-scope"><strong>{items.length}</strong><span>{tr(lang,"条线索将被分发","lead(s) will be dispatched")}</span><em>{items.slice(0,3).map(item=>item.id).join(" · ")}{items.length>3?" · …":""}</em></div>
    <div className="dispatch-tags"><span>{tr(lang,"行业标签","Industry tags")}</span><div>{industryTagOptions.map(tag=><button className={tags.has(tag)?"active":""} key={tag} onClick={()=>toggleTag(tag)}>{localTerm(lang,tag)}</button>)}</div></div>
    <div className="dispatch-auto-match"><div><strong>{tr(lang,"自动匹配责任人","Auto-matched owners")}</strong><small>{tr(lang,"默认同时分发给解决方案经理和系统部长；可手动取消。","Defaults to solution manager and system minister; you may deselect manually.")}</small></div><em>{matchedOwners.length} {tr(lang,"人","owners")}</em></div>
    <div className="dispatch-owner-list">{matchedOwners.length ? matchedOwners.map(owner=><label className={selectedAssignees.has(owner.id)?"selected":""} key={owner.id}><input type="checkbox" checked={selectedAssignees.has(owner.id)} onChange={()=>toggleAssignee(owner.id)}/><span>✓</span><div><strong>{owner.name}</strong><small>{owner.roleLabel} · {owner.email}</small><p>{owner.coverage}</p></div><em>{owner.slaHours}h SLA</em></label>) : <div className="dispatch-empty">{tr(lang,"当前标签没有匹配责任人，请选择其它标签或补充目录。","No matched owner for the current tags; choose another tag or enrich the directory.")}</div>}</div>
    <label className="dispatch-note"><span>{tr(lang,"确认要求","Confirmation request")}</span><textarea value={note} onChange={event=>setNote(event.target.value)} rows={3}/></label>
    <div className="field-policy"><small>{tr(lang,"分发后需要确认","Required confirmation")}</small><div><span>✓ {tr(lang,"方案匹配","Solution fit")}</span><span>✓ {tr(lang,"参与空间","Participation space")}</span><span>✓ {tr(lang,"客户入口","Customer access")}</span><span>✓ {tr(lang,"下一步Owner","Next owner")}</span></div></div>
    <div className="modal-actions"><button onClick={close}>{tr(lang,"取消","Cancel")}</button><button className="primary" disabled={saving || !selectedAssignees.size} onClick={submit}>{saving?tr(lang,"分发中…","Dispatching…"):tr(lang,"确认分发","Confirm dispatch")} →</button></div>
  </div></div>;
}

function DispatchView({ lang, queue, onToast, onRespond }: { lang: Lang; queue: LeadDistributionView[]; onToast: (message: string) => void; onRespond: (row: LeadDistributionView, decision: "confirmed" | "returned") => Promise<void> }) {
  const pending = queue.filter(row => row.status === "pending");
  const confirmed = queue.filter(row => row.status === "confirmed");
  const returned = queue.filter(row => row.status === "returned");
  return <div className="workspace-view dispatch-view">
    <div className="view-intro compact"><div><span className="section-kicker">LEAD DISPATCH ROUTER</span><h1>{tr(lang,"线索分发与确认","Lead dispatch & confirmation")}</h1><p>{tr(lang,"线索打上行业标签后，自动分发给对应解决方案经理或系统部长确认。","Industry-tagged leads are routed to the matched solution manager or system minister for confirmation.")}</p></div><div className="dispatch-kpis"><div><strong>{pending.length}</strong><span>{tr(lang,"待确认","Pending")}</span></div><div><strong>{confirmed.length}</strong><span>{tr(lang,"已确认","Confirmed")}</span></div><div><strong>{returned.length}</strong><span>{tr(lang,"已退回","Returned")}</span></div></div></div>
    <section className="panel dispatch-directory-panel"><div className="panel-head"><div><span className="section-kicker">OWNER DIRECTORY</span><h2>{tr(lang,"行业责任人目录","Industry owner directory")}</h2><span>{tr(lang,"真实组织名单后续可由管理员维护；当前为试点默认映射。","The real org list can be maintained by admins later; this is the pilot default mapping.")}</span></div><em className="status active">{industryDispatchDirectory.length} owners</em></div><div className="dispatch-directory-grid">{industryDispatchDirectory.map(owner=><div key={owner.id}><span>{localTerm(lang,owner.industry)}</span><strong>{owner.name}</strong><small>{owner.roleLabel}</small><p>{owner.coverage}</p><em>{owner.email}</em></div>)}</div></section>
    <section className="panel dispatch-queue-panel"><div className="panel-head"><div><span className="section-kicker">CONFIRMATION QUEUE</span><h2>{tr(lang,"确认队列","Confirmation queue")}</h2><span>{tr(lang,"每条分发记录都保留行业标签、接收人、确认状态和反馈意见。","Each dispatch keeps tags, recipient, confirmation status and feedback.")}</span></div><button onClick={()=>onToast(tr(lang,"请在机会雷达中选择线索后点击分发确认","Select leads in Opportunity Radar and click Dispatch confirmation"))}>{tr(lang,"如何分发？","How to dispatch?")}</button></div>
      <div className="dispatch-queue">{queue.length ? queue.map(row=><div className={`dispatch-row ${row.status}`} key={row.id}><div><strong>{row.opportunityTitles.slice(0,2).join(" / ")}{row.opportunityTitles.length>2?" / …":""}</strong><small>{row.opportunityIds.join(", ")}</small></div><span>{row.industryTags.map(tag=>localTerm(lang,tag)).join(" / ")}</span><span><strong>{row.assigneeName}</strong><small>{row.assigneeRole}</small></span><em>{row.status === "pending" ? tr(lang,"待确认","Pending") : row.status === "confirmed" ? tr(lang,"已确认","Confirmed") : tr(lang,"已退回","Returned")}</em><p>{row.responseNote || row.requestNote}</p><aside>{row.status === "pending" ? <><button onClick={()=>onRespond(row,"returned")}>{tr(lang,"退回","Return")}</button><button className="primary" onClick={()=>onRespond(row,"confirmed")}>{tr(lang,"确认接收","Confirm")}</button></> : <small>{row.respondedAt ? new Date(row.respondedAt).toLocaleString() : new Date(row.requestedAt).toLocaleString()}</small>}</aside></div>) : <div className="dispatch-empty-state"><strong>{tr(lang,"暂无分发记录","No dispatch records yet")}</strong><span>{tr(lang,"到机会雷达选择单条或多条线索，点击“分发确认”即可生成确认任务。","Go to Opportunity Radar, select one or more leads and click Dispatch confirmation.")}</span></div>}</div>
    </section>
  </div>;
}

function ExportModal({ items, lang, canInternal, close, onToast }: { items: Opportunity[]; lang: Lang; canInternal: boolean; close: () => void; onToast: (message: string) => void }) {
  const [mode, setMode] = useState<"response-template" | "custom">("response-template");
  const [templateContext, setTemplateContext] = useState<ResponseTemplateContext>(() => defaultResponseTemplateContext());
  const [columns, setColumns] = useState(() => exportColumnDefinitions.filter(definition=>canInternal||!["priority","score","confidence","addressable","owner","funding","participation","win","competitors","summary"].includes(definition.key)).map((definition,index)=>({ ...definition, selected:definition.defaultSelected ?? index<19, header:lang==='zh'?definition.zh:definition.en })));
  const selectedColumns = columns.filter(column=>column.selected && column.header.trim());
  const sampleIndustry = items[0] ? inferTemplateIndustry(items[0]) : { industryL1: "Government & Public Services", industryL2: "Government Sector" };
  const sampleProducts = items[0] ? inferPreferredProducts(items[0]) : "Others";
  const responsePreflightErrors = mode === "response-template" ? validateResponseTemplateRows(items, templateContext) : [];
  useEffect(() => setColumns(current => current.map(column => ({ ...column, header: lang === "zh" ? column.zh : column.en }))), [lang]);
  const updateColumn = (index:number, patch:Partial<{selected:boolean;header:string}>) => setColumns(current=>current.map((column,columnIndex)=>columnIndex===index?{...column,...patch}:column));
  const updateTemplate = (key:keyof ResponseTemplateContext,value:string) => setTemplateContext(current=>({...current,[key]:value}));
  const moveColumn = (index:number, direction:-1|1) => setColumns(current=>{ const target=index+direction; if(target<0||target>=current.length)return current; const next=[...current]; [next[index],next[target]]=[next[target],next[index]]; return next; });
  const csvCell = (value:string|number) => `"${String(value).replace(/"/g,'""')}"`;
  const xmlCell = (value:string|number) => String(value).replace(/[&<>"']/g,character=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&apos;"})[character]??character);
  const saveFile = (content:string,type:string,extension:string) => { const blob=new Blob([content],{type}); const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=`MSSD-opportunities-${new Date().toISOString().slice(0,10)}.${extension}`; link.click(); URL.revokeObjectURL(url); onToast(tr(lang,`已导出 ${items.length} 条机会、${selectedColumns.length} 个自定义字段`,`Exported ${items.length} opportunities with ${selectedColumns.length} custom columns`)); close(); };
  const saveBlob = (blob:Blob,fileName:string,message:string) => { const url=URL.createObjectURL(blob); const link=document.createElement('a'); link.href=url; link.download=fileName; link.click(); URL.revokeObjectURL(url); onToast(message); close(); };
  const exportCsv = () => { const rows=[selectedColumns.map(column=>csvCell(column.header)).join(','),...items.map(item=>selectedColumns.map(column=>csvCell(column.value(item,lang))).join(','))]; saveFile(`\ufeff${rows.join('\r\n')}`,'text/csv;charset=utf-8','csv'); };
  const exportExcel = () => { const header=selectedColumns.map(column=>`<th>${xmlCell(column.header)}</th>`).join(''); const rows=items.map(item=>`<tr>${selectedColumns.map(column=>`<td>${xmlCell(column.value(item,lang))}</td>`).join('')}</tr>`).join(''); saveFile(`<!doctype html><html><head><meta charset="utf-8"></head><body><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></body></html>`,'application/vnd.ms-excel;charset=utf-8','xls'); };
  const exportResponseTemplate = async () => {
    try {
      const blob = await createResponseTemplateXlsx(items, templateContext);
      saveBlob(blob, `MSSD-response-import-${new Date().toISOString().slice(0,10)}.xlsx`, tr(lang,`已基于原始内部Response模板导出 ${Math.min(items.length,MAX_RESPONSE_TEMPLATE_ROWS)} 条，表头、样式和下拉验证已保留；导入前请补齐联系人邮箱或电话`,`Exported ${Math.min(items.length,MAX_RESPONSE_TEMPLATE_ROWS)} rows from the original internal Response template; headers, styling and dropdown validations are preserved. Complete email or phone before import`));
    } catch (error) {
      onToast(tr(lang,`导出失败：${error instanceof Error ? error.message : "模板生成异常"}`,`Export failed: ${error instanceof Error ? error.message : "template generation error"}`));
    }
  };
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal export-modal" onMouseDown={event=>event.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">CUSTOM EXPORT</span><h2>{tr(lang,"自定义表头导出","Custom header export")}</h2></div><button onClick={close}>×</button></div>
    <div className="export-mode-switch"><button className={mode==='response-template'?'active':''} onClick={()=>setMode('response-template')}><strong>{tr(lang,"内部Response导入模板","Internal Response template")}</strong><small>{tr(lang,"固定29列表头 · 行业自动填充 · .xlsx","Fixed 29 headers · Industry autofill · .xlsx")}</small></button><button className={mode==='custom'?'active':''} onClick={()=>setMode('custom')}><strong>{tr(lang,"通用自定义导出","General custom export")}</strong><small>{tr(lang,"自由选择字段、改表头和顺序","Choose fields, headers and order")}</small></button></div>
    <div className="export-scope"><strong>{items.length}</strong><span>{tr(lang,"条机会将按当前筛选或勾选范围导出","opportunities from the current filter or selection")}</span><em>{mode==='response-template'?`${responseTemplateColumns.length} ${tr(lang,"列","columns")}`:`${selectedColumns.length} ${tr(lang,"列","columns")}`}</em></div>
    {mode === 'response-template' ? <>
      <div className="template-controls">
        <label><span>Tactic Code *</span><input value={FIXED_RESPONSE_TACTIC_CODE} readOnly aria-readonly="true" title={tr(lang,"固定编码，导出时强制写入","Fixed code, enforced during export")}/><small>{tr(lang,"固定编码，不允许修改","Fixed code, not editable")}</small></label>
        <label><span>{tr(lang,"动作类型","Action Type")}</span><select value={templateContext.actionType} onChange={event=>updateTemplate('actionType',event.target.value)}>{responseTemplateDropdowns.actionType.map(value=><option key={value}>{value}</option>)}</select></label>
        <label><span>{tr(lang,"响应平台","Response Platform")}</span><select value={templateContext.platformName} onChange={event=>updateTemplate('platformName',event.target.value)}>{responseTemplateDropdowns.platformName.map(value=><option key={value}>{value}</option>)}</select></label>
        <label><span>{tr(lang,"收集时间","Collect Time")}</span><input value={templateContext.responseTime} onChange={event=>updateTemplate('responseTime',event.target.value)}/></label>
        <label><span>Utm_Campaign</span><input value={templateContext.utmCampaign} onChange={event=>updateTemplate('utmCampaign',event.target.value)}/></label>
        <label><span>{tr(lang,"同意联系","Agree to Contact")}</span><select value={templateContext.agreeToContact} onChange={event=>updateTemplate('agreeToContact',event.target.value)}><option>Y</option><option>N</option></select></label>
      </div>
      <div className="template-autofill">
        <div><small>{tr(lang,"样例行业映射","Sample industry mapping")}</small><strong>{sampleIndustry.industryL1} / {sampleIndustry.industryL2}</strong></div>
        <div><small>{tr(lang,"样例产品兴趣","Sample preferred product")}</small><strong>{sampleProducts}</strong></div>
        <div><small>{tr(lang,"导入限制","Import limit")}</small><strong>{tr(lang,`每次最多${MAX_RESPONSE_TEMPLATE_ROWS}条`,`Max ${MAX_RESPONSE_TEMPLATE_ROWS} rows per batch`)}</strong></div>
      </div>
      {responsePreflightErrors.length ? <div className="response-preflight warning"><strong>{tr(lang,`自检发现 ${responsePreflightErrors.length} 个导入风险`,`Self-check found ${responsePreflightErrors.length} import risks`)}</strong><span>{tr(lang,"系统会优先自动补齐机构电话/采购入口电话；仍失败时会在点击导出后显示具体错误。","The system first auto-fills institution or procurement-entry phone numbers; if export still fails, clicking Export will show the exact error.")}</span><ul>{responsePreflightErrors.slice(0,3).map(error=><li key={error}>{error}</li>)}</ul></div> : <div className="response-preflight ok"><strong>{tr(lang,"自检通过","Self-check passed")}</strong><span>{tr(lang,"当前范围满足英文数据、联系人必填、国家-城市匹配和下拉值规则。","Current scope satisfies English-only data, mandatory contact, country-location and dropdown rules.")}</span></div>}
      <div className="template-column-preview"><div className="template-column-head"><span>{tr(lang,"表头","Header")}</span><span>{tr(lang,"自动填充规则","Autofill rule")}</span></div>{responseTemplateColumns.map(column=><div key={column.key}><strong>{column.header}</strong><span>{column.description}</span></div>)}</div>
      <div className="export-note">{tr(lang,"该模式以 Response Import Template 202605 原始工作簿为母版，仅写入 Data Import 数据行；表头、批注、冻结窗格、隐藏 Option 页和下拉验证不会被重建或破坏。Response导出默认全英文；E/G/H/I/K/M/Q/R/S 强制使用原模板下拉值；N/O按E列国家自动归一；C/D邮箱或电话必须至少一个，否则导出会被自检拦截。","This mode uses the original Response Import Template 202605 workbook as the master file and only writes Data Import rows; headers, comments, frozen panes, the hidden Option sheet and dropdown validations are not rebuilt or damaged. Response export is English-only by default; E/G/H/I/K/M/Q/R/S are forced to original template dropdown values; N/O are normalized against column E; C/D must include at least email or telephone or the self-check blocks export.")}</div>
    </> : <>
      <div className="export-column-head"><span>{tr(lang,"启用","Use")}</span><span>{tr(lang,"字段","Field")}</span><span>{tr(lang,"自定义表头","Custom header")}</span><span>{tr(lang,"顺序","Order")}</span></div>
      <div className="export-columns">{columns.map((column,index)=><div className={column.selected?'selected':''} key={column.key}><label><input type="checkbox" checked={column.selected} onChange={event=>updateColumn(index,{selected:event.target.checked})}/><span>✓</span></label><strong>{lang==='zh'?column.zh:column.en}</strong><input value={column.header} disabled={!column.selected} onChange={event=>updateColumn(index,{header:event.target.value})}/><aside><button disabled={index===0} onClick={()=>moveColumn(index,-1)}>↑</button><button disabled={index===columns.length-1} onClick={()=>moveColumn(index,1)}>↓</button></aside></div>)}</div>
      <div className="export-note">{tr(lang,"表头名称和列顺序会原样写入导出文件；可用字段已按账户角色控制。Excel格式为兼容.xls，CSV使用UTF-8编码。","Header names and column order are written exactly as configured; available fields are role-controlled. Excel uses compatible .xls and CSV uses UTF-8.")}</div>
    </>}
    <div className="modal-actions"><button onClick={close}>{tr(lang,"取消","Cancel")}</button>{mode==='custom'?<><button disabled={!selectedColumns.length} onClick={exportCsv}>{tr(lang,"导出CSV","Export CSV")}</button><button className="primary" disabled={!selectedColumns.length} onClick={exportExcel}>{tr(lang,"导出Excel","Export Excel")} →</button></>:<button className="primary" disabled={!items.length || !templateContext.actionType || !templateContext.platformName || !templateContext.agreeToContact} onClick={exportResponseTemplate}>{tr(lang,"导出内部模板.xlsx","Export template .xlsx")} →</button>}</div>
  </div></div>;
}

function ShareModal({ items, lang, canInternal, deliveryStatus, close, onConfigure, onSend }: {
  items: Opportunity[];
  lang: Lang;
  canInternal:boolean;
  deliveryStatus: DeliveryStatus;
  close: () => void;
  onConfigure: () => void;
  onSend: (audience: 'internal'|'partner', channel:'email'|'sms', recipient:string, partners: Array<Pick<PartnerDirectoryEntry,'id'|'name'|'manager'|'managerEmail'>>) => Promise<void>;
}) {
  const [channel, setChannel] = useState<'email'|'sms'>('email');
  const [audience, setAudience] = useState<'internal'|'partner'>('partner');
  const [internalRecipient, setInternalRecipient] = useState('');
  const [selectedPartnerIds, setSelectedPartnerIds] = useState<Set<string>>(() => new Set([partnerDirectory[0].id]));
  const [partnerRecipient, setPartnerRecipient] = useState(partnerDirectory[0].email);
  const [sending, setSending] = useState(false);
  const item = items[0];
  const isBulk = items.length > 1;
  const selectedPartners = partnerDirectory.filter(partner => selectedPartnerIds.has(partner.id));
  const recipient = audience === 'internal' ? internalRecipient : partnerRecipient;
  const recipientsFor = (ids: Set<string>, nextChannel: 'email'|'sms') => partnerDirectory.filter(partner => ids.has(partner.id)).map(partner => nextChannel === 'email' ? partner.email : partner.phone).join(', ');
  const togglePartner = (partnerId: string) => {
    const next = new Set(selectedPartnerIds);
    if (next.has(partnerId)) next.delete(partnerId); else next.add(partnerId);
    setSelectedPartnerIds(next);
    setPartnerRecipient(recipientsFor(next, channel));
  };
  const selectChannel = (nextChannel: 'email'|'sms') => { setChannel(nextChannel); setPartnerRecipient(recipientsFor(selectedPartnerIds, nextChannel)); };
  const channelReady = channel === 'email' ? deliveryStatus.email : deliveryStatus.sms;
  const hasDemoRecipient = audience === 'partner' && selectedPartners.some(partner => partnerRecipient.includes(channel === 'email' ? partner.email : partner.phone));
  const sendBlockReason = !channelReady
    ? tr(lang, `${channel === "email" ? "邮件" : "SMS"}服务未配置完成。`, `${channel === "email" ? "Email" : "SMS"} service is not configured.`)
    : sending
      ? tr(lang, "正在发送，请稍候。", "Sending; please wait.")
      : !recipient.trim()
        ? tr(lang, "请输入接收人。", "Enter recipients.")
        : hasDemoRecipient
          ? tr(lang, "请把演示接收地址替换为真实联系人。", "Replace demo recipient details with real contacts.")
          : audience === "partner" && selectedPartners.length === 0
            ? tr(lang, "请至少选择 1 家伙伴。", "Select at least one partner.")
            : audience === "internal" && channel === "email" && recipient.split(/[,;\n]+/).map(value => value.trim()).filter(Boolean).some(value => !value.toLowerCase().endsWith("@huawei.com"))
              ? tr(lang, "内部邮件只能发送给 @huawei.com 邮箱；如需发 Gmail，请切换为伙伴安全版。", "Internal email can only be sent to @huawei.com. Switch to partner-safe mode for Gmail testing.")
              : "";
  const sendDisabled = Boolean(sendBlockReason);
  const submit = async () => { if (sendBlockReason) return; setSending(true); try { await onSend(audience,channel,recipient,selectedPartners.map(partner=>({id:partner.id,name:partner.name,manager:partner.manager,managerEmail:partner.managerEmail}))); } finally { setSending(false); } };
  const previewBriefs = items.slice(0, isBulk ? 3 : 1).map(opportunity => pushOpportunityBrief(opportunity, lang));
  const safePreviewInsight = (opportunity: Opportunity) => tr(
    lang,
    `${opportunity.title}：伙伴可基于公开项目范围、关键节点、资金状态、采购入口和本地交付条件先行触达客户；内部经营评分、赢单判断、竞争策略和可服务空间已脱敏。`,
    `${opportunity.titleEn}: partners can engage based on public scope, key milestones, funding status, procurement entry and local delivery requirements. Internal scoring, win assessment, competitive strategy and addressable scope are redacted.`
  );
  const fields = audience === 'internal'
    ? [tr(lang,'项目分析','Project analysis'),tr(lang,'华为产品匹配','Huawei product mapping'),tr(lang,'内部评分','Internal score'),tr(lang,'竞争策略','Competitive strategy'),tr(lang,'机会 Owner','Opportunity owner'),tr(lang,'风险与打法','Risk & engagement play')]
    : [tr(lang,'项目分析','Project analysis'),tr(lang,'公开里程碑','Public milestone'),tr(lang,'华为产品匹配','Huawei product mapping'),tr(lang,'联系人/采购入口','Contact / procurement entry'),tr(lang,'确认链接','Confirmation link'),tr(lang,'伙伴动作','Partner action')];
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal share-modal-wide" onMouseDown={event=>event.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">ROLE-AWARE PUSH</span><h2>{isBulk ? tr(lang,`批量推送 ${items.length} 个机会`,`Bulk push ${items.length} opportunities`) : tr(lang,"一键推送 1 个机会","1-click push · 1 opportunity")}</h2></div><button onClick={close}>×</button></div>
    <div className="audience-switch"><button className={audience==='partner'?'active':''} onClick={()=>setAudience('partner')}><strong>{tr(lang,'推送给伙伴','Push to partners')}</strong><small>{tr(lang,'支持多选并匹配伙伴经理','Multi-select with manager matching')}</small></button>{canInternal&&<button className={audience==='internal'?'active internal':''} onClick={()=>setAudience('internal')}><strong>{tr(lang,'推送给内部','Push internally')}</strong><small>{tr(lang,'保留经营与竞争信息','Retain sales intelligence')}</small></button>}</div>
    <div className={`safe-notice ${audience==='internal'?'internal':''}`}><strong>✓ {audience==='internal'?tr(lang,'内部经营版','Internal sales view'):tr(lang,'伙伴安全版','Partner-safe view')}</strong><span>{audience==='internal'?tr(lang,'包含内部评分、竞争策略、机会 Owner 和其他伙伴信息；邮件不外显华为可服务空间。','Includes internal scores, competitive strategy, opportunity owner and other partner information; Huawei addressable scope is redacted from email.'):tr(lang,'已移除内部评分、华为可服务空间、竞争策略、机会 Owner 和其他伙伴信息。','Internal scores, Huawei addressable scope, competitive strategy, opportunity owner and other partner information are removed.')}</span></div>
    <div className={`delivery-notice ${channelReady?'ready':'pending'}`}><strong>{channelReady?'✓':'!'}</strong><span>{channelReady?tr(lang,`${channel==='email'?'邮件':'SMS'}真实发送服务已启用`,`${channel==='email'?'Email':'SMS'} live delivery is enabled`):tr(lang,`${channel==='email'?'邮件':'SMS'}服务等待管理员配置凭据`,`${channel==='email'?'Email':'SMS'} is waiting for administrator credentials`)}</span>{!channelReady&&<button onClick={onConfigure}>{tr(lang,"打开配置","Open setup")}</button>}</div>
    {audience==='partner' ? <>
      <div className="partner-picker-head"><span>{tr(lang,"选择接收伙伴（可多选）","Select partners (multiple)")}</span><em>{selectedPartners.length} {tr(lang,"家已选择","selected")}</em></div>
      <div className="partner-picker">{partnerDirectory.map(partner=><label className={selectedPartnerIds.has(partner.id)?'selected':''} key={partner.id}><input type="checkbox" checked={selectedPartnerIds.has(partner.id)} onChange={()=>togglePartner(partner.id)}/><span className="partner-check">✓</span><span><strong>{partner.name}</strong><small>{localTerm(lang,partner.country)} · {localTerm(lang,partner.tier)} {tr(lang,"伙伴","partner")}</small></span></label>)}</div>
      <div className="manager-match"><div><span>{tr(lang,"对应华为伙伴经理","Assigned Huawei partner managers")}</span><small>{tr(lang,"随伙伴选择自动更新","Updates with partner selection")}</small></div>{selectedPartners.length ? selectedPartners.map(partner=><div className="manager-row" key={partner.id}><span className="avatar">{partner.managerInitials}</span><span><strong>{partner.manager}</strong><small>{partner.managerEmail}</small></span><em>↔</em><span><strong>{partner.name}</strong><small>{channel==='email'?partner.email:partner.phone}</small></span></div>) : <p>{tr(lang,"请至少选择一家伙伴","Select at least one partner")}</p>}</div>
      <label>{tr(lang,"接收人（可编辑并保存）","Recipients (editable and saved)")}<textarea value={partnerRecipient} onChange={event=>setPartnerRecipient(event.target.value)} placeholder={channel==='email'?'partner@example.com':'+964 …'}/><small>{tr(lang,"选择伙伴或切换渠道时会重新自动带出；当前伙伴目录为演示地址，发送前必须替换为真实邮箱或手机号。","Partner or channel changes regenerate this field; demo directory addresses must be replaced with real email addresses or phone numbers before sending.")}</small></label>
      {hasDemoRecipient&&<div className="recipient-warning">! {tr(lang,"请把演示接收地址替换为真实联系人","Replace demo recipient details with real contacts")}</div>}
    </> : <><label>{tr(lang,"内部接收组","Internal recipient group")}<select defaultValue="Iraq MSSD Core Team"><option>Iraq MSSD Core Team</option><option>Iraq Enterprise Sales</option><option>Levant Solution Team</option></select></label><label>{tr(lang,"接收人","Recipient")}<input value={internalRecipient} onChange={e=>setInternalRecipient(e.target.value)} placeholder="name@huawei.com"/></label></>}
    <div className="channel-select"><button className={channel==='email'?'active':''} onClick={()=>selectChannel('email')}>{tr(lang,"邮件","Email")}</button><button className={channel==='sms'?'active':''} onClick={()=>selectChannel('sms')}>SMS</button></div>
    <div className="field-policy"><small>{tr(lang,'本次包含字段','Included fields')}</small><div>{fields.map(field=><span key={field}>✓ {field}</span>)}</div></div>
    <div className="share-preview analysis-preview"><small>{audience==='internal'?tr(lang,"内部版预览","Internal preview"):tr(lang,"伙伴安全版预览","Partner-safe preview")}</small><strong>{isBulk?tr(lang,`${items.length} 个机会的筛选结果包`,`${items.length}-opportunity filtered package`):(lang === 'zh' ? item.title : item.titleEn)}</strong><p>{isBulk?tr(lang,`下方展示前 ${previewBriefs.length} 个项目分析，发送时会包含已选择的全部 ${items.length} 个机会。`,`Below are the first ${previewBriefs.length} project analyses; the email will include all ${items.length} selected opportunities.`):(audience === 'partner' ? safePreviewInsight(item) : previewBriefs[0]?.insight)}</p>
      <div><span>{isBulk?tr(lang,'批量机会包','Bulk opportunity pack'):`${previewBriefs[0]?.meta}`}</span><span>{audience==='internal'?tr(lang,'内部机密','Internal confidential'):tr(lang,'伙伴可见','Partner visible')}</span></div>
      <div className="preview-brief-list">{previewBriefs.map((brief,index)=><article className="preview-brief-card" key={`${brief.title}-${index}`}>
        <header><span>{isBulk ? `${index + 1}/${items.length}` : item.id}</span><h3>{brief.title}</h3><small>{brief.meta}</small></header>
        <section className="preview-fact-grid">
          <div><small>{tr(lang,"项目金额","Project value")}</small><b>{brief.value}</b></div>
          <div><small>{tr(lang,"关键节点","Key milestone")}</small><b>{brief.deadline}</b></div>
          <div><small>{tr(lang,"资金状态","Funding")}</small><b>{brief.funding}</b></div>
          <div><small>{tr(lang,"来源","Source")}</small><b>{brief.source}</b></div>
        </section>
        <p className="preview-insight">{audience === 'partner' ? safePreviewInsight(items[index] ?? item) : brief.insight}</p>
        <div className="preview-products"><strong>{tr(lang,"关联华为产品 / 方案","Related Huawei products / solutions")}</strong>{brief.solutionItems.map(solution=><div key={`${brief.title}-${solution.name}`}><span>{solution.domain}</span><b>{solution.name}</b><em>{solution.fit}%</em><small>{solution.role}</small></div>)}</div>
        <div className="preview-play"><strong>{tr(lang,"项目打法","Engagement play")}</strong><p>{brief.strategy}</p></div>
        <div className="preview-risk"><strong>{tr(lang,"风险与补齐项","Risks / gaps")}</strong><p>{brief.risk}</p></div>
        <div className="preview-contact">
          <strong>{tr(lang,"联系人 / 采购入口","Contact / procurement entry")}</strong>
          <div className="preferred-contact-card">
            <small>{tr(lang,"首选触达方式","Preferred contact method")}</small>
            <b>{brief.contactDetails.preferredMethodLabel} · {brief.contactDetails.preferredMethod}</b>
            <em>{brief.contactDetails.contactCompleteness}</em>
          </div>
          <div className="preview-contact-grid">
            <span><small>{tr(lang,"角色","Role")}</small><b>{brief.contactDetails.role}</b></span>
            <span><small>{tr(lang,"联系人","Contact")}</small><b>{brief.contactDetails.name}</b></span>
            <span><small>{tr(lang,"职位","Title")}</small><b>{brief.contactDetails.title}</b></span>
            <span><small>{tr(lang,"公司","Company")}</small><b>{brief.contactDetails.company}</b></span>
            <span><small>{tr(lang,"邮箱","Email")}</small><b>{brief.contactDetails.email}</b></span>
            <span><small>{tr(lang,"手机号","Mobile")}</small><b>{brief.contactDetails.phone}</b></span>
            <span><small>{tr(lang,"机构电话","Institution phone")}</small><b>{brief.contactDetails.companyPhone}</b></span>
            <span><small>{tr(lang,"联系人来源","Contact source")}</small><b>{brief.contactDetails.source}</b></span>
          </div>
          <small>{tr(lang,"采购入口","Procurement entry")}: {brief.contactDetails.procurementEntry}</small>
          <em>{brief.contactDetails.status}</em>
          <em>{tr(lang,"补齐动作","Completion action")}: {brief.contactDetails.completionAction}</em>
        </div>
        <div className="preview-actions"><strong>{tr(lang,"下一步动作","Next actions")}</strong>{brief.nextActions.map(action=><span key={action}>{action}</span>)}</div>
      </article>)}</div>
      {isBulk && items.length > previewBriefs.length ? <em className="preview-more">{tr(lang,`另有 ${items.length - previewBriefs.length} 个机会将在邮件中完整展开。`,`Another ${items.length - previewBriefs.length} opportunities will be fully expanded in the email.`)}</em> : null}
    </div>
    <label className="checkline"><input type="checkbox" defaultChecked/>{audience==='internal'?tr(lang,"确认接收人均拥有内部经营信息权限","Confirm all recipients are authorized for internal sales information"):tr(lang,"要求伙伴 7 天内接受、拒绝或提出澄清","Ask the partner to accept, decline or clarify within 7 days")}</label>
    {sendBlockReason ? <div className="send-blocker modal-blocker">! {sendBlockReason}</div> : null}
    <div className="modal-actions"><button onClick={close}>{tr(lang,"取消","Cancel")}</button><button className="primary" disabled={sendDisabled} title={sendBlockReason} onClick={submit}>{sending?tr(lang,"正在发送…","Sending…"):channelReady?tr(lang,"确认并发送","Confirm & send"):tr(lang,"等待服务配置","Awaiting setup")} →</button></div>
  </div></div>;
}

function DeliverySettingsModal({ lang, deliveryStatus, close, onTestPush }: { lang: Lang; deliveryStatus: DeliveryStatus; close: () => void; onTestPush: () => void }) {
  const emailMissing = deliveryStatus.emailMissing ?? [];
  const smsMissing = deliveryStatus.smsMissing ?? [];
  const aiMissing = deliveryStatus.aiMissing ?? [];
  const emailProvider = deliveryStatus.emailProvider;
  const emailRows = [
    { key: "RESEND_API_KEY", required: true, secret: true, ok: emailProvider === "resend" || !emailMissing.includes("RESEND_API_KEY"), note: tr(lang,"Resend通道二选一配置：API Key，生产环境按Secret保存","Resend option: API key, stored as a production secret") },
    { key: "RESEND_FROM_EMAIL", required: true, secret: false, ok: emailProvider === "resend" || !emailMissing.includes("RESEND_FROM_EMAIL"), note: tr(lang,"Resend通道二选一配置：必须是已验证发件域名/邮箱","Resend option: must be a verified sender domain or email") },
    { key: "GMAIL_CLIENT_ID", required: true, secret: false, ok: emailProvider === "gmail" || !emailMissing.includes("GMAIL_CLIENT_ID"), note: tr(lang,"Gmail API通道二选一配置：OAuth Client ID","Gmail API option: OAuth client ID") },
    { key: "GMAIL_CLIENT_SECRET", required: true, secret: true, ok: emailProvider === "gmail" || !emailMissing.includes("GMAIL_CLIENT_SECRET"), note: tr(lang,"Gmail API通道二选一配置：OAuth Client Secret","Gmail API option: OAuth client secret") },
    { key: "GMAIL_REFRESH_TOKEN", required: true, secret: true, ok: emailProvider === "gmail" || !emailMissing.includes("GMAIL_REFRESH_TOKEN"), note: tr(lang,"Gmail API通道二选一配置：gmail.send授权Refresh Token","Gmail API option: gmail.send refresh token") },
    { key: "GMAIL_FROM_EMAIL", required: true, secret: false, ok: emailProvider === "gmail" || !emailMissing.includes("GMAIL_FROM_EMAIL"), note: tr(lang,"Gmail API通道二选一配置：授权发件Gmail地址","Gmail API option: authorized Gmail sender") },
    { key: "RESEND_REPLY_TO", required: false, secret: false, ok: true, note: "zhaowenjun@huawei.com" },
  ];
  const smsRows = [
    { key: "TWILIO_ACCOUNT_SID", required: true, secret: true, ok: !smsMissing.includes("TWILIO_ACCOUNT_SID"), note: tr(lang,"Twilio账户SID","Twilio account SID") },
    { key: "TWILIO_AUTH_TOKEN", required: true, secret: true, ok: !smsMissing.includes("TWILIO_AUTH_TOKEN"), note: tr(lang,"Twilio Auth Token，生产环境按Secret保存","Twilio auth token, stored as a production secret") },
    { key: "TWILIO_FROM_NUMBER / TWILIO_MESSAGING_SERVICE_SID", required: true, secret: false, ok: !smsMissing.includes("TWILIO_FROM_NUMBER 或 TWILIO_MESSAGING_SERVICE_SID"), note: tr(lang,"二选一：短信发送号码或Messaging Service SID","Either a sender number or Messaging Service SID") },
  ];
  const aiProviderLabel = deliveryStatus.aiProvider === "zhipu" ? "Zhipu GLM" : deliveryStatus.aiProvider === "deepseek" ? "DeepSeek" : "Zhipu GLM / DeepSeek";
  const aiRows = [
    { key: "ZHIPU_API_KEY", required: !deliveryStatus.ai, secret: true, ok: deliveryStatus.aiProvider === "zhipu" || Boolean(deliveryStatus.ai), note: tr(lang,"智谱BigModel API Key，优先通道，生产环境按Secret保存","Zhipu BigModel API key, preferred channel, stored as a production secret") },
    { key: "ZHIPU_MODEL", required: false, secret: false, ok: true, note: deliveryStatus.aiProvider === "zhipu" ? deliveryStatus.aiModel || "glm-5.3" : "glm-5.3" },
    { key: "ZHIPU_API_BASE_URL", required: false, secret: false, ok: true, note: "https://open.bigmodel.cn/api/paas/v4" },
    { key: "DEEPSEEK_API_KEY", required: false, secret: true, ok: deliveryStatus.aiProvider === "deepseek" || !aiMissing.includes("DEEPSEEK_API_KEY"), note: tr(lang,"备用AI通道，生产环境按Secret保存","Backup AI channel, stored as a production secret") },
    { key: "DEEPSEEK_MODEL", required: false, secret: false, ok: true, note: deliveryStatus.aiProvider === "deepseek" ? deliveryStatus.aiModel || "deepseek-v4-flash" : "deepseek-v4-flash" },
  ];
  const renderRows = (rows: typeof emailRows) => rows.map(row => <div className="config-row" key={row.key}><span className={row.ok ? "ok" : "missing"}>{row.ok ? "✓" : "!"}</span><strong>{row.key}</strong><small>{row.required ? tr(lang,"必填","Required") : tr(lang,"选填","Optional")}{row.secret ? ` · ${tr(lang,"密钥","Secret")}` : ""}</small><em>{row.note}</em></div>);
  return <div className="modal-backdrop" onMouseDown={close}><div className="modal settings-modal" onMouseDown={event=>event.stopPropagation()}>
    <div className="modal-head"><div><span className="section-kicker">DELIVERY SERVICE SETUP</span><h2>{tr(lang,"邮箱与SMS发送配置","Email & SMS setup")}</h2></div><button onClick={close}>×</button></div>
    <div className="settings-status-grid">
      <div className={deliveryStatus.email ? "ready" : "pending"}><span>{deliveryStatus.email ? "✓" : "!"}</span><strong>{tr(lang,"邮件 Resend / Gmail API","Email · Resend / Gmail API")}</strong><small>{deliveryStatus.email ? tr(lang,`已启用${emailProvider==="gmail"?"Gmail API":"Resend"}，可真实发送`,`Enabled via ${emailProvider==="gmail"?"Gmail API":"Resend"} for live delivery`) : tr(lang,`缺少：${emailMissing.join("、") || "待核验"}`,`Missing: ${emailMissing.join(", ") || "verification pending"}`)}</small></div>
      <div className={deliveryStatus.sms ? "ready" : "pending"}><span>{deliveryStatus.sms ? "✓" : "!"}</span><strong>SMS · Twilio</strong><small>{deliveryStatus.sms ? tr(lang,"已启用，可真实发送","Enabled for live delivery") : tr(lang,`缺少：${smsMissing.join("、") || "待核验"}`,`Missing: ${smsMissing.join(", ") || "verification pending"}`)}</small></div>
      <div className={deliveryStatus.ai ? "ready" : "pending"}><span>{deliveryStatus.ai ? "✓" : "!"}</span><strong>{tr(lang,"AI文案增强 · GLM优先","AI copy enrichment · GLM first")}</strong><small>{deliveryStatus.ai ? tr(lang,`已启用${aiProviderLabel}，模型：${deliveryStatus.aiModel || "glm-5.3"}`,`Enabled via ${aiProviderLabel}, model: ${deliveryStatus.aiModel || "glm-5.3"}`) : tr(lang,`缺少：${aiMissing.join("、") || "ZHIPU_API_KEY"}`,`Missing: ${aiMissing.join(", ") || "ZHIPU_API_KEY"}`)}</small></div>
    </div>
    <div className="config-section"><h3>{tr(lang,"邮件配置项：Resend 或 Gmail API 二选一","Email configuration: choose Resend or Gmail API")}</h3>{renderRows(emailRows)}</div>
    <div className="config-section"><h3>{tr(lang,"短信配置项","SMS configuration")}</h3>{renderRows(smsRows)}</div>
    <div className="config-section"><h3>{tr(lang,"AI增强配置项：智谱GLM优先 / DeepSeek备用","AI enrichment configuration: Zhipu GLM first / DeepSeek backup")}</h3>{renderRows(aiRows)}</div>
    <div className="config-help"><strong>{tr(lang,"配置方式","How to enable")}</strong><p>{tr(lang,"把以上字段发给管理员或Codex，由管理员写入站点生产环境变量；密钥只保存为Secret，不在页面展示。配置完成并重新发布后，推送弹窗的发送按钮会自动打开。","Send the fields above to an administrator or Codex. They must be saved as production environment variables; secrets are stored as secrets and never shown in the page. After configuration and redeployment, the push modal will automatically enable sending.")}</p></div>
    <div className="modal-actions"><button onClick={close}>{tr(lang,"关闭","Close")}</button><button className="primary" onClick={onTestPush}>{tr(lang,"去测试推送","Go test push")} →</button></div>
  </div></div>;
}

export function OpsConsole({ authUser, initialProfile, initialPending, initialManualOpportunities, initialLeadDistributions, initialSourceScanRuns, initialPushJobs, deliveryStatus }: { authUser: { name: string; email: string }; initialProfile: AppProfile | null; initialPending: PendingRegistrationView[]; initialManualOpportunities: Opportunity[]; initialLeadDistributions: LeadDistributionView[]; initialSourceScanRuns: SourceScanRunView[]; initialPushJobs: PushJobView[]; deliveryStatus: DeliveryStatus }) {
  const profile = initialProfile;
  const [pendingAccounts, setPendingAccounts] = useState<PendingRegistrationView[]>(initialPending);
  const [refreshingApprovals, setRefreshingApprovals] = useState(false);
  const [manualOpportunities, setManualOpportunities] = useState<Opportunity[]>(initialManualOpportunities);
  const [mtlAssets, setMtlAssets] = useState<MarketingContent[]>(marketingContentLibrary);
  const [leadDistributions, setLeadDistributions] = useState<LeadDistributionView[]>(initialLeadDistributions);
  const [sourceScanRuns, setSourceScanRuns] = useState<SourceScanRunView[]>(initialSourceScanRuns);
  const [pushJobs, setPushJobs] = useState<PushJobView[]>(initialPushJobs);
  const allOpportunities = useMemo(() => [...opportunities, ...manualOpportunities], [manualOpportunities]);
  const [lang, setLang] = useState<Lang>('zh');
  const [view, setView] = useState<View>(initialProfile?.identityType === "partner" ? "radar" : "command");
  const [selected, setSelected] = useState<Opportunity>(initialManualOpportunities[0] ?? opportunities[0]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareItems, setShareItems] = useState<Opportunity[]>([initialManualOpportunities[0] ?? opportunities[0]]);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportItems, setExportItems] = useState<Opportunity[]>([...opportunities, ...initialManualOpportunities]);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [dispatchItems, setDispatchItems] = useState<Opportunity[]>([initialManualOpportunities[0] ?? opportunities[0]]);
  const [manualImportOpen, setManualImportOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [bulkIds, setBulkIds] = useState<Set<string>>(() => new Set());
  const [search, setSearch] = useState('');
  const [country, setCountry] = useState('全部国家');
  const [priority, setPriority] = useState('全部优先级');
  const [industry, setIndustry] = useState('全部行业');
  const [toast, setToast] = useState('');
  const [goldenIds, setGoldenIds] = useState(() => new Set([...opportunities, ...initialManualOpportunities].filter(o=>o.golden).map(o=>o.id)));

  useEffect(() => { document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'; }, [lang]);
  useEffect(() => {
    if (profile?.identityType !== "huawei_admin" || profile.status !== "approved") return;
    let active = true;
    const refresh = () => { void getPendingRegistrations().then(rows => { if (active) setPendingAccounts(rows); }).catch(() => undefined); };
    const timer = window.setInterval(refresh, 30000);
    return () => { active = false; window.clearInterval(timer); };
  }, [profile?.identityType, profile?.status]);

  const showToast = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 2800); };
  const filtered = useMemo(() => allOpportunities.filter(item => (country==='全部国家'||item.country===country) && (priority==='全部优先级'||item.priority===priority) && (industry==='全部行业'||item.industry===industry) && (!search||`${item.title}${item.titleEn}${item.industry}`.toLowerCase().includes(search.toLowerCase()))).sort((a,b)=>priorityRank[a.priority]-priorityRank[b.priority]||b.score-a.score), [allOpportunities,country,priority,industry,search]);
  const openOpportunity = (item: Opportunity) => { setSelected(item); setDetailOpen(true); setView('radar'); };
  const openCountry = (countryValue: Country) => { setCountry(countryValue); setView('radar'); setDetailOpen(false); };
  const quickPush = (item: Opportunity) => { setSelected(item); setShareItems([item]); setShareOpen(true); };
  const pushHighPriority = () => { setShareItems(allOpportunities.filter(item => item.priority === "P0" || item.priority === "P1")); setShareOpen(true); };
  const quickDispatch = (item: Opportunity) => { setSelected(item); setDispatchItems([item]); setDispatchOpen(true); };
  const toggleBulk = (item: Opportunity) => { const next = new Set(bulkIds); if(next.has(item.id)){next.delete(item.id);}else{next.add(item.id);} setBulkIds(next); };
  const allFilteredSelected = filtered.length > 0 && filtered.every(item => bulkIds.has(item.id));
  const toggleFiltered = () => { const next = new Set(bulkIds); filtered.forEach(item => allFilteredSelected ? next.delete(item.id) : next.add(item.id)); setBulkIds(next); };
  const openBulkPush = () => { const items = allOpportunities.filter(item => bulkIds.has(item.id)); if(!items.length){showToast(tr(lang,'请先选择机会','Select opportunities first'));return;} setShareItems(items); setShareOpen(true); };
  const pushItems = (items: Opportunity[]) => { if(!items.length){showToast(tr(lang,'请先选择机会','Select opportunities first'));return;} setShareItems(items); setShareOpen(true); };
  const scanNow = async () => { try { const result = await runWeeklySourceScan({ trigger: "manual" }); setSourceScanRuns(current => [result.run, ...current].slice(0,10)); showToast(tr(lang,"扫描完成，已生成候选复核批次","Scan completed and review batch created")); } catch { showToast(tr(lang,"扫描失败：请确认管理员权限或数据库迁移","Scan failed: check admin permission or database migration")); } };
  const sendEmailPackage = async (audience: "internal" | "partner", recipient: string, items: Opportunity[], partners: Array<Pick<PartnerDirectoryEntry,"id"|"name"|"manager"|"managerEmail">>) => {
    try {
      const result = await recordPush({ audience, channel: "email", recipient, opportunityIds: items.map(item => item.id), partners, lang });
      if (!result.ok) {
        const notConfigured = result.code === "EMAIL_NOT_CONFIGURED";
        if (result.push) {
          const pushed = result.push;
          setPushJobs(current => [pushed, ...current.filter(row => row.id !== pushed.id)].slice(0, 80));
        }
        showToast(notConfigured ? tr(lang,"邮件服务尚未配置，请在系统设置中补齐Gmail或Resend凭据","Email service is not configured; complete Gmail or Resend setup in Settings") : deliveryFailureText(lang, result.code, result.providerMessage || result.push?.providerMessage));
        return;
      }
      if (result.push) {
        const pushed = result.push;
        setPushJobs(current => [pushed, ...current.filter(row => row.id !== pushed.id)].slice(0, 80));
      }
      showToast(tr(lang,`邮件已发送至 ${result.recipientCount} 个接收人`,`Email sent to ${result.recipientCount} recipient(s)`));
    } catch {
      showToast(tr(lang,"邮件发送失败或当前角色无权限","Email delivery failed or current role lacks permission"));
    }
  };
  const openBulkDispatch = () => { const items = allOpportunities.filter(item => bulkIds.has(item.id)); if(!items.length){showToast(tr(lang,'请先选择机会','Select opportunities first'));return;} setDispatchItems(items); setDispatchOpen(true); };
  const openExport = () => { const items=bulkIds.size?allOpportunities.filter(item=>bulkIds.has(item.id)):filtered; setExportItems(items); setExportOpen(true); };
  const acceptManualOpportunity = (item: Opportunity) => { setManualOpportunities(current=>[item,...current.filter(existing=>existing.id!==item.id)]); setSelected(item); setCountry('全部国家'); setPriority('全部优先级'); setIndustry('全部行业'); setSearch(''); setView('radar'); setDetailOpen(true); };
  const saveView = async () => { try { await saveOpportunityView({ name: `${country}-${industry}-${priority}`, filters: { country, industry, priority, search } }); showToast(tr(lang,'当前筛选视图已保存','Current filtered view saved')); } catch { showToast(tr(lang,'保存失败：请确认账户已获批','Save failed: confirm account approval')); } };
  const toggleGolden = () => { const next = new Set(goldenIds); if(next.has(selected.id)){next.delete(selected.id);showToast('已从金种子候选中移除');}else{next.add(selected.id);showToast('已提交华为管理员审批');} setGoldenIds(next); };
  const respondDistribution = async (row: LeadDistributionView, decision: "confirmed" | "returned") => {
    try {
      const result = await respondLeadDistribution({ id: row.id, decision, note: decision === "confirmed" ? "已确认接收，进入行业方案复核。" : "退回：请补充客户入口、预算或技术范围。" });
      setLeadDistributions(current => current.map(item => item.id === row.id ? result.distribution : item));
      showToast(decision === "confirmed" ? tr(lang,"已确认接收该线索","Lead confirmed") : tr(lang,"已退回该线索","Lead returned"));
    } catch {
      showToast(tr(lang,"操作失败：请确认账户权限","Action failed: confirm account permission"));
    }
  };
  const refreshApprovals = async () => {
    setRefreshingApprovals(true);
    try { setPendingAccounts(await getPendingRegistrations()); showToast(tr(lang,"账户审核待办已刷新","Approval queue refreshed")); }
    catch { showToast(tr(lang,"刷新失败：请确认管理员权限","Refresh failed: confirm administrator access")); }
    finally { setRefreshingApprovals(false); }
  };

  const canInternal = profile.identityType.startsWith('huawei_');
  const isPartnerUser = profile.identityType === "partner";
  const pendingDispatchCount = leadDistributions.filter(row => row.status === "pending").length;
  const visibleNav = isPartnerUser ? navItems.filter(item=>item.id === "radar") : profile.identityType === 'huawei_admin' ? navItems : navItems.filter(item=>item.id!=='approvals');
  const navBadge = (item: typeof navItems[number]) => item.id === "radar" ? String(allOpportunities.length) : item.id === "updates" ? String(releaseUpdateLog.length) : item.id === "mtl" ? String(mtlAssets.length) : item.id === "dispatch" ? String(pendingDispatchCount) : item.id === "approvals" ? String(pendingAccounts.length) : item.badge;

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><span>MT</span><div><strong>{tr(lang,PLATFORM_ZH,PLATFORM_EN)}</strong><small>{PLATFORM_EN}</small></div></div>
      <div className="pilot-chip"><i></i><span>Iraq Rep Office</span><em>MTL</em></div>
      <nav>{visibleNav.map(item => { const badge = navBadge(item); return <button key={item.id} className={view===item.id?'active':''} onClick={()=>{setView(item.id);setDetailOpen(false)}}><span>{item.glyph}</span>{lang==='zh'?item.zh:item.en}{badge&&<em>{badge}</em>}</button>; })}</nav>
      <div className="sidebar-bottom"><button onClick={()=>showToast(tr(lang,'方案目录：8个能力域已加载','Solution catalog: 8 domains loaded'))}><span>⌘</span>{tr(lang,"方案目录","Solution Catalog")}<em>8</em></button>{canInternal ? <button onClick={()=>setSettingsOpen(true)}><span>◌</span>{tr(lang,"系统设置","Settings")}<em className={deliveryStatus.email&&deliveryStatus.sms?'ok':'warn'}>{deliveryStatus.email&&deliveryStatus.sms?'✓':'!'}</em></button> : null}<div className="user-card"><span className="avatar">{profile.name.split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase()}</span><div><strong>{profile.name}</strong><small>{isPartnerUser ? tr(lang,'伙伴安全视图','Partner-safe view') : profile.identityType === "huawei_admin" ? tr(lang,'华为管理员视图','Huawei admin view') : tr(lang,'华为员工视图','Huawei staff view')}</small></div><em>{profile.identityType === "partner" ? "SAFE" : "OPEN"}</em></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu">☰</button><div className="breadcrumb"><span>{tr(lang,"Levant 区域","Levant Region")}</span><b>/</b><strong>{lang==='zh'?navItems.find(n=>n.id===view)?.zh:navItems.find(n=>n.id===view)?.en}</strong></div><div className="top-actions"><div className="global-search"><span>⌕</span><input aria-label={tr(lang,"全局搜索","Global search")} placeholder={tr(lang,"搜索项目、客户或伙伴","Search projects, customers or partners")} value={search} onChange={e=>setSearch(e.target.value)}/><kbd>⌘ K</kbd></div><button className="notification">◦<i></i></button><button className="language" aria-label={tr(lang,"切换为英文","Switch to Chinese")} onClick={()=>setLang(lang==='zh'?'en':'zh')}>{lang==='zh'?'中 / EN':'EN / 中'}</button></div></header>
      <div className="content">
        {view==='command'&&<CommandView lang={lang} items={allOpportunities} openOpportunity={openOpportunity} quickPush={quickPush} openCountry={openCountry}/>}
        {view==='radar'&&<div className="workspace-view radar-view"><div className="view-intro compact"><div><span className="section-kicker">OPPORTUNITY RADAR</span><h1>{isPartnerUser ? tr(lang,"伙伴线索视图","Partner Lead View") : tr(lang,"机会雷达","Opportunity Radar")}</h1><p>{isPartnerUser ? tr(lang,"仅展示伙伴可见的项目公开信息、联系人、采购入口和协同方案","Shows partner-visible public project information, contacts, procurement entry and collaboration solutions only") : tr(lang,"以证据、窗口与方案匹配为核心排序","Ranked by evidence, timing and solution fit")}</p></div><div className="radar-actions">{canInternal ? <button onClick={saveView}>{tr(lang,"保存视图","Save view")}</button> : null}{canInternal ? <button className="primary" onClick={()=>setManualImportOpen(true)}>＋ {tr(lang,"手工录入机会","Manual entry")}</button> : null}</div></div>{isPartnerUser ? <div className="partner-access-notice top"><strong>{tr(lang,"伙伴访问范围已限制","Partner access is restricted")}</strong><span>{tr(lang,"你可以查看线索公开全貌和协同动作，但内部经营评分、赢单判断、竞争策略、Owner、金种子和其他伙伴信息不会展示。","You can view the partner-safe lead overview and collaboration actions; internal scores, win assessment, competitive strategy, owner, golden seed and other partner information are not shown.")}</span></div> : null}<div className="filter-bar"><div className="inline-search"><span>⌕</span><input placeholder={tr(lang,"搜索机会","Search opportunities")} value={search} onChange={e=>setSearch(e.target.value)}/></div><select value={country} onChange={e=>setCountry(e.target.value)}><option value="全部国家">{tr(lang,"全部国家","All countries")}</option><option value="伊拉克">{localTerm(lang,"伊拉克")}</option><option value="约旦">{localTerm(lang,"约旦")}</option><option value="黎巴嫩">{localTerm(lang,"黎巴嫩")}</option></select>{canInternal ? <select value={priority} onChange={e=>setPriority(e.target.value)}><option value="全部优先级">{tr(lang,"全部优先级","All priorities")}</option><option>P0</option><option>P1</option><option>P2</option><option>WATCH</option></select> : null}<select value={industry} onChange={e=>setIndustry(e.target.value)}><option value="全部行业">{tr(lang,"全部行业","All industries")}</option>{Array.from(new Set(allOpportunities.map(x=>x.industry))).map(x=><option key={x} value={x}>{localTerm(lang,x)}</option>)}</select><button onClick={()=>showToast(tr(lang,'采购窗口筛选需导入完整里程碑后启用','Procurement window filter needs complete milestone data'))}>{tr(lang,"采购窗口","Procurement window")} ▾</button><span className="result-count">{filtered.length} {tr(lang,"个机会","opportunities")}</span>{canInternal ? <button className={`select-filtered ${allFilteredSelected?'active':''}`} onClick={toggleFiltered}>✓ {allFilteredSelected?tr(lang,"取消筛选结果","Clear filtered"):tr(lang,"选择筛选结果","Select filtered")}</button> : null}{canInternal ? <button className="bulk-dispatch" disabled={!bulkIds.size} onClick={openBulkDispatch}>⇄ {tr(lang,"批量分发","Bulk dispatch")} {bulkIds.size?`(${bulkIds.size})`:''}</button> : null}{canInternal ? <button className="bulk-push" disabled={!bulkIds.size} onClick={openBulkPush}>↗ {tr(lang,"批量推送","Bulk push")} {bulkIds.size?`(${bulkIds.size})`:''}</button> : null}</div><div className="radar-layout"><section className="panel radar-list-panel"><div className="list-labels"><span>{canInternal ? tr(lang,"优先级 / 项目","Priority / project") : tr(lang,"共享 / 项目","Shared / project")}</span><span>{canInternal ? tr(lang,"可服务空间","Addressable") : tr(lang,"项目金额","Project value")}</span><span>{tr(lang,"时间窗口","Window")}</span><span>{canInternal ? tr(lang,"评分","Score") : tr(lang,"范围","Scope")}</span></div><OpportunityList items={filtered} activeId={selected.id} selectedIds={bulkIds} lang={lang} canInternal={canInternal} onSelect={item=>{setSelected(item);setDetailOpen(true)}} onPush={quickPush} onToggle={toggleBulk}/></section>{detailOpen&&<DetailPanel item={{...selected,golden:goldenIds.has(selected.id)}} lang={lang} canInternal={canInternal} onShare={()=>quickPush(selected)} onDispatch={()=>quickDispatch(selected)} onGolden={toggleGolden}/>}</div></div>}
        {canInternal && view==='updates'&&<UpdatesView lang={lang}/>}
        {canInternal && view==='mtl'&&<MtlContentView lang={lang} assets={mtlAssets} opportunities={allOpportunities} onCreate={rows=>setMtlAssets(current=>[...rows,...current])} onToast={showToast} onOpenPush={pushHighPriority}/>}
        {canInternal && view==='dispatch'&&<DispatchView lang={lang} queue={leadDistributions} onToast={showToast} onRespond={respondDistribution}/>}
        {canInternal && view==='partners'&&<PartnersView lang={lang} items={allOpportunities} onToast={showToast} onPush={pushItems}/>}
        {canInternal && view==='email'&&<EmailPushView lang={lang} items={allOpportunities} canInternal={canInternal} deliveryStatus={deliveryStatus} pushJobs={pushJobs} onConfigure={()=>setSettingsOpen(true)} onSend={sendEmailPackage}/>}
        {view==='approvals'&&<ApprovalsView lang={lang} queue={pendingAccounts} onQueueChange={setPendingAccounts} onRefresh={refreshApprovals} refreshing={refreshingApprovals} onToast={showToast}/>}
        {canInternal && view==='imports'&&<ImportsView lang={lang} scanRuns={sourceScanRuns} onScanNow={scanNow} onManualImport={()=>setManualImportOpen(true)} onTemplateExport={openExport}/>}
      </div>
    </main>
    {canInternal && view==='radar'&&<button className="floating-export" onClick={openExport}>⇩ {tr(lang,"自定义导出","Custom export")}</button>}
    {canInternal && manualImportOpen&&<ManualImportModal lang={lang} close={()=>setManualImportOpen(false)} onCreated={acceptManualOpportunity} onToast={showToast}/>}
    {canInternal && dispatchOpen&&<LeadDispatchModal items={dispatchItems} lang={lang} close={()=>setDispatchOpen(false)} onCreated={rows=>{setLeadDistributions(current=>[...rows,...current]); setView("dispatch");}} onToast={showToast}/>}
    {exportOpen&&<ExportModal items={exportItems} lang={lang} canInternal={canInternal} close={()=>setExportOpen(false)} onToast={showToast}/>}
    {canInternal && shareOpen&&<ShareModal
      items={shareItems}
      lang={lang}
      canInternal={canInternal}
      deliveryStatus={deliveryStatus}
      close={()=>setShareOpen(false)}
      onConfigure={()=>setSettingsOpen(true)}
      onSend={async(audience,channel,recipient,partners)=>{
        try {
          const result = await recordPush({audience,channel,recipient,opportunityIds:shareItems.map(x=>x.id),partners,lang});
          if (!result.ok) {
            const notConfigured = result.code === 'EMAIL_NOT_CONFIGURED' || result.code === 'SMS_NOT_CONFIGURED';
            if (result.push) {
              const pushed = result.push;
              setPushJobs(current => [pushed, ...current.filter(row => row.id !== pushed.id)].slice(0, 80));
            }
            showToast(notConfigured?tr(lang,'发送服务尚未配置，请联系管理员','Delivery service is not configured; contact the administrator'):deliveryFailureText(lang, result.code, result.providerMessage || result.push?.providerMessage));
            return;
          }
          setShareOpen(false);
          if (result.push) {
            const pushed = result.push;
            setPushJobs(current => [pushed, ...current.filter(row => row.id !== pushed.id)].slice(0, 80));
          }
          showToast(tr(lang,`${channel==='email'?'邮件':'短信'}已发送至 ${result.recipientCount} 个接收人`,`${channel==='email'?'Email':'SMS'} sent to ${result.recipientCount} recipient(s)`));
        } catch {
          showToast(tr(lang,'发送失败或当前角色无权限','Delivery failed or current role lacks permission'));
        }
      }}
    />}
    {canInternal && settingsOpen&&<DeliverySettingsModal lang={lang} deliveryStatus={deliveryStatus} close={()=>setSettingsOpen(false)} onTestPush={()=>{setSettingsOpen(false); setView("radar"); setShareItems([selected]); setShareOpen(true);}}/>}
    {toast&&<div className="toast"><span>✓</span>{toast}</div>}
  </div>;
}
