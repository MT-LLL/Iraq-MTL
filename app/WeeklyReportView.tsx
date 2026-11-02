"use client";

import { useMemo, useState } from "react";
import { getWeeklyReportSnapshot, saveWeeklyReportSnapshot, sendWeeklyReport, type WeeklyReportSnapshot } from "./actions";
import type { Opportunity } from "./data";
import type { LeadDistributionView, PushJobView } from "./actions";

type Lang = "zh" | "en";
type Props = { lang: Lang; items: Opportunity[]; pushJobs: PushJobView[]; distributions: LeadDistributionView[]; emailReady: boolean; onToast: (message: string) => void };

function mondayOf(date: Date) {
  const value = new Date(date);
  const day = (value.getDay() + 6) % 7;
  value.setDate(value.getDate() - day);
  value.setHours(0, 0, 0, 0);
  return value;
}
function isoDate(date: Date) { return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0,10); }
function escapeHtml(value: string) { return value.replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[c] || c); }

export function WeeklyReportView({ lang, items, pushJobs, distributions, emailReady, onToast }: Props) {
  const [audience, setAudience] = useState<"internal"|"partner">("internal");
  const [language, setLanguage] = useState<Lang>(lang);
  const [weekStart, setWeekStart] = useState(() => isoDate(mondayOf(new Date(Date.now() - 7 * 86400000))));
  const [weekEnd, setWeekEnd] = useState(() => isoDate(new Date(mondayOf(new Date()).getTime() - 86400000)));
  const [recipients, setRecipients] = useState("");
  const [snapshot, setSnapshot] = useState<WeeklyReportSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Array<{id:string;weekStart:string;weekEnd:string;audience:string;language:string;sendStatus:string;createdAt:string}>>([]);
  const isZh = language === "zh";
  const labels = isZh ? { title:"伊拉克市场机会运营周报", subtitle:"IRAQ MARKET OPPORTUNITY WEEKLY REPORT", refresh:"生成 / 刷新周报", download:"下载 HTML 源文件", copy:"复制到 Outlook", send:"一键邮件推送", history:"历史周报", internal:"内部版", partner:"伙伴版", period:"报告周期", audience:"阅读对象", language:"语言", total:"机会库总数", added:"本周新增", key:"新增关键机会", pushes:"邮件推送", sent:"邮件发送成功", ack:"伙伴已确认", pending:"伙伴待响应", returned:"伙伴退回", projects:"本周重点机会", next:"下周重点工作", draft:"生成后可下载、复制或发送；所有统计均来自 D1 实际记录。"} : { title:"Iraq Market Opportunity Weekly Report", subtitle:"IRAQ MARKET OPPORTUNITY WEEKLY REPORT", refresh:"Generate / Refresh", download:"Download HTML source", copy:"Copy for Outlook", send:"Send Weekly Report", history:"Report History", internal:"Internal", partner:"Partner", period:"Reporting period", audience:"Audience", language:"Language", total:"Active opportunities", added:"New this week", key:"New key opportunities", pushes:"Email pushes", sent:"Emails sent", ack:"Partner acknowledged", pending:"Partner pending", returned:"Partner returned", projects:"Key opportunities this week", next:"Priorities for next week", draft:"Generate the report to download, copy or send. All metrics are based on live D1 records." };
  const metrics = snapshot ? [
    [labels.total, snapshot.totalOpportunities], [labels.added, snapshot.newOpportunities], [labels.key, snapshot.newKeyOpportunities],
    ...(audience === "internal" ? [[labels.pushes, snapshot.emailPushes], [labels.sent, snapshot.emailSent], [labels.ack, snapshot.partnerAcknowledged], [labels.pending, snapshot.partnerPending], [labels.returned, snapshot.partnerReturned]] : [[labels.pushes, snapshot.partnerPushes], [labels.ack, snapshot.partnerAcknowledged]])
  ] as Array<[string,number]> : [];
  const html = useMemo(() => {
    if (!snapshot) return "";
    const cards = metrics.map(([label,value]) => `<td style="padding:12px;border:1px solid #dce7e5;background:#f6faf9;font:12px Arial;color:#5b7078">${escapeHtml(label)}<br><strong style="font-size:22px;color:#123746">${value}</strong></td>`).join("");
    const projects = snapshot.topOpportunities.map(item => `<tr><td style="padding:12px;border-bottom:1px solid #e5ecea;font:14px Arial;color:#173c49"><strong>${escapeHtml(item.title)}</strong><br><span style="font-size:12px;color:#63777e">${escapeHtml(item.country)} · ${escapeHtml(item.industry)} · ${escapeHtml(item.stage)}</span><br>${escapeHtml(item.summary)}</td></tr>`).join("");
    return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(labels.title)}</title></head><body style="margin:0;background:#f3f6f5;padding:24px"><table role="presentation" width="100%" style="max-width:760px;margin:auto;background:#fff;border-collapse:collapse"><tr><td style="padding:28px;background:#0b2738;color:#fff;font-family:Arial"><div style="font-size:11px;letter-spacing:2px;color:#8ddbd1">${labels.subtitle}</div><h1 style="font-size:26px;margin:10px 0">${escapeHtml(labels.title)}</h1><div>${snapshot.weekStart} – ${snapshot.weekEnd}</div></td></tr><tr><td style="padding:20px 22px 8px;font:14px Arial;color:#294b56">${isZh?"本周运营概览":"Weekly Operations Overview"}</td></tr><tr><td style="padding:0 20px 18px"><table role="presentation" width="100%" cellspacing="6"><tr>${cards}</tr></table></td></tr><tr><td style="padding:18px 22px 8px;font:bold 13px Arial;color:#0f827b">${labels.projects}</td></tr>${projects}<tr><td style="padding:24px 22px;font:11px Arial;color:#71848a">IRAQ MTL · ${audience==="internal"?"Confidential · Huawei Internal Use":"Partner-safe edition"}</td></tr></table></body></html>`;
  }, [snapshot, audience, language, metrics, labels, isZh]);
  const generate = async () => {
    setLoading(true);
    try { const result = await getWeeklyReportSnapshot(weekStart, weekEnd); setSnapshot(result); onToast(isZh?"周报数据已刷新":"Report data refreshed"); }
    catch (error) { onToast(error instanceof Error ? error.message : "Failed to generate report"); }
    finally { setLoading(false); }
  };
  const download = () => {
    if (!html) return;
    const blob = new Blob([html], { type:"text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `iraq-mtl-weekly-report-${weekStart}.html`; anchor.click(); URL.revokeObjectURL(url);
  };
  const copy = async () => {
    if (!html) return;
    try {
      const doc = new DOMParser().parseFromString(html, "text/html");
      const rich = new Blob([doc.body.innerHTML], { type:"text/html" });
      const plain = new Blob([doc.body.innerText], { type:"text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": rich, "text/plain": plain })]);
      onToast(isZh?"已复制，可粘贴到 Outlook":"Copied. Paste into Outlook.");
    } catch { await navigator.clipboard.writeText(html); onToast(isZh?"已复制 HTML 源码":"HTML source copied"); }
  };
  const send = async () => {
    if (!snapshot || !recipients.trim()) { onToast(isZh?"请先生成周报并填写收件人":"Generate the report and enter recipients first"); return; }
    setSending(true);
    try { await sendWeeklyReport({ snapshot, audience, language, recipients }); onToast(isZh?"周报邮件已提交发送":"Weekly report email sent"); }
    catch (error) { onToast(error instanceof Error ? error.message : "Email send failed"); }
    finally { setSending(false); }
  };
  const save = async () => {
    if (!snapshot) return;
    try { await saveWeeklyReportSnapshot({ snapshot, audience, language }); onToast(isZh?"周报快照已归档":"Report snapshot archived"); }
    catch (error) { onToast(error instanceof Error ? error.message : "Save failed"); }
  };
  return <section className="workspace-view weekly-report-view">
    <div className="view-intro"><div><span className="section-kicker">WEEKLY OPERATIONS REPORT</span><h1>{labels.title}</h1><p>{labels.draft}</p></div><button className="primary" disabled={loading} onClick={generate}>{loading?"…":labels.refresh}</button></div>
    <div className="weekly-report-controls">
      <label>{labels.period}<div><input type="date" value={weekStart} onChange={e=>setWeekStart(e.target.value)}/><span>—</span><input type="date" value={weekEnd} onChange={e=>setWeekEnd(e.target.value)}/></div></label>
      <label>{labels.audience}<select value={audience} onChange={e=>setAudience(e.target.value as "internal"|"partner") }><option value="internal">{labels.internal}</option><option value="partner">{labels.partner}</option></select></label>
      <label>{labels.language}<select value={language} onChange={e=>setLanguage(e.target.value as Lang)}><option value="zh">中文</option><option value="en">English</option></select></label>
    </div>
    {snapshot ? <div className="weekly-report-paper">
      <header><span>IRAQ MTL · OPPORTUNITY COMPASS</span><h2>{labels.title}</h2><p>{snapshot.weekStart} — {snapshot.weekEnd}</p></header>
      <h3>{isZh?"本周运营总览":"Weekly Operations Overview"}</h3><div className="weekly-report-metrics">{metrics.map(([label,value])=><div key={label}><small>{label}</small><strong>{value}</strong></div>)}</div>
      <h3>{labels.projects}</h3>{snapshot.topOpportunities.length ? snapshot.topOpportunities.map(item=><article key={item.id}><strong>{item.title}</strong><small>{item.country} · {item.industry} · {item.stage}{item.priority? " · "+item.priority:""}</small><p>{item.summary}</p></article>) : <p>{isZh?"本周没有符合展示条件的新增项目。":"No newly added opportunities met the display criteria."}</p>}
      <h3>{labels.next}</h3><ol><li>{isZh?"跟进高优先级项目的客户联系人和采购进度。":"Follow up customer contacts and procurement progress for priority opportunities."}</li><li>{isZh?"对已推送但未响应的伙伴进行二次跟进。":"Follow up with partners who have not responded."}</li><li>{isZh?"持续更新伊拉克、约旦、黎巴嫩市场机会。":"Continue monitoring Iraq, Jordan and Lebanon."}</li></ol>
      <footer>Confidential · {audience==="internal"?"Huawei Internal Use":"Partner-safe edition"}</footer>
    </div> : <div className="empty-state"><strong>{isZh?"尚未生成周报":"No report generated yet"}</strong><p>{labels.draft}</p></div>}
    <div className="weekly-report-actions"><button disabled={!snapshot} onClick={download}>↓ {labels.download}</button><button disabled={!snapshot} onClick={copy}>▣ {labels.copy}</button><button disabled={!snapshot} onClick={save}>▤ {isZh?"归档快照":"Archive snapshot"}</button></div>
    <div className="weekly-report-send"><div><h3>{labels.send}</h3><p>{isZh?"内部版仅允许华为邮箱；伙伴版可发送至外部合作伙伴邮箱。":"Internal reports are restricted to Huawei addresses; partner reports can be sent externally."}</p></div><textarea value={recipients} onChange={e=>setRecipients(e.target.value)} placeholder={isZh?"收件人邮箱，多个地址用逗号分隔":"Recipient emails, comma-separated"}/><button className="primary" disabled={!snapshot || !emailReady || sending} onClick={send}>{sending?"…":labels.send}</button>{!emailReady&&<small>{isZh?"邮件服务尚未配置":"Email service is not configured"}</small>}</div>
  </section>;
}
