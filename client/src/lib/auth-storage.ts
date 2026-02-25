/**
 * Central auth localStorage keys and helpers.
 * Reads both acadize_* and legacy eduverse_* keys for backward compatibility.
 * Writes only acadize_* keys. Clears both on logout.
 */

export const AUTH_KEYS = {
  token: 'acadize_token',
  user: 'acadize_user',
  subdomain: 'acadize_subdomain',
} as const;

const LEGACY_KEYS = {
  token: 'eduverse_token',
  user: 'eduverse_user',
  subdomain: 'eduverse_subdomain',
} as const;

export function getStoredToken(): string | null {
  return localStorage.getItem(AUTH_KEYS.token) || localStorage.getItem(LEGACY_KEYS.token)
    || localStorage.getItem('auth_token');
}

export function getStoredUser(): string | null {
  return localStorage.getItem(AUTH_KEYS.user) || localStorage.getItem(LEGACY_KEYS.user)
    || localStorage.getItem('user');
}

export function getStoredSubdomain(): string | null {
  return localStorage.getItem(AUTH_KEYS.subdomain) || localStorage.getItem(LEGACY_KEYS.subdomain);
}

export function setStoredAuth(token: string, user: object, subdomain?: string) {
  localStorage.setItem(AUTH_KEYS.token, token);
  localStorage.setItem(AUTH_KEYS.user, JSON.stringify(user));
  if (subdomain !== undefined) {
    localStorage.setItem(AUTH_KEYS.subdomain, subdomain);
  }
}

export function setStoredUser(user: object) {
  localStorage.setItem(AUTH_KEYS.user, JSON.stringify(user));
}

export function clearStoredAuth() {
  localStorage.removeItem(AUTH_KEYS.token);
  localStorage.removeItem(AUTH_KEYS.user);
  localStorage.removeItem(AUTH_KEYS.subdomain);
  localStorage.removeItem(LEGACY_KEYS.token);
  localStorage.removeItem(LEGACY_KEYS.user);
  localStorage.removeItem(LEGACY_KEYS.subdomain);
  localStorage.removeItem('auth_token');
  localStorage.removeItem('user');
  localStorage.removeItem('refresh_token');
}
