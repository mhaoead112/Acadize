import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { apiEndpoint } from '@/lib/config';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
export interface BrandingConfig {
  name: string;
  tagline: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;   // hex e.g. "#6366f1"
  secondaryColor: string; // hex e.g. "#8b5cf6"
  contactEmail: string | null;
  contactPhone: string | null;
  subdomain: string;
  plan: string;
  features: {
    enableCourseDiscussions: boolean;
    enableParentPortal: boolean;
    [key: string]: boolean;
  };
}

const DEFAULT_BRANDING: BrandingConfig = {
  name: 'Acadize',
  tagline: 'The Modern Learning Management System',
  logoUrl: null,
  faviconUrl: null,
  primaryColor: '#6366f1',
  secondaryColor: '#8b5cf6',
  contactEmail: null,
  contactPhone: null,
  subdomain: 'default',
  plan: 'free',
  features: {
    enableCourseDiscussions: true,
    enableParentPortal: true,
  },
};

// ─────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────
interface BrandingContextType {
  branding: BrandingConfig;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const BrandingContext = createContext<BrandingContextType>({
  branding: DEFAULT_BRANDING,
  isLoading: true,
  refetch: async () => {},
});

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Convert hex color (#rrggbb) → "h s% l%" string for CSS variables */
function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Inject brand colors as CSS custom properties on :root */
function applyBrandingToDom(branding: BrandingConfig) {
  // ── IMPORTANT: Maintain static defaults for the main Acadize organization ──
  if (branding.subdomain === 'acadize' || branding.subdomain === 'default') {
    // We clear any previously set properties just in case, allowing 
    // the app to naturally fall back to the CSS variables in index.css
    const root = document.documentElement;
    root.style.removeProperty('--brand-primary-hex');
    root.style.removeProperty('--brand-secondary-hex');
    root.style.removeProperty('--brand-primary');
    root.style.removeProperty('--brand-secondary');
    
    // Only update the page metadata but keep the styling static
    document.title = `${branding.name}`;
    if (branding.faviconUrl) {
      let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = branding.faviconUrl;
    }
    return;
  }

  const root = document.documentElement;

  // Set raw hex vars (for direct color use)
  root.style.setProperty('--brand-primary-hex', branding.primaryColor);
  root.style.setProperty('--brand-secondary-hex', branding.secondaryColor);

  // Set HSL component vars (for Tailwind's hsl(var()) pattern)
  const primaryHsl = hexToHsl(branding.primaryColor);
  const secondaryHsl = hexToHsl(branding.secondaryColor);
  root.style.setProperty('--brand-primary', primaryHsl);
  root.style.setProperty('--brand-secondary', secondaryHsl);

  // Page title
  document.title = `${branding.name} — LMS`;

  // Favicon
  if (branding.faviconUrl) {
    let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = branding.faviconUrl;
  }
}

// ─────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────
export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<BrandingConfig>(DEFAULT_BRANDING);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBranding = async () => {
    try {
      const res = await fetch(apiEndpoint('/api/org/branding'));
      if (res.ok) {
        const data: BrandingConfig = await res.json();
        setBranding(data);
        applyBrandingToDom(data);
      } else {
        // Fallback: still apply defaults so DOM vars are set
        applyBrandingToDom(DEFAULT_BRANDING);
      }
    } catch {
      applyBrandingToDom(DEFAULT_BRANDING);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBranding();
  }, []);

  return (
    <BrandingContext.Provider value={{ branding, isLoading, refetch: fetchBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────
export function useBranding(): BrandingConfig {
  return useContext(BrandingContext).branding;
}

export function useBrandingContext() {
  return useContext(BrandingContext);
}
