import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { getAuthToken } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * Component that checks subscription status before rendering children
 * Redirects to activation page if subscription is required but not active
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      // Wait for auth to load
      if (authLoading) return;

      // Not authenticated - let ProtectedRoute handle it
      if (!isAuthenticated || !user) {
        setIsChecking(false);
        return;
      }

      // Skip check on activation/info pages
      const currentPath = window.location.pathname;
      const exemptPaths = ['/activate', '/subscription-required', '/activate-free-trial', '/checkout-success'];
      if (exemptPaths.some(path => currentPath.startsWith(path))) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      // Admins always have access
      if (user.role === 'admin') {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      try {
        const token = getAuthToken();
        const response = await fetch(apiEndpoint('/api/subscription/check-subscription'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        // Only hard-block on 402 (Payment Required) — that's the subscription gate
        // 401 means the auth middleware rejected the token; let the protected route handle it
        // 5xx means the subscription service is down; fail-open so users aren't locked out
        if (response.status === 402) {
          console.log(`Subscription check returned 402, redirecting to subscription-required...`);
          setLocation('/subscription-required');
          return;
        }

        if (response.status === 401 || !response.ok) {
          // Don't redirect — treat as access granted to avoid locking users out on transient errors
          console.warn(`Subscription check returned ${response.status}, skipping redirect`);
          setHasAccess(true);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          if (data.hasAccess || data.status === 'not_required') {
            setHasAccess(true);
          } else {
            setLocation('/subscription-required');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking subscription:', error);
        // Fail-open on network error so users aren't locked out by connectivity issues
        setHasAccess(true);
      } finally {
        setIsChecking(false);
      }
    };

    checkSubscription();
  }, [authLoading, isAuthenticated, user, setLocation]);

  if (authLoading || isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-navy-950">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  if (!hasAccess) {
    return null; // Will redirect
  }

  return <>{children}</>;
}
