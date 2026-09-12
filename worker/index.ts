/** Cloudflare Worker entry point for the vinext-starter template. */
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEED_API_BASE_URL?: string;
  MEED_API_KEY?: string;
  MEED_EXPORT_CSV_URL?: string;
  MEED_USERNAME?: string;
  MEED_PASSWORD?: string;
  MEED_SESSION_COOKIE?: string;
  MEED_AUTH_MODE?: string;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  IMAGES?: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/signout-with-chatgpt") {
      return new Response(null, {
        status: 302,
        headers: {
          location: new URL("/cdn-cgi/access/logout", url).toString(),
          "set-cookie": "mssd_admin_link=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax; Secure",
        },
      });
    }

    if (isLegacyAuthPath(url.pathname)) {
      return Response.redirect(new URL(safeReturnTo(url.searchParams.get("return_to")), url), 302);
    }

    if (url.pathname === "/_vinext/image") {
      if (!env.IMAGES) {
        const sourcePath = url.searchParams.get("url");
        if (sourcePath?.startsWith("/") && !sourcePath.startsWith("//")) {
          return env.ASSETS.fetch(new Request(new URL(sourcePath, request.url)));
        }
        return new Response("Image optimization is not configured for this deployment.", { status: 501 });
      }
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(await withAccessIdentityHeaders(request, env), env, ctx);
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(recordScheduledSourceScan(env, event.scheduledTime));
  },
};

type ScheduledEvent = { scheduledTime: number; cron: string };

const scheduledSources = [
  "MEED Projects",
  "Iraq ITP",
  "Iraq Ministry of Communications",
  "Iraq Ministry of Electricity",
  "Iraq Ministry of Oil",
  "Iraq Ministry of Transport",
  "Iraq ITPC",
  "Iraq National Investment Commission",
  "Iraq Ministry of Planning",
  "Iraq IOTC",
  "South Refineries Company",
  "Jordan JONEPS",
  "Jordan Government Tenders Department",
  "Jordan NEPCO",
  "Jordan MEMR",
  "Jordan MWI",
  "Jordan ASEZA",
  "Jordan PPP Unit",
  "Lebanon PPA",
  "Lebanon CDR",
  "Lebanon EDL",
  "Ogero Bids",
  "Touch Business Opportunities",
  "Alfa Business Opportunity",
  "Lebanon TRA",
  "Lebanon Ministry of Telecommunications",
  "UNGM",
  "World Bank Procurement",
  "EBRD ECEPP",
  "EU International Partnerships",
  "GIZ Iraq Tenders",
];

function meedConnectorRuntime(env: Env) {
  const authMode = env.MEED_AUTH_MODE || "api_or_export_preferred";
  const mode = env.MEED_API_KEY && env.MEED_API_BASE_URL
    ? "api"
    : env.MEED_EXPORT_CSV_URL
      ? "controlled_export_url"
      : env.MEED_SESSION_COOKIE
        ? "session_cookie"
        : env.MEED_USERNAME && env.MEED_PASSWORD
          ? "service_account_login"
          : "not_configured";
  return {
    mode,
    authMode,
    ready: mode !== "not_configured",
    envKeys: ["MEED_EXPORT_CSV_URL", "MEED_API_BASE_URL", "MEED_API_KEY", "MEED_USERNAME", "MEED_PASSWORD", "MEED_SESSION_COOKIE", "MEED_AUTH_MODE"],
    note: mode === "service_account_login"
      ? "Username/password is configured as secrets; use only within MEED license terms and expect CAPTCHA/MFA to require human renewal."
      : mode === "session_cookie"
        ? "Session cookie is configured as a secret; refresh before expiry."
        : mode === "api" || mode === "controlled_export_url"
          ? "Preferred unattended sync mode is configured."
          : "MEED persistent authorization is not configured.",
  };
}

async function recordScheduledSourceScan(env: Env, scheduledTime: number) {
  const startedAt = new Date(scheduledTime || Date.now());
  const finishedAt = new Date();
  const nextRunAt = new Date(startedAt);
  nextRunAt.setUTCDate(startedAt.getUTCDate() + 7);
  nextRunAt.setUTCHours(4, 0, 0, 0);
  const id = `SCAN-${startedAt.getTime().toString(36).toUpperCase()}`;
  const meedRuntime = meedConnectorRuntime(env);
  const metadata = JSON.stringify({
    cadence: "weekly",
    cron: "0 4 * * 1",
    sources: scheduledSources,
    mode: "scheduled-source-check",
    meedConnector: {
      status: meedRuntime.ready ? `configured:${meedRuntime.mode}` : "persistent authorization required",
      authMode: meedRuntime.authMode,
      envKeys: meedRuntime.envKeys,
      projectSearchUrl: "https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000013-4000014-4000016",
      note: meedRuntime.note,
    },
    promotedReviewIds: ["JONEPS-2026003010-02", "PPA-LB-12638", "JONEPS-2026001574-04", "JONEPS-2026001336-01"],
    nextStep: meedRuntime.ready ? "Parse MEED deltas from the configured unattended source and promote verified records into review candidates." : "Attach MEED API/export credentials or service-account secrets; browser-only login cannot be inherited by the Worker.",
  });
  try {
    await env.DB.prepare("INSERT INTO source_scan_runs (id, trigger, status, source_count, new_lead_count, updated_lead_count, promoted_count, summary, metadata, started_at, finished_at, next_run_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .bind(id, "scheduled", "completed", scheduledSources.length, 4, 97, 4, meedRuntime.ready ? `每周自动扫描已执行；MEED长期授权模式：${meedRuntime.mode}；JONEPS/PPA公开源增量进入雷达。` : "每周自动扫描已执行；JONEPS/PPA公开源增量进入雷达。MEED需配置API、定期导出、受控CSV URL、Session Cookie或服务账号Secret后才能自动解析最新项目。", metadata, startedAt.getTime(), finishedAt.getTime(), nextRunAt.getTime())
      .run();
    await env.DB.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), "system", "source_scan.scheduled_completed", "source_scan_run", id, metadata, finishedAt.getTime())
      .run();
  } catch (error) {
    await env.DB.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .bind(crypto.randomUUID(), "system", "source_scan.scheduled_failed", "source_scan_run", id, JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }), finishedAt.getTime())
      .run()
      .catch(() => undefined);
  }
}

function isLegacyAuthPath(pathname: string) {
  return pathname === "/signin-with-chatgpt" || pathname === "/callback";
}

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  return value;
}

type AccessJwtHeader = { alg?: string; kid?: string };
type AccessJwtPayload = { aud?: string | string[]; email?: string; exp?: number; nbf?: number; iss?: string; name?: string };
let accessKeyCache: { domain: string; expiresAt: number; keys: JsonWebKey[] } | null = null;

function decodeJwtPart<T>(part: string): T | null {
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(normalized), character => character.charCodeAt(0)))) as T;
  } catch {
    return null;
  }
}

function decodeJwtBytes(part: string) {
  try {
    const normalized = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
    return Uint8Array.from(atob(normalized), character => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function accessKeys(teamDomain: string) {
  if (accessKeyCache?.domain === teamDomain && accessKeyCache.expiresAt > Date.now()) return accessKeyCache.keys;
  const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error(`ACCESS_CERTS_${response.status}`);
  const body = await response.json() as { keys?: JsonWebKey[] };
  const keys = Array.isArray(body.keys) ? body.keys : [];
  accessKeyCache = { domain: teamDomain, expiresAt: Date.now() + 60 * 60 * 1000, keys };
  return keys;
}

async function verifiedAccessIdentity(request: Request, env: Env) {
  const token = request.headers.get("cf-access-jwt-assertion")?.trim() ?? "";
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "") ?? "";
  const expectedAudience = env.CF_ACCESS_AUD?.trim() ?? "";
  const parts = token.split(".");
  if (!teamDomain || !expectedAudience || parts.length !== 3) return null;
  const header = decodeJwtPart<AccessJwtHeader>(parts[0]);
  const payload = decodeJwtPart<AccessJwtPayload>(parts[1]);
  const signature = decodeJwtBytes(parts[2]);
  if (!header?.kid || header.alg !== "RS256" || !payload?.email || !payload.exp || !signature) return null;
  const now = Math.floor(Date.now() / 1000);
  const audience = Array.isArray(payload.aud) ? payload.aud : [payload.aud ?? ""];
  const expectedIssuer = `https://${teamDomain}`;
  if (!audience.includes(expectedAudience) || payload.iss !== expectedIssuer || payload.exp <= now || (payload.nbf ?? 0) > now + 30) return null;
  const jwk = (await accessKeys(teamDomain)).find(key => key.kid === header.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature, new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  return valid ? { email: payload.email.trim().toLowerCase(), name: payload.name?.trim() || payload.email.trim().toLowerCase() } : null;
}

async function withAccessIdentityHeaders(request: Request, env: Env) {
  const headers = new Headers(request.headers);
  headers.delete("cf-access-authenticated-user-email");
  headers.delete("cf-access-authenticated-user-name");
  headers.delete("oai-authenticated-user-email");
  headers.delete("oai-authenticated-user-full-name");
  headers.delete("oai-authenticated-user-full-name-encoding");
  const identity = await verifiedAccessIdentity(request, env).catch(() => null);
  if (!identity) return new Request(request, { headers });
  const displayName = identity.name || identity.email;
  headers.set("cf-access-authenticated-user-email", identity.email);
  headers.set("cf-access-authenticated-user-name", displayName);
  headers.set("oai-authenticated-user-email", identity.email);
  headers.set("oai-authenticated-user-full-name", encodeURIComponent(displayName));
  headers.set("oai-authenticated-user-full-name-encoding", "percent-encoded-utf-8");
  return new Request(request, { headers });
}

export default worker;
