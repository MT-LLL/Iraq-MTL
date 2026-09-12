"use client";

import { useMemo, useState } from "react";

type Localized = { zh: string; en: string };

export type PartnerOpportunityView = {
  id: string;
  title: Localized;
  country: Localized;
  city: Localized;
  industry: Localized;
  stage: Localized;
  summary: Localized;
  value: Localized;
  deadline: Localized;
  funding: Localized;
  source: Localized;
  updated: Localized;
  solutions: Array<{ domain: Localized; name: Localized; role: Localized }>;
  contact: {
    status: Localized;
    name: Localized;
    role: Localized;
    company: Localized;
    email: Localized;
    phone: Localized;
    companyPhone: Localized;
    procurementEntry: string;
    source: Localized;
  };
};

type Profile = { name: string; organization: string };

export function PartnerPortal({ profile, items }: { profile: Profile; items: PartnerOpportunityView[] }) {
  const [lang, setLang] = useState<"zh" | "en">("zh");
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("all");
  const [selectedId, setSelectedId] = useState(items[0]?.id ?? "");
  const text = (value: Localized) => value[lang];
  const countries = useMemo(() => Array.from(new Map(items.map(item => [item.country.en, item.country])).values()), [items]);
  const filtered = useMemo(() => items.filter(item => {
    const haystack = `${item.title.zh} ${item.title.en} ${item.industry.zh} ${item.industry.en}`.toLowerCase();
    return (country === "all" || item.country.en === country) && (!search || haystack.includes(search.toLowerCase()));
  }), [country, items, search]);
  const selected = items.find(item => item.id === selectedId) ?? filtered[0] ?? items[0];
  const t = (zh: string, en: string) => lang === "zh" ? zh : en;

  return <div className="partner-portal-shell">
    <header className="partner-portal-topbar">
      <div className="partner-portal-brand"><span>MT</span><div><strong>{t("伊拉克代表处面向伙伴MTL营销作战平台","Iraq Partner MTL Marketing War-room")}</strong><small>PARTNER COLLABORATION PORTAL</small></div></div>
      <div className="partner-portal-user"><div><strong>{profile.name}</strong><small>{profile.organization} · {t("已批准伙伴","Approved partner")}</small></div><button onClick={() => setLang(lang === "zh" ? "en" : "zh")}>{lang === "zh" ? "中 / EN" : "EN / 中"}</button><a href="/signout-with-chatgpt?return_to=/">{t("退出","Sign out")}</a></div>
    </header>
    <main className="partner-portal-main">
      <section className="partner-portal-hero"><div><span>PARTNER-SAFE LEAD DESK</span><h1>{t("伙伴线索协同台","Partner Lead Collaboration")}</h1><p>{t("仅展示经批准的公开项目范围、关键节点、联系方式、采购入口和华为方案方向。内部评分、竞争策略、Owner及其他伙伴信息不会下发到你的浏览器。","Only approved public scope, milestones, contacts, procurement entry and Huawei solution directions are shown. Internal scores, competition strategy, owner and other-partner data are not delivered to your browser.")}</p></div><div><strong>{items.length}</strong><small>{t("伙伴安全线索","partner-safe leads")}</small></div></section>
      <div className="partner-portal-filters"><input value={search} onChange={event => setSearch(event.target.value)} placeholder={t("搜索项目或行业","Search project or industry")}/><select value={country} onChange={event => setCountry(event.target.value)}><option value="all">{t("全部国家","All countries")}</option>{countries.map(item => <option key={item.en} value={item.en}>{text(item)}</option>)}</select><span>{filtered.length} {t("条结果","results")}</span></div>
      <div className="partner-portal-grid">
        <section className="partner-lead-list">{filtered.length ? filtered.map(item => <button key={item.id} className={selected?.id === item.id ? "active" : ""} onClick={() => setSelectedId(item.id)}><span className="safe-chip">SAFE</span><div><strong>{text(item.title)}</strong><small>{text(item.country)} · {text(item.industry)} · {text(item.stage)}</small><em>{text(item.contact.status)}</em></div><div><strong>{text(item.value)}</strong><small>{t("项目金额","Project value")}</small></div></button>) : <div className="partner-empty">{t("没有匹配的线索","No matching leads")}</div>}</section>
        {selected ? <section className="partner-lead-detail">
          <div className="partner-detail-head"><span className="safe-chip">PARTNER SAFE</span><small>{selected.id}</small><h2>{text(selected.title)}</h2><p>{text(selected.country)} · {text(selected.city)} · {text(selected.industry)} · {text(selected.stage)}</p></div>
          <div className="partner-safe-notice"><strong>✓ {t("数据范围已脱敏","Data scope is redacted")}</strong><span>{t("此页面不包含内部经营评分、赢单判断、竞争策略、机会Owner、金种子或其他伙伴信息。","This page contains no internal sales score, win assessment, competition strategy, opportunity owner, golden-seed or other-partner data.")}</span></div>
          <p className="partner-summary">{text(selected.summary)}</p>
          <div className="partner-metrics"><div><small>{t("项目金额","Project value")}</small><strong>{text(selected.value)}</strong></div><div><small>{t("关键节点","Key milestone")}</small><strong>{text(selected.deadline)}</strong></div><div><small>{t("资金状态","Funding")}</small><strong>{text(selected.funding)}</strong></div><div><small>{t("更新时间","Updated")}</small><strong>{text(selected.updated)}</strong></div></div>
          <div className="partner-detail-section"><h3>{t("关联华为产品与方案","Related Huawei products and solutions")}</h3><div className="partner-solution-list">{selected.solutions.map(solution => <article key={`${solution.domain.en}-${solution.name.en}`}><span>{text(solution.domain)}</span><strong>{text(solution.name)}</strong><p>{text(solution.role)}</p></article>)}</div></div>
          <div className="partner-detail-section"><h3>{t("联系人与采购入口","Contact and procurement entry")}</h3><div className="partner-contact-card"><div><small>{t("联系人","Contact")}</small><strong>{text(selected.contact.name)}</strong><span>{text(selected.contact.role)} · {text(selected.contact.company)}</span></div><div><small>{t("邮箱","Email")}</small><strong>{text(selected.contact.email)}</strong><span>{t("电话","Phone")}: {text(selected.contact.phone)}</span></div><div><small>{t("机构电话","Institution phone")}</small><strong>{text(selected.contact.companyPhone)}</strong><span>{text(selected.contact.source)}</span></div></div>{/^https?:\/\//.test(selected.contact.procurementEntry) ? <a className="partner-procurement-link" href={selected.contact.procurementEntry} target="_blank" rel="noreferrer">{t("打开采购入口","Open procurement entry")} ↗</a> : <p className="partner-procurement-text">{selected.contact.procurementEntry}</p>}</div>
          <footer className="partner-detail-footer">{t("如需补充项目背景或确认参与，请联系对应华为伙伴经理。","Contact the assigned Huawei partner manager to request more context or confirm participation.")}</footer>
        </section> : null}
      </div>
    </main>
  </div>;
}
