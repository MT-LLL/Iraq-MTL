# Telegram Tender Radar

This collector adds Telegram-sourced tender and procurement signals to the MSSD opportunity platform. It is not a general news monitor.

## What it does

- Scans public Telegram channel preview pages such as `https://t.me/s/<channel>`.
- Optionally reads `TELEGRAM_BOT_TOKEN` updates when a bot has access to channel posts.
- Filters strictly by tender/procurement terms: tender, procurement, RFP, RFQ, EOI, prequalification, contract award, clarification, extension, closing date, supplier registration, and Arabic equivalents.
- Sends relevant records to `/api/telegram-ingest`.
- The platform stores each tender signal as a review-pending opportunity and evidence record.

## GitHub Repository Secrets

Required:

```ini
NEWS_INGEST_TOKEN=
TELEGRAM_INGEST_ENDPOINT=https://your-worker.your-subdomain.workers.dev/api/telegram-ingest
```

You may reuse `MEED_INGEST_TOKEN` instead of creating `NEWS_INGEST_TOKEN`.

Optional:

```ini
TELEGRAM_CHANNELS=inainaiq|Iraq|Iraqi News Agency,Petranews|Jordan|Petra,MTVLebanonNews|Lebanon|MTV Lebanon
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_DEFAULT_COUNTRY=Iraq
CF_ACCESS_CLIENT_ID=
CF_ACCESS_CLIENT_SECRET=
```

`TELEGRAM_CHANNELS` also accepts JSON:

```json
[
  { "channel": "inainaiq", "country": "Iraq", "channelTitle": "Iraqi News Agency" },
  { "channel": "Petranews", "country": "Jordan", "channelTitle": "Petra" },
  { "channel": "MTVLebanonNews", "country": "Lebanon", "channelTitle": "MTV Lebanon" }
]
```

## Cloudflare Access

If the Worker is behind Cloudflare Access, either bypass `/api/telegram-ingest*` or create an Access Service Token and add `CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET` to GitHub Secrets.

## Important limits

Telegram Bot API cannot read arbitrary public channels unless the bot has access. The public-page collector is therefore the default fallback. User-account API login is not stored in this repository; if needed later, keep the session outside GitHub and connect it through a controlled runner.
