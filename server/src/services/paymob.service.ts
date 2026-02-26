/**
 * Paymob Payment Service
 * Handles all Paymob Accept API interactions:
 * - Authentication
 * - Order registration
 * - Payment key generation
 * - HMAC webhook verification
 */

import axios from 'axios';
import crypto from 'crypto';

// Paymob API base URL
const PAYMOB_API_BASE = 'https://accept.paymob.com/api';

interface PaymobConfig {
    apiKey: string;
    integrationId: number;
    iframeId: number;
    hmacSecret: string;
}

function getConfig(): PaymobConfig {
    const apiKey = process.env.PAYMOB_API_KEY;
    const integrationIdRaw = process.env.PAYMOB_INTEGRATION_ID;
    const iframeIdRaw = process.env.PAYMOB_IFRAME_ID;
    const hmacSecret = process.env.PAYMOB_HMAC_SECRET;

    if (!apiKey || !integrationIdRaw || !iframeIdRaw || !hmacSecret) {
        throw new Error('Missing Paymob configuration. Required: PAYMOB_API_KEY, PAYMOB_INTEGRATION_ID, PAYMOB_IFRAME_ID, PAYMOB_HMAC_SECRET');
    }

    // Defensively extract numeric ID from PAYMOB_IFRAME_ID in case the full URL was pasted
    // e.g. "https://accept.paymob.com/api/acceptance/iframes/943777?payment_token=..."
    let iframeIdStr = iframeIdRaw.trim();
    const iframeUrlMatch = iframeIdStr.match(/\/iframes\/(\d+)/);
    if (iframeUrlMatch) {
        iframeIdStr = iframeUrlMatch[1];
    }

    const integrationId = parseInt(integrationIdRaw, 10);
    const iframeId = parseInt(iframeIdStr, 10);

    if (isNaN(integrationId)) {
        throw new Error(`PAYMOB_INTEGRATION_ID is not a valid number: "${integrationIdRaw}"`);
    }
    if (isNaN(iframeId)) {
        throw new Error(`PAYMOB_IFRAME_ID is not a valid number: "${iframeIdRaw}". Set it to just the numeric ID (e.g. 943777).`);
    }

    return {
        apiKey,
        integrationId,
        iframeId,
        hmacSecret,
    };
}

/**
 * Step 1: Authenticate with Paymob to get an auth token
 */
export async function getAuthToken(): Promise<string> {
    const config = getConfig();

    const response = await axios.post(`${PAYMOB_API_BASE}/auth/tokens`, {
        api_key: config.apiKey,
    });

    return response.data.token;
}

/**
 * Step 2: Register an order with Paymob
 */
export async function registerOrder(params: {
    authToken: string;
    amountCents: number; // amount in piasters/cents
    currency: string;
    merchantOrderId: string; // our internal order/subscription ID (must be unique per attempt)
    items?: Array<{ name: string; amount_cents: number; quantity: number }>;
}): Promise<{ orderId: number }> {
    try {
        const response = await axios.post(`${PAYMOB_API_BASE}/ecommerce/orders`, {
            auth_token: params.authToken,
            delivery_needed: false,
            amount_cents: params.amountCents,
            currency: params.currency,
            merchant_order_id: params.merchantOrderId,
            items: params.items || [{
                name: 'Acadize Subscription',
                amount_cents: params.amountCents,
                quantity: 1,
            }],
        });
        return { orderId: response.data.id };
    } catch (err: any) {
        if (err?.response?.status === 422 && err?.response?.data?.message === 'duplicate') {
            throw new Error('A checkout was already started for this plan. Please complete the existing payment or try again in a few minutes.');
        }
        throw err;
    }
}

/**
 * Step 3: Generate a payment key for the checkout
 */
export async function getPaymentKey(params: {
    authToken: string;
    orderId: number;
    amountCents: number;
    currency: string;
    billingData: {
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
    };
    expirationSeconds?: number;
}): Promise<string> {
    const config = getConfig();

    const response = await axios.post(`${PAYMOB_API_BASE}/acceptance/payment_keys`, {
        auth_token: params.authToken,
        amount_cents: params.amountCents,
        expiration: params.expirationSeconds || 3600, // 1 hour default
        order_id: params.orderId,
        billing_data: {
            first_name: params.billingData.first_name,
            last_name: params.billingData.last_name,
            email: params.billingData.email,
            phone_number: params.billingData.phone_number,
            apartment: 'NA',
            floor: 'NA',
            street: 'NA',
            building: 'NA',
            shipping_method: 'NA',
            postal_code: 'NA',
            city: 'NA',
            country: 'NA',
            state: 'NA',
        },
        currency: params.currency,
        integration_id: config.integrationId,
    });

    return response.data.token;
}

/**
 * Create a full checkout session — combines all 3 steps
 * Returns an iframe URL for the user to complete payment
 */
export async function createCheckoutSession(params: {
    amountCents: number;
    currency: string;
    merchantOrderId: string;
    billingData: {
        first_name: string;
        last_name: string;
        email: string;
        phone_number: string;
    };
}): Promise<{
    iframeUrl: string;
    paymentToken: string;
    paymobOrderId: number;
}> {
    const config = getConfig();

    // Step 1: Auth
    const authToken = await getAuthToken();

    // Step 2: Register order
    const { orderId } = await registerOrder({
        authToken,
        amountCents: params.amountCents,
        currency: params.currency,
        merchantOrderId: params.merchantOrderId,
    });

    // Step 3: Payment key
    const paymentToken = await getPaymentKey({
        authToken,
        orderId,
        amountCents: params.amountCents,
        currency: params.currency,
        billingData: params.billingData,
    });

    // Build iframe URL
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${config.iframeId}?payment_token=${paymentToken}`;

    return {
        iframeUrl,
        paymentToken,
        paymobOrderId: orderId,
    };
}

/**
 * Verify Paymob HMAC signature on webhook callback
 * The HMAC is calculated from specific fields in a specific order
 */
export function verifyHmac(params: {
    amount_cents: string;
    created_at: string;
    currency: string;
    error_occured: string;
    has_parent_transaction: string;
    id: string;
    integration_id: string;
    is_3d_secure: string;
    is_auth: string;
    is_capture: string;
    is_refunded: string;
    is_standalone_payment: string;
    is_voided: string;
    order_id: string;
    owner: string;
    pending: string;
    source_data_pan: string;
    source_data_sub_type: string;
    source_data_type: string;
    success: string;
}, receivedHmac: string): boolean {
    const config = getConfig();

    // Paymob requires concatenating these fields in THIS specific order
    const concatenated = [
        params.amount_cents,
        params.created_at,
        params.currency,
        params.error_occured,
        params.has_parent_transaction,
        params.id,
        params.integration_id,
        params.is_3d_secure,
        params.is_auth,
        params.is_capture,
        params.is_refunded,
        params.is_standalone_payment,
        params.is_voided,
        params.order_id,
        params.owner,
        params.pending,
        params.source_data_pan,
        params.source_data_sub_type,
        params.source_data_type,
        params.success,
    ].join('');

    const calculatedHmac = crypto
        .createHmac('sha512', config.hmacSecret)
        .update(concatenated)
        .digest('hex');

    return calculatedHmac === receivedHmac;
}

/**
 * Get transaction details from Paymob
 */
export async function getTransaction(transactionId: string): Promise<any> {
    const authToken = await getAuthToken();

    const response = await axios.get(
        `${PAYMOB_API_BASE}/acceptance/transactions/${transactionId}`,
        {
            headers: { Authorization: `Bearer ${authToken}` },
        }
    );

    return response.data;
}
