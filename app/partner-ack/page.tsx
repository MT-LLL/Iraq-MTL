import { acknowledgePartnerPush, getPartnerPushConfirmation } from "../actions";

type SearchParams = Record<string, string | string[] | undefined>;
type Lang = "zh" | "en";

function tr(lang: Lang, zh: string, en: string) {
  return lang === "zh" ? zh : en;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function PartnerAckPage({ searchParams }: { searchParams?: Promise<SearchParams> | SearchParams }) {
  const params = await Promise.resolve(searchParams ?? {});
  const requestedLang: Lang = single(params.lang) === "en" ? "en" : "zh";
  const id = single(params.push);
  const token = single(params.token);
  const confirm = single(params.confirm) === "1";
  const note = single(params.note);
  let confirmed = single(params.confirmed) === "1";
  if (confirm && id && token) {
    try {
      await acknowledgePartnerPush({ id, token, note });
      confirmed = true;
    } catch {
      confirmed = false;
    }
  }
  let data;
  try {
    data = await getPartnerPushConfirmation({ id, token });
  } catch {
    return <main className="partner-ack-page">
      <section className="partner-ack-shell error">
        <span className="section-kicker">PARTNER SAFE LINK</span>
        <h1>{tr(requestedLang, "线索链接无效或已过期", "Invalid or expired lead link")}</h1>
        <p>{tr(requestedLang, "请联系华为伙伴经理重新发送MTL内容或机会链接。", "Please contact the Huawei partner manager for a new MTL content or opportunity link.")}</p>
      </section>
    </main>;
  }
  const lang = data.lang;
  const alreadyConfirmed = confirmed || data.acknowledgementStatus === "confirmed";
  const openedLabel = data.openedAt
    ? `${tr(lang, "已打开", "Opened")} ${new Date(data.openedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")}${data.openCount > 1 ? ` · ${data.openCount} ${tr(lang, "次", "times")}` : ""}`
    : tr(lang, "打开后自动记录", "Open is tracked automatically");
  const confirmedAtLabel = data.acknowledgedAt
    ? new Date(data.acknowledgedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US")
    : tr(lang, "刚刚完成", "Just completed");
  return <main className="partner-ack-page">
    <section className="partner-ack-shell">
      <header className="partner-ack-hero">
        <div>
          <span className="section-kicker">IRAQ MSSD · PARTNER SAFE BRIEF</span>
          <h1>{tr(lang, "伙伴线索确认", "Partner lead confirmation")}</h1>
          <p>{tr(lang, "该页面仅展示伙伴可见的公开项目范围、关键节点、产品匹配、联系人/采购入口和下一步动作；内部评分、赢单判断、竞争策略、Owner、其他伙伴信息和华为可服务空间已脱敏。", "This page only shows partner-visible public project scope, key milestones, product mapping, contact/procurement entry and next actions. Internal score, win assessment, competitive strategy, owner, other partner information and Huawei addressable scope are redacted.")}</p>
        </div>
        <div className="ack-status-card">
          <small>{tr(lang, "反馈 SLA", "Feedback SLA")}</small>
          <strong>{data.slaDueAt ? new Date(data.slaDueAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US") : tr(lang, "待生成", "TBD")}</strong>
          <span className={alreadyConfirmed ? "confirmed" : "pending"}>{alreadyConfirmed ? tr(lang, "已确认", "Confirmed") : tr(lang, "等待确认", "Pending")}</span>
          <small>{openedLabel}</small>
        </div>
      </header>

      {alreadyConfirmed ? <section className="ack-completion-card" role="status" aria-live="polite">
        <div className="ack-completion-icon" aria-hidden="true">✓</div>
        <div className="ack-completion-copy">
          <span>{tr(lang, "伙伴协同状态", "Partner collaboration status")}</span>
          <h2>{tr(lang, "伙伴协同已完成", "Partner collaboration completed")}</h2>
          <p>{tr(lang, "你已成功接收该机会包，确认结果已经同步至华为后台，无需重复提交。", "You have successfully received this opportunity package. The confirmation is synchronized to the Huawei backend; no further submission is required.")}</p>
          <div className="ack-completion-facts">
            <div><small>{tr(lang, "确认时间", "Confirmed at")}</small><strong>{confirmedAtLabel}</strong></div>
            <div><small>{tr(lang, "协同状态", "Collaboration status")}</small><strong>{tr(lang, "已接收并开始跟进", "Received and follow-up started")}</strong></div>
            <div><small>{tr(lang, "后台状态", "Backend status")}</small><strong>{tr(lang, "回执与SLA已同步", "Receipt and SLA synchronized")}</strong></div>
          </div>
        </div>
      </section> : null}

      <div className={`ack-confirm-panel ${alreadyConfirmed ? "confirmed" : "pending"}`}>
        <div>
          <span>{tr(lang, "伙伴回执", "Partner acknowledgement")}</span>
          <strong>{alreadyConfirmed ? tr(lang, "华为后台已收到确认", "Huawei backend has received the confirmation") : tr(lang, "请先点击确认，后台将立即更新回执状态", "Please confirm first; the backend receipt status updates immediately")}</strong>
          <p>{tr(lang, "确认后，推送记录会显示确认人、确认时间、SLA状态和对应机会包。", "After confirmation, the push record shows confirmer, confirmation time, SLA status and the related opportunity pack.")}</p>
        </div>
        {alreadyConfirmed ? <div className="ack-success-mini">
          <b>{tr(lang, "已完成", "Completed")}</b>
          <small>{data.acknowledgedAt ? new Date(data.acknowledgedAt).toLocaleString(lang === "zh" ? "zh-CN" : "en-US") : tr(lang, "刚刚确认", "Just confirmed")}</small>
        </div> : <form method="get" action="/partner-ack" className="ack-form ack-form-top">
          <input type="hidden" name="push" value={data.id}/>
          <input type="hidden" name="token" value={token}/>
          <input type="hidden" name="lang" value={lang}/>
          <input type="hidden" name="confirm" value="1"/>
          <label>{tr(lang, "反馈备注（可选）", "Feedback note (optional)")}<textarea name="note" placeholder={tr(lang, "例如：已收到，计划本周确认客户入口和投标资格。", "Example: received; we will verify customer access and bid qualification this week.")}/></label>
          <button type="submit">{tr(lang, "我已收到并开始跟进", "Confirm receipt and start follow-up")}</button>
        </form>}
      </div>

      <div className="ack-opportunity-list">
        {data.opportunities.map(item => <article className="ack-opportunity-card" key={item.id}>
          <header>
            <span>{item.id}</span>
            <div><h2>{item.title}</h2><p>{item.meta}</p></div>
          </header>
          <div className="ack-facts">
            <div><small>{tr(lang, "项目金额", "Project value")}</small><strong>{item.value}</strong></div>
            <div><small>{tr(lang, "关键节点", "Key milestone")}</small><strong>{item.deadline}</strong></div>
            <div><small>{tr(lang, "资金状态", "Funding")}</small><strong>{item.funding}</strong></div>
            <div><small>{tr(lang, "来源", "Source")}</small><strong>{item.source}</strong></div>
          </div>
          <section className="ack-block"><strong>{tr(lang, "项目摘要", "Project summary")}</strong><p>{item.insight}</p></section>
          <section className="ack-block">
            <strong>{tr(lang, "关联华为产品 / 方案", "Related Huawei products / solutions")}</strong>
            <div className="ack-product-list">{item.solutions.map(solution => <div key={`${item.id}-${solution.name}`}>
              <span>{solution.domain}</span><b>{solution.name}</b><em>{solution.fit}%</em><small>{solution.role}</small>
            </div>)}</div>
          </section>
          <section className="ack-block contact">
            <strong>{tr(lang, "联系人 / 采购入口", "Contact / procurement entry")}</strong>
            <div className="ack-contact-primary"><small>{tr(lang, "首选触达方式", "Preferred contact method")}</small><b>{item.contact.preferredMethodLabel} · {item.contact.preferredMethod}</b><em>{item.contact.contactCompleteness}</em></div>
            <div className="ack-contact-grid">
              <span><small>{tr(lang, "联系人", "Contact")}</small><b>{item.contact.name}</b></span>
              <span><small>{tr(lang, "职位", "Title")}</small><b>{item.contact.title}</b></span>
              <span><small>{tr(lang, "公司", "Company")}</small><b>{item.contact.company}</b></span>
              <span><small>{tr(lang, "邮箱", "Email")}</small><b>{item.contact.email}</b></span>
              <span><small>{tr(lang, "手机号", "Mobile")}</small><b>{item.contact.phone}</b></span>
              <span><small>{tr(lang, "机构电话", "Institution phone")}</small><b>{item.contact.companyPhone}</b></span>
            </div>
            <p>{item.contact.status}</p>
            <p><b>{tr(lang, "补齐动作：", "Completion action: ")}</b>{item.contact.completionAction}</p>
          </section>
          <section className="ack-block muted"><strong>{tr(lang, "伙伴下一步", "Partner next steps")}</strong><p>{item.strategy}</p><p>{item.risk}</p></section>
        </article>)}
      </div>

      {alreadyConfirmed ? <div className="ack-success-banner">
        <strong>{tr(lang, "伙伴协同已完成", "Partner collaboration completed")}</strong>
        <span>{tr(lang, "华为团队已收到你的确认，回执与SLA状态已经同步更新。", "Huawei has received your confirmation; the receipt and SLA status are now synchronized.")}</span>
      </div> : <form method="get" action="/partner-ack" className="ack-form">
        <input type="hidden" name="push" value={data.id}/>
        <input type="hidden" name="token" value={token}/>
        <input type="hidden" name="lang" value={lang}/>
        <input type="hidden" name="confirm" value="1"/>
        <label>{tr(lang, "反馈备注（可选）", "Feedback note (optional)")}<textarea name="note" placeholder={tr(lang, "例如：已收到，计划本周确认客户入口和投标资格。", "Example: received; we will verify customer access and bid qualification this week.")}/></label>
        <button type="submit">{tr(lang, "确认收到线索", "Confirm receipt")}</button>
      </form>}
    </section>
  </main>;
}
