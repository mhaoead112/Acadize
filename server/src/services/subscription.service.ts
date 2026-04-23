/**
 * Subscription Service
 * Handles subscription logic:
 * - Promo code validation & trial activation
 * - Subscription status checks
 * - Subscription lifecycle management
 */

import { db } from '../db/index.js';
import { promoCodes, userSubscriptions, payments, organizations, users } from '../db/schema.js';
import { eq, and, sql, desc, gte, or, isNull } from 'drizzle-orm';
import * as PaymobService from './paymob.service.js';

// =====================================================
// PROMO CODE OPERATIONS
// =====================================================

/**
 * Validate a promo code for a specific organization.
 * Returns the promo code record if valid, throws otherwise.
 */
export async function validatePromoCode(code: string, organizationId: string) {
    // Optional emergency promo override (disabled by default).
    // Enable only via env when intentionally running a campaign.
    const allowTrial30Override = process.env.ALLOW_TRIAL30_OVERRIDE === 'true';
    if (allowTrial30Override && code.toUpperCase().trim() === 'TRIAL30') {
        return {
            id: 'trial30-hardcoded',
            code: 'TRIAL30',
            organizationId: null,
            isActive: true,
            discountPercent: null,
            trialDays: 30,
            maxUses: null,
            usedCount: 0,
            expiresAt: null,
            description: '30-Day Free First Month',
            createdAt: new Date(),
        };
    }

    // Look for org-specific code OR global code (null org)
    const [promoCode] = await db
        .select()
        .from(promoCodes)
        .where(
            and(
                eq(promoCodes.code, code.toUpperCase().trim()),
                eq(promoCodes.isActive, true),
                or(
                    eq(promoCodes.organizationId, organizationId),
                    isNull(promoCodes.organizationId)
                )
            )
        )
        .limit(1);

    if (!promoCode) {
        throw new Error('Invalid or expired promo code.');
    }

    // Check expiry
    if (promoCode.expiresAt && promoCode.expiresAt < new Date()) {
        throw new Error('This promo code has expired.');
    }

    // Check max uses
    if (promoCode.maxUses !== null && promoCode.usedCount >= promoCode.maxUses) {
        throw new Error('This promo code has reached its maximum number of uses.');
    }

    return promoCode;
}

/**
 * Activate a trial subscription using a promo code.
 */
export async function activateTrial(params: {
    userId: string;
    organizationId: string;
    promoCode: string;
}) {
    // 1. Check if user already has a subscription
    const existing = await getUserSubscription(params.userId, params.organizationId);
    // Allow trial when existing row is a checkout placeholder (user went to Paymob then back and applied promo)
    const isCheckoutPlaceholder = existing?.status === 'trialing' && !existing?.promoCodeId && existing?.paymobOrderId;
    if (existing && ['trialing', 'active'].includes(existing.status) && !isCheckoutPlaceholder) {
        throw new Error('You already have an active subscription or trial.');
    }

    // 2. Validate promo code
    const promo = await validatePromoCode(params.promoCode, params.organizationId);

    // 3. Calculate trial period
    const now = new Date();
    const trialEnd = new Date(now);
    trialEnd.setDate(trialEnd.getDate() + (promo.trialDays ?? 0));

    // 4. Wrap in transaction for atomicity
    await db.transaction(async (tx) => {
        // Create or update subscription
        if (existing) {
            // Reactivate expired subscription
            await tx
                .update(userSubscriptions)
                .set({
                    status: 'trialing',
                    promoCodeId: promo.id,
                    trialStart: now,
                    trialEnd: trialEnd,
                    currentPeriodStart: now,
                    currentPeriodEnd: trialEnd,
                    canceledAt: null,
                })
                .where(eq(userSubscriptions.id, existing.id));
        } else {
            // Create new subscription
            await tx.insert(userSubscriptions).values({
                userId: params.userId,
                organizationId: params.organizationId,
                promoCodeId: promo.id,
                status: 'trialing',
                trialStart: now,
                trialEnd: trialEnd,
                currentPeriodStart: now,
                currentPeriodEnd: trialEnd,
            });
        }

        // 5. Increment promo code usage
        await tx
            .update(promoCodes)
            .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
            .where(eq(promoCodes.id, promo.id));

        // 6. Activate the user account so they're not locked out
        await tx
            .update(users)
            .set({ isActive: true, emailVerified: true })
            .where(eq(users.id, params.userId));
    });

    return {
        status: 'trialing' as const,
        trialStart: now,
        trialEnd: trialEnd,
        daysRemaining: promo.trialDays ?? 0,
    };
}




// =====================================================
// SUBSCRIPTION STATUS
// =====================================================

/**
 * Get a user's subscription for a specific org
 */
export async function getUserSubscription(userId: string, organizationId: string) {
    const [subscription] = await db
        .select()
        .from(userSubscriptions)
        .where(
            and(
                eq(userSubscriptions.userId, userId),
                eq(userSubscriptions.organizationId, organizationId)
            )
        )
        .limit(1);

    return subscription || null;
}

/**
 * Check if a user has active access (trial or paid subscription)
 */
export async function checkUserAccess(userId: string, organizationId: string): Promise<{
    hasAccess: boolean;
    status: string;
    expiresAt: Date | null;
    subscription: any | null;
}> {
    // First check if org even requires user subscriptions
    const [org] = await db
        .select({
            userSubscriptionEnabled: organizations.userSubscriptionEnabled,
        })
        .from(organizations)
        .where(eq(organizations.id, organizationId))
        .limit(1);

    // If org doesn't require user subs, everyone has access
    if (!org || !org.userSubscriptionEnabled) {
        return { hasAccess: true, status: 'not_required', expiresAt: null, subscription: null };
    }

    // Get user's subscription
    const subscription = await getUserSubscription(userId, organizationId);

    if (!subscription) {
        return { hasAccess: false, status: 'no_subscription', expiresAt: null, subscription: null };
    }

    const now = new Date();

    // Trialing — check if trial is still valid
    if (subscription.status === 'trialing') {
        if (subscription.trialEnd && subscription.trialEnd > now) {
            return {
                hasAccess: true,
                status: 'trialing',
                expiresAt: subscription.trialEnd,
                subscription,
            };
        }
        // Trial expired — mark as expired
        await db
            .update(userSubscriptions)
            .set({ status: 'expired' })
            .where(eq(userSubscriptions.id, subscription.id));
        return { hasAccess: false, status: 'expired', expiresAt: subscription.trialEnd, subscription };
    }

    // Active — check if billing period is still valid
    if (subscription.status === 'active') {
        if (subscription.currentPeriodEnd && subscription.currentPeriodEnd > now) {
            return {
                hasAccess: true,
                status: 'active',
                expiresAt: subscription.currentPeriodEnd,
                subscription,
            };
        }
        // Period ended — mark as expired
        await db
            .update(userSubscriptions)
            .set({ status: 'expired' })
            .where(eq(userSubscriptions.id, subscription.id));
        return { hasAccess: false, status: 'expired', expiresAt: subscription.currentPeriodEnd, subscription };
    }

    // Any other status means no access
    return {
        hasAccess: false,
        status: subscription.status,
        expiresAt: subscription.currentPeriodEnd || subscription.trialEnd,
        subscription,
    };
}

// =====================================================
// CHECKOUT FLOW
// =====================================================

/**
 * Create a Paymob checkout session for a subscription
 */
export async function createCheckout(params: {
    userId: string;
    organizationId: string;
    billingCycle: 'monthly' | 'annual';
    /** Override the amount charged (e.g. 0 for a free-first-month promo) */
    amountOverridePiasters?: number;
    registrationData?: {
        email: string;
        fullName: string;
        phone: string;
        role: string;
        gradeLevel?: string;
        subject?: string;
        childName?: string;
        dateOfBirth?: string;
    };
}) {
    // 1. Get org pricing
    const [org] = await db
        .select({
            userMonthlyPricePiasters: organizations.userMonthlyPricePiasters,
            userAnnualPricePiasters: organizations.userAnnualPricePiasters,
            userCurrency: organizations.userCurrency,
            name: organizations.name,
        })
        .from(organizations)
        .where(eq(organizations.id, params.organizationId))
        .limit(1);

    if (!org) throw new Error('Organization not found.');

    const basePiasters = params.billingCycle === 'monthly'
        ? org.userMonthlyPricePiasters
        : org.userAnnualPricePiasters;

    if (params.amountOverridePiasters === undefined && !basePiasters) {
        throw new Error(`No ${params.billingCycle} pricing configured for this organization.`);
    }

    // Allow override (e.g. 0 for free-first-month promo)
    const amountPiasters = params.amountOverridePiasters ?? basePiasters!;

    // 2. Get user details for billing
    const [user] = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
        })
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

    if (!user) throw new Error('User not found.');

    // Split name for Paymob billing
    const nameParts = user.fullName.split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || 'NA';

    // 3. Create or get subscription record
    let subscription = await getUserSubscription(params.userId, params.organizationId);

    if (!subscription) {
        const [newSub] = await db.insert(userSubscriptions).values({
            userId: params.userId,
            organizationId: params.organizationId,
            status: 'trialing', // will be updated after payment
            billingCycle: params.billingCycle,
            amountPiasters: amountPiasters,
            currency: org.userCurrency || 'EGP',
        }).returning();
        subscription = newSub;
    }

    // 4. Create pending payment record first so we have a unique id for Paymob (avoids 422 duplicate merchant_order_id on retry)
    const paymentMetadata: Record<string, unknown> = { billingCycle: params.billingCycle };
    if (params.registrationData) {
        Object.assign(paymentMetadata, params.registrationData);
    }
    const [paymentRow] = await db.insert(payments).values({
        organizationId: params.organizationId,
        userId: params.userId,
        userSubscriptionId: subscription.id,
        paymobOrderId: null, // set after Paymob call
        amountPiasters: amountPiasters,
        currency: org.userCurrency || 'EGP',
        status: 'pending',
        description: `${org.name} - ${params.billingCycle} subscription`,
        metadata: paymentMetadata,
    }).returning();

    if (!paymentRow) throw new Error('Failed to create payment record.');

    // 5. Create Paymob checkout with unique merchant_order_id (our payment id)
    const checkout = await PaymobService.createCheckoutSession({
        amountCents: amountPiasters,
        currency: org.userCurrency || 'EGP',
        merchantOrderId: paymentRow.id,
        billingData: {
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            phone_number: user.phone || '01000000000',
        },
    });

    // 6. Update payment with Paymob order id; store on subscription for webhook lookup
    await db.update(payments).set({ paymobOrderId: checkout.paymobOrderId.toString() }).where(eq(payments.id, paymentRow.id));
    await db
        .update(userSubscriptions)
        .set({ paymobOrderId: checkout.paymobOrderId.toString() })
        .where(eq(userSubscriptions.id, subscription.id));

    return {
        iframeUrl: checkout.iframeUrl,
        paymentToken: checkout.paymentToken,
        subscriptionId: subscription.id,
    };
}


// =====================================================
// ADMIN OPERATIONS
// =====================================================

/**
 * Get all subscriptions in an org (admin view)
 */
export async function getOrgSubscriptions(organizationId: string) {
    return db
        .select({
            subscription: userSubscriptions,
            user: {
                id: users.id,
                fullName: users.fullName,
                email: users.email,
                role: users.role,
            },
        })
        .from(userSubscriptions)
        .innerJoin(users, eq(userSubscriptions.userId, users.id))
        .where(eq(userSubscriptions.organizationId, organizationId))
        .orderBy(desc(userSubscriptions.createdAt));
}

/**
 * Create a promo code (admin)
 */
export async function createPromoCode(params: {
    code: string;
    organizationId: string | null;
    trialDays?: number;
    maxUses?: number;
    expiresAt?: Date;
}) {
    const [promoCode] = await db.insert(promoCodes).values({
        code: params.code.toUpperCase().trim(),
        organizationId: params.organizationId,
        trialDays: params.trialDays || 30,
        maxUses: params.maxUses || null,
        expiresAt: params.expiresAt || null,
    }).returning();

    return promoCode;
}

/**
 * List promo codes for an org (admin)
 */
export async function listPromoCodes(organizationId: string) {
    return db
        .select()
        .from(promoCodes)
        .where(
            or(
                eq(promoCodes.organizationId, organizationId),
                isNull(promoCodes.organizationId)
            )
        )
        .orderBy(desc(promoCodes.createdAt));
}

/**
 * Deactivate a promo code (admin)
 */
export async function deactivatePromoCode(promoCodeId: string, organizationId: string) {
    const [updated] = await db
        .update(promoCodes)
        .set({ isActive: false })
        .where(
            and(
                eq(promoCodes.id, promoCodeId),
                or(
                    eq(promoCodes.organizationId, organizationId),
                    isNull(promoCodes.organizationId)
                )
            )
        )
        .returning();

    if (!updated) throw new Error('Promo code not found.');
    return updated;
}

/**
 * Update user pricing for an org (admin)
 */
export async function updateUserPricing(params: {
    organizationId: string;
    userSubscriptionEnabled: boolean;
    userMonthlyPricePiasters?: number | null;
    userAnnualPricePiasters?: number | null;
    userCurrency?: string;
}) {
    const [updated] = await db
        .update(organizations)
        .set({
            userSubscriptionEnabled: params.userSubscriptionEnabled,
            userMonthlyPricePiasters: params.userMonthlyPricePiasters,
            userAnnualPricePiasters: params.userAnnualPricePiasters,
            userCurrency: params.userCurrency || 'EGP',
        })
        .where(eq(organizations.id, params.organizationId))
        .returning();

    return updated;
}

/**
 * Get revenue stats for an org (admin)
 */
export async function getRevenueStats(organizationId: string) {
    // Total revenue
    const [totalResult] = await db
        .select({
            totalRevenue: sql<number>`COALESCE(SUM(${payments.amountPiasters}), 0)`,
            totalPayments: sql<number>`COUNT(*)`,
        })
        .from(payments)
        .where(
            and(
                eq(payments.organizationId, organizationId),
                eq(payments.status, 'succeeded')
            )
        );

    // Active subscriptions count
    const [activeResult] = await db
        .select({
            count: sql<number>`COUNT(*)`,
        })
        .from(userSubscriptions)
        .where(
            and(
                eq(userSubscriptions.organizationId, organizationId),
                or(
                    eq(userSubscriptions.status, 'active'),
                    eq(userSubscriptions.status, 'trialing')
                )
            )
        );

    // Recent payments
    const recentPayments = await db
        .select({
            payment: payments,
            user: {
                fullName: users.fullName,
                email: users.email,
            },
        })
        .from(payments)
        .leftJoin(users, eq(payments.userId, users.id))
        .where(eq(payments.organizationId, organizationId))
        .orderBy(desc(payments.createdAt))
        .limit(20);

    return {
        totalRevenuePiasters: totalResult?.totalRevenue || 0,
        totalPayments: totalResult?.totalPayments || 0,
        activeSubscriptions: activeResult?.count || 0,
        recentPayments,
    };
}

// =====================================================
// PAYMENT WEBHOOK HANDLERS
// =====================================================

/**
 * Handle successful payment from Paymob webhook
 */
export async function handlePaymentSuccess(params: {
    paymentId: string;
    userId: string;
    organizationId: string;
    amountCents: number;
    currency: string;
    billingCycle: 'monthly' | 'annual';
    paymobTransactionId: string;
    paymobOrderId: string;
}) {
    const now = new Date();

    // Calculate subscription period
    const periodEnd = new Date(now);
    if (params.billingCycle === 'monthly') {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Wrap in transaction for atomicity
    await db.transaction(async (tx) => {
        // Update payment record to succeeded (enum value)
        await tx
            .update(payments)
            .set({
                status: 'succeeded',
                paymobTransactionId: params.paymobTransactionId,
                paidAt: now,
            })
            .where(eq(payments.id, params.paymentId));

        // Check if user already has a subscription
        const [existingSub] = await tx
            .select()
            .from(userSubscriptions)
            .where(
                and(
                    eq(userSubscriptions.userId, params.userId),
                    eq(userSubscriptions.organizationId, params.organizationId)
                )
            )
            .limit(1);

        if (existingSub) {
            // Update existing subscription
            await tx
                .update(userSubscriptions)
                .set({
                    status: 'active',
                    billingCycle: params.billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    trialEnd: null, // Clear trial if it was trialing
                    canceledAt: null,
                })
                .where(eq(userSubscriptions.id, existingSub.id));
        } else {
            // Create new subscription
            await tx.insert(userSubscriptions).values({
                userId: params.userId,
                organizationId: params.organizationId,
                status: 'active',
                billingCycle: params.billingCycle,
                currentPeriodStart: now,
                currentPeriodEnd: periodEnd,
            });
        }

        // Activate user so they can log in (registration flow)
        await tx
            .update(users)
            .set({ isActive: true, emailVerified: true })
            .where(eq(users.id, params.userId));
    });

    // Get user details for email (outside transaction)
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

    // Send success email (will be implemented in email service)
    // await sendSubscriptionActivatedEmail(user.email, user.fullName, params.billingCycle, periodEnd);

    return { success: true };
}

/**
 * Handle failed payment from Paymob webhook
 */
export async function handlePaymentFailure(params: {
    paymentId: string;
    userId: string;
    errorMessage?: string;
}) {
    // Update payment record to failed
    await db
        .update(payments)
        .set({
            status: 'failed',
            metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ errorMessage: params.errorMessage })}::jsonb`,
        })
        .where(eq(payments.id, params.paymentId));

    // Get payment details to check retry count
    const [payment] = await db
        .select()
        .from(payments)
        .where(eq(payments.id, params.paymentId))
        .limit(1);

    if (!payment) {
        throw new Error('Payment not found');
    }

    const metadata = payment.metadata as any || {};
    const retryCount = (metadata.retryCount || 0) + 1;
    const maxRetries = 3;

    // Update retry count
    await db
        .update(payments)
        .set({
            metadata: sql`COALESCE(metadata, '{}'::jsonb) || ${JSON.stringify({ retryCount })}::jsonb`,
        })
        .where(eq(payments.id, params.paymentId));

    // Get user details for email
    const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, params.userId))
        .limit(1);

    if (retryCount >= maxRetries) {
        // Send max attempts email
        // await sendPaymentMaxAttemptsEmail(user.email, user.fullName);
    } else if (retryCount === 1) {
        // Send retry email
        // await sendPaymentRetryEmail(user.email, user.fullName, payment.id);
    } else {
        // Send reminder email
        // await sendPaymentRetryReminderEmail(user.email, user.fullName, retryCount, maxRetries);
    }

    return { success: true, retryCount };
}


// =====================================================
// ADMIN — BULK SUBSCRIBE ALL UNSUBSCRIBED USERS
// =====================================================

export interface BulkSubscribeResult {
    subscribed: number;    // new subscription rows inserted
    reactivated: number;   // expired / canceled rows brought back to active
    alreadyActive: number; // skipped — already trialing or active
    total: number;         // total non-admin users in org
    periodStart: Date;
    periodEnd: Date;
}

/**
 * Makes every non-admin user in the org "active".
 *
 * - Users with NO subscription row   → insert a new active row
 * - Users with canceled/expired row  → reactivate to active
 * - Users already trialing or active → skip (count in alreadyActive)
 *
 * @param organizationId  The org to act on
 * @param billingCycle    'monthly' | 'annual'
 * @param periodStartDate Optional override — defaults to now
 * @param periodDays      Override period length in days (default: 30 or 365)
 */
export async function bulkSubscribeOrgUsers(
    organizationId: string,
    billingCycle: 'monthly' | 'annual' = 'monthly',
    periodStartDate?: Date,
    periodDays?: number,
): Promise<BulkSubscribeResult> {
    const now = periodStartDate ?? new Date();
    const days = periodDays ?? (billingCycle === 'annual' ? 365 : 30);
    const periodEnd = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // 1 — All non-admin users in the org
    const allUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(
            and(
                eq(users.organizationId, organizationId),
                sql`${users.role} != 'admin'`,
            ),
        );

    if (allUsers.length === 0) {
        return { subscribed: 0, reactivated: 0, alreadyActive: 0, total: 0, periodStart: now, periodEnd };
    }

    const userIds = allUsers.map((u) => u.id);

    // 2 — Existing subscription records for these users
    const existingSubs = await db
        .select({
            id: userSubscriptions.id,
            userId: userSubscriptions.userId,
            status: userSubscriptions.status,
        })
        .from(userSubscriptions)
        .where(eq(userSubscriptions.organizationId, organizationId));

    const subByUserId = new Map(existingSubs.map((s) => [s.userId, s]));

    const toInsert: string[] = [];      // user IDs without any subscription
    const toReactivate: string[] = [];  // subscription IDs to flip back to active
    let alreadyActive = 0;

    for (const userId of userIds) {
        const sub = subByUserId.get(userId);
        if (!sub) {
            toInsert.push(userId);
        } else if (sub.status === 'trialing' || sub.status === 'active') {
            alreadyActive++;
        } else {
            // canceled | expired | past_due
            toReactivate.push(sub.id);
        }
    }

    // 3 — Single transaction: insert + reactivate + unlock accounts
    await db.transaction(async (tx) => {
        if (toInsert.length > 0) {
            await tx.insert(userSubscriptions).values(
                toInsert.map((userId) => ({
                    userId,
                    organizationId,
                    status: 'active' as const,
                    billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                })),
            );
            // Ensure accounts are unlocked
            for (const userId of toInsert) {
                await tx
                    .update(users)
                    .set({ isActive: true, emailVerified: true })
                    .where(eq(users.id, userId));
            }
        }

        for (const subId of toReactivate) {
            await tx
                .update(userSubscriptions)
                .set({
                    status: 'active',
                    billingCycle,
                    currentPeriodStart: now,
                    currentPeriodEnd: periodEnd,
                    canceledAt: null,
                })
                .where(eq(userSubscriptions.id, subId));
        }
    });

    return {
        subscribed: toInsert.length,
        reactivated: toReactivate.length,
        alreadyActive,
        total: allUsers.length,
        periodStart: now,
        periodEnd,
    };
}
