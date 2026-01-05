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
