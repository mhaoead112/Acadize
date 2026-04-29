import fs from "node:fs";
import path from "node:path";

const SRC_ROOT = path.resolve("src");
const ALLOWLIST_FILE = path.resolve("scripts", "portal-hardcoded-allowlist.json");
const WRITE_BASELINE = process.argv.includes("--write-baseline");

const targetFiles = [];

const componentsDir = path.join(SRC_ROOT, "components");
for (const name of ["StudentLayout.tsx", "TeacherLayout.tsx", "AdminLayout.tsx", "ParentLayout.tsx", "ProtectedRoute.tsx"]) {
  targetFiles.push(path.join(componentsDir, name));
}

const pagesDir = path.join(SRC_ROOT, "pages");
for (const file of fs.readdirSync(pagesDir)) {
  if (/^(student|teacher|admin|parent)-.*\.tsx$/.test(file)) {
    targetFiles.push(path.join(pagesDir, file));
  }
}

const attrPattern = /\b(?:placeholder|title|aria-label|label|alt)\s*=\s*["']([A-Za-z][^"']+)["']/g;
const jsxTextPattern = />\s*([A-Za-z][A-Za-z0-9 ,.'!?:()/-]{2,})\s*</g;

const skipText = new Set([
  "menu",
  "search",
  "close",
  "logout",
  "light_mode",
  "dark_mode",
  "chevron_left",
  "chevron_right",
]);

function normalizeText(value) {
  return value.replace(/\s+/g, " ").trim();
}

function collect(filePath) {
  const rel = path.relative(process.cwd(), filePath).replace(/\\/g, "/");
  const raw = fs.readFileSync(filePath, "utf8");
  const findings = [];

  let match;
  while ((match = attrPattern.exec(raw)) !== null) {
    const value = normalizeText(match[1]);
    if (!value || skipText.has(value)) continue;
    findings.push(`${rel}|attr|${value}`);
  }

  while ((match = jsxTextPattern.exec(raw)) !== null) {
    const value = normalizeText(match[1]);
    if (!value || skipText.has(value)) continue;
    // likely icon glyph/text content or numeric/stat fragments
    if (/^[A-Z_]+$/.test(value) || /^[0-9%.,:/ -]+$/.test(value)) continue;
    findings.push(`${rel}|text|${value}`);
  }

  return findings;
}

const allFindings = targetFiles
  .filter((p) => fs.existsSync(p))
  .flatMap((p) => collect(p))
  .sort();

if (WRITE_BASELINE) {
  fs.writeFileSync(ALLOWLIST_FILE, `${JSON.stringify(allFindings, null, 2)}\n`, "utf8");
  console.log(`Wrote baseline allowlist: ${path.relative(process.cwd(), ALLOWLIST_FILE)}`);
  process.exit(0);
}

let allowlist = [];
if (fs.existsSync(ALLOWLIST_FILE)) {
  allowlist = JSON.parse(fs.readFileSync(ALLOWLIST_FILE, "utf8").replace(/^\uFEFF/, ""));
}
const allowed = new Set(allowlist);
const unexpected = allFindings.filter((item) => !allowed.has(item));

if (unexpected.length > 0) {
  console.error("Found new hardcoded portal literals (not in allowlist):");
  unexpected.slice(0, 200).forEach((item) => console.error(`  - ${item}`));
  console.error("\nIf intentional, regenerate allowlist with:");
  console.error("  npm run i18n:check:literals:baseline");
  process.exit(1);
}

console.log("Portal hardcoded literal check passed.");
