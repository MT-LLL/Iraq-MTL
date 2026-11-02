# Iraq-MTL opportunity analysis — fixed manual bilingual workflow

## Canonical user trigger

When the user says **“执行机会点双语分析工作流”** (also accept **“执行机会点分析工作流”**), execute this complete workflow. Do not ask the user to restate requirements, upload files, copy records, or approve each batch.

This is a manually triggered workflow. MEED ingestion does not automatically start GPT analysis. The user decides when to start by issuing the trigger phrase after refreshing MEED opportunity data.

## Non-negotiable operating rules

- The current ChatGPT conversation is the analysis engine. Analyze each opportunity directly with the GPT model active in the conversation.
- Never call OpenAI, Kimi, Zhipu, or any other model API. GitHub Actions is only a controlled bridge to read from and write to production D1; it must not perform model inference.
- Scope: opportunities in Iraq, Jordan, and Lebanon, across MEED and other included sources.
- Work in batches of **10 opportunities**. After each batch is saved and verified, automatically fetch the next batch and continue in the same user-requested run until no eligible records remain. Do not stop after one batch or ask the user to say “continue”.
- Use live production D1 contents on every fetch. Never rely on an old export, stale in-memory queue, or assumed total.
- Preserve all original MEED/source fields, amount values, currency, evidence, and existing `solution_matches` JSON properties. Write GPT analysis only into `solution_matches.opportunityAnalysis`; do not replace source facts.
- Protect Cloudflare credentials, GitHub Secrets, email configuration, Access policies, and other production settings. Do not rotate, overwrite, or delete them as part of this workflow.

## Per-run execution sequence

1. **Read live production D1.** Set `data/manual-gpt-opportunity-batch.json` to `{"mode":"fetch"}` and use the existing manual GitHub Actions bridge. Read the run's job log and extract the batch JSON. If the bridge is not successful, diagnose it; never pretend that a fetch or write succeeded.
2. **Synchronize authoritative priority before analysis.** Every fully bilingual-analyzed opportunity must have `opportunities.priority` equal to `solution_matches.opportunityAnalysis.priority`. The fetch workflow performs this reconciliation and readback. If any mismatch remains, stop and resolve it before continuing.
3. **Select eligible records.** Analyze only Iraq/Jordan/Lebanon records missing either Chinese or English analysis. Exclude archived, dismissed, ignored, not_tracking, and not_valuable records, as well as non-opportunity administrative pages and duplicate records. Do not re-analyze complete bilingual analyses unless the user explicitly requests a re-analysis. If the bridge's SQL does not expose an archive/status field, inspect the returned record metadata and use the available canonical status before deciding eligibility; never silently analyze archived items.
4. **Analyze in ChatGPT, 10 at a time.** For each project independently, assess the real scope, stage, buyer/owner, funding, milestones, news, amount/currency, evidence, and country context. Separate confirmed facts, reasoned inference, and unknowns. Match only relevant Huawei solutions; do not recycle generic lists or identical scores. Fit score means scope-to-Huawei-solution fit, not win probability or project value.
5. **Produce complete Chinese and English analysis.** Required in both languages: demand/project summary, recommended Huawei solutions, scoring rationale, risks, next actions, evidence, and facts versus inference. Assign a single priority: P0, P1, P2, or WATCH. Scores and priority must be project-specific and internally consistent. Do not invent customer commitments, budget, tender dates, named contacts, or confirmed technical requirements.
6. **Validate the batch before writeback.** Every opportunity ID must occur exactly once. Confirm both language objects are complete, arrays have the expected type, priority is valid, and fit score is an integer from 0 to 100. The workflow bridge accepts up to 20 writeback entries, but the operating batch size remains 10.
7. **Write to production D1.** Set the control file to `{"mode":"writeback","analyses":[...]}` using the established schema. For each record, write the bilingual analysis under `solution_matches.opportunityAnalysis` and update `opportunities.priority` to the same GPT-assigned priority in the same D1 write. Preserve the rest of `solution_matches` and write the audit event. Do not use any model API.
8. **Read back and verify.** Read the same IDs from D1 and verify the Chinese and English sections, priority in both locations, fit score, and prompt version. If any record fails, report the exact IDs and repair only those records. A GitHub commit or successful workflow start is not proof of a D1 write.
9. **Repeat automatically.** Once the current batch is verified, fetch the next live batch and repeat steps 2–8. Continue until the fetch returns zero eligible records. Do not ask for another user prompt between batches.
10. **Close the run.** Run the count/coverage check and report totals fetched, analyzed, saved, readback-verified, skipped, and remaining; country distribution; GPT priority distribution; any failures; and the Actions run links. State clearly if any result could not be verified. Leave `data/manual-gpt-opportunity-batch.json` in `{"mode":"fetch"}` for the next user-triggered run.

## One priority system — mandatory

- GPT's bilingual analysis priority is the **only authoritative opportunity level** once both language analyses are complete.
- The same value must be stored in `solution_matches.opportunityAnalysis.priority` and `opportunities.priority`.
- The website list, detail page, filters, counts, and sorting must use that canonical GPT priority. Do not recalculate or substitute the legacy priority for analyzed records.
- Sort order: **P0 → P1 → P2 → WATCH**. Within a priority, use the site's approved secondary score/freshness ordering.
- Records without a completed bilingual GPT analysis retain their current priority until analysis is completed.
- Every later batch fetch reconciles previously analyzed records and verifies zero mismatches before returning new work.

## Fixed analysis rubric

- **P0**: exceptionally strong strategic fit and credible near-term engagement; clear scope and actionable Huawei role.
- **P1**: strong fit with identifiable buyer/project scope and plausible next engagement, but one or more material conditions remain.
- **P2**: partial or enabling fit, early-stage/uncertain procurement, or limited evidence; worth tracking with defined validation actions.
- **WATCH**: weak, indirect, speculative, or currently unsupported fit; retain only if a concrete signal justifies monitoring.
- Never inflate priority based only on project value or national importance. Clearly distinguish project value from Huawei-addressable scope.

## Current implementation and failure handling

- Workflow file: `.github/workflows/manual-gpt-opportunity-batch.yml`.
- Control file: `data/manual-gpt-opportunity-batch.json`.
- D1 database: `mssd_mtl_prod`; table: `opportunities`.
- Analysis field: `solution_matches.opportunityAnalysis`.
- Supported bridge modes: `fetch`, `writeback`, `count`, and `sync-priorities`.
- The workflow is manually operated through commits to the control JSON / manual dispatch. A push-triggered bridge run is infrastructure plumbing only; it is not automatic GPT analysis.
- If the authenticated D1 bridge or required GitHub Actions credentials are unavailable, explain the blocker and stop. Never claim D1 was updated without successful write response plus readback.
- If a run fails, inspect its job log, make the smallest safe correction, preserve existing secrets/configuration, and rerun only after confirming the previous run has ended.

## Completion message

After a complete run, provide a concise Chinese report with verified counts and priority distribution. Do not say “completed” for records that have not passed D1 readback verification.
