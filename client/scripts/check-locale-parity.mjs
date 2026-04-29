import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve("public", "locales");
const EN_DIR = path.join(ROOT, "en");
const AR_DIR = path.join(ROOT, "ar");

function flatten(obj, prefix = "", out = new Set()) {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    if (prefix) out.add(prefix);
    return out;
  }
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    flatten(value, next, out);
  }
  return out;
}

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(raw);
}

const enFiles = fs.readdirSync(EN_DIR).filter((f) => f.endsWith(".json"));
let hasError = false;

for (const file of enFiles) {
  const enPath = path.join(EN_DIR, file);
  const arPath = path.join(AR_DIR, file);

  if (!fs.existsSync(arPath)) {
    console.error(`Missing Arabic namespace file: ${path.join("public/locales/ar", file)}`);
    hasError = true;
    continue;
  }

  const enObj = readJson(enPath);
  const arObj = readJson(arPath);
  const enKeys = flatten(enObj);
  const arKeys = flatten(arObj);

  const missing = [...enKeys].filter((k) => !arKeys.has(k));
  if (missing.length > 0) {
    hasError = true;
    console.error(`Missing ${missing.length} key(s) in ar/${file}:`);
    missing.slice(0, 50).forEach((k) => console.error(`  - ${k}`));
  }
}

if (hasError) {
  process.exit(1);
}

console.log("Locale parity check passed (en -> ar).");
