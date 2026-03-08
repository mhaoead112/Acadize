import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { getAuthToken } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { checkSubscriptionAccess, shouldSkipSubscriptionCheck } from '@/lib/subscription-access';
import { Loader2 } from 'lucide-react';

interface SubscriptionGuardProps {
  children: React.ReactNode;
}

/**
 * Component that checks subscription status before rendering children.
 * Redirects to activation page if subscription is required but not active.
 */
export function SubscriptionGuard({ children }: SubscriptionGuardProps) {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [isChecking, setIsChecking] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const checkSubscription = async () => {
      if (authLoading) return;

      // Not authenticated: let ProtectedRoute handle auth flow.
      if (!isAuthenticated || !user) {
        setIsChecking(false);
        return;
      }

      if (shouldSkipSubscriptionCheck(window.location.pathname, user.role)) {
        setHasAccess(true);
        setIsChecking(false);
        return;
      }

      try {
        const result = await checkSubscriptionAccess(getAuthToken());

        if (result === 'needs_activation') {
          logger.info('Subscription check returned 402, redirecting to activation');
          setLocation('/activate');
          return;
        }

        if (result === 'indeterminate') {
          // Fail open for transient errors to avoid locking users out.
          logger.warn('Subscription check returned non-blocking error, skipping redirect');
          setHasAccess(true);
          return;
        }

        setHasAccess(true);
      } catch (error) {
        logger.error('Error checking subscription:', error);
        // Fail-open on network errors.
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

  if (!hasAccess) return null;

  return <>{children}</>;
}
