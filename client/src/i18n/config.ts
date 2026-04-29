/**
 * i18n config: react-i18next with lazy-loaded namespaces.
 * RTL: ar (and fa, he) set document dir and lang.
 */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import Backend from "i18next-http-backend";

const RTL_CODES = new Set(["ar", "fa", "he"]);
const STORAGE_KEY = "acadize_locale";
const DEFAULT_LANG = "en";

function applyDirAndLang(lng: string) {
  if (typeof document === "undefined") return;
  const code = lng.split("-")[0];
  const dir = RTL_CODES.has(code) ? "rtl" : "ltr";
  const lang = code;
  document.documentElement.setAttribute("dir", dir);
  document.documentElement.setAttribute("lang", lang);
}

const isDev = typeof import.meta !== "undefined" && import.meta.env?.DEV;

i18n
  .use(Backend)
  .use(initReactI18next)
  .init({
    fallbackLng: DEFAULT_LANG,
    defaultNS: "common",
    ns: ["common", "auth", "dashboard", "courses", "assignments", "landing", "teacher", "parent", "admin", "gamification"],
    load: "currentOnly",
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: STORAGE_KEY,
    },
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: true,
    },
    // Dev-only: surface missing translation keys in console
    ...(isDev && {
      saveMissing: true,
      missingKeyHandler: (lngs: string[], ns: string, key: string, fallback: string) => {
        console.warn(`[i18n missing] lng=${lngs?.join(",")} ns=${ns} key=${key} fallback=${fallback}`);
      },
    }),
  });

i18n.on("languageChanged", (lng) => {
  applyDirAndLang(lng);
  try {
    localStorage.setItem(STORAGE_KEY, lng);
  } catch (_) {}
});

// Set dir/lang on init (in case language was already loaded from cache)
const current = i18n.language || DEFAULT_LANG;
applyDirAndLang(current);

export default i18n;
export { STORAGE_KEY, RTL_CODES, DEFAULT_LANG, applyDirAndLang };
