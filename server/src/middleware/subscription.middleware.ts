/**
 * Subscription Access Middleware
 * 
 * Checks if a user has an active subscription before allowing access
 * to protected platform features. Admins always bypass this check.
 * 
 * If the organization doesn't have user-level subscriptions enabled,
 * all users pass through automatically.
 */

import { Request, Response, NextFunction } from 'express';
import { checkUserAccess } from '../services/subscription.service.js';

/**
 * Middleware that gates access based on subscription status.
 * Place this AFTER authentication middleware on routes that
 * should require an active subscription.
 */
export async function requireSubscription(req: Request, res: Response, next: NextFunction) {
    try {
        const user = (req as any).user;

        // If no authenticated user, let auth middleware handle it
        if (!user?.id) {
            return next();
        }

        // Admins always have access
        if (user.role === 'admin') {
            return next();
        }

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return next();
        }

        const access = await checkUserAccess(user.id, organizationId);

        // If subscriptions aren't required for this org, pass through
        if (access.status === 'not_required') {
            return next();
        }

        if (access.hasAccess) {
            // Attach subscription info to request for downstream use
            (req as any).subscription = access;
            return next();
        }

        // Access denied — return 402 Payment Required
        return res.status(402).json({
            message: 'Subscription required to access this feature.',
            subscriptionStatus: access.status,
            expiresAt: access.expiresAt,
        });
    } catch (error) {
        console.error('[SubscriptionMiddleware] Error checking subscription:', error);
        // Fail-open: let the request through if subscription service has a DB error.
        // This prevents cascading 503s across all protected routes when the
        // subscription tables haven't been migrated yet or the service is temporarily unavailable.
        // Individual route handlers still perform their own auth checks.
        return next();
    }
}
