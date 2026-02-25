import { Router } from 'express';
import { db } from '../db/index.js';
import { users, organizations, userSubscriptions, payments } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { createCheckout, validatePromoCode, activateTrial } from '../services/subscription.service.js';

const router = Router();

/**
 * POST /api/registration/validate-coupon
 * Validate a promo code
 */
router.post('/validate-coupon', async (req, res) => {
    try {
        const { code } = req.body;

        // Get organization
        const subdomain = (req.headers['x-tenant-subdomain'] || req.headers['x-organization-subdomain'] || 'default') as string;
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.subdomain, subdomain))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        const promo = await validatePromoCode(code, org.id);

        res.json({
            valid: true,
            code: promo.code,
            discountPercent: promo.discountPercent,
            trialDays: promo.trialDays,
            description: promo.description
        });
    } catch (error: any) {
        res.status(400).json({ valid: false, message: error.message });
    }
});

/**
 * GET /api/registration/pricing
 * Fetch organization subscription pricing
 */
router.get('/pricing', async (req, res) => {
    try {
        // Get organization from subdomain or default
        const subdomain = (req.headers['x-tenant-subdomain'] || req.headers['x-organization-subdomain'] || 'default') as string;

        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.subdomain, subdomain))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Check if user subscriptions are enabled
        if (!org.userSubscriptionEnabled) {
            return res.status(400).json({
                message: 'User subscriptions are not enabled for this organization'
            });
        }

        res.json({
            monthlyPricePiasters: org.userMonthlyPricePiasters,
            annualPricePiasters: org.userAnnualPricePiasters,
            currency: org.userCurrency || 'EGP',
            trialDays: 14, // Standard trial period
            trialEligibleRoles: ['teacher', 'parent']
        });
    } catch (error) {
        console.error('Error fetching pricing:', error);
        res.status(500).json({ message: 'Failed to fetch pricing information' });
    }
});

/**
 * POST /api/registration/apply-trial-coupon
 * Apply a coupon code to activate a trial for an existing user (e.g. at payment step)
 */
router.post('/apply-trial-coupon', async (req, res) => {
    try {
        const { userId, code, organizationId } = req.body;

        if (!userId || !code) {
            return res.status(400).json({ message: 'User ID and coupon code are required' });
        }

        // Validate promo code
        const promo = await validatePromoCode(code, organizationId);

        if (!promo.trialDays || promo.trialDays <= 0) {
            return res.status(400).json({ message: 'This coupon does not grant a trial period' });
        }

        // Activate trial
        await activateTrial({
            userId,
            organizationId,
            promoCode: code
        });

        res.json({
            success: true,
            message: `Trial activated for ${promo.trialDays} days`,
            trialDays: promo.trialDays
        });
    } catch (error: any) {
        res.status(400).json({ message: error.message });
    }
});

/**
 * POST /api/registration/create-with-payment
 * Create user account and initiate payment checkout
 */
router.post('/create-with-payment', async (req, res) => {
    try {
        const {
            fullName,
            email,
            phone,
            password,
            role,
            gradeLevel,
            subject,
            childName,
            dateOfBirth,
            billingCycle,
            couponCode
        } = req.body;

        // Get organization
        const subdomain = (req.headers['x-tenant-subdomain'] || req.headers['x-organization-subdomain'] || 'default') as string;
        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.subdomain, subdomain))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Validation
        if (!fullName || !email || !password || !role) {
            return res.status(400).json({
                message: 'Missing required fields',
                field: !fullName ? 'fullName' : !email ? 'email' : !password ? 'password' : 'role'
            });
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                message: 'Invalid email format',
                field: 'email'
            });
        }

        // Password strength validation
        if (password.length < 8 || !/[A-Z]/.test(password) || !/\d/.test(password)) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters with one uppercase letter and one number',
                field: 'password'
            });
        }

        // Check if user already exists (e.g. user went back from checkout and is retrying)
        const [existingUser] = await db
            .select()
            .from(users)
            .where(and(
                eq(users.organizationId, org.id),
                eq(users.email, email)
            ))
            .limit(1);

        let newUser: typeof existingUser;

        if (existingUser) {
            // If user is already active/verified, they should login instead
            if (existingUser.isActive || existingUser.emailVerified) {
                return res.status(409).json({
                    message: 'An account with this email already exists. Please login instead.',
                    field: 'email'
                });
            }
            // User exists but is inactive (pending payment) — reuse them for a new checkout attempt
            newUser = existingUser;
        } else {
            // Hash password and create new user
            const passwordHash = await bcrypt.hash(password, 10);

            const [created] = await db
                .insert(users)
                .values({
                    organizationId: org.id,
                    fullName,
                    email,
                    username: email.split('@')[0],
                    password: passwordHash,
                    role: role as any,
                    phone,
                    grade: gradeLevel,
                    bio: subject || childName || null,
                    isActive: false,
                    emailVerified: false
                })
                .returning();
            newUser = created;
        }

        // ---------------------------------------------------------
        // COUPON HANDLING
        // ---------------------------------------------------------
        let promoTrialDays: number | null = null;

        if (couponCode) {
            try {
                const promo = await validatePromoCode(couponCode, org.id);
                if (promo.trialDays && promo.trialDays > 0) {
                    promoTrialDays = promo.trialDays;
                }
            } catch (couponError: any) {
                console.warn('Coupon validation failed:', couponError.message);
                return res.status(400).json({
                    message: couponError.message || 'Invalid promo code',
                    field: 'couponCode'
                });
            }
        }

        // ---------------------------------------------------------
        // FREE TRIAL (Paymob rejects amount_cents:0, so activate directly)
        // ---------------------------------------------------------
        if (promoTrialDays) {
            await activateTrial({
                userId: newUser.id,
                organizationId: org.id,
                promoCode: couponCode!,
            });

            return res.status(200).json({
                success: true,
                userId: newUser.id,
                freeCheckout: true,
                trialDays: promoTrialDays,
                message: `Your ${promoTrialDays}-day free trial has been activated!`,
            });
        }

        // ---------------------------------------------------------
        // PAYMOB CHECKOUT (regular paid flow)
        // ---------------------------------------------------------
        const checkout = await createCheckout({
            userId: newUser.id,
            organizationId: org.id,
            billingCycle: billingCycle as 'monthly' | 'annual',
            registrationData: {
                email,
                fullName,
                phone: phone || '',
                role,
                gradeLevel,
                subject,
                childName,
                dateOfBirth
            }
        });

        res.status(200).json({
            success: true,
            userId: newUser.id,
            iframeUrl: checkout.iframeUrl,
            checkoutUrl: checkout.iframeUrl,
            paymentToken: checkout.paymentToken,
            subscriptionId: checkout.subscriptionId,
            message: 'Registration created. Complete payment to activate account.'
        });

    } catch (error) {
        console.error('Error creating registration with payment:', error);
        res.status(500).json({
            message: 'Failed to create registration',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * POST /api/registration/retry-payment
 * Retry failed payment with stored registration data
 */
router.post('/retry-payment', async (req, res) => {
    try {
        const { paymentId, paymobOrderId } = req.body;

        if (!paymentId && !paymobOrderId) {
            return res.status(400).json({ message: 'Payment ID or Paymob Order ID is required' });
        }

        // Retrieve payment record — by internal ID or Paymob order ID
        let payment: any;
        if (paymentId) {
            [payment] = await db
                .select()
                .from(payments)
                .where(eq(payments.id, paymentId))
                .limit(1);
        } else {
            [payment] = await db
                .select()
                .from(payments)
                .where(eq(payments.paymobOrderId, String(paymobOrderId)))
                .limit(1);
        }


        if (!payment) {
            return res.status(404).json({ message: 'Payment not found' });
        }

        if (payment.status === 'succeeded') {
            return res.status(400).json({ message: 'Payment already succeeded' });
        }

        // Extract registration data from metadata
        const registrationData = payment.metadata as any;

        if (!registrationData || !registrationData.email) {
            return res.status(400).json({
                message: 'Registration data not found. Please contact support.'
            });
        }

        // Get user and organization
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, payment.userId!))
            .limit(1);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Create new checkout session
        const checkout = await createCheckout({
            userId: user.id,
            organizationId: user.organizationId,
            billingCycle: registrationData.billingCycle || 'monthly',
            registrationData
        });

        res.status(200).json({
            success: true,
            checkoutUrl: checkout.iframeUrl,
            paymentToken: checkout.paymentToken,
            message: 'New payment session created'
        });

    } catch (error) {
        console.error('Error retrying payment:', error);
        res.status(500).json({
            message: 'Failed to retry payment',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
