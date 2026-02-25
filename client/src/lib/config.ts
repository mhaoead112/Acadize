// API Configuration
// Production URLs MUST come from environment variables (VITE_API_URL, VITE_WS_URL).
// No hardcoded fallback URLs — prevents silent misconfiguration in deployments.

// More robust production detection - check at runtime
const getIsProduction = () => {
  if (import.meta.env.VITE_API_URL) return true; // Explicit env var means production
  if (import.meta.env.PROD) return true;
  if (import.meta.env.MODE === 'production') return true;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') return true;
  return false;
};

const isProduction = getIsProduction();

// In production, URLs MUST be set via env vars. In dev, fall back to localhost.
if (isProduction && !import.meta.env.VITE_API_URL) {
  console.error('❌ FATAL: VITE_API_URL environment variable is required in production builds.');
}

let apiUrl = import.meta.env.VITE_API_URL || (isProduction ? '' : 'http://localhost:3001');
let wsUrl = import.meta.env.VITE_WS_URL || (isProduction ? '' : 'ws://localhost:3001');

// Development helper: If accessed via LAN IP on a phone (e.g. 192.168.x.x), 
// automatically swap 'localhost' in the env var to the actual device IP.
if (!isProduction && typeof window !== 'undefined') {
  const host = window.location.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1') {
    apiUrl = apiUrl.replace('localhost', host).replace('127.0.0.1', host);
    wsUrl = wsUrl.replace('localhost', host).replace('127.0.0.1', host);
  }
}

export const API_URL = apiUrl;
export const WS_URL = wsUrl;

// Debug log to verify production detection
if (typeof window !== 'undefined') {
  console.log('Environment:', { isProduction, API_URL, WS_URL, mode: import.meta.env.MODE, prod: import.meta.env.PROD });
}

// Helper function to build API endpoints
export const apiEndpoint = (path: string): string => {
  // Remove leading slash if present to avoid double slashes
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
};

// Helper function to build full URLs for resources
export const assetUrl = (path: string): string => {
  if (!path) return '';
  // If it's already a full URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Remove leading slash if present
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${API_URL}/${cleanPath}`;
};

// ============================================
// Multi-tenant subdomain detection
// ============================================

/**
 * Extract subdomain from the current hostname
 * Supports:
 *   - subdomain.lvh.me:port → subdomain
 *   - subdomain.localhost:port → subdomain
 *   - subdomain.acadize.com → subdomain
 *   - localhost:port → 'default'
 */
export const getSubdomain = (): string => {
  if (typeof window === 'undefined') return 'default';

  const hostname = window.location.hostname;

  // localhost without subdomain
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'default';
  }

  // Handle lvh.me (e.g., acme.lvh.me)
  if (hostname.endsWith('.lvh.me')) {
    const subdomain = hostname.replace('.lvh.me', '');
    return subdomain || 'default';
  }

  // Handle subdomain.localhost (e.g., acme.localhost)
  if (hostname.endsWith('.localhost')) {
    const subdomain = hostname.replace('.localhost', '');
    return subdomain || 'default';
  }

  // Handle production domains (e.g., acme.acadize.com)
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    // First part is the subdomain
    return parts[0];
  }

  return 'default';
};

/**
 * Get headers for tenant-aware API requests
 * Automatically includes X-Tenant-Subdomain header
 */
export const getTenantHeaders = (additionalHeaders?: Record<string, string>): Record<string, string> => {
  const subdomain = getSubdomain();
  return {
    'Content-Type': 'application/json',
    'X-Tenant-Subdomain': subdomain,
    ...additionalHeaders,
  };
};

/**
 * Tenant-aware fetch wrapper
 * Automatically adds X-Tenant-Subdomain header to all requests
 * Use this instead of fetch() for all API calls
 */
export const tenantFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const subdomain = getSubdomain();
  const headers = new Headers(options.headers);

  // Always set the tenant subdomain header
  headers.set('X-Tenant-Subdomain', subdomain);

  // Ensure Content-Type is set for JSON requests
  if (!headers.has('Content-Type') && (options.method === 'POST' || options.method === 'PUT' || options.method === 'PATCH')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'include',
  });
};

// Current tenant subdomain (cached)
export const currentSubdomain = getSubdomain();

// Log current tenant
if (typeof window !== 'undefined') {
  console.log('🏢 Tenant:', currentSubdomain);
}

// ============================================
// Global fetch interceptor for tenant headers
// Automatically injects X-Tenant-Subdomain for all API calls
// ============================================
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : (input as Request).url;

    // Only inject header for our API calls (not external requests)
    const isApiCall = url.includes('/api/') || url.startsWith(API_URL);

    if (isApiCall) {
      const subdomain = getSubdomain();
      const headers = new Headers(init?.headers);

      if (!headers.has('X-Tenant-Subdomain')) {
        headers.set('X-Tenant-Subdomain', subdomain);
      }

      // i18n: send current locale so backend returns translated content
      if (!headers.has('X-Locale')) {
        const locale = typeof localStorage !== 'undefined' ? localStorage.getItem('acadize_locale') : null;
        if (locale) headers.set('X-Locale', locale);
      }

      return originalFetch(input, {
        ...init,
        headers,
      });
    }

    return originalFetch(input, init);
  };

  console.log('🔒 Global tenant fetch interceptor installed');
}
