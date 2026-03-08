import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function usePortalI18n(ns: string | string[] = "common") {
  const { t, i18n } = useTranslation(ns);

  const value = useMemo(() => {
    const language = i18n.resolvedLanguage || i18n.language || "en";
    const baseCode = language.split("-")[0];
    const isRTL = baseCode === "ar" || baseCode === "fa" || baseCode === "he";
    return {
      t,
      language,
      isRTL,
      dir: isRTL ? ("rtl" as const) : ("ltr" as const),
    };
  }, [i18n.language, i18n.resolvedLanguage, t]);

  return value;
}
