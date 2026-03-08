/**
 * API Client with JWT token management.
 */

import type { User } from '@shared/schema';
import { apiEndpoint } from '@/lib/config';
import { logger } from '@/lib/logger';
import {
  getStoredToken,
  getStoredUser as getStoredUserRaw,
  setStoredAuth,
  clearStoredAuth,
} from '@/lib/auth-storage';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

type StoredUser = Partial<User> & Record<string, unknown>;

/**
 * Get the stored JWT token (reads acadize_token then legacy keys).
 */
export function getAuthToken(): string | null {
  return getStoredToken();
}

/**
 * Get the stored user data (reads acadize_user then legacy keys).
 */
export function getStoredUser(): StoredUser | null {
  const userStr = getStoredUserRaw();
  if (!userStr) return null;

  try {
    return JSON.parse(userStr) as StoredUser;
  } catch {
    return null;
  }
}

/**
 * Store authentication data (writes acadize_* keys).
 */
export function setAuthData(token: string, user: StoredUser, refreshToken?: string) {
  setStoredAuth(token, user);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear authentication data (removes acadize_* and legacy keys).
 */
export function clearAuthData() {
  clearStoredAuth();
}

/**
 * Check if user is authenticated.
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Enhanced fetch wrapper with automatic JWT token injection.
 */
export async function apiRequest<T = unknown>(
  url: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  if (requiresAuth && isTokenExpired()) {
    logger.info('Token expired, attempting refresh...');
    const refreshed = await refreshTokenIfNeeded();
    if (!refreshed) {
      logger.error('Token refresh failed, redirecting to login');
      clearAuthData();
      if (
        !window.location.pathname.includes('/login') &&
        !window.location.pathname.includes('/register') &&
        !window.location.pathname.includes('/demo')
      ) {
        window.location.href = '/login';
      }
      throw new Error('Session expired - Please log in again');
    }
    logger.info('Token refreshed successfully');
  }

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  const locale = typeof localStorage !== 'undefined' ? localStorage.getItem('acadize_locale') : null;
  if (locale) requestHeaders['X-Locale'] = locale;

  if (requiresAuth) {
    const token = getAuthToken();
    if (token) {
      requestHeaders.Authorization = `Bearer ${token}`;
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    headers: requestHeaders,
    credentials: 'include',
  });

  if (response.status === 401) {
    logger.info('Received 401, attempting token refresh...');
    const refreshed = await refreshTokenIfNeeded();

    if (refreshed) {
      logger.info('Token refreshed, retrying request...');
      const newToken = getAuthToken();
      if (newToken) {
        requestHeaders.Authorization = `Bearer ${newToken}`;
      }

      const retryResponse = await fetch(url, {
        ...restOptions,
        headers: requestHeaders,
        credentials: 'include',
      });

      if (retryResponse.ok) {
        return retryResponse.json() as Promise<T>;
      }
    }

    logger.error('Authentication failed, redirecting to login');
    clearAuthData();

    if (
      !window.location.pathname.includes('/login') &&
      !window.location.pathname.includes('/register') &&
      !window.location.pathname.includes('/demo')
    ) {
      window.location.href = '/login';
    }

    throw new Error('Unauthorized - Please log in again');
  }

  if (!response.ok) {
    const errorData = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Convenience methods for different HTTP methods.
 */
export const api = {
  get: <T = unknown>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'GET' }),

  post: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    }),

  put: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    }),

  patch: <T = unknown>(url: string, data?: unknown, options?: RequestOptions) =>
    apiRequest<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    }),

  delete: <T = unknown>(url: string, options?: RequestOptions) =>
    apiRequest<T>(url, { ...options, method: 'DELETE' }),
};

/**
 * Role-based access checking.
 */
export function hasRole(requiredRole: string | string[]): boolean {
  const user = getStoredUser();
  const role = user?.role;
  if (!role || typeof role !== 'string') return false;

  if (Array.isArray(requiredRole)) {
    return requiredRole.includes(role);
  }

  return role === requiredRole;
}

/**
 * Check if token is expired (basic check - assumes JWT structure).
 */
export function isTokenExpired(): boolean {
  const token = getAuthToken();
  if (!token) return true;

  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    const expirationTime = (payload.exp ?? 0) * 1000;
    return Date.now() >= expirationTime - 120000;
  } catch {
    return true;
  }
}

/**
 * Refresh token if needed.
 */
export async function refreshTokenIfNeeded(): Promise<boolean> {
  if (!isTokenExpired()) {
    return true;
  }

  try {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      logger.error('No refresh token found');
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
      logger.error('Token refresh failed:', response.status);
      throw new Error('Token refresh failed');
    }

    const data = (await response.json()) as {
      token: string;
      user: StoredUser;
      refreshToken?: string;
    };

    const { token, user, refreshToken: newRefreshToken } = data;
    setAuthData(token, user, newRefreshToken || refreshToken);
    logger.info('Token refreshed successfully');
    return true;
  } catch (error) {
    logger.error('Error refreshing token:', error);
    clearAuthData();
    return false;
  }
}
