"use client";

import { useState } from "react";
import { submitRegistration } from "./actions";

export type AppProfile = { id: string; name: string; organization: string; identityType: string; status: string };
const PLATFORM_ZH = "伊拉克代表处面向伙伴MTL营销作战平台";
const PLATFORM_EN = "IRAQ PARTNER MTL MARKETING WAR-ROOM";

export function AccountGate({ authUser, profile }: { authUser: { name: string; email: string }; profile: AppProfile | null }) {
  const [name, setName] = useState(authUser.name === authUser.email ? "" : authUser.name);
  const [organization, setOrganization] = useState(authUser.email.endsWith("@huawei.com") ? "Huawei" : "");
  const [phone, setPhone] = useState("");
  const [identityType, setIdentityType] = useState<"partner"|"huawei_cn"|"huawei_local">(authUser.email.endsWith("@huawei.com") ? "huawei_cn" : "partner");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  if (!authUser.email) return <div className="account-screen"><div className="account-card pending-card"><span className="account-logo warning">!</span><small>{PLATFORM_EN}</small><h1>需要先完成访问身份认证</h1><p>请先通过 Cloudflare Access / ChatGPT 安全入口进入。系统读取认证邮箱后，才可以提交注册申请或进入审批流程。</p><a href="/">重新检查访问身份</a></div></div>;
  if (profile?.status === "approved") return null;
  if (profile?.status === "pending") return <div className="account-screen"><div className="account-card pending-card"><span className="account-logo">MT</span><small>{PLATFORM_EN}</small><h1>账户等待管理员确认</h1><p>邮箱身份与注册资料已提交到管理员后台“账户审批”待办。管理员批准身份与数据范围后，刷新页面即可进入平台。</p><div className="registration-flow"><span className="done">1<i>✓</i>邮箱认证</span><span className="done">2<i>✓</i>填写资料</span><span className="active">3<i>…</i>管理员审批</span><span>4<i>○</i>正式进入</span></div><div className="pending-user"><strong>{profile.name}</strong><span>{profile.organization} · {profile.identityType}</span><small>{authUser.email}</small></div><a href="/">刷新审批状态</a><a href="/signout-with-chatgpt?return_to=/">切换登录账户</a></div></div>;
  if (profile?.status === "needs_info") return <div className="account-screen"><div className="account-card pending-card"><span className="account-logo warning">!</span><h1>需要补充注册资料</h1><p>管理员退回了申请。请联系管理员确认企业关系、手机号或身份信息后重新提交。</p><a href="mailto:iraq-mssd-admin@huawei.example">联系管理员</a></div></div>;

  const submit = async () => {
    if (!name.trim() || !organization.trim()) { setMessage("请填写姓名和组织"); return; }
    setSubmitting(true); setMessage("");
    try {
      const result = await submitRegistration({ name, organization, phone, identityType, countryScope: ["Iraq"], industryScope: ["Education","Electricity","Government Sector","Healthcare","Machinery & Electronic","Oil & Gas","Railway","Retail & Wholesale","Road","Water Transport"] });
      window.location.reload();
    } catch { setMessage("提交失败，请稍后重试"); }
    finally { setSubmitting(false); }
  };

  return <div className="account-screen"><div className="account-splash"><span>IRAQ · MTL</span><h1>从市场信号到<br/><em>伙伴可执行动作</em></h1><p>线索洞察、活动纪要、营销物料、圈子活动、伙伴推送和审计留痕统一管理。</p><div><i></i>邮箱验证码已完成身份认证</div></div><div className="account-card registration-card"><span className="account-logo">MT</span><small>首次使用 · 完善账户</small><h2>注册{PLATFORM_ZH}</h2><p>已认证邮箱：{authUser.email}</p><div className="registration-flow"><span className="done">1<i>✓</i>邮箱认证</span><span className="active">2<i>…</i>填写资料</span><span>3<i>○</i>管理员审批</span><span>4<i>○</i>正式进入</span></div><label>姓名<input value={name} onChange={e=>setName(e.target.value)} placeholder="请输入真实姓名"/></label><label>手机号码（选填）<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+964 ..."/></label><label>组织<input value={organization} onChange={e=>setOrganization(e.target.value)} placeholder="Huawei / Partner company"/></label><label>申请身份<select value={identityType} onChange={e=>setIdentityType(e.target.value as typeof identityType)}><option value="partner">伙伴</option><option value="huawei_cn">华为中方员工</option><option value="huawei_local">华为本地员工</option></select></label><div className="registration-note">邮箱验证码仅用于确认邮箱归属，不代表已获平台权限。提交后状态为“待审批”；只有管理员批准后才能进入。平台不保存登录密码。</div>{message&&<div className="form-error">{message}</div>}<button className="primary" disabled={submitting} onClick={submit}>{submitting?"正在提交…":"提交注册申请 →"}</button><a href="/signout-with-chatgpt?return_to=/">使用其他账户登录</a></div></div>;
}
