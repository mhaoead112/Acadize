/**
 * zoom-webhook.routes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Receives and verifies all Zoom webhook events.
 *
 * Mounted at:  POST /api/webhooks/zoom
 *
 * Security model
 * ──────────────
 *  1. Zoom's one-time URL-validation challenge is handled before signature
 *     verification (Zoom spec requires this to be answered without auth).
 *  2. Every other request is verified with HMAC-SHA256 using the shared
 *     secret stored in ZOOM_WEBHOOK_SECRET.
 *  3. The x-zm-request-timestamp header must be within 5 minutes of now
 *     to prevent replay attacks.
 *  4. Invalid signatures are rejected with HTTP 401.
 *
 * Processing model
 * ────────────────
 *  • We always ACK Zoom with HTTP 200 immediately after passing the security
 *    checks. Zoom treats any non-2xx as a failure and will retry, which we
 *    want to avoid for business-logic errors.
 *  • The zoom.service handlers are invoked via `setImmediate` so they never
 *    block the response.
 *
 * Environment variables
 * ─────────────────────
 *  ZOOM_WEBHOOK_SECRET   – Secret Token displayed in Zoom Marketplace app
 *                          Feature → Event Subscriptions (REQUIRED in prod)
 *  ZOOM_ACCOUNT_ID       – Used for Server-to-Server OAuth token fetching
 *  ZOOM_CLIENT_ID        – OAuth client credential
 *  ZOOM_CLIENT_SECRET    – OAuth client credential
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { handleZoomWebhook, ZoomWebhookPayload } from '../services/zoom.service.js';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Structured logger (keeps same style as zoom.service.ts)
// ─────────────────────────────────────────────────────────────────────────────

function log(
    level: 'info' | 'warn' | 'error',
    msg: string,
    meta?: Record<string, unknown>,
): void {
    const entry = {
        ts: new Date().toISOString(),
        level,
        context: 'zoom-webhook.routes',
        msg,
        ...meta,
    };
    if (level === 'error') { console.error('[zoom-webhook]', JSON.stringify(entry)); return; }
    if (level === 'warn') { console.warn('[zoom-webhook]', JSON.stringify(entry)); return; }
    console.info('[zoom-webhook]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC-SHA256 signature verification
//
// Zoom signs every request:
//   x-zm-signature         = "v0=<hex-digest>"
//   x-zm-request-timestamp = unix-epoch-seconds (string)
//
// The message to be signed is:  "v0:{timestamp}:{rawBody}"
//
// We rely on req.rawBody (Buffer → string) written by the express.json verify
// callback in index.ts. If that isn't present we re-serialise req.body as a
// safe fallback (accurate for well-formed JSON with no exotic whitespace).
// ─────────────────────────────────────────────────────────────────────────────

function verifySignature(req: Request): { valid: boolean; reason?: string } {
    const secret = process.env.ZOOM_WEBHOOK_SECRET;

    if (!secret) {
        log('warn', 'ZOOM_WEBHOOK_SECRET not set — skipping verification (dev-only, NOT safe for production)');
        return { valid: true };
    }

    const signature = req.headers['x-zm-signature'] as string | undefined;
    const timestamp = req.headers['x-zm-request-timestamp'] as string | undefined;

    if (!signature || !timestamp) {
        return { valid: false, reason: 'Missing x-zm-signature or x-zm-request-timestamp header' };
    }

    // ── Replay-attack guard ────────────────────────────────────────────────
    const tsSeconds = parseInt(timestamp, 10);
    if (Number.isNaN(tsSeconds)) {
        return { valid: false, reason: 'x-zm-request-timestamp is not a number' };
    }
    const ageSecs = Math.abs(Date.now() / 1000 - tsSeconds);
    if (ageSecs > 300) {
        return { valid: false, reason: `Timestamp too old (${Math.round(ageSecs)}s > 300s)` };
    }

    // ── Digest ─────────────────────────────────────────────────────────────
    const rawBody: string = (req as any).rawBody ?? JSON.stringify(req.body);
    const message = `v0:${timestamp}:${rawBody}`;
    const expected = `v0=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`;

    // timingSafeEqual requires same-length Buffers
    try {
        const sigBuf = Buffer.from(signature);
        const expBuf = Buffer.from(expected);
        if (sigBuf.length !== expBuf.length) {
            return { valid: false, reason: 'Signature length mismatch' };
        }
        return { valid: crypto.timingSafeEqual(sigBuf, expBuf) };
    } catch {
        return { valid: false, reason: 'Signature comparison failed' };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Env-var sanity check (warn once at startup if keys are absent)
// ─────────────────────────────────────────────────────────────────────────────

const EXPECTED_ENV = [
    'ZOOM_WEBHOOK_SECRET',
    'ZOOM_ACCOUNT_ID',
    'ZOOM_CLIENT_ID',
    'ZOOM_CLIENT_SECRET',
] as const;

for (const key of EXPECTED_ENV) {
    if (!process.env[key]) {
        log('warn', `Environment variable ${key} is not set`, { required: key });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/webhooks/zoom
// ─────────────────────────────────────────────────────────────────────────────

router.post('/', async (req: Request, res: Response) => {
    const body = req.body as ZoomWebhookPayload & { payload?: any };
    const event = body?.event ?? 'unknown';
    const reqId = req.headers['x-request-id'] ?? crypto.randomUUID();

    // ── 1. URL-validation challenge ────────────────────────────────────────
    // Zoom fires this once during webhook endpoint setup. It must be answered
    // before regular signature verification is enforced (Zoom spec §3.2).
    if (event === 'endpoint.url_validation') {
        const secret = process.env.ZOOM_WEBHOOK_SECRET ?? '';
        const plainToken = body.payload?.plainToken ?? '';

        const encryptedToken = crypto
            .createHmac('sha256', secret)
            .update(plainToken)
            .digest('hex');

        log('info', 'URL validation challenge received', { reqId, plainToken });

        return res.status(200).json({ plainToken, encryptedToken });
    }

    // ── 2. Log the inbound event ───────────────────────────────────────────
    const meetingId = body?.payload?.object?.id;
    log('info', `Event received: ${event}`, {
        reqId,
        event,
        meetingId: String(meetingId ?? 'n/a'),
        ts: body?.event_ts ?? null,
    });

    // ── 3. Signature verification ──────────────────────────────────────────
    const { valid, reason } = verifySignature(req);
    if (!valid) {
        log('warn', 'Rejected: signature verification failed', { reqId, event, reason });
        return res.status(401).json({ error: 'Invalid webhook signature', reason });
    }

    // ── 4. Immediate ACK ───────────────────────────────────────────────────
    // Zoom retries on non-2xx. We always ACK before doing heavy work.
    res.status(200).json({ received: true, event, reqId });

    // ── 5. Async dispatch ──────────────────────────────────────────────────
    setImmediate(async () => {
        try {
            await handleZoomWebhook(body as ZoomWebhookPayload);
            log('info', `Event processed: ${event}`, { reqId, event, meetingId: String(meetingId ?? 'n/a') });
        } catch (err) {
            log('error', `Unhandled error processing event: ${event}`, {
                reqId,
                event,
                error: String(err),
                stack: err instanceof Error ? err.stack : undefined,
            });
        }
    });
});

export default router;
