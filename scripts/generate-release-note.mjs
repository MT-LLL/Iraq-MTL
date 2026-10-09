import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";

function git(args, fallback = "") {
  try { return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { return fallback; }
}

const sha = process.env.GITHUB_SHA || git(["rev-parse", "HEAD"], "local");
const shortSha = sha.slice(0, 8);
const subject = git(["log", "-1", "--pretty=%s"], "Platform version update").replace(/[\r\n"`]/g, " ").trim() || "Platform version update";
const changedFiles = git(["show", "--format=", "--name-only", "HEAD"]).split("\n").map(file => file.trim()).filter(Boolean);
const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
const week = (() => { const d = new Date(date + "T12:00:00Z"); d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7)); const start = new Date(Date.UTC(d.getUTCFullYear(), 0, 1)); return Math.ceil((((d - start) / 86400000) + 1) / 7); })();
const shownFiles = changedFiles.slice(0, 8);
const changedSummary = shownFiles.length ? shownFiles.join("、") : "由当前 Git 提交自动生成版本记录";
const changedSummaryEn = shownFiles.length ? shownFiles.join(", ") : "Generated from the current Git commit";
const q = value => JSON.stringify(value);
const generated = [
  "// Auto-generated at build time. Do not edit by hand.",
  'import type { ReleaseUpdate } from "./data";',
  'export const autoReleaseUpdate: ReleaseUpdate = {',
  "  id: " + q("AUTO-" + shortSha) + ",",
  "  period: " + q("第" + week + "周 · " + date + " · 版本 " + shortSha) + ",",
  "  periodEn: " + q("Week " + week + " · " + date + " · version " + shortSha) + ",",
  "  title: " + q(subject) + ",",
  "  titleEn: " + q(subject) + ",",
  "  publishedAt: " + q(date + " · Asia/Baghdad") + ",",
  "  dataSource: \"GitHub main 提交记录 + 自动部署构建\",",
  "  dataSourceEn: \"GitHub main commit + automated deployment build\",",
  "  status: \"published\",",
  "  stats: [",
  "    { label: \"版本提交\", labelEn: \"Version commit\", value: " + q(shortSha) + ", note: \"本次部署对应版本\", noteEn: \"Commit deployed in this build\" },",
  "    { label: \"变更文件\", labelEn: \"Changed files\", value: " + q(String(changedFiles.length)) + ", note: \"本次提交涉及文件数\", noteEn: \"Files changed in this commit\" },",
  "    { label: \"部署来源\", labelEn: \"Deploy source\", value: \"GitHub\", note: \"main 分支自动构建\", noteEn: \"Automatic build from main\" },",
  "    { label: \"记录方式\", labelEn: \"Record mode\", value: \"AUTO\", note: \"每次版本构建自动生成\", noteEn: \"Generated on every version build\" }",
  "  ],",
  "  highlights: [" + [q("本次版本说明：" + subject), q("提交版本：" + sha), q("本次提交变更文件：" + changedSummary)].join(", ") + "],",
  "  highlightsEn: [" + [q("Release summary: " + subject), q("Commit SHA: " + sha), q("Changed files: " + changedSummaryEn)].join(", ") + "],",
  "  keyOpportunities: [],",
  "  platformUpdates: [" + [q("自动记录本次版本提交 " + shortSha + "，无需手工新增更新纪要。"), q("变更文件：" + changedSummary)].join(", ") + "],",
  "  platformUpdatesEn: [" + [q("Automatically recorded version commit " + shortSha + "; no manual release-note entry is needed."), q("Changed files: " + changedSummaryEn)].join(", ") + "],",
  "  nextActions: [\"持续按每次成功构建自动生成版本纪要；机会数据增量仍以成功的数据采集记录为准。\"],",
  "  nextActionsEn: [\"Keep generating release notes on each build; opportunity data deltas remain based on successful ingestion records.\"],",
  "};",
  ""
].join("\n");
await writeFile(new URL("../app/generated-release-note.ts", import.meta.url), generated, "utf8");
console.log("Generated release note for " + shortSha + " (" + date + ")");