/**
 * Subscription & Billing API Routes
 * 
 * Public routes:
 *   POST /api/subscription/validate-promo  — validate a promo code
 *   POST /api/subscription/activate-trial  — activate trial with promo code
 *   GET  /api/subscription/status          — user subscription status
 *   POST /api/subscription/checkout        — create Paymob payment checkout
 * 
 * Admin routes:
 *   GET    /api/subscription/admin/subscriptions       — list all subs in org
 *   POST   /api/subscription/admin/promo-codes         — create promo code
 *   GET    /api/subscription/admin/promo-codes         — list promo codes
 *   DELETE /api/subscription/admin/promo-codes/:id     — deactivate promo code
 *   PATCH  /api/subscription/admin/pricing             — update user pricing
 *   GET    /api/subscription/admin/revenue             — revenue stats
 */

import express, { Request, Response } from 'express';
import * as SubscriptionService from '../services/subscription.service.js';
import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

// Shorthand for routes that need a logged-in user
const auth = [isAuthenticated];

// Apply JWT auth middleware to ALL /admin/* routes in this router
const adminRouter = express.Router();
adminRouter.use(isAuthenticated);

// =====================================================
// AUTHENTICATION HELPER
// =====================================================

function getAuthUser(req: Request) {
    const user = (req as any).user;
    if (!user?.id) {
        return null;
    }
    return user;
}

function requireAuth(req: Request, res: Response): { id: string; organizationId: string; role: string } | null {
    const user = getAuthUser(req);
    if (!user) {
        res.status(401).json({ message: 'Authentication required.' });
        return null;
    }
    return user;
}

function requireAdmin(req: Request, res: Response): { id: string; organizationId: string; role: string } | null {
    const user = requireAuth(req, res);
    if (!user) return null;
    if (user.role !== 'admin') {
        res.status(403).json({ message: 'Admin access required.' });
        return null;
    }
    return user;
}


// =====================================================
// PUBLIC ROUTES (authenticated users)
// =====================================================

// =====================================================
// SETUP & MIGRATION ROUTES (Temporary)
// =====================================================

/**
 * POST /validate-promo
 * Validate a promo code without activating it
 */
router.post('/validate-promo', ...auth, async (req, res) => {
    try {
        const user = requireAuth(req, res);
        if (!user) return;

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Promo code is required.' });
        }

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const promoCode = await SubscriptionService.validatePromoCode(code, organizationId);
        const description = (promoCode as any).description ?? (promoCode.trialDays ? `${promoCode.trialDays}-day free trial` : 'Discount applied');
        res.json({
            valid: true,
            trialDays: promoCode.trialDays ?? 0,
            discount: (promoCode as any).discountPercent ?? 0,
            description,
            code: promoCode.code,
        });
    } catch (error) {
        res.status(400).json({
            valid: false,
            message: error instanceof Error ? error.message : 'Invalid promo code.',
        });
    }
});

/**
 * POST /activate-trial
 * Activate a trial subscription with a promo code
 */
router.post('/activate-trial', ...auth, async (req, res) => {
    try {
        const user = requireAuth(req, res);
        if (!user) return;

        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Promo code is required.' });
        }

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const result = await SubscriptionService.activateTrial({
            userId: user.id,
            organizationId,
            promoCode: code,
        });

        res.json({
            message: 'Trial activated successfully!',
            ...result,
        });
    } catch (error) {
        console.error('[Subscription] Trial activation error:', error);
        res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to activate trial.' });
    }
});

/**
 * POST /activate-free-trial
 * Activate a free trial subscription (no promo code required)
 * Used during registration for eligible users
 */
router.post('/activate-free-trial', async (req, res) => {
    try {
        const { userId, organizationId } = req.body;

        if (!userId || !organizationId) {
            return res.status(400).json({ message: 'User ID and Organization ID are required.' });
        }

        const result = await SubscriptionService.activateFreeTrial({
            userId,
            organizationId,
        });

        res.json({
            message: 'Free trial activated successfully!',
            ...result,
        });
    } catch (error) {
        console.error('[Subscription] Free trial activation error:', error);
        res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to activate free trial.' });
    }
});

/**
 * GET /status
 * Get current user's subscription status
 */
router.get('/status', ...auth, async (req, res) => {
    try {
        const user = requireAuth(req, res);
        if (!user) return;

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const access = await SubscriptionService.checkUserAccess(user.id, organizationId);
        res.json(access);
    } catch (error) {
        console.error('[Subscription] Status check error:', error);
        res.status(500).json({ message: 'Failed to check subscription status.' });
    }
});

/**
 * GET /check-subscription
 * Check if user has access - returns 402 if payment required
 */
router.get('/check-subscription', ...auth, async (req, res) => {
    try {
        const user = requireAuth(req, res);
        if (!user) return;

        // Admins always have access
        if (user.role === 'admin') {
            return res.json({ hasAccess: true, status: 'admin' });
        }

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const access = await SubscriptionService.checkUserAccess(user.id, organizationId);

        // If subscriptions aren't required, allow access
        if (access.status === 'not_required') {
            return res.json({ hasAccess: true, status: 'not_required' });
        }

        // If user has access, return success
        if (access.hasAccess) {
            return res.json(access);
        }

        // No access - return 402 Payment Required
        return res.status(402).json({
            message: 'Subscription required to access this feature.',
            subscriptionStatus: access.status,
            expiresAt: access.expiresAt,
        });
    } catch (error) {
        console.error('[Subscription] Check subscription error:', error);
        res.status(500).json({ message: 'Failed to check subscription.' });
    }
});


/**
 * POST /checkout
 * Create a Paymob checkout session
 */
router.post('/checkout', ...auth, async (req, res) => {
    try {
        const user = requireAuth(req, res);
        if (!user) return;

        const { billingCycle } = req.body;
        if (!billingCycle || !['monthly', 'annual'].includes(billingCycle)) {
            return res.status(400).json({ message: 'billingCycle must be "monthly" or "annual".' });
        }

        const organizationId = user.organizationId || (req as any).tenant?.organizationId;
        if (!organizationId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const checkout = await SubscriptionService.createCheckout({
            userId: user.id,
            organizationId,
            billingCycle,
        });

        res.json({ ...checkout, url: checkout.iframeUrl });
    } catch (error) {
        console.error('[Subscription] Checkout error:', error);
        const message = error instanceof Error ? error.message : 'Failed to create checkout.';
        const status = message.includes('checkout was already started') ? 400 : 500;
        res.status(status).json({ message });
    }
});

// =====================================================
// ADMIN ROUTES  (all protected by isAuthenticated via adminRouter)
// =====================================================

/**
 * GET /admin/subscriptions
 * List all user subscriptions in the org
 */
adminRouter.get('/subscriptions', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const subscriptions = await SubscriptionService.getOrgSubscriptions(user.organizationId);
        res.json(subscriptions);
    } catch (error) {
        console.error('[Subscription] Admin sub list error:', error);
        res.status(500).json({ message: 'Failed to fetch subscriptions.' });
    }
});

/**
 * POST /admin/promo-codes
 * Create a promo code
 */
adminRouter.post('/promo-codes', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const { code, trialDays, maxUses, expiresAt, isGlobal } = req.body;
        if (!code) {
            return res.status(400).json({ message: 'Promo code is required.' });
        }

        const promoCode = await SubscriptionService.createPromoCode({
            code,
            organizationId: isGlobal ? null : user.organizationId,
            trialDays,
            maxUses,
            expiresAt: expiresAt ? new Date(expiresAt) : undefined,
            createdBy: user.id,
        });

        res.status(201).json(promoCode);
    } catch (error) {
        console.error('[Subscription] Create promo error:', error);
        res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to create promo code.' });
    }
});

/**
 * GET /admin/promo-codes
 * List all promo codes for the org
 */
adminRouter.get('/promo-codes', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const codes = await SubscriptionService.listPromoCodes(user.organizationId);
        res.json(codes);
    } catch (error) {
        console.error('[Subscription] List promo error:', error);
        res.status(500).json({ message: 'Failed to fetch promo codes.' });
    }
});

/**
 * DELETE /admin/promo-codes/:id
 * Deactivate a promo code
 */
adminRouter.delete('/promo-codes/:id', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const { id } = req.params;
        const result = await SubscriptionService.deactivatePromoCode(id, user.organizationId);
        res.json({ message: 'Promo code deactivated.', promoCode: result });
    } catch (error) {
        console.error('[Subscription] Deactivate promo error:', error);
        res.status(400).json({ message: error instanceof Error ? error.message : 'Failed to deactivate promo code.' });
    }
});

/**
 * PATCH /admin/pricing
 * Update user subscription pricing for the org
 */
adminRouter.patch('/pricing', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const {
            userSubscriptionEnabled,
            userMonthlyPricePiasters,
            userAnnualPricePiasters,
            userCurrency,
        } = req.body;

        if (typeof userSubscriptionEnabled !== 'boolean') {
            return res.status(400).json({ message: 'userSubscriptionEnabled is required and must be a boolean.' });
        }

        const updated = await SubscriptionService.updateUserPricing({
            organizationId: user.organizationId,
            userSubscriptionEnabled,
            userMonthlyPricePiasters,
            userAnnualPricePiasters,
            userCurrency,
        });

        res.json({ message: 'Pricing updated.', organization: updated });
    } catch (error) {
        console.error('[Subscription] Update pricing error:', error);
        res.status(500).json({ message: 'Failed to update pricing.' });
    }
});

/**
 * GET /admin/revenue
 * Get revenue stats for the org
 */
adminRouter.get('/revenue', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const stats = await SubscriptionService.getRevenueStats(user.organizationId);
        res.json(stats);
    } catch (error) {
        console.error('[Subscription] Revenue stats error:', error);
        res.status(500).json({ message: 'Failed to fetch revenue stats.' });
    }
});

/**
 * POST /admin/bulk-subscribe
 *
 * Makes ALL non-admin users in the org "active" — useful for:
 *   - Dev / testing (remove the subscription wall instantly)
 *   - Migrating existing users without going through individual checkouts
 *   - Granting a free period as an admin action
 *
 * Body (all optional):
 *   billingCycle  — 'monthly' (default) | 'annual'
 *   periodDays    — override period length in days (default: 30 or 365)
 *   periodStart   — ISO date string override (default: now)
 *
 * Returns a summary: { subscribed, reactivated, alreadyActive, total, periodStart, periodEnd }
 */
adminRouter.post('/bulk-subscribe', async (req, res) => {
    try {
        const user = requireAdmin(req, res);
        if (!user) return;

        const { billingCycle, periodDays, periodStart } = req.body;

        if (billingCycle && !['monthly', 'annual'].includes(billingCycle)) {
            return res.status(400).json({ message: 'billingCycle must be "monthly" or "annual".' });
        }
        if (periodDays !== undefined && (typeof periodDays !== 'number' || periodDays < 1)) {
            return res.status(400).json({ message: 'periodDays must be a positive number.' });
        }

        const result = await SubscriptionService.bulkSubscribeOrgUsers(
            user.organizationId,
            billingCycle ?? 'monthly',
            periodStart ? new Date(periodStart) : undefined,
            periodDays,
        );

        res.status(200).json({
            message: `Bulk subscription complete. ${result.subscribed} subscribed, ${result.reactivated} reactivated, ${result.alreadyActive} already active.`,
            ...result,
        });
    } catch (error) {
        console.error('[Subscription] Bulk subscribe error:', error);
        res.status(500).json({ message: error instanceof Error ? error.message : 'Bulk subscribe failed.' });
    }
});

// Mount the admin sub-router (isAuthenticated runs first for ALL /admin/* routes)
router.use('/admin', adminRouter);

export default router;

