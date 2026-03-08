import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from './useAuth';
import { getAuthToken } from '@/lib/api-client';
import { logger } from '@/lib/logger';
import { checkSubscriptionAccess, shouldSkipSubscriptionCheck } from '@/lib/subscription-access';

/**
 * Hook to check if user has active subscription and redirect if needed.
 */
export function useSubscriptionCheck() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    if (shouldSkipSubscriptionCheck(window.location.pathname, user.role)) return;

    const runCheck = async () => {
      try {
        const result = await checkSubscriptionAccess(getAuthToken());
        if (result === 'needs_activation') {
          logger.info('Subscription restricted, redirecting to activation');
          setLocation('/activate');
        }
      } catch (error) {
        logger.error('Error checking subscription:', error);
      }
    };

    runCheck();
  }, [isAuthenticated, user, setLocation]);
}
