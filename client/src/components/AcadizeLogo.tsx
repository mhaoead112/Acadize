import { useTheme } from "@/contexts/ThemeContext";

export type AcadizeLogoVariant = "full" | "icon" | "wordmark" | "stacked";

export interface AcadizeLogoProps {
  variant?: AcadizeLogoVariant;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showWordmark?: boolean;
  lazy?: boolean;
}

const LOGO_PATHS = {
  light: {
    full: "/acadize-logo-full.png",
    icon: "/acadize-logo-icon.png",
    wordmark: "/acadize-logo-wordmark.png",
    stacked: "/acadize-logo-stacked.png",
  },
  dark: {
    full: "/acadize-logo-full-dark.png",
    icon: "/acadize-logo-icon-dark.png",
    wordmark: "/acadize-logo-full-dark.png",
    stacked: "/acadize-logo-full-dark.png",
  },
} as const;

// Use "Acadize Logo 1.png" for full if acadize-logo-full.png is not present
const FULL_LOGO_FALLBACK = "/Acadize Logo 1.png";

// Larger sizes so the logo is more obvious
const SIZE_MAP = {
  sm: { width: 72, height: 72, wordmarkHeight: 44 },
  md: { width: 96, height: 96, wordmarkHeight: 56 },
  lg: { width: 120, height: 120, wordmarkHeight: 72 },
  xl: { width: 160, height: 160, wordmarkHeight: 88 },
} as const;

const FULL_LOGO_HEIGHTS = { sm: 52, md: 72, lg: 96, xl: 112 } as const;

export function AcadizeLogo({
  variant = "full",
  size = "md",
  className = "",
  showWordmark = true,
  lazy = false,
}: AcadizeLogoProps) {
  const { theme } = useTheme();
  const paths = LOGO_PATHS[theme];
  const dimensions = SIZE_MAP[size];

  if (variant === "full") {
    return (
      <div className={`flex items-center ${className}`}>
        <img
          src={paths.full}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallback && theme === "light") {
              target.dataset.fallback = "1";
              target.src = FULL_LOGO_FALLBACK;
            }
          }}
          alt="Acadize"
          className="object-contain object-left w-auto"
          style={{ height: FULL_LOGO_HEIGHTS[size] }}
          loading={lazy ? "lazy" : undefined}
        />
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <img
        src={paths.icon}
        alt="Acadize"
        width={dimensions.width}
        height={dimensions.height}
        className={`object-contain flex-shrink-0 ${className}`}
        loading={lazy ? "lazy" : undefined}
      />
    );
  }

  if (variant === "wordmark") {
    return (
      <img
        src={paths.wordmark}
        alt="Acadize"
        className={`object-contain object-left ${className}`}
        style={{ height: dimensions.wordmarkHeight }}
        loading={lazy ? "lazy" : undefined}
      />
    );
  }

  // stacked: icon above wordmark (build from same assets)
  if (variant === "stacked") {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <img
          src={paths.icon}
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          loading={lazy ? "lazy" : undefined}
        />
        {showWordmark && (
          <img
            src={paths.wordmark}
            alt="Acadize"
            className="object-contain"
            style={{ height: dimensions.wordmarkHeight }}
            loading={lazy ? "lazy" : undefined}
          />
        )}
      </div>
    );
  }

  return null;
}
