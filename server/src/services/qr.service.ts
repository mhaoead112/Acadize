/**
 * qr.service.ts
 * ─────────────────────────────────────────────────────────────────────────
 * Cryptographically secure QR-based attendance service.
 *
 * Responsibilities
 *   • generateQrToken  — mint a new single-session-bound token
 *   • rotateQrToken    — cycle the live token for a session (called by setInterval)
 *   • validateQrScan   — full validation pipeline: session → token → enrollment
 *                        → duplicate-check → GPS → create attendance record
 *
 * Security posture
 *   − 256-bit random token (crypto.randomBytes) — not guessable
 *   − Per-user scan-attempt rate-limit (in-process Map, 3 req/60 s)
 *   − Replay attack mitigation: usedBy/used tracked per scan
 *   − Expiry enforced server-side
 *   − All attempts (success + failure) written to console audit log
 *   − Old unused tokens are expired on rotation (not deleted, for audit)
 * ─────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import { db } from '../db/index.js';
import {
    sessions,
    qrTokens,
    attendanceRecords,
    enrollments,
    courses,
} from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { validateGpsLocation } from './gps.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface QrGenerateResult {
    /** Raw 64-char hex token (display in QR code) */
    token: string;
    expiresAt: Date;
    /** JSON payload to embed in the QR image */
    qrPayload: string;
}

export interface QrScanParams {
    token: string;
    sessionId: string;
    userId: string;
    /** Student's GPS latitude (optional — only required when session.gpsRequired=true) */
    gpsLat?: number;
    /** Student's GPS longitude */
    gpsLng?: number;
}

export interface QrScanResult {
    success: true;
    attendanceId: string;
    message: string;
    gpsValid?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Process Rate-Limit Store
// Map<userId, { count: number; windowStart: number }>
// Resets every 60 seconds per user — good enough for a Node monolith.
// Replace with Redis INCR + TTL in a multi-instance deployment.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute

interface RateLimitEntry {
    count: number;
    windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string): void {
    const now = Date.now();
    const entry = rateLimitStore.get(userId);

    if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
        rateLimitStore.set(userId, { count: 1, windowStart: now });
        return; // first attempt in window → OK
    }

    if (entry.count >= RATE_LIMIT_MAX) {
        const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - entry.windowStart)) / 1000);
        throw new QrError(
            `Too many scan attempts. Try again in ${retryAfterSec}s.`,
            'RATE_LIMITED',
            429,
        );
    }

    entry.count += 1;
}

// GPS distance calculation is handled by gps.service.ts (imported above).

// ─────────────────────────────────────────────────────────────────────────────
// Typed error class — downstream routes can inspect `statusCode` and `code`
// ─────────────────────────────────────────────────────────────────────────────

export class QrError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly statusCode: number = 400,
    ) {
        super(message);
        this.name = 'QrError';
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Audit logger
// ─────────────────────────────────────────────────────────────────────────────

type AuditOutcome = 'SUCCESS' | 'FAILURE';

function auditLog(
    outcome: AuditOutcome,
    userId: string,
    sessionId: string,
    reason: string,
    meta?: Record<string, unknown>,
) {
    const entry = {
        ts: new Date().toISOString(),
        outcome,
        userId,
        sessionId,
        reason,
        ...meta,
    };
    // In production replace with your structured logger (winston/pino)
    console.info('[QR-AUDIT]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. generateQrToken
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mint a fresh cryptographically-random token for a session.
 *
 * − Reads qrExpiryMinutes from the session row
 * − Expires (marks `expiresAt` in the past) all previous UNUSED tokens for
 *   this session so old QR images can no longer be scanned
 * − Inserts a new row in qrTokens
 *
 * Returns the raw token, its expiry, and a JSON qrPayload suitable for
 * encoding in a QR image.
 */
export async function generateQrToken(sessionId: string): Promise<QrGenerateResult> {
    // Load session — must exist and must be physical
    const [session] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            sessionType: sessions.sessionType,
            qrExpiryMinutes: sessions.qrExpiryMinutes,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!session) {
        throw new QrError('Session not found.', 'SESSION_NOT_FOUND', 404);
    }
    if (session.sessionType !== 'physical') {
        throw new QrError(
            'QR tokens are only supported for physical sessions.',
            'WRONG_SESSION_TYPE',
            400,
        );
    }
    if (session.status !== 'active') {
        throw new QrError(
            `Cannot generate a QR token for a "${session.status}" session.`,
            'SESSION_NOT_ACTIVE',
            400,
        );
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + session.qrExpiryMinutes * 60 * 1000);

    // Expire all previous unused tokens for this session
    await db
        .update(qrTokens)
        .set({ expiresAt: now }) // set expiry to now → immediately stale
        .where(
            and(
                eq(qrTokens.sessionId, sessionId),
                eq(qrTokens.used, false),
            ),
        );

    // Mint new token
    const token = crypto.randomBytes(32).toString('hex');

    await db.insert(qrTokens).values({
        sessionId,
        token,
        expiresAt,
        used: false,
    } as any);

    // Sync the session row's inline QR cache columns
    await db
        .update(sessions)
        .set({ qrToken: token, qrExpiresAt: expiresAt } as any)
        .where(eq(sessions.id, sessionId));

    const qrPayload = JSON.stringify({ t: token, s: sessionId, ts: Date.now() });

    return { token, expiresAt, qrPayload };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. rotateQrToken
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Rotate the live QR token for a session.
 *
 * Called by the server's setInterval when `qrRotationEnabled = true`.
 * Example setup (in session.routes.ts or a session scheduler):
 *
 *   const interval = setInterval(async () => {
 *     await rotateQrToken(sessionId);
 *   }, session.qrRotationIntervalSeconds * 1000);
 *
 * Design decision:
 *   − Tokens that were already SCANNED (used = true) are preserved untouched.
 *     They've fulfilled their purpose; invalidating them would be pointless.
 *   − Tokens that are still UNUSED are invalidated (expiresAt = now) so that
 *     a student who photographed the old QR image cannot scan it later.
 */
export async function rotateQrToken(sessionId: string): Promise<QrGenerateResult> {
    // Verify session is still running
    const [session] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            sessionType: sessions.sessionType,
            qrExpiryMinutes: sessions.qrExpiryMinutes,
            qrRotationEnabled: sessions.qrRotationEnabled,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!session) {
        throw new QrError('Session not found.', 'SESSION_NOT_FOUND', 404);
    }
    if (session.status !== 'active') {
        throw new QrError(
            `Rotation skipped — session status is "${session.status}".`,
            'SESSION_NOT_ACTIVE',
            400,
        );
    }

    const now = new Date();

    // Expire all UNUSED tokens (leave USED ones alone — they're audit history)
    await db
        .update(qrTokens)
        .set({ expiresAt: now })
        .where(
            and(
                eq(qrTokens.sessionId, sessionId),
                eq(qrTokens.used, false),
            ),
        );

    // Mint replacement token
    const expiresAt = new Date(now.getTime() + session.qrExpiryMinutes * 60 * 1000);
    const token = crypto.randomBytes(32).toString('hex');

    await db.insert(qrTokens).values({
        sessionId,
        token,
        expiresAt,
        used: false,
    } as any);

    // Sync session row cache
    await db
        .update(sessions)
        .set({ qrToken: token, qrExpiresAt: expiresAt } as any)
        .where(eq(sessions.id, sessionId));

    const qrPayload = JSON.stringify({ t: token, s: sessionId, ts: Date.now() });

    console.info(
        `[QR-ROTATE] session=${sessionId} new_token=${token.slice(0, 8)}… expires=${expiresAt.toISOString()}`,
    );

    return { token, expiresAt, qrPayload };
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. validateQrScan
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Full validation pipeline for a student scanning a QR code.
 *
 * Validation steps (in order — fail fast):
 *   a) Rate limit: max 3 attempts per user per 60 s
 *   b) Session exists and status = 'active'
 *   c) Token row exists in qrTokens
 *   d) Token belongs to this sessionId (no cross-session replay)
 *   e) Token is not expired  (expiresAt > now)
 *   f) Token hasn't been used already (single-use)
 *   g) Student is enrolled in the session's course
 *   h) Student has not already checked in to this session
 *   i) GPS validation (only when session.gpsRequired = true)
 *
 * On success:
 *   - Inserts / returns attendanceRecord
 *   - Marks qrToken.used = true, qrToken.usedBy = userId
 *   - Audit-logs the success
 */
export async function validateQrScan(params: QrScanParams): Promise<QrScanResult> {
    const { token, sessionId, userId } = params;

    // ── a) Rate limit ────────────────────────────────────────────────────────
    try {
        checkRateLimit(userId);
    } catch (err) {
        auditLog('FAILURE', userId, sessionId, 'RATE_LIMITED');
        throw err;
    }

    // ── b) Session exists and is active ─────────────────────────────────────
    const [session] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            sessionType: sessions.sessionType,
            courseId: sessions.courseId,
            gpsRequired: sessions.gpsRequired,
            gpsLat: sessions.gpsLat,
            gpsLng: sessions.gpsLng,
            gpsRadius: sessions.gpsRadius,
        })
        .from(sessions)
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!session) {
        auditLog('FAILURE', userId, sessionId, 'SESSION_NOT_FOUND');
        throw new QrError('Session not found.', 'SESSION_NOT_FOUND', 404);
    }
    if (session.status !== 'active') {
        auditLog('FAILURE', userId, sessionId, 'SESSION_NOT_ACTIVE', { status: session.status });
        throw new QrError(
            `Session is not currently active (status: ${session.status}).`,
            'SESSION_NOT_ACTIVE',
            400,
        );
    }

    // ── c) Token row exists ──────────────────────────────────────────────────
    const [tokenRow] = await db
        .select({
            id: qrTokens.id,
            sessionId: qrTokens.sessionId,
            token: qrTokens.token,
            expiresAt: qrTokens.expiresAt,
            used: qrTokens.used,
            usedBy: qrTokens.usedBy,
        })
        .from(qrTokens)
        .where(eq(qrTokens.token, token))
        .limit(1);

    if (!tokenRow) {
        auditLog('FAILURE', userId, sessionId, 'INVALID_TOKEN');
        throw new QrError('Invalid QR token.', 'INVALID_TOKEN', 400);
    }

    // ── d) Token belongs to this session ─────────────────────────────────────
    if (tokenRow.sessionId !== sessionId) {
        auditLog('FAILURE', userId, sessionId, 'TOKEN_SESSION_MISMATCH', {
            tokenSession: tokenRow.sessionId,
        });
        throw new QrError(
            'Token does not belong to this session.',
            'TOKEN_SESSION_MISMATCH',
            400,
        );
    }

    // ── e) Token not expired ─────────────────────────────────────────────────
    const now = new Date();
    if (tokenRow.expiresAt <= now) {
        auditLog('FAILURE', userId, sessionId, 'TOKEN_EXPIRED', {
            expiresAt: tokenRow.expiresAt.toISOString(),
        });
        throw new QrError(
            'QR code has expired. Ask your teacher to refresh it.',
            'TOKEN_EXPIRED',
            400,
        );
    }

    // ── f) Token not already used (single-use) ───────────────────────────────
    if (tokenRow.used) {
        auditLog('FAILURE', userId, sessionId, 'TOKEN_ALREADY_USED', {
            usedBy: tokenRow.usedBy,
        });
        throw new QrError(
            'This QR token has already been used.',
            'TOKEN_ALREADY_USED',
            400,
        );
    }

    // ── g) Student is enrolled in the session's course ───────────────────────
    const [enrollment] = await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .where(
            and(
                eq(enrollments.studentId, userId),
                eq(enrollments.courseId, session.courseId),
            ),
        )
        .limit(1);

    if (!enrollment) {
        auditLog('FAILURE', userId, sessionId, 'NOT_ENROLLED', { courseId: session.courseId });
        throw new QrError(
            'You are not enrolled in the course for this session.',
            'NOT_ENROLLED',
            403,
        );
    }

    // ── h) Student hasn't already checked in ─────────────────────────────────
    const [existingRecord] = await db
        .select({ id: attendanceRecords.id })
        .from(attendanceRecords)
        .where(
            and(
                eq(attendanceRecords.sessionId, sessionId),
                eq(attendanceRecords.userId, userId),
            ),
        )
        .limit(1);

    if (existingRecord) {
        auditLog('FAILURE', userId, sessionId, 'ALREADY_CHECKED_IN');
        throw new QrError(
            'You have already checked in to this session.',
            'ALREADY_CHECKED_IN',
            409,
        );
    }

    // ── i) GPS validation ────────────────────────────────────────────────────
    let gpsValid: boolean | null = null;

    if (session.gpsRequired) {
        if (params.gpsLat == null || params.gpsLng == null) {
            auditLog('FAILURE', userId, sessionId, 'GPS_REQUIRED');
            throw new QrError(
                'GPS coordinates are required for this session. Enable location access and try again.',
                'GPS_REQUIRED',
                400,
            );
        }
        if (session.gpsLat == null || session.gpsLng == null) {
            // Session misconfigured — skip GPS check rather than block students
            console.warn(
                `[QR-GPS] session=${sessionId} has gpsRequired=true but no anchor coordinates. Skipping GPS check.`,
            );
            gpsValid = null;
        } else {
            const gpsResult = validateGpsLocation({
                studentLat: params.gpsLat,
                studentLng: params.gpsLng,
                academyLat: session.gpsLat,
                academyLng: session.gpsLng,
                radiusMeters: session.gpsRadius,
            });
            gpsValid = gpsResult.valid;

            if (!gpsValid) {
                auditLog('FAILURE', userId, sessionId, 'GPS_OUT_OF_RANGE', {
                    distanceM: Math.round(gpsResult.distance),
                    radiusM: session.gpsRadius,
                    studentLat: params.gpsLat,
                    studentLng: params.gpsLng,
                });
                throw new QrError(gpsResult.message, 'GPS_OUT_OF_RANGE', 400);
            }
        }
    }

    // ── SUCCESS: write attendance record + mark token used ───────────────────
    let attendanceId: string;

    await db.transaction(async (tx) => {
        // Create attendance record — id is auto-generated by $defaultFn
        const [inserted] = await tx.insert(attendanceRecords).values({
            sessionId,
            userId,
            joinTime: now,
            status: 'present',
            checkInMethod: 'qr',
            gpsLat: params.gpsLat ?? null,
            gpsLng: params.gpsLng ?? null,
            gpsValid: gpsValid,
        } as any).returning({ id: attendanceRecords.id });

        attendanceId = inserted.id;

        // Mark token as used (per-user replay protection)
        await tx
            .update(qrTokens)
            .set({ used: true, usedBy: userId } as any)
            .where(eq(qrTokens.id, tokenRow.id));
    });

    auditLog('SUCCESS', userId, sessionId, 'CHECK_IN_OK', {
        attendanceId,
        gpsValid,
        tokenId: tokenRow.id,
    });

    return {
        success: true,
        attendanceId,
        message: 'Attendance recorded successfully.',
        gpsValid: gpsValid ?? undefined,
    };
}
