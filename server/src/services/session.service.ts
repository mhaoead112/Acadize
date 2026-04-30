// server/src/services/session.service.ts

import { db } from '../db/index.js';
import {
    sessions,
    attendanceRecords,
    qrTokens,
    enrollments,
    courses,
    users,
    organizations,
} from '../db/schema.js';
import { eq, and, desc, gte, lte, lt, isNull, sql, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireTenantId } from '../utils/tenant-query.js';
import { createZoomMeeting } from './zoom-api.service.js';
import crypto from 'crypto';

// ─────────────────────────────────────────────────────────────
// DTOs / Input Types
// ─────────────────────────────────────────────────────────────

export interface CreateSessionInput {
    organizationId: string;
    courseId: string;
    createdBy: string; // teacher/admin userId
    sessionType: 'physical' | 'online';
    title: string;
    startTime: Date;
    endTime: Date;
    // Physical
    gpsRequired?: boolean;
    gpsLat?: number;
    gpsLng?: number;
    gpsRadius?: number;
    // Online
    zoomMeetingId?: string;
    // Config
    minAttendancePercent?: number;
    qrExpiryMinutes?: number;
    qrRotationEnabled?: boolean;
    qrRotationIntervalSeconds?: number;
}

export interface ListSessionsInput {
    organizationId: string;
    courseId?: string;
    teacherId?: string;
    status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
    dateFrom?: Date;
    dateTo?: Date;
    cursor?: string; // last session id for cursor pagination
    limit?: number;
}

export interface UpdateSessionConfigInput {
    qrExpiryMinutes?: number;
    gpsRequired?: boolean;
    gpsRadius?: number;
    minAttendancePercent?: number;
    qrRotationEnabled?: boolean;
    qrRotationIntervalSeconds?: number;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Generate a cryptographically random QR token string */
function generateQrTokenValue(): string {
    return crypto.randomBytes(32).toString('hex');
}

async function completeExpiredActiveSessions(organizationId: string) {
    await db
        .update(sessions)
        .set({
            status: 'completed',
            qrToken: null,
            qrExpiresAt: null,
            updatedAt: new Date(),
        } as any)
        .where(and(
            eq(sessions.organizationId, organizationId),
            eq(sessions.status, 'active'),
            lt(sessions.endTime, new Date()),
        ));
}

// ─────────────────────────────────────────────────────────────
// 1. createSession
// ─────────────────────────────────────────────────────────────

export async function createSession(data: CreateSessionInput) {
    const orgId = requireTenantId(data.organizationId);

    // Validate creator is teacher or admin in this org
    const [creator] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(and(
            eq(users.id, data.createdBy),
            eq(users.organizationId, orgId),
        ))
        .limit(1);

    if (!creator) {
        throw new Error('Creator not found in this organization.');
    }
    if (creator.role !== 'teacher' && creator.role !== 'admin') {
        throw new Error('Only teachers and admins can create sessions.');
    }

    // Validate course belongs to this org
    const [course] = await db
        .select({ id: courses.id, teacherId: courses.teacherId })
        .from(courses)
        .where(and(
            eq(courses.id, data.courseId),
            eq(courses.organizationId, orgId),
        ))
        .limit(1);

    if (!course) {
        throw new Error('Course not found or does not belong to this organization.');
    }

    if (data.startTime >= data.endTime) {
        throw new Error('startTime must be before endTime.');
    }

    let zoomMeeting: Awaited<ReturnType<typeof createZoomMeeting>> | null = null;
    if (data.sessionType === 'online') {
        zoomMeeting = await createZoomMeeting({
            title: data.title,
            startTime: data.startTime,
            endTime: data.endTime,
            timezone: 'UTC',
        });
    }

    // For physical sessions, fall back to org defaults if GPS not provided
    let gpsLat = data.gpsLat ?? null;
    let gpsLng = data.gpsLng ?? null;

    if (data.sessionType === 'physical' && data.gpsRequired && (!gpsLat || !gpsLng)) {
        // Attempt to pull org-level GPS defaults (stored in config jsonb)
        const [org] = await db
            .select({ config: organizations.config })
            .from(organizations)
            .where(eq(organizations.id, orgId))
            .limit(1);

        const config = (org?.config ?? {}) as Record<string, any>;
        gpsLat = gpsLat ?? config.defaultGpsLat ?? null;
        gpsLng = gpsLng ?? config.defaultGpsLng ?? null;

        if (!gpsLat || !gpsLng) {
            throw new Error(
                'GPS coordinates are required for physical sessions with gpsRequired=true. ' +
                'Provide gpsLat/gpsLng or set org defaults.',
            );
        }
    }

    const [newSession] = await db
        .insert(sessions)
        .values({
            id: createId(),
            organizationId: orgId,
            courseId: data.courseId,
            createdBy: data.createdBy,
            sessionType: data.sessionType,
            title: data.title,
            status: 'scheduled',
            zoomMeetingId: zoomMeeting?.meetingId ?? data.zoomMeetingId ?? null,
            zoomMeetingUuid: zoomMeeting?.meetingUuid ?? null,
            zoomJoinUrl: zoomMeeting?.joinUrl ?? null,
            zoomStartUrl: zoomMeeting?.startUrl ?? null,
            zoomHostEmail: zoomMeeting?.hostEmail ?? null,
            gpsRequired: data.gpsRequired ?? false,
            gpsLat: gpsLat as number | null,
            gpsLng: gpsLng as number | null,
            gpsRadius: data.gpsRadius ?? 100,
            minAttendancePercent: data.minAttendancePercent ?? 75,
            qrExpiryMinutes: data.qrExpiryMinutes ?? 10,
            qrRotationEnabled: data.qrRotationEnabled ?? false,
            qrRotationIntervalSeconds: data.qrRotationIntervalSeconds ?? 30,
            startTime: data.startTime,
            endTime: data.endTime,
        })
        .returning();

    if (!newSession) {
        throw new Error('Failed to create session.');
    }

    return newSession;
}

// ─────────────────────────────────────────────────────────────
// 2. getSession
// ─────────────────────────────────────────────────────────────

export async function getSession(sessionId: string) {
    const [session] = await db
        .select({
            // Session fields
            id: sessions.id,
            organizationId: sessions.organizationId,
            courseId: sessions.courseId,
            createdBy: sessions.createdBy,
            sessionType: sessions.sessionType,
            title: sessions.title,
            status: sessions.status,
            zoomMeetingId: sessions.zoomMeetingId,
            zoomMeetingUuid: sessions.zoomMeetingUuid,
            zoomJoinUrl: sessions.zoomJoinUrl,
            zoomStartUrl: sessions.zoomStartUrl,
            zoomHostEmail: sessions.zoomHostEmail,
            qrToken: sessions.qrToken,
            qrExpiresAt: sessions.qrExpiresAt,
            qrExpiryMinutes: sessions.qrExpiryMinutes,
            qrRotationEnabled: sessions.qrRotationEnabled,
            qrRotationIntervalSeconds: sessions.qrRotationIntervalSeconds,
            gpsRequired: sessions.gpsRequired,
            gpsLat: sessions.gpsLat,
            gpsLng: sessions.gpsLng,
            gpsRadius: sessions.gpsRadius,
            minAttendancePercent: sessions.minAttendancePercent,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            createdAt: sessions.createdAt,
            updatedAt: sessions.updatedAt,
            // Course info
            courseTitle: courses.title,
            teacherId: courses.teacherId,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!session) {
        return null;
    }

    // Attendance count
    const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, sessionId));

    return {
        ...session,
        attendanceCount: countResult?.count ?? 0,
    };
}

// ─────────────────────────────────────────────────────────────
// 3. listSessions
// ─────────────────────────────────────────────────────────────

export async function listSessions(filters: ListSessionsInput) {
    const orgId = requireTenantId(filters.organizationId);
    const limit = Math.min(filters.limit ?? 20, 100);

    await completeExpiredActiveSessions(orgId);

    const conditions = [eq(sessions.organizationId, orgId)];

    if (filters.courseId) {
        conditions.push(eq(sessions.courseId, filters.courseId));
    }

    if (filters.status) {
        conditions.push(eq(sessions.status, filters.status));
    }

    if (filters.dateFrom) {
        conditions.push(gte(sessions.startTime, filters.dateFrom));
    }

    if (filters.dateTo) {
        conditions.push(lte(sessions.startTime, filters.dateTo));
    }

    // teacherId filter: join courses and filter by teacherId
    let query = db
        .select({
            id: sessions.id,
            organizationId: sessions.organizationId,
            courseId: sessions.courseId,
            createdBy: sessions.createdBy,
            sessionType: sessions.sessionType,
            title: sessions.title,
            status: sessions.status,
            zoomMeetingId: sessions.zoomMeetingId,
            zoomMeetingUuid: sessions.zoomMeetingUuid,
            zoomJoinUrl: sessions.zoomJoinUrl,
            zoomStartUrl: sessions.zoomStartUrl,
            zoomHostEmail: sessions.zoomHostEmail,
            gpsRequired: sessions.gpsRequired,
            minAttendancePercent: sessions.minAttendancePercent,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            createdAt: sessions.createdAt,
            // Course info
            courseTitle: courses.title,
            teacherId: courses.teacherId,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .$dynamic();

    // Apply composed conditions + optional teacherId filter
    const allConditions = filters.teacherId
        ? [...conditions, eq(courses.teacherId, filters.teacherId)]
        : conditions;

    const rows = await query
        .where(and(...allConditions))
        .orderBy(desc(sessions.startTime))
        .limit(limit + 1); // fetch one extra to detect next page

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const nextCursor = hasNextPage ? data[data.length - 1]?.id : null;

    return { data, nextCursor, hasNextPage };
}

// ─────────────────────────────────────────────────────────────
// 4. startSession
// ─────────────────────────────────────────────────────────────

export async function startSession(sessionId: string, teacherId: string) {
    // Load session + course in one join to verify ownership
    const [existing] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            sessionType: sessions.sessionType,
            qrExpiryMinutes: sessions.qrExpiryMinutes,
            teacherId: courses.teacherId,
            createdBy: sessions.createdBy,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!existing) {
        throw new Error('Session not found.');
    }

    // Allow the course teacher OR the session creator (could be admin)
    if (existing.teacherId !== teacherId && existing.createdBy !== teacherId) {
        throw new Error('Access denied: you do not own this session.');
    }

    if (existing.status !== 'scheduled') {
        throw new Error(`Cannot start a session with status "${existing.status}".`);
    }

    // Build update values
    const now = new Date();
    let qrToken: string | null = null;
    let qrExpiresAt: Date | null = null;

    if (existing.sessionType === 'physical') {
        qrToken = generateQrTokenValue();
        qrExpiresAt = new Date(now.getTime() + existing.qrExpiryMinutes * 60 * 1000);
    }

    const result = await db.transaction(async (tx) => {
        // Update session status + initial QR token
        const [updated] = await tx
            .update(sessions)
            .set({
                status: 'active',
                qrToken: qrToken,
                qrExpiresAt: qrExpiresAt,
                updatedAt: now,
            })
            .where(eq(sessions.id, sessionId))
            .returning();

        // If physical — persist initial QR token to qrTokens table
        if (existing.sessionType === 'physical' && qrToken) {
            await tx.insert(qrTokens).values({
                id: createId(),
                sessionId,
                token: qrToken,
                expiresAt: qrExpiresAt!,
                used: false,
            });
        }

        return updated;
    });

    return {
        ...result,
        qrData: existing.sessionType === 'physical'
            ? { token: qrToken, expiresAt: qrExpiresAt }
            : null,
    };
}

// ─────────────────────────────────────────────────────────────
// 5. endSession
// ─────────────────────────────────────────────────────────────

export async function endSession(sessionId: string, teacherId: string) {
    const [existing] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            sessionType: sessions.sessionType,
            courseId: sessions.courseId,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            minAttendancePercent: sessions.minAttendancePercent,
            teacherId: courses.teacherId,
            createdBy: sessions.createdBy,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!existing) {
        throw new Error('Session not found.');
    }

    if (existing.teacherId !== teacherId && existing.createdBy !== teacherId) {
        throw new Error('Access denied: you do not own this session.');
    }

    if (existing.status !== 'active') {
        throw new Error(`Cannot end a session with status "${existing.status}".`);
    }

    const now = new Date();

    // Calculate session duration in minutes
    const sessionStartMs = existing.startTime.getTime();
    const sessionEndMs = now.getTime();
    const totalSessionMinutes = Math.max(
        1,
        Math.floor((sessionEndMs - sessionStartMs) / (1000 * 60)),
    );

    // Load all enrolled students for this course
    const enrolled = await db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(eq(enrollments.courseId, existing.courseId));

    const enrolledIds = enrolled.map((e) => e.studentId);

    // Load existing attendance records for this session
    const existingRecords = await db
        .select({
            id: attendanceRecords.id,
            userId: attendanceRecords.userId,
            joinTime: attendanceRecords.joinTime,
            leaveTime: attendanceRecords.leaveTime,
        })
        .from(attendanceRecords)
        .where(eq(attendanceRecords.sessionId, sessionId));

    const checkedInIds = new Set(existingRecords.map((r) => r.userId));

    const absentIds = enrolledIds.filter((id) => !checkedInIds.has(id));

    const updatedRecords = await db.transaction(async (tx) => {
        // 1 — Close any open attendance records (no leaveTime yet) and calculate percent
        for (const record of existingRecords) {
            const leaveTime = record.leaveTime ?? now;
            const durationMinutes = Math.max(
                0,
                Math.floor((leaveTime.getTime() - record.joinTime.getTime()) / (1000 * 60)),
            );
            const attendancePercent = Math.min(
                100,
                Math.round((durationMinutes / totalSessionMinutes) * 100),
            );
            const status =
                attendancePercent >= existing.minAttendancePercent ? 'present' : 'late';

            await tx
                .update(attendanceRecords)
                .set({
                    leaveTime: record.leaveTime ?? now,
                    durationMinutes,
                    attendancePercent,
                    status: status as 'present' | 'late',
                })
                .where(eq(attendanceRecords.id, record.id));
        }

        // 2 — Mark absent students with a record
        if (absentIds.length > 0) {
            await tx.insert(attendanceRecords).values(
                absentIds.map((userId) => ({
                    id: createId(),
                    sessionId,
                    userId,
                    joinTime: now, // marker — they never actually joined
                    leaveTime: now,
                    durationMinutes: 0,
                    attendancePercent: 0,
                    status: 'absent' as const,
                    checkInMethod: existing.sessionType === 'online' ? 'zoom' as const : 'manual' as const,
                })),
            );
        }

        // 3 — Expire the active QR token & mark session completed
        const [completed] = await tx
            .update(sessions)
            .set({
                status: 'completed',
                qrToken: null,
                qrExpiresAt: null,
                updatedAt: now,
            })
            .where(eq(sessions.id, sessionId))
            .returning();

        return { session: completed, absentCount: absentIds.length };
    });

    // Emit notification events for absent students (fire-and-forget — no await)
    // Services/consumers should listen to these events for SMS/WhatsApp/in-app delivery.
    // Using EventEmitter pattern here; replace with your event bus if needed.
    if (absentIds.length > 0) {
        emitAbsenceEvents(sessionId, absentIds).catch((err) =>
            console.error('[session.service] emitAbsenceEvents error:', err),
        );
    }

    return updatedRecords;
}

// ─────────────────────────────────────────────────────────────
// 6. updateSessionConfig
// ─────────────────────────────────────────────────────────────

export async function updateSessionConfig(
    sessionId: string,
    teacherId: string,
    config: UpdateSessionConfigInput,
) {
    // Verify session exists and caller owns it
    const [existing] = await db
        .select({
            id: sessions.id,
            status: sessions.status,
            teacherId: courses.teacherId,
            createdBy: sessions.createdBy,
        })
        .from(sessions)
        .innerJoin(courses, eq(sessions.courseId, courses.id))
        .where(eq(sessions.id, sessionId))
        .limit(1);

    if (!existing) {
        throw new Error('Session not found.');
    }

    if (existing.teacherId !== teacherId && existing.createdBy !== teacherId) {
        throw new Error('Access denied: you do not own this session.');
    }

    if (existing.status === 'completed' || existing.status === 'cancelled') {
        throw new Error(`Cannot update config for a "${existing.status}" session.`);
    }

    // Build update payload — only include defined fields
    const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

    if (config.qrExpiryMinutes !== undefined) updatePayload.qrExpiryMinutes = config.qrExpiryMinutes;
    if (config.gpsRequired !== undefined) updatePayload.gpsRequired = config.gpsRequired;
    if (config.gpsRadius !== undefined) updatePayload.gpsRadius = config.gpsRadius;
    if (config.minAttendancePercent !== undefined) updatePayload.minAttendancePercent = config.minAttendancePercent;
    if (config.qrRotationEnabled !== undefined) updatePayload.qrRotationEnabled = config.qrRotationEnabled;
    if (config.qrRotationIntervalSeconds !== undefined) updatePayload.qrRotationIntervalSeconds = config.qrRotationIntervalSeconds;

    const [updated] = await db
        .update(sessions)
        .set(updatePayload as any)
        .where(eq(sessions.id, sessionId))
        .returning();

    if (!updated) {
        throw new Error('Failed to update session config.');
    }

    return updated;
}

// ─────────────────────────────────────────────────────────────
// Internal: emitAbsenceEvents
// Replace with your event bus / notification service call
// ─────────────────────────────────────────────────────────────

async function emitAbsenceEvents(sessionId: string, absentUserIds: string[]) {
    // Placeholder — wire to your attendanceNotification service when ready.
    // Example payload shape for downstream consumers:
    console.info(
        `[session.service] Session ${sessionId} ended — ${absentUserIds.length} absent student(s). ` +
        `IDs: ${absentUserIds.join(', ')}`,
    );
}
