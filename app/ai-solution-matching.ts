import type { HuaweiOfficialSolutionCatalogItem } from "./data";

export type AiSolutionMatch = {
  domain: string;
  name: string;
  fit: number;
  rationale: string;
  evidence: string;
};

export type AiSolutionAnalysis = {
  model: string;
  analyzedAt: string;
  solutions: AiSolutionMatch[];
};

export type AiOpportunityInput = {
  meedId: string;
  title: string;
  industry: string;
  stage: string;
  background: string;
  scope: string;
};

type AiConfig = {
  moonshotApiKey?: string;
  moonshotModel?: string;
  moonshotBaseUrl?: string;
  zhipuApiKey?: string;
  zhipuModel?: string;
  zhipuBaseUrl?: string;
};

function parseJsonObject(content: string): unknown {
  const cleaned = content.trim().replace(/^\u0060\u0060\u0060(?:json)?\s*/i, "").replace(/\s*\u0060\u0060\u0060$/, "");
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI response did not contain a JSON object");
  return JSON.parse(cleaned.slice(start, end + 1));
}

function normalizeSolutions(raw: unknown, catalog: HuaweiOfficialSolutionCatalogItem[]): AiSolutionMatch[] {
  if (!Array.isArray(raw)) return [];
  const byId = new Map(catalog.map(item => [item.id, item]));
  const seen = new Set<string>();
  return raw.flatMap((item: any) => {
    const catalogItem = byId.get(String(item?.catalogId ?? ""));
    if (!catalogItem || seen.has(catalogItem.id)) return [];
    const fit = Number(item.fit);
    if (!Number.isFinite(fit)) return [];
    seen.add(catalogItem.id);
    return [{
      domain: catalogItem.category,
      name: catalogItem.productFamilies.slice(0, 4).join(" / "),
      fit: Math.max(0, Math.min(100, Math.round(fit))),
      rationale: String(item.rationale ?? "").trim().slice(0, 500),
      evidence: String(item.evidence ?? "").trim().slice(0, 500),
    }];
  }).sort((a, b) => b.fit - a.fit).slice(0, 4);
}

async function callModel(
  endpoint: string,
  apiKey: string,
  model: string,
  opportunities: AiOpportunityInput[],
  catalog: HuaweiOfficialSolutionCatalogItem[],
): Promise<Map<string, AiSolutionMatch[]>> {
  const catalogForPrompt = catalog.map(item => ({
    id: item.id,
    category: item.category,
    categoryEn: item.categoryEn,
    products: item.productFamilies,
    scenarios: item.scenarios,
    industries: item.industries,
  }));
  const prompt = [
    "You are a Huawei enterprise ICT solution architect assessing real project opportunities in Iraq, Jordan and Lebanon.",
    "Analyze each project's background and scope semantically, not by keyword overlap. Recommend only catalog items supported by the described project work packages.",
    "Do not infer that a solution is needed merely because the industry matches. If the scope does not support a solution, omit it. Prefer 1-4 high-fit solutions, and return an empty list when evidence is insufficient.",
    "fit is a 0-100 relevance score, not win probability. rationale explains the project-to-solution fit. evidence must cite a short factual phrase from the supplied project text; do not invent facts.",
    "Return ONLY JSON matching { \"matches\": [{ \"meedId\": string, \"solutions\": [{ \"catalogId\": string, \"fit\": number, \"rationale\": string, \"evidence\": string }] }] }.",
    "Solution catalog:",
    JSON.stringify(catalogForPrompt),
    "Projects to analyze:",
    JSON.stringify(opportunities),
  ].join("\n\n");
  const requestBody = JSON.stringify({
    model,
    // Kimi K2.6 only accepts temperature=1; other providers keep the conservative default.
    temperature: /^kimi-k2/i.test(model) ? 1 : 0.1,
    max_tokens: 8000,
    messages: [
      { role: "system", content: "Return concise, evidence-grounded JSON only. Never invent project scope." },
      { role: "user", content: prompt },
    ],
  });
  let response: Response | undefined;
  let lastNetworkError: unknown;
  // Transient upstream resets ("Connection closed" / fetch failed) are common
  // on long-lived serverless connections. Retry once before surfacing an error.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const normalizedEndpoint = endpoint.endsWith("/") ? endpoint.slice(0, -1) : endpoint;
      response = await fetch(`${normalizedEndpoint}/chat/completions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: requestBody,
        signal: AbortSignal.timeout(45000),
      });
      if (response.status >= 500 && attempt < 2) {
        lastNetworkError = new Error(`AI provider returned HTTP ${response.status}`);
        continue;
      }
      break;
    } catch (error) {
      lastNetworkError = error;
      if (attempt === 2) {
        const detail = error instanceof Error ? error.message : String(error);
        throw new Error(`AI provider connection failed after retry: ${detail}`);
      }
    }
  }
  if (!response) {
    const detail = lastNetworkError instanceof Error ? lastNetworkError.message : String(lastNetworkError ?? "unknown network error");
    throw new Error(`AI provider connection failed: ${detail}`);
  }
  if (!response.ok) { const detail = (await response.text()).slice(0, 600); throw new Error(`AI solution analysis failed with HTTP ${response.status}: ${detail}`); }
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI solution analysis returned an empty response");
  const parsed = parseJsonObject(content) as { matches?: Array<{ meedId?: string; solutions?: unknown }> };
  const results = new Map<string, AiSolutionMatch[]>();
  for (const match of parsed.matches ?? []) {
    const id = String(match.meedId ?? "").trim();
    if (id) results.set(id, normalizeSolutions(match.solutions, catalog));
  }
  // An omitted match entry means no supported catalog fit was found, not that analysis failed.
  for (const opportunity of opportunities) {
    if (!results.has(opportunity.meedId)) results.set(opportunity.meedId, []);
  }
  return results;
}

/** Batch AI matching during ingestion so homepage requests never call an LLM. */
export type AiSolutionAnalysisBatchResult = {
  analyses: Map<string, AiSolutionAnalysis>;
  model: string | null;
  configured: boolean;
  inputCount: number;
  failures: string[];
};

export async function analyzeOpportunitySolutions(
  opportunities: AiOpportunityInput[],
  catalog: HuaweiOfficialSolutionCatalogItem[],
  config: AiConfig,
): Promise<AiSolutionAnalysisBatchResult> {
  const moonshotKey = config.moonshotApiKey?.trim();
  const zhipuKey = config.zhipuApiKey?.trim();
  const apiKey = moonshotKey || zhipuKey;
  if (!apiKey || !opportunities.length) return { analyses: new Map(), model: null, configured: Boolean(apiKey), inputCount: opportunities.length, failures: apiKey ? [] : ["No Moonshot or Zhipu API key configured"] };

  const model = moonshotKey
    ? (config.moonshotModel?.trim() || "kimi-k2.6")
    : (config.zhipuModel?.trim() || "glm-5.3");
  const endpoint = moonshotKey
    ? (config.moonshotBaseUrl?.trim() || "https://api.moonshot.cn/v1")
    : (config.zhipuBaseUrl?.trim() || "https://open.bigmodel.cn/api/paas/v4");
  const output = new Map<string, AiSolutionAnalysis>();
  const failures: string[] = [];
  const analyzedAt = new Date().toISOString();

  // Keep prompts bounded, but process a few batches concurrently. Sequential
  // 45-second requests can exceed the caller's ~5-minute fetch window for 100+ projects.
  const batchSize = 4;
  const batches: Array<{ index: number; opportunities: AiOpportunityInput[] }> = [];
  for (let offset = 0; offset < opportunities.length; offset += batchSize) {
    batches.push({ index: Math.floor(offset / batchSize) + 1, opportunities: opportunities.slice(offset, offset + batchSize) });
  }
  let nextBatch = 0;
  const concurrency = Math.min(6, batches.length);
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (nextBatch < batches.length) {
      const batch = batches[nextBatch++];
      try {
        const matches = await callModel(endpoint, apiKey, model, batch.opportunities, catalog);
        for (const opportunity of batch.opportunities) {
          const solutions = matches.get(opportunity.meedId) ?? [];
          output.set(opportunity.meedId, { model, analyzedAt, solutions });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "unknown error";
        failures.push(`batch ${batch.index}: ${message}`.slice(0, 900));
        console.error("[MTL] AI solution matching batch failed:", message);
      }
    }
  }));
  return { analyses: output, model, configured: true, inputCount: opportunities.length, failures };
}
