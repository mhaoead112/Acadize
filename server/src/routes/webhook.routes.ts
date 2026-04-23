/**
 * Webhook Routes
 * Handles payment gateway webhooks (Paymob)
 */

import express from 'express';
import * as PaymobService from '../services/paymob.service.js';
import * as SubscriptionService from '../services/subscription.service.js';
import { db } from '../db/index.js';
import { payments } from '../db/schema.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

/**
 * POST /api/webhook/paymob
 * Handle Paymob payment callbacks
 */
router.post('/paymob', async (req, res) => {
    try {
        const webhookData = req.body;

        // Extract HMAC from query or body
        const receivedHmac = req.query.hmac as string || webhookData.hmac;

        if (!receivedHmac) {
            console.error('Paymob webhook: Missing HMAC');
            return res.status(400).json({ error: 'Missing HMAC signature' });
        }

        // Verify HMAC signature
        const hmacParams = {
            amount_cents: String(webhookData.obj?.amount_cents || ''),
            created_at: String(webhookData.obj?.created_at || ''),
            currency: String(webhookData.obj?.currency || ''),
            error_occured: String(webhookData.obj?.error_occured || 'false'),
            has_parent_transaction: String(webhookData.obj?.has_parent_transaction || 'false'),
            id: String(webhookData.obj?.id || ''),
            integration_id: String(webhookData.obj?.integration_id || ''),
            is_3d_secure: String(webhookData.obj?.is_3d_secure || 'false'),
            is_auth: String(webhookData.obj?.is_auth || 'false'),
            is_capture: String(webhookData.obj?.is_capture || 'false'),
            is_refunded: String(webhookData.obj?.is_refunded || 'false'),
            is_standalone_payment: String(webhookData.obj?.is_standalone_payment || 'false'),
            is_voided: String(webhookData.obj?.is_voided || 'false'),
            order_id: String(webhookData.obj?.order?.id || ''),
            owner: String(webhookData.obj?.owner || ''),
            pending: String(webhookData.obj?.pending || 'false'),
            source_data_pan: String(webhookData.obj?.source_data?.pan || ''),
            source_data_sub_type: String(webhookData.obj?.source_data?.sub_type || ''),
            source_data_type: String(webhookData.obj?.source_data?.type || ''),
            success: String(webhookData.obj?.success || 'false'),
        };

        const isValid = PaymobService.verifyHmac(hmacParams, receivedHmac);

        if (!isValid) {
            console.error('Paymob webhook: Invalid HMAC signature');
            return res.status(401).json({ error: 'Invalid HMAC signature' });
        }

        // Extract transaction details
        const transaction = webhookData.obj;
        const paymobOrderId = transaction.order?.id;
        const paymobTransactionId = transaction.id;
        const isSuccess = transaction.success === true || transaction.success === 'true';
        const isPending = transaction.pending === true || transaction.pending === 'true';

        console.log('Paymob webhook received:', {
            orderId: paymobOrderId,
            transactionId: paymobTransactionId,
            success: isSuccess,
            pending: isPending,
        });

        // Find payment record by Paymob order ID
        const [payment] = await db
            .select()
            .from(payments)
            .where(eq(payments.paymobOrderId, String(paymobOrderId)))
            .limit(1);

        if (!payment) {
            console.error('Paymob webhook: Payment not found for order', paymobOrderId);
            return res.status(404).json({ error: 'Payment not found' });
        }

        // Handle payment based on status
        if (isSuccess && !isPending) {
            // Payment successful
            console.log('Processing successful payment:', payment.id);

            const metadata = payment.metadata as any || {};

            await SubscriptionService.handlePaymentSuccess({
                paymentId: payment.id,
                userId: payment.userId!,
                organizationId: payment.organizationId!,
                amountCents: payment.amountPiasters!,
                currency: payment.currency!,
                billingCycle: metadata.billingCycle || 'monthly',
                paymobTransactionId: String(paymobTransactionId),
                paymobOrderId: String(paymobOrderId),
            });

            console.log('Payment success handled:', payment.id);
        } else if (!isSuccess && !isPending) {
            // Payment failed
            console.log('Processing failed payment:', payment.id);

            const errorMessage = transaction.data?.message || 'Payment failed';

            await SubscriptionService.handlePaymentFailure({
                paymentId: payment.id,
                userId: payment.userId!,
                errorMessage,
            });

            console.log('Payment failure handled:', payment.id);
        } else {
            // Payment pending - do nothing for now
            console.log('Payment pending:', payment.id);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Paymob webhook error:', error);
        // Still return 200 to prevent Paymob from retrying
        res.status(200).json({ received: true, error: 'Internal error' });
    }
});

/**
 * POST /api/webhook/paymob/response
 * Handle Paymob response callback (user redirect after payment)
 */
router.get('/paymob/response', async (req, res) => {
    try {
        const { success, order } = req.query;

        // Redirect user based on payment status
        if (success === 'true') {
            res.redirect('/checkout-success?payment=success');
        } else {
            res.redirect('/checkout-failed?payment=failed');
        }
    } catch (error) {
        console.error('Paymob response callback error:', error);
        res.redirect('/checkout-failed?payment=error');
    }
});

export default router;
