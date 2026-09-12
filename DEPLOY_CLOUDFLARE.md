# Cloudflare Deployment Guide

This repository can run on Cloudflare Workers with D1. It is not a static-only Pages app.

## 1. Cloudflare prerequisites

Use the Cloudflare account in the dashboard URL you provided.

Create a D1 database:

```bash
npx wrangler d1 create mssd_mtl_prod
```

Copy the returned `database_id` into `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "mssd_mtl_prod"
database_id = "..."
```

## 2. Apply D1 migrations

Run these after creating the database:

```bash
npx wrangler d1 execute mssd_mtl_prod --file=drizzle/0000_yellow_vulcan.sql --remote
npx wrangler d1 execute mssd_mtl_prod --file=drizzle/0001_sticky_revanche.sql --remote
npx wrangler d1 execute mssd_mtl_prod --file=drizzle/0002_tiresome_tarot.sql --remote
```

## 3. Configure secrets and variables

In Cloudflare dashboard, set Worker variables/secrets:

- `MSSD_SITE_URL`
- `RESEND_API_KEY` as a secret
- `RESEND_FROM_EMAIL`
- `RESEND_REPLY_TO`
- `TWILIO_ACCOUNT_SID` if SMS is enabled
- `TWILIO_AUTH_TOKEN` as a secret if SMS is enabled
- `TWILIO_FROM_NUMBER` or `TWILIO_MESSAGING_SERVICE_SID` if SMS is enabled

## 4. Deploy manually

```bash
npm ci
npm run deploy:cloudflare
```

## 5. Deploy from GitHub

Cloudflare Dashboard:

1. Workers & Pages
2. Create
3. Import a repository
4. Select `<your-github-org>/<your-repo>`
5. Build command: `npm ci && npm run build`
6. Deploy command: `npx wrangler deploy --config wrangler.toml`

The Worker uses the `DB` D1 binding and the `ASSETS` static asset binding.

## 6. Login and access control

This code supports OpenAI Sites headers and Cloudflare Access email headers:

- `oai-authenticated-user-email`
- `cf-access-authenticated-user-email`

For production, put the Worker behind Cloudflare Access and allow only approved emails or domains. Without Access, unauthenticated users will be redirected to the legacy sign-in path.
