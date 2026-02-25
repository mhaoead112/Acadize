/**
 * Paymob Webhook Handler
 * Handles payment status callbacks from Paymob.
 * 
 * Paymob sends two types of callbacks:
 * 1. Transaction processed callback (server-to-server POST)
 * 2. Transaction response callback (redirect GET to client)
 * 
 * This handler processes the server-to-server callback.
 */

import express from 'express';
import * as PaymobService from '../services/paymob.service.js';
import * as SubscriptionService from '../services/subscription.service.js';


const router = express.Router();

/**
 * POST /api/webhooks/paymob
 * Paymob transaction processed callback (server-to-server)
 */
router.post('/paymob', async (req, res) => {
    try {
        const { obj, hmac } = req.body;

        if (!obj || !hmac) {
            console.error('[Webhook] Missing obj or hmac in Paymob callback');
            return res.status(400).json({ message: 'Invalid webhook payload.' });
        }

        // Verify HMAC signature
        const isValid = PaymobService.verifyHmac({
            amount_cents: String(obj.amount_cents),
            created_at: String(obj.created_at),
            currency: String(obj.currency),
            error_occured: String(obj.error_occured),
            has_parent_transaction: String(obj.has_parent_transaction),
            id: String(obj.id),
            integration_id: String(obj.integration_id),
            is_3d_secure: String(obj.is_3d_secure),
            is_auth: String(obj.is_auth),
            is_capture: String(obj.is_capture),
            is_refunded: String(obj.is_refunded),
            is_standalone_payment: String(obj.is_standalone_payment),
            is_voided: String(obj.is_voided),
            order_id: String(obj.order?.id || obj.order_id),
            owner: String(obj.owner),
            pending: String(obj.pending),
            source_data_pan: String(obj.source_data?.pan || ''),
            source_data_sub_type: String(obj.source_data?.sub_type || ''),
            source_data_type: String(obj.source_data?.type || ''),
            success: String(obj.success),
        }, hmac);

        if (!isValid) {
            console.error('[Webhook] Invalid HMAC signature');
            return res.status(403).json({ message: 'Invalid HMAC signature.' });
        }

        const paymobOrderId = String(obj.order?.id || obj.order_id);
        const transactionId = String(obj.id);
        const success = obj.success === true || obj.success === 'true';
        const pending = obj.pending === true || obj.pending === 'true';

        console.log(`[Webhook] Paymob transaction ${transactionId}: ${success ? 'SUCCESS' : 'FAILED'} for order ${paymobOrderId}`);

        // Find payment record by Paymob order ID
        const { db } = await import('../db/index.js');
        const { payments } = await import('../db/schema.js');
        const { eq } = await import('drizzle-orm');

        const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.paymobOrderId, paymobOrderId))
            .limit(1);

        if (!payment) {
            console.error('[Webhook] Payment not found for Paymob order:', paymobOrderId);
            return res.status(200).json({ received: true, error: 'Payment not found' });
        }

        // Handle payment based on status
        if (success && !pending) {
            const metadata = payment.metadata as any || {};

            await SubscriptionService.handlePaymentSuccess({
                paymentId: payment.id,
                userId: payment.userId,
                organizationId: payment.organizationId,
                amountCents: payment.amountPiasters,
                currency: payment.currency,
                billingCycle: metadata.billingCycle || 'monthly',
                paymobTransactionId: transactionId,
                paymobOrderId: paymobOrderId,
            });
        } else if (!success && !pending) {
            const errorMessage = obj.data?.message || 'Payment failed';

            await SubscriptionService.handlePaymentFailure({
                paymentId: payment.id,
                userId: payment.userId,
                errorMessage,
            });
        }

        // Always respond 200 to Paymob
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('[Webhook] Paymob webhook error:', error);
        // Still respond 200 to prevent Paymob retries on our processing errors
        res.status(200).json({ received: true });
    }
});

/**
 * GET /api/webhooks/paymob/callback
 * Paymob redirect callback (client-side redirect after payment)
 * This handles the return from Paymob's hosted checkout page
 */
router.get('/paymob/callback', async (req, res) => {
    try {
        const { success, order, id: transactionId } = req.query;
        const isSuccess = success === 'true';

        // Build the redirect URL based on payment result
        const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';

        if (isSuccess) {
            res.redirect(`${clientBaseUrl}/checkout/success?order=${order}&transaction=${transactionId}`);
        } else {
            res.redirect(`${clientBaseUrl}/checkout/failed?order=${order}&transaction=${transactionId}`);
        }
    } catch (error) {
        console.error('[Webhook] Paymob callback redirect error:', error);
        const clientBaseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
        res.redirect(`${clientBaseUrl}/checkout/failed?error=processing`);
    }
});

export default router;
