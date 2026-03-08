import { apiEndpoint } from '@/lib/config';

export type SubscriptionAccessResult = 'has_access' | 'needs_activation' | 'indeterminate';

const SUBSCRIPTION_EXEMPT_PATHS = [
  '/activate',
  '/activate-free-trial',
  '/subscription-required',
  '/checkout-success',
  '/register-success',
  '/login',
  '/register',
] as const;

export function shouldSkipSubscriptionCheck(pathname: string, role?: string | null): boolean {
  if (role === 'admin') return true;
  return SUBSCRIPTION_EXEMPT_PATHS.some((path) => pathname.startsWith(path));
}

export async function checkSubscriptionAccess(token: string | null): Promise<SubscriptionAccessResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(apiEndpoint('/api/subscription/check-subscription'), {
    headers,
  });

  if (response.status === 402) return 'needs_activation';
  if (response.status === 401 || !response.ok) return 'indeterminate';

  const data = await response.json();
  return data.hasAccess || data.status === 'not_required' ? 'has_access' : 'needs_activation';
}
