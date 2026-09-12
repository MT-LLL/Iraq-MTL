import type { Opportunity, OpportunityContact } from "./data";

export type Lang = "zh" | "en";

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
  伊拉克: "Iraq", 约旦: "Jordan", 黎巴嫩: "Lebanon",
  巴格达: "Baghdad", 安曼: "Amman", 贝鲁特: "Beirut", 巴士拉: "Basra", 亚喀巴: "Aqaba",
  交通: "Transport", 政府: "Government", 油气: "Oil & Gas", 医疗: "Healthcare", 电力: "Power",
  水务: "Water", 金融: "Finance", 商业: "Commercial", 教育: "Education", 军队: "Military", 工业: "Industry", 运营商: "Carrier",
  内政: "Interior", 公共安全: "Public Safety", 机械电子: "Machinery & Electronic",
  前期研究: "Study", 研究阶段: "Study", "在建（98%）": "Under Construction (98%)", "在建": "Under Construction",
  线索发现: "Lead discovery", 公开招标: "Open tender", 主合同招标: "Main contract tender", 主合同资格预审: "Main contract prequalification",
  资格预审: "Pre-qualification", 融资确认: "Funding confirmation", 概念设计: "Concept design", 方案征询: "RFI", 意向征集: "Expression of interest", 截标日期: "bid deadline",
  核心: "Core", 优选: "Preferred", 认证: "Certified",
  实施主体: "Implementing entity", 资金路径: "Funding path", 方案匹配: "Solution fit", 合规检查: "Compliance",
  通过: "Passed", 待核实: "To be verified", 风险: "Risk", 极高: "Very high", 高: "High", 中高: "Medium-high", 中: "Medium", 低: "Low",
  已确认: "Confirmed", 潜在类型: "Potential type",
  数据通信: "Data Communication", 存储: "Storage", 云: "Cloud", 运维: "O&M", 光网络: "Optical Network", 企业光网络: "Enterprise Optical Network", 企业无线: "Enterprise Wireless", 智能协作: "Intelligent Collaboration", 云与存储: "Cloud & Storage", "云+存储": "Cloud + Storage",
  资金成熟度: "Funding maturity", 采购窗口: "Procurement window", 赢单驱动: "Win drivers", 客户触达: "Customer access", 战略价值: "Strategic value",
  官方公告: "official notice", 融资机构公告: "financing institution notice", 业主公告: "owner notice", 招标公告: "tender notice",
  采购入口: "procurement entry", 机构电话: "institution phone", 公开邮箱: "public email", 公开电话: "public phone",
  政府预算已批复: "Government budget approved", 来源页面未完整披露: "Not fully disclosed on source page", 未披露: "Not disclosed",
  待拆分ICT工作包: "ICT work package to be scoped", 待公布: "TBA", 待确认: "TBC", 今天: "today", 昨天: "yesterday",
  项目顾问: "project consultant", 本地行业系统集成商: "local industry system integrator", 国际网络设备商: "international network vendor",
  可能掌握应用层: "may control application-layer", 客户入口: "customer access", 源站未披露已确认参标品牌: "source does not disclose confirmed bidding brands",
  需通过业主: "verify through the owner", 顾问和伙伴继续核实: "consultant and partner channels",
};

const englishTextReplacements: Array<[RegExp, string]> = [
  [/MEED Projects \+ 官方公告/g, "MEED Projects + official notice"],
  [/OceanStor 双活与备份/g, "OceanStor active-active storage and backup"],
  [/OceanStor 灾备/g, "OceanStor disaster recovery"],
  [/OceanStor边缘数据与视频存储/g, "OceanStor edge data and video storage"],
  [/OceanStor视频与生产数据备份/g, "OceanStor video and production data backup"],
  [/OceanStor 备份恢复/g, "OceanStor backup and recovery"],
  [/OceanStor数据与视频存储/g, "OceanStor data and video storage"],
  [/OceanStor边缘\/视频数据/g, "OceanStor edge / video data"],
  [/OceanStor计费、日志、业务数据与备份/g, "OceanStor billing, log, service data and backup"],
  [/OceanStor核心数据、视频与备份/g, "OceanStor core data, video and backup"],
  [/OceanStor视频、生产数据与灾备/g, "OceanStor video, production data and DR"],
  [/华为云 Stack/g, "Huawei Cloud Stack"],
  [/华为云Stack与数据平台/g, "Huawei Cloud Stack and data platform"],
  [/华为云Stack运营商边缘\/私有云资源池/g, "Huawei Cloud Stack carrier edge / private-cloud resource pool"],
  [/华为云Stack政企私有云\/混合云/g, "Huawei Cloud Stack enterprise private / hybrid cloud"],
  [/华为云Stack交通IOC与行业平台/g, "Huawei Cloud Stack transport IOC and industry platform"],
  [/华为云Stack \+ OceanStor生产数据\/调度平台/g, "Huawei Cloud Stack + OceanStor production data / dispatch platform"],
  [/CloudEngine DC 网络/g, "CloudEngine DC network"],
  [/CloudEngine \/ NetEngine \/ AirEngine园区与DC网络/g, "CloudEngine / NetEngine / AirEngine campus and DC network"],
  [/CloudEngine \/ NetEngine交通承载与控制中心网络/g, "CloudEngine / NetEngine transport bearer and control-center network"],
  [/CloudEngine \/ NetEngine工业园区与骨干承载/g, "CloudEngine / NetEngine industrial campus and backbone bearer"],
  [/CloudEngine \/ NetEngine智能电力数据网络/g, "CloudEngine / NetEngine intelligent power data network"],
  [/NetEngine IP\/MPLS \+ CloudEngine DC网络/g, "NetEngine IP/MPLS + CloudEngine DC network"],
  [/NetEngine \+ CloudEngine工业网络/g, "NetEngine + CloudEngine industrial network"],
  [/NetEngine 园区承载/g, "NetEngine campus bearer"],
  [/NetEngine \+ AirEngine园区网络/g, "NetEngine + AirEngine campus network"],
  [/CloudEngine \/ NetEngine \/ AirEngine/g, "CloudEngine / NetEngine / AirEngine"],
  [/工业数通与站点承载/g, "industrial datacom and site bearer"],
  [/工业园区与广域网络/g, "industrial campus and WAN network"],
  [/工业园区网络/g, "industrial campus network"],
  [/行业专网 \/ AirEngine园区无线/g, "industry private network / AirEngine campus Wi-Fi"],
  [/行业专网 \+ 企业云核/g, "industry private network + enterprise cloud core"],
  [/行业专网与园区无线/g, "industry private network and campus Wi-Fi"],
  [/OptiXtrans电力通信/g, "OptiXtrans power communications"],
  [/OptiXtrans电力通信与站点承载/g, "OptiXtrans power communications and site bearer"],
  [/OptiXtrans \/ F5G站点与城域传输/g, "OptiXtrans / F5G site and metro transmission"],
  [/OptiXaccess \/ OptiXtrans光接入与传输/g, "OptiXaccess / OptiXtrans optical access and transmission"],
  [/F5G 全光园区 \/ OptiXstar/g, "F5G all-optical campus / OptiXstar"],
  [/eSight \/ NeoSight统一ICT运维/g, "eSight / NeoSight unified ICT O&M"],
  [/eSight 统一运维/g, "eSight unified O&M"],
  [/eSight统一ICT运维/g, "eSight unified ICT O&M"],
  [/eSight园区ICT统一运维/g, "eSight campus ICT unified O&M"],
  [/eSight统一运维/g, "eSight unified O&M"],
  [/鲲鹏通算/g, "Kunpeng general computing"],
  [/鲲鹏通算 \+ 昇腾AI算力/g, "Kunpeng general computing + Ascend AI computing"],
  [/鲲鹏边缘计算与AI巡检承载/g, "Kunpeng edge computing and AI inspection hosting"],
  [/鲲鹏边缘计算/g, "Kunpeng edge computing"],
  [/IdeaHub \/ CloudLink会议、教学与会诊/g, "IdeaHub / CloudLink meetings, teaching and telemedicine"],
  [/IdeaHub \+ CloudLink/g, "IdeaHub + CloudLink"],
  [/站点供电与备电方案待勘察/g, "site power and backup-power solution to be surveyed"],
  [/关键负载备电与站点能源管理/g, "critical-load backup power and site energy management"],
  [/电站数字能源场景待拆包/g, "power-plant digital energy scenario to be scoped"],
  [/数字能源待匹配/g, "digital energy scope to be matched"],
  [/融资机构公告/g, "financing institution notice"],
  [/官方公告/g, "official notice"],
  [/业主公告/g, "owner notice"],
  [/招标公告/g, "tender notice"],
  [/MEED Projects with Roles/g, "MEED Projects role chain"],
  [/JONEPS official contact page/g, "JONEPS official contact page"],
  [/MEMR official contact page/g, "MEMR official contact page"],
  [/South Refineries Company official website/g, "South Refineries Company official website"],
  [/CDR official contact page/g, "CDR official contact page"],
  [/PPA official contact page/g, "PPA official contact page"],
  [/Ogero official bids page and Lebanon PPA entity page/g, "Ogero official bids page and Lebanon PPA entity page"],
  [/Alfa official business opportunity page/g, "Alfa official business opportunity page"],
  [/来源页面未完整披露，待核实/g, "Not fully disclosed on source page; to be verified"],
  [/政府预算已批复/g, "Government budget approved"],
  [/待拆分ICT工作包/g, "ICT work package to be scoped"],
  [/未披露/g, "Not disclosed"],
  [/待公布/g, "TBA"],
  [/待确认/g, "TBC"],
  [/待核实/g, "to be verified"],
  [/今天/g, "today"],
  [/昨天/g, "yesterday"],
  [/(\d+)分钟前/g, "$1 min ago"],
  [/(\d+)小时前/g, "$1 hour ago"],
  [/(\d+)项/g, "$1 items"],
  [/已确认项目名称/g, "confirmed project title"],
  [/国家/g, "country"],
  [/阶段/g, "stage"],
  [/和项目净值/g, "and net project value"],
  [/及截标日期/g, "and bid deadline"],
  [/华为机会判断基于行业场景和采购窗口/g, "Huawei opportunity assessment is based on industry scenario and procurement window"],
  [/必须继续核实独立ICT工作包、资金、实施主体、技术规格与伙伴入口/g, "independent ICT work packages, funding path, implementing entity, technical scope and partner entry must still be verified"],
  [/项目范围明确包含中央控制平台、通信网络与灾备中心/g, "The project scope includes the central control platform, communications network and disaster recovery center"],
  [/资格预审截止仍有/g, "Pre-qualification deadline leaves"],
  [/天，具备方案塑造窗口/g, "days, leaving room for solution shaping"],
  [/资金来源标记为伊拉克政府资本预算，状态为已批复/g, "Funding is marked as Iraq government capital budget and approved"],
  [/方案匹配、参与空间、竞争对手和赢单判断属于内部分析，不代表源站已确认/g, "Solution fit, participation space, competitors and win assessment are internal analysis and are not confirmed by the source"],
  [/项目顾问\/EPC既有供应链/g, "incumbent project consultant / EPC supply chain"],
  [/本地行业系统集成商/g, "local industry system integrator"],
  [/国际网络设备商/g, "international network vendor"],
  [/顾问规范可能沿用既有品牌短名单/g, "consultant specifications may reuse an incumbent brand shortlist"],
  [/掌握应用层与路侧设备资源/g, "may control application-layer and roadside-device resources"],
  [/源站未披露已确认参标品牌，需通过业主、顾问和伙伴继续核实/g, "source does not disclose confirmed bidding brands; verify through owner, consultant and partner channels"],
  [/可能掌握应用层、现场交付和客户入口/g, "may control application-layer, field delivery and customer access"],
  [/核实ICT工作包、业主\/顾问\/EPC与采购里程碑/g, "Verify ICT work packages, owner / consultant / EPC chain and procurement milestones"],
  [/形成华为方案匹配与伙伴进入路径/g, "Build Huawei solution fit and partner entry path"],
  [/完成联合方案、合规和竞争策略复核/g, "Complete joint solution, compliance and competition-strategy review"],
  [/完成业主—顾问—EPC 决策链核验/g, "Verify owner-consultant-EPC decision chain"],
  [/提交控制中心网络与双活架构建议书/g, "Submit control-center network and active-active architecture proposal"],
  [/与两家本地 SI 完成联合方案和交付边界/g, "Align joint solution and delivery boundaries with two local SIs"],
  [/核实融资方采购与原产地条款/g, "Verify financier procurement rules and country-of-origin clauses"],
  [/组织主权云与两地三中心架构工作坊/g, "Run a sovereign-cloud and dual-site DR architecture workshop"],
  [/完成 PoC 范围和本地运维能力方案/g, "Define PoC scope and local O&M capability plan"],
  [/确认MEMR实施主体、项目地点、融资路径与顾问角色/g, "Confirm MEMR implementing entity, project location, funding path and consultant role"],
  [/提出油库OT\/ICT分层网络、视频物联和边缘存储参考架构/g, "Propose layered OT / ICT network, video-IoT and edge-storage reference architecture for petroleum storage"],
  [/与本地EPC\/SI明确联合方案、交付边界及合规要求/g, "Align joint solution, delivery boundary and compliance requirements with local EPC / SI"],
  [/核查主EPC、现有网络\/自动化品牌及项目移交时间/g, "Check main EPC, incumbent network / automation brands and handover timeline"],
  [/确认是否存在独立运维、备件、安防存储或二期扩容预算/g, "Confirm whether standalone O&M, spares, security storage or phase-2 expansion budget exists"],
  [/若无新增工作包则仅保留季度状态监控/g, "Keep quarterly status monitoring only if no new work package exists"],
  [/确认业主 ICT\/OT 边界和技术负责人/g, "Confirm owner ICT / OT boundary and technical decision maker"],
  [/开展油田专网与边缘计算场景交流/g, "Run an oilfield private-network and edge-computing scenario workshop"],
  [/联合 OT SI 完成交付责任矩阵/g, "Complete delivery responsibility matrix with OT SI"],
  [/与伙伴确认医疗应用和 ICT 基础设施边界/g, "Confirm healthcare application and ICT infrastructure boundary with partner"],
  [/提交全光园区 TCO 对比与样板点建议/g, "Submit all-optical campus TCO comparison and pilot-site proposal"],
  [/推动院方确认分期建设与付款节点/g, "Drive hospital confirmation of phased construction and payment milestones"],
  [/仅核实是否存在已入围 EPC 伙伴窗口/g, "Only verify whether a shortlisted EPC partner window exists"],
  [/若无入口则转入观察并跟踪二期/g, "Move to watch status and track phase 2 if no entry point exists"],
  [/补齐数字能源本地可销售目录/g, "Complete the local sellable digital-energy portfolio list"],
  [/核验MEED三国3024条、活跃865条、近30天93条；重点项目与8条官方招标进入雷达/g, "Verified 3,024 MEED records across three countries; 865 active records and 93 updates in the last 30 days. Key projects and 8 official tenders entered the radar."],
  [/录入8月14–17日最新增量：约旦1条、伊拉克1条、黎巴嫩0条/g, "Ingested the latest 14–17 Aug delta: Jordan 1, Iraq 1, Lebanon 0."],
  [/完成伊拉克增量核验：21条更新，4条实质状态变化/g, "Completed Iraq delta verification: 21 updates and 4 material status changes."],
  [/将国家灾备云标记为金种子候选/g, "Marked the national DR cloud as a golden-seed candidate."],
  [/更新了巴格达智慧交通资金证据/g, "Updated funding evidence for Baghdad intelligent traffic."],
  [/导入 MEED 批次：126 条，合并重复项 18 条/g, "Imported MEED batch: 126 records, 18 duplicates merged."],
  [/向 Levant Smart Systems 分享伙伴安全版/g, "Shared the partner-safe version with Levant Smart Systems."],
  [/客户经理/g, "account manager"],
  [/行业客户经理/g, "industry account manager"],
  [/融资经理/g, "financing manager"],
  [/云解决方案团队/g, "cloud solution team"],
  [/交付团队/g, "delivery team"],
  [/约旦行业团队/g, "Jordan industry team"],
  [/伊拉克政企团队/g, "Iraq enterprise team"],
  [/油气解决方案团队/g, "oil & gas solution team"],
  [/油气行业经理/g, "oil & gas industry manager"],
  [/无线解决方案团队/g, "wireless solution team"],
  [/光解决方案团队/g, "optical solution team"],
  [/电力行业经理/g, "power industry manager"],
  [/产品经理/g, "product manager"],
  [/解决方案团队/g, "solution team"],
  [/伙伴经理/g, "partner manager"],
  [/机会 Owner/g, "opportunity owner"],
  [/机会Owner/g, "opportunity owner"],
  [/7天/g, "7 days"],
  [/30天/g, "30 days"],
  [/90天/g, "90 days"],
  [/数据通信/g, "Data Communication"],
  [/存储/g, "Storage"],
  [/光网络/g, "Optical Network"],
  [/无线/g, "Wireless"],
  [/运维/g, "O&M"],
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
  [/，/g, ", "],
  [/。/g, ". "],
  [/；/g, "; "],
  [/：/g, ": "],
  [/（/g, " ("],
  [/）/g, ")"],
  [/、/g, ", "],
];

export function tr(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

export function hasCjk(value: string) {
  return /[\u3400-\u9fff]/.test(value);
}

export function localTerm(lang: Lang, value: string) {
  if (lang === "zh") return industryZh[value] ?? value;
  return termEn[value] ?? countryEn[value] ?? value;
}

export function localText(lang: Lang, value: string, fallback = "To be verified") {
  if (lang === "zh") return value;
  let text = localTerm(lang, value);
  englishTextReplacements.forEach(([pattern, replacement]) => {
    text = text.replace(pattern, replacement);
  });
  text = text.replace(/\s+/g, " ").trim();
  return hasCjk(text) ? fallback : text;
}

export function contactLine(contact: OpportunityContact | undefined, lang: Lang) {
  if (!contact) return tr(lang, "联系人待补齐", "Contact to be completed");
  const name = contact.name || tr(lang, "未披露联系人", "Contact not disclosed");
  const company = contact.company || tr(lang, "公司待核实", "Company TBC");
  const direct = contact.email || contact.phone || contact.companyPhone || tr(lang, "邮箱/电话待补齐", "Email / phone to be completed");
  return `${name} · ${company} · ${direct}`;
}

function valueOrTodo(lang: Lang, value: string | undefined, zhTodo: string, enTodo: string) {
  return value?.trim() ? localText(lang, value.trim(), value.trim()) : tr(lang, zhTodo, enTodo);
}

function sourceUrlFrom(item: Opportunity) {
  const fromSource = item.source.match(/https?:\/\/[^\s]+/)?.[0];
  return fromSource || "";
}

export function contactDetails(item: Opportunity, lang: Lang) {
  const contact = bestContact(item);
  const hasEmail = Boolean(contact?.email);
  const hasPhone = Boolean(contact?.phone);
  const hasDirect = Boolean(hasEmail || hasPhone);
  const hasInstitution = Boolean(contact?.companyPhone);
  const procurementEntry = sourceUrlFrom(item) || localText(lang, item.source, item.source.replace(/[^\x20-\x7e]+/g, " ").trim() || "Source to be verified");
  const preferredMethod = contact?.email || contact?.phone || contact?.companyPhone || procurementEntry || tr(lang, "待补齐", "To be completed");
  const preferredMethodLabel = contact?.email
    ? tr(lang, "邮箱", "Email")
    : contact?.phone
      ? tr(lang, "手机号/直线电话", "Mobile / direct phone")
      : contact?.companyPhone
        ? tr(lang, "机构电话", "Institution phone")
        : tr(lang, "采购入口", "Procurement entry");
  const contactCompleteness = hasEmail && hasPhone
    ? tr(lang, "项目邮箱和手机号/直线电话均已匹配。", "Project email and mobile / direct phone are both matched.")
    : hasEmail
      ? tr(lang, "已匹配项目邮箱，手机号/直线电话待补齐。", "Project email is matched; mobile / direct phone still needs completion.")
      : hasPhone
        ? tr(lang, "已匹配手机号/直线电话，项目邮箱待补齐。", "Mobile / direct phone is matched; project email still needs completion.")
        : hasInstitution
          ? tr(lang, "仅有机构电话，项目经办人邮箱和手机号待补齐。", "Only institution phone is available; project officer email and mobile still need completion.")
          : tr(lang, "未匹配到邮箱或电话，当前以采购入口作为触达线索。", "No email or phone is matched; procurement entry is used as the outreach lead.");
  const completionAction = hasEmail && hasPhone
    ? tr(lang, "发送前复核联系人仍在项目角色链内。", "Before sending, verify the contact is still in the project role chain.")
    : hasDirect
      ? tr(lang, "请在首次触达时补齐缺失的邮箱或手机号。", "Complete the missing email or mobile during first outreach.")
      : hasInstitution
        ? tr(lang, "请由伙伴或客户经理拨打机构电话，补齐项目经办人邮箱/手机号。", "Ask the partner or account manager to call the institution number and complete the project officer email / mobile.")
        : tr(lang, "请通过采购入口、官方公告或伙伴关系补齐真实项目联系人。", "Complete the real project contact through procurement entry, official notice or partner relationship.");
  const status = hasDirect
    ? tr(lang, "已匹配公开邮箱/手机号，可直接触达但需人工复核。", "Public email / mobile is matched; verify manually before outreach.")
    : hasInstitution
      ? tr(lang, "仅匹配到机构级电话/角色链，需补齐项目经办人邮箱或手机号。", "Only institution-level phone / role chain is matched; complete project officer email or mobile.")
      : tr(lang, "未匹配到公开邮箱或电话，请通过采购入口、MEED角色链或伙伴补齐。", "No public email or phone matched; complete through procurement entry, MEED role chain or partner channel.");
  return {
    status,
    role: valueOrTodo(lang, contact?.role, "角色待核实", "Role TBC"),
    name: valueOrTodo(lang, contact?.name, "未披露联系人", "Contact not disclosed"),
    title: valueOrTodo(lang, contact?.title, "职位待核实", "Title TBC"),
    company: valueOrTodo(lang, contact?.company, "公司待核实", "Company TBC"),
    email: valueOrTodo(lang, contact?.email, "公开邮箱待补齐", "Public email to be completed"),
    phone: valueOrTodo(lang, contact?.phone, "公开手机号待补齐", "Public mobile to be completed"),
    companyPhone: valueOrTodo(lang, contact?.companyPhone, "机构电话待补齐", "Institution phone to be completed"),
    source: contact ? localText(lang, contact.source, contact.source) : tr(lang, "线索来源未提供联系人字段", "Lead source does not provide contact fields"),
    procurementEntry,
    preferredMethod,
    preferredMethodLabel,
    contactCompleteness,
    completionAction,
    hasEmail,
    hasPhone,
    hasDirect,
    hasInstitution,
  };
}

export function bestContact(item: Opportunity) {
  return item.contacts?.find(contact => contact.email || contact.phone)
    ?? item.contacts?.find(contact => contact.companyPhone)
    ?? item.contacts?.[0];
}

export function opportunityInsight(item: Opportunity, lang: Lang) {
  if (lang === "zh") return item.summary;
  return `${item.titleEn} is a ${localTerm(lang, item.country)} ${localTerm(lang, item.industry)} opportunity at ${localText(lang, item.stage)} stage. Project value is ${localText(lang, item.value)}, with estimated Huawei addressable scope of ${localText(lang, item.addressable)}. Key milestone: ${localText(lang, item.deadline)}. Recommended next step: validate the owner entry point, budget path, ICT work packages and partner route before engagement.`;
}

function productRole(domain: string, name: string, lang: Lang) {
  const text = `${domain} ${name}`;
  if (/CloudEngine|NetEngine|AirEngine|数据通信|Datacom/i.test(text)) return tr(lang, "承载园区、数据中心、广域和行业专网连接，是项目ICT底座。", "Provides campus, data-center, WAN and industry-private-network connectivity as the ICT foundation.");
  if (/OceanStor|存储|Storage/i.test(text)) return tr(lang, "支撑核心业务数据、视频/AI数据、备份容灾和双活能力。", "Supports core business data, video / AI data, backup, disaster recovery and active-active storage.");
  if (/云|Cloud|Stack/i.test(text)) return tr(lang, "承载政企应用、数据交换、灾备云和行业平台，适合私有云/混合云路径。", "Hosts enterprise applications, data exchange, DR cloud and industry platforms through private / hybrid cloud.");
  if (/eSight|NeoSight|运维|O&M/i.test(text)) return tr(lang, "统一纳管网络、云、存储与现场设备，降低交付后的运维复杂度。", "Unifies management of network, cloud, storage and field devices to reduce O&M complexity.");
  if (/OptiX|光|Optical|F5G/i.test(text)) return tr(lang, "用于全光园区、传输和接入网络，提升高带宽与低时延承载能力。", "Enables all-optical campus, transport and access networks for high-bandwidth, low-latency bearer.");
  if (/无线|Wireless|Microwave/i.test(text)) return tr(lang, "适合油气、交通、港口等现场专网、回传和应急通信场景。", "Fits field private networks, backhaul and emergency communications in oil & gas, transport and port scenarios.");
  if (/鲲鹏|昇腾|计算|AI|Kunpeng|Ascend|Computing/i.test(text)) return tr(lang, "承载行业应用、AI推理、边缘处理和政企云资源池算力需求。", "Provides compute for industry applications, AI inference, edge processing and enterprise cloud resource pools.");
  if (/IdeaHub|CloudLink|协作|Collaboration/i.test(text)) return tr(lang, "支撑会议、教学、会诊和指挥协同等多方沟通场景。", "Supports multi-party collaboration for meetings, teaching, telemedicine and command operations.");
  if (/数字能源|Digital Energy|备电|供电|能源/i.test(text)) return tr(lang, "适合站点供电、备电、能源管理和新能源相关ICT配套场景。", "Fits site power, backup power, energy management and new-energy ICT support scenarios.");
  return tr(lang, "作为项目ICT能力组件参与方案组合，需结合TOR/BOQ进一步拆分工作包。", "Acts as an ICT capability component; work packages should be refined against TOR / BOQ.");
}

function engagementStrategy(item: Opportunity, lang: Lang) {
  if (lang === "zh") {
    return `${item.priority}/${item.score}分，参与空间${item.participation}、赢单判断${item.win}。建议先锁定业主/顾问/EPC决策链，补齐TOR/BOQ与资金路径，再由解决方案团队输出华为产品组合和伙伴分工。`;
  }
  return `${item.priority}/${item.score} score, ${localTerm(lang, item.participation)} participation space and ${localTerm(lang, item.win)} win assessment. First lock the owner / consultant / EPC decision chain, collect TOR / BOQ and funding evidence, then let the solution team produce the Huawei product bundle and partner work split.`;
}

function riskSummary(item: Opportunity, lang: Lang) {
  const gateRisks = item.gate.filter(gate => gate.state !== "通过").map(gate => localTerm(lang, gate.label));
  if (lang === "zh") return gateRisks.length ? `待补齐：${gateRisks.join("、")}；同时核实真实联系人、技术规格和参标短名单。` : "四项硬门槛均已通过，重点关注投标文件冻结前的技术规格塑造。";
  return gateRisks.length ? `Open items: ${gateRisks.join(", ")}. Also verify real contacts, technical specifications and bidder shortlist.` : "All hard gates are passed; focus on shaping technical specifications before tender freeze.";
}

export function opportunityBrief(item: Opportunity, lang: Lang) {
  const contact = bestContact(item);
  const details = contactDetails(item, lang);
  const solutionItems = item.solutions
    .slice(0, 4)
    .map(solution => ({
      domain: localText(lang, solution.domain, "Huawei portfolio"),
      name: localText(lang, solution.name, "Huawei solution to be scoped"),
      fit: solution.fit,
      role: productRole(solution.domain, solution.name, lang),
    }));
  const solutions = solutionItems.map(solution => `${solution.domain}: ${solution.name} (${solution.fit}%)`).join(lang === "zh" ? "；" : "; ");
  const firstAction = item.actions[0];
  const nextActions = item.actions.slice(0, 3).map(action => `${localText(lang, action.horizon)} · ${localText(lang, action.text, "Action to be verified")} · ${tr(lang, "Owner", "Owner")}: ${localText(lang, action.owner, "owner to be assigned")}`);
  return {
    title: lang === "zh" ? item.title : item.titleEn,
    meta: `${localTerm(lang, item.country)} · ${localText(lang, item.city)} · ${localTerm(lang, item.industry)} · ${localText(lang, item.stage)}`,
    insight: opportunityInsight(item, lang),
    value: localText(lang, item.value),
    addressable: localText(lang, item.addressable),
    deadline: localText(lang, item.deadline),
    funding: localText(lang, item.funding),
    source: localText(lang, item.source, item.source.replace(/[^\x20-\x7e]+/g, " ").trim() || "Source to be verified"),
    updated: localText(lang, item.updated),
    participation: localTerm(lang, item.participation),
    win: localTerm(lang, item.win),
    score: `${item.priority} / ${item.score}`,
    solutions,
    solutionItems,
    strategy: engagementStrategy(item, lang),
    risk: riskSummary(item, lang),
    contact: contactLine(contact, lang),
    contactDetails: details,
    contactSource: contact ? localText(lang, contact.source, contact.source) : tr(lang, "待补充", "To be completed"),
    action: firstAction ? `${localText(lang, firstAction.horizon)} · ${localText(lang, firstAction.text, "Action to be verified")} · ${tr(lang, "Owner", "Owner")}: ${localText(lang, firstAction.owner, "owner to be assigned")}` : tr(lang, "待制定下一步动作", "Next action to be defined"),
    nextActions,
    evidence: item.evidence.slice(0, 2).map(evidence => localText(lang, evidence)),
  };
}
