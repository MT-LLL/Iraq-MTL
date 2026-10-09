// Local-development fallback. Replaced automatically by scripts/generate-release-note.mjs during each build.
import type { ReleaseUpdate } from "./data";

export const autoReleaseUpdate: ReleaseUpdate = {
  id: "AUTO-LOCAL",
  period: "当前版本 · 本地构建",
  periodEn: "Current version · local build",
  title: "自动版本纪要已启用",
  titleEn: "Automatic release notes enabled",
  publishedAt: "本地构建",
  dataSource: "Git 提交 + 自动构建",
  dataSourceEn: "Git commit + automated build",
  status: "published",
  stats: [
    { label: "版本提交", labelEn: "Version commit", value: "LOCAL", note: "构建时自动替换", noteEn: "Replaced during build" },
    { label: "变更文件", labelEn: "Changed files", value: "—", note: "构建时自动统计", noteEn: "Counted during build" },
    { label: "部署来源", labelEn: "Deploy source", value: "GitHub", note: "main 分支自动构建", noteEn: "Automatic build from main" },
    { label: "记录方式", labelEn: "Record mode", value: "AUTO", note: "每次版本构建自动生成", noteEn: "Generated on every version build" }
  ],
  highlights: ["版本纪要将在构建时从最新 Git 提交自动生成。"],
  highlightsEn: ["Release notes are generated from the latest Git commit during build."],
  keyOpportunities: [],
  platformUpdates: ["无需手工维护每一期版本更新纪要。"],
  platformUpdatesEn: ["No manual maintenance is needed for release notes."],
  nextActions: ["持续自动生成版本纪要。"],
  nextActionsEn: ["Continue generating release notes automatically."]
};
