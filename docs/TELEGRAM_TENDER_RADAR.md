# Telegram Tender Radar

This collector adds Telegram-sourced tender and procurement signals to the MSSD opportunity platform. It is not a general news monitor.

## What it does

- Scans public Telegram channel preview pages such as `https://t.me/s/<channel>`.
- Optionally reads `TELEGRAM_BOT_TOKEN` updates when a bot has access to channel posts.
- Scans up to five public preview pages per channel by default (configurable) and applies the recent-days cutoff to collected messages; Telegram preview pagination is bounded and is not a guarantee of full history coverage.\n- Requires both a procurement/tender signal and a sector signal (ICT/telecom, data centers, energy, oil and gas, transport, health, water and other infrastructure) to reduce unrelated news.\n- Translates relevant Arabic messages into professional English with Kimi/Moonshot before ingestion. Original Arabic is retained in evidence. Arabic records without a valid English translation are withheld rather than published as English.\n- Uses signal-based scoring for triage only. New records remain `pending`; score/priority does not mean the opportunity is verified or promoted.\n- Deduplicates opportunity evidence by opportunity + source URL (or excerpt when URL is unavailable).
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

## Translation and scan configuration\n\nThe workflow reads `KIMI_API_KEY` (or `MOONSHOT_API_KEY`) from GitHub Secrets and optionally reads `KIMI_MODEL` / `KIMI_API_BASE_URL` from GitHub Variables. Defaults are `kimi-k2.6` and `https://api.moonshot.cn/v1`. Do not hardcode the API key in source code. If the key is absent or a translation response fails validation, the run is marked partial and those Arabic records are not ingested.\n\n`TELEGRAM_MAX_PAGES_PER_CHANNEL` controls the bounded page count (default 5; max 10). `TELEGRAM_RECENT_DAYS` and `TELEGRAM_MAX_MESSAGES` control the time window and cap.\n\n## Important limits

Telegram Bot API cannot read arbitrary public channels unless the bot has access. The public-page collector is therefore the default fallback. User-account API login is not stored in this repository; if needed later, keep the session outside GitHub and connect it through a controlled runner.
