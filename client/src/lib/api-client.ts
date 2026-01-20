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
export function setAuthData(token: string, user: any, refreshToken?: string) {
  localStorage.setItem('auth_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear authentication data
 */
export function clearAuthData() {
  localStorage.removeItem('auth_token');
  localStorage.removeItem('eduverse_token');
  localStorage.removeItem('refresh_token');
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

  // Automatically refresh token if needed (before making the request)
  if (requiresAuth && isTokenExpired()) {
    console.log('🔄 Token expired, attempting refresh...');
    const refreshed = await refreshTokenIfNeeded();
    if (!refreshed) {
      console.error('❌ Token refresh failed, redirecting to login');
      clearAuthData();
      if (!window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        !window.location.pathname.includes('/demo')) {
        window.location.href = '/login';
      }
      throw new Error('Session expired - Please log in again');
    }
    console.log('✅ Token refreshed successfully');
  }

  // Build headers
  const requestHeaders: any = {
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

  // Handle unauthorized responses (in case refresh failed or token is invalid)
  if (response.status === 401) {
    // Try to refresh one more time
    console.log('🔄 Got 401, attempting token refresh...');
    const refreshed = await refreshTokenIfNeeded();

    if (refreshed) {
      // Retry the original request with new token
      console.log('✅ Token refreshed, retrying request...');
      const newToken = getAuthToken();
      if (newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
      }

      const retryResponse = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
        credentials: 'include',
      });

      if (retryResponse.ok) {
        return retryResponse.json();
      }
    }

    // If refresh failed or retry failed, clear auth and redirect
    console.error('❌ Authentication failed, redirecting to login');
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
    // Consider token expired if it expires in less than 2 minutes (120s) to ensure background refresher (runs every 1m) catches it
    return Date.now() >= (expirationTime - 120000);
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
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      console.error('No refresh token found');
      return false;
    }

    const response = await fetch(apiEndpoint('/api/auth/refresh'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status);
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    const { token, user, refreshToken: newRefreshToken } = data;

    // Store new tokens
    setAuthData(token, user, newRefreshToken || refreshToken);
    console.log('✅ Token refreshed successfully');
    return true;
  } catch (error) {
    console.error('Error refreshing token:', error);
    clearAuthData();
    return false;
  }
}
