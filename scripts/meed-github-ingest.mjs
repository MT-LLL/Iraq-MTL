import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { strFromU8, unzipSync } from "fflate";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const artifactDir = process.env.MEED_ARTIFACT_DIR || join(rootDir, "artifacts", "meed");
const projectSearchUrl = process.env.MEED_PROJECT_SEARCH_URL || "https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000013-4000014-4000016&ProjectFields=MEEDTitle-ProfileType-MEEDCountry,MEEDCountryRegion,mEEDCityTown-Industry,Sector,SubSector-MeedContractValue,ProjectValue,NetValue,CashSpent-MEEDStage-LastUpdatedOnString-MainContractAward-MainContractCompletion";
const defaultContactSearchUrl = "https://premium.meedprojects.com/Projects?recordType=Projects&Location=4000042-4000043-4000045&ProjectStage=77003&ProjectFields=MEEDTitle-ProfileType-MEEDCountry,MEEDCountryRegion,mEEDCityTown-Industry,Sector,SubSector-MeedContractValue,ProjectValue,NetValue,CashSpent-MEEDStage-LastUpdatedOnString-MainContractAward-MainContractCompletion-OldProjectId,NewProjectId,UltimateProjectId-ContactName,Contact_Job%20Title,Contact_Phone,CompanyName,Company%20Phone%20Number&companyrole=76501-76535-76505-76510-76521-76551&pageNumber=1&pageSize=100";
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

function worksheetPaths(zip) {
  return Object.keys(zip)
    .filter((key) => /^xl\/worksheets\/sheet\d+\.xml$/.test(key))
    .sort((a, b) => Number(a.match(/sheet(\d+)\.xml$/)?.[1] || 0) - Number(b.match(/sheet(\d+)\.xml$/)?.[1] || 0));
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

function parseWorkbook(buffer, { contactsOnly = false } = {}) {
  const zip = unzipSync(new Uint8Array(buffer));
  const sharedXml = zip["xl/sharedStrings.xml"] ? strFromU8(zip["xl/sharedStrings.xml"]) : "";
  const sharedStrings = parseSharedStrings(sharedXml);
  const paths = worksheetPaths(zip);
  if (!paths.length) throw new Error("No worksheet found in the downloaded workbook");

  const parsedSheets = paths.map((path) => {
    const sheetXml = strFromU8(zip[path]);
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
  });

  // MEED stores contact rows on a separate worksheet ("Projects with Roles").
  // Select the worksheet by its header instead of always parsing sheet1.xml.
  return parsedSheets.find((rows) => rows.some((row) => matchesHeaderRow(row, contactsOnly))) || parsedSheets[0];
}

function normalizeHeader(header) {
  return text(header).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function matchesHeaderRow(row, contactsOnly = false) {
  const normalized = row.map(normalizeHeader);
  const hasProject = normalized.some((cell) => /^project$|projectname|meedtitle|projecttitle/.test(cell));
  const hasCountry = normalized.some((cell) => /country|meedcountry/.test(cell));
  const hasContactFields = normalized.some((cell) => /contactname|contactjobtitle|contactphone|companyphonenumber|companyname/.test(cell));
  return contactsOnly
    ? (hasProject || normalized.some((cell) => /projectid|meedid|recordid/.test(cell))) && hasContactFields
    : hasProject && hasCountry;
}

function objectRows(rows, { contactsOnly = false } = {}) {
  const headerIndex = rows.findIndex((row) => matchesHeaderRow(row, contactsOnly));
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
  for (const pattern of patterns) {
    const found = keys.find((key) => pattern.test(normalizeHeader(key)));
    if (found) return text(entry[found]);
  }
  return "";
}

// Unlike pick(), this skips blank matching columns. MEED exports can contain
// NetValue columns that are empty for a row while other amount columns are populated.
function pickNonEmpty(entry, patterns) {
  const keys = Object.keys(entry);
  for (const pattern of patterns) {
    const found = keys.find((key) => pattern.test(normalizeHeader(key)) && text(entry[key]));
    if (found) return text(entry[found]);
  }
  return "";
}

function parseUsdM(value) {
  const raw = text(value);
  if (!raw || /^(?:n\/?a|none|null|-)$/i.test(raw)) return null;
  const normalized = raw.replace(/[,$]/g, "").replace(/\s+/g, " ").trim();
  const number = Number(normalized.match(/-?\d+(?:\.\d+)?/)?.[0] ?? NaN);
  if (!Number.isFinite(number)) return null;
  // D1 stores values in USD millions. Explicit suffixes are normalized to that unit.
  if (/(?:bn|b|billion)$/i.test(normalized)) return number * 1000;
  if (/\b(?:mn|m|million)\b/i.test(normalized)) return number;
  if (/\b(?:tn|trillion)\b/i.test(normalized)) return number * 1_000_000;
  if (/\b(?:thousand|k)\b/i.test(normalized)) return number / 1000;
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
  // MEED exports both Old ProjectId and New ProjectId. UltimateProjectId
  // points to the root project's New ProjectId, so translate it back to the
  // selected meedId before the ingest API performs parent/child roll-up.
  const idByNewProjectId = new Map();
  const idByOldProjectId = new Map();
  const idByAnyProjectId = new Map();

  for (const entry of entries) {
    const meedId = pick(entry, [/^id$/, /projectid|meedid|recordid/]);
    const oldProjectId = pick(entry, [/^oldprojectid$/]);
    const newProjectId = pick(entry, [/^newprojectid$/]);
    if (meedId) idByAnyProjectId.set(meedId, meedId);
    if (oldProjectId && meedId) {
      idByOldProjectId.set(oldProjectId, meedId);
      idByAnyProjectId.set(oldProjectId, meedId);
    }
    if (newProjectId && meedId) {
      idByNewProjectId.set(newProjectId, meedId);
      idByAnyProjectId.set(newProjectId, meedId);
    }
  }

  return entries.map((entry) => {
    const title = pick(entry, [/^project$/, /^projectname$/, /^meedtitle$/, /projecttitle/]);
    const country = pick(entry, [/^country$/, /^meedcountry$/]);
    const city = pick(entry, [/city|town|meedcitytown/]);
    const industry = pick(entry, [/^industry$/, /^sector$/, /^subsector$/]);
    const sector = pick(entry, [/^sector$/]);
    const subSector = pick(entry, [/^subsector$/]);
    const stage = pick(entry, [/stage|statusprogress|status/]);
    const netValueUsdM = parseUsdM(pickNonEmpty(entry, [/netprojectvalue/, /netvalue/]));
    // MEED's current export labels the budget as "Estimated Budget ($m)"
    // and the net project amount as "Net Project Value ($m)". Keep these
    // distinct: a broad /projectvalue/ match would misclassify net value as budget.
    const projectValueUsdM = parseUsdM(pickNonEmpty(entry, [/estimatedbudget/, /^projectvalue$/]));
    const contractValueUsdM = parseUsdM(pickNonEmpty(entry, [/meedcontractvalue/, /contractvalue/, /totalvalue/]));
    // Opportunity amount is NetValue first, then ProjectValue. Contract value is
    // kept separate and must never silently masquerade as NetValue.
    const valueUsdM = netValueUsdM ?? projectValueUsdM;
    const updatedOn = parseDate(pick(entry, [/lastupdated|updatedon|updated/]));
    const awardDate = parseDate(pick(entry, [/maincontractaward|award/]));
    const completionDate = parseDate(pick(entry, [/maincontractcompletion|completion/]));
    // Preserve role/contact fields only when explicitly present in the MEED export.
    const contactRole = pick(entry, [/^(projectrole|stakeholderrole|contactrole|role)$/]);
    const contactCompany = pick(entry, [/^(ownercompany|companyname|stakeholdercompany|clientcompany|organization|organisation|company)$/]);
    const contactName = pick(entry, [/^(contactname|personname|contactperson|fullname)$/]);
    // The MEED export uses "Contact_Job Title" as well as variants such as
    // "Contact Job Title", "Contact Title", and "Job Title".
    const contactTitle = pick(entry, [/^contactjobtitle$/, /^contacttitle$/, /^jobtitle$/, /^contactposition$/, /^position$/]);
    const contactEmail = pick(entry, [/contactemail/, /^email$/, /emailaddress/]);
    const contactPhone = pick(entry, [/^contactphone$/, /^contacttelephone$/, /^contactmobile$/, /^mobile$/, /^phone$/, /^telephone$/]);
    // Keep the organisation's phone separate from the named contact's phone.
    const companyPhone = pick(entry, [/^companyphonenumber$/, /^companyphone$/, /^companytelephone$/, /^officephone$/, /^organizationphonenumber$/, /^organisationphonenumber$/]);
    const contacts = [contactRole, contactCompany, contactName, contactTitle, contactEmail, contactPhone, companyPhone].some(Boolean)
      ? [{ role: contactRole, company: contactCompany, name: contactName, title: contactTitle, email: contactEmail, phone: contactPhone, companyPhone, source: "MEED Projects with Roles" }]
      : [];
    const meedId = pick(entry, [/^id$/, /projectid|meedid|recordid/]) || title.replace(/\W+/g, "-").slice(0, 60);
    const oldProjectId = pick(entry, [/^oldprojectid$/]);
    const newProjectId = pick(entry, [/^newprojectid$/]);
    const ultimateProjectId = pick(entry, [/^ultimateprojectid$/]);
    const explicitParentId = pick(entry, [/parentprojectid/, /parentmeedid/, /^parentid$/]);
    const parentReference = explicitParentId || ultimateProjectId;
    const isSelfReference = [meedId, oldProjectId, newProjectId].filter(Boolean).includes(parentReference);
    const parentMeedId = !parentReference || isSelfReference
      ? ""
      : idByNewProjectId.get(parentReference) || idByOldProjectId.get(parentReference) || idByAnyProjectId.get(parentReference) || parentReference;

    return {
      meedId,
      parentMeedId,
      sourceProjectIds: [...new Set([meedId, oldProjectId, newProjectId].filter(Boolean))],
      title,
      country,
      city,
      industry,
      sector,
      subSector,
      stage,
      valueUsdM,
      netValueUsdM,
      projectValueUsdM,
      contractValueUsdM,
      amountSource: netValueUsdM !== null ? "NetValue" : projectValueUsdM !== null ? "ProjectValue" : "unavailable",
      updatedOn,
      awardDate,
      completionDate,
      contacts,
      sourceUrl: projectSearchUrl,
    };
  }).filter((record) => record.title && isTargetCountry(record.country));
}

function mergeContactExport(records, entries) {
  const byId = new Map();
  for (const record of records) {
    for (const id of [...(record.sourceProjectIds || []), record.meedId, record.parentMeedId].filter(Boolean)) {
      const key = String(id).trim().toLowerCase();
      if (!byId.has(key)) byId.set(key, []);
      byId.get(key).push(record);
    }
  }
  let matchedRows = 0;
  let contactRows = 0;
  for (const entry of entries) {
    const ids = Object.entries(entry).filter(([key, value]) => /projectid|meedid|recordid|projectnumber/i.test(normalizeHeader(key)) && text(value)).map(([, value]) => text(value));
    const name = pick(entry, [/^(contactname|personname|contactperson|fullname)$/]);
    const title = pick(entry, [/^contactjobtitle$/, /^contacttitle$/, /^jobtitle$/, /^contactposition$/, /^position$/]);
    const phone = pick(entry, [/^contactphone$/, /^contacttelephone$/, /^contactmobile$/, /^mobile$/, /^phone$/, /^telephone$/]);
    const company = pick(entry, [/^(ownercompany|companyname|stakeholdercompany|clientcompany|organization|organisation|company)$/]);
    const companyPhone = pick(entry, [/^companyphonenumber$/, /^companyphone$/, /^companytelephone$/, /^officephone$/, /^organizationphonenumber$/, /^organisationphonenumber$/]);
    const role = pick(entry, [/^(projectrole|stakeholderrole|contactrole|role)$/]);
    const email = pick(entry, [/contactemail/, /^email$/, /emailaddress/]);
    if (![name, title, phone, company, companyPhone, role, email].some(Boolean)) continue;
    const contact = { role, company, name, title, phone, companyPhone, email, source: "MEED Projects with Roles" };
    let matched = [];
    for (const id of ids) matched = matched.concat(byId.get(id.trim().toLowerCase()) || []);
    if (!matched.length) {
      for (const [key, value] of Object.entries(entry)) {
        if (/projectid|meedid|recordid|projectnumber/i.test(normalizeHeader(key)) && text(value)) matched = matched.concat(byId.get(text(value).toLowerCase()) || []);
      }
    }
    const unique = [...new Set(matched)];
    if (!unique.length) continue;
    matchedRows++;
    for (const record of unique) {
      const contacts = record.contacts || (record.contacts = []);
      const keyOf = (item) => [item.role, item.company, item.name, item.title, item.email, item.phone, item.companyPhone].map((value) => text(value).toLowerCase()).join("|");
      if (!contacts.some((item) => keyOf(item) === keyOf(contact))) {
        contacts.push(contact);
        contactRows++;
      }
    }
  }
  return { matchedRows, contactRows };
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
    totalNetValueUsdM: Math.round(records.reduce((sum, record) => sum + Number(record.netValueUsdM || 0), 0)),
    totalProjectValueUsdM: Math.round(records.reduce((sum, record) => sum + Number(record.projectValueUsdM || 0), 0)),
    totalContractValueUsdM: Math.round(records.reduce((sum, record) => sum + Number(record.contractValueUsdM || 0), 0)),
    amountCoverage: {
      netValue: records.filter((record) => record.netValueUsdM !== null).length,
      projectValue: records.filter((record) => record.projectValueUsdM !== null).length,
      contractValue: records.filter((record) => record.contractValueUsdM !== null).length,
      unavailable: records.filter((record) => record.valueUsdM === null).length,
    },
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

async function loginAndDownload(targetUrl = projectSearchUrl, artifactPrefix = "meed-projects") {
  const { chromium } = await import("playwright");
  await mkdir(artifactDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  try {
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 90000 });

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
      await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 90000 }).catch(async () => {
        await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 90000 });
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
    const suggested = download.suggestedFilename() || `${artifactPrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`;
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
    const { filePath, browser } = await loginAndDownload(projectSearchUrl, "meed-projects");
    const buffer = await (await import("node:fs/promises")).readFile(filePath);
    const entries = objectRows(parseWorkbook(buffer));
    const records = toRecords(entries);
    let contactStats = { enabled: false, sourceRows: 0, matchedRows: 0, contactRowsAdded: 0, warning: "" };
    const contactSearchUrl = text(process.env.MEED_CONTACT_SEARCH_URL, defaultContactSearchUrl);
    if (contactSearchUrl) {
      let contactBrowser;
      try {
        const contactExport = await loginAndDownload(contactSearchUrl, "meed-projects-with-roles");
        contactBrowser = contactExport.browser;
        const contactBuffer = await (await import("node:fs/promises")).readFile(contactExport.filePath);
        const contactEntries = objectRows(parseWorkbook(contactBuffer, { contactsOnly: true }), { contactsOnly: true });
        const merged = mergeContactExport(records, contactEntries);
        contactStats = { enabled: true, sourceRows: contactEntries.length, matchedRows: merged.matchedRows, contactRowsAdded: merged.contactRows };
      } catch (error) {
        contactStats = { enabled: true, sourceRows: 0, matchedRows: 0, contactRowsAdded: 0, warning: error instanceof Error ? error.message : String(error) };
        console.error(`MEED contact export failed; project ingest will continue without new contact data: ${contactStats.warning}`);
      } finally {
        // Always close the second Chromium instance, including when workbook
        // parsing or contact matching throws. Otherwise its child processes can
        // keep Node alive until the GitHub Actions job times out.
        await contactBrowser?.close().catch((error) => {
          console.warn(`Could not close MEED contact browser cleanly: ${error instanceof Error ? error.message : String(error)}`);
        });
      }
    } else {
      contactStats.warning = "MEED_CONTACT_SEARCH_URL is not configured; project-list export does not contain contact columns.";
      console.warn(contactStats.warning);
    }
    const promoted = selectPromoted(records);
    const payload = {
      runId,
      generatedAt: new Date().toISOString(),
      source: "MEED Projects GitHub Actions",
      searchUrl: projectSearchUrl,
      contactSearchUrl: contactSearchUrl || null,
      status: "completed",
      stats: { ...statsFrom(records, promoted), contacts: contactStats },
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
