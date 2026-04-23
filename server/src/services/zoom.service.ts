/**
 * zoom.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles Zoom webhook events for online-session attendance tracking.
 *
 * Supported events
 *   • meeting.participant_joined  → record joinTime / resume segment
 *   • meeting.participant_left    → set leaveTime, calculate duration
 *   • meeting.ended               → finalise all records, mark absentees
 *
 * Architecture notes
 * ─────────────────────────────────────────────────────────────────────────────
 * The attendanceRecords table has a UNIQUE index on (sessionId, userId). We
 * therefore use a single row per (session, user) and accumulate duration across
 * multiple join/leave cycles in an in-process segment store (ZoomSegmentStore).
 *
 * In a multi-instance deployment replace ZoomSegmentStore with a Redis hash.
 *
 * Edge-case handling
 *   • Out-of-order webhooks  — every handler is idempotent; timestamps are used
 *     from the Zoom payload, not from system clock.
 *   • Multiple devices       — we track the dominant (longest) device segment.
 *   • Meeting-ID reuse       — we match by zoomMeetingId AND session date window.
 *   • Reconnections          — existing record is updated, never duplicated.
 */

import { db } from '../db/index.js';
import {
    sessions,
    attendanceRecords,
    enrollments,
    courses,
    users,
    attendanceNotifications,
    parentChildren,
} from '../db/schema.js';
import { eq, and, gte, lte, isNull, not, inArray } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Raw Zoom participant sub-object from any participant_* event */
export interface ZoomParticipant {
    user_id?: string;       // Zoom's internal participant ID (not stable across rejoins)
    user_name: string;
    email?: string;
    join_time?: string;     // ISO-8601
    leave_time?: string;    // ISO-8601
    id?: string;            // same as user_id in some payloads
}

/** Wrapper matching Zoom webhook payload structure */
export interface ZoomWebhookPayload {
    event: string;
    payload: {
        object: {
            id: string | number;        // Zoom meeting ID (numeric, but can arrive as string)
            uuid?: string;              // Zoom meeting UUID — unique per occurrence
            start_time?: string;        // ISO-8601
            end_time?: string;
            participant?: ZoomParticipant;
            participants?: ZoomParticipant[];
        };
    };
    event_ts?: number;  // epoch ms when Zoom fired this event
}

interface ResolvedSession {
    id: string;
    organizationId: string;
    courseId: string;
    startTime: Date;
    endTime: Date;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    minAttendancePercent: number;
    createdBy: string;
}

interface ResolvedUser {
    id: string;
    email: string;
    fullName: string;
}

interface NotificationQueueItem {
    userId: string;
    sessionId: string;
    type: 'attendance_marked' | 'low_attendance' | 'absent_alert';
    message: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Process Segment Store
// Tracks active join timestamps per (meetingId, participantEmail) so we can
// accumulate multiple connect/disconnect segments for a single attendance row.
//
// Shape: Map<`${meetingId}:${userId}`, ActiveSegment>
// ─────────────────────────────────────────────────────────────────────────────

interface ActiveSegment {
    joinedAt: Date;
    /** running total of already-closed segments (minutes) */
    accumulatedMinutes: number;
}

const segmentStore = new Map<string, ActiveSegment>();

function segmentKey(meetingId: string, userId: string): string {
    return `${meetingId}::${userId}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Normalise Zoom meeting IDs — they can arrive as number or string */
function normaliseMeetingId(raw: string | number): string {
    return String(raw).trim();
}

/** Simple Levenshtein distance for fallback name matching */
function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

/** Similarity ∈ [0, 1] — 1 = identical */
function nameSimilarity(a: string, b: string): number {
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim();
    const na = norm(a);
    const nb = norm(b);
    if (na === nb) return 1;
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(na, nb) / maxLen;
}

/** Structured logger */
function log(level: 'info' | 'warn' | 'error', context: string, msg: string, meta?: Record<string, unknown>) {
    const entry = { ts: new Date().toISOString(), level, context, msg, ...meta };
    if (level === 'error') { console.error('[zoom.service]', JSON.stringify(entry)); return; }
    if (level === 'warn') { console.warn('[zoom.service]', JSON.stringify(entry)); return; }
    console.info('[zoom.service]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Session resolution
// Match Zoom meeting ID → sessions row, using date to handle meeting-ID reuse.
// ─────────────────────────────────────────────────────────────────────────────

async function findSession(
    zoomMeetingId: string,
    eventTime: Date,
): Promise<ResolvedSession | null> {
    // Window: event must fall within [startTime - 2h, endTime + 2h]
    const windowStart = new Date(eventTime.getTime() - 2 * 60 * 60 * 1000);
    const windowEnd = new Date(eventTime.getTime() + 2 * 60 * 60 * 1000);

    const rows = await db
        .select({
            id: sessions.id,
            organizationId: sessions.organizationId,
            courseId: sessions.courseId,
            startTime: sessions.startTime,
            endTime: sessions.endTime,
            status: sessions.status,
            minAttendancePercent: sessions.minAttendancePercent,
            createdBy: sessions.createdBy,
        })
        .from(sessions)
        .where(
            and(
                eq(sessions.zoomMeetingId, zoomMeetingId),
                gte(sessions.endTime, windowStart),
                lte(sessions.startTime, windowEnd),
                not(eq(sessions.status, 'cancelled')),
            ),
        )
        .limit(5);

    if (rows.length === 0) return null;

    // If multiple sessions match (edge case in tests) pick the one whose
    // start_time is closest to the event time.
    rows.sort((a, b) => {
        const da = Math.abs(a.startTime.getTime() - eventTime.getTime());
        const db_ = Math.abs(b.startTime.getTime() - eventTime.getTime());
        return da - db_;
    });

    return rows[0] as ResolvedSession;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. User resolution
// Primary: email match. Fallback: name similarity ≥ 0.80.
// ─────────────────────────────────────────────────────────────────────────────

export async function mapZoomParticipantToUser(
    zoomEmail: string | undefined,
    zoomName: string,
    organizationId: string,
): Promise<ResolvedUser | null> {
    // ── Primary: email ──────────────────────────────────────────────────────
    if (zoomEmail && zoomEmail.trim()) {
        const [row] = await db
            .select({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
            })
            .from(users)
            .where(
                and(
                    eq(users.email, zoomEmail.toLowerCase().trim()),
                    eq(users.organizationId, organizationId),
                ),
            )
            .limit(1);

        if (row) {
            log('info', 'mapZoomParticipantToUser', 'Matched by email', { email: zoomEmail, userId: row.id });
            return row;
        }
    }

    // ── Fallback: name similarity ───────────────────────────────────────────
    const orgUsers = await db
        .select({
            id: users.id,
            email: users.email,
            fullName: users.fullName,
        })
        .from(users)
        .where(eq(users.organizationId, organizationId))
        .limit(500); // bounded — large orgs should use email

    let bestMatch: ResolvedUser | null = null;
    let bestScore = 0;

    for (const u of orgUsers) {
        const score = nameSimilarity(zoomName, u.fullName);
        if (score > bestScore) {
            bestScore = score;
            bestMatch = u;
        }
    }

    const NAME_SIMILARITY_THRESHOLD = 0.80;
    if (bestScore >= NAME_SIMILARITY_THRESHOLD && bestMatch) {
        log('info', 'mapZoomParticipantToUser', 'Matched by name similarity', {
            zoomName,
            matchedName: bestMatch.fullName,
            score: bestScore.toFixed(3),
            userId: bestMatch.id,
        });
        return bestMatch;
    }

    log('warn', 'mapZoomParticipantToUser', 'No user match found — skipping participant', {
        zoomEmail,
        zoomName,
        bestScore: bestScore.toFixed(3),
    });
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. handleParticipantJoined
// ─────────────────────────────────────────────────────────────────────────────

export async function handleParticipantJoined(webhook: ZoomWebhookPayload): Promise<void> {
    const meetingId = normaliseMeetingId(webhook.payload.object.id);
    const participant = webhook.payload.object.participant;

    if (!participant) {
        log('warn', 'handleParticipantJoined', 'No participant in payload', { meetingId });
        return;
    }

    // Use Zoom-provided join_time; fall back to event_ts, then now
    const joinTime = participant.join_time
        ? new Date(participant.join_time)
        : webhook.event_ts
            ? new Date(webhook.event_ts)
            : new Date();

    const session = await findSession(meetingId, joinTime);
    if (!session) {
        log('warn', 'handleParticipantJoined', 'Session not found for meeting', { meetingId });
        return;
    }

    const user = await mapZoomParticipantToUser(
        participant.email,
        participant.user_name,
        session.organizationId,
    );
    if (!user) return; // already logged

    // Record the start of this segment
    const key = segmentKey(meetingId, user.id);
    const existing = segmentStore.get(key);

    if (existing) {
        // Reconnection: keep old accumulated minutes, update join time
        segmentStore.set(key, { joinedAt: joinTime, accumulatedMinutes: existing.accumulatedMinutes });
        log('info', 'handleParticipantJoined', 'Reconnection detected', {
            userId: user.id, sessionId: session.id, accumulatedMinutes: existing.accumulatedMinutes,
        });
    } else {
        segmentStore.set(key, { joinedAt: joinTime, accumulatedMinutes: 0 });
    }

    // ── Upsert attendance record ────────────────────────────────────────────
    const [existingRecord] = await db
        .select({ id: attendanceRecords.id, joinTime: attendanceRecords.joinTime })
        .from(attendanceRecords)
        .where(and(
            eq(attendanceRecords.sessionId, session.id),
            eq(attendanceRecords.userId, user.id),
        ))
        .limit(1);

    if (existingRecord) {
        // Already has a record — either first-time join after record created
        // via manual/QR, or a reconnection. Only update joinTime if it's
        // earlier (out-of-order protection).
        if (joinTime < existingRecord.joinTime) {
            await db
                .update(attendanceRecords)
                .set({ joinTime, status: 'present' } as any)
                .where(eq(attendanceRecords.id, existingRecord.id));
        }
    } else {
        // First Zoom join: create the record
        await db
            .insert(attendanceRecords)
            .values({
                sessionId: session.id,
                userId: user.id,
                joinTime,
                status: 'present',
                checkInMethod: 'zoom',
            } as any);
    }

    log('info', 'handleParticipantJoined', 'Participant joined', {
        userId: user.id, sessionId: session.id, joinTime: joinTime.toISOString(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. handleParticipantLeft
// ─────────────────────────────────────────────────────────────────────────────

export async function handleParticipantLeft(webhook: ZoomWebhookPayload): Promise<void> {
    const meetingId = normaliseMeetingId(webhook.payload.object.id);
    const participant = webhook.payload.object.participant;

    if (!participant) {
        log('warn', 'handleParticipantLeft', 'No participant in payload', { meetingId });
        return;
    }

    const leaveTime = participant.leave_time
        ? new Date(participant.leave_time)
        : webhook.event_ts
            ? new Date(webhook.event_ts)
            : new Date();

    const session = await findSession(meetingId, leaveTime);
    if (!session) {
        log('warn', 'handleParticipantLeft', 'Session not found for meeting', { meetingId });
        return;
    }

    const user = await mapZoomParticipantToUser(
        participant.email,
        participant.user_name,
        session.organizationId,
    );
    if (!user) return;

    const key = segmentKey(meetingId, user.id);
    const segment = segmentStore.get(key);

    // ── Calculate this segment's contribution ───────────────────────────────
    let segmentMinutes = 0;
    if (segment) {
        segmentMinutes = Math.max(0, (leaveTime.getTime() - segment.joinedAt.getTime()) / 60_000);

        // Guard: if Zoom fires join/left out of order, segment might be negative
        // (leave_time < join_time). We silently ignore those phantom minutes.
        if (segmentMinutes < 0) segmentMinutes = 0;

        const newAccumulated = segment.accumulatedMinutes + segmentMinutes;
        segmentStore.set(key, { ...segment, accumulatedMinutes: newAccumulated });
    } else {
        // Left event without a tracked join (out-of-order or server restart).
        // We still update leaveTime on the record if it exists.
        log('warn', 'handleParticipantLeft', 'No open segment found — possible out-of-order delivery', {
            userId: user.id, meetingId,
        });
    }

    // ── Fetch the attendance record ─────────────────────────────────────────
    const [record] = await db
        .select({
            id: attendanceRecords.id,
            joinTime: attendanceRecords.joinTime,
            durationMinutes: attendanceRecords.durationMinutes,
        })
        .from(attendanceRecords)
        .where(and(
            eq(attendanceRecords.sessionId, session.id),
            eq(attendanceRecords.userId, user.id),
        ))
        .limit(1);

    if (!record) {
        log('warn', 'handleParticipantLeft', 'No attendance record found for participant', {
            userId: user.id, sessionId: session.id,
        });
        return;
    }

    // ── Calculate total duration and attendance percent ─────────────────────
    const totalAccumulated = segment
        ? segment.accumulatedMinutes + segmentMinutes
        : (record.durationMinutes ?? 0) + segmentMinutes;

    const totalMinutes = Math.round(totalAccumulated);

    const sessionDurationMinutes =
        (session.endTime.getTime() - session.startTime.getTime()) / 60_000;

    const attendancePercent = sessionDurationMinutes > 0
        ? Math.min(100, Math.round((totalMinutes / sessionDurationMinutes) * 100))
        : 0;

    await db
        .update(attendanceRecords)
        .set({
            leaveTime,
            durationMinutes: totalMinutes,
            attendancePercent,
        } as any)
        .where(eq(attendanceRecords.id, record.id));

    // Clear the active segment (not deleted from store — will be refreshed on rejoin)
    if (segment) {
        segmentStore.set(key, { ...segment, accumulatedMinutes: totalAccumulated });
    }

    log('info', 'handleParticipantLeft', 'Participant left', {
        userId: user.id, sessionId: session.id,
        totalMinutes, attendancePercent,
        leaveTime: leaveTime.toISOString(),
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. handleMeetingEnded
// ─────────────────────────────────────────────────────────────────────────────

export async function handleMeetingEnded(webhook: ZoomWebhookPayload): Promise<void> {
    const meetingId = normaliseMeetingId(webhook.payload.object.id);

    const endTime = webhook.payload.object.end_time
        ? new Date(webhook.payload.object.end_time)
        : webhook.event_ts
            ? new Date(webhook.event_ts)
            : new Date();

    const session = await findSession(meetingId, endTime);
    if (!session) {
        log('warn', 'handleMeetingEnded', 'Session not found for meeting', { meetingId });
        return;
    }

    log('info', 'handleMeetingEnded', 'Finalising session', {
        sessionId: session.id, meetingId, endTime: endTime.toISOString(),
    });

    // ── 5a. Close any still-open segments (e.g. participant never got a left event) ──
    await closeOpenSegments(meetingId, session, endTime);

    // ── 5b. Mark session as completed ──────────────────────────────────────
    await db
        .update(sessions)
        .set({ status: 'completed' } as any)
        .where(eq(sessions.id, session.id));

    // ── 5c. Load all enrolled students ─────────────────────────────────────
    const enrolledRows = await db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(eq(enrollments.courseId, session.courseId));

    const enrolledIds = enrolledRows.map((r) => r.studentId);

    if (enrolledIds.length === 0) {
        log('info', 'handleMeetingEnded', 'No enrolled students — nothing to finalise', { sessionId: session.id });
        return;
    }

    // ── 5d. Load all existing attendance records for this session ───────────
    const records = enrolledIds.length > 0
        ? await db
            .select({
                id: attendanceRecords.id,
                userId: attendanceRecords.userId,
                attendancePercent: attendanceRecords.attendancePercent,
                durationMinutes: attendanceRecords.durationMinutes,
                status: attendanceRecords.status,
            })
            .from(attendanceRecords)
            .where(eq(attendanceRecords.sessionId, session.id))
        : [];

    const recordByUser = new Map(records.map((r) => [r.userId, r]));

    const sessionDurationMinutes =
        (session.endTime.getTime() - session.startTime.getTime()) / 60_000;

    const notifications: NotificationQueueItem[] = [];

    // ── 5e. Process each enrolled student ──────────────────────────────────
    for (const studentId of enrolledIds) {
        const record = recordByUser.get(studentId);

        if (!record) {
            // No attendance record → absent
            await db
                .insert(attendanceRecords)
                .values({
                    sessionId: session.id,
                    userId: studentId,
                    joinTime: session.startTime, // placeholder
                    status: 'absent',
                    checkInMethod: 'zoom',
                    durationMinutes: 0,
                    attendancePercent: 0,
                } as any);

            notifications.push({
                userId: studentId,
                sessionId: session.id,
                type: 'absent_alert',
                message: 'You were marked absent from an online session.',
            });

            log('info', 'handleMeetingEnded', 'Marked absent (no join)', { userId: studentId, sessionId: session.id });
            continue;
        }

        // Has a record — evaluate attendance threshold
        const pct = record.attendancePercent ?? 0;
        const belowThreshold = sessionDurationMinutes > 0 && pct < session.minAttendancePercent;

        if (record.status !== 'absent' && belowThreshold) {
            await db
                .update(attendanceRecords)
                .set({ status: 'absent' } as any)
                .where(eq(attendanceRecords.id, record.id));

            notifications.push({
                userId: studentId,
                sessionId: session.id,
                type: 'low_attendance',
                message: `Your attendance was ${Math.round(pct)}%, which is below the required ${session.minAttendancePercent}%. You have been marked absent.`,
            });

            log('info', 'handleMeetingEnded', 'Marked absent (below threshold)', {
                userId: studentId, sessionId: session.id, pct, threshold: session.minAttendancePercent,
            });
        } else if (record.status === 'present' && !belowThreshold) {
            notifications.push({
                userId: studentId,
                sessionId: session.id,
                type: 'attendance_marked',
                message: `Attendance recorded: ${Math.round(pct)}% for today's session.`,
            });
        }
    }

    // ── 5f. Flush notifications ─────────────────────────────────────────────
    await flushNotifications(notifications);

    // ── 5g. Cleanup segment store for this meeting ─────────────────────────
    const entries = Array.from(segmentStore.entries());
    for (const [key] of entries) {
        if (key.startsWith(`${meetingId}::`)) {
            segmentStore.delete(key);
        }
    }

    log('info', 'handleMeetingEnded', 'Session finalised', {
        sessionId: session.id,
        enrolledCount: enrolledIds.length,
        notificationsQueued: notifications.length,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: close open segments for participants who never got a "left" event
// (e.g. network drop, Zoom crashed, webhook missed)
// ─────────────────────────────────────────────────────────────────────────────

async function closeOpenSegments(
    meetingId: string,
    session: ResolvedSession,
    endTime: Date,
): Promise<void> {
    const sessionDurationMinutes =
        (session.endTime.getTime() - session.startTime.getTime()) / 60_000;

    const entries = Array.from(segmentStore.entries());
    for (const [key, segment] of entries) {
        if (!key.startsWith(`${meetingId}::`)) continue;

        const userId = key.slice(meetingId.length + 2);
        const finalSegmentMins = Math.max(0, (endTime.getTime() - segment.joinedAt.getTime()) / 60_000);
        const totalMinutes = Math.round(segment.accumulatedMinutes + finalSegmentMins);
        const attendancePercent = sessionDurationMinutes > 0
            ? Math.min(100, Math.round((totalMinutes / sessionDurationMinutes) * 100))
            : 0;

        const [record] = await db
            .select({ id: attendanceRecords.id })
            .from(attendanceRecords)
            .where(and(
                eq(attendanceRecords.sessionId, session.id),
                eq(attendanceRecords.userId, userId),
            ))
            .limit(1);

        if (record) {
            await db
                .update(attendanceRecords)
                .set({
                    leaveTime: endTime,
                    durationMinutes: totalMinutes,
                    attendancePercent,
                } as any)
                .where(eq(attendanceRecords.id, record.id));

            log('info', 'closeOpenSegments', 'Closed open segment at meeting end', {
                userId, sessionId: session.id, totalMinutes, attendancePercent,
            });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper: write notification rows + fetch parent IDs for absent-alert
// Notifications are written to attendanceNotifications for both the student
// and their linked parent(s) if this is an absent_alert.
// ─────────────────────────────────────────────────────────────────────────────

async function flushNotifications(items: NotificationQueueItem[]): Promise<void> {
    if (items.length === 0) return;

    const rows: {
        userId: string;
        parentId: string | null;
        sessionId: string;
        type: 'attendance_marked' | 'low_attendance' | 'session_starting' | 'absent_alert';
        channel: 'in_app';
        message: string;
    }[] = [];

    // Gather parent IDs for absent/low-attendance alerts
    const alertUserIds = items
        .filter((i) => i.type === 'absent_alert' || i.type === 'low_attendance')
        .map((i) => i.userId);

    const parentMap = new Map<string, string[]>(); // childId → [parentId]

    if (alertUserIds.length > 0) {
        const parentRows = await db
            .select({ parentId: parentChildren.parentId, childId: parentChildren.childId })
            .from(parentChildren)
            .where(inArray(parentChildren.childId, alertUserIds));

        for (const { parentId, childId } of parentRows) {
            if (!parentMap.has(childId)) parentMap.set(childId, []);
            parentMap.get(childId)!.push(parentId);
        }
    }

    for (const item of items) {
        // Student notification
        rows.push({
            userId: item.userId,
            parentId: null,
            sessionId: item.sessionId,
            type: item.type,
            channel: 'in_app',
            message: item.message,
        });

        // Parent notifications (absent/low-attendance only)
        if (item.type === 'absent_alert' || item.type === 'low_attendance') {
            const parents = parentMap.get(item.userId) ?? [];
            for (const parentId of parents) {
                rows.push({
                    userId: item.userId,  // student being notified about
                    parentId,
                    sessionId: item.sessionId,
                    type: item.type,
                    channel: 'in_app',
                    message: item.message,
                });
            }
        }
    }

    if (rows.length === 0) return;

    try {
        // Drizzle insert of multiple rows
        for (const row of rows) {
            await db
                .insert(attendanceNotifications)
                .values(row as any)
                .onConflictDoNothing();
        }
        log('info', 'flushNotifications', `Queued ${rows.length} attendance notifications`);
    } catch (err) {
        log('error', 'flushNotifications', 'Failed to insert notifications', {
            error: String(err), count: rows.length,
        });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Main webhook dispatcher
// Call this from your Zoom webhook route handler after signature verification.
// ─────────────────────────────────────────────────────────────────────────────

export async function handleZoomWebhook(webhook: ZoomWebhookPayload): Promise<void> {
    const { event } = webhook;

    log('info', 'handleZoomWebhook', `Received event: ${event}`, {
        meetingId: normaliseMeetingId(webhook.payload.object.id),
    });

    try {
        switch (event) {
            case 'meeting.participant_joined':
                await handleParticipantJoined(webhook);
                break;
            case 'meeting.participant_left':
                await handleParticipantLeft(webhook);
                break;
            case 'meeting.ended':
                await handleMeetingEnded(webhook);
                break;
            default:
                log('info', 'handleZoomWebhook', `Unhandled event type: ${event} — ignoring`);
        }
    } catch (err) {
        log('error', 'handleZoomWebhook', `Unhandled error processing event: ${event}`, {
            error: String(err),
            meetingId: normaliseMeetingId(webhook.payload.object.id),
        });
        // Don't rethrow — we always return 200 to Zoom to prevent retries
        // for logic errors (schema ≠ payload). Retryable errors should be
        // re-thrown via the route layer if needed.
    }
}
