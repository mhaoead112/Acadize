/**
 * Language switcher: shows tenant-enabled locales only.
 * Use in layouts (Student, Teacher, Admin, Parent, Navbar).
 */
import { useLocale } from "@/hooks/useLocale";
import { useTranslation } from "react-i18next";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
};

export function LanguageSwitcher() {
  const { locale, enabledLocales, setLocale, loading } = useLocale();
  const { t } = useTranslation("common");

  if (loading || enabledLocales.length <= 1) return null;

  return (
    <div className="flex items-center gap-1">
      <span className="text-muted-foreground text-sm me-1 hidden sm:inline" aria-hidden>
        {t("common.language")}:
      </span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value)}
        className="h-8 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        aria-label={t("common.language")}
      >
        {enabledLocales.map((code) => (
          <option key={code} value={code}>
            {LOCALE_LABELS[code] ?? code}
          </option>
        ))}
      </select>
    </div>
  );
}
