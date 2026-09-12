import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactDir = process.env.MEED_ARTIFACT_DIR || join(rootDir, "artifacts", "meed");
const projectSearchUrl = process.env.MEED_PROJECT_SEARCH_URL || "https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000013-4000014-4000016&ProjectFields=MEEDTitle-ProfileType-MEEDCountry,MEEDCountryRegion,mEEDCityTown-Industry,Sector,SubSector-MeedContractValue,ProjectValue,NetValue,CashSpent-MEEDStage-LastUpdatedOnString-MainContractAward-MainContractCompletion";
const ingestEndpoint = process.env.MEED_INGEST_ENDPOINT || `${String(process.env.MSSD_SITE_URL || "").replace(/\/$/, "")}/api/meed-ingest`;
const ingestToken = process.env.MEED_INGEST_TOKEN || "";

const required = ["MEED_USERNAME", "MEED_PASSWORD", "MEED_INGEST_TOKEN"];
const missing = required.filter((key) => !process.env[key]);
if (!ingestEndpoint || ingestEndpoint === "/api/meed-ingest") missing.push("MEED_INGEST_ENDPOINT or MSSD_SITE_URL");
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(", ")}`);
  process.exit(2);
}

function text(value, fallback = "") {
  return String(value ?? "").replace(/\s+/g, " ").trim() || fallback;
}

function decodeXml(value) {
  return text(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function colIndex(ref) {
  const letters = String(ref || "").replace(/[^A-Z]/gi, "").toUpperCase();
  let result = 0;
  for (const letter of letters) result = result * 26 + letter.charCodeAt(0) - 64;
  return Math.max(0, result - 1);
}

function parseSharedStrings(xml) {
  const shared = [];
  const siMatches = xml.match(/<si[\s\S]*?<\/si>/g) || [];
  for (const si of siMatches) {
    const pieces = [...si.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => decodeXml(match[1]));
    shared.push(pieces.join(""));
  }
  return shared;
}

function firstWorksheet(zip) {
  const path = Object.keys(zip).find((key) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key));
  if (!path) throw new Error("No worksheet found in the downloaded workbook");
  return strFromU8(zip[path]);
}

function parseCellValue(cellXml, sharedStrings) {
  const type = cellXml.match(/\st="([^"]+)"/)?.[1] || "";
  if (type === "s") {
    const index = Number(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? -1);
    return sharedStrings[index] ?? "";
  }
  if (type === "inlineStr") {
    return decodeXml([...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((match) => match[1]).join(""));
  }
  return decodeXml(cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? "");
}

function parseWorkbook(buffer) {
  const zip = unzipSync(new Uint8Array(buffer));
  const sharedXml = zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : "";
  const sharedStrings = parseSharedStrings(sharedXml);
  const sheetXml = firstWorksheet(zip);
  const rows = [];
  const rowMatches = sheetXml.match(/<row[\s\S]*?<\/row>/g) || [];
  for (const rowXml of rowMatches) {
    const cells = [];
    for (const match of rowXml.matchAll(/<c([^>]*)>([\s\S]*?)<\/c>/g)) {
      const attrs = match[1];
      const body = match[2];
      const ref = attrs.match(/\sr="([^"]+)"/)?.[1] || "";
      cells[colIndex(ref)] = parseCellValue(`<c${attrs}>${body}</c>`, sharedStrings);
    }
    if (cells.some(Boolean)) rows.push(cells.map((cell) => text(cell)));
  }
  return rows;
}

function normalizeHeader(header) {
  return text(header).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function objectRows(rows) {
  const headerIndex = rows.findIndex((row) => {
    const normalized = row.map(normalizeHeader);
    return normalized.some((cell) => /^project$|projectname|meedtitle|projecttitle/.test(cell)) && normalized.some((cell) => /country|meedcountry/.test(cell));
  });
  if (headerIndex < 0) throw new Error("Could not detect the MEED header row");
  const headers = rows[headerIndex];
  return rows.slice(headerIndex + 1).map((row) => {
    const entry = {};
    headers.forEach((header, index) => {
      const key = text(header, `Column ${index + 1}`);
      if (key) entry[key] = row[index] ?? "";
    });
    return entry;
  }).filter((entry) => Object.values(entry).some(Boolean));
}

function pick(entry, patterns) {
  const keys = Object.keys(entry);
  const found = keys.find((key) => patterns.some((pattern) => pattern.test(normalizeHeader(key))));
  return found ? text(entry[found]) : "";
}

function parseUsdM(value) {
  const raw = text(value);
  if (!raw) return null;
  const normalized = raw.replace(/,/g, "").replace(/\$/g, "");
  const number = Number(normalized.match(/-?\d+(\.\d+)?/)?.[0] ?? NaN);
  if (!Number.isFinite(number)) return null;
  if (/bn|billion|b$/i.test(normalized)) return number * 1000;
  return number;
}

function parseDate(value) {
  const raw = text(value);
  if (!raw) return "";
  const excelSerial = Number(raw);
  if (/^\d{4,6}(\.\d+)?$/.test(raw) && Number.isFinite(excelSerial) && excelSerial > 20000 && excelSerial < 90000) {
    const excelEpoch = Date.UTC(1899, 11, 30);
    const date = new Date(excelEpoch + Math.round(excelSerial) * 86400000);
    if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  }
  const parsed = new Date(raw);
  if (Number.isFinite(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (dmy) {
    const year = Number(dmy[3].length === 2 ? `20${dmy[3]}` : dmy[3]);
    const month = Number(dmy[2]) - 1;
    const day = Number(dmy[1]);
    const date = new Date(Date.UTC(year, month, day));
    if (Number.isFinite(date.getTime())) return date.toISOString().slice(0, 10);
  }
  return raw;
}

function isTargetCountry(country) {
  return /^(iraq|jordan|lebanon)$/i.test(text(country));
}

function isActiveStage(stage) {
  return !/complete|cancel/i.test(text(stage));
}

function isPreAward(stage) {
  return /study|design|feed|bid|pq|pre-qual|tender/i.test(text(stage));
}

function toRecords(entries) {
  return entries.map((entry) => {
    const title = pick(entry, [/^project$/, /^projectname$/, /^meedtitle$/, /projecttitle/]);
    const country = pick(entry, [/^country$/, /^meedcountry$/]);
    const city = pick(entry, [/city|town|meedcitytown/]);
    const industry = pick(entry, [/^industry$/, /^sector$/, /^subsector$/]);
    const sector = pick(entry, [/^sector$/]);
    const subSector = pick(entry, [/^subsector$/]);
    const stage = pick(entry, [/stage|statusprogress|status/]);
    const value = pick(entry, [/netvalue|projectvalue|meedcontractvalue|contractvalue|value/]);
    const updatedOn = parseDate(pick(entry, [/lastupdated|updatedon|updated/]));
    const awardDate = parseDate(pick(entry, [/maincontractaward|award/]));
    const completionDate = parseDate(pick(entry, [/maincontractcompletion|completion/]));
    const meedId = pick(entry, [/^id$/, /projectid|meedid|recordid/]) || title.replace(/\W+/g, "-").slice(0, 60);
    return {
      meedId,
      title,
      country,
      city,
      industry,
      sector,
      subSector,
      stage,
      valueUsdM: parseUsdM(value),
      updatedOn,
      awardDate,
      completionDate,
      sourceUrl: projectSearchUrl,
    };
  }).filter((record) => record.title && isTargetCountry(record.country));
}

function selectPromoted(records) {
  return [...records]
    .filter((record) => isActiveStage(record.stage))
    .sort((a, b) => {
      const dateDelta = Date.parse(b.updatedOn || "1970-01-01") - Date.parse(a.updatedOn || "1970-01-01");
      if (dateDelta) return dateDelta;
      return Number(b.valueUsdM ?? 0) - Number(a.valueUsdM ?? 0);
    })
    .slice(0, Number(process.env.MEED_PROMOTE_LIMIT || 80));
}

function statsFrom(records, promoted) {
  const recentCutoff = Date.now() - 30 * 86400000;
  return {
    sourceRows: records.length,
    validCountryRecords: records.length,
    activeOrWatch: records.filter((record) => isActiveStage(record.stage)).length,
    preAward: records.filter((record) => isPreAward(record.stage)).length,
    recent30Days: records.filter((record) => Date.parse(record.updatedOn || "1970-01-01") >= recentCutoff).length,
    promotedCount: promoted.length,
    totalNetValueUsdM: Math.round(records.reduce((sum, record) => sum + Number(record.valueUsdM || 0), 0)),
  };
}

async function postPayload(payload) {
  const headers = {
    "content-type": "application/json",
    "authorization": `Bearer ${ingestToken}`,
  };
  if (process.env.CF_ACCESS_CLIENT_ID && process.env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = process.env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = process.env.CF_ACCESS_CLIENT_SECRET;
  }
  const response = await fetch(ingestEndpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const body = await response.text();
  const isCloudflareAccess = /Cloudflare Access|cdn-cgi\/access|Log in to .*Cloudflare Workers/i.test(body);
  if (isCloudflareAccess) {
    throw new Error(`Ingest API returned ${response.status}: Cloudflare Access blocked the GitHub Action. Add CF_ACCESS_CLIENT_ID and CF_ACCESS_CLIENT_SECRET service-token secrets, or exclude /api/meed-ingest from Access.`);
  }
  if (!response.ok) {
    throw new Error(`Ingest API returned ${response.status}: ${body.slice(0, 1200)}`);
  }
  console.log(body);
}

async function fillFirstVisible(page, candidates, value, fieldName) {
  for (const candidate of candidates) {
    const locator = typeof candidate === "string" ? page.locator(candidate) : candidate(page);
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const input = locator.nth(index);
      const visible = await input.isVisible({ timeout: 1000 }).catch(() => false);
      const enabled = await input.isEnabled({ timeout: 1000 }).catch(() => false);
      if (!visible || !enabled) continue;
      await input.fill(value);
      const actual = await input.inputValue().catch(() => "");
      if (actual) {
        console.log(`Filled MEED ${fieldName} using candidate ${typeof candidate === "string" ? candidate : "label/xpath locator"}`);
        return true;
      }
    }
  }
  return false;
}

async function clickFirstVisible(page, candidates, actionName) {
  for (const candidate of candidates) {
    const locator = typeof candidate === "string" ? page.locator(candidate) : candidate(page);
    const count = await locator.count().catch(() => 0);
    for (let index = 0; index < count; index += 1) {
      const target = locator.nth(index);
      const visible = await target.isVisible({ timeout: 1000 }).catch(() => false);
      const enabled = await target.isEnabled({ timeout: 1000 }).catch(() => false);
      if (!visible || !enabled) continue;
      console.log(`Clicking ${actionName} using candidate ${typeof candidate === "string" ? candidate : "role/text locator"}`);
      await target.click();
      return true;
    }
  }
  return false;
}

async function isMeedLoginVisible(page) {
  const passwordVisible = await page.locator("input[type='password']").first().isVisible({ timeout: 1500 }).catch(() => false);
  const loginTitleVisible = await page.getByText(/log\s*in/i).first().isVisible({ timeout: 1500 }).catch(() => false);
  return passwordVisible && loginTitleVisible;
}

async function visibleText(page, patterns) {
  for (const pattern of patterns) {
    const value = await page.getByText(pattern).first().textContent({ timeout: 1000 }).catch(() => "");
    if (text(value)) return text(value);
  }
  return "";
}

async function loginAndDownload() {
  const { chromium } = await import("playwright");
  await mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  try {
    await page.goto(projectSearchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });

    if (await isMeedLoginVisible(page)) {
      const usernameSelector = process.env.MEED_USERNAME_SELECTOR || "";
      const passwordSelector = process.env.MEED_PASSWORD_SELECTOR || "";
      const loginSelector = process.env.MEED_LOGIN_BUTTON_SELECTOR || "";
      const usernameFilled = await fillFirstVisible(page, [
        ...(usernameSelector ? [usernameSelector] : []),
        "#UserName",
        "#Username",
        "#username",
        "#Email",
        "#email",
        "input[name='UserName']",
        "input[name='Username']",
        "input[name='username']",
        "input[name='Email']",
        "input[name='email']",
        "input[autocomplete='username']",
        "input[type='email']",
        "xpath=//label[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'username')]/following::input[1]",
        "xpath=//label[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'email')]/following::input[1]",
        "input[type='text']",
        (currentPage) => currentPage.getByLabel(/username|email|user name/i),
      ], process.env.MEED_USERNAME, "username");
      const passwordFilled = await fillFirstVisible(page, [
        ...(passwordSelector ? [passwordSelector] : []),
        "#Password",
        "#password",
        "input[name='Password']",
        "input[name='password']",
        "input[autocomplete='current-password']",
        "input[type='password']",
        "xpath=//label[contains(translate(normalize-space(.),'ABCDEFGHIJKLMNOPQRSTUVWXYZ','abcdefghijklmnopqrstuvwxyz'),'password')]/following::input[1]",
        (currentPage) => currentPage.getByLabel(/password/i),
      ], process.env.MEED_PASSWORD, "password");
      if (!usernameFilled || !passwordFilled) {
        throw new Error(`MEED login fields were visible but could not be filled. usernameFilled=${usernameFilled}, passwordFilled=${passwordFilled}`);
      }
      const clickedLogin = await clickFirstVisible(page, [
        ...(loginSelector ? [loginSelector] : []),
        "#LoginButton",
        "#loginButton",
        "#login",
        "button[type='submit']",
        "input[type='submit']",
        "button:has-text('Login')",
        "button:has-text('Log in')",
        "button:has-text('Sign in')",
        "input[value*='Login' i]",
        "input[value*='Log in' i]",
        "a:has-text('Login')",
        "a:has-text('Log in')",
        (currentPage) => currentPage.getByRole("button", { name: /log\s*in|login|sign\s*in/i }),
      ], "MEED login");
      if (!clickedLogin) throw new Error("MEED login button was not found.");
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 }).catch(() => undefined);
      await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => undefined);
      await page.goto(projectSearchUrl, { waitUntil: "networkidle", timeout: 90000 }).catch(async () => {
        await page.goto(projectSearchUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
      });
    } else {
      throw new Error("MEED login form was not detected; set MEED_USERNAME_SELECTOR / MEED_PASSWORD_SELECTOR / MEED_LOGIN_BUTTON_SELECTOR if the page changed.");
    }

    if (/login|signin|authorize/i.test(page.url()) || await isMeedLoginVisible(page)) {
      const loginError = await visibleText(page, [/invalid/i, /incorrect/i, /required/i, /not.*subscriber/i, /request access/i]);
      throw new Error(`MEED login did not complete. Current URL: ${page.url()}${loginError ? `; visible message: ${loginError}` : ""}`);
    }

    const downloadLocator = page
      .getByRole("button", { name: /^download to excel$/i })
      .or(page.getByRole("link", { name: /^download to excel$/i }))
      .or(page.locator("button, a, input[type='button'], input[type='submit']").filter({ hasText: /^Download to Excel$/i }))
      .first();
    const [download] = await Promise.all([
      page.waitForEvent("download", { timeout: 90000 }),
      downloadLocator.click(),
    ]);
    const suggested = download.suggestedFilename() || `meed-projects-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const filePath = join(artifactDir, suggested);
    await download.saveAs(filePath);
    return { filePath, browser };
  } catch (error) {
    await page.screenshot({ path: join(artifactDir, "meed-failure.png"), fullPage: true }).catch(() => undefined);
    await browser.close();
    throw error;
  }
}

async function main() {
  const runId = `MEED-GHA-${Date.now().toString(36).toUpperCase()}`;
  try {
    const { filePath, browser } = await loginAndDownload();
    const buffer = await (await import("node:fs/promises")).readFile(filePath);
    const entries = objectRows(parseWorkbook(buffer));
    const records = toRecords(entries);
    const promoted = selectPromoted(records);
    const payload = {
      runId,
      generatedAt: new Date().toISOString(),
      source: "MEED Projects GitHub Actions",
      searchUrl: projectSearchUrl,
      status: "completed",
      stats: statsFrom(records, promoted),
      records: promoted,
    };
    await writeFile(join(artifactDir, "meed-ingest-payload.json"), JSON.stringify(payload, null, 2));
    await postPayload(payload);
    await browser.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const payload = {
      runId,
      generatedAt: new Date().toISOString(),
      source: "MEED Projects GitHub Actions",
      searchUrl: projectSearchUrl,
      status: "failed",
      stats: { sourceRows: 0, promotedCount: 0 },
      records: [],
      errors: [message],
    };
    await mkdir(artifactDir, { recursive: true });
    await writeFile(join(artifactDir, "meed-ingest-failure.json"), JSON.stringify(payload, null, 2));
    await postPayload(payload).catch((postError) => {
      console.error(postError instanceof Error ? postError.message : String(postError));
    });
    console.error(message);
    process.exit(1);
  }
}

await main();
