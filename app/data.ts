import { meedContactDirectory } from "./meed-contacts";

export type Priority = "P0" | "P1" | "P2" | "WATCH";
export type Country = "伊拉克" | "约旦" | "黎巴嫩";

export type PartnerDirectoryEntry = {
  id: string;
  name: string;
  country: Country;
  email: string;
  phone: string;
  tier: "核心" | "优选" | "认证";
  manager: string;
  managerInitials: string;
  managerEmail: string;
};

export type IndustryDispatchOwner = {
  id: string;
  industry: string;
  role: "solution_manager" | "system_minister";
  roleLabel: string;
  name: string;
  email: string;
  phone: string;
  coverage: string;
  slaHours: number;
};

export type OpportunityContact = {
  role: string;
  company: string;
  companyPhone?: string;
  email?: string;
  name?: string;
  title?: string;
  phone?: string;
  source: string;
};

export type MarketingContentType = "opportunity" | "meeting_minutes" | "marketing_material" | "circle_event";
export type MarketingContent = {
  id: string;
  type: MarketingContentType;
  title: string;
  titleEn: string;
  country: Country | "三国";
  industry: string;
  audience: "partner" | "internal" | "both";
  status: "ready" | "draft" | "review";
  owner: string;
  source: string;
  updated: string;
  summary: string;
  summaryEn: string;
  relatedSolutions: string[];
  recommendedAction: string;
  recommendedActionEn: string;
};

export type ReleaseUpdate = {
  id: string;
  period: string;
  periodEn: string;
  title: string;
  titleEn: string;
  publishedAt: string;
  dataSource: string;
  dataSourceEn: string;
  status: "published" | "review" | "planned";
  stats: Array<{ label: string; labelEn: string; value: string; note: string; noteEn: string }>;
  highlights: string[];
  highlightsEn: string[];
  keyOpportunities: Array<{ id: string; title: string; titleEn: string; value: string; priority: Priority; action: string; actionEn: string }>;
  platformUpdates: string[];
  platformUpdatesEn: string[];
  nextActions: string[];
  nextActionsEn: string[];
};

export type HuaweiOfficialSolutionCatalogItem = {
  id: string;
  category: string;
  categoryEn: string;
  productFamilies: string[];
  scenarios: string[];
  industries: string[];
  keywords: string[];
  sourceUrl: string;
};

const huaweiProductsSourceUrl = "https://e.huawei.com/cn/products-and-solutions";

export const huaweiOfficialSolutionCatalog: HuaweiOfficialSolutionCatalogItem[] = [
  {
    id: "HW-CAT-NETWORK",
    category: "企业网络",
    categoryEn: "Enterprise Network",
    productFamilies: ["CloudEngine", "NetEngine", "AirEngine", "园区网络", "数据中心网络", "广域网络"],
    scenarios: ["智慧园区", "数据中心互联", "政企广域承载", "Wi-Fi接入", "分支互联"],
    industries: ["Government Sector", "Education", "Healthcare", "Retail & Wholesale", "Road", "Railway", "Oil & Gas", "Water Transport", "运营商", "金融"],
    keywords: ["network", "switch", "router", "wifi", "sd-wan", "mpls", "lan", "wan", "campus", "data center", "traffic", "control center", "网络", "交换机", "路由器", "园区", "数据中心", "交通", "控制中心"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-OPTICAL",
    category: "企业光网络",
    categoryEn: "Enterprise Optical Network",
    productFamilies: ["OptiXaccess", "OptiXtrans", "OptiXstar", "F5G", "F5G-A", "全光园区", "光传送"],
    scenarios: ["全光园区", "城市骨干传输", "政企专线", "站点接入", "运营商/ISP光纤接入"],
    industries: ["Government Sector", "Education", "Healthcare", "Road", "Railway", "Water Transport", "运营商", "Electricity", "金融"],
    keywords: ["fiber", "fttx", "pon", "optical", "transmission", "f5g", "metro", "access", "transport", "ogero", "isp", "光纤", "全光", "传输", "接入", "专线"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-STORAGE",
    category: "数据存储",
    categoryEn: "Data Storage",
    productFamilies: ["OceanStor", "OceanProtect", "分布式存储", "AI存储", "备份容灾"],
    scenarios: ["核心数据库", "灾备双活", "视频存储", "医疗影像", "AI训练数据", "备份恢复"],
    industries: ["Government Sector", "Healthcare", "Education", "Oil & Gas", "Road", "Railway", "Water Transport", "金融", "商业"],
    keywords: ["storage", "backup", "dr", "disaster", "video", "archive", "database", "san", "nas", "ai data", "存储", "备份", "容灾", "灾备", "视频", "数据库"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-COMPUTING",
    category: "计算",
    categoryEn: "Computing",
    productFamilies: ["鲲鹏", "昇腾", "通用计算", "AI算力", "边缘计算"],
    scenarios: ["政企云资源池", "AI推理", "智慧城市算法", "边缘数据处理", "行业应用承载"],
    industries: ["Government Sector", "Healthcare", "Education", "Oil & Gas", "Road", "Railway", "金融", "Machinery & Electronic"],
    keywords: ["server", "compute", "ai", "gpu", "npu", "edge", "chatbot", "analytics", "算法", "服务器", "计算", "算力", "边缘", "人工智能"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-CLOUD",
    category: "华为云",
    categoryEn: "Huawei Cloud",
    productFamilies: ["华为云 Stack", "混合云", "私有云", "云平台", "云管"],
    scenarios: ["主权云", "政务云", "灾备云", "行业云", "数据交换平台", "云化业务平台"],
    industries: ["Government Sector", "Healthcare", "Education", "金融", "Retail & Wholesale", "运营商", "Machinery & Electronic"],
    keywords: ["cloud", "private cloud", "hybrid cloud", "sovereign", "data exchange", "platform", "registry", "云", "私有云", "混合云", "政务云", "数据交换", "平台"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-COLLAB",
    category: "智能协作",
    categoryEn: "Intelligent Collaboration",
    productFamilies: ["IdeaHub", "CloudLink", "智慧办公", "智慧教学"],
    scenarios: ["会议室", "远程会商", "智慧教室", "医疗会诊", "指挥调度协同"],
    industries: ["Education", "Healthcare", "Government Sector", "Retail & Wholesale", "商业"],
    keywords: ["meeting", "conference", "classroom", "collaboration", "display", "board", "教学", "会议", "协作", "会诊", "指挥"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-WIRELESS",
    category: "企业无线",
    categoryEn: "Enterprise Wireless",
    productFamilies: ["行业无线", "企业微波", "企业云核", "专网通信"],
    scenarios: ["油田专网", "矿区/港口专网", "应急通信", "站点回传", "移动作业通信"],
    industries: ["Oil & Gas", "Water Transport", "Railway", "Road", "Electricity", "Machinery & Electronic"],
    keywords: ["private network", "wireless", "lte", "5g", "microwave", "backhaul", "radio", "oilfield", "port", "专网", "无线", "微波", "回传", "油田", "港口"],
    sourceUrl: huaweiProductsSourceUrl,
  },
  {
    id: "HW-CAT-OAM",
    category: "管理系统与运维软件",
    categoryEn: "Management Systems and O&M Software",
    productFamilies: ["eSight", "NeoSight", "统一运维", "网络管理", "ICT管理"],
    scenarios: ["ICT统一运维", "网络监控", "资产管理", "告警联动", "多厂商运维"],
    industries: ["Government Sector", "Education", "Healthcare", "Oil & Gas", "Road", "Railway", "Water Transport", "Electricity", "运营商"],
    keywords: ["o&m", "operation", "maintenance", "monitoring", "noc", "noc", "management", "运维", "监控", "网管", "告警", "维护"],
    sourceUrl: huaweiProductsSourceUrl,
  },
];

export const partnerDirectory: PartnerDirectoryEntry[] = [
  { id: "PT-IQ-001", name: "Mesopotamia Digital Systems", country: "伊拉克", email: "opportunities@mds.example", phone: "+964 770 000 4101", tier: "核心", manager: "赵文君", managerInitials: "ZW", managerEmail: "zhaowenjun@huawei.com" },
  { id: "PT-IQ-002", name: "Baghdad Technology Systems", country: "伊拉克", email: "bid@bts.example", phone: "+964 780 000 2732", tier: "优选", manager: "赵文君", managerInitials: "ZW", managerEmail: "zhaowenjun@huawei.com" },
  { id: "PT-IQ-003", name: "Tigris Smart Infrastructure", country: "伊拉克", email: "sales@tigris-si.example", phone: "+964 750 000 6854", tier: "认证", manager: "赵文君", managerInitials: "ZW", managerEmail: "zhaowenjun@huawei.com" },
  { id: "PT-LB-001", name: "Levant Smart Systems", country: "黎巴嫩", email: "opportunity@levant-smart.example", phone: "+961 70 000 392", tier: "优选", manager: "赵文君", managerInitials: "ZW", managerEmail: "zhaowenjun@huawei.com" },
  { id: "PT-JO-001", name: "Jordan Digital Alliance", country: "约旦", email: "partner@jda.example", phone: "+962 79 000 8421", tier: "认证", manager: "赵文君", managerInitials: "ZW", managerEmail: "zhaowenjun@huawei.com" },
];

export const marketingContentLibrary: MarketingContent[] = [
  {
    id: "MTL-IQ-OPP-001",
    type: "opportunity",
    title: "P0/P1重点机会伙伴协同包",
    titleEn: "P0/P1 priority opportunity partner package",
    country: "三国",
    industry: "政府 / 油气 / 电力 / 交通",
    audience: "partner",
    status: "ready",
    owner: "赵文君",
    source: "机会雷达自动生成",
    updated: "2026-09-05",
    summary: "面向伙伴输出脱敏后的重点机会摘要、公开里程碑、采购入口、方案方向和7天反馈动作。",
    summaryEn: "Provides partners with redacted priority opportunity summaries, public milestones, procurement entries, solution directions and 7-day feedback actions.",
    relatedSolutions: ["CloudEngine / NetEngine", "Huawei Cloud Stack", "OceanStor", "eSight", "Digital Energy"],
    recommendedAction: "按伙伴国家与行业能力批量推送，并在SLA看板跟踪确认回执。",
    recommendedActionEn: "Batch push by partner country and industry capability, then track acknowledgements in the SLA dashboard.",
  },
  {
    id: "MTL-IQ-MIN-002",
    type: "meeting_minutes",
    title: "油气行业客户拜访纪要",
    titleEn: "Oil & gas customer meeting minutes",
    country: "伊拉克",
    industry: "Oil & Gas",
    audience: "internal",
    status: "review",
    owner: "Iraq Industry Team",
    source: "管理员上传",
    updated: "2026-09-05",
    summary: "沉淀客户痛点、预算窗口、决策链线索和潜在ICT工作包，仅供内部经营复盘和二次分发。",
    summaryEn: "Captures customer pain points, budget window, decision-chain hints and potential ICT work packages for internal review and secondary distribution only.",
    relatedSolutions: ["Industry Wireless", "Edge DC", "Video Storage", "Unified O&M"],
    recommendedAction: "由行业解决方案经理确认可外发摘要，再生成伙伴安全版。",
    recommendedActionEn: "Ask the industry solution manager to approve the external summary before generating the partner-safe version.",
  },
  {
    id: "MTL-IQ-MAT-003",
    type: "marketing_material",
    title: "政企云与数据中心解决方案物料",
    titleEn: "Government cloud and data center solution kit",
    country: "伊拉克",
    industry: "Government Sector",
    audience: "both",
    status: "ready",
    owner: "Cloud Solution Team",
    source: "营销物料库",
    updated: "2026-09-04",
    summary: "用于政府、医疗、教育等场景的云、计算、存储、数通和运维方案组合介绍。",
    summaryEn: "A cloud, compute, storage, datacom and O&M solution kit for government, healthcare and education scenarios.",
    relatedSolutions: ["Huawei Cloud Stack", "Kunpeng", "OceanStor", "CloudEngine DC", "eSight"],
    recommendedAction: "与政府和医疗类机会包绑定推送，帮助伙伴统一价值主张。",
    recommendedActionEn: "Bind this kit with government and healthcare opportunity packages to align the partner value proposition.",
  },
  {
    id: "MTL-IQ-EVT-004",
    type: "circle_event",
    title: "伙伴圈子活动：智慧交通与城市治理闭门会",
    titleEn: "Partner circle event: smart transport and city governance roundtable",
    country: "伊拉克",
    industry: "Road / Government Sector",
    audience: "partner",
    status: "draft",
    owner: "MSSD Marketing Team",
    source: "活动计划导入",
    updated: "2026-09-03",
    summary: "围绕智慧交通、城市治理、数据中心和全光承载组织伙伴与客户小范围交流。",
    summaryEn: "A small partner-customer roundtable around smart transport, city governance, data centers and all-optical bearer.",
    relatedSolutions: ["CloudEngine", "NetEngine", "OptiXtrans", "OceanStor"],
    recommendedAction: "活动名单与P0交通机会绑定，推动会前客户触达和会后线索确认。",
    recommendedActionEn: "Bind the event list with P0 transport opportunities to drive pre-event customer access and post-event lead confirmation.",
  },
];

export const industryDispatchDirectory: IndustryDispatchOwner[] = [
  { id: "DISP-EDU-SM", industry: "Education", role: "solution_manager", roleLabel: "教育解决方案经理", name: "Hana Farah", email: "education.solution@huawei.example", phone: "+962 79 120 1001", coverage: "校园网、智慧教室、云与存储", slaHours: 24 },
  { id: "DISP-EDU-MIN", industry: "Education", role: "system_minister", roleLabel: "教育系统部长", name: "Liu Yang", email: "education.system@huawei.example", phone: "+962 79 120 1002", coverage: "教育行业重点客户与资源协调", slaHours: 48 },
  { id: "DISP-ELEC-SM", industry: "Electricity", role: "solution_manager", roleLabel: "电力解决方案经理", name: "Yousef Nasser", email: "power.solution@huawei.example", phone: "+962 79 120 0301", coverage: "电网、变电站、光伏、储能、数字能源", slaHours: 24 },
  { id: "DISP-ELEC-MIN", industry: "Electricity", role: "system_minister", roleLabel: "电力系统部长", name: "Wang Min", email: "power.system@huawei.example", phone: "+962 79 120 0302", coverage: "能源行业资源与重点项目牵引", slaHours: 48 },
  { id: "DISP-GOV-SM", industry: "Government Sector", role: "solution_manager", roleLabel: "政府解决方案经理", name: "Lina Haddad", email: "gov.solution@huawei.example", phone: "+964 770 120 0101", coverage: "内政、公共安全、电子政务、数据中心", slaHours: 24 },
  { id: "DISP-GOV-MIN", industry: "Government Sector", role: "system_minister", roleLabel: "政府系统部长", name: "Chen Wei", email: "gov.system@huawei.example", phone: "+964 770 120 0102", coverage: "重大政企机会复核与资源协调", slaHours: 48 },
  { id: "DISP-HEALTH-SM", industry: "Healthcare", role: "solution_manager", roleLabel: "医疗解决方案经理", name: "Sara Al-Hadidi", email: "health.solution@huawei.example", phone: "+962 79 120 0801", coverage: "医院园区、医疗云、数据存储、协作", slaHours: 24 },
  { id: "DISP-HEALTH-MIN", industry: "Healthcare", role: "system_minister", roleLabel: "医疗系统部长", name: "Zhou Ning", email: "health.system@huawei.example", phone: "+962 79 120 0802", coverage: "医疗行业重点项目复核与资源协调", slaHours: 48 },
  { id: "DISP-MECH-SM", industry: "Machinery & Electronic", role: "solution_manager", roleLabel: "机械电子解决方案经理", name: "George Haddad", email: "machinery-electronic.solution@huawei.example", phone: "+961 70 120 1201", coverage: "制造、园区、工业网络、边缘计算、ICT设备类采购", slaHours: 24 },
  { id: "DISP-MECH-MIN", industry: "Machinery & Electronic", role: "system_minister", roleLabel: "机械电子系统部长", name: "Gao Feng", email: "machinery-electronic.system@huawei.example", phone: "+961 70 120 1202", coverage: "制造与电子行业资源协调", slaHours: 48 },
  { id: "DISP-OIL-SM", industry: "Oil & Gas", role: "solution_manager", roleLabel: "油气解决方案经理", name: "Khalaf Al Sabah", email: "oilgas.solution@huawei.example", phone: "+964 780 120 0401", coverage: "油田专网、园区网络、边缘DC、视频与运维", slaHours: 24 },
  { id: "DISP-OIL-MIN", industry: "Oil & Gas", role: "system_minister", roleLabel: "油气系统部长", name: "Li Jian", email: "oilgas.system@huawei.example", phone: "+964 780 120 0402", coverage: "油气行业客户群与EPC进入路径", slaHours: 48 },
  { id: "DISP-RAIL-SM", industry: "Railway", role: "solution_manager", roleLabel: "铁路解决方案经理", name: "Ahmed Al-Samarrai", email: "railway.solution@huawei.example", phone: "+964 770 120 0601", coverage: "轨交通信、承载网络、站点云与运维", slaHours: 24 },
  { id: "DISP-RAIL-MIN", industry: "Railway", role: "system_minister", roleLabel: "铁路系统部长", name: "Sun Hao", email: "railway.system@huawei.example", phone: "+964 770 120 0602", coverage: "铁路行业经营与跨产品资源协调", slaHours: 48 },
  { id: "DISP-RETAIL-SM", industry: "Retail & Wholesale", role: "solution_manager", roleLabel: "零售批发解决方案经理", name: "Nour Mansour", email: "retail-wholesale.solution@huawei.example", phone: "+962 79 120 0901", coverage: "零售、批发、商业园区、办公协作", slaHours: 24 },
  { id: "DISP-RETAIL-MIN", industry: "Retail & Wholesale", role: "system_minister", roleLabel: "零售批发系统部长", name: "Zhao Lin", email: "retail-wholesale.system@huawei.example", phone: "+962 79 120 0902", coverage: "商业行业重点机会确认", slaHours: 48 },
  { id: "DISP-ROAD-SM", industry: "Road", role: "solution_manager", roleLabel: "道路交通解决方案经理", name: "Omar Kareem", email: "road.solution@huawei.example", phone: "+964 770 120 0603", coverage: "道路、智慧交通、城市交通控制中心", slaHours: 24 },
  { id: "DISP-ROAD-MIN", industry: "Road", role: "system_minister", roleLabel: "道路交通系统部长", name: "Zhang Rui", email: "road.system@huawei.example", phone: "+964 770 120 0604", coverage: "道路交通行业资源协调", slaHours: 48 },
  { id: "DISP-WATER-TRANSPORT-SM", industry: "Water Transport", role: "solution_manager", roleLabel: "水运解决方案经理", name: "Ali Al-Mousawi", email: "water-transport.solution@huawei.example", phone: "+964 780 120 1101", coverage: "港口、航运、水运枢纽、园区网络", slaHours: 24 },
  { id: "DISP-WATER-TRANSPORT-MIN", industry: "Water Transport", role: "system_minister", roleLabel: "水运系统部长", name: "Maya Khoury", email: "water-transport.system@huawei.example", phone: "+961 70 120 1102", coverage: "水运行业重点项目复核", slaHours: 48 },
];

export type Opportunity = {
  id: string;
  title: string;
  titleEn: string;
  country: Country;
  city: string;
  industry: string;
  stage: string;
  priority: Priority;
  score: number;
  confidence: number;
  value: string;
  addressable: string;
  deadline: string;
  daysLeft: number | null;
  owner: string;
  ownerInitials: string;
  source: string;
  updated: string;
  funding: string;
  participation: "极高" | "高" | "中" | "低";
  win: "高" | "中高" | "中" | "低";
  summary: string;
  evidence: string[];
  solutions: { domain: string; name: string; fit: number }[];
  competitors: { name: string; type: "已确认" | "潜在类型"; note: string }[];
  actions: { horizon: string; text: string; owner: string; done?: boolean }[];
  scoreParts: { label: string; value: number; total: number }[];
  risk: number;
  contacts?: OpportunityContact[];
  partner?: string;
  lockUntil?: string;
  golden?: boolean;
  gate: { label: string; state: "通过" | "待核实" | "风险" }[];
};

const curatedOpportunities: Opportunity[] = [
  {
    id: "OCP-IQ-24017",
    title: "巴格达智慧交通控制中心升级",
    titleEn: "Baghdad Intelligent Traffic Control Center Upgrade",
    country: "伊拉克",
    city: "巴格达",
    industry: "交通",
    stage: "资格预审",
    priority: "P0",
    score: 86,
    confidence: 0.84,
    value: "$128M",
    addressable: "$18–24M",
    deadline: "2026-09-28",
    daysLeft: 46,
    owner: "Ahmed Al-Samarrai",
    ownerInitials: "AS",
    source: "MEED Projects + 官方公告",
    updated: "今天 09:42",
    funding: "政府预算已批复",
    participation: "极高",
    win: "中高",
    summary: "控制中心、城域承载、路侧接入与数据中心基础设施形成完整 ICT 工作包。当前处于最佳介入窗口，需在顾问技术规范冻结前完成架构交流。",
    evidence: [
      "项目范围明确包含中央控制平台、通信网络与灾备中心。",
      "资格预审截止仍有 46 天，具备方案塑造窗口。",
      "资金来源标记为伊拉克政府资本预算，状态为已批复。",
    ],
    solutions: [
      { domain: "数据通信", name: "CloudEngine + NetEngine", fit: 94 },
      { domain: "存储", name: "OceanStor 双活与备份", fit: 88 },
      { domain: "云", name: "华为云 Stack", fit: 84 },
      { domain: "运维", name: "eSight 统一运维", fit: 82 },
    ],
    competitors: [
      { name: "国际网络设备商", type: "潜在类型", note: "顾问规范可能沿用既有品牌短名单" },
      { name: "本地交通系统集成商", type: "潜在类型", note: "掌握应用层与路侧设备资源" },
    ],
    actions: [
      { horizon: "7天", text: "完成业主—顾问—EPC 决策链核验", owner: "客户经理" },
      { horizon: "30天", text: "提交控制中心网络与双活架构建议书", owner: "解决方案团队" },
      { horizon: "90天", text: "与两家本地 SI 完成联合方案和交付边界", owner: "伙伴经理" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 18, total: 20 },
      { label: "采购窗口", value: 14, total: 15 },
      { label: "方案匹配", value: 19, total: 20 },
      { label: "参与空间", value: 14, total: 15 },
      { label: "赢单驱动", value: 12, total: 15 },
      { label: "客户触达", value: 6, total: 10 },
      { label: "战略价值", value: 5, total: 5 },
    ],
    risk: 2,
    partner: "Mesopotamia Digital Systems",
    lockUntil: "2027-02-12",
    golden: true,
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "通过" },
      { label: "方案匹配", state: "通过" },
      { label: "合规检查", state: "通过" },
    ],
  },
  {
    id: "OCP-JO-24011",
    title: "国家灾备云与政务数据交换平台",
    titleEn: "National DR Cloud & Government Data Exchange",
    country: "约旦",
    city: "安曼",
    industry: "政府",
    stage: "融资确认",
    priority: "P0",
    score: 82,
    confidence: 0.79,
    value: "$76M",
    addressable: "$22–28M",
    deadline: "2026-10-16",
    daysLeft: 64,
    owner: "Lina Haddad",
    ownerInitials: "LH",
    source: "融资机构公告",
    updated: "昨天 17:18",
    funding: "多边融资，条款确认中",
    participation: "极高",
    win: "中高",
    summary: "项目与私有云、计算、存储、DC 网络及统一运维高度匹配。最大变量为融资采购规则与数据主权要求，应优先推动架构合规澄清。",
    evidence: [
      "公开范围包含主中心、灾备中心、政府数据交换和统一云管。",
      "采购计划显示 2026 年第四季度发布 RFP。",
      "国家数据驻留要求已列为设计约束。",
    ],
    solutions: [
      { domain: "云", name: "华为云 Stack", fit: 96 },
      { domain: "存储", name: "OceanStor 灾备", fit: 93 },
      { domain: "计算", name: "鲲鹏通算", fit: 87 },
      { domain: "数据通信", name: "CloudEngine DC 网络", fit: 90 },
    ],
    competitors: [
      { name: "国际云基础设施厂商", type: "潜在类型", note: "可能以主权云与既有政府框架切入" },
      { name: "区域数据中心集成商", type: "潜在类型", note: "本地交付与合规能力较强" },
    ],
    actions: [
      { horizon: "7天", text: "核实融资方采购与原产地条款", owner: "融资经理" },
      { horizon: "30天", text: "组织主权云与两地三中心架构工作坊", owner: "云解决方案团队" },
      { horizon: "90天", text: "完成 PoC 范围和本地运维能力方案", owner: "交付团队" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 15, total: 20 },
      { label: "采购窗口", value: 14, total: 15 },
      { label: "方案匹配", value: 20, total: 20 },
      { label: "参与空间", value: 15, total: 15 },
      { label: "赢单驱动", value: 11, total: 15 },
      { label: "客户触达", value: 6, total: 10 },
      { label: "战略价值", value: 5, total: 5 },
    ],
    risk: 4,
    golden: true,
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "待核实" },
      { label: "方案匹配", state: "通过" },
      { label: "合规检查", state: "通过" },
    ],
  },
  {
    id: "MEED-JO-574296",
    title: "约旦原油及成品油储备设施",
    titleEn: "MEMR Crude Oil and Refined Products Storage Facility",
    country: "约旦",
    city: "待核实",
    industry: "油气",
    stage: "前期研究",
    priority: "P1",
    score: 68,
    confidence: 0.7,
    value: "$85M",
    addressable: "$4–8M（估算）",
    deadline: "待公布",
    daysLeft: null,
    owner: "Jordan Industry Team",
    ownerInitials: "JI",
    source: "MEED Projects #574296 · Levant Project Map",
    updated: "2026-08-15",
    funding: "MEED清单未披露，待核实",
    participation: "高",
    win: "中",
    summary: "项目处于研究阶段，具备影响储运园区通信、工业网络、边缘数据处理、视频物联与统一运维技术路线的窗口。当前仅确认行业、阶段和项目净值，ICT工作包、资金路径及采购日程均需补证，因此先列为P1条件培育。",
    evidence: [
      "MEED三国项目地图在2026-08-15更新该项目，项目编号574296。",
      "MEED清单字段显示Jordan、Oil、Study，净值为8500万美元。",
      "本次在线列表未提供已确认ICT工作包、资金来源、顾问/EPC角色或截标日期。",
    ],
    solutions: [
      { domain: "数据通信", name: "NetEngine + CloudEngine工业网络", fit: 84 },
      { domain: "无线", name: "行业专网 / AirEngine园区无线", fit: 78 },
      { domain: "存储", name: "OceanStor边缘数据与视频存储", fit: 72 },
      { domain: "运维", name: "eSight统一ICT运维", fit: 80 },
      { domain: "数字能源", name: "站点供电与备电方案待勘察", fit: 65 },
    ],
    competitors: [
      { name: "工业自动化与油库控制厂商", type: "潜在类型", note: "可能由OT控制层向通信和边缘基础设施延伸，具体参标方尚未确认" },
      { name: "国际网络与安防厂商", type: "潜在类型", note: "可能经顾问规范或EPC供应链进入，当前无已确认名单" },
    ],
    actions: [
      { horizon: "7天", text: "确认MEMR实施主体、项目地点、融资路径与顾问角色", owner: "约旦行业团队" },
      { horizon: "30天", text: "提出油库OT/ICT分层网络、视频物联和边缘存储参考架构", owner: "油气解决方案团队" },
      { horizon: "90天", text: "与本地EPC/SI明确联合方案、交付边界及合规要求", owner: "伙伴经理" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 8, total: 20 },
      { label: "采购窗口", value: 14, total: 15 },
      { label: "方案匹配", value: 17, total: 20 },
      { label: "参与空间", value: 13, total: 15 },
      { label: "赢单驱动", value: 9, total: 15 },
      { label: "客户触达", value: 4, total: 10 },
      { label: "战略价值", value: 5, total: 5 },
    ],
    risk: 2,
    gate: [
      { label: "实施主体", state: "待核实" },
      { label: "资金路径", state: "待核实" },
      { label: "方案匹配", state: "待核实" },
      { label: "合规检查", state: "待核实" },
    ],
  },
  {
    id: "MEED-IQ-513263",
    title: "伊拉克Jazeera与Shamiyah水处理厂",
    titleEn: "Water Treatment Plant in Al-Jazeera and Al-Shamiyah",
    country: "伊拉克",
    city: "待核实",
    industry: "水务",
    stage: "在建（98%）",
    priority: "WATCH",
    score: 43,
    confidence: 0.85,
    value: "$117M",
    addressable: "$0.5–1.5M（改造估算）",
    deadline: "完工节点待核实",
    daysLeft: null,
    owner: "Iraq Public Sector Team",
    ownerInitials: "IP",
    source: "MEED Projects #513263 · Levant Project Map",
    updated: "2026-08-14",
    funding: "主项目在建，独立ICT资金未核实",
    participation: "低",
    win: "低",
    summary: "主项目施工进度已达98%，已错过主体工程规格塑造窗口，不应列为高优先级新建机会。保留在观察池，重点核查投运后的园区网络、视频存储、统一运维、备电以及后续扩容/二期改造包。",
    evidence: [
      "MEED三国项目地图在2026-08-14更新该项目，项目编号513263。",
      "MEED清单字段显示Iraq、Water、Under Construction (98%)，净值为1.17亿美元。",
      "在线清单未确认独立ICT工作包、运维招标、二期范围或新的截标日期。",
    ],
    solutions: [
      { domain: "运维", name: "eSight园区ICT统一运维", fit: 74 },
      { domain: "数据通信", name: "NetEngine + AirEngine园区网络", fit: 70 },
      { domain: "存储", name: "OceanStor视频与生产数据备份", fit: 66 },
      { domain: "数字能源", name: "关键负载备电与站点能源管理", fit: 62 },
    ],
    competitors: [
      { name: "主EPC既有ICT/自动化供应商", type: "潜在类型", note: "在接近完工阶段拥有明显供应链与现场优势，名单尚未确认" },
      { name: "本地水务运维与系统集成商", type: "潜在类型", note: "可能掌握投运后的维护与小型改造入口" },
    ],
    actions: [
      { horizon: "7天", text: "核查主EPC、现有网络/自动化品牌及项目移交时间", owner: "伊拉克政企团队" },
      { horizon: "30天", text: "确认是否存在独立运维、备件、安防存储或二期扩容预算", owner: "解决方案团队" },
      { horizon: "90天", text: "若无新增工作包则仅保留季度状态监控", owner: "机会Owner" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 14, total: 20 },
      { label: "采购窗口", value: 1, total: 15 },
      { label: "方案匹配", value: 12, total: 20 },
      { label: "参与空间", value: 3, total: 15 },
      { label: "赢单驱动", value: 4, total: 15 },
      { label: "客户触达", value: 3, total: 10 },
      { label: "战略价值", value: 3, total: 5 },
    ],
    risk: 3,
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "待核实" },
      { label: "方案匹配", state: "待核实" },
      { label: "合规检查", state: "待核实" },
    ],
  },
  {
    id: "OCP-IQ-24009",
    title: "南部油田园区专网与边缘数据中心",
    titleEn: "Southern Oilfield Private Network & Edge DC",
    country: "伊拉克",
    city: "巴士拉",
    industry: "油气",
    stage: "概念设计",
    priority: "P1",
    score: 77,
    confidence: 0.72,
    value: "$214M",
    addressable: "$31–42M",
    deadline: "待公布",
    daysLeft: null,
    owner: "Omar Kareem",
    ownerInitials: "OK",
    source: "MEED Projects",
    updated: "8月11日",
    funding: "业主 CAPEX 规划",
    participation: "高",
    win: "中",
    summary: "园区承载、工业无线、边缘算力、存储和统一运维具备组合空间；应用层与 OT 安全集成需由合格伙伴承担。时间线尚未确认，优先建立业主技术路线。",
    evidence: [
      "概念范围涉及多个作业区的通信升级与本地数据处理。",
      "未发现正式资格预审或截标日期，采购窗口置信度降低。",
      "项目依赖油田 OT 系统集成和现场防爆认证。",
    ],
    solutions: [
      { domain: "无线", name: "行业专网 + 企业云核", fit: 90 },
      { domain: "数据通信", name: "NetEngine 园区承载", fit: 87 },
      { domain: "计算", name: "鲲鹏边缘计算", fit: 78 },
      { domain: "运维", name: "eSight", fit: 81 },
    ],
    competitors: [
      { name: "工业自动化厂商", type: "潜在类型", note: "通过 OT 总包扩大到通信层" },
      { name: "运营商专网团队", type: "潜在类型", note: "可能采用托管服务模式" },
    ],
    actions: [
      { horizon: "7天", text: "确认业主 ICT/OT 边界和技术负责人", owner: "油气行业经理" },
      { horizon: "30天", text: "开展油田专网与边缘计算场景交流", owner: "无线解决方案团队" },
      { horizon: "90天", text: "联合 OT SI 完成交付责任矩阵", owner: "伙伴经理" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 14, total: 20 },
      { label: "采购窗口", value: 8, total: 15 },
      { label: "方案匹配", value: 18, total: 20 },
      { label: "参与空间", value: 13, total: 15 },
      { label: "赢单驱动", value: 11, total: 15 },
      { label: "客户触达", value: 8, total: 10 },
      { label: "战略价值", value: 5, total: 5 },
    ],
    risk: 0,
    partner: "Basra Integrated Technology",
    lockUntil: "2027-01-30",
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "待核实" },
      { label: "方案匹配", state: "通过" },
      { label: "合规检查", state: "待核实" },
    ],
  },
  {
    id: "OCP-LB-24008",
    title: "贝鲁特医疗园区数据中心与全光网络",
    titleEn: "Beirut Healthcare Campus DC & All-Optical Network",
    country: "黎巴嫩",
    city: "贝鲁特",
    industry: "医疗",
    stage: "方案征询",
    priority: "P1",
    score: 71,
    confidence: 0.76,
    value: "$42M",
    addressable: "$9–12M",
    deadline: "2026-09-12",
    daysLeft: 30,
    owner: "Maya Khoury",
    ownerInitials: "MK",
    source: "业主公告 + 邮件线索",
    updated: "8月10日",
    funding: "捐助资金 + 自筹",
    participation: "高",
    win: "中高",
    summary: "全光园区、数据中心网络、存储备份和智慧协作高度适配。需确认医疗应用系统由伙伴承担，并重点评估资金拨付节奏。",
    evidence: [
      "RFI 明确要求新院区采用光纤到房间架构。",
      "资金由国际捐助和院方自筹组成，拨付条件尚未完全披露。",
      "现有伙伴已与院方完成两次需求交流。",
    ],
    solutions: [
      { domain: "光网络", name: "F5G 全光园区 / OptiXstar", fit: 96 },
      { domain: "存储", name: "OceanStor 备份恢复", fit: 84 },
      { domain: "协作", name: "IdeaHub + CloudLink", fit: 78 },
    ],
    competitors: [
      { name: "传统结构化布线厂商", type: "潜在类型", note: "可能推动铜缆园区方案" },
      { name: "医院 HIS 集成商", type: "潜在类型", note: "拥有应用层客户关系" },
    ],
    actions: [
      { horizon: "7天", text: "与伙伴确认医疗应用和 ICT 基础设施边界", owner: "伙伴经理" },
      { horizon: "30天", text: "提交全光园区 TCO 对比与样板点建议", owner: "光解决方案团队" },
      { horizon: "90天", text: "推动院方确认分期建设与付款节点", owner: "客户经理" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 11, total: 20 },
      { label: "采购窗口", value: 13, total: 15 },
      { label: "方案匹配", value: 18, total: 20 },
      { label: "参与空间", value: 12, total: 15 },
      { label: "赢单驱动", value: 10, total: 15 },
      { label: "客户触达", value: 9, total: 10 },
      { label: "战略价值", value: 3, total: 5 },
    ],
    risk: 5,
    partner: "Levant Smart Systems",
    lockUntil: "2027-02-05",
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "待核实" },
      { label: "方案匹配", state: "通过" },
      { label: "合规检查", state: "通过" },
    ],
  },
  {
    id: "OCP-JO-24004",
    title: "北部光伏电站通信与数据采集系统",
    titleEn: "Northern Solar Plant Communications & Data Acquisition",
    country: "约旦",
    city: "马弗拉克",
    industry: "电力",
    stage: "EPC 招标",
    priority: "P2",
    score: 59,
    confidence: 0.68,
    value: "$186M",
    addressable: "$5–8M",
    deadline: "2026-08-24",
    daysLeft: 11,
    owner: "Yousef Nasser",
    ownerInitials: "YN",
    source: "EPC 招标公告",
    updated: "今天 08:20",
    funding: "项目融资已关闭",
    participation: "中",
    win: "低",
    summary: "网络与数据采集存在匹配，但仅余 11 天且尚未完成 EPC 入围，属于介入过晚。数字能源产品目录待业务确认，当前不建议升级为重点机会。",
    evidence: [
      "EPC 投标截止为 2026-08-24。",
      "未记录客户触达、伙伴入围或技术规范影响。",
      "电站能源设备需要数字能源正式目录确认。",
    ],
    solutions: [
      { domain: "数据通信", name: "工业园区网络", fit: 72 },
      { domain: "运维", name: "eSight", fit: 68 },
      { domain: "数字能源", name: "数字能源待匹配", fit: 40 },
    ],
    competitors: [
      { name: "EPC 指定供应商", type: "潜在类型", note: "短周期内供应链位置更有利" },
    ],
    actions: [
      { horizon: "7天", text: "仅核实是否存在已入围 EPC 伙伴窗口", owner: "电力行业经理" },
      { horizon: "30天", text: "若无入口则转入观察并跟踪二期", owner: "机会 Owner" },
      { horizon: "90天", text: "补齐数字能源本地可销售目录", owner: "产品经理" },
    ],
    scoreParts: [
      { label: "资金成熟度", value: 19, total: 20 },
      { label: "采购窗口", value: 3, total: 15 },
      { label: "方案匹配", value: 11, total: 20 },
      { label: "参与空间", value: 7, total: 15 },
      { label: "赢单驱动", value: 5, total: 15 },
      { label: "客户触达", value: 2, total: 10 },
      { label: "战略价值", value: 4, total: 5 },
    ],
    risk: 8,
    gate: [
      { label: "实施主体", state: "通过" },
      { label: "资金路径", state: "通过" },
      { label: "方案匹配", state: "待核实" },
      { label: "合规检查", state: "待核实" },
    ],
  },
];

type OpportunitySeed = {
  id: string;
  title: string;
  country: Country;
  industry: string;
  stage: string;
  valueM?: string;
  updated: string;
  source: string;
  sourceUrl?: string;
  deadline?: string;
  daysLeft?: number;
  priority?: Priority;
  score?: number;
};

const meedActiveSeeds: OpportunitySeed[] = [
  { id: "39209", title: "MoMPW, Iraq - Al-Kifil Water Treatment Plant And Transmission Lines", country: "伊拉克", industry: "水务", stage: "Under Construction", valueM: "40", updated: "2026-09-04", source: "MEED Projects", priority: "WATCH", score: 52 },
  { id: "553724", title: "MoE Iraq - Al-Youssifiyah Thermal Power Plant 1400 MW", country: "伊拉克", industry: "电力", stage: "Under Construction", valueM: "1,400", updated: "2026-09-02", source: "MEED Projects", priority: "P1", score: 78 },
  { id: "409637", title: "SCOP, Iraq - Nasiriyah Oil Storage Facility", country: "伊拉克", industry: "油气", stage: "Under Construction", valueM: "400", updated: "2026-09-02", source: "MEED Projects", priority: "P2", score: 68 },
  { id: "48010", title: "Ministry of Oil, Iraq - MoO Strategic Crude Oil Export Pipeline: Basra - Haditha Pipeline", country: "伊拉克", industry: "油气", stage: "Main Contract PQ", valueM: "5,000", updated: "2026-09-01", source: "MEED Projects", priority: "P1", score: 82 },
  { id: "11226", title: "Ministry of Oil, Iraq - Iraq Strategic Crude Oil Export Pipeline: Haditha-Syria Pipeline", country: "伊拉克", industry: "油气", stage: "Study", valueM: "9,000", updated: "2026-09-01", source: "MEED Projects", priority: "WATCH", score: 54 },
  { id: "15882", title: "Ministry of Oil, Iraq - MoO Strategic Crude Oil Export Pipeline", country: "伊拉克", industry: "油气", stage: "Under Construction", valueM: "32,616", updated: "2026-09-01", source: "MEED Projects", priority: "P1", score: 80 },
  { id: "400385", title: "Basra Oil - Al Zubair Photovoltaic Power Plant 400 MW", country: "伊拉克", industry: "电力", stage: "Study", valueM: "400", updated: "2026-09-01", source: "MEED Projects", priority: "P1", score: 76 },
  { id: "466173", title: "CNOOC / Iraq Drilling / Turkish Petroleum - Maysan Degassing Station Upgrading", country: "伊拉克", industry: "油气", stage: "Under Construction", valueM: "1,200", updated: "2026-09-01", source: "MEED Projects", priority: "P1", score: 74 },
  { id: "425027", title: "MoE, Iraq - Najaf 400 KV Substation", country: "伊拉克", industry: "电力", stage: "Under Construction", valueM: "80", updated: "2026-08-30", source: "MEED Projects", priority: "P1", score: 75 },
  { id: "425030", title: "MoE, Iraq - 400 kV Substation at Basra", country: "伊拉克", industry: "电力", stage: "Under Construction", valueM: "80", updated: "2026-08-30", source: "MEED Projects", priority: "P1", score: 75 },
  { id: "508566", title: "MoE, Iraq - Rehabilitation of Al Dora Thermal Power Plant 886 MW", country: "伊拉克", industry: "电力", stage: "Under Construction", valueM: "480", updated: "2026-08-27", source: "MEED Projects", priority: "P1", score: 78 },
  { id: "2754", title: "MoT, Jordan - Jordan Inter-Regional Railway Network", country: "约旦", industry: "交通", stage: "Design", valueM: "305", updated: "2026-08-25", source: "MEED Projects", priority: "P1", score: 77 },
  { id: "575330", title: "WAJ - Greater Irbid Water Distribution Network and Pump Stations", country: "约旦", industry: "水务", stage: "Main Contract Bid", valueM: "35", updated: "2026-08-25", source: "MEED Projects", priority: "P1", score: 76 },
  { id: "557456", title: "MoCH, Iraq - Baghdad Fifth Ring Road", country: "伊拉克", industry: "交通", stage: "Study", valueM: "500", updated: "2026-08-17", source: "MEED Projects" },
  { id: "492411", title: "King Hussein Business Park Phase 2 & 3 Infrastructure", country: "约旦", industry: "商业", stage: "Under Construction (70%)", valueM: "40", updated: "2026-08-17", source: "MEED Projects" },
  { id: "551191", title: "Ajloun Integrated Water Supply Improvements", country: "约旦", industry: "水务", stage: "Study", valueM: "300", updated: "2026-08-16", source: "MEED Projects" },
  { id: "416099", title: "Aqaba Green Ammonia Solar PV Plant 550MW", country: "约旦", industry: "电力", stage: "Study", valueM: "750", updated: "2026-08-16", source: "MEED Projects" },
  { id: "439584", title: "Najaf–Karbala Metro Phase 1", country: "伊拉克", industry: "交通", stage: "Bid Evaluation", valueM: "1,500", updated: "2026-08-13", source: "MEED Projects" },
  { id: "574294", title: "LERA - New Electricity Generation 350MW Solar PV and 1,000MW BESS IPP", country: "黎巴嫩", industry: "电力", stage: "Main Contract PQ", valueM: "1,200", updated: "2026-08-24", source: "MEED Projects", priority: "P1", score: 82 },
  { id: "465765", title: "Al Douh Cement Plant Expansion", country: "伊拉克", industry: "工业", stage: "Under Construction (32%)", valueM: "20", updated: "2026-08-13", source: "MEED Projects" },
  { id: "360342", title: "Rafael City in Baghdad Phase I", country: "伊拉克", industry: "商业", stage: "Design", valueM: "3,500", updated: "2026-08-11", source: "MEED Projects", priority: "P1", score: 76 },
  { id: "411402", title: "Al Bashir Hospitals Obstetrics and Neonatal Care Expansion", country: "约旦", industry: "医疗", stage: "Bid Evaluation", valueM: "25", updated: "2026-08-11", source: "MEED Projects" },
  { id: "374883", title: "Eridu Oil Field Development Block 10", country: "伊拉克", industry: "油气", stage: "Main Contract PQ", valueM: "450", updated: "2026-08-10", source: "MEED Projects", priority: "WATCH", score: 44 },
  { id: "438963", title: "Madinat Al Ward Infrastructure Works", country: "伊拉克", industry: "商业", stage: "Under Construction (48%)", valueM: "50", updated: "2026-08-10", source: "MEED Projects" },
  { id: "318471", title: "Madinat Al Ward Smart City Master Plan", country: "伊拉克", industry: "商业", stage: "Under Construction (30%)", valueM: "9,840", updated: "2026-08-10", source: "MEED Projects", priority: "P0", score: 82 },
  { id: "539348", title: "North Rumaila NGL Additional North Compression 4th Train", country: "伊拉克", industry: "油气", stage: "Main Contract Bid", valueM: "55", updated: "2026-08-07", source: "MEED Projects" },
  { id: "468491", title: "Redevelopment of British Embassy Baghdad Phase 1 & 2", country: "伊拉克", industry: "政府", stage: "Main Contract PQ", valueM: "38", updated: "2026-08-07", source: "MEED Projects", priority: "WATCH", score: 40 },
  { id: "573648", title: "Kirkuk Oil Field Redevelopment Power Plant 400MW", country: "伊拉克", industry: "电力", stage: "FEED", valueM: "600", updated: "2026-08-06", source: "MEED Projects" },
  { id: "572826", title: "Rehabilitation of Al-Qayyarah Airbase", country: "伊拉克", industry: "军队", stage: "Study", valueM: "664", updated: "2026-08-05", source: "MEED Projects", priority: "WATCH", score: 38 },
  { id: "344634", title: "Reconstruction of Beirut Port", country: "黎巴嫩", industry: "交通", stage: "Design", valueM: "90", updated: "2026-08-04", source: "MEED Projects" },
  { id: "536783", title: "Toyota Manufacturing Plant in Iraq", country: "伊拉克", industry: "工业", stage: "Design", valueM: "23", updated: "2026-08-04", source: "MEED Projects" },
  { id: "573021", title: "Occucare Women & Children Hospital in Baghdad", country: "伊拉克", industry: "医疗", stage: "Design", valueM: "35", updated: "2026-08-03", source: "MEED Projects" },
  { id: "442800", title: "Iraq 2,000MW Flare Gas-to-Power Plant", country: "伊拉克", industry: "电力", stage: "Study", valueM: "2,000", updated: "2026-08-03", source: "MEED Projects" },
  { id: "539701", title: "West Qurna 2 Yamama Gathering System Package B1/B2", country: "伊拉克", industry: "油气", stage: "FEED", valueM: "400", updated: "2026-07-31", source: "MEED Projects" },
  { id: "477998", title: "Brissa Dam Full Lining and Water Diversion Lot 1", country: "黎巴嫩", industry: "水务", stage: "Bid Evaluation", valueM: "18", updated: "2026-07-30", source: "MEED Projects" },
  { id: "569292", title: "Amrah City Sustainable Urban Development", country: "约旦", industry: "商业", stage: "Under Construction (4%)", valueM: "3,170", updated: "2026-07-30", source: "MEED Projects", priority: "P1", score: 77 },
  { id: "364062", title: "Block 11 IT and Telecom Infrastructure Works", country: "伊拉克", industry: "油气", stage: "Design", valueM: "60", updated: "2026-07-30", source: "MEED Projects", priority: "P0", score: 84 },
  { id: "357624", title: "Jordan New and Expanded 132/33kV Substations", country: "约旦", industry: "电力", stage: "Under Construction (4%)", valueM: "60", updated: "2026-07-30", source: "MEED Projects" },
  { id: "491826", title: "Nahr Bin Omar Gas Field Phase 2", country: "伊拉克", industry: "油气", stage: "Main Contract PQ", valueM: "850", updated: "2026-07-30", source: "MEED Projects" },
  { id: "572182", title: "Al Zumleh–Za’atari Water Transmission Pipeline", country: "约旦", industry: "水务", stage: "Main Contract Bid", valueM: "300", updated: "2026-07-30", source: "MEED Projects" },
  { id: "242152", title: "Basrah Refinery Crude Oil Storage & Pumping", country: "伊拉克", industry: "油气", stage: "Main Contract Bid", valueM: "47", updated: "2026-07-29", source: "MEED Projects" },
  { id: "539959", title: "Natural Gas Processing Plant in Jordan", country: "约旦", industry: "油气", stage: "Study", valueM: "410", updated: "2026-07-29", source: "MEED Projects" },
  { id: "571177", title: "Amra International Convention and Exhibition Centre", country: "约旦", industry: "商业", stage: "Design", valueM: "70", updated: "2026-07-28", source: "MEED Projects" },
  { id: "554959", title: "Amrah City Phase 1 Master Plan", country: "约旦", industry: "商业", stage: "Under Construction (4%)", valueM: "0", updated: "2026-07-28", source: "MEED Projects" },
  { id: "411227", title: "Jordan New City Development", country: "约旦", industry: "商业", stage: "Study", valueM: "2,000", updated: "2026-07-28", source: "MEED Projects" },
  { id: "253096", title: "Jordan Railway Zarqa–Iraq Link", country: "约旦", industry: "交通", stage: "Study", valueM: "410", updated: "2026-07-28", source: "MEED Projects" },
  { id: "411091", title: "Iraq Ministry of Youth Employee Housing Complex", country: "伊拉克", industry: "政府", stage: "Bid Evaluation", valueM: "350", updated: "2026-07-28", source: "MEED Projects" },
  { id: "477495", title: "Marsa Zayed Phase 1 Riviera Heights", country: "约旦", industry: "商业", stage: "Design", valueM: "3,700", updated: "2026-07-27", source: "MEED Projects" },
  { id: "240942", title: "Bin Umar Gas Processing Plant", country: "伊拉克", industry: "油气", stage: "FEED", valueM: "800", updated: "2026-07-24", source: "MEED Projects" },
  { id: "312057", title: "Rehabilitation of Baiji 1 & 2 Gas-Fired Power Plants", country: "伊拉克", industry: "电力", stage: "Under Construction (43%)", valueM: "1,300", updated: "2026-07-24", source: "MEED Projects" },
  { id: "409547", title: "Khayrat Cement Plant", country: "伊拉克", industry: "工业", stage: "Under Construction (45%)", valueM: "200", updated: "2026-07-23", source: "MEED Projects" },
  { id: "416098", title: "Aqaba Green Ammonia Plant", country: "约旦", industry: "工业", stage: "FEED", valueM: "1,000", updated: "2026-07-22", source: "MEED Projects" },
  { id: "571605", title: "Green Hydrogen Project in Jordan", country: "约旦", industry: "电力", stage: "Study", valueM: "1,150", updated: "2026-07-22", source: "MEED Projects" },
  { id: "466000", title: "Baghdad Fourth Ring Road Section 1", country: "伊拉克", industry: "交通", stage: "Bid Evaluation", valueM: "150", updated: "2026-07-22", source: "MEED Projects" },
  { id: "512568", title: "Arab Potash Brine Recovery", country: "约旦", industry: "工业", stage: "Bid Evaluation", valueM: "25", updated: "2026-07-22", source: "MEED Projects" },
  { id: "363891", title: "Baghdad Fourth Ring Road Master Plan", country: "伊拉克", industry: "交通", stage: "Bid Evaluation", valueM: "0", updated: "2026-07-22", source: "MEED Projects" },
  { id: "426406", title: "Zarqa and Ghor Alsafi Substation Expansion", country: "约旦", industry: "电力", stage: "Under Construction (4%)", valueM: "40", updated: "2026-07-22", source: "MEED Projects" },
  { id: "466001", title: "Baghdad Fourth Ring Road Section 2", country: "伊拉克", industry: "交通", stage: "Design", valueM: "150", updated: "2026-07-22", source: "MEED Projects" },
  { id: "466002", title: "Baghdad Fourth Ring Road Section 3", country: "伊拉克", industry: "交通", stage: "Design", valueM: "158", updated: "2026-07-22", source: "MEED Projects" },
  { id: "416017", title: "Aqaba Green Ammonia Master Plan", country: "约旦", industry: "工业", stage: "FEED", valueM: "0", updated: "2026-07-22", source: "MEED Projects" },
  { id: "380039", title: "Aqaba Science Hub and Public Aquarium", country: "约旦", industry: "商业", stage: "Main Contract PQ", valueM: "25", updated: "2026-07-21", source: "MEED Projects" },
  { id: "413232", title: "Gas Growth Integrated Project Master Plan", country: "伊拉克", industry: "油气", stage: "Under Construction (37%)", valueM: "16,232", updated: "2026-07-20", source: "MEED Projects" },
  { id: "344460", title: "GGIP Central Gas Complex", country: "伊拉克", industry: "油气", stage: "Under Construction (13%)", valueM: "1,610", updated: "2026-07-20", source: "MEED Projects" },
  { id: "321835", title: "Hermel Concentrated Solar Power Plant 50MW", country: "黎巴嫩", industry: "电力", stage: "Bid Evaluation", valueM: "50", updated: "2026-07-19", source: "MEED Projects" },
];

const officialTenderSeeds: OpportunitySeed[] = [
  { id: "JONEPS-2026003010-02", title: "Jordan Government MPLS Lines and SD-WAN License Renewal", country: "约旦", industry: "政府", stage: "公开招标", updated: "2026-09-03", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do", deadline: "2026-09-15", daysLeft: 10, priority: "P1", score: 78 },
  { id: "PPA-LB-12638", title: "Ogero KYOCERA Document Equipment Maintenance", country: "黎巴嫩", industry: "运营商", stage: "公开招标", updated: "2026-09-03", source: "Lebanon Public Procurement Authority", sourceUrl: "https://www.ppa.gov.lb/ar/tenders/details/12638/contracts", deadline: "待公布", priority: "WATCH", score: 43 },
  { id: "JONEPS-2026001574-04", title: "Jordan SANAD AI Interactive Chatbot Platform", country: "约旦", industry: "政府", stage: "资格预审", updated: "2026-09-03", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListPQAL.do", priority: "P1", score: 74 },
  { id: "JONEPS-2026001336-01", title: "Jordan Customs Operations and Control Center Electronic Systems", country: "约旦", industry: "政府", stage: "资格预审", updated: "2026-09-03", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListPQAL.do", priority: "P1", score: 77 },
  { id: "JONEPS-2026002489-02", title: "Jordan National Unified Registry System NUR 2 Upgrade", country: "约旦", industry: "政府", stage: "公开招标", updated: "2026-08-17", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000", deadline: "2026-08-24", daysLeft: 7, priority: "P1", score: 76 },
  { id: "JONEPS-2026002929-00", title: "Qasr Amra Visitor Centre CCTV System", country: "约旦", industry: "政府", stage: "公开招标", updated: "2026-08-17", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000", deadline: "2026-08-30", daysLeft: 13, priority: "P2", score: 64 },
  { id: "JONEPS-2026002606-03", title: "ISO 27001 Renewal and Risk Assessment", country: "约旦", industry: "政府", stage: "公开招标", updated: "2026-08-17", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000", deadline: "2026-08-26", daysLeft: 9, priority: "P2", score: 55 },
  { id: "JONEPS-2026002340-01", title: "Petra Education Directorate PBX and Accessories", country: "约旦", industry: "教育", stage: "公开招标", updated: "2026-08-16", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000", deadline: "2026-09-06", daysLeft: 20, priority: "P2", score: 59 },
  { id: "JONEPS-2026001926-03", title: "Jordan Ministry of Health Computers, Displays and Printers", country: "约旦", industry: "医疗", stage: "公开招标", updated: "2026-08-16", source: "Jordan JONEPS", sourceUrl: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000", deadline: "2026-08-24", daysLeft: 7, priority: "P2", score: 57 },
  { id: "SRC-587-2026", title: "South Refineries Vehicle Tracking Service", country: "伊拉克", industry: "油气", stage: "公开招标", updated: "2026-08-17", source: "Iraq South Refineries Company", sourceUrl: "https://src.gov.iq/muaqasat-local.aspx", deadline: "2026-08-24", daysLeft: 7, priority: "P2", score: 61 },
  { id: "SRC-526-2025", title: "South Refineries Hydrogenation CCTV System", country: "伊拉克", industry: "油气", stage: "公开招标", updated: "2026-08-17", source: "Iraq South Refineries Company", sourceUrl: "https://src.gov.iq/muaqasat-local.aspx", deadline: "2026-08-18", daysLeft: 1, priority: "WATCH", score: 46 },
  { id: "CDR-1248", title: "Lebanon GATE Solid-Waste Treatment Facilities Study and Supervision", country: "黎巴嫩", industry: "政府", stage: "意向征集", updated: "2026-08-10", source: "Lebanon CDR", sourceUrl: "https://www.cdr.gov.lb/ar/Procurment.aspx?aliaspath=%2FProcurment&sortExtendedDeadLine=ASC", deadline: "2026-09-03", daysLeft: 17, priority: "P2", score: 54 },
  { id: "MEMR-11M-2026", title: "Technical Services for Optimization of Oil and Petroleum Products Storage Capacities in Jordan", country: "约旦", industry: "油气", stage: "公开招标", updated: "2026-08-17", source: "Jordan Ministry of Energy and Mineral Resources", sourceUrl: "https://www.memr.gov.jo/en/modules/tenders", deadline: "2026-08-21", daysLeft: 4, priority: "P2", score: 63 },
  { id: "PPA-LB-12343", title: "Lebanon General Security IT Equipment Maintenance", country: "黎巴嫩", industry: "政府", stage: "公开招标", updated: "2026-08-17", source: "Lebanon Public Procurement Authority", sourceUrl: "https://www.ppa.gov.lb/en", deadline: "2026-08-18", daysLeft: 1, priority: "WATCH", score: 52 },
  { id: "PPA-LB-12356", title: "Lebanon Presidency of Council of Ministers Generator Replacement", country: "黎巴嫩", industry: "电力", stage: "公开招标", updated: "2026-08-17", source: "Lebanon Public Procurement Authority", sourceUrl: "https://www.ppa.gov.lb/en", deadline: "2026-08-18", daysLeft: 1, priority: "WATCH", score: 49 },
  { id: "CDR-1230", title: "CDR Network Room Relocation", country: "黎巴嫩", industry: "政府", stage: "RFQ", updated: "2026-08-17", source: "Lebanon CDR", sourceUrl: "https://cdr.gov.lb/en-US/Procurment.aspx", deadline: "2026-08-17", daysLeft: 0, priority: "WATCH", score: 44 },
];

const stageScore = (stage: string) => stage.includes("Study") ? 73 : stage.includes("Design") || stage.includes("FEED") ? 75 : stage.includes("PQ") || stage.includes("Main Contract Bid") ? 72 : stage.includes("Bid Evaluation") ? 58 : stage.match(/\((\d+)%\)/) ? Number(stage.match(/\((\d+)%\)/)?.[1]) <= 50 ? 62 : 45 : 60;
const stagePriority = (stage: string, score: number): Priority => stage.match(/\((\d+)%\)/) && Number(stage.match(/\((\d+)%\)/)?.[1]) > 65 ? "WATCH" : score >= 68 ? "P1" : score >= 52 ? "P2" : "WATCH";

export function matchHuaweiOfficialSolutions(industry: string, title = "") {
  const text = `${industry} ${title}`.toLowerCase();
  const matchedCatalog = huaweiOfficialSolutionCatalog
    .map(item => {
      const industryHit = item.industries.some(value => text.includes(value.toLowerCase())) ? 2 : 0;
      const keywordHit = item.keywords.filter(keyword => text.includes(keyword.toLowerCase())).length;
      return { item, weight: industryHit + keywordHit };
    })
    .filter(row => row.weight > 0)
    .sort((a, b) => b.weight - a.weight)
    .map(row => row.item);
  return matchedCatalog.length ? matchedCatalog : huaweiOfficialSolutionCatalog.filter(item => ["HW-CAT-NETWORK", "HW-CAT-CLOUD", "HW-CAT-STORAGE", "HW-CAT-OAM"].includes(item.id));
}

const seedSolutions = (industry: string, title = "") => {
  const text = `${industry} ${title}`.toLowerCase();
  if (/运营商|isp|ogero|telecom|fiber|fttx|transmission|internet|mobile|operator/.test(text)) return [
    { domain: "企业光网络", name: "OptiXaccess / OptiXtrans光接入与传输", fit: 90 },
    { domain: "数据通信", name: "NetEngine IP/MPLS + CloudEngine DC网络", fit: 88 },
    { domain: "云", name: "华为云Stack运营商边缘/私有云资源池", fit: 80 },
    { domain: "存储", name: "OceanStor计费、日志、业务数据与备份", fit: 76 },
    { domain: "运维", name: "eSight / NeoSight统一ICT运维", fit: 82 },
  ];
  if (/电力|electricity|power|substation|solar|hydrogen|ammonia|generator|energy/.test(text)) return [
    { domain: "数据通信", name: "CloudEngine / NetEngine智能电力数据网络", fit: 84 },
    { domain: "企业光网络", name: "OptiXtrans电力通信与站点承载", fit: 82 },
    { domain: "云+存储", name: "华为云Stack + OceanStor生产数据/调度平台", fit: 78 },
    { domain: "运维", name: "eSight统一ICT运维", fit: 76 },
    { domain: "数字能源", name: "站点供电、备电与新能源场景待勘察", fit: 72 },
  ];
  if (/油气|oil|gas|refinery|pipeline|storage|field|petroleum/.test(text)) return [
    { domain: "企业无线", name: "行业专网 / 企业微波 / 企业云核", fit: 88 },
    { domain: "数据通信", name: "CloudEngine / NetEngine工业园区与骨干承载", fit: 86 },
    { domain: "存储", name: "OceanStor视频、生产数据与灾备", fit: 80 },
    { domain: "计算", name: "鲲鹏边缘计算与AI巡检承载", fit: 76 },
    { domain: "运维", name: "eSight统一ICT运维", fit: 78 },
  ];
  if (/road|railway|transport|traffic|airport|port|道路|铁路|交通|水运|港口|机场/.test(text)) return [
    { domain: "数据通信", name: "CloudEngine / NetEngine交通承载与控制中心网络", fit: 88 },
    { domain: "企业光网络", name: "OptiXtrans / F5G站点与城域传输", fit: 84 },
    { domain: "云", name: "华为云Stack交通IOC与行业平台", fit: 78 },
    { domain: "存储", name: "OceanStor视频与运营数据存储", fit: 80 },
    { domain: "运维", name: "eSight统一ICT运维", fit: 76 },
  ];
  if (/政府|government|customs|registry|security|municipality|医疗|health|hospital|教育|education|school|金融|finance|bank|retail|commercial|商业/.test(text)) return [
    { domain: "数据通信", name: "CloudEngine / NetEngine / AirEngine园区与DC网络", fit: 86 },
    { domain: "云", name: "华为云Stack政企私有云/混合云", fit: 84 },
    { domain: "存储", name: "OceanStor核心数据、视频与备份", fit: 82 },
    { domain: "计算", name: "鲲鹏通算 + 昇腾AI算力", fit: 78 },
    { domain: "智能协作", name: "IdeaHub / CloudLink会议、教学与会诊", fit: 72 },
    { domain: "运维", name: "eSight / NeoSight统一ICT运维", fit: 78 },
  ];
  return matchHuaweiOfficialSolutions(industry, title).slice(0, 4).map((item, index) => ({
    domain: item.category,
    name: item.productFamilies.slice(0, 3).join(" / "),
    fit: [82, 78, 75, 72][index] ?? 70,
  }));
};

const officialSourceContacts: Array<{ test: RegExp; contact: OpportunityContact }> = [
  {
    test: /Jordan JONEPS|JONEPS-/i,
    contact: {
      role: "Procurement platform support",
      company: "Jordan Government Procurement Department / JONEPS",
      name: "JONEPS Support Center",
      title: "Procurement Support",
      email: "joneps@gpd.gov.jo",
      phone: "+962 78 200 7789",
      companyPhone: "+962 78 200 7791",
      source: "JONEPS official contact page",
    },
  },
  {
    test: /Jordan Ministry of Energy and Mineral Resources|MEMR-/i,
    contact: {
      role: "Owner procurement contact",
      company: "Ministry of Energy and Mineral Resources of Jordan",
      name: "MEMR Contact Center",
      title: "Procurement / Contact Center",
      email: "memr@memr.gov.jo",
      phone: "+962 6 580 3060",
      companyPhone: "+962 6 580 5700",
      source: "MEMR official contact page",
    },
  },
  {
    test: /Iraq South Refineries Company|SRC-/i,
    contact: {
      role: "Owner tender contact",
      company: "South Refineries Company",
      name: "SRC Tender Office",
      title: "Procurement / Tender Office",
      email: "info@src.gov.iq",
      phone: "+964 780 555 1133",
      companyPhone: "37007-37008",
      source: "South Refineries Company official website",
    },
  },
  {
    test: /Lebanon CDR|CDR-/i,
    contact: {
      role: "Owner procurement contact",
      company: "Council for Development and Reconstruction",
      name: "CDR Info Center",
      title: "Procurement / Info Center",
      email: "infocenter@cdr.gov.lb",
      phone: "+961 1 980 096",
      companyPhone: "+961 1 981 252",
      source: "CDR official contact page",
    },
  },
  {
    test: /Lebanon Public Procurement Authority|PPA-LB/i,
    contact: {
      role: "Public procurement authority",
      company: "Lebanon Public Procurement Authority",
      name: "PPA Contact Center",
      title: "Procurement Authority",
      email: "contact@ppa.gov.lb",
      phone: "+961 1 725 548",
      companyPhone: "+961 1 725 548",
      source: "PPA official contact page",
    },
  },
  {
    test: /Ogero|Lebanon Ogero/i,
    contact: {
      role: "Tender and contracts sector",
      company: "Ogero",
      name: "Ogero Tenders and Contracts",
      title: "Procurement / Contracts Office",
      phone: "+961 1 826 840",
      companyPhone: "+961 1 840 000",
      source: "Ogero official bids page and Lebanon PPA entity page",
    },
  },
  {
    test: /Alfa|MIC1/i,
    contact: {
      role: "Business opportunity contact",
      company: "Alfa / MIC1",
      name: "Alfa Customer Care Team",
      title: "Business Opportunity Contact",
      email: "alfa.customercareteam@alfamobile.com.lb",
      phone: "+961 3 391 000",
      companyPhone: "111",
      source: "Alfa official business opportunity page",
    },
  },
];

const officialContactsFor = (item: Opportunity) => {
  const searchable = `${item.id} ${item.source} ${item.title} ${item.titleEn}`;
  return officialSourceContacts
    .filter(entry => entry.test.test(searchable))
    .map(entry => entry.contact);
};

const attachContacts = (item: Opportunity): Opportunity => {
  const meedContacts = meedContactDirectory[item.id as keyof typeof meedContactDirectory] as readonly OpportunityContact[] | undefined;
  const officialContacts = officialContactsFor(item);
  const contacts = [...(meedContacts ?? []), ...officialContacts];
  return contacts.length ? { ...item, contacts } : item;
};

const generatedOpportunities: Opportunity[] = [...meedActiveSeeds, ...officialTenderSeeds]
  .filter(seed => !curatedOpportunities.some(item => item.id === `MEED-${seed.country === "伊拉克" ? "IQ" : seed.country === "约旦" ? "JO" : "LB"}-${seed.id}`))
  .map(seed => {
    const baseScore = seed.score ?? stageScore(seed.stage);
    const priority = seed.priority ?? stagePriority(seed.stage, baseScore);
    const sensitive = /Defence|Embassy|Airbase|Naval/i.test(seed.title);
    const sourceRef = seed.source === "MEED Projects" ? `MEED Projects #${seed.id}` : `${seed.source} · ${seed.id}`;
    return {
      id: seed.source === "MEED Projects" ? `MEED-${seed.country === "伊拉克" ? "IQ" : seed.country === "约旦" ? "JO" : "LB"}-${seed.id}` : seed.id,
      title: seed.title,
      titleEn: seed.title,
      country: seed.country,
      city: "待核实",
      industry: seed.industry,
      stage: seed.stage,
      priority: sensitive ? "WATCH" : priority,
      score: sensitive ? Math.min(baseScore, 42) : baseScore,
      confidence: seed.source === "MEED Projects" ? 0.76 : 0.9,
      value: seed.valueM ? `$${seed.valueM}M` : "未披露",
      addressable: "待拆分ICT工作包",
      deadline: seed.deadline ?? "待公布",
      daysLeft: seed.daysLeft ?? null,
      owner: `${seed.country} Industry Team`,
      ownerInitials: seed.country === "伊拉克" ? "IQ" : seed.country === "约旦" ? "JO" : "LB",
      source: seed.sourceUrl ? `${sourceRef} · ${seed.sourceUrl}` : `${sourceRef} · 30-day active pool`,
      updated: seed.updated,
      funding: "来源页面未完整披露，待核实",
      participation: sensitive ? "低" : priority === "P1" || priority === "P0" ? "高" : priority === "P2" ? "中" : "低",
      win: "中",
      summary: `${sourceRef}已确认项目名称、国家、阶段${seed.valueM ? "和项目净值" : ""}${seed.deadline ? "及截标日期" : ""}。华为机会判断基于行业场景和采购窗口，必须继续核实独立ICT工作包、资金、实施主体、技术规格与伙伴入口。`,
      evidence: [
        `${sourceRef}于${seed.updated}显示该记录。`,
        `已核验字段：${seed.country} · ${seed.industry} · ${seed.stage}${seed.valueM ? ` · $${seed.valueM}M` : ""}${seed.deadline ? ` · 截止${seed.deadline}` : ""}。`,
        "方案匹配、参与空间、竞争对手和赢单判断属于内部分析，不代表源站已确认。",
      ],
      solutions: seedSolutions(seed.industry, seed.title),
      competitors: [{ name: "项目顾问/EPC既有供应链", type: "潜在类型", note: "源站未披露已确认参标品牌，需通过业主、顾问和伙伴继续核实" }, { name: "本地行业系统集成商", type: "潜在类型", note: "可能掌握应用层、现场交付和客户入口" }],
      actions: [{ horizon: "7天", text: "核实ICT工作包、业主/顾问/EPC与采购里程碑", owner: "行业客户经理" }, { horizon: "30天", text: "形成华为方案匹配与伙伴进入路径", owner: "解决方案团队" }, { horizon: "90天", text: "完成联合方案、合规和竞争策略复核", owner: "机会Owner" }],
      scoreParts: [{ label: "资金成熟度", value: 8, total: 20 }, { label: "采购窗口", value: priority === "P1" ? 13 : 8, total: 15 }, { label: "方案匹配", value: 16, total: 20 }, { label: "参与空间", value: 11, total: 15 }, { label: "赢单驱动", value: 8, total: 15 }, { label: "客户触达", value: 3, total: 10 }, { label: "战略价值", value: 4, total: 5 }],
      risk: sensitive ? 12 : seed.daysLeft !== undefined && seed.daysLeft <= 3 ? 9 : 3,
      gate: [{ label: "实施主体", state: "待核实" }, { label: "资金路径", state: "待核实" }, { label: "方案匹配", state: "待核实" }, { label: "合规检查", state: sensitive ? "风险" : "待核实" }],
    };
  });

export const opportunities: Opportunity[] = [...curatedOpportunities, ...generatedOpportunities].map(attachContacts);

export const sourceConnectorConfig = {
  meed: {
    name: "MEED Projects",
    status: "GitHub Actions采集器已接入",
    statusEn: "GitHub Actions collector wired",
    projectSearchUrl: "https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000013-4000014-4000016&ProjectFields=MEEDTitle-ProfileType-MEEDCountry-Industry-MEEDStage-LastUpdatedOnString-ProjectValue-MainContractAward-MainContractCompletion",
    envKeys: ["MEED_EXPORT_CSV_URL", "MEED_API_BASE_URL", "MEED_API_KEY", "MEED_USERNAME", "MEED_PASSWORD", "MEED_SESSION_COOKIE", "MEED_AUTH_MODE", "MEED_INGEST_TOKEN", "MEED_INGEST_ENDPOINT", "MEED_PROJECT_SEARCH_URL", "MEED_USERNAME_SELECTOR", "MEED_PASSWORD_SELECTOR", "MEED_LOGIN_BUTTON_SELECTOR"],
    supportedImportFiles: ["ProjectListingExport.xlsx", "CompanyProjectsExport.xlsx", "ProjectContactsExport.xlsx"],
    note: "GitHub Actions每周使用Playwright登录MEED并下载Excel，再通过/api/meed-ingest写回平台。若MEED触发验证码、MFA或许可限制，采集会失败并上传截图/日志供人工处理。",
    noteEn: "GitHub Actions uses Playwright weekly to log in to MEED, download Excel, and sync back through /api/meed-ingest. If CAPTCHA, MFA or licensing restrictions are triggered, the run fails with screenshots/logs for manual handling.",
  },
  githubActionsCollector: {
    status: "已创建工作流",
    statusEn: "Workflow created",
    workflow: ".github/workflows/meed-weekly-ingest.yml",
    schedule: "每周一 07:20 Baghdad",
    scheduleEn: "Every Monday 07:20 Baghdad",
    ingestApi: "/api/meed-ingest",
    script: "scripts/meed-github-ingest.mjs",
    requiredSecrets: ["MEED_USERNAME", "MEED_PASSWORD", "MEED_INGEST_TOKEN", "MEED_INGEST_ENDPOINT"],
    optionalSecrets: ["MEED_PROJECT_SEARCH_URL", "MEED_USERNAME_SELECTOR", "MEED_PASSWORD_SELECTOR", "MEED_LOGIN_BUTTON_SELECTOR", "CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET"],
    outputs: ["ProjectListing Excel artifact", "meed-ingest-payload.json", "failure screenshot when blocked"],
    outputsEn: ["ProjectListing Excel artifact", "meed-ingest-payload.json", "failure screenshot when blocked"],
  },
  telegramTenderRadar: {
    status: "已创建日扫工作流",
    statusEn: "Daily workflow created",
    workflow: ".github/workflows/telegram-tender-radar.yml",
    schedule: "每日 08:10 Baghdad",
    scheduleEn: "Daily 08:10 Baghdad",
    ingestApi: "/api/telegram-ingest",
    script: "scripts/telegram-tender-ingest.mjs",
    channels: ["inainaiq", "IraqiPMOEng", "rudawdigital", "Petranews", "royatv", "AlMamlakaTV", "MTVLebanonNews", "LBCI_NEWS", "Aljadeedtelegram"],
    requiredSecrets: ["NEWS_INGEST_TOKEN 或复用 MEED_INGEST_TOKEN", "TELEGRAM_INGEST_ENDPOINT"],
    optionalSecrets: ["TELEGRAM_CHANNELS", "TELEGRAM_BOT_TOKEN", "TELEGRAM_BOT_DEFAULT_COUNTRY", "CF_ACCESS_CLIENT_ID", "CF_ACCESS_CLIENT_SECRET"],
    note: "公开频道抓取为默认模式；如果Bot已加入频道，可同时读取Bot API。只采集招标、采购、RFP/RFQ/EOI/PQ、授标、澄清、延期和供应商注册类信息，不抓普通新闻。",
    noteEn: "Public channel preview scraping is the default mode; Bot API is also supported when the bot has channel access. Only tender, procurement, RFP/RFQ/EOI/PQ, award, clarification, extension and supplier-registration messages are collected.",
  },
  officialTenderScan: {
    status: "已更新至2026-09-05",
    statusEn: "Updated through 2026-09-05",
    promotedIds: ["JONEPS-2026003010-02", "PPA-LB-12638", "JONEPS-2026001574-04", "JONEPS-2026001336-01"],
  },
};

export const sourceCoverage = {
  verifiedAt: "2026-09-05 16:04 Baghdad",
  meed: { total: 3027, active: 1063, recent30Days: 136, promotedToRadar: meedActiveSeeds.length },
  officialTenders: { promotedToRadar: officialTenderSeeds.length },
  sources: [
    { name: "MEED Projects", country: "Levant", countryEn: "Levant", priority: "P0", status: "待API/导出绑定", statusEn: "API/export binding required", mode: "需MEED API或ProjectListing导出", modeEn: "MEED API or ProjectListing export", url: "https://premium.meedprojects.com/Projects" },
    { name: "Iraq ITP", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "统一招标窗口；动态网页，待接口/渲染采集", modeEn: "Unified tender window; dynamic page, API/rendering pending", url: "https://itp.iq" },
    { name: "Iraq Ministry of Communications", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "ITPC、政府云、光纤、数据中心、网络安全", modeEn: "ITPC, government cloud, fiber, data center, cybersecurity", url: "https://moc.gov.iq/?page=23" },
    { name: "Iraq Ministry of Electricity", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "数字能源、储能、SCADA、通信网、智能电表", modeEn: "Digital power, BESS, SCADA, telecom network, smart meters", url: "https://moelc.gov.iq/?tender=" },
    { name: "Iraq Ministry of Oil", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "部委及油企招标入口；油田专网/工业网络/安防", modeEn: "Ministry and oil-company tenders; oilfield private network/industrial network/security", url: "https://www.oil.gov.iq/?tender=" },
    { name: "Iraq Ministry of Transport", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "铁路、港口、机场、公路ICT、调度通信", modeEn: "Railway, port, airport, road ICT and dispatch communications", url: "https://www.mot.gov.iq/" },
    { name: "Iraq ITPC", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "国家骨干网、政府专网、光传送/IP、数据中心", modeEn: "National backbone, government private network, optical/IP, data center", url: "https://itpc.gov.iq/" },
    { name: "Iraq National Investment Commission", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "投资机会、PPP、产业园、新城和光伏前期商机", modeEn: "Investment opportunities, PPPs, industrial parks, new cities and solar pre-opportunities", url: "https://investpromo.gov.iq/investment-opportunities/" },
    { name: "Iraq Ministry of Planning", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "投资计划、项目库、采购规则、统一窗口交叉校验", modeEn: "Investment plans, project library, procurement rules and unified-window cross-check", url: "https://mop.gov.iq/" },
    { name: "Iraq SOMO", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "采购公告/结果", modeEn: "Procurement notices and results", url: "https://www.somooil.gov.iq/announcements/general" },
    { name: "Iraq IOTC", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "船舶通信、物流和油品运输数字化", modeEn: "Vessel communications, logistics and oil transport digitalization", url: "https://iotc.oil.gov.iq/" },
    { name: "South Refineries Company", country: "伊拉克", countryEn: "Iraq", priority: "P0", status: "已录入", statusEn: "Added", mode: "公开招标页", modeEn: "Public tender page", url: "https://src.gov.iq/muaqasat-local.aspx" },
    { name: "KRG Tenders", country: "伊拉克", countryEn: "Iraq", priority: "P2", status: "补漏监控", statusEn: "Gap monitoring", mode: "库区政府项目，公开更新不稳定", modeEn: "Kurdistan regional government projects; public updates are uneven", url: "https://gov.krd/english/hot-topics/tenders/" },
    { name: "Iraq Business News Tenders", country: "伊拉克", countryEn: "Iraq", priority: "补漏", status: "交叉校验", statusEn: "Cross-check", mode: "国际机构、NGO、使馆和零散采购补漏", modeEn: "Gap check for IFI, NGO, embassy and scattered procurement notices", url: "https://www.iraq-businessnews.com/tenders/" },
    { name: "Jordan JONEPS", country: "约旦", countryEn: "Jordan", priority: "P0", status: "2026-09-03增量已录入", statusEn: "2026-09-03 delta added", mode: "国家电子采购主入口；附件/投标可能需登录", modeEn: "Main national e-procurement portal; attachments/bidding may require login", url: "https://www.joneps.gov.jo/ep/invt/selectListTendInvitAL.do?menuId=EP03000000&noneMn=Y&subMenuId=EP03010100&upperMenuId=EP03010000" },
    { name: "Jordan Government Tenders Department", country: "约旦", countryEn: "Jordan", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "工程、基础设施、开标和技术标结果；与JONEPS关联去重", modeEn: "Works, infrastructure, bid openings and technical results; de-duplicated with JONEPS", url: "https://www.gtd.gov.jo/Default/En" },
    { name: "Jordan NEPCO", country: "约旦", countryEn: "Jordan", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "电力通信、调度、网络安全、资产管理、智能电网", modeEn: "Power communications, dispatching, cybersecurity, asset management and smart grid", url: "https://www.nepco.com.jo/en/Tenders.aspx" },
    { name: "Jordan MEMR", country: "约旦", countryEn: "Jordan", priority: "P0", status: "已录入", statusEn: "Added", mode: "能源、油气、电力行业招标", modeEn: "Energy, oil & gas and electricity tenders", url: "https://www.memr.gov.jo/en/modules/tenders" },
    { name: "Jordan MWI", country: "约旦", countryEn: "Jordan", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "水务数字化、泵站控制、光伏、智能水表、GIS/SCADA", modeEn: "Water digitalization, pump control, solar, smart meters, GIS/SCADA", url: "https://www.mwi.gov.jo/en/Modules/Tenders" },
    { name: "Jordan ASEZA", country: "约旦", countryEn: "Jordan", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "亚喀巴港口、园区、城市管理、旅游和基础设施ICT", modeEn: "Aqaba port, zone, city management, tourism and infrastructure ICT", url: "https://aseza.jo/En/Modules/Tenders" },
    { name: "Jordan PPP Unit", country: "约旦", countryEn: "Jordan", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "PPP储备、顾问、可研和重大基础设施前期机会", modeEn: "PPP pipeline, advisors, feasibility studies and early major infrastructure opportunities", url: "https://pppu.gov.jo/Default/En" },
    { name: "Lebanon Public Procurement Authority", country: "黎巴嫩", countryEn: "Lebanon", priority: "P0", status: "2026-09-03 Ogero增量已纳入", statusEn: "2026-09-03 Ogero delta added", mode: "中央采购公告、采购计划、评标、中标、合同和执行", modeEn: "Central notices, procurement plans, evaluations, awards, contracts and execution", url: "https://www.ppa.gov.lb/en/tenders" },
    { name: "Lebanon CDR", country: "黎巴嫩", countryEn: "Lebanon", priority: "P0", status: "已录入", statusEn: "Added", mode: "世行/IsDB/Kuwait Fund等融资项目，含资金来源和截止日期", modeEn: "World Bank/IsDB/Kuwait Fund financed projects with funding source and deadlines", url: "https://www.cdr.gov.lb/en-US/Procurment.aspx" },
    { name: "Lebanon EDL", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "电网、可再生能源、智能计量、数据中心、通信及控制", modeEn: "Grid, renewable energy, smart metering, data center, communications and control", url: "https://www.edl.gov.lb/page.php?lang=en&pid=37" },
    { name: "Ogero Bids", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "国有固网/ISP招标：光纤、ONT、CPE、云、网络维护", modeEn: "State fixed-line/ISP tenders: fiber, ONT, CPE, cloud and network maintenance", url: "https://www.ogero.gov.lb/bids.php" },
    { name: "Ogero on Lebanon PPA", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "公共采购平台中的Ogero公告/授标/合同样例入口", modeEn: "Ogero notices, awards and contract examples on the public procurement platform", url: "https://www.ppa.gov.lb/en/tenders/details/10294" },
    { name: "Touch Business Opportunities", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "MIC2移动运营商RFP/RFQ入口", modeEn: "MIC2 mobile-operator RFP/RFQ entry point", url: "https://touch.com.lb/en/business-opportunities" },
    { name: "Alfa Business Opportunity", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "MIC1移动运营商供应商机会入口", modeEn: "MIC1 mobile-operator supplier opportunity entry point", url: "https://www.alfa.com.lb/en/businessopportunity" },
    { name: "Lebanon TRA", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "运营商管理、牌照、频谱、咨询和重大通信项目", modeEn: "Operator governance, licensing, spectrum, advisory and major telecom projects", url: "https://www.tra.gov.lb/" },
    { name: "Lebanon Ministry of Telecommunications", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "电信主管部委公告及Ogero/MIC相关政策入口", modeEn: "Telecom ministry notices and policy entry for Ogero/MIC opportunities", url: "https://mpt.gov.lb/" },
    { name: "Lebanese Red Cross Tenders", country: "黎巴嫩", countryEn: "Lebanon", priority: "P2", status: "补漏监控", statusEn: "Gap monitoring", mode: "IT设备、通信套件、能源及应急项目", modeEn: "IT equipment, communications kits, energy and emergency projects", url: "https://www.redcross.org.lb/tenders/" },
    { name: "LebanonTenders", country: "黎巴嫩", countryEn: "Lebanon", priority: "补漏", status: "授权校验后补漏", statusEn: "Gap check after authorization", mode: "商业聚合补漏，注意授权和付费条款", modeEn: "Commercial aggregator for gap checks; licensing/payment terms apply", url: "https://www.lebanontenders.com/" },
    { name: "UNGM", country: "Levant", countryEn: "Levant", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "联合国系统采购；按受益国/机构/公告类型过滤", modeEn: "UN procurement; filtered by beneficiary country, agency and notice type", url: "https://www.ungm.org/Public/Notice" },
    { name: "World Bank Procurement", country: "Levant", countryEn: "Levant", priority: "P0", status: "已纳入监控", statusEn: "Monitored", mode: "GPN、EOI、RFB、RFP和中标信息", modeEn: "GPN, EOI, RFB, RFP and award information", url: "https://projects.worldbank.org/en/projects-operations/procurement" },
    { name: "EBRD ECEPP", country: "Jordan/Lebanon", countryEn: "Jordan/Lebanon", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "电力、水务、交通和公共服务融资项目", modeEn: "Financed power, water, transport and public-service projects", url: "https://ecepp.ebrd.com" },
    { name: "EU International Partnerships", country: "Levant", countryEn: "Levant", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "欧盟外援、技术援助、数字化和公共治理项目", modeEn: "EU external aid, technical assistance, digitalization and public governance projects", url: "https://international-partnerships.ec.europa.eu/funding-and-technical-assistance/looking-funding/tenders_en" },
    { name: "GIZ Iraq Tenders", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入监控", statusEn: "Monitored", mode: "伊拉克本地采购、数字化、能源、咨询和设备", modeEn: "Iraq local procurement, digitalization, energy, consulting and equipment", url: "https://www.giz.de/en/regions/asia/iraq/tenders" },
    { name: "AFD / dgMarket", country: "约旦", countryEn: "Jordan", priority: "P2", status: "补漏监控", statusEn: "Gap monitoring", mode: "水务、能源、城市基础设施等法国融资项目", modeEn: "French-financed water, energy and urban-infrastructure projects", url: "https://www.dgmarket.com/" },
    { name: "Huawei Enterprise Products & Solutions", country: "Global", countryEn: "Global", priority: "目录", status: "已纳入匹配目录", statusEn: "Added to matching catalog", mode: "产品/方案官方目录，用于机会点方案映射", modeEn: "Official product/solution catalog for opportunity-to-solution mapping", url: huaweiProductsSourceUrl },
    { name: "Telegram Tender Radar", country: "三国", countryEn: "Iraq/Jordan/Lebanon", priority: "P1", status: "已创建自动采集", statusEn: "Automated collector created", mode: "公开频道 + 可选Bot API；只识别招标、采购、授标、延期、澄清和供应商注册", modeEn: "Public channels plus optional Bot API; only detects tender, procurement, award, extension, clarification and supplier registration", url: "https://t.me/s/inainaiq" },
    { name: "Telegram Lebanon Tender Pack", country: "黎巴嫩", countryEn: "Lebanon", priority: "P1", status: "已纳入招投标雷达", statusEn: "Added to tender radar", mode: "MTV / LBCI / Al Jadeed；只抽取招采公告、采购入口、授标和延期信息", modeEn: "MTV / LBCI / Al Jadeed; extracts procurement notices, tender entries, awards and extensions only", url: "https://t.me/s/MTVLebanonNews" },
    { name: "Telegram Jordan Tender Pack", country: "约旦", countryEn: "Jordan", priority: "P1", status: "已纳入招投标雷达", statusEn: "Added to tender radar", mode: "Petra / Roya / Al Mamlaka；只抽取JONEPS/GTD/部委招采相关消息", modeEn: "Petra / Roya / Al Mamlaka; extracts JONEPS/GTD/ministry procurement messages only", url: "https://t.me/s/Petranews" },
    { name: "Telegram Iraq Tender Pack", country: "伊拉克", countryEn: "Iraq", priority: "P1", status: "已纳入招投标雷达", statusEn: "Added to tender radar", mode: "INA / PMO / Rudaw；只抽取部委、油气、电力、交通和省级采购公告", modeEn: "INA / PMO / Rudaw; extracts ministry, oil and gas, power, transport and provincial procurement notices only", url: "https://t.me/s/inainaiq" },
  ],
};

export const countrySourceStrategies = [
  {
    country: "伊拉克",
    countryEn: "Iraq",
    headline: "多点布网，防漏标",
    headlineEn: "Multi-node net to avoid missed bids",
    logic: "网站最分散、漏标风险最高，必须“统一平台＋部委/国企分站＋融资机构”多源抓取。",
    logicEn: "The most fragmented country and highest missed-bid risk; scan the unified portal, ministry/SOE pages and financing sources together.",
    primarySources: ["ITP", "MOC", "MOE", "Oil", "Transport", "ITPC", "NIC", "MOP"],
    earlySignals: ["投资机会", "年度采购计划", "内阁重大项目决议", "石油部下属公司EPC/SCADA/仪控包"],
    earlySignalsEn: ["Investment opportunities", "Annual procurement plans", "Cabinet major-project decisions", "Oil SOE EPC/SCADA/instrumentation packages"],
    risk: "ITP和部分部委站点存在动态页面、403、扫描件PDF和分散下属公司，需人工复核与OCR兜底。",
    riskEn: "ITP and some ministry pages include dynamic pages, 403s, scanned PDFs and fragmented SOE sites; require human review and OCR fallback.",
  },
  {
    country: "约旦",
    countryEn: "Jordan",
    headline: "JONEPS主库，行业页补强",
    headlineEn: "JONEPS as master, vertical portals as boosters",
    logic: "以JONEPS为主，关联GTD去重，再抓NEPCO、水利、ASEZA、PPP等行业采购和前期项目。",
    logicEn: "Use JONEPS as the master source, de-duplicate with GTD, then enrich with NEPCO, MWI, ASEZA and PPP pipelines.",
    primarySources: ["JONEPS", "GTD", "NEPCO", "MEMR", "MWI", "ASEZA", "PPP Unit"],
    earlySignals: ["顾问招标", "可研", "资产管理系统", "调度通信", "智能电网/水务SCADA"],
    earlySignalsEn: ["Advisor tenders", "Feasibility studies", "Asset management systems", "Dispatch communications", "Smart grid/water SCADA"],
    risk: "GTD与JONEPS需关联去重；附件或投标文件可能需要登录后才能抓取。",
    riskEn: "GTD and JONEPS must be de-duplicated; attachments or bidding documents may require login.",
  },
  {
    country: "黎巴嫩",
    countryEn: "Lebanon",
    headline: "PPA先上线，生命周期最完整",
    headlineEn: "PPA first; strongest lifecycle visibility",
    logic: "PPA集中度最高，适合率先上线；同步采购计划、中标、合同和执行，不只看公告。",
    logicEn: "PPA is the most centralized and easiest to launch first; capture plans, awards, contracts and execution, not just notices.",
    primarySources: ["PPA", "CDR", "EDL", "Ogero", "Touch", "Alfa", "TRA", "MPT"],
    earlySignals: ["采购计划", "评标结果", "合同签署", "Ogero/移动运营商RFP", "CDR资金来源"],
    earlySignalsEn: ["Procurement plans", "Evaluation results", "Contract signing", "Ogero/mobile operator RFPs", "CDR funding source"],
    risk: "运营商私有门户和商业聚合源必须遵守授权；缺联系人时以采购入口作为首选触达方式。",
    riskEn: "Private operator portals and commercial aggregators require authorization; use procurement entry as the default contact route when direct contacts are missing.",
  },
];

export const opportunityRadarLayers = [
  { layer: "商机形成层", layerEn: "Opportunity formation", signals: "投资计划、年度采购计划、贷款批准、PPP项目、可研", signalsEn: "Investment plans, annual procurement plans, loan approvals, PPP pipeline and feasibility studies", value: "比正式标书早6—18个月影响技术路线", valueEn: "Influence technical direction 6–18 months before formal tenders" },
  { layer: "项目孵化层", layerEn: "Project incubation", signals: "RFI、EOI、顾问招标、预审、GPN", signalsEn: "RFI, EOI, advisor tenders, prequalification and GPN", value: "提前绑定顾问、EPC和伙伴，补齐工作包", valueEn: "Engage advisors, EPCs and partners early; scope ICT work packages" },
  { layer: "正式竞争层", layerEn: "Formal competition", signals: "RFP、RFQ、ITB、延期、澄清", signalsEn: "RFP, RFQ, ITB, extensions and clarifications", value: "驱动投标、澄清、授权和伙伴分工", valueEn: "Drive bidding, clarification, authorization and partner division of work" },
  { layer: "竞争情报层", layerEn: "Competitive intelligence", signals: "评标结果、中标公告、合同签署、取消、重新招标", signalsEn: "Evaluation results, awards, contracts, cancellations and retenders", value: "识别竞争对手、价格带、复盘和二次机会", valueEn: "Identify competitors, price bands, lessons learned and second chances" },
];

export const sourceScanCadencePlan = [
  { cadence: "每2小时", cadenceEn: "Every 2 hours", sources: "Lebanon PPA / NEPCO / CDR", reason: "结构化程度高，能及时抓到截止日、延期和合同动作", reasonEn: "Highly structured sources; fast detection of deadlines, extensions and contract actions" },
  { cadence: "每日3—4次", cadenceEn: "3–4 times daily", sources: "JONEPS / ITP / 伊拉克部委", reason: "动态系统和分散站点漏标风险高，需要高频补漏", reasonEn: "Dynamic systems and fragmented sites have higher missed-bid risk and need frequent gap checks" },
  { cadence: "每日", cadenceEn: "Daily", sources: "Telegram Tender Radar", reason: "用于捕捉公开频道里的招标、授标、延期和澄清公告，再回链MEED/官方招标源验证", reasonEn: "Captures tender, award, extension and clarification notices from public channels before validation against MEED/official tender sources" },
  { cadence: "每周", cadenceEn: "Weekly", sources: "MEED / World Bank / EBRD / EU / GIZ / dgMarket", reason: "用于生命周期、资金路径、融资项目和跨源验证", reasonEn: "Lifecycle, funding route, financed projects and cross-source validation" },
  { cadence: "实时/人工", cadenceEn: "Real-time/manual", sources: "伙伴报备 / 邮件回执 / Google Sheet", reason: "补真实联系人、客户关系、伙伴能力和销售动作", reasonEn: "Enrich real contacts, customer access, partner capability and sales actions" },
];

export const sourceKeywordLibrary = {
  network: ["fiber optic", "DWDM", "IP/MPLS", "microwave", "LTE", "5G", "private network", "NOC"],
  it: ["data center", "server", "storage", "cloud", "AI", "ERP", "SOC", "cybersecurity", "digital platform"],
  energy: ["solar", "BESS", "battery", "UPS", "smart meter", "SCADA", "power management"],
  industry: ["railway communication", "port system", "oilfield automation", "video surveillance", "command center"],
  arabic: ["اتصالات", "شبكة", "ألياف ضوئية", "مركز بيانات", "أمن سيبراني", "حوسبة سحابية", "منصة رقمية", "طاقة شمسية", "بطاريات", "عدادات ذكية", "تأهيل مسبق", "إبداء اهتمام"],
};

export const enrichmentSourcePlaybook = [
  { layer: "项目发现", source: "MEED Projects", country: "三国", fields: "项目生命周期、项目额、业主/顾问/EPC角色链、联系人电话", cadence: "每周/手工导出", use: "发现大项目和提前培育窗口" },
  { layer: "真实招标", source: "Iraq ITP / Jordan JONEPS / Lebanon PPA", country: "三国", fields: "采购编号、截标日期、采购单位、文件下载、澄清、延期、授标", cadence: "每日", use: "确认是否可投、是否需要伙伴快速响应" },
  { layer: "行业业主", source: "Oil / Electricity / MEMR / SRC / SOMO / CDR", country: "三国", fields: "行业专项招标、技术范围、联系人、标书费、保证金", cadence: "每日-每周", use: "补油气、电力、交通、水务等垂直行业机会" },
  { layer: "运营商/ISP", source: "Ogero / Touch / Alfa / MPT / Lebanon PPA buyer pages", country: "黎巴嫩", fields: "固网ISP、移动网络、光纤接入、传输、CPE/ONT、云资源、网络维护、数据中心", cadence: "每日-每周", use: "捕捉Ogero等运营商CT/IT扩容、设备替换、云化与运维机会" },
  { layer: "资金与规则", source: "World Bank / EBRD / UNGM / IsDB / EU", country: "三国", fields: "融资来源、采购方法、合格国家、短名单、授标结果", cadence: "每周", use: "判断资金成熟度、合规风险和国际竞争态势" },
  { layer: "伙伴线索", source: "伙伴报备 / 邮件推送反馈 / Google Sheet", country: "三国", fields: "真实联系人、客户关系、伙伴能力、跟进记录", cadence: "实时/人工维护", use: "补齐销售动作、Owner和互锁有效期" },
];

export const enrichmentFieldMatrix = [
  { field: "截标日期", primary: "官方电子采购平台", fallback: "部委/业主采购页", policy: "官方来源优先；MEED仅作预测或参考" },
  { field: "联系人电话", primary: "MEED Projects with Roles", fallback: "招标文件/业主采购页/伙伴维护", policy: "可自动填电话；邮箱缺失时不猜测" },
  { field: "运营商机会", primary: "Ogero / Touch / Alfa招标页", fallback: "Lebanon PPA采购实体页 / MPT公告", policy: "按工作包归入Machinery & Electronic或Government Sector；优先识别光纤、IP、传输、云、存储、运维机会" },
  { field: "资金来源", primary: "World Bank / EBRD / UNGM / IsDB", fallback: "MEED / CDR / 部委公告", policy: "影响资金成熟度评分" },
  { field: "竞争对手", primary: "开标/授标结果", fallback: "MEED角色链/顾问/EPC名单", policy: "区分已确认参标方和潜在类型" },
  { field: "华为方案匹配", primary: "华为企业业务官网产品/方案目录 + 招标文件/TOR/BOQ", fallback: "行业场景规则", policy: "官网目录提供产品域候选；没有TOR时保持内部分析标签，不宣称已确认需求" },
  { field: "伙伴互锁", primary: "伙伴报备和推送反馈", fallback: "伙伴经理手工维护", policy: "默认非独家，有效期半年" },
];

export const approvals = [
  { id: "U-1048", name: "Rami Daher", company: "Levant Smart Systems", identity: "伙伴", country: "黎巴嫩", method: "rami@levant-smart.example", submitted: "12分钟前", risk: "企业域名待核验" },
  { id: "U-1047", name: "Sara Al-Hadidi", company: "Huawei Jordan", identity: "本地员工", country: "约旦", method: "+962 •••• 4812", submitted: "46分钟前", risk: "邀请人已确认" },
  { id: "U-1045", name: "Ali Al-Mousawi", company: "Mesopotamia Digital Systems", identity: "伙伴", country: "伊拉克", method: "ali@mds.example", submitted: "昨天", risk: "伙伴关系有效至 2027-01" },
];

export const activity = [
  { actor: "MEED 2026-09-05 Export", action: "解析ProjectListing最新导出：三国有效3027条、活跃/观察1063条、9月更新27条，新增13条高价值候选进入雷达", time: "刚刚", tone: "cyan" },
  { actor: "Multi-source Pipeline", action: "核验MEED三国3027条、活跃1063条、近30天136条；重点项目与官方招标持续进入雷达", time: "刚刚", tone: "cyan" },
  { actor: "MEED + Levant Map", action: "录入8月14–17日最新增量：约旦1条、伊拉克1条、黎巴嫩0条", time: "刚刚", tone: "cyan" },
  { actor: "MEED Online", action: "完成伊拉克增量核验：21条更新，4条实质状态变化", time: "刚刚", tone: "cyan" },
  { actor: "Lina Haddad", action: "将国家灾备云标记为金种子候选", time: "8分钟前", tone: "cyan" },
  { actor: "Ahmed Al-Samarrai", action: "更新了巴格达智慧交通资金证据", time: "34分钟前", tone: "green" },
  { actor: "System", action: "导入 MEED 批次：126 条，合并重复项 18 条", time: "1小时前", tone: "violet" },
  { actor: "Maya Khoury", action: "向 Levant Smart Systems 分享伙伴安全版", time: "昨天 17:08", tone: "amber" },
];

export const meedAudit = {
  auditedAt: "2026-09-05",
  sourceRows: 3032,
  validCountryRecords: 3027,
  activeOrWatch: 1063,
  preAward: 360,
  awardedOrConstruction: 502,
  onHold: 201,
  archivedComplete: 1490,
  archivedCancelled: 474,
  duplicateExports: 0,
  companyRows: 1005,
  contactRows: 16835,
  candidates: [
    { id: "48010", title: "MoO Strategic Crude Oil Export Pipeline: Basra - Haditha", country: "Iraq", industry: "Oil", stage: "Main Contract PQ", value: "$5.0B", fitScore: 82, solutions: "Industry Wireless · Datacom · Edge · Storage · O&M" },
    { id: "553724", title: "Al-Youssifiyah Thermal Power Plant 1400 MW", country: "Iraq", industry: "Power", stage: "Under Construction", value: "$1.4B", fitScore: 78, solutions: "Datacom · Optical · Cloud/DC · Digital Power" },
    { id: "574294", title: "Lebanon 350MW Solar PV and 1,000MW BESS IPP", country: "Lebanon", industry: "Power", stage: "Main Contract PQ", value: "$1.2B", fitScore: 82, solutions: "Digital Power · Datacom · Optical · Cloud/O&M" },
    { id: "575330", title: "Greater Irbid Water Distribution Network and Pump Stations", country: "Jordan", industry: "Water", stage: "Main Contract Bid", value: "$35M", fitScore: 76, solutions: "Datacom · SCADA bearer · Solar/UPS · O&M" },
    { id: "142280", title: "MoT, Iraq - The Development Road: 1200km Expressway", country: "Iraq", industry: "Transport", stage: "Design", value: "$6.5B", fitScore: 80, solutions: "Datacom · Optical · Private Wireless · Cloud/DC" },
    { id: "300702", title: "MoO Strategic Crude Oil Export Pipeline: Basra - Haditha", country: "Iraq", industry: "Oil", stage: "Main Contract PQ", value: "$5.0B", fitScore: 80, solutions: "Industry Wireless · Datacom · Edge · Storage" },
    { id: "396235", title: "Rehabilitation & Expansion of Baghdad International Airport", country: "Iraq", industry: "Transport", stage: "Design", value: "$764M", fitScore: 80, solutions: "Datacom · Optical · Private Wireless · Cloud/DC" },
    { id: "566672", title: "Ministry of Oil, Iraq - South Basra Refinery", country: "Iraq", industry: "Oil", stage: "FEED", value: "$6.5B", fitScore: 79, solutions: "Industry Wireless · Datacom · Edge · Storage" },
    { id: "258900", title: "Greater Amman Municipality - Amman Metro Rail", country: "Jordan", industry: "Transport", stage: "Design", value: "$2.8B", fitScore: 78, solutions: "Datacom · Optical · Private Wireless · Cloud/DC" },
    { id: "149118", title: "Expansion of Rafik Hariri International Airport in Beirut", country: "Lebanon", industry: "Transport", stage: "Design", value: "$122M", fitScore: 77, solutions: "Datacom · Optical · Private Wireless · Cloud/DC" },
  ],
};

export const meedLatestIngestion = {
  verifiedAt: "2026-09-05 16:04 Baghdad",
  window: "2026-09-01—2026-09-04",
  countries: ["Iraq", "Jordan", "Lebanon"],
  totalRecords: 27,
  totalNetValue: "$19.95B",
  records: [
    { id: "48010", opportunityId: "MEED-IQ-48010", title: "MoO Strategic Crude Oil Export Pipeline: Basra - Haditha Pipeline", country: "Iraq", industry: "Oil", stage: "Main Contract PQ", value: "$5.0B", updated: "2026-09-01", disposition: "P1重点经营" },
    { id: "553724", opportunityId: "MEED-IQ-553724", title: "Al-Youssifiyah Thermal Power Plant 1400 MW", country: "Iraq", industry: "Power", stage: "Under Construction", value: "$1.4B", updated: "2026-09-02", disposition: "P1扩容/ICT包" },
    { id: "400385", opportunityId: "MEED-IQ-400385", title: "Al Zubair Photovoltaic Power Plant 400 MW", country: "Iraq", industry: "Power", stage: "Study", value: "$400M", updated: "2026-09-01", disposition: "P1早期培育" },
    { id: "466173", opportunityId: "MEED-IQ-466173", title: "Maysan Degassing Station Upgrading Project", country: "Iraq", industry: "Oil", stage: "Under Construction", value: "$1.2B", updated: "2026-09-01", disposition: "P1油气数字化" },
    { id: "11226", opportunityId: "MEED-IQ-11226", title: "Haditha-Syria Strategic Crude Oil Export Pipeline", country: "Iraq", industry: "Oil", stage: "Study", value: "$9.0B", updated: "2026-09-01", disposition: "WATCH合规复核" },
    { id: "39209", opportunityId: "MEED-IQ-39209", title: "Al-Kifil Water Treatment Plant And Transmission Lines", country: "Iraq", industry: "Water", stage: "Under Construction", value: "$40M", updated: "2026-09-04", disposition: "WATCH运维/收尾" },
  ],
};

export const releaseUpdateLog: ReleaseUpdate[] = [
  {
    id: "ISSUE-2026-W37-ACCESS",
    period: "第37周 · 2026-09-10",
    periodEn: "Week 37 · 2026-09-10",
    title: "邮箱认证与管理员审批闭环上线",
    titleEn: "Email identity and administrator approval loop launched",
    publishedAt: "2026-09-10 18:00 Baghdad",
    dataSource: "Cloudflare Access身份头 + D1账户与审计记录",
    dataSourceEn: "Cloudflare Access identity headers + D1 account and audit records",
    status: "published",
    stats: [
      { label: "准入步骤", labelEn: "Access stages", value: "4", note: "认证—资料—审批—进入", noteEn: "verify—profile—approve—enter" },
      { label: "待办刷新", labelEn: "Queue refresh", value: "30s", note: "管理员后台自动同步", noteEn: "automatic admin sync" },
      { label: "默认状态", labelEn: "Default status", value: "Pending", note: "未审批不可进入", noteEn: "blocked until approved" },
      { label: "审计覆盖", labelEn: "Audit coverage", value: "100%", note: "提交与审批均留痕", noteEn: "submission and decision logged" },
    ],
    highlights: [
      "移除未登记邮箱映射到共享已批准账户的旧兜底，验证码不再等同于平台授权。",
      "首次登录显示注册资料页，提交后进入待审批状态；管理员批准前无法进入业务页面。",
      "管理员后台新增动态待办数量、30秒自动刷新、手工刷新及批准/退回操作。",
    ],
    highlightsEn: [
      "Removed the legacy fallback that mapped unknown emails to a shared approved account; OTP no longer implies application access.",
      "First-time users complete a profile and remain pending; business pages stay blocked until administrator approval.",
      "The admin workspace now shows a live queue count, 30-second refresh, manual refresh, approval and return actions.",
    ],
    keyOpportunities: [],
    platformUpdates: [
      "准入流程统一为：邮箱验证码认证 → 填写注册资料 → 管理员审批 → 正式进入。",
      "账户审批结果与操作人写入D1审计记录。",
    ],
    platformUpdatesEn: [
      "The access flow is now: email OTP → registration profile → administrator approval → platform entry.",
      "Approval outcomes and operators are retained in the D1 audit trail.",
    ],
    nextActions: [
      "接入管理员审批提醒邮件，并补充账户有效期、停用和数据范围调整。",
    ],
    nextActionsEn: [
      "Add administrator email alerts, account expiry, suspension and data-scope management.",
    ],
  },
  {
    id: "ISSUE-2026-W36",
    period: "第36周 · 2026-09-01—2026-09-05",
    periodEn: "Week 36 · 2026-09-01—2026-09-05",
    title: "MEED最新三国线索补充与重点机会升级",
    titleEn: "Latest MEED three-country lead refresh and priority opportunity upgrade",
    publishedAt: "2026-09-05 18:55 Baghdad",
    dataSource: "MEED ProjectListingExport-05-09-26-16-04-28.xlsx + Projects with Roles",
    dataSourceEn: "MEED ProjectListingExport-05-09-26-16-04-28.xlsx + Projects with Roles",
    status: "published",
    stats: [
      { label: "项目清单", labelEn: "Project rows", value: "3,032", note: "原始项目行", noteEn: "raw project rows" },
      { label: "三国有效", labelEn: "Valid 3-country records", value: "3,027", note: "伊拉克/约旦/黎巴嫩", noteEn: "Iraq / Jordan / Lebanon" },
      { label: "活跃观察", labelEn: "Active / watch", value: "1,063", note: "未完工未取消", noteEn: "not completed or cancelled" },
      { label: "本窗增量", labelEn: "Window delta", value: "27", note: "$19.95B净值", noteEn: "$19.95B net value" },
    ],
    highlights: [
      "新增13个高价值候选进入机会雷达，覆盖油气、电力、水务、交通与黎巴嫩新能源。",
      "补齐MEED角色链中的业主、顾问、承包商、融资方和机构电话；缺失邮箱不伪造，标记为待补齐。",
      "更新LERA 350MW Solar PV + 1000MW BESS IPP项目信息，并纳入P1新能源经营视图。",
    ],
    highlightsEn: [
      "Added 13 high-value candidates to the radar across oil & gas, power, water, transport and Lebanon renewables.",
      "Enriched owner, consultant, contractor, financier and institution-phone fields from the MEED role chain; missing emails are not fabricated.",
      "Updated the LERA 350MW Solar PV + 1000MW BESS IPP record and placed it in the P1 renewables engagement view.",
    ],
    keyOpportunities: [
      { id: "MEED-IQ-48010", title: "Basra—Haditha战略原油出口管线", titleEn: "Basra–Haditha Strategic Crude Oil Export Pipeline", value: "$5.0B", priority: "P1", action: "锁定油气管线通信、边缘站点、安防和统一运维ICT包", actionEn: "Lock pipeline communications, edge-site, security and unified O&M ICT packages" },
      { id: "MEED-IQ-553724", title: "Al-Youssifiyah 1400MW火电站", titleEn: "Al-Youssifiyah 1400MW Thermal Power Plant", value: "$1.4B", priority: "P1", action: "检查电力通信网、站点数通、备电和运维扩容空间", actionEn: "Check power communications, site datacom, backup power and O&M expansion scope" },
      { id: "MEED-IQ-400385", title: "Al Zubair 400MW光伏电站", titleEn: "Al Zubair 400MW PV Power Plant", value: "$400M", priority: "P1", action: "前移数字能源、站点网络、储能通信和SCADA边界澄清", actionEn: "Move early on digital energy, site network, BESS communications and SCADA boundary clarification" },
      { id: "MEED-JO-575330", title: "Greater Irbid供水网络和泵站", titleEn: "Greater Irbid Water Network and Pump Stations", value: "$35M", priority: "P1", action: "围绕泵站控制、园区承载、视频物联和水务运维形成伙伴方案", actionEn: "Build a partner solution around pump control, site bearer, video IoT and water O&M" },
    ],
    platformUpdates: [
      "首页经营数字已同步最新审计口径。",
      "机会雷达新增MEED高价值候选，并与联系人/角色链联动。",
      "邮件推送、伙伴回执和Response模板导出测试继续保持通过。",
      "新增本栏目，用于沉淀每一期数据更新、功能更新和下一步动作。",
    ],
    platformUpdatesEn: [
      "Command-center metrics were refreshed to the latest audit baseline.",
      "The radar now includes the new high-value MEED candidates and links them with role-chain contacts.",
      "Email push, partner acknowledgement and Response-template export tests remain passing.",
      "This release-notes section was added to retain each issue's data updates, product changes and next actions.",
    ],
    nextActions: [
      "把MEED账号/API/导出源纳入受控凭据，减少手工导出依赖。",
      "对P1项目补齐截标日、采购入口、技术规格、EPC/顾问链和真实联系人。",
      "将本期P1机会按行业标签批量分发给解决方案经理和伙伴经理确认。",
    ],
    nextActionsEn: [
      "Move MEED account/API/export feed into controlled credentials to reduce manual export dependency.",
      "Complete bid deadlines, procurement entries, technical specifications, EPC/consultant chain and real contacts for P1 records.",
      "Batch-distribute this issue's P1 opportunities by industry tag to solution managers and partner managers for confirmation.",
    ],
  },
  {
    id: "ISSUE-2026-W35",
    period: "第35周 · 2026-08-24—2026-08-31",
    periodEn: "Week 35 · 2026-08-24—2026-08-31",
    title: "公开招投标源与伙伴推送闭环完善",
    titleEn: "Official tender sources and partner-push closed loop",
    publishedAt: "2026-08-31",
    dataSource: "JONEPS / Lebanon PPA / CDR / Ogero / Ministry portals",
    dataSourceEn: "JONEPS / Lebanon PPA / CDR / Ogero / Ministry portals",
    status: "published",
    stats: [
      { label: "来源覆盖", labelEn: "Sources covered", value: "39", note: "多源监控", noteEn: "multi-source monitoring" },
      { label: "官方增量", labelEn: "Official deltas", value: "4", note: "进入雷达", noteEn: "promoted to radar" },
      { label: "能力域", labelEn: "Solution domains", value: "8", note: "华为方案目录", noteEn: "Huawei catalog domains" },
      { label: "推送闭环", labelEn: "Push loop", value: "100%", note: "记录+回执", noteEn: "record + acknowledgement" },
    ],
    highlights: [
      "补充伊拉克、约旦、黎巴嫩官方采购源、部委站点、运营商/ISP和国际融资机构来源。",
      "上线伙伴安全版推送：自动隐藏内部评分、可服务空间、竞争策略、Owner和其他伙伴信息。",
      "上线伙伴回执链接，伙伴点击后可确认、拒绝或补充澄清，后台记录SLA状态。",
    ],
    highlightsEn: [
      "Added official procurement, ministry, telco/ISP and IFI sources across Iraq, Jordan and Lebanon.",
      "Released partner-safe push views that hide internal scores, addressable space, competition strategy, owner and other-partner information.",
      "Released partner acknowledgement links so partners can confirm, decline or clarify, with SLA tracked in the backend.",
    ],
    keyOpportunities: [
      { id: "PPA-LB-12638", title: "Ogero相关公共采购线索", titleEn: "Ogero-related public procurement lead", value: "TBC", priority: "P1", action: "跟踪固网ISP、光纤接入、传输和CPE机会", actionEn: "Track fixed ISP, fiber access, transmission and CPE opportunities" },
      { id: "JONEPS-2026003010-02", title: "约旦公开采购ICT线索", titleEn: "Jordan official ICT procurement lead", value: "TBC", priority: "P2", action: "通过JONEPS核实附件、截标日和采购联系人", actionEn: "Verify attachments, bid deadline and procurement contact through JONEPS" },
    ],
    platformUpdates: [
      "新增邮件推送记录、SLA状态和伙伴确认入口。",
      "新增行业标签自动分发到解决方案经理/系统部长。",
      "新增华为官方产品方案目录匹配规则。",
    ],
    platformUpdatesEn: [
      "Added email push records, SLA status and partner acknowledgement entry.",
      "Added automatic dispatch from industry tags to solution managers / system owners.",
      "Added Huawei official solution-catalog matching rules.",
    ],
    nextActions: [
      "扩展公开源OCR与附件解析能力。",
      "把伙伴确认结果反哺到机会优先级评分。",
      "准备与ePlus字段映射和Google Sheets发布。",
    ],
    nextActionsEn: [
      "Expand OCR and attachment parsing for public sources.",
      "Feed partner acknowledgement results back into opportunity priority scoring.",
      "Prepare ePlus field mapping and Google Sheets publishing.",
    ],
  },
];

export const meedLiveVerification = {
  verifiedAt: "2026-08-13 02:29 Baghdad",
  country: "Iraq",
  exportCutoff: "2026-08-07",
  updatedSinceExport: 21,
  createdSinceExport: 0,
  materialStatusChanges: 4,
  statusChanges: [
    { id: "539877", title: "MoH, Iraq - Ba'ashiqah Hospital", before: "Under Construction", after: "On Hold", action: "降级观察；暂停主动投入" },
    { id: "313280", title: "Grand Faw Port: Khor Al-Zubair Immersed Tunnel", before: "Under Construction · $110M", after: "Complete · $440M", action: "主建设归档；只跟运营运维机会" },
    { id: "269178", title: "South Iraq Integrated Project", before: "On Hold", after: "Cancelled", action: "移出销售漏斗" },
    { id: "444996", title: "Al-Douh Cement Plant", before: "Under Construction", after: "Complete", action: "转售后、扩容及运维线索" },
  ],
  priorityReviews: [
    {
      id: "318471",
      title: "Madinat Al Ward / Ali El Wardy City",
      value: "$11.0B program · $9.84B net",
      stage: "Under Construction · 30%",
      judgment: "P0人工复核",
      confidence: "High",
      signal: "MEED明确写入smart city technologies；PowerChina已启动基础设施施工",
      entry: "通过MoCH / Ora Developers / PowerChina / Khatib & Alami锁定智慧城市独立工作包",
      solutions: "F5G全光城市 · IP/MPLS与园区网 · 城市IOC/云Stack · 存储与视频物联 · eSight/NeoSight · 电力通信",
      risk: "主合同已授标，必须避免以整包替代方式切入",
    },
    {
      id: "360342",
      title: "Rafael City in Baghdad: Phase I",
      value: "$3.5B",
      stage: "Design · ITB forecast 2026-11-14",
      judgment: "P1条件培育",
      confidence: "Medium",
      signal: "大型城市综合体，商业标预测2027-01-16；当前仍可影响ICT规格",
      entry: "在ITB前通过NIC / Emaar / CH2M推进智慧城市与ICT总体架构交流",
      solutions: "全光接入 · 园区数据通信 · 私有云/数据中心 · 智慧医疗教育网络 · 统一运维",
      risk: "MEED连续记录延期，投资和行政条件仍不确定",
    },
    {
      id: "374883",
      title: "Lukoil - Eridu Oil Field Development Block 10",
      value: "$450M",
      stage: "Main Contract PQ · ITB forecast 2027-01-30",
      judgment: "WATCH合规优先",
      confidence: "High",
      signal: "油田安全、通信和控制需求明确，但项目因制裁持续延期",
      entry: "仅在合规放行后，经EPC/顾问路径评估OT网络、行业无线、边缘计算与安防包",
      solutions: "工业数通 · 行业无线 · 边缘计算/存储 · 视频安防 · 统一运维",
      risk: "制裁与客户合规风险高，不应作为高赢单项目",
    },
  ],
};
