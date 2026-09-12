# 机会罗盘（Opportunity Compass）

面向伊拉克、约旦和黎巴嫩试点市场的机会点洞察与销售协同管理平台。

首版覆盖：经营总览、机会雷达、证据化 AI 洞察、统一评分、华为方案匹配、伙伴安全分享、六个月非独家互锁、账户审批、批量导入与审计数据模型。

## 本地运行

需要 Node.js 22.13 或更高版本。

```bash
npm install
npm run dev
```

## 验证

```bash
npm run lint
npm run build
```

当前界面使用演示机会数据。MEED、政府招标源、Google Sheets 与 ePlus 均保留适配边界，待正式接口、凭据和合规确认后接入。

## 邮件与短信发送

真实发送链路已接入 Resend（邮件）与 Twilio（SMS）。本地配置项见 `.env.example`；在线密钥应作为 Sites secret 保存，不应写入源码。

- 邮件需要 `RESEND_API_KEY` 和已验证的 `RESEND_FROM_EMAIL`。
- SMS 需要 Twilio Account SID、Auth Token，以及发送号码或 Messaging Service SID。
- 每次发送会在 `push_jobs` 中记录 `sending / sent / failed` 状态、服务商消息 ID 和错误代码。
- 伙伴安全版不会包含内部评分、竞争策略、Owner 或其他伙伴信息。
