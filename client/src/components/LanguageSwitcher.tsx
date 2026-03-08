/**
 * Premium language switcher:
 * - Primary segmented toggle for EN/AR
 * - Optional "More" dropdown for additional tenant-enabled locales
 */
import { useMemo } from "react";
import { useLocale } from "@/hooks/useLocale";
import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isRtlDirection, overlayAlign } from "@/lib/rtl";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  ar: "العربية",
  fr: "Français",
  de: "Deutsch",
};

function localeShort(code: string): string {
  const base = code.split("-")[0].toUpperCase();
  return base.length <= 3 ? base : base.slice(0, 3);
}

export function LanguageSwitcher() {
  const { locale, enabledLocales, setLocale, loading } = useLocale();
  const { t, i18n } = useTranslation("common");
  const isRTL = isRtlDirection(i18n.dir());

  const primaryLocales = useMemo(
    () => ["en", "ar"].filter((code) => enabledLocales.includes(code)),
    [enabledLocales]
  );
  const extraLocales = useMemo(
    () => enabledLocales.filter((code) => !primaryLocales.includes(code)),
    [enabledLocales, primaryLocales]
  );

  if (loading || enabledLocales.length <= 1) return null;

  return (
    <div className="flex items-center gap-2">
      {/* <span className="text-muted-foreground text-sm hidden sm:inline" aria-hidden>
        {t("common.language")}
      </span> */}

      <div
        className="inline-flex items-center rounded-full border border-slate-300/90 dark:border-white/15 bg-white/80 dark:bg-[#13213a]/90 p-1 shadow-sm"
        role="group"
        aria-label={t("common.language")}
      >
        {primaryLocales.map((code) => {
          const active = locale === code;
          return (
            <button
              key={code}
              type="button"
              onClick={() => setLocale(code)}
              className={`h-8 min-w-[44px] rounded-full px-3 text-xs font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/60 ${
                active
                  ? "bg-[#FFD700] text-slate-900 shadow-sm"
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10"
              }`}
              aria-pressed={active}
              aria-label={LOCALE_LABELS[code] ?? code}
              title={LOCALE_LABELS[code] ?? code}
            >
              {localeShort(code)}
            </button>
          );
        })}

        {extraLocales.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="ms-1 h-8 rounded-full px-3 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/60"
                aria-label={t("common.more")}
              >
                {t("common.more")}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align={overlayAlign(isRTL)}
              sideOffset={8}
              className="min-w-[140px] max-w-[calc(100vw-1rem)]"
            >
              {extraLocales.map((code) => {
                const active = locale === code;
                return (
                  <DropdownMenuItem
                    key={code}
                    onClick={() => setLocale(code)}
                    className={`cursor-pointer text-sm ${active ? "bg-amber-50 dark:bg-amber-500/10 font-semibold" : ""}`}
                  >
                    {LOCALE_LABELS[code] ?? code}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
