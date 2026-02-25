export type AcadizeLogoVariant = "full" | "icon" | "wordmark" | "stacked";

export interface AcadizeLogoProps {
  variant?: AcadizeLogoVariant;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showWordmark?: boolean;
  lazy?: boolean;
}

const LOGO_PATHS = {
  full: "/acadize-logo-full.png",
  icon: "/acadize-logo-icon.png",
  wordmark: "/acadize-logo-wordmark.png",
  stacked: "/acadize-logo-stacked.png",
} as const;

// Use "Acadize Logo 1.png" for full if acadize-logo-full.png is not present
const FULL_LOGO_FALLBACK = "/Acadize Logo 1.png";

const SIZE_MAP = {
  sm: { width: 56, height: 56, wordmarkHeight: 36 },
  md: { width: 80, height: 80, wordmarkHeight: 48 },
  lg: { width: 104, height: 104, wordmarkHeight: 60 },
  xl: { width: 128, height: 128, wordmarkHeight: 72 },
} as const;

export function AcadizeLogo({
  variant = "full",
  size = "md",
  className = "",
  showWordmark = true,
  lazy = false,
}: AcadizeLogoProps) {
  const dimensions = SIZE_MAP[size];

  if (variant === "full") {
    return (
      <div className={`flex items-center ${className}`}>
        <img
          src={LOGO_PATHS.full}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.dataset.fallback) {
              target.dataset.fallback = "1";
              target.src = FULL_LOGO_FALLBACK;
            }
          }}
          alt="Acadize"
          className="object-contain object-left w-auto"
          style={{ height: size === 'sm' ? 48 : size === 'lg' ? 80 : size === 'xl' ? 96 : 64 }}
          loading={lazy ? "lazy" : undefined}
        />
      </div>
    );
  }

  if (variant === "icon") {
    return (
      <img
        src={LOGO_PATHS.icon}
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
        src={LOGO_PATHS.wordmark}
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
          src={LOGO_PATHS.icon}
          alt=""
          width={dimensions.width}
          height={dimensions.height}
          className="object-contain"
          loading={lazy ? "lazy" : undefined}
        />
        {showWordmark && (
          <img
            src={LOGO_PATHS.wordmark}
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
