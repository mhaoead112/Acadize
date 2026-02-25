/**
 * Injects hreflang and x-default link tags for public pages (SEO).
 * Use on public routes that have en/ar alternates.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

const PUBLIC_PATH_PREFIXES = ["/", "/home", "/about", "/programs", "/subjects", "/admissions", "/contact", "/pricing", "/privacy", "/terms", "/blog", "/portal", "/news", "/events", "/staff", "/help-center", "/community", "/docs", "/integrations", "/lms-structure"];
const LOCALES = ["en", "ar"];
const DEFAULT_LOCALE = "en";

function isPublicPath(pathname: string): boolean {
  if (pathname.startsWith("/student") || pathname.startsWith("/teacher") || pathname.startsWith("/admin") || pathname.startsWith("/parent") || pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/change-password") || pathname.startsWith("/demo")) {
    return false;
  }
  const base = pathname.replace(/^\/(en|ar)(\/|$)/, "$2") || "/";
  return PUBLIC_PATH_PREFIXES.some((p) => base === p || base.startsWith(p + "/"));
}

function getBasePath(pathname: string): string {
  const m = pathname.match(/^\/(en|ar)(\/.*|$)/);
  if (m) return m[2] || "/";
  return pathname || "/";
}

export function HreflangLinks() {
  const [location] = useLocation();
  const pathname = location || "/";

  useEffect(() => {
    if (typeof document === "undefined" || !isPublicPath(pathname)) return;

    const basePath = getBasePath(pathname);
    const origin = window.location.origin;
    const existing = document.head.querySelectorAll('link[rel="alternate"][hreflang]');
    existing.forEach((el) => el.remove());

    LOCALES.forEach((locale) => {
      const href = locale === DEFAULT_LOCALE ? `${origin}${basePath}` : `${origin}/${locale}${basePath === "/" ? "" : basePath}`;
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = locale;
      link.href = href;
      document.head.appendChild(link);
    });

    const defaultHref = `${origin}/${DEFAULT_LOCALE}${basePath === "/" ? "" : basePath}`;
    const xDefault = document.createElement("link");
    xDefault.rel = "alternate";
    xDefault.hreflang = "x-default";
    xDefault.href = defaultHref;
    document.head.appendChild(xDefault);

    return () => {
      document.head.querySelectorAll('link[rel="alternate"][hreflang]').forEach((el) => el.remove());
    };
  }, [pathname]);

  return null;
}
