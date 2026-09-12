# MEED GitHub Actions 自动采集配置

这个工作流用于每周自动登录 MEED Projects，下载当前保存筛选页的 Excel 项目清单，解析后同步到平台 `/api/meed-ingest`。

## 1. Cloudflare Worker Secret

在 Cloudflare Worker `mssd-mtl` 的 `Settings → Variables and Secrets` 增加：

```ini
MEED_INGEST_TOKEN=生成一个至少32位的随机密钥
```

保存后重新发布 Worker。

## 2. GitHub Repository Secrets

进入 GitHub 仓库：

`Settings → Secrets and variables → Actions → New repository secret`

必须配置：

```ini
MEED_USERNAME=你的MEED账号
MEED_PASSWORD=你的MEED密码
MEED_INGEST_TOKEN=与Cloudflare里一致的随机密钥
MEED_INGEST_ENDPOINT=https://your-worker.your-subdomain.workers.dev/api/meed-ingest
```

如果 Cloudflare Access 仍然保护该 Worker，还需要二选一：

- 在 Cloudflare Zero Trust 中为 `/api/meed-ingest*` 增加 bypass/service-token 策略；
- 或创建 Cloudflare Access Service Token，并在 GitHub Secrets 增加：

```ini
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

建议配置：

```ini
MEED_PROJECT_SEARCH_URL=https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000013-4000014-4000016&ProjectFields=MEEDTitle-ProfileType-MEEDCountry,MEEDCountryRegion,mEEDCityTown-Industry,Sector,SubSector-MeedContractValue,ProjectValue,NetValue,CashSpent-MEEDStage-LastUpdatedOnString-MainContractAward-MainContractCompletion
```

如果 MEED 登录页控件识别失败，再配置以下选择器：

```ini
MEED_USERNAME_SELECTOR=
MEED_PASSWORD_SELECTOR=
MEED_LOGIN_BUTTON_SELECTOR=
```

## 3. 运行方式

工作流文件：

```text
.github/workflows/meed-weekly-ingest.yml
```

默认计划：

```text
每周一 07:20 Baghdad
```

也可以在 GitHub Actions 页面点击 `Run workflow` 手动执行。

## 4. 输出和失败处理

成功时：

- 下载的 MEED Excel 会作为 GitHub Artifact 保存；
- `meed-ingest-payload.json` 会保存本次解析结果；
- 平台会新增一条 `source_scan_runs` 记录；
- 符合条件的项目会写入机会池，等待人工复核。

失败时：

- 平台会记录失败扫描批次；
- GitHub Artifact 会保留 `meed-failure.png` 和失败 JSON；
- 常见原因是 MEED 验证码、MFA、密码过期、账号风控或下载按钮文案变化。

## 5. 合规提醒

该链路只应在 MEED 订阅许可允许的范围内使用。不要把 MEED 原始数据公开分享给无授权对象；伙伴推送时仍应使用平台的脱敏模板。
