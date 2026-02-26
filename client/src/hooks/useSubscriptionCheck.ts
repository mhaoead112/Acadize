import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from './useAuth';
import { apiEndpoint } from '@/lib/config';
import { getAuthToken } from '@/lib/api-client';

/**
 * Hook to check if user has active subscription and redirect if needed
 * Returns subscription status and loading state
 */
export function useSubscriptionCheck() {
    const { user, isAuthenticated } = useAuth();
    const [, setLocation] = useLocation();

    useEffect(() => {
        if (!isAuthenticated || !user) return;

        // Skip check for admins
        if (user.role === 'admin') return;

        // Skip check on activation/payment pages
        const currentPath = window.location.pathname;
        const exemptPaths = [
            '/activate',
            '/activate-free-trial',
            '/subscription-required',
            '/checkout-success',
            '/register-success',
            '/login',
            '/register'
        ];

        if (exemptPaths.some(path => currentPath.startsWith(path))) {
            return;
        }

        // Check subscription status
        const checkSubscription = async () => {
            try {
                const response = await fetch(apiEndpoint('/api/subscription/check-subscription'), {
                    headers: {
                        'Authorization': `Bearer ${getAuthToken()}`
                    }
                });

                if (response.status === 402) {
                    // No valid subscription - send to checkout to select plan and pay
                    console.log(`Subscription restricted (status: 402), redirecting to checkout...`);
                    setLocation('/activate');
                } else if (!response.ok) {
                    // Don't block on 401 or 5xx - let auth/other middleware handle it
                    console.warn(`Subscription check returned ${response.status}, not redirecting`);
                }
            } catch (error) {
                console.error('Error checking subscription:', error);
            }
        };

        checkSubscription();
    }, [isAuthenticated, user, setLocation]);
}
