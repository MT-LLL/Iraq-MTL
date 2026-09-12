import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const defaultChannels = [
  { channel: "inainaiq", channelTitle: "Iraqi News Agency", country: "Iraq" },
  { channel: "IraqiPMOEng", channelTitle: "Iraqi Prime Minister Office", country: "Iraq" },
  { channel: "rudawdigital", channelTitle: "Rudaw Digital", country: "Iraq" },
  { channel: "Petranews", channelTitle: "Jordan News Agency Petra", country: "Jordan" },
  { channel: "royatv", channelTitle: "Roya News", country: "Jordan" },
  { channel: "AlMamlakaTV", channelTitle: "Al Mamlaka TV", country: "Jordan" },
  { channel: "MTVLebanonNews", channelTitle: "MTV Lebanon News", country: "Lebanon" },
  { channel: "LBCI_NEWS", channelTitle: "LBCI News", country: "Lebanon" },
  { channel: "Aljadeedtelegram", channelTitle: "Al Jadeed", country: "Lebanon" },
];

const tenderTerms = [
  "tender", "bid", "rfp", "rfq", "eoi", "prequalification", "pre-qualification", "procurement",
  "expression of interest", "invitation to bid", "invitation for bids", "call for tenders",
  "contract award", "awarded contract", "clarification", "extension", "closing date", "deadline",
  "purchase order", "request for quotation", "request for proposal", "auction", "supplier registration",
  "vendor registration", "مناقصة", "عطاء", "استدراج عروض", "طلب عروض", "طلب تقديم عروض",
  "طلب إبداء اهتمام", "إبداء اهتمام", "تأهيل مسبق", "تمديد", "توضيح", "إحالة", "ترسية",
  "إعلان شراء", "شراء عام", "توريد", "استشارة", "دعوة",
];

const industryContextTerms = [
  "data center", "cloud", "fiber", "telecom", "network", "power plant", "solar", "substation",
  "oil", "gas", "pipeline", "hospital", "airport", "rail", "road", "port", "ict", "cctv",
  "اتصالات", "شبكة", "ألياف", "كهرباء", "طاقة", "نفط", "غاز", "مستشفى", "مطار", "ميناء", "طريق", "سكك",
];

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function configuredChannels() {
  const raw = process.env.TELEGRAM_CHANNELS?.trim();
  if (!raw) return defaultChannels;
  if (raw.startsWith("[")) return JSON.parse(raw);
  return raw.split(/[\n,]+/).map(item => item.trim()).filter(Boolean).map(item => {
    const [channel, country = "Iraq", channelTitle = channel] = item.split("|").map(part => part.trim());
    return { channel: channel.replace(/^@/, ""), country, channelTitle };
  });
}

function stripHtml(html) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gis, "$2 ($1)")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function messageBlocks(html) {
  return html.split(/<div class="tgme_widget_message_wrap/).slice(1).map(block => `<div class="tgme_widget_message_wrap${block}`);
}

function parseMessages(html, channelInfo) {
  return messageBlocks(html).map(block => {
    const dataPost = block.match(/data-post="([^"]+)"/)?.[1] || "";
    const messageId = dataPost.split("/").pop();
    const datetime = block.match(/<time[^>]+datetime="([^"]+)"/)?.[1] || "";
    const textHtml = block.match(/<div class="tgme_widget_message_text js-message_text"[^>]*>([\s\S]*?)<\/div>/)?.[1] || "";
    const text = decodeEntities(stripHtml(textHtml));
    if (!messageId || !text) return null;
    return {
      id: dataPost,
      channel: channelInfo.channel,
      channelTitle: channelInfo.channelTitle || channelInfo.channel,
      country: channelInfo.country,
      url: `https://t.me/${dataPost}`,
      publishedAt: datetime,
      text,
      title: text.split(/[.!؟。؛\n]/).find(Boolean)?.slice(0, 160) || text.slice(0, 160),
      lang: /[\u0600-\u06FF]/.test(text) ? "ar" : "en",
    };
  }).filter(Boolean);
}

function isRecent(record, days) {
  if (!record.publishedAt) return true;
  const time = new Date(record.publishedAt).getTime();
  if (!Number.isFinite(time)) return true;
  return Date.now() - time <= days * 86400000;
}

function looksRelevant(record) {
  const text = `${record.title} ${record.text}`.toLowerCase();
  return tenderTerms.some(term => text.includes(term.toLowerCase()));
}

async function fetchPublicChannel(channelInfo) {
  const url = `https://t.me/s/${channelInfo.channel.replace(/^@/, "")}`;
  const response = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 MSSD Telegram Tender Radar/1.0",
      "accept-language": "en,ar;q=0.9",
    },
  });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  const html = await response.text();
  return parseMessages(html, channelInfo);
}

async function fetchViaBot() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return [];
  const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates?allowed_updates=%5B%22channel_post%22%5D&limit=100`);
  if (!response.ok) throw new Error(`Telegram Bot API returned ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(`Telegram Bot API error: ${JSON.stringify(data)}`);
  return (data.result || []).map(update => {
    const post = update.channel_post;
    if (!post) return null;
    const chat = post.chat || {};
    const text = post.text || post.caption || "";
    if (!text) return null;
    return {
      id: `${chat.username || chat.id}/${post.message_id}`,
      channel: chat.username || String(chat.id),
      channelTitle: chat.title || chat.username || String(chat.id),
      country: process.env.TELEGRAM_BOT_DEFAULT_COUNTRY || "Iraq",
      url: chat.username ? `https://t.me/${chat.username}/${post.message_id}` : "",
      publishedAt: post.date ? new Date(post.date * 1000).toISOString() : new Date().toISOString(),
      text,
      title: text.split(/[.!؟。؛\n]/).find(Boolean)?.slice(0, 160) || text.slice(0, 160),
      lang: /[\u0600-\u06FF]/.test(text) ? "ar" : "en",
    };
  }).filter(Boolean);
}

async function postPayload(payload) {
  const endpoint = process.env.TELEGRAM_INGEST_ENDPOINT?.trim()
    || (process.env.MSSD_SITE_URL?.trim() ? `${process.env.MSSD_SITE_URL.trim().replace(/\/$/, "")}/api/telegram-ingest` : "");
  if (!endpoint) throw new Error("Missing TELEGRAM_INGEST_ENDPOINT or MSSD_SITE_URL");
  const token = process.env.NEWS_INGEST_TOKEN?.trim() || process.env.SOURCE_INGEST_TOKEN?.trim() || process.env.MEED_INGEST_TOKEN?.trim();
  if (!token) throw new Error("Missing NEWS_INGEST_TOKEN, SOURCE_INGEST_TOKEN or MEED_INGEST_TOKEN");
  const headers = {
    "content-type": "application/json",
    "authorization": `Bearer ${token}`,
  };
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }
  const response = await fetch(endpoint, { method: "POST", headers, body: JSON.stringify(payload) });
  const text = await response.text();
  if (!response.ok) throw new Error(`Ingest API returned ${response.status}: ${text.slice(0, 500)}`);
  return JSON.parse(text);
}

async function main() {
  const artifactDir = path.join(process.cwd(), "artifacts", "telegram");
  await mkdir(artifactDir, { recursive: true });

  const channels = configuredChannels();
  const recentDays = Number(process.env.TELEGRAM_RECENT_DAYS || "7");
  const maxMessages = Number(process.env.TELEGRAM_MAX_MESSAGES || "240");
  const errors = [];
  const records = [];

  const botRecords = await fetchViaBot().catch(error => {
    errors.push(`Bot API: ${error.message}`);
    return [];
  });
  records.push(...botRecords);

  for (const channel of channels) {
    try {
      const messages = await fetchPublicChannel(channel);
      records.push(...messages);
    } catch (error) {
      errors.push(`${channel.channel}: ${error.message}`);
    }
  }

  const unique = new Map();
  for (const record of records) {
    if (!isRecent(record, recentDays)) continue;
    unique.set(record.id || record.url, record);
  }
  const fetched = [...unique.values()];
  const relevant = fetched.filter(looksRelevant).slice(0, maxMessages);
  const payload = {
    runId: `TG-TENDER-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 12)}`,
    generatedAt: new Date().toISOString(),
    source: "Telegram Tender Radar",
    status: errors.length && relevant.length ? "partial" : errors.length && !relevant.length ? "failed" : "completed",
    stats: {
      channels: channels.length + (process.env.TELEGRAM_BOT_TOKEN ? 1 : 0),
      fetchedMessages: fetched.length,
      relevantMessages: relevant.length,
      promotedCount: relevant.length,
    },
    records: relevant,
    errors,
  };

  await writeFile(path.join(artifactDir, "telegram-tender-payload.json"), JSON.stringify(payload, null, 2));
  if (process.env.TELEGRAM_DRY_RUN === "1") {
    console.log(JSON.stringify({ ok: true, dryRun: true, fetched: fetched.length, relevant: relevant.length }, null, 2));
    return;
  }
  const result = await postPayload(payload);
  await writeFile(path.join(artifactDir, "telegram-tender-result.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ok: true, fetched: fetched.length, relevant: relevant.length, result }, null, 2));
}

main().catch(async error => {
  const artifactDir = path.join(process.cwd(), "artifacts", "telegram");
  await mkdir(artifactDir, { recursive: true }).catch(() => {});
  await writeFile(path.join(artifactDir, "telegram-tender-failure.json"), JSON.stringify({ ok: false, error: error.message, stack: error.stack }, null, 2)).catch(() => {});
  console.error(error);
  process.exit(1);
});
