import { env } from "cloudflare:workers";

type RuntimeEnv = {
  DB?: D1Database;
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  MSSD_ADMIN_EMAILS?: string;
};

type AccessClaims = {
  email?: string;
  aud?: string | string[];
  iss?: string;
  exp?: number;
  nbf?: number;
};

type AnalysisUpdate = {
  opportunityId: string;
  analysis: {
    promptVersion: string;
    analyzedAt: string;
    priority: string;
    demandSummary: string;
    recommendedHuaweiSolutions: string[];
    fitScore: number;
    scoreRationale: string;
    risks: string[];
    nextActions: string[];
    evidence: string[];
    factsVsInference?: string;
  };
};

const runtimeEnv = () => env as unknown as RuntimeEnv;
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });

function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(normalized + "=".repeat((4 - normalized.length % 4) % 4));
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

function decodeJsonPart<T>(part: string): T {
  return JSON.parse(new TextDecoder().decode(decodeBase64Url(part))) as T;
}

function configuredAdmin(email: string): boolean {
  const admins = (runtimeEnv().MSSD_ADMIN_EMAILS ?? "")
    .split(/[,;\\s]+/)
    .map(value => value.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(email.trim().toLowerCase());
}

async function verifyAccessJwt(request: Request): Promise<{ email: string } | null> {
  const configuration = runtimeEnv();
  const teamDomain = (configuration.CF_ACCESS_TEAM_DOMAIN ?? "").trim().replace(/^https?:/i, "").replaceAll("/", "");
  const expectedAudience = (configuration.CF_ACCESS_AUD ?? "").trim();
  const token = request.headers.get("cf-access-jwt-assertion");
  if (!teamDomain || !expectedAudience || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    const claims = decodeJsonPart<AccessClaims>(parts[1]);
    const now = Math.floor(Date.now() / 1000);
    const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    const expectedIssuer = `https://${teamDomain}`;
    if (claims.iss !== expectedIssuer || !audiences.includes(expectedAudience)) return null;
    if (typeof claims.exp !== "number" || claims.exp <= now) return null;
    if (typeof claims.nbf === "number" && claims.nbf > now + 30) return null;
    if (!claims.email || !configuredAdmin(claims.email)) return null;

    const keysResponse = await fetch(`${expectedIssuer}/cdn-cgi/access/certs`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(4000),
    });
    if (!keysResponse.ok) return null;
    const keySet = await keysResponse.json() as { keys?: Array<JsonWebKey & { kid?: string; alg?: string }> };
    const header = decodeJsonPart<{ alg?: string; kid?: string }>(parts[0]);
    if (header.alg !== "RS256" || !header.kid) return null;
    const jwk = keySet.keys?.find(key => key.kid === header.kid && (!key.alg || key.alg === "RS256"));
    if (!jwk) return null;

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      jwk,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signedContent = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const valid = await crypto.subtle.verify(
      "RSASSA-PKCS1-v1_5",
      publicKey,
      decodeBase64Url(parts[2]),
      signedContent,
    );
    return valid ? { email: claims.email.trim().toLowerCase() } : null;
  } catch {
    return null;
  }
}

async function authorize(request: Request) {
  const identity = await verifyAccessJwt(request);
  if (!identity) return { response: json({ ok: false, error: "ADMIN_ACCESS_REQUIRED" }, 401) };
  const db = runtimeEnv().DB;
  if (!db) return { response: json({ ok: false, error: "D1_NOT_CONFIGURED" }, 500) };
  return { identity, db };
}

export async function GET(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  const url = new URL(request.url);
  const requested = (url.searchParams.get("priority") ?? "P0,P1,P2")
    .split(",")
    .map(value => value.trim().toUpperCase())
    .filter(value => ["P0", "P1", "P2"].includes(value));
  if (!requested.length) return json({ ok: false, error: "INVALID_PRIORITY_FILTER" }, 400);

  const rawLimit = Number(url.searchParams.get("limit") ?? 100);
  const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, Math.floor(rawLimit))) : 100;
  const placeholders = requested.map(() => "?").join(",");
  const rows = await auth.db.prepare(`
    SELECT id, external_id AS externalId, title, title_en AS titleEn, country, city,
      industry, stage, priority, score, confidence, project_value AS projectValue,
      addressable_value AS addressableValue, currency, funding_status AS fundingStatus,
      bid_deadline AS bidDeadline, summary, key_project_milestones AS keyProjectMilestones,
      news_and_updates AS newsAndUpdates, latest_news AS latestNews,
      solution_matches AS solutionMatches, source_name AS sourceName, source_url AS sourceUrl,
      updated_at AS updatedAt
    FROM opportunities
    WHERE priority IN (${placeholders})
      AND (source_name LIKE '%MEED%' OR id LIKE 'MEED-%')
    ORDER BY CASE priority WHEN 'P0' THEN 0 WHEN 'P1' THEN 1 ELSE 2 END, score DESC, updated_at DESC
    LIMIT ?
  `).bind(...requested, limit).all<Record<string, unknown>>();

  const opportunities = rows.results ?? [];
  const evidenceRows = await Promise.all(opportunities.map(async opportunity => {
    const result = await auth.db.prepare(`
      SELECT kind, excerpt, source_url AS sourceUrl, collected_at AS collectedAt
      FROM evidence WHERE opportunity_id = ? ORDER BY collected_at DESC LIMIT 8
    `).bind(String(opportunity.id)).all<Record<string, unknown>>();
    return [String(opportunity.id), result.results ?? []] as const;
  }));

  return json({
    ok: true,
    source: "production-d1",
    readOnlyFields: ["id", "title", "summary", "sourceUrl", "priority"],
    writableField: "solution_matches",
    count: opportunities.length,
    opportunities: opportunities.map(opportunity => ({
      ...opportunity,
      evidence: Object.fromEntries(evidenceRows).get(String(opportunity.id)) ?? [],
    })),
  });
}

export async function POST(request: Request) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  let payload: { updates?: AnalysisUpdate[] };
  try {
    payload = await request.json() as { updates?: AnalysisUpdate[] };
  } catch {
    return json({ ok: false, error: "INVALID_JSON" }, 400);
  }
  if (!Array.isArray(payload.updates) || payload.updates.length < 1 || payload.updates.length > 25) {
    return json({ ok: false, error: "UPDATES_MUST_CONTAIN_1_TO_25_ITEMS" }, 400);
  }

  const seen = new Set<string>();
  for (const item of payload.updates) {
    const analysis = item?.analysis;
    if (!item?.opportunityId || item.opportunityId.length > 180 || seen.has(item.opportunityId)) {
      return json({ ok: false, error: "INVALID_OR_DUPLICATE_OPPORTUNITY_ID" }, 400);
    }
    seen.add(item.opportunityId);
    if (!analysis || typeof analysis !== "object" || analysis.promptVersion !== "meed-scope-fit-v1") {
      return json({ ok: false, error: "INVALID_ANALYSIS_OR_PROMPT_VERSION" }, 400);
    }
    if (!Number.isInteger(analysis.fitScore) || analysis.fitScore < 0 || analysis.fitScore > 100) {
      return json({ ok: false, error: "FIT_SCORE_MUST_BE_0_TO_100" }, 400);
    }
    if (!["P0", "P1", "P2"].includes(analysis.priority) ||
        !analysis.demandSummary?.trim() || !analysis.scoreRationale?.trim() ||
        !Array.isArray(analysis.recommendedHuaweiSolutions) ||
        !Array.isArray(analysis.risks) || !Array.isArray(analysis.nextActions) ||
        !Array.isArray(analysis.evidence)) {
      return json({ ok: false, error: "ANALYSIS_FIELDS_INVALID" }, 400);
    }
  }

  const now = Date.now();
  const results: Array<{ opportunityId: string; saved: boolean; error?: string }> = [];
  for (const item of payload.updates) {
    const id = item.opportunityId;
    const existing = await auth.db.prepare(
      "SELECT id, solution_matches FROM opportunities WHERE id = ? AND (source_name LIKE '%MEED%' OR id LIKE 'MEED-%')"
    ).bind(id).first<{ id: string; solution_matches: string | null }>();
    if (!existing) {
      results.push({ opportunityId: id, saved: false, error: "MEED_OPPORTUNITY_NOT_FOUND" });
      continue;
    }

    const previous = existing.solution_matches;
    let merged: Record<string, unknown> = {};
    if (previous) {
      try {
        const parsed = JSON.parse(previous) as Record<string, unknown>;
        if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) merged = parsed;
      } catch {
        merged = { legacyValue: previous };
      }
    }
    const savedAnalysis = {
      ...item.analysis,
      analyzedAt: item.analysis.analyzedAt || new Date(now).toISOString(),
      analyzedBy: auth.identity.email,
      source: "ChatGPT-assisted manual analysis",
      scoreMeaning: "Scope-to-Huawei-solution fit; not win probability or project value",
    };
    const nextValue = JSON.stringify({ ...merged, opportunityAnalysis: savedAnalysis });
    await auth.db.batch([
      auth.db.prepare("UPDATE opportunities SET solution_matches = ?, updated_at = ? WHERE id = ?")
        .bind(nextValue, now, id),
      auth.db.prepare("INSERT INTO audit_logs (id, actor_id, action, entity_type, entity_id, metadata, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(
          crypto.randomUUID(),
          auth.identity.email,
          "opportunity.scope_fit_analysis_saved",
          "opportunity",
          id,
          JSON.stringify({
            promptVersion: item.analysis.promptVersion,
            fitScore: item.analysis.fitScore,
            analyzedAt: savedAnalysis.analyzedAt,
            previousValuePreserved: Boolean(previous),
          }),
          now,
        ),
    ]);
    results.push({ opportunityId: id, saved: true });
  }

  const saved = results.filter(result => result.saved).length;
  return json({ ok: saved === results.length, saved, failed: results.length - saved, results });
}
