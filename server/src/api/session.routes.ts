// server/src/api/session.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { db } from '../db/index.js';
import { sessions, courses, enrollments } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import {
    createSession,
    getSession,
    listSessions,
    startSession,
    endSession,
    updateSessionConfig,
} from '../services/session.service.js';

const router = express.Router();

// Combined auth + subscription guard (same pattern as exam.routes.ts)
const requireAuth = [isAuthenticated, requireSubscription];

// ─── helpers ──────────────────────────────────────────────────
const getOrgId = (req: Request): string | undefined =>
    (req as any).tenant?.organizationId;

const getUser = (req: Request) => (req as any).user as {
    id: string;
    role: 'student' | 'teacher' | 'admin' | 'parent';
    organizationId: string;
};

// ─────────────────────────────────────────────────────────────
// POST /api/sessions
// Create a new session (teacher or admin only)
// ─────────────────────────────────────────────────────────────
router.post('/', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const { courseId, sessionType, title, startTime, endTime } = req.body;

        if (!courseId || !sessionType || !title || !startTime || !endTime) {
            return res.status(400).json({
                message: 'Missing required fields: courseId, sessionType, title, startTime, endTime.',
            });
        }
        if (!['physical', 'online'].includes(sessionType)) {
            return res.status(400).json({ message: 'sessionType must be "physical" or "online".' });
        }

        const session = await createSession({
            organizationId: orgId,
            courseId,
            createdBy: user.id,
            sessionType,
            title,
            startTime: new Date(startTime),
            endTime: new Date(endTime),
            // Physical GPS
            gpsRequired: req.body.gpsRequired,
            gpsLat: req.body.gpsLat,
            gpsLng: req.body.gpsLng,
            gpsRadius: req.body.gpsRadius,
            // Config
            minAttendancePercent: req.body.minAttendancePercent,
            qrExpiryMinutes: req.body.qrExpiryMinutes,
            qrRotationEnabled: req.body.qrRotationEnabled,
            qrRotationIntervalSeconds: req.body.qrRotationIntervalSeconds,
        });

        return res.status(201).json({ message: 'Session created successfully.', session });
    } catch (error: any) {
        console.error('[session.routes] POST /sessions:', error);
        const status = error.message?.includes('denied') ? 403
            : error.message?.includes('not found') ? 404
                : 400;
        return res.status(status).json({ message: error.message || 'Failed to create session.' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions
// List sessions — teachers see their own; admins see all in org
// Query params: courseId, status, dateFrom, dateTo, teacherId, cursor, limit
// ─────────────────────────────────────────────────────────────
router.get('/', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        // Students and parents don't have access to this endpoint
        if (user.role === 'parent') {
            return res.status(403).json({ message: 'Forbidden.' });
        }

        const teacherIdFilter =
            user.role === 'admin'
                ? (req.query.teacherId as string | undefined)
                : user.id; // teachers always scoped to themselves

        const result = await listSessions({
            organizationId: orgId,
            courseId: req.query.courseId as string | undefined,
            teacherId: teacherIdFilter,
            status: req.query.status as any,
            dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
            dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
            cursor: req.query.cursor as string | undefined,
            limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
        });

        return res.status(200).json(result);
    } catch (error: any) {
        console.error('[session.routes] GET /sessions:', error);
        return res.status(500).json({ message: error.message || 'Failed to list sessions.' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/student/active
// Student: list active sessions for enrolled courses only
// ─────────────────────────────────────────────────────────────
router.get('/student/active', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'student') {
            return res.status(403).json({ message: 'Forbidden: Students only.' });
        }

        const list = await db
            .select({
                id: sessions.id,
                title: sessions.title,
                sessionType: sessions.sessionType,
                startTime: sessions.startTime,
                endTime: sessions.endTime,
                courseId: sessions.courseId,
                courseTitle: courses.title,
                zoomJoinUrl: sessions.zoomJoinUrl,
                zoomMeetingId: sessions.zoomMeetingId,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .innerJoin(enrollments, and(
                eq(enrollments.studentId, user.id),
                eq(enrollments.courseId, sessions.courseId),
            ))
            .where(and(
                eq(sessions.organizationId, orgId),
                eq(sessions.status, 'active'),
            ))
            .orderBy(desc(sessions.startTime));

        return res.status(200).json({ sessions: list });
    } catch (error: any) {
        console.error('[session.routes] GET /sessions/student/active:', error);
        return res.status(500).json({ message: error.message || 'Failed to list active sessions.' });
    }
});

// ─────────────────────────────────────────────────────────────
// GET /api/sessions/:id
// Get a single session (teacher, admin, and enrolled students)
// ─────────────────────────────────────────────────────────────
router.get('/:id', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { id } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        const session = await getSession(id);

        if (!session) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Tenant guard — session must belong to caller's org
        if (session.organizationId !== orgId) {
            return res.status(403).json({ message: 'Forbidden.' });
        }

        // For students: strip QR token and host-only Zoom start URL from response.
        if (user.role === 'student') {
            const { qrToken, zoomStartUrl, ...safeSession } = session;
            return res.status(200).json(safeSession);
        }

        return res.status(200).json(session);
    } catch (error: any) {
        console.error('[session.routes] GET /sessions/:id:', error);
        return res.status(500).json({ message: error.message || 'Failed to get session.' });
    }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/sessions/:id
// Update session config (teacher who owns it, or admin)
// ─────────────────────────────────────────────────────────────
router.put('/:id', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { id } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const updated = await updateSessionConfig(id, user.id, {
            qrExpiryMinutes: req.body.qrExpiryMinutes,
            gpsRequired: req.body.gpsRequired,
            gpsRadius: req.body.gpsRadius,
            minAttendancePercent: req.body.minAttendancePercent,
            qrRotationEnabled: req.body.qrRotationEnabled,
            qrRotationIntervalSeconds: req.body.qrRotationIntervalSeconds,
        });

        return res.status(200).json({ message: 'Session config updated.', session: updated });
    } catch (error: any) {
        console.error('[session.routes] PUT /sessions/:id:', error);
        const status = error.message?.includes('denied') ? 403
            : error.message?.includes('not found') ? 404
                : 400;
        return res.status(status).json({ message: error.message || 'Failed to update session.' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/:id/start
// Start a session — sets status=active, generates initial QR
// ─────────────────────────────────────────────────────────────
router.post('/:id/start', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { id } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const result = await startSession(id, user.id);

        return res.status(200).json({
            message: 'Session started.',
            session: result,
            qrData: result.qrData ?? null,
        });
    } catch (error: any) {
        console.error('[session.routes] POST /sessions/:id/start:', error);
        const status = error.message?.includes('denied') ? 403
            : error.message?.includes('not found') ? 404
                : 400;
        return res.status(status).json({ message: error.message || 'Failed to start session.' });
    }
});

// ─────────────────────────────────────────────────────────────
// POST /api/sessions/:id/end
// End a session — finalizes attendance and marks absences
// ─────────────────────────────────────────────────────────────
router.post('/:id/end', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { id } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        const result = await endSession(id, user.id);

        return res.status(200).json({
            message: 'Session ended and attendance finalized.',
            session: result.session,
            absentCount: result.absentCount,
        });
    } catch (error: any) {
        console.error('[session.routes] POST /sessions/:id/end:', error);
        const status = error.message?.includes('denied') ? 403
            : error.message?.includes('not found') ? 404
                : 400;
        return res.status(status).json({ message: error.message || 'Failed to end session.' });
    }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/sessions/:id
// Delete a session — only allowed if status is 'scheduled' or 'cancelled'
// ─────────────────────────────────────────────────────────────
router.delete('/:id', ...requireAuth, async (req: Request, res: Response) => {
    try {
        const user = getUser(req);
        const orgId = getOrgId(req);
        const { id } = req.params;

        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }
        if (user.role !== 'teacher' && user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Teacher or admin access required.' });
        }

        // Load session to verify ownership and status
        const [existing] = await db
            .select({
                id: sessions.id,
                status: sessions.status,
                organizationId: sessions.organizationId,
                createdBy: sessions.createdBy,
                teacherId: courses.teacherId,
            })
            .from(sessions)
            .innerJoin(courses, eq(sessions.courseId, courses.id))
            .where(and(eq(sessions.id, id), eq(sessions.organizationId, orgId)))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: 'Session not found.' });
        }

        // Only the course teacher, session creator, or org admin can delete
        const isOwner = existing.teacherId === user.id || existing.createdBy === user.id;
        if (user.role !== 'admin' && !isOwner) {
            return res.status(403).json({ message: 'Access denied: you do not own this session.' });
        }

        if (existing.status === 'active' || existing.status === 'completed') {
            return res.status(400).json({
                message: `Cannot delete a session with status "${existing.status}". End it first.`,
            });
        }

        await db.delete(sessions).where(eq(sessions.id, id));

        return res.status(200).json({ message: 'Session deleted successfully.' });
    } catch (error: any) {
        console.error('[session.routes] DELETE /sessions/:id:', error);
        return res.status(500).json({ message: error.message || 'Failed to delete session.' });
    }
});

export default router;
