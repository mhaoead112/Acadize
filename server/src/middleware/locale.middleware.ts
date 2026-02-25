/**
 * Locale middleware — resolves request locale from X-Locale, query, user preference, Accept-Language, tenant default.
 * Sets req.locale and req.dir (for RTL). Must run after tenant middleware (and optionally after auth for user preference).
 */

import { Request, Response, NextFunction } from "express";

const RTL_LOCALES = new Set(["ar", "fa", "he"]);
const DEFAULT_LOCALE = "en";

function parseAcceptLanguage(header: string | undefined): string[] {
  if (!header) return [];
  return header
    .split(",")
    .map((part) => {
      const [code] = part.trim().split(";");
      const lang = code?.trim().toLowerCase();
      if (!lang) return null;
      return lang.length > 2 ? lang.slice(0, 2) : lang;
    })
    .filter((code): code is string => !!code);
}

function resolveDir(locale: string): "ltr" | "rtl" {
  return RTL_LOCALES.has(locale) ? "rtl" : "ltr";
}

declare global {
  namespace Express {
    interface Request {
      locale?: string;
      dir?: "ltr" | "rtl";
    }
  }
}

/**
 * Resolve locale in order: X-Locale / query ?locale= / (user preferredLocale) / Accept-Language / tenant default / en.
 * Validates against tenant.enabledLocales when tenant is present.
 */
export const localeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  const tenant = req.tenant;
  const enabledLocales = tenant?.enabledLocales ?? [DEFAULT_LOCALE];
  const defaultLocale = tenant?.defaultLocale ?? DEFAULT_LOCALE;

  const headerLocale = (req.headers["x-locale"] as string)?.trim()?.toLowerCase();
  const queryLocale = (req.query.locale as string)?.trim()?.toLowerCase();
  const userLocale = (req.user as { preferredLocale?: string } | undefined)?.preferredLocale?.trim()?.toLowerCase();
  const acceptLangs = parseAcceptLanguage(req.headers["accept-language"]);

  let resolved = headerLocale || queryLocale || userLocale || null;
  if (!resolved && acceptLangs.length) {
    resolved = acceptLangs.find((lang) => enabledLocales.includes(lang)) ?? null;
  }
  if (!resolved) {
    resolved = enabledLocales.includes(defaultLocale) ? defaultLocale : enabledLocales[0] ?? DEFAULT_LOCALE;
  }
  if (!enabledLocales.includes(resolved)) {
    resolved = defaultLocale;
  }

  req.locale = resolved;
  req.dir = resolveDir(resolved);

  // So clients know the language context of the response (RFC 7231)
  _res.setHeader("Content-Language", resolved);

  // Dev-only: log locale resolution for debugging (sample when X-Locale is set)
  if (process.env.NODE_ENV !== "production" && headerLocale) {
    console.log("[locale]", { xLocale: headerLocale, resolved: req.locale, tenant: (req as any).tenant?.slug });
  }

  next();
};
