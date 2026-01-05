/**
 * API Client with JWT Token Management
 * Automatically adds authentication headers to API requests
 */

import { apiEndpoint } from '@/lib/config';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Get the stored JWT token
 */
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token') || localStorage.getItem('eduverse_token');
}

/**
 * Get the stored user data
 */
export function getStoredUser() {
  const userStr = localStorage.getItem('user') || localStorage.getItem('eduverse_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

/**
 * Store authentication data
 */
export function setAuthData(token: string, user: any) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

/**
 * Clear authentication data
 */
export function clearAuthData() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('eduverse_token');
  localStorage.removeItem('user');
  localStorage.removeItem('eduverse_user');
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Enhanced fetch wrapper with automatic JWT token injection
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  // Build headers
  const requestHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    ...headers,
  };

  // Add JWT token if required and available
  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    }
  }

  // Make the request
  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include', // Include cookies for session management
  });

  // Handle unauthorized responses
  if (response.status === 401) {
    // Clear auth data on unauthorized
    clearAuthData();
    
    // Redirect to login if not already there
    if (!window.location.pathname.includes('/login') && 
        !window.location.pathname.includes('/register') &&
        !window.location.pathname.includes('/demo')) {
      window.location.href = '/login';
    }
    
    throw new Error('Unauthorized - Please log in again');
  }

  // Handle other errors
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  // Return JSON response
  return response.json();
}

/**
 * Convenience methods for different HTTP methods
 */
export const api = {
  get: <T = any>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),

  post: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = any>(url: string, data?: any, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = any>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Role-based access checking
 */
export function hasRole(requiredRole: string | string[]): boolean {
  const user = getStoredUser();
  if (!user || !user.role) return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(user.role);
  }

  return user.role === requiredRole;
}

/**
 * Check if token is expired (basic check - assumes JWT structure)
 */
export function isTokenExpired(): boolean {
  const token = getAuthToken();
  if (!token) return true;

  try {
    // Decode JWT payload (basic check, not cryptographic verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const expirationTime = payload.exp * 1000; // Convert to milliseconds
    return Date.now() >= expirationTime;
  } catch {
    // If we can't decode, assume it's invalid
    return true;
  }
}

/**
 * Refresh token if needed
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  if (!isTokenExpired()) {
    return true; // Token is still valid
  }

  try {
    const response = await fetch(apiEndpoint('/api/auth/refresh'), {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const { token, user } = await response.json();
    setAuthData(token, user);
    return true;
  } catch {
    clearAuthData();
    return false;
  }
}
