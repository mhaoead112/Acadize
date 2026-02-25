#!/usr/bin/env node
/**
 * Compare i18n keys between en and ar (or other locale).
 * Usage: node scripts/check-i18n-keys.mjs [locale]
 * Default locale: ar
 * Exits with 1 if any namespace is missing keys in the target locale.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const localesDir = path.join(root, 'client', 'public', 'locales');
const enDir = path.join(localesDir, 'en');
const targetLocale = process.argv[2] || 'ar';
const targetDir = path.join(localesDir, targetLocale);

if (!fs.existsSync(enDir)) {
  console.error('Missing client/public/locales/en');
  process.exit(1);
}
if (!fs.existsSync(targetDir)) {
  console.error('Missing client/public/locales/' + targetLocale);
  process.exit(1);
}

function allKeys(obj, prefix = '') {
  let keys = [];
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      keys = keys.concat(allKeys(v, key));
    } else {
      keys.push(key);
    }
  }
  return keys;
}

let hasMissing = false;
const namespaces = fs.readdirSync(enDir).filter((f) => f.endsWith('.json'));

for (const ns of namespaces) {
  const enPath = path.join(enDir, ns);
  const arPath = path.join(targetDir, ns);
  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const ar = fs.existsSync(arPath) ? JSON.parse(fs.readFileSync(arPath, 'utf8')) : {};
  const enKeys = new Set(allKeys(en));
  const arKeys = new Set(allKeys(ar));
  const missingInTarget = [...enKeys].filter((k) => !arKeys.has(k));
  const extraInTarget = [...arKeys].filter((k) => !enKeys.has(k));

  if (missingInTarget.length) {
    hasMissing = true;
    console.log(`\n${ns} (${targetLocale}): MISSING ${missingInTarget.length} keys:`);
    missingInTarget.forEach((k) => console.log('  -', k));
  }
  if (extraInTarget.length) {
    console.log(`\n${ns} (${targetLocale}): EXTRA ${extraInTarget.length} keys (not in en):`);
    extraInTarget.slice(0, 20).forEach((k) => console.log('  +', k));
    if (extraInTarget.length > 20) console.log('  ... and', extraInTarget.length - 20, 'more');
  }
}

if (hasMissing) {
  console.log('\n❌ Some keys are missing in', targetLocale);
  process.exit(1);
}
console.log('\n✅ All namespaces have matching keys for', targetLocale);
process.exit(0);
