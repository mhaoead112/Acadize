// server/src/api/attendance.routes.ts
//
// Endpoints
// ─────────────────────────────────────────────────────────────────
//  POST /api/attendance/scan                       Student: scan QR
//  GET  /api/attendance/session/:sessionId         Attendance list for a session
//  GET  /api/attendance/my                         Student's own attendance history
//  POST /api/attendance/manual                     Teacher/Admin: manual override
//
//  GET  /api/sessions/:id/qr                       Teacher: get current QR token
//  POST /api/sessions/:id/qr/rotate               Teacher: force-rotate QR token
// ─────────────────────────────────────────────────────────────────

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { db } from '../db/index.js';
import {
    sessions,
    attendanceRecords,
    qrTokens,
    enrollments,
    courses,
    users,
} from '../db/schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { validateQrScan, QrError } from '../services/qr.service.js';
import { generateQrToken, rotateQrToken } from '../services/qr.service.js';
import {
    getAttendanceSummary,
    getSessionReport,
    exportToExcel,
    exportToPdf,
} from '../services/attendance-report.service.js';
import {
    getAdminOverview,
    getAdminAtRiskAggregated,
    exportAdminFullReport,
    exportAtRiskToExcel,
} from '../services/admin-attendance.service.js';

// ─────────────────────────────────────────────────────────────────────────────
// Router setup
// ─────────────────────────────────────────────────────────────────────────────

export const attendanceRouter = express.Router();
export const sessionQrRouter = express.Router({ mergeParams: true });

const requireAuth = [isAuthenticated, requireSubscription];

function requireAdmin(req: Request, res: Response, next: express.NextFunction) {
    const user = getUser(req);
    if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    next();
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers — identical to session.routes.ts conventions
// ─────────────────────────────────────────────────────────────────────────────

type AuthUser = { id: string; role: 'student' | 'teacher' | 'admin' | 'parent'; organizationId: string };

const getUser = (req: Request): AuthUser => (req as any).user as AuthUser;
const getOrgId = (req: Request): string | undefined => (req as any).tenant?.organizationId;

// ─────────────────────────────────────────────────────────────────────────────
// Per-user in-process rate limiter for /scan
// 5 requests per 60 s per user — supplement to the service-level limit (3/min)
// so the route layer blocks before even hitting service logic.
// Replace with Redis in a multi-node setup.
// ─────────────────────────────────────────────────────────────────────────────

const SCAN_RL_MAX = 5;
const SCAN_RL_WINDOW_MS = 60_000;

interface ScanRlEntry { count: number; windowStart: number }
const scanRlStore = new Map<string, ScanRlEntry>();

function applyScanRateLimit(userId: string, res: Response): boolean {
    const now = Date.now();
    const entry = scanRlStore.get(userId);

    if (!entry || now - entry.windowStart > SCAN_RL_WINDOW_MS) {
        scanRlStore.set(userId, { count: 1, windowStart: now });
        return false; // not limited
    }
    if (entry.count >= SCAN_RL_MAX) {
        const retryAfterSec = Math.ceil((SCAN_RL_WINDOW_MS - (now - entry.windowStart)) / 1000);
        res.setHeader('Retry-After', String(retryAfterSec));
        res.status(429).json({
            message: `Too many scan attempts. Try again in ${retryAfterSec}s.`,
            code: 'RATE_LIMITED',
        });
        return true; // limited — caller must return
    }
    entry.count += 1;
    return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error → HTTP status mapper (handles QrError + generic errors)
// ─────────────────────────────────────────────────────────────────────────────

function handleError(res: Response, error: unknown, prefix: string): Response {
    console.error(`[attendance.routes] ${prefix}:`, error);
    if (error instanceof QrError) {
        return res.status(error.statusCode).json({ message: error.message, code: error.code });
    }
    const msg = (error as any)?.message ?? 'An unexpected error occurred.';
    const status =
        msg.includes('denied') || msg.includes('Forbidden') ? 403 :
            msg.includes('not found') ? 404 :
                500;
    return res.status(status).json({ message: msg });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/scan
// Body: { token: string, sessionId: string, gpsLat?: number, gpsLng?: number }
// Auth: any authenticated user (student expected)
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.post('/scan', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);

        // Route-level rate limit (5/min) — service adds a tighter 3/min guard
        if (applyScanRateLimit(user.id, res)) return;

        const { token, sessionId, gpsLat, gpsLng } = req.body;

        if (!token || !sessionId) {
            return res.status(400).json({
                message: 'Missing required fields: token, sessionId.',
                code: 'MISSING_FIELDS',
            });
        }

        // Optional GPS — validate types if provided
        const parsedLat = gpsLat !== undefined ? Number(gpsLat) : undefined;
        const parsedLng = gpsLng !== undefined ? Number(gpsLng) : undefined;

        if (parsedLat !== undefined && !isFinite(parsedLat)) {
            return res.status(400).json({ message: 'gpsLat must be a valid number.', code: 'INVALID_GPS' });
        }
        if (parsedLng !== undefined && !isFinite(parsedLng)) {
            return res.status(400).json({ message: 'gpsLng must be a valid number.', code: 'INVALID_GPS' });
        }

        const result = await validateQrScan({
            token,
            sessionId,
            userId: user.id,
            gpsLat: parsedLat,
            gpsLng: parsedLng,
        });

        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error, 'POST /scan');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/session/:sessionId
// Teacher/Admin: full list with student details
// Student: only their own record for this session
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/session/:sessionId', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { sessionId } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        // Verify session exists and belongs to this org
        const [session] = await db
            .select({
                id: sessions.id,
                organizationId: sessions.organizationId,
                courseId: sessions.courseId,
                status: sessions.status,
                teacherId: courses.teacherId,
                createdBy: sessions.createdBy,
                title: sessions.title,
                startTime: sessions.startTime,
                endTime: sessions.endTime,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, sessionId), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Students can only see their own record
        if (user.role === 'student') {
            const [record] = await db
                .select({
                    id: attendanceRecords.id,
                    sessionId: attendanceRecords.sessionId,
                    userId: attendanceRecords.userId,
                    joinTime: attendanceRecords.joinTime,
                    leaveTime: attendanceRecords.leaveTime,
                    durationMinutes: attendanceRecords.durationMinutes,
                    attendancePercent: attendanceRecords.attendancePercent,
                    status: attendanceRecords.status,
                    checkInMethod: attendanceRecords.checkInMethod,
                    gpsValid: attendanceRecords.gpsValid,
                    createdAt: attendanceRecords.createdAt,
                })
                .from(attendanceRecords)
                .where(
                    and(
                        eq(attendanceRecords.sessionId, sessionId),
                        eq(attendanceRecords.userId, user.id),
                    ),
                )
                .limit(1);

            return res.status(200).json({
                session: {
                    id: session.id,
                    title: session.title,
                    status: session.status,
                    startTime: session.startTime,
                    endTime: session.endTime,
                },
                record: record ?? null,
            });
        }

        // Teachers can only see sessions they own (or admin sees all)
        if (user.role === 'teacher') {
            const isOwner = session.teacherId === user.id || session.createdBy === user.id;
            if (!isOwner) {
                return res.status(403).json({ message: 'Access denied: you do not own this session.' });
            }
        }

        // Teacher / Admin: full roster including absent students
        const allEnrolled = await db
            .select({
                id: attendanceRecords.id,
                userId: users.id,
                studentName: users.fullName,
                studentEmail: users.email,
                joinTime: attendanceRecords.joinTime,
                leaveTime: attendanceRecords.leaveTime,
                durationMinutes: attendanceRecords.durationMinutes,
                attendancePercent: attendanceRecords.attendancePercent,
                status: attendanceRecords.status,
                checkInMethod: attendanceRecords.checkInMethod,
                gpsLat: attendanceRecords.gpsLat,
                gpsLng: attendanceRecords.gpsLng,
                gpsValid: attendanceRecords.gpsValid,
                createdAt: attendanceRecords.createdAt,
            })
            .from(enrollments)
            .innerJoin(users, eq(enrollments.studentId, users.id))
            .leftJoin(attendanceRecords, and(
                eq(attendanceRecords.userId, enrollments.studentId),
                eq(attendanceRecords.sessionId, sessionId)
            ))
            .where(eq(enrollments.courseId, session.courseId))
            .orderBy(users.fullName);

        // Map records to ensure a default status exists
        const records = allEnrolled.map(r => ({
            ...r,
            status: r.status || 'absent'
        }));

        // Summary counts
        const total = records.length;
        const present = records.filter((r) => r.status === 'present').length;
        const late = records.filter((r) => r.status === 'late').length;
        const absent = records.filter((r) => r.status === 'absent').length;

        return res.status(200).json({
            session: {
                id: session.id,
                title: session.title,
                status: session.status,
                startTime: session.startTime,
                endTime: session.endTime,
            },
            summary: { total, present, late, absent },
            records,
        });
    } catch (error) {
        return handleError(res, error, 'GET /attendance/session/:sessionId');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/my
// Query: courseId?, dateFrom?, dateTo?
// Returns authenticated student's attendance history
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/my', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const { courseId, dateFrom, dateTo } = req.query;

        // Build conditions — always scoped to this user
        const conditions = [
            eq(attendanceRecords.userId, user.id),
            eq(sessions.organizationId, orgId),
        ];

        if (courseId) {
            conditions.push(eq(sessions.courseId, String(courseId)));
        }
        if (dateFrom) {
            conditions.push(gte(sessions.startTime, new Date(String(dateFrom))));
        }
        if (dateTo) {
            conditions.push(lte(sessions.startTime, new Date(String(dateTo))));
        }

        const records = await db
            .select({
                id: attendanceRecords.id,
                sessionId: attendanceRecords.sessionId,
                sessionTitle: sessions.title,
                sessionType: sessions.sessionType,
                courseId: sessions.courseId,
                courseTitle: courses.title,
                sessionStart: sessions.startTime,
                sessionEnd: sessions.endTime,
                joinTime: attendanceRecords.joinTime,
                leaveTime: attendanceRecords.leaveTime,
                durationMinutes: attendanceRecords.durationMinutes,
                attendancePercent: attendanceRecords.attendancePercent,
                status: attendanceRecords.status,
                checkInMethod: attendanceRecords.checkInMethod,
                gpsValid: attendanceRecords.gpsValid,
                createdAt: attendanceRecords.createdAt,
            })
            .from(attendanceRecords)
            .innerJoin(sessions, eq(attendanceRecords.sessionId, sessions.id))
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(...conditions))
            .orderBy(desc(sessions.startTime));

        // Per-course summary
        const courseMap = new Map<string, { courseId: string; courseTitle: string; total: number; present: number; late: number; absent: number }>();
        for (const r of records) {
            if (!courseMap.has(r.courseId)) {
                courseMap.set(r.courseId, { courseId: r.courseId, courseTitle: r.courseTitle, total: 0, present: 0, late: 0, absent: 0 });
            }
            const c = courseMap.get(r.courseId)!;
            c.total += 1;
            if (r.status === 'present') c.present += 1;
            else if (r.status === 'late') c.late += 1;
            else if (r.status === 'absent') c.absent += 1;
        }

        return res.status(200).json({
            records,
            courseSummaries: Array.from(courseMap.values()),
        });
    } catch (error) {
        return handleError(res, error, 'GET /attendance/my');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/attendance/manual
// Body: { sessionId, userId, status: 'present'|'absent'|'late'|'excused' }
// Teacher/Admin only — manual attendance override
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.post('/manual', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const { sessionId, userId: targetUserId, status } = req.body;

        if (!sessionId || !targetUserId || !status) {
            return res.status(400).json({
                message: 'Missing required fields: sessionId, userId, status.',
            });
        }

        const validStatuses = ['present', 'absent', 'late', 'excused'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}.`,
            });
        }

        // Verify session belongs to this org and caller owns it
        const [session] = await db
            .select({
                id: sessions.id,
                organizationId: sessions.organizationId,
                courseId: sessions.courseId,
                createdBy: sessions.createdBy,
                teacherId: courses.teacherId,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, sessionId), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        if (user.role === 'teacher') {
            const isOwner = session.teacherId === user.id || session.createdBy === user.id;
            if (!isOwner) {
                return res.status(403).json({ message: 'Access denied: you do not own this session.' });
            }
        }

        // Verify target user is enrolled in this course
        const [enrollment] = await db
            .select({ courseId: enrollments.courseId })
            .from(enrollments)
            .where(and(eq(enrollments.studentId, targetUserId), eq(enrollments.courseId, session.courseId)))
            .limit(1);

        if (!enrollment) {
            return res.status(400).json({
                message: 'Target user is not enrolled in this course.',
            });
        }

        const now = new Date();

        // Upsert: update if record exists, insert if not
        const [existing] = await db
            .select({ id: attendanceRecords.id })
            .from(attendanceRecords)
            .where(
                and(
                    eq(attendanceRecords.sessionId, sessionId),
                    eq(attendanceRecords.userId, targetUserId),
                ),
            )
            .limit(1);

        if (existing) {
            await db
                .update(attendanceRecords)
                .set({ status: status as any })
                .where(eq(attendanceRecords.id, existing.id));

            return res.status(200).json({
                message: `Attendance updated to "${status}" for user ${targetUserId}.`,
                attendanceId: existing.id,
                updated: true,
            });
        } else {
            // Create a new manual record
            const [inserted] = await db
                .insert(attendanceRecords)
                .values({
                    sessionId,
                    userId: targetUserId,
                    joinTime: now,
                    status: status as any,
                    checkInMethod: 'manual',
                } as any)
                .returning({ id: attendanceRecords.id });

            return res.status(201).json({
                message: `Attendance manually recorded as "${status}" for user ${targetUserId}.`,
                attendanceId: inserted.id,
                updated: false,
            });
        }
    } catch (error) {
        return handleError(res, error, 'POST /attendance/manual');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// QR sub-router — mounted at /api/sessions/:id/qr by the main app
// mergeParams: true ensures :id is available from the parent route
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/sessions/:id/qr
// Returns the current active QR token and expiry for a session.
// If rotation is enabled, also returns the next rotation time.
// Teacher (session owner) only.
// ─────────────────────────────────────────────────────────────────────────────

sessionQrRouter.get('/', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const sessionId = req.params.id;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const [session] = await db
            .select({
                id: sessions.id,
                organizationId: sessions.organizationId,
                status: sessions.status,
                sessionType: sessions.sessionType,
                qrToken: sessions.qrToken,
                qrExpiresAt: sessions.qrExpiresAt,
                qrExpiryMinutes: sessions.qrExpiryMinutes,
                qrRotationEnabled: sessions.qrRotationEnabled,
                qrRotationIntervalSeconds: sessions.qrRotationIntervalSeconds,
                createdBy: sessions.createdBy,
                teacherId: courses.teacherId,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, sessionId), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        if (user.role === 'teacher') {
            const isOwner = session.teacherId === user.id || session.createdBy === user.id;
            if (!isOwner) {
                return res.status(403).json({ message: 'Access denied: you do not own this session.' });
            }
        }
        if (session.sessionType !== 'physical') {
            return res.status(400).json({ message: 'QR tokens are only available for physical sessions.' });
        }
        if (session.status !== 'active') {
            return res.status(400).json({
                message: `Session is not active (status: ${session.status}). Start the session first.`,
            });
        }

        // Fetch the latest ACTIVE (unused, non-expired) token from qrTokens table
        const now = new Date();
        const [latestToken] = await db
            .select({
                id: qrTokens.id,
                token: qrTokens.token,
                expiresAt: qrTokens.expiresAt,
                createdAt: qrTokens.createdAt,
            })
            .from(qrTokens)
            .where(
                and(
                    eq(qrTokens.sessionId, sessionId),
                    eq(qrTokens.used, false),
                ),
            )
            .orderBy(desc(qrTokens.createdAt))
            .limit(1);

        // If no valid token exists (expired or never generated), mint a fresh one
        if (!latestToken || latestToken.expiresAt <= now) {
            const generated = await generateQrToken(sessionId);
            return res.status(200).json({
                token: generated.token,
                expiresAt: generated.expiresAt,
                qrPayload: generated.qrPayload,
                rotationEnabled: session.qrRotationEnabled,
                rotationIntervalSeconds: session.qrRotationEnabled
                    ? session.qrRotationIntervalSeconds
                    : null,
                autoGenerated: true,
            });
        }

        const qrPayload = JSON.stringify({ t: latestToken.token, s: sessionId, ts: Date.now() });

        return res.status(200).json({
            token: latestToken.token,
            expiresAt: latestToken.expiresAt,
            qrPayload,
            rotationEnabled: session.qrRotationEnabled,
            rotationIntervalSeconds: session.qrRotationEnabled
                ? session.qrRotationIntervalSeconds
                : null,
            autoGenerated: false,
        });
    } catch (error) {
        return handleError(res, error, 'GET /sessions/:id/qr');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/sessions/:id/qr/rotate
// Force-rotate the QR token for a session.
// Expires all current unused tokens and mints a new one.
// Teacher (session owner) or Admin only.
// ─────────────────────────────────────────────────────────────────────────────

sessionQrRouter.post('/rotate', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const sessionId = req.params.id;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        // Ownership check
        const [session] = await db
            .select({
                id: sessions.id,
                organizationId: sessions.organizationId,
                status: sessions.status,
                sessionType: sessions.sessionType,
                createdBy: sessions.createdBy,
                teacherId: courses.teacherId,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, sessionId), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }
        if (user.role === 'teacher') {
            const isOwner = session.teacherId === user.id || session.createdBy === user.id;
            if (!isOwner) {
                return res.status(403).json({ message: 'Access denied: you do not own this session.' });
            }
        }
        if (session.sessionType !== 'physical') {
            return res.status(400).json({ message: 'QR rotation is only available for physical sessions.' });
        }

        const result = await rotateQrToken(sessionId);

        return res.status(200).json({
            message: 'QR token rotated successfully.',
            token: result.token,
            expiresAt: result.expiresAt,
            qrPayload: result.qrPayload,
        });
    } catch (error) {
        return handleError(res, error, 'POST /sessions/:id/qr/rotate');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// REPORTING ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/report/summary
// Query: courseId?, dateFrom?, dateTo?, studentId?
// Teacher / Admin only — per-student attendance roll-up
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/report/summary', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        // Teachers can only see their own course summaries (admin sees all)
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const { courseId, dateFrom, dateTo, studentId } = req.query;

        // Validate date strings
        const parsedFrom = dateFrom ? new Date(String(dateFrom)) : undefined;
        const parsedTo = dateTo ? new Date(String(dateTo)) : undefined;

        if (parsedFrom && isNaN(parsedFrom.getTime())) {
            return res.status(400).json({ message: 'Invalid dateFrom — must be ISO 8601.' });
        }
        if (parsedTo && isNaN(parsedTo.getTime())) {
            return res.status(400).json({ message: 'Invalid dateTo — must be ISO 8601.' });
        }

        const summaries = await getAttendanceSummary({
            organizationId: orgId,
            courseId: courseId ? String(courseId) : undefined,
            studentId: studentId ? String(studentId) : undefined,
            dateFrom: parsedFrom,
            dateTo: parsedTo,
        });

        return res.status(200).json({ summaries, count: summaries.length });
    } catch (error) {
        return handleError(res, error, 'GET /attendance/report/summary');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/report/session/:sessionId
// Teacher / Admin only — full roster for one session
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/report/session/:sessionId', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { sessionId } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        // Verify session belongs to this org before returning data
        const [session] = await db
            .select({ organizationId: sessions.organizationId, createdBy: sessions.createdBy, teacherId: courses.teacherId })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, sessionId), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Teachers can only report on their own sessions
        if (user.role === 'teacher') {
            const isOwner = session.teacherId === user.id || session.createdBy === user.id;
            if (!isOwner) {
                return res.status(403).json({ message: 'Access denied: you do not own this session.' });
            }
        }

        const report = await getSessionReport(sessionId);
        return res.status(200).json(report);
    } catch (error) {
        return handleError(res, error, 'GET /attendance/report/session/:sessionId');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/attendance/report/export
// Query: format=xlsx|pdf (default xlsx), courseId?, dateFrom?, dateTo?
// Teacher / Admin only — triggers a file download
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/report/export', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const { format = 'xlsx', courseId, dateFrom, dateTo } = req.query;

        const parsedFrom = dateFrom ? new Date(String(dateFrom)) : undefined;
        const parsedTo = dateTo ? new Date(String(dateTo)) : undefined;

        if (parsedFrom && isNaN(parsedFrom.getTime())) {
            return res.status(400).json({ message: 'Invalid dateFrom — must be ISO 8601.' });
        }
        if (parsedTo && isNaN(parsedTo.getTime())) {
            return res.status(400).json({ message: 'Invalid dateTo — must be ISO 8601.' });
        }

        const exportParams = {
            organizationId: orgId,
            courseId: courseId ? String(courseId) : undefined,
            dateFrom: parsedFrom,
            dateTo: parsedTo,
        };

        const dateSuffix = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        if (format === 'pdf') {
            // exportToPdf always throws 501 until implemented
            await exportToPdf(exportParams);
        }

        // Default: xlsx
        const buffer = await exportToExcel(exportParams);
        const filename = `attendance-report-${dateSuffix}.xlsx`;

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'no-store');

        return res.status(200).end(buffer);
    } catch (error) {
        // Handle the 501 from exportToPdf gracefully
        if ((error as any)?.statusCode === 501) {
            return res.status(501).json({
                message: (error as Error).message,
                code: (error as any).code,
            });
        }
        return handleError(res, error, 'GET /attendance/report/export');
    }
});

// ─────────────────────────────────────────────────────────────────────────────
// Admin attendance analytics (admin only)
// ─────────────────────────────────────────────────────────────────────────────

attendanceRouter.get('/admin/overview', ...requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req) ?? (getUser(req) as any).organizationId;
        if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

        const { dateFrom, dateTo, courseId, teacherId, grade } = req.query;
        const dateFromParsed = dateFrom ? new Date(String(dateFrom)) : undefined;
        const dateToParsed = dateTo ? new Date(String(dateTo)) : undefined;
        if (dateFromParsed && isNaN(dateFromParsed.getTime())) return res.status(400).json({ message: 'Invalid dateFrom.' });
        if (dateToParsed && isNaN(dateToParsed.getTime())) return res.status(400).json({ message: 'Invalid dateTo.' });

        const result = await getAdminOverview({
            organizationId: orgId,
            dateFrom: dateFromParsed,
            dateTo: dateToParsed,
            courseId: courseId ? String(courseId) : undefined,
            teacherId: teacherId ? String(teacherId) : undefined,
            grade: grade ? String(grade) : undefined,
        });
        return res.status(200).json(result);
    } catch (error) {
        return handleError(res, error, 'GET /attendance/admin/overview');
    }
});

attendanceRouter.get('/admin/at-risk', ...requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req) ?? (getUser(req) as any).organizationId;
        if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

        const { threshold, dateFrom, dateTo, courseId, teacherId, grade } = req.query;
        const thresholdNum = threshold ? Math.max(0, Math.min(100, Number(threshold))) : 75;
        const dateFromParsed = dateFrom ? new Date(String(dateFrom)) : undefined;
        const dateToParsed = dateTo ? new Date(String(dateTo)) : undefined;

        const result = await getAdminAtRiskAggregated({
            organizationId: orgId,
            threshold: thresholdNum,
            dateFrom: dateFromParsed,
            dateTo: dateToParsed,
            courseId: courseId ? String(courseId) : undefined,
            teacherId: teacherId ? String(teacherId) : undefined,
            grade: grade ? String(grade) : undefined,
        });
        return res.status(200).json({ atRisk: result });
    } catch (error) {
        return handleError(res, error, 'GET /attendance/admin/at-risk');
    }
});

attendanceRouter.get('/admin/export', ...requireAuth, requireAdmin, async (req: Request, res: Response) => {
    try {
        const orgId = getOrgId(req) ?? (getUser(req) as any).organizationId;
        if (!orgId) return res.status(400).json({ message: 'Organization context required.' });

        const { format = 'xlsx', dateFrom, dateTo, courseId, atRiskOnly } = req.query;
        const dateFromParsed = dateFrom ? new Date(String(dateFrom)) : undefined;
        const dateToParsed = dateTo ? new Date(String(dateTo)) : undefined;
        const dateSuffix = new Date().toISOString().slice(0, 10);

        if (atRiskOnly === '1' || atRiskOnly === 'true') {
            const buffer = await exportAtRiskToExcel({
                organizationId: orgId,
                threshold: 75,
                dateFrom: dateFromParsed,
                dateTo: dateToParsed,
                courseId: courseId ? String(courseId) : undefined,
            });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="attendance-at-risk-${dateSuffix}.xlsx"`);
            res.setHeader('Content-Length', String(buffer.length));
            res.setHeader('Cache-Control', 'no-store');
            return res.status(200).end(buffer);
        }

        const buffer = await exportAdminFullReport({ organizationId: orgId, courseId: courseId ? String(courseId) : undefined, dateFrom: dateFromParsed, dateTo: dateToParsed });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${dateSuffix}.xlsx"`);
        res.setHeader('Content-Length', String(buffer.length));
        res.setHeader('Cache-Control', 'no-store');
        return res.status(200).end(buffer);
    } catch (error) {
        return handleError(res, error, 'GET /attendance/admin/export');
    }
});

export default attendanceRouter;

