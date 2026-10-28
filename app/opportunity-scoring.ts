import { huaweiOfficialSolutionCatalog } from "./data";

export type OpportunityScoringInput = {
  title?: string | null; titleEn?: string | null; industry?: string | null;
  stage?: string | null; summary?: string | null; projectScope?: string | null;
  projectValue?: number | null; fundingStatus?: string | null; bidDeadline?: string | null;
  contactsCount?: number; milestones?: string | null;
};
export type OpportunityScoringResult = {
  score: number; priority: "P0" | "P1" | "P2" | "WATCH"; confidence: number;
  solutions: Array<{domain:string;name:string;fit:number;rationale:string;evidence:string}>;
  scoreParts: Array<{label:string;value:number;total:number;rationale:string}>;
};
const norm=(s:string)=>s.toLowerCase().replace(/[^a-z0-9\u0600-\u06ff\u4e00-\u9fff]+/g," ").trim();
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,Math.round(n)));
function inferIndustry(t:string) {
 if(/oil|gas|petroleum|pipeline|refinery|油气|石油|天然气|油田/.test(t))return "Oil & Gas";
 if(/electric|power|substation|solar|bess|电力|电网|变电站|光伏|储能/.test(t))return "Electricity";
 if(/rail|metro|铁路|轨道交通|地铁/.test(t))return "Railway";
 if(/port|marine|water transport|港口|航运|水运/.test(t))return "Water Transport";
 if(/road|traffic|highway|交通|公路|道路|收费站/.test(t))return "Road";
 if(/hospital|health|medical|医疗|医院|卫生/.test(t))return "Healthcare";
 if(/school|university|education|教育|学校|大学/.test(t))return "Education";
 if(/retail|wholesale|mall|商业|零售|批发/.test(t))return "Retail & Wholesale";
 if(/telecom|ict|data cent(re|er)|datacentre|software|通信|数据中心|云平台/.test(t))return "Machinery & Electronic";
 return "";
}
export function scoreOpportunity(input:OpportunityScoringInput):OpportunityScoringResult {
 const raw=[input.title,input.titleEn,input.industry,input.stage,input.summary,input.projectScope].filter(Boolean).join(" ");
 const t=norm(raw); const industry=inferIndustry(t)||input.industry||"";
 const ranked=huaweiOfficialSolutionCatalog.map(c=>{
   const keywords=c.keywords.filter(k=>t.includes(norm(k)));
   const scenarios=c.scenarios.filter(s=>t.includes(norm(s)));
   const industryMatch=!!industry&&c.industries.some(i=>norm(i)===norm(industry));
   let fit=28+(industryMatch?18:0)+Math.min(45,keywords.length*15)+Math.min(15,scenarios.length*8);
   if(!keywords.length&&!scenarios.length)fit=industryMatch?48:0;
   fit=clamp(fit,0,96);
   return {c,fit,keywords:keywords.slice(0,5),scenarios:scenarios.slice(0,2),industryMatch};
 }).filter(x=>x.fit>=42&&(x.keywords.length>0||x.scenarios.length>0)).sort((a,b)=>b.fit-a.fit);
 const solutions=ranked.slice(0,4).map(x=>({
   domain:x.c.category,name:x.c.productFamilies.slice(0,3).join(" / "),fit:x.fit,
   rationale:[x.industryMatch?`行业适用：${industry}`:"",x.keywords.length?`项目关键词：${x.keywords.join("、")}`:"",x.scenarios.length?`场景匹配：${x.scenarios.join("、")}`:""].filter(Boolean).join("；"),
   evidence:x.keywords.length||x.scenarios.length?raw.slice(0,500):`仅行业级初筛（${industry||"行业未识别"}），需核实项目Scope`
 }));
 const scope=!!(input.summary||input.projectScope)&&!/暂未提供|待补充|仅根据标题推测/.test(input.summary||input.projectScope||"");
 const amount=Number(input.projectValue||0), stage=norm(input.stage||"");
 const pre=/study|design|feed|bid|pq|pre qual|tender|招标|资格预审|设计|研究/.test(stage);
 const funding=norm(input.fundingStatus||"");
 const fundingKnown=!!funding&&!/unknown|tbc|待核实|待确认|未披露|meed待核实/.test(funding);
 const deadline=input.bidDeadline?new Date(input.bidDeadline).getTime():NaN;
 const days=Number.isFinite(deadline)?Math.ceil((deadline-Date.now())/86400000):null;
 const maxFit=solutions.length?Math.max(...solutions.map(s=>s.fit)):0;
 const parts=[
 {label:"资金成熟度",value:fundingKnown?(/approved|secured|已批|confirmed|多边资金/.test(funding)?17:12):5,total:20,rationale:fundingKnown?`资金状态：${input.fundingStatus}`:"资金状态未核实"},
 {label:"采购窗口",value:days!==null?(days>=0&&days<=120?13:days>120?10:3):(pre?10:7),total:15,rationale:days!==null?`日期：${input.bidDeadline}`:`根据阶段初判：${input.stage||"阶段未知"}`},
 {label:"方案匹配",value:clamp(maxFit/100*20*(scope?1:0.65),0,20),total:20,rationale:solutions.length?`最高匹配度 ${maxFit}；${scope?"有项目背景/Scope":"Scope不足，已折减"}`:"缺少足够证据匹配具体方案"},
 {label:"参与空间",value:clamp((scope?6:2)+(amount>0?4:0)+(solutions.length>=2?4:solutions.length?2:0),0,15),total:15,rationale:scope?"基于项目背景、金额和工作包初评":"缺少项目范围，需拆分ICT工作包"},
 {label:"赢单驱动",value:clamp((maxFit>=75?9:maxFit>=55?6:3)+(pre?3:0),0,15),total:15,rationale:"基于方案适配度与采购阶段初评，不代表赢单概率"},
 {label:"客户触达",value:clamp(Math.min(8,(input.contactsCount||0)*2)+((input.contactsCount||0)>0?1:0),0,10),total:10,rationale:(input.contactsCount||0)?`已关联${input.contactsCount}条联系人记录`:"未关联项目联系人"},
 {label:"战略价值",value:clamp((industry?2:0)+(amount>=1000?3:amount>=100?2:amount>0?1:0),0,5),total:5,rationale:`行业：${industry||"未识别"}；金额：${amount||"未披露"}`}
 ];
 const score=parts.reduce((s,p)=>s+p.value,0);
 const priority=score>=80?"P0":score>=70?"P1":score>=58?"P2":"WATCH";
 const evidenceCount=[input.title||input.titleEn,input.summary||input.projectScope,input.stage,fundingKnown?funding:"",amount>0?"amount":"",input.bidDeadline,input.milestones,(input.contactsCount||0)>0?"contact":""].filter(Boolean).length;
 const confidence=Number(Math.min(.92,Math.max(.25,.25+evidenceCount*.075+(scope?.12:0)+(solutions.some(s=>s.rationale.includes("项目关键词"))?.08:0))).toFixed(2));
 return {score,priority,confidence,solutions,scoreParts:parts};
}
