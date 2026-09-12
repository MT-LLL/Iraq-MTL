# 伊拉克代表处面向伙伴 MTL 营销作战平台｜纯净源码交付包

交付日期：2026-09-10  
生产基线：Cloudflare Worker Version `4adf8c75-0dfa-4c70-bdbe-53faf0bb88e8`

## 本包包含

- `app/`：前端、服务器动作、注册审批、伙伴门户与推送回执
- `worker/`：Cloudflare Worker、Access JWT 校验与定时任务入口
- `db/`、`drizzle/`：D1 数据模型及迁移脚本
- `scripts/`、`.github/workflows/`：MEED 与招投标线索定时采集任务
- `tests/`：自动化自检
- `public/`：页面资源和 Response 导入模板
- 项目构建、部署配置及说明文档

## 已排除

- `.git` 历史、`node_modules`、npm 缓存
- `dist`、`.vinext`、`.wrangler`、测试覆盖率及其他构建产物
- 本地日志、临时文件、系统文件
- Gmail、Resend、MEED、Twilio、智谱、Cloudflare 等真实密钥和会话信息
- 生产数据库内容及用户审批记录

## 启动

要求 Node.js 22.13 或更高版本。

```bash
npm ci
npm test
npm run dev
```

部署前请先复制 `.env.example` 中所需配置，并在 Cloudflare Secrets、GitHub Actions Secrets 中保存真实凭据。不要将凭据写入源码。还需将 `wrangler.toml` 中的站点 URL、Access Team Domain、Access Audience 和 D1 Database ID 替换为目标环境值。

## 数据使用边界

本包保留当前演示机会清单、伙伴映射、MEED 联系人映射和内部 Response 模板，以确保功能可复现。这些内容仅限授权的内部环境使用；对外共享前，应依据 MEED 许可、个人信息保护要求及内部数据分级规则另行脱敏或删除。

