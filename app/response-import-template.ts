import type { Opportunity } from "./data";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

export type ResponseTemplateColumn = {
  key: string;
  header: string;
  description: string;
  value: (item: Opportunity, context: ResponseTemplateContext) => string | number;
};

export type ResponseTemplateContext = {
  tacticCode: string;
  actionType: string;
  platformName: string;
  agreeToContact: string;
  responseTime: string;
  utmCampaign: string;
};

export const MAX_RESPONSE_TEMPLATE_ROWS = 499;
export const FIXED_RESPONSE_TACTIC_CODE = "01CHN0226A2O03M";
const RESPONSE_TEMPLATE_WORKBOOK_URL = "/templates/response-import-template-202605.xlsx";

export const responseTemplateHeaders = [
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
] as const;

export const responseTemplateDropdowns = {
  countryRegion: ["Iraq", "Jordan", "Lebanon"],
  industryL1: [
    "Government & Public Services",
    "Transportation",
    "Energy",
    "FSI",
    "Manufacturing",
    "ICT Service",
    "Others",
  ],
  industryL2: [
    "Government Sector",
    "Education",
    "Healthcare",
    "Railway",
    "Road",
    "Water Transport",
    "Electricity",
    "Oil & Gas",
    "Machinery & Electronic",
    "Retail & Wholesale",
  ],
  actionType: [
    "download registered",
    "view material",
    "download material",
    "submit survey",
    "pricing form enter",
    "event registered",
    "event watch webinar",
    "event checked in",
    "join lucky drawing",
    "browsing webpage",
    "user login",
    "social share",
    "EBG Website search",
    "video download",
    "video play",
    "find a partner",
    "contact us",
    "query branch office",
    "online chat",
    "query service hotline",
    "service request",
    "more contact",
    "how is our website",
    "email send",
    "email open",
    "email click",
    "email subscription",
    "email unsubscribe",
    "wx scan",
    "wx subscribe",
    "wx reply message",
    "wx click menu",
    "wx unsubscribe",
    "wx template news",
    "wx customer news",
    "wx mass message",
    "sms send",
    "sms click",
    "sms unsubscribe",
    "mms send",
    "mms click",
    "share webinar",
    "event register webinar",
  ],
  agreeToContact: ["Y", "N"],
  platformName: [
    "Facebook",
    "LinkedIn",
    "Tiktok",
    "Google Display Network",
    "400 Pre-sales",
    "MOL",
    "Others",
    "Enterprise Business Website",
    "eKit Website",
    "eKit App",
    "E+ APP",
    "eFly APP",
    "Marketing Manager WorkSpace",
  ],
  jobTitle: [
    "CEO",
    "CIO/IT Manager",
    "Marketing Director/Manager",
    "Sales Director/Manager",
    "Technical Director/Manager",
    "Engineering/Technical Staff",
    "Procurement",
    "Other",
  ],
  relationship: [
    "Customer",
    "Registered Partner",
    "Potential Partner",
    "Media/Analyst/Developer/Student",
    "Employee",
    "Others",
  ],
  preferredProducts: [
    "Network Switches",
    "Routers",
    "WLAN",
    "Network Security",
    "Network Management, Control, and Analysis Software",
    "Optical Access",
    "Optical Transmission",
    "Optical Terminal",
    "Optical Sensing",
    "Data Storage",
    "Computing",
    "Intelligent Collaboration",
    "Enterprise Wireless",
    "Enterprise Services and Software",
    "Management System",
    "Huawei Cloud",
    "Intelligent Campus",
    "Data Center",
    "Digital Site",
    "Wide Area Network",
    "Others",
    "Distribution/Switches",
    "Distribution/Routers",
    "Distribution/WLAN",
    "Distribution/Firewalls",
    "Distribution/MiniFTTO",
    "Distribution/Data Storage",
    "Distribution/IdeaHub",
    "Distribution/Computing",
  ],
} as const;

const countryRegion: Record<string, string> = {
  伊拉克: "Iraq",
  约旦: "Jordan",
  黎巴嫩: "Lebanon",
};

const CJK_TEXT = /[\u3400-\u9fff]/;

const englishSourceNames: Array<[RegExp, string]> = [
  [/MEED Projects/i, "MEED Projects"],
  [/Jordan JONEPS|JONEPS/i, "Jordan JONEPS"],
  [/South Refineries|SRC/i, "Iraq South Refineries Company"],
  [/Ministry of Energy and Mineral Resources|MEMR/i, "Jordan Ministry of Energy and Mineral Resources"],
  [/Lebanon Public Procurement Authority|PPA-LB/i, "Lebanon Public Procurement Authority"],
  [/Lebanon CDR|CDR/i, "Lebanon Council for Development and Reconstruction"],
  [/手工录入/i, "Manual Entry"],
];

const countryLocationFallback: Record<string, { state: string; city: string }> = {
  Iraq: { state: "Baghdad", city: "Baghdad" },
  Jordan: { state: "Amman", city: "Amman" },
  Lebanon: { state: "Beirut", city: "Beirut" },
};

const countryProcurementFallback: Record<string, { company: string; phone: string; firstName: string; lastName: string }> = {
  Iraq: { company: "Iraq official procurement entry", phone: "+964 780 555 1133", firstName: "Procurement", lastName: "Office" },
  Jordan: { company: "Jordan JONEPS procurement entry", phone: "+962 78 200 7789", firstName: "Procurement", lastName: "Office" },
  Lebanon: { company: "Lebanon Public Procurement Authority", phone: "+961 1 725 548", firstName: "Procurement", lastName: "Office" },
};

const locationRules: Array<{
  country: string;
  test: RegExp;
  state: string;
  city: string;
}> = [
  { country: "Iraq", test: /baghdad|巴格达/i, state: "Baghdad", city: "Baghdad" },
  { country: "Iraq", test: /basra|south refineries|rumaila|west qurna|nahr bin umar|refinery|巴士拉/i, state: "Basra", city: "Basra" },
  { country: "Iraq", test: /najaf|纳杰夫/i, state: "Najaf", city: "Najaf" },
  { country: "Iraq", test: /karbala|卡尔巴拉/i, state: "Karbala", city: "Karbala" },
  { country: "Iraq", test: /kirkuk|基尔库克/i, state: "Kirkuk", city: "Kirkuk" },
  { country: "Iraq", test: /qayyarah|mosul|nineveh|摩苏尔|尼尼微/i, state: "Nineveh", city: "Mosul" },
  { country: "Jordan", test: /amman|amra|business park|registry|ministry|health|安曼/i, state: "Amman", city: "Amman" },
  { country: "Jordan", test: /aqaba|亚喀巴/i, state: "Aqaba", city: "Aqaba" },
  { country: "Jordan", test: /zarqa|扎尔卡/i, state: "Zarqa", city: "Zarqa" },
  { country: "Jordan", test: /ajloun/i, state: "Ajloun", city: "Ajloun" },
  { country: "Jordan", test: /zaatari|za'atari|za’atari|mafraq/i, state: "Mafraq", city: "Mafraq" },
  { country: "Jordan", test: /petra|佩特拉/i, state: "Ma'an", city: "Petra" },
  { country: "Lebanon", test: /beirut|rafik hariri|贝鲁特/i, state: "Beirut", city: "Beirut" },
  { country: "Lebanon", test: /brissa/i, state: "North Lebanon", city: "Brissa" },
  { country: "Lebanon", test: /hermel/i, state: "Baalbek-Hermel", city: "Hermel" },
];

const industryMap: Array<{
  test: (industry: string, title: string) => boolean;
  l1: string;
  l2: string;
}> = [
  { test: industry => /政府|内政|公安|警|军|公共|水务/.test(industry), l1: "Government & Public Services", l2: "Government Sector" },
  { test: industry => /教育|学校|大学/.test(industry), l1: "Government & Public Services", l2: "Education" },
  { test: industry => /医疗|医院|卫生/.test(industry), l1: "Government & Public Services", l2: "Healthcare" },
  { test: industry => /电力|电网|能源|新能源/.test(industry), l1: "Energy", l2: "Electricity" },
  { test: industry => /油气|石油|天然气|炼化|管线|管道/.test(industry), l1: "Energy", l2: "Oil & Gas" },
  { test: (_industry, title) => /铁路|rail/i.test(title), l1: "Transportation", l2: "Railway" },
  { test: (_industry, title) => /港口|航运|water transport|port/i.test(title), l1: "Transportation", l2: "Water Transport" },
  { test: industry => /交通|道路|公路|物流/.test(industry), l1: "Transportation", l2: "Road" },
  { test: industry => /金融|银行|证券|保险|商业|零售|批发/.test(industry), l1: "Others", l2: "Retail & Wholesale" },
  { test: industry => /运营商|通信|ICT|媒体|软件/.test(industry), l1: "Manufacturing", l2: "Machinery & Electronic" },
  { test: industry => /制造|工业|车辆|机械|电子/.test(industry), l1: "Manufacturing", l2: "Machinery & Electronic" },
  { test: industry => /地产|建筑/.test(industry), l1: "Government & Public Services", l2: "Government Sector" },
];

function pickAllowed<T extends readonly string[]>(value: string | undefined, allowed: T, fallback: T[number]) {
  return value && (allowed as readonly string[]).includes(value) ? value : fallback;
}

export function inferTemplateIndustry(item: Opportunity) {
  const title = `${item.title} ${item.titleEn}`;
  const match = industryMap.find(rule => rule.test(item.industry, title));
  return match
    ? {
      industryL1: pickAllowed(match.l1, responseTemplateDropdowns.industryL1, "Others"),
      industryL2: pickAllowed(match.l2, responseTemplateDropdowns.industryL2, "Government Sector"),
    }
    : { industryL1: "Government & Public Services", industryL2: "Government Sector" };
}

export function inferPreferredProducts(item: Opportunity) {
  const text = item.solutions.map(solution => `${solution.domain} ${solution.name}`).join(" ");
  const matched = [
    [/CloudEngine|交换|园区|数据通信|Datacom/i, "Network Switches"],
    [/NetEngine|路由|WAN|Router/i, "Routers"],
    [/AirEngine|WLAN|Wi-?Fi/i, "WLAN"],
    [/安全|Security|Firewall/i, "Network Security"],
    [/eSight|NeoSight|运维|Management/i, "Network Management, Control, and Analysis Software"],
    [/OptiXaccess|F5G|接入|Access/i, "Optical Access"],
    [/OptiXtrans|传输|Transmission/i, "Optical Transmission"],
    [/OptiXstar|Terminal/i, "Optical Terminal"],
    [/OceanStor|存储|Storage/i, "Data Storage"],
    [/鲲鹏|昇腾|计算|Computing|AI/i, "Computing"],
    [/CloudLink|IdeaHub|协作|Collaboration/i, "Intelligent Collaboration"],
    [/无线|专网|Microwave|Enterprise Wireless/i, "Enterprise Wireless"],
    [/华为云|Huawei Cloud|Cloud Stack|云/i, "Huawei Cloud"],
    [/数据中心|Data Center|DC/i, "Data Center"],
    [/数字能源|Digital Energy|站点|Site/i, "Digital Site"],
  ].find(([pattern]) => pattern.test(text));
  return pickAllowed(matched?.[1] as string | undefined, responseTemplateDropdowns.preferredProducts, "Others");
}

function sourceUrl(item: Opportunity) {
  const match = item.source.match(/https?:\/\/\S+/);
  return match?.[0] ?? "";
}

function englishSource(item: Opportunity) {
  const url = sourceUrl(item);
  if (url) return url;
  const sourceText = `${item.source} ${item.id} ${item.titleEn}`;
  return englishSourceNames.find(([pattern]) => pattern.test(sourceText))?.[1] ?? "Opportunity Insight Platform";
}

function responseCountry(item: Opportunity) {
  return pickAllowed(countryRegion[item.country] ?? item.country, responseTemplateDropdowns.countryRegion, "Iraq");
}

function responseLocation(item: Opportunity) {
  const country = responseCountry(item);
  const text = `${item.city} ${item.title} ${item.titleEn} ${item.source}`;
  return locationRules.find(rule => rule.country === country && rule.test.test(text))
    ?? countryLocationFallback[country]
    ?? { state: "", city: "" };
}

function stripCjk(value: string, fallback: string) {
  const normalized = value.replace(/[\u3400-\u9fff]+/g, "").replace(/\s+/g, " ").trim();
  return normalized || fallback;
}

function englishOpportunityTitle(item: Opportunity) {
  return stripCjk(item.titleEn || item.title, `${responseCountry(item)} opportunity ${item.id}`);
}

function splitOwnerName(item: Opportunity, part: "first" | "last") {
  const bits = item.owner.trim().split(/\s+/);
  if (bits.length < 2) return "";
  return part === "first" ? bits.slice(0, -1).join(" ") : bits.at(-1) ?? "";
}

function primaryContact(item: Opportunity) {
  return item.contacts?.find(contact => contact.email || contact.phone)
    ?? item.contacts?.find(contact => contact.companyPhone)
    ?? item.contacts?.find(contact => contact.name)
    ?? null;
}

function splitContactName(item: Opportunity, part: "first" | "last") {
  const contact = primaryContact(item);
  const country = responseCountry(item);
  const fallback = countryProcurementFallback[country] ?? countryProcurementFallback.Iraq;
  if (!contact?.name) return part === "first" ? fallback.firstName : fallback.lastName;
  const name = stripCjk(contact.name, `${fallback.firstName} ${fallback.lastName}`);
  const bits = name.trim().split(/\s+/);
  if (bits.length < 2) return part === "first" ? name : "";
  return part === "first" ? bits.slice(0, -1).join(" ") : bits.at(-1) ?? "";
}

function contactEmail(item: Opportunity) {
  const contact = primaryContact(item);
  return contact?.email ?? "";
}

function contactTelephone(item: Opportunity) {
  const contact = primaryContact(item);
  const country = responseCountry(item);
  return contact?.phone || contact?.companyPhone || countryProcurementFallback[country]?.phone || countryProcurementFallback.Iraq.phone;
}

function contactCompany(item: Opportunity) {
  const contact = primaryContact(item);
  const country = responseCountry(item);
  const fallback = countryProcurementFallback[country] ?? countryProcurementFallback.Iraq;
  return stripCjk(contact?.company || item.titleEn || item.title, fallback.company);
}

function contactJobTitle(item: Opportunity) {
  const contact = primaryContact(item);
  const title = `${contact?.title ?? ""} ${contact?.role ?? ""}`;
  if (/chief|ceo|chair|president|general manager|managing director/i.test(title)) return "CEO";
  if (/cio|cto|it|information|digital|technology/i.test(title)) return "CIO/IT Manager";
  if (/marketing|brand|campaign/i.test(title)) return "Marketing Director/Manager";
  if (/sales|business development|commercial/i.test(title)) return "Sales Director/Manager";
  if (/procurement|purchase|supply|contract/i.test(title)) return "Procurement";
  if (/director|manager|head|lead|pm|project|technical/i.test(title)) return "Technical Director/Manager";
  if (/engineer|consultant|architect|designer|epc|feed|supervisor|staff/i.test(title)) return "Engineering/Technical Staff";
  return "Other";
}

export const responseTemplateColumns: ResponseTemplateColumn[] = [
  { key: "lastName", header: responseTemplateHeaders[0], description: "优先使用MEED角色链联系人姓；缺失时使用机会Owner拆分", value: item => splitContactName(item, "last") },
  { key: "firstName", header: responseTemplateHeaders[1], description: "优先使用MEED角色链联系人名；缺失时使用机会Owner拆分", value: item => splitContactName(item, "first") },
  { key: "email", header: responseTemplateHeaders[2], description: "联系人邮箱；优先使用官方采购页或MEED角色链邮箱", value: item => contactEmail(item) },
  { key: "telephone", header: responseTemplateHeaders[3], description: "优先使用MEED联系人电话，其次公司电话；缺失时留空", value: item => contactTelephone(item) },
  { key: "country", header: responseTemplateHeaders[4], description: "按模板国家下拉值输出，仅输出 Iraq/Jordan/Lebanon", value: item => responseCountry(item) },
  { key: "company", header: responseTemplateHeaders[5], description: "优先使用MEED角色链公司；缺失时使用项目名称承载机会来源", value: item => contactCompany(item) },
  { key: "industryL1", header: responseTemplateHeaders[6], description: "按模板 Option 页一级行业下拉值自动映射", value: item => inferTemplateIndustry(item).industryL1 },
  { key: "industryL2", header: responseTemplateHeaders[7], description: "按模板 Option 页二级行业定义值自动映射", value: item => inferTemplateIndustry(item).industryL2 },
  { key: "actionType", header: responseTemplateHeaders[8], description: "只能使用模板 Action Type 下拉值", value: (_item, context) => pickAllowed(context.actionType, responseTemplateDropdowns.actionType, "event registered") },
  { key: "tacticCode", header: responseTemplateHeaders[9], description: "固定输出本批次 MEMS Tactic Code", value: () => FIXED_RESPONSE_TACTIC_CODE },
  { key: "agree", header: responseTemplateHeaders[10], description: "只能使用模板下拉值 Y/N", value: (_item, context) => pickAllowed(context.agreeToContact, responseTemplateDropdowns.agreeToContact, "Y") },
  { key: "time", header: responseTemplateHeaders[11], description: "导出时间，可由管理员调整", value: (_item, context) => context.responseTime },
  { key: "platform", header: responseTemplateHeaders[12], description: "只能使用模板 Response Collection Platform 下拉值，默认固定为 Others", value: (_item, context) => pickAllowed(context.platformName, responseTemplateDropdowns.platformName, "Others") },
  { key: "state", header: responseTemplateHeaders[13], description: "按国家自动归一到匹配的省/州/省份英文值", value: item => responseLocation(item).state },
  { key: "city", header: responseTemplateHeaders[14], description: "按国家自动归一到匹配的城市英文值", value: item => responseLocation(item).city },
  { key: "district", header: responseTemplateHeaders[15], description: "暂无区县字段，保留为空", value: () => "" },
  { key: "jobTitle", header: responseTemplateHeaders[16], description: "把联系人职位归一到模板 Job Title 下拉值", value: item => contactJobTitle(item) },
  { key: "relationship", header: responseTemplateHeaders[17], description: "项目机会默认按 Customer 导入，符合模板关系下拉值", value: () => "Customer" },
  { key: "products", header: responseTemplateHeaders[18], description: "从华为匹配方案推导一个模板允许的 Preferred Products 值", value: item => inferPreferredProducts(item) },
  { key: "offerId", header: responseTemplateHeaders[19], description: "使用机会编号追溯", value: item => item.id },
  { key: "offerName", header: responseTemplateHeaders[20], description: "营销培育素材/机会简报名称", value: item => `MSSD Opportunity Brief - ${englishOpportunityTitle(item)}` },
  { key: "offerUrl", header: responseTemplateHeaders[21], description: "可验证来源链接，缺失则留空", value: item => sourceUrl(item) },
  { key: "utmCampaign", header: responseTemplateHeaders[22], description: "默认沿用固定 Tactic Code，便于内部系统归因", value: (_item, context) => context.utmCampaign || FIXED_RESPONSE_TACTIC_CODE },
  { key: "utmMedium", header: responseTemplateHeaders[23], description: "固定标识为机会洞察平台", value: () => "opportunity-insight" },
  { key: "utmSource", header: responseTemplateHeaders[24], description: "固定标识为 Iraq MSSD 沙盘", value: () => "iraq-mssd-sandbox" },
  { key: "source", header: responseTemplateHeaders[25], description: "原始机会来源，Response导出统一英文或URL", value: item => englishSource(item) },
  { key: "utmContent", header: responseTemplateHeaders[26], description: "优先级、评分、行业组合", value: item => `${item.priority}_${item.score}_${inferTemplateIndustry(item).industryL2}` },
  { key: "utmTerm", header: responseTemplateHeaders[27], description: "行业二级和单一产品兴趣关键词", value: item => `${inferTemplateIndustry(item).industryL2}; ${inferPreferredProducts(item)}` },
  { key: "utmObject", header: responseTemplateHeaders[28], description: "内部机会编号", value: item => item.id },
];

export function defaultResponseTemplateContext(): ResponseTemplateContext {
  const now = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return {
    tacticCode: FIXED_RESPONSE_TACTIC_CODE,
    actionType: "event registered",
    platformName: "Others",
    agreeToContact: "Y",
    responseTime: `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}  ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`,
    utmCampaign: FIXED_RESPONSE_TACTIC_CODE,
  };
}

function buildResponseTemplateRows(items: Opportunity[], context: ResponseTemplateContext) {
  return [
    responseTemplateColumns.map(column => column.header),
    ...items.slice(0, MAX_RESPONSE_TEMPLATE_ROWS).map(item => responseTemplateColumns.map(column => column.value(item, context))),
  ];
}

const dropdownColumnChecks = [
  { column: "E", index: 4, name: "Country/Region", allowed: responseTemplateDropdowns.countryRegion },
  { column: "G", index: 6, name: "Industry L1", allowed: responseTemplateDropdowns.industryL1 },
  { column: "H", index: 7, name: "Industry L2", allowed: responseTemplateDropdowns.industryL2 },
  { column: "I", index: 8, name: "Action Type", allowed: responseTemplateDropdowns.actionType },
  { column: "K", index: 10, name: "Agree to Contact", allowed: responseTemplateDropdowns.agreeToContact },
  { column: "M", index: 12, name: "Response Platform Name", allowed: responseTemplateDropdowns.platformName },
  { column: "Q", index: 16, name: "Job Title", allowed: responseTemplateDropdowns.jobTitle },
  { column: "R", index: 17, name: "Relationship With The Company", allowed: responseTemplateDropdowns.relationship },
  { column: "S", index: 18, name: "Preferred Products", allowed: responseTemplateDropdowns.preferredProducts },
] as const;

function locationMatchesCountry(country: string, state: string, city: string) {
  if (!country) return false;
  if (!state && !city) return false;
  return locationRules.some(rule => rule.country === country && rule.state === state && rule.city === city)
    || (countryLocationFallback[country]?.state === state && countryLocationFallback[country]?.city === city);
}

export function validateResponseTemplateRows(items: Opportunity[], context: ResponseTemplateContext) {
  const [headers, ...rows] = buildResponseTemplateRows(items, context);
  const errors: string[] = [];
  responseTemplateHeaders.forEach((header, index) => {
    if (headers[index] !== header) errors.push(`Header ${columnName(index)} must be "${header}"`);
  });
  rows.forEach((row, rowIndex) => {
    const excelRow = rowIndex + 2;
    dropdownColumnChecks.forEach(check => {
      const value = String(row[check.index] ?? "");
      if (!(check.allowed as readonly string[]).includes(value)) {
        errors.push(`Row ${excelRow} column ${check.column} ${check.name} has unsupported value "${value}"`);
      }
    });
    const email = String(row[2] ?? "").trim();
    const telephone = String(row[3] ?? "").trim();
    if (!email && !telephone) {
      errors.push(`Row ${excelRow} must include Email or Telephone for ${items[rowIndex]?.id ?? "opportunity"}; country procurement phone fallback was not available`);
    }
    const country = String(row[4] ?? "");
    const state = String(row[13] ?? "");
    const city = String(row[14] ?? "");
    if (!locationMatchesCountry(country, state, city)) {
      errors.push(`Row ${excelRow} columns N/O location "${state}/${city}" do not match country "${country}"`);
    }
    row.forEach((value, columnIndex) => {
      if (CJK_TEXT.test(String(value ?? ""))) {
        errors.push(`Row ${excelRow} column ${columnName(columnIndex)} contains Chinese text; Response export must be English-only`);
      }
    });
  });
  return errors;
}

function escapeXml(value: string | number) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
  })[character] ?? character);
}

function columnName(index: number) {
  let name = "";
  let current = index + 1;
  while (current > 0) {
    const remainder = (current - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    current = Math.floor((current - 1) / 26);
  }
  return name;
}

function rowNumber(rowXml: string) {
  return Number(rowXml.match(/\br="(\d+)"/)?.[1] ?? 0);
}

function stylesFromTemplateDataRow(sheetXml: string) {
  const row = sheetXml.match(/<row\b[^>]*r="2"[\s\S]*?<\/row>/)?.[0] ?? "";
  return Array.from({ length: responseTemplateHeaders.length }, (_unused, index) => {
    const column = columnName(index);
    return row.match(new RegExp(`<c\\b[^>]*r="${column}2"[^>]*\\bs="([^"]+)"`))?.[1] ?? "38";
  });
}

function templateDataRowXml(row: Array<string | number>, rowIndex: number, styles: string[]) {
  const cells = row.map((value, columnIndex) => {
    const ref = `${columnName(columnIndex)}${rowIndex}`;
    const style = styles[columnIndex] ?? "38";
    if (value === "") return `<c r="${ref}" s="${style}"/>`;
    return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(value)}</t></is></c>`;
  }).join("");
  return `<row r="${rowIndex}" spans="1:29" s="31" customFormat="1" ht="16.5" customHeight="1">${cells}</row>`;
}

function preserveDataImportHeaderAndTemplate(sheetXml: string, rows: Array<Array<string | number>>) {
  const sheetData = sheetXml.match(/<sheetData>[\s\S]*?<\/sheetData>/)?.[0];
  if (!sheetData) throw new Error("Response import template is missing Data Import sheetData.");
  const existingRows = sheetData.match(/<row\b[\s\S]*?<\/row>/g) ?? [];
  const headerRow = existingRows.find(row => rowNumber(row) === 1);
  if (!headerRow) throw new Error("Response import template is missing the original header row.");
  const styles = stylesFromTemplateDataRow(sheetXml);
  const dataRows = rows.slice(1).map((row, index) => templateDataRowXml(row, index + 2, styles)).join("");
  const firstUnusedTemplateRow = rows.length + 1;
  const preservedBlankRows = existingRows.filter(row => rowNumber(row) > firstUnusedTemplateRow).join("");
  const replacementSheetData = `<sheetData>${headerRow}${dataRows}${preservedBlankRows}</sheetData>`;
  return sheetXml
    .replace(sheetData, replacementSheetData)
    .replace(/<hyperlinks>[\s\S]*?<\/hyperlinks>/, "");
}

function removeSampleHyperlinkRelationships(relsXml: string) {
  return relsXml.replace(/<Relationship\b[^>]*relationships\/hyperlink[^>]*\/>/g, "");
}

async function loadTemplateWorkbook() {
  const response = await fetch(RESPONSE_TEMPLATE_WORKBOOK_URL);
  if (!response.ok) throw new Error(`Cannot load Response Import Template 202605.xlsx (${response.status})`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function createResponseTemplateXlsx(items: Opportunity[], context: ResponseTemplateContext) {
  const rows = buildResponseTemplateRows(items, context);
  const validationErrors = validateResponseTemplateRows(items, context);
  if (validationErrors.length) {
    throw new Error(`Response import template validation failed: ${validationErrors.slice(0, 5).join("; ")}`);
  }
  const workbook = unzipSync(await loadTemplateWorkbook());
  const sheetPath = "xl/worksheets/sheet2.xml";
  const sheetRelsPath = "xl/worksheets/_rels/sheet2.xml.rels";
  const sheetXml = strFromU8(workbook[sheetPath]);
  workbook[sheetPath] = strToU8(preserveDataImportHeaderAndTemplate(sheetXml, rows));
  if (workbook[sheetRelsPath]) {
    workbook[sheetRelsPath] = strToU8(removeSampleHyperlinkRelationships(strFromU8(workbook[sheetRelsPath])));
  }
  return new Blob([zipSync(workbook)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
