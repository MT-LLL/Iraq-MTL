# Iraq-MTL opportunity analysis — manual ChatGPT workflow

## Operating rule

The current ChatGPT conversation is the only analysis engine. Do not call OpenAI, Kimi, or any other model API. Do not require or create an AI API key in GitHub Secrets. GitHub Actions must not automatically start analysis after MEED ingestion, on a push, or on a timer.

The user starts each run by saying **“执行机会点分析工作流”** in the Iraq-MTL project conversation.

## One run

1. **Read the current opportunity inventory** from production D1 through the authenticated admin opportunity-analysis read path. Use the current database contents, not an old export or cached list.
2. **Normalize and deduplicate** before analysis. Use normalized title + country + city as the initial duplicate key; inspect close matches and merge/retain the best canonical record rather than analyzing duplicate rows.
3. **Exclude** records already archived, not_tracking, ignored, dismissed, or not_valuable. Also exclude records already carrying the current analysis prompt version `meed-scope-fit-v1`, unless the user explicitly requests re-analysis.
4. **Select at most 30 eligible opportunities** in priority order (P0, P1, P2), then score and freshness. Preserve the source evidence and original amount/currency fields.
5. **Analyze in this ChatGPT conversation**, independently for every opportunity. Separate source-confirmed facts, reasoned inference, and unknowns. Match Huawei solutions to the actual project scope; do not reuse a generic solution list or identical score. Treat fit score as scope-to-Huawei-solution fit, not win probability or project value.
6. **Validate the complete batch before writeback.** Every selected ID must appear exactly once. Required fields: priority, demand summary, recommended Huawei solutions (may be empty if evidence is insufficient), fit score (0–100), score rationale, risks, next actions, evidence, and facts-versus-inference.
7. **Write back and verify.** The current admin writeback endpoint accepts at most 25 updates per request, so a 30-record batch must be sent as 25 + 5. Preserve existing `solution_matches` JSON fields, save the analysis under `opportunityAnalysis`, write the audit event, then read the records back and compare IDs, prompt version, fit score, priority, and analysis timestamp. Never report a batch complete until readback succeeds.
8. **Continue only when the user asks to continue**, rereading production D1 before each next batch. Do not assume the previous in-memory queue is still current. Repeat deduplication and exclusion checks.
9. **After the final batch**, reread all analyses completed in this run and produce a Chinese cycle brief with totals, skipped duplicates/archived/already-analyzed counts, priority distribution, top opportunities, Huawei solution fit, risks, next actions, evidence gaps, and writeback/readback verification.

## Current implementation boundary

- GitHub Actions is deliberately non-executing and contains no model API integration.
- The admin route currently authenticates through Cloudflare Access and writes at most 25 records per POST.
- The admin GET/POST route has been broadened to include all opportunity sources (not only MEED). Deduplication, archive exclusion, and current-prompt-version exclusion are applied by the analysis operator against the live inventory before selecting each batch. Do not silently omit non-MEED records.
- If the authenticated D1 read/write path is not available to the active ChatGPT session, explain that limitation and request an authorized export or provide the exact batch payload for the user's authorized admin path. Never claim D1 was updated without a successful write response and readback.

## Trigger phrase

**执行机会点分析工作流**

Optional follow-up phrases:
- **继续下一批** — read the live inventory again and process the next eligible batch.
- **生成本轮分析简报** — compile the completed run's saved analyses and verification results.
