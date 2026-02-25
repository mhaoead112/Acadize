/**
 * Locale from API (enabled list, default) and setLocale that syncs i18n + API.
 */
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { apiEndpoint } from "@/lib/config";

export interface LocaleInfo {
  locale: string;
  dir: "ltr" | "rtl";
  enabledLocales: string[];
  defaultLocale: string;
}

const DEFAULT_LOCALE_INFO: LocaleInfo = {
  locale: "en",
  dir: "ltr",
  enabledLocales: ["en"],
  defaultLocale: "en",
};

export function useLocale() {
  const { i18n } = useTranslation();
  const [info, setInfo] = useState<LocaleInfo>(DEFAULT_LOCALE_INFO);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchLocale = async () => {
      try {
        const res = await fetch(apiEndpoint("api/locale"), {
          credentials: "include",
          headers: { "Accept": "application/json" },
        });
        if (!res.ok) {
          setInfo(DEFAULT_LOCALE_INFO);
          return;
        }
        const data = await res.json();
        if (!cancelled) {
          const locale = data.locale ?? "en";
          setInfo({
            locale,
            dir: data.dir ?? "ltr",
            enabledLocales: Array.isArray(data.enabledLocales) ? data.enabledLocales : ["en"],
            defaultLocale: data.defaultLocale ?? "en",
          });
          if (locale !== i18n.language) {
            i18n.changeLanguage(locale);
          }
        }
      } catch (_) {
        if (!cancelled) setInfo(DEFAULT_LOCALE_INFO);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchLocale();
    return () => { cancelled = true; };
  }, [i18n]);

  const setLocale = useCallback(
    async (newLocale: string) => {
      if (!info.enabledLocales.includes(newLocale)) return;
      await i18n.changeLanguage(newLocale);
      setInfo((prev) => ({
        ...prev,
        locale: newLocale,
        dir: newLocale.startsWith("ar") || newLocale.startsWith("fa") || newLocale.startsWith("he") ? "rtl" : "ltr",
      }));
      try {
        const token = localStorage.getItem("token");
        if (token) {
          await fetch(apiEndpoint("profile/me"), {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ preferredLocale: newLocale }),
          });
        }
      } catch (_) {}
    },
    [info.enabledLocales, i18n]
  );

  return { ...info, setLocale, loading };
}
