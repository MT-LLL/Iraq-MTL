import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputPath = resolve(process.argv[2] || "/private/tmp/mssd-partner-email-preview.html");
const lang = process.argv[3] === "en" ? "en" : "zh";

const entry = `
  import { buildContent } from "./app/notifications.ts";
  import { opportunities } from "./app/data.ts";

  export function renderPreview() {
    const selected = opportunities.slice(0, 2);
    const content = buildContent(
      selected,
      "partner",
      "Zhao Wenjun",
      ${JSON.stringify(lang)},
      {
        pushId: "PUSH-PREVIEW-20260909",
        ackToken: "preview-token-not-for-production",
        slaDueAt: "2026-09-16T09:00:00.000Z",
      },
      new Map(),
    );
    return content;
  }
`;

const result = await build({
  stdin: {
    contents: entry,
    resolveDir: projectRoot,
    sourcefile: "email-preview-entry.ts",
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  write: false,
  plugins: [{
    name: "cloudflare-workers-preview-stub",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^cloudflare:workers$/ }, () => ({ path: "cloudflare:workers", namespace: "preview-stub" }));
      buildApi.onLoad({ filter: /.*/, namespace: "preview-stub" }, () => ({
        contents: `export const env = { MSSD_SITE_URL: "https://example.workers.dev" };`,
        loader: "js",
      }));
    },
  }],
});

const bundledCode = result.outputFiles[0].text;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundledCode).toString("base64")}`;
const previewModule = await import(moduleUrl);
const content = previewModule.renderPreview();

const html = `<!doctype html>
<html lang="${lang === "zh" ? "zh-CN" : "en"}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${content.subject}</title>
  <style>html,body{margin:0;padding:0;background:#eef4f2}body{font-family:Arial,'Microsoft YaHei',sans-serif}</style>
</head>
<body>${content.html}</body>
</html>`;

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");

const checks = {
  subject: content.subject,
  lang,
  outputPath,
  bytes: Buffer.byteLength(html),
  opportunityCards: (html.match(/Partner-safe view ·|伙伴安全版 ·/g) || []).length,
  hasOutlookTables: /role="presentation"/.test(html),
  hasInlineStyles: /style="[^"]+"/.test(html),
  hasConfirmationLink: /\/partner-ack\?push=/.test(html),
  leaksInternalScoreValue: /内部经营研判|Internal sales assessment|\b\d{1,3}\/100\b/.test(html),
  leaksOwnerValue: /机会Owner：|Opportunity owner:/.test(html),
  leaksCompetitionValue: /竞争态势：|Competitive landscape:/.test(html),
  leaksAddressableValue: /\$18[–-]24M|\$22[–-]28M/.test(html),
};

console.log(JSON.stringify(checks, null, 2));
