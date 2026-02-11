// API Configuration
// Uses environment variables with production fallback for Vercel deployments

// More robust production detection - check at runtime
const getIsProduction = () => {
  if (import.meta.env.VITE_API_URL) return true; // Explicit env var means production
  if (import.meta.env.PROD) return true;
  if (import.meta.env.MODE === 'production') return true;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') return true;
  return false;
};

const isProduction = getIsProduction();
const productionAPI = 'https://eduverse-initial.onrender.com';
const productionWS = 'wss://eduverse-initial.onrender.com';

export const API_URL = import.meta.env.VITE_API_URL || (isProduction ? productionAPI : 'http://localhost:3001');
export const WS_URL = import.meta.env.VITE_WS_URL || (isProduction ? productionWS : 'ws://localhost:3001');

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
 *   - subdomain.eduverse.io → subdomain
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

  // Handle production domains (e.g., acme.eduverse.io)
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

      // Don't overwrite if already explicitly set
      if (!headers.has('X-Tenant-Subdomain')) {
        headers.set('X-Tenant-Subdomain', subdomain);
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
