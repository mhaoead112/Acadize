/**
 * Server-side email string bundles per locale.
 * Fallback: requested locale -> en.
 */
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_LOCALE = "en";

let cache: Record<string, Record<string, any>> = {};

function loadLocale(locale: string): Record<string, any> {
  if (cache[locale]) return cache[locale];
  try {
    const file = path.join(__dirname, `${locale}.json`);
    const raw = readFileSync(file, "utf-8");
    const data = JSON.parse(raw);
    cache[locale] = data;
    return data;
  } catch (_) {
    return locale === DEFAULT_LOCALE ? {} : loadLocale(DEFAULT_LOCALE);
  }
}

export function getEmailStrings(locale: string): Record<string, any> {
  const code = (locale || DEFAULT_LOCALE).split("-")[0];
  return loadLocale(code === "ar" ? "ar" : DEFAULT_LOCALE);
}
