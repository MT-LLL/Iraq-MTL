import { env } from "cloudflare:workers";
import { partnerDirectory, type Opportunity } from "./data";
import { localText as cleanLocalizedText, opportunityBrief as buildOpportunityBrief } from "./localization";

type Audience = "internal" | "partner";
type Channel = "email" | "sms";
type Lang = "zh" | "en";
type RuntimeEnv = Record<string, string | undefined>;
type PushDeliveryContext = { pushId?: string; ackToken?: string; slaDueAt?: string };
type AiProvider = "kimi" | "zhipu" | "deepseek";

export type NotificationConfiguration = { email: boolean; sms: boolean; ai: boolean; emailMissing: string[]; smsMissing: string[]; aiMissing: string[]; emailProvider?: "resend" | "gmail"; aiProvider?: AiProvider; aiModel?: string };
export type DeliveryResult = { provider: "resend" | "gmail" | "twilio"; messageIds: string[]; recipientCount: number };

export class NotificationError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = "NotificationError";
  }
}

function providerErrorMessage(provider: string, status: number, result: unknown) {
  const payload = result && typeof result === "object" ? result as Record<string, unknown> : {};
  const nestedError = payload.error && typeof payload.error === "object" ? payload.error as Record<string, unknown> : undefined;
  const error = typeof payload.error === "string" ? payload.error : typeof nestedError?.message === "string" ? nestedError.message : "";
  const description = typeof payload.error_description === "string" ? payload.error_description : typeof payload.message === "string" ? payload.message : "";
  const statusText = status ? `HTTP ${status}` : "HTTP error";
  return [provider, statusText, error, description].filter(Boolean).join(" · ");
}

function runtimeEnv(): RuntimeEnv {
  return env as unknown as RuntimeEnv;
}

export function getNotificationConfiguration(): NotificationConfiguration {
  const config = runtimeEnv();
  const resendMissing = [
    ["RESEND_API_KEY", config.RESEND_API_KEY],
    ["RESEND_FROM_EMAIL", config.RESEND_FROM_EMAIL],
  ].filter(([, value]) => !value).map(([key]) => key!);
  const gmailMissing = [
    ["GMAIL_CLIENT_ID", config.GMAIL_CLIENT_ID],
    ["GMAIL_CLIENT_SECRET", config.GMAIL_CLIENT_SECRET],
    ["GMAIL_REFRESH_TOKEN", config.GMAIL_REFRESH_TOKEN],
    ["GMAIL_FROM_EMAIL", config.GMAIL_FROM_EMAIL],
  ].filter(([, value]) => !value).map(([key]) => key!);
  const emailProvider = resendMissing.length === 0 ? "resend" : gmailMissing.length === 0 ? "gmail" : undefined;
  const emailMissing = emailProvider ? [] : [...resendMissing, ...gmailMissing];
  const smsMissing = [
    ["TWILIO_ACCOUNT_SID", config.TWILIO_ACCOUNT_SID],
    ["TWILIO_AUTH_TOKEN", config.TWILIO_AUTH_TOKEN],
    ["TWILIO_FROM_NUMBER 或 TWILIO_MESSAGING_SERVICE_SID", config.TWILIO_FROM_NUMBER || config.TWILIO_MESSAGING_SERVICE_SID],
  ].filter(([, value]) => !value).map(([key]) => key!);
  const aiProvider: AiProvider | undefined = config.MOONSHOT_API_KEY ? "kimi" : config.ZHIPU_API_KEY ? "zhipu" : config.DEEPSEEK_API_KEY ? "deepseek" : undefined;
  const aiMissing = aiProvider ? [] : ["MOONSHOT_API_KEY", "ZHIPU_API_KEY", "DEEPSEEK_API_KEY"];
  return {
    email: Boolean(emailProvider),
    sms: smsMissing.length === 0,
    ai: Boolean(aiProvider),
    emailMissing,
    smsMissing,
    aiMissing,
    emailProvider,
    aiProvider,
    aiModel: aiProvider === "kimi" ? config.MOONSHOT_MODEL || "kimi-k2.6" : aiProvider === "zhipu" ? config.ZHIPU_MODEL || "glm-5.3" : config.DEEPSEEK_MODEL || "deepseek-v4-flash",
  };
}

function splitRecipients(value: string): string[] {
  return [...new Set(value.split(/[,;\n]+/).map(item => item.trim()).filter(Boolean))];
}

function emailRecipients(value: string): string[] {
  const recipients = splitRecipients(value);
  if (!recipients.length || recipients.some(item => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(item) || item.toLowerCase().endsWith(".example"))) {
    throw new NotificationError("INVALID_EMAIL_RECIPIENT", "One or more email recipients are invalid.");
  }
  if (recipients.length > 20) throw new NotificationError("TOO_MANY_RECIPIENTS", "A push can contain at most 20 recipients.");
  return recipients;
}

function encodeMimeHeader(value: string): string {
  return /^[\x20-\x7e]*$/.test(value) ? value : `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.slice(index, index + chunkSize));
  }
  return btoa(binary);
}

function base64UrlEncode(value: string): string {
  return bytesToBase64(new TextEncoder().encode(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function smsRecipients(value: string): string[] {
  const recipients = splitRecipients(value).map(item => item.replace(/[\s().-]/g, ""));
  const placeholderNumbers = new Set(partnerDirectory.map(partner => partner.phone.replace(/[\s().-]/g, "")));
  if (!recipients.length || recipients.some(item => !/^\+[1-9]\d{7,14}$/.test(item) || placeholderNumbers.has(item))) {
    throw new NotificationError("INVALID_SMS_RECIPIENT", "SMS numbers must use E.164 format, for example +9647701234567.");
  }
  if (recipients.length > 20) throw new NotificationError("TOO_MANY_RECIPIENTS", "A push can contain at most 20 recipients.");
  return recipients;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] ?? character);
}

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
  内政: "Interior", 公共安全: "Public Safety", 前期研究: "Study", "在建（98%）": "Under Construction (98%)",
  线索发现: "Lead discovery", 公开招标: "Open tender", 主合同招标: "Main contract tender", 主合同资格预审: "Main contract prequalification",
  资格预审: "Pre-qualification", 融资确认: "Funding confirmation", 概念设计: "Concept design", 方案征询: "RFI", "EPC 招标": "EPC tender",
  核心: "Core", 优选: "Preferred", 认证: "Certified",
  实施主体: "Implementing entity", 资金路径: "Funding path", 方案匹配: "Solution fit", 合规检查: "Compliance",
  通过: "Passed", 待核实: "Verify", 风险: "Risk", 极高: "Very high", 高: "High", 中高: "Medium-high", 中: "Medium", 低: "Low",
  已确认: "Confirmed", 潜在类型: "Potential type", 待公布: "TBA", 待确认: "TBC",
};
const englishTextReplacements: Array<[RegExp, string]> = [
  [/待拆分ICT工作包/g, "ICT work package to be scoped"],
  [/官方公告/g, "official notice"],
  [/融资机构公告/g, "financing institution notice"],
  [/业主公告/g, "owner notice"],
  [/招标公告/g, "tender notice"],
  [/财政预算/g, "fiscal budget"],
  [/多边资金/g, "multilateral funding"],
  [/业主自筹/g, "owner-funded"],
  [/可服务空间/g, "addressable scope"],
  [/待核实/g, "to be verified"],
  [/政府/g, "government"],
  [/交通/g, "transport"],
  [/油气/g, "oil and gas"],
  [/电力/g, "power"],
  [/医疗/g, "healthcare"],
  [/商业/g, "commercial"],
  [/水务/g, "water"],
  [/军队/g, "military"],
  [/工业/g, "industry"],
  [/中高/g, "medium-high"],
  [/极高/g, "very high"],
  [/高/g, "high"],
  [/低/g, "low"],
  [/中/g, "medium"],
];

function tr(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function localTerm(lang: Lang, value: string) {
  return lang === "zh" ? (industryZh[value] ?? value) : (termEn[value] ?? countryEn[value] ?? value);
}

function languageText(lang: Lang, value: string) {
  if (lang === "zh") return value;
  let text = localTerm(lang, value);
  englishTextReplacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  return text.replace(/；/g, "; ").replace(/：/g, ": ").replace(/，/g, ", ").replace(/。/g, ". ");
}

function partnerSafePlay(item: Opportunity, lang: Lang) {
  const lead = tr(
    lang,
    "建议由伙伴先确认客户入口、投标资格、交付边界与本地服务资源；华为侧可配合开展方案澄清、产品组合建议和技术交流。",
    "Recommended partner actions: confirm customer access, bid qualification, delivery boundary and local service resources. Huawei can support solution clarification, product-bundle recommendations and technical workshops."
  );
  const milestone = tr(lang, "关键公开节点", "Key public milestone");
  return `${lead} ${milestone}${lang === "zh" ? "：" : ": "}${languageText(lang, item.deadline)}.`;
}

function partnerSafeInsight(item: Opportunity, lang: Lang) {
  return tr(
    lang,
    `${item.title}：请伙伴优先围绕公开项目范围、关键节点、资金状态、采购入口和本地交付条件开展客户触达；内部经营评分、赢单判断和竞争策略已脱敏。`,
    `${item.titleEn}: please use the public scope, key milestone, funding status, procurement entry and local delivery requirements for customer engagement. Internal scoring, win assessment and competitive strategy are redacted.`
  );
}

function outlookSectionTitle(label: string) {
  return `<tr><td colspan="2" style="padding:16px 22px 7px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;line-height:18px;font-weight:bold;color:#0f827b;letter-spacing:1px;text-transform:uppercase;border-top:1px solid #e4eeea">${escapeHtml(label)}</td></tr>`;
}

function outlookTextBlock(text: string) {
  return `<tr><td colspan="2" style="padding:0 22px 14px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:14px;line-height:23px;color:#314f57">${escapeHtml(text)}</td></tr>`;
}

function outlookMetricTable(rows: Array<[string, string]>) {
  const cells = rows.map(([label, value]) => `<td width="25%" valign="top" style="padding:9px 10px;border:1px solid #dce9e5;background-color:#f7fbfa;font-family:Arial,'Microsoft YaHei',sans-serif">
    <p style="margin:0 0 5px;font-size:11px;line-height:15px;color:#6d8288">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:15px;line-height:20px;font-weight:bold;color:#143946">${escapeHtml(value)}</p>
  </td>`).join("");
  return `<tr><td colspan="2" style="padding:4px 22px 12px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr>${cells}</tr></table></td></tr>`;
}

function outlookKeyValueRows(rows: Array<[string, string]>) {
  return rows.map(([label, value]) => `<tr>
    <td width="28%" valign="top" style="padding:8px 10px;border:1px solid #e4eeea;background-color:#f7fbfa;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;line-height:18px;color:#6d8288">${escapeHtml(label)}</td>
    <td valign="top" style="padding:8px 10px;border:1px solid #e4eeea;background-color:#ffffff;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:13px;line-height:20px;color:#234a54">${escapeHtml(value)}</td>
  </tr>`).join("");
}

function outlookBulletRows(items: string[]) {
  const rows = items.slice(0, 5).map(item => `<tr>
    <td width="18" valign="top" style="padding:0 0 7px 22px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:15px;line-height:21px;color:#0f827b">•</td>
    <td valign="top" style="padding:0 22px 7px 0;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:13px;line-height:21px;color:#314f57">${escapeHtml(item)}</td>
  </tr>`).join("");
  return `<tr><td colspan="2"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${rows}</table></td></tr>`;
}

function outlookSolutionRows(solutionItems: Array<{ domain: string; name: string; fit: number; role: string }>) {
  return solutionItems.map(solution => `<tr>
    <td width="24%" valign="top" style="padding:9px 10px;border:1px solid #e4eeea;background-color:#f7fbfa;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;line-height:18px;font-weight:bold;color:#0f827b">${escapeHtml(solution.domain)}</td>
    <td width="36%" valign="top" style="padding:9px 10px;border:1px solid #e4eeea;background-color:#ffffff;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:13px;line-height:20px;font-weight:bold;color:#143946">${escapeHtml(solution.name)}</td>
    <td width="10%" valign="top" align="center" style="padding:9px 10px;border:1px solid #e4eeea;background-color:#ffffff;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:13px;line-height:20px;font-weight:bold;color:#0f827b">${solution.fit}%</td>
    <td valign="top" style="padding:9px 10px;border:1px solid #e4eeea;background-color:#ffffff;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;line-height:19px;color:#5d747a">${escapeHtml(solution.role)}</td>
  </tr>`).join("");
}

function outlookOpportunityCard(item: Opportunity, audience: Audience, lang: Lang, context: PushDeliveryContext, ackUrl: string, siteUrl: string) {
  const brief = buildOpportunityBrief(item, lang);
  const contact = brief.contactDetails;
  const colon = lang === "zh" ? "：" : ": ";
  const title = brief.title;
  const milestone = cleanLocalizedText(lang, item.keyProjectMilestones || item.deadline, lang === "zh" ? "项目里程碑待确认。" : "Project milestones to be confirmed.");
  const background = cleanLocalizedText(lang, item.summary, lang === "zh" ? "项目背景待补充。" : "Project background to be completed.");
  const news = cleanLocalizedText(lang, item.newsAndUpdates || "", lang === "zh" ? "暂无已记录的项目进展。" : "No project updates recorded.");
  const latestNews = cleanLocalizedText(lang, item.latestNews || "", lang === "zh" ? "暂无最新新闻。" : "No latest news recorded.");
  // Use the bilingual GPT analysis already persisted in D1; email delivery never calls a model API.
  const savedAnalysis = item.opportunityAnalysis;
  const localizedAnalysis = savedAnalysis?.bilingualAnalysis?.[lang];
  const analysisSummary = localizedAnalysis?.demandSummary || savedAnalysis?.demandSummary || "";
  const analysisRationale = localizedAnalysis?.scoreRationale || savedAnalysis?.scoreRationale || "";
  const analysisRisks = localizedAnalysis?.risks?.length ? localizedAnalysis.risks : savedAnalysis?.risks || [];
  const analysisActions = localizedAnalysis?.nextActions?.length ? localizedAnalysis.nextActions : savedAnalysis?.nextActions || [];
  const factsVsInference = localizedAnalysis?.factsVsInference || savedAnalysis?.factsVsInference || "";
  const analysisSolutionNames = (localizedAnalysis?.recommendedHuaweiSolutions?.length ? localizedAnalysis.recommendedHuaweiSolutions : savedAnalysis?.recommendedHuaweiSolutions || []).filter(Boolean);
  const analysisSolutions = analysisSolutionNames.length > 0;
  const solutionSource = analysisSolutions
    ? analysisSolutionNames.map(name => ({ domain: tr(lang, "GPT分析推荐", "GPT recommendation"), name, fit: audience === "internal" ? (savedAnalysis?.fitScore ?? 0) : 0, role: analysisRationale || tr(lang, "依据已保存的双语GPT分析推荐。", "Recommended from the saved bilingual GPT analysis.") }))
    : brief.solutionItems;
  const allContacts = (item.contacts?.length ? item.contacts : [{ role: contact.role, company: contact.company, companyPhone: contact.companyPhone, email: contact.email, name: contact.name, title: contact.title, phone: contact.phone, source: contact.source }]).filter(entry => [entry.name, entry.title, entry.company, entry.email, entry.phone, entry.companyPhone, entry.role].some(Boolean));
  const solutionRows = solutionSource.length
    ? solutionSource.map(solution => `<tr><td width="22%" style="padding:9px;border:1px solid #e4eeea;background:#f7fbfa;font-size:12px;font-weight:bold;color:#0f827b">${escapeHtml(solution.domain)}</td><td width="32%" style="padding:9px;border:1px solid #e4eeea;font-size:13px;font-weight:bold;color:#143946">${escapeHtml(solution.name)}</td><td width="10%" align="center" style="padding:9px;border:1px solid #e4eeea;font-size:12px;font-weight:bold;color:#0f827b">${solution.fit}%</td><td style="padding:9px;border:1px solid #e4eeea;font-size:12px;line-height:19px;color:#526b72">${escapeHtml(solution.role)}</td></tr>`).join("")
    : `<tr><td colspan="4" style="padding:10px;border:1px solid #e4eeea;color:#60777d">${tr(lang, "当前尚无明确方案匹配，需进一步核实项目技术范围。", "No confirmed solution mapping yet; validate the technical scope.")}</td></tr>`;
  const contactCards = allContacts.length ? allContacts.map((entry, index) => {
    const lines = [
      entry.role ? tr(lang, "角色", "Role") + colon + entry.role : "",
      entry.company ? tr(lang, "公司", "Company") + colon + entry.company : "",
      (entry.name || entry.title) ? tr(lang, "姓名 / 职位", "Name / title") + colon + [entry.name, entry.title].filter(Boolean).join(" · ") : "",
      entry.email ? tr(lang, "邮箱", "Email") + colon + entry.email : "",
      entry.phone ? tr(lang, "电话", "Phone") + colon + entry.phone : "",
      entry.companyPhone ? tr(lang, "机构电话", "Organization phone") + colon + entry.companyPhone : "",
      entry.source ? tr(lang, "来源", "Source") + colon + entry.source : "",
    ].filter(Boolean).map(line => escapeHtml(line)).join("<br/>");
    const heading = escapeHtml([entry.name, entry.title].filter(Boolean).join(" · ") || entry.company || tr(lang, "联系人", "Contact"));
    return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:separate;border-spacing:0;margin:0 0 10px;border:1px solid #dce9e5;background:#fbfdfc;border-radius:12px;overflow:hidden"><tr><td style="width:42px;background:#eef8f5;color:#0f827b;text-align:center;font-weight:bold;font-size:14px">' + (index + 1) + '</td><td style="padding:11px 13px"><div style="font-size:12px;font-weight:bold;color:#123f49;margin-bottom:5px">' + heading + '</div><div style="font-size:11px;line-height:1.65;color:#587078">' + lines + '</div></td></tr></table>';
  }).join("") : outlookTextBlock(tr(lang, "暂无完整联系人信息，请通过项目来源继续补齐。", "No complete contact information is available; continue validation from project sources."));
  const internalRows = audience === "internal" ? `${outlookSectionTitle(tr(lang, "内部经营信息", "Internal sales information"))}<tr><td colspan="2" style="padding:0 18px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">${outlookKeyValueRows([
    [tr(lang, "内部评分", "Internal score"), `${item.score}/100 · ${item.priority} · ${tr(lang, "赢单判断", "Win assessment")} ${localTerm(lang, item.win)}`],
    [tr(lang, "机会Owner", "Opportunity owner"), item.owner],
    [tr(lang, "竞争态势", "Competitive landscape"), item.competitors.map(competitor => lang === "zh" ? `${competitor.name}（${competitor.note}）` : `${cleanLocalizedText(lang, competitor.name, "Potential competitor")} (${cleanLocalizedText(lang, competitor.type, "Potential type")}${competitor.note ? `: ${cleanLocalizedText(lang, competitor.note, "details to be verified")}` : ""})`).join(lang === "zh" ? "；" : "; ")],
    [tr(lang, "风险与补齐项", "Risks / gaps"), brief.risk],
    [tr(lang, "下一步动作", "Next actions"), brief.nextActions.join(lang === "zh" ? "；" : "; ")],
  ])}</table></td></tr>` : "";
  const partnerCta = audience === "partner" ? `<tr><td colspan="2" style="padding:14px 18px 18px"><a href="${escapeHtml(ackUrl)}" style="display:inline-block;padding:10px 16px;background:#0f827b;color:#fff;text-decoration:none;font-size:13px;font-weight:bold">${tr(lang, "打开详情并确认收到", "Open details and confirm receipt")}</a></td></tr>` : `<tr><td colspan="2" style="padding:14px 18px 18px"><a href="${escapeHtml(`${siteUrl}/opportunity-detail?id=${encodeURIComponent(item.id)}&lang=${lang}`)}" style="color:#8a1f1f;font-weight:bold">${tr(lang, "打开该机会点独立详情", "Open this opportunity detail")}</a></td></tr>`;
  const detailSections = `
    ${outlookSectionTitle(tr(lang, "GPT核心推断", "GPT core assessment"))}${outlookTextBlock(analysisSummary || tr(lang, "该机会点尚未保存完整的双语GPT分析。", "A complete bilingual GPT analysis has not yet been saved for this opportunity."))}
    ${analysisRationale ? outlookSectionTitle(tr(lang, "评分依据与匹配逻辑", "Scoring rationale and fit logic")) + outlookTextBlock(analysisRationale) : ""}
    ${outlookSectionTitle(tr(lang, analysisSolutions ? "GPT推荐的华为方案" : "华为方案匹配", analysisSolutions ? "Huawei solutions recommended by GPT" : "Huawei solution fit"))}<tr><td colspan="2" style="padding:0 18px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr><td style="padding:8px;border:1px solid #d4e4df;background:#eef8f5;font-size:11px;font-weight:bold;color:#0f827b">${tr(lang, "方案来源", "Source")}</td><td style="padding:8px;border:1px solid #d4e4df;background:#eef8f5;font-size:11px;font-weight:bold;color:#0f827b">${tr(lang, "推荐方案", "Recommended solution")}</td><td style="padding:8px;border:1px solid #d4e4df;background:#eef8f5;font-size:11px;font-weight:bold;color:#0f827b">${tr(lang, "匹配", "Fit")}</td><td style="padding:8px;border:1px solid #d4e4df;background:#eef8f5;font-size:11px;font-weight:bold;color:#0f827b">${tr(lang, "项目作用 / 依据", "Project role / rationale")}</td></tr>${solutionRows}</table></td></tr>
    ${factsVsInference ? outlookSectionTitle(tr(lang, "事实与推断", "Facts vs. inference")) + outlookTextBlock(factsVsInference) : ""}
    ${analysisRisks.length ? outlookSectionTitle(tr(lang, "风险与待核实事项", "Risks and items to verify")) + outlookBulletRows(analysisRisks) : ""}
    ${outlookSectionTitle(tr(lang, "联系人信息与采购入口", "Contacts and procurement entry"))}<tr><td colspan="2" style="padding:0 18px 14px">${contactCards}<div style="margin-top:8px;padding:10px 12px;background:#f6faf9;border:1px solid #e0eee9;border-radius:10px;font-size:11px;line-height:1.6;color:#587078"><b>${tr(lang, "采购入口", "Procurement entry")}${colon}</b>${escapeHtml(contact.procurementEntry)}<br/><b>${tr(lang, "联系人状态", "Contact status")}${colon}</b>${escapeHtml(contact.status)}<br/><b>${tr(lang, "补齐动作", "Completion action")}${colon}</b>${escapeHtml(contact.completionAction)}</div></td></tr>
    ${outlookSectionTitle(tr(lang, "项目进展与里程碑", "Project progress and milestones"))}${outlookTextBlock(milestone)}
    ${outlookSectionTitle(tr(lang, "新闻与进展更新", "News and progress updates"))}${outlookTextBlock(news)}
    ${outlookSectionTitle(tr(lang, "最新新闻", "Latest news"))}${outlookTextBlock(latestNews)}
    ${outlookSectionTitle(tr(lang, "下一步动作", "Next actions"))}${outlookBulletRows(analysisActions.length ? analysisActions : brief.nextActions)}
    ${internalRows}${partnerCta}`;
  const summary = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:#fff;border:1px solid #d8e6e2"><tr><td width="34" style="padding:12px 8px;text-align:center;font-size:12px;color:#0f827b;font-weight:bold">${escapeHtml(item.priority)}</td><td style="padding:12px 8px;font-size:13px;line-height:19px;color:#143946"><b>${escapeHtml(title)}</b><br/><span style="font-size:11px;color:#637a80">${escapeHtml(brief.meta)} · ${tr(lang, "金额", "Value")}: ${escapeHtml(brief.value)} · ${tr(lang, "节点", "Milestone")}: ${escapeHtml(brief.deadline)}</span></td><td width="86" style="padding:12px 8px;text-align:right;font-size:11px;color:#0f827b;font-weight:bold">${tr(lang, "展开详情", "Expand")}&nbsp;⌄</td></tr></table>`;
  const detailUrl = audience === "partner" ? `${ackUrl}&opportunity=${encodeURIComponent(item.id)}` : `${siteUrl}/opportunity-detail?id=${encodeURIComponent(item.id)}&lang=${lang}`;
  return `<a href="${escapeHtml(detailUrl)}" style="display:block;margin:0 0 8px;padding:12px 14px;border:1px solid #d8e6e2;background:#fff;color:#143946;text-decoration:none"><span style="display:inline-block;width:30px;color:#0f827b;font-weight:bold">${escapeHtml(item.priority)}</span><b>${escapeHtml(title)}</b><br/><span style="padding-left:30px;font-size:11px;line-height:18px;color:#637a80">${escapeHtml(brief.meta)} · ${tr(lang, "金额", "Value")}: ${escapeHtml(brief.value)} · ${tr(lang, "节点", "Milestone")}: ${escapeHtml(brief.deadline)} · ${tr(lang, "点击查看详情", "Click to view details")} ›</span></a>`;
}

export function buildContent(opportunities: Opportunity[], audience: Audience, actorName: string, lang: Lang, context: PushDeliveryContext = {}) {
  const config = runtimeEnv();
  const siteUrl = (config.MSSD_SITE_URL || "https://iraq-mtl.lihui9329.workers.dev").trim().replace(/\/+$/, "");
  const platformZh = "伊拉克代表处面向伙伴MTL营销作战平台";
  const platformEn = "Iraq Partner MTL Marketing War-room";
  const ackUrl = audience === "partner" && context.pushId && context.ackToken ? `${siteUrl}/partner-ack?push=${encodeURIComponent(context.pushId)}&token=${encodeURIComponent(context.ackToken)}&lang=${lang}` : siteUrl;
  const firstTitle = opportunities[0] ? (lang === "zh" ? opportunities[0].title : opportunities[0].titleEn) : tr(lang, "机会清单", "Opportunity list");
  const colon = lang === "zh" ? "：" : ": ";
  const subject = lang === "zh"
    ? `${audience === "internal" ? "[内部经营]" : "[伙伴协同]"} ${firstTitle}${opportunities.length > 1 ? ` 等${opportunities.length}个机会` : ""}`
    : `${audience === "internal" ? "[Internal Sales]" : "[Partner Collaboration]"} ${firstTitle}${opportunities.length > 1 ? ` and ${opportunities.length - 1} more opportunities` : ""}`;
  const partnerSafeBanner = tr(lang, "伙伴安全版机会包", "Partner-safe opportunity brief");
  const fieldHtml = (label: string, value: string) => `<p style="margin:0 0 6px"><b style="color:#234a54">${escapeHtml(label)}${colon}</b>${escapeHtml(value)}</p>`;
  const cards = opportunities.map(item => {
    const brief = buildOpportunityBrief(item, lang);
    const contact = brief.contactDetails;
    const factRows = [
      [tr(lang, "项目金额", "Project value"), brief.value],
      [tr(lang, "关键节点", "Key milestone"), brief.deadline],
      [tr(lang, "资金状态", "Funding"), brief.funding],
      [tr(lang, "来源", "Source"), brief.source],
    ].map(([label, value]) => fieldHtml(label, value)).join("");
    const contactRows = [
      [tr(lang, "首选触达方式", "Preferred contact method"), `${contact.preferredMethodLabel}: ${contact.preferredMethod}`],
      [tr(lang, "角色", "Role"), contact.role],
      [tr(lang, "联系人", "Contact"), contact.name],
      [tr(lang, "职位", "Title"), contact.title],
      [tr(lang, "公司", "Company"), contact.company],
      [tr(lang, "邮箱", "Email"), contact.email],
      [tr(lang, "手机号", "Mobile"), contact.phone],
      [tr(lang, "机构电话", "Institution phone"), contact.companyPhone],
      [tr(lang, "联系人来源", "Contact source"), contact.source],
      [tr(lang, "采购入口", "Procurement entry"), contact.procurementEntry],
    ].map(([label, value]) => fieldHtml(label, value)).join("");
    const productRows = brief.solutionItems.map(solution => `<li style="margin:0 0 6px"><b>${escapeHtml(solution.domain)} · ${escapeHtml(solution.name)} (${solution.fit}%)</b><br/><span style="color:#5d747a">${escapeHtml(solution.role)}</span></li>`).join("");
    const actionRows = brief.nextActions.map(action => `<li style="margin:0 0 4px">${escapeHtml(action)}</li>`).join("");
    return outlookOpportunityCard(item, audience, lang, context, ackUrl, siteUrl);
  }).join("");
  const partnerPackageStats = [
    [tr(lang, "机会点", "Opportunities"), String(opportunities.length)],
    [tr(lang, "高优先级", "P0/P1"), String(opportunities.filter(item => item.priority === "P0" || item.priority === "P1").length)],
    [tr(lang, "匹配方案", "Solutions"), String(new Set(opportunities.flatMap(item => buildOpportunityBrief(item, lang).solutionItems.map(solution => solution.domain))).size)],
    [tr(lang, "回执SLA", "Receipt SLA"), context.slaDueAt ? new Date(context.slaDueAt).toLocaleDateString(lang === "zh" ? "zh-CN" : "en-US") : tr(lang, "7天", "7 days")],
  ].map(([label, value]) => `<td width="25%" valign="top" style="padding:10px;border:1px solid #2c6972;background-color:#123f49;font-family:Arial,'Microsoft YaHei',sans-serif">
    <p style="margin:0 0 5px;font-size:10px;line-height:14px;color:#b8e5df;font-weight:bold;letter-spacing:1px">${escapeHtml(label)}</p>
    <p style="margin:0;font-size:22px;line-height:26px;color:#ffffff;font-weight:bold">${escapeHtml(value)}</p>
  </td>`).join("");
  const heroNote = audience === "partner"
    ? tr(lang, "伙伴安全版：公开项目信息、关键里程碑、华为方案匹配、联系人/采购入口和下一步动作已结构化呈现；内部评分、赢单判断、竞争策略、Owner、其他伙伴信息和华为可服务空间已脱敏。", "Partner-safe view: public project information, milestones, Huawei solution mapping, contact/procurement entry and next actions are structured; internal score, win assessment, competitive strategy, owner, other partners and Huawei addressable scope are redacted.")
    : tr(lang, "内部经营版：包含项目分析、公开证据、华为产品方案匹配、联系人缺口、内部评分、竞争态势和下一步Owner；邮件中仍不外显华为可服务空间。", "Internal sales view: includes project analysis, public evidence, Huawei solution mapping, contact gaps, internal score, competitive landscape and next owners; Huawei addressable scope remains redacted from email.");
  const footerNote = audience === "partner"
    ? tr(lang, "本邮件为伙伴安全版，请仅用于项目协同和跟进。", "This partner-safe email is for project collaboration and follow-up only.")
    : tr(lang, "本邮件含内部经营信息，请勿外转；华为可服务空间已从邮件中脱敏。", "This email contains internal sales information. Do not forward externally; Huawei addressable scope is redacted from email delivery.");
  const html = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" bgcolor="#eef4f2" style="border-collapse:collapse;background-color:#eef4f2">
    <tr>
      <td align="center" style="padding:24px 10px">
        <table role="presentation" width="760" cellspacing="0" cellpadding="0" style="width:760px;max-width:760px;border-collapse:collapse">
          <tr>
            <td bgcolor="${audience === "internal" ? "#6f1515" : "#062d39"}" style="padding:26px 28px;font-family:Arial,'Microsoft YaHei',sans-serif;color:#ffffff">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 10px;font-size:11px;line-height:15px;font-weight:bold;color:#b8e5df;letter-spacing:2px">IRAQ PARTNER MTL MARKETING WAR-ROOM</p>
                    <h1 style="margin:0 0 12px;font-size:28px;line-height:36px;color:#ffffff;font-weight:bold">${escapeHtml(subject)}</h1>
                    <p style="margin:0;font-size:14px;line-height:23px;color:#d8eeea">${escapeHtml(heroNote)}</p>
                  </td>
                  <td width="72" align="right" valign="top">
                    <table role="presentation" width="56" cellspacing="0" cellpadding="0" bgcolor="#ffffff" style="border-collapse:collapse;background-color:#ffffff"><tr><td height="56" align="center" valign="middle" style="font-family:Arial,'Microsoft YaHei',sans-serif;font-size:20px;font-weight:bold;color:#0f827b">MTL</td></tr></table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px"><tr>${partnerPackageStats}</tr></table>
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin-top:18px"><tr>
                <td bgcolor="#ffffff" style="padding:12px 18px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:14px;line-height:18px;font-weight:bold"><a href="${escapeHtml(audience === "partner" ? ackUrl : siteUrl)}" style="color:${audience === "internal" ? "#6f1515" : "#0b6f69"};text-decoration:none">${audience === "partner" ? tr(lang, "打开线索并确认收到", "Open leads and confirm receipt") : tr(lang, "打开MTL营销作战平台", "Open MTL marketing war-room")}</a></td>
                <td style="padding-left:12px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:12px;line-height:18px;color:#b8e5df">${audience === "partner" ? tr(lang, "打开即记录阅读，确认后更新SLA。", "Open is tracked; confirmation updates SLA.") : tr(lang, "内部经营信息，请勿外转。", "Internal sales information; do not forward externally.")}</td>
              </tr></table>
            </td>
          </tr>
          <tr><td style="padding:18px 0 0">${cards}</td></tr>
          <tr>
            <td bgcolor="#ffffff" align="center" style="padding:18px 22px;border:1px solid #d8e6e2;font-family:Arial,'Microsoft YaHei',sans-serif">
              <p style="margin:0 0 12px;font-size:13px;line-height:20px;color:#60797f">${audience === "partner" ? tr(lang, "点击上方按钮后，后台会记录打开时间；提交确认后，SLA状态会变更为已确认。", "After clicking the button, the backend records open time; after confirmation, the SLA status changes to confirmed.") : tr(lang, "请在平台内继续更新Owner、行动项、竞争态势和伙伴分工。", "Please continue updating owners, actions, competitive status and partner work split in the platform.")}</p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="border-collapse:collapse"><tr><td bgcolor="${audience === "internal" ? "#6f1515" : "#0f827b"}" style="padding:11px 18px;font-family:Arial,'Microsoft YaHei',sans-serif;font-size:13px;font-weight:bold"><a href="${escapeHtml(siteUrl)}" style="color:#ffffff;text-decoration:none">${tr(lang, "进入MTL营销作战平台", "Open MTL marketing war-room")}</a></td></tr></table>
              <p style="margin:14px 0 0;font-size:12px;line-height:18px;color:#73858a">${escapeHtml(tr(lang, `由 ${actorName} 从${platformZh}发送。`, `Sent by ${actorName} from ${platformEn}. `))}${escapeHtml(footerNote)}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
  const textRows = opportunities.map((item, index) => {
    const brief = buildOpportunityBrief(item, lang);
    const contact = brief.contactDetails;
    const detailsUrl = audience === "partner" ? ackUrl : siteUrl;
    const internal = audience === "internal" ? `\n${tr(lang, "内部评分", "Internal score")}${colon}${item.score}/100 · ${item.priority}\n${tr(lang, "负责人", "Owner")}${colon}${item.owner}` : "";
    return `${index + 1}. ${brief.title} [${item.id}]\n${brief.meta}\n${tr(lang, "项目金额", "Project value")}${colon}${brief.value} · ${tr(lang, "关键节点", "Key milestone")}${colon}${brief.deadline}\n${tr(lang, "项目背景", "Project background")}${colon}${cleanLocalizedText(lang, item.summary, "To be completed")}\n${tr(lang, "华为匹配方案", "Huawei solution fit")}${colon}${brief.solutions}\n${tr(lang, "联系人", "Contact")}${colon}${contact.name} · ${contact.email} · ${contact.phone}\n${tr(lang, "项目里程碑", "Project milestones")}${colon}${cleanLocalizedText(lang, item.keyProjectMilestones || item.deadline, "To be confirmed")}\n${tr(lang, "查看完整详情", "View full details")}${colon}${detailsUrl}${internal}`;
  });
  const text = `${subject}\n\n${textRows.join("\n\n")}\n\n${siteUrl}`;
  const sms = `${audience === "internal" ? tr(lang, "[MSSD内部]", "[MSSD Internal]") : tr(lang, "[MSSD伙伴]", "[MSSD Partner]")} ${opportunities.slice(0, 5).map(item => {
    const brief = buildOpportunityBrief(item, lang);
    const contact = brief.contactDetails;
    const contactText = `${tr(lang, "触达", "contact ")}${contact.preferredMethodLabel}: ${contact.preferredMethod}`;
    return audience === "internal"
      ? `${item.id} ${brief.title} ${item.priority}/${item.score}${tr(lang, "分", " pts")} ${tr(lang, "截止", "due ")}${languageText(lang, item.deadline)} ${contactText}`
      : `${item.id} ${brief.title} ${tr(lang, "截止", "due ")}${languageText(lang, item.deadline)} ${contactText} ${tr(lang, "确认", "confirm ")}${ackUrl}`;
  }).join(lang === "zh" ? "；" : "; ")}${opportunities.length > 5 ? tr(lang, `；另${opportunities.length - 5}项`, `; ${opportunities.length - 5} more`) : ""} ${siteUrl}`;
  return { subject, html, text, sms };
}

async function sendEmail(recipientValue: string, content: ReturnType<typeof buildContent>, audience: Audience): Promise<DeliveryResult> {
  const config = runtimeEnv();
  const recipients = emailRecipients(recipientValue);
  if (audience === "internal" && recipients.some(recipient => !recipient.toLowerCase().endsWith("@huawei.com"))) throw new NotificationError("INTERNAL_RECIPIENT_FORBIDDEN", "Internal email recipients must use an authorized @huawei.com address.");
  if (config.RESEND_API_KEY && config.RESEND_FROM_EMAIL) return sendResendEmail(config, recipients, content);
  if (config.GMAIL_CLIENT_ID && config.GMAIL_CLIENT_SECRET && config.GMAIL_REFRESH_TOKEN && config.GMAIL_FROM_EMAIL) return sendGmailEmail(config, recipients, content);
  throw new NotificationError("EMAIL_NOT_CONFIGURED", "Email delivery is not configured. Configure Resend or Gmail API credentials.");
}

async function sendResendEmail(config: RuntimeEnv, recipients: string[], content: ReturnType<typeof buildContent>): Promise<DeliveryResult> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: config.RESEND_FROM_EMAIL, to: recipients, reply_to: config.RESEND_REPLY_TO || "lihui302@huawei.com", subject: content.subject, html: content.html, text: content.text }),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !result.id) throw new NotificationError("EMAIL_PROVIDER_ERROR", providerErrorMessage("Resend", response.status, result));
  return { provider: "resend", messageIds: [result.id], recipientCount: recipients.length };
}

async function getGmailAccessToken(config: RuntimeEnv): Promise<string> {
  const form = new URLSearchParams({
    client_id: config.GMAIL_CLIENT_ID!,
    client_secret: config.GMAIL_CLIENT_SECRET!,
    refresh_token: config.GMAIL_REFRESH_TOKEN!,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const result = await response.json().catch(() => ({})) as { access_token?: string; error?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new NotificationError("GMAIL_TOKEN_ERROR", providerErrorMessage("Gmail token", response.status, result));
  return result.access_token;
}

async function sendGmailEmail(config: RuntimeEnv, recipients: string[], content: ReturnType<typeof buildContent>): Promise<DeliveryResult> {
  const accessToken = await getGmailAccessToken(config);
  const fromEmail = config.GMAIL_FROM_EMAIL!;
  const boundary = `mssd-${crypto.randomUUID()}`;
  const headers = [
    `From: ${encodeMimeHeader("Iraq MSSD")} <${fromEmail}>`,
    `To: ${recipients.join(", ")}`,
    `Reply-To: ${config.RESEND_REPLY_TO || "zhaowenjun@huawei.com"}`,
    `Subject: ${encodeMimeHeader(content.subject)}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ].join("\r\n");
  const rawMessage = `${headers}\r\n\r\n--${boundary}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${content.text}\r\n\r\n--${boundary}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n${content.html}\r\n\r\n--${boundary}--`;
  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: base64UrlEncode(rawMessage) }),
  });
  const result = await response.json().catch(() => ({})) as { id?: string; error?: { message?: string } };
  if (!response.ok || !result.id) throw new NotificationError("GMAIL_PROVIDER_ERROR", providerErrorMessage("Gmail send", response.status, result));
  return { provider: "gmail", messageIds: [result.id], recipientCount: recipients.length };
}

async function sendSms(recipientValue: string, content: ReturnType<typeof buildContent>): Promise<DeliveryResult> {
  const config = runtimeEnv();
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN || (!config.TWILIO_FROM_NUMBER && !config.TWILIO_MESSAGING_SERVICE_SID)) throw new NotificationError("SMS_NOT_CONFIGURED", "Twilio is not configured.");
  const recipients = smsRecipients(recipientValue);
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(config.TWILIO_ACCOUNT_SID)}/Messages.json`;
  const authorization = `Basic ${btoa(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`)}`;
  const attempts = await Promise.allSettled(recipients.map(async recipient => {
    const form = new URLSearchParams({ To: recipient, Body: content.sms });
    if (config.TWILIO_MESSAGING_SERVICE_SID) form.set("MessagingServiceSid", config.TWILIO_MESSAGING_SERVICE_SID); else form.set("From", config.TWILIO_FROM_NUMBER!);
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: authorization, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
    const result = await response.json().catch(() => ({})) as { sid?: string; message?: string };
    if (!response.ok || !result.sid) throw new Error(result.message || `Twilio returned HTTP ${response.status}.`);
    return result.sid;
  }));
  const messageIds = attempts.flatMap(attempt => attempt.status === "fulfilled" ? [attempt.value] : []);
  if (messageIds.length !== recipients.length) throw new NotificationError("SMS_PROVIDER_ERROR", `${recipients.length - messageIds.length} of ${recipients.length} SMS deliveries failed.`);
  return { provider: "twilio", messageIds, recipientCount: recipients.length };
}

export async function deliverNotification(input: { channel: Channel; recipient: string; opportunities: Opportunity[]; audience: Audience; actorName: string; lang?: Lang; context?: PushDeliveryContext }): Promise<DeliveryResult> {
  if (!input.opportunities.length) throw new NotificationError("OPPORTUNITY_REQUIRED", "No valid opportunities were selected.");
  const lang = input.lang ?? "zh";
  // GPT analysis is produced in ChatGPT and persisted to D1; email delivery never calls a model API.
  const content = buildContent(input.opportunities, input.audience, input.actorName, lang, input.context);
  return input.channel === "email" ? sendEmail(input.recipient, content, input.audience) : sendSms(input.recipient, content);
}
