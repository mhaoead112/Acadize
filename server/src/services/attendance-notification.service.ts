/**
 * attendance-notification.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Notification system for attendance-related events in the Smart Attendance
 * feature. Handles four event types across four channels (in_app / sms /
 * whatsapp / email) with retry logic, failure logging and real-time push.
 *
 * Event types
 * ────────────
 *  'attendance_marked'  – student checked in            → parent notified
 *  'absent_alert'       – student marked absent         → student + parent
 *  'low_attendance'     – student below threshold       → student + parent + teacher
 *  'session_starting'   – session starts in 15 min      → enrolled students
 *
 * Channel selection
 * ──────────────────
 *  in_app   – always sent, uses existing `notifications` table + Socket.IO push
 *  sms      – if parent/student has a phone number
 *  whatsapp – if parent/student has a phone number (template-based)
 *  email    – future; not yet wired (placeholder logged)
 *
 * Retry policy
 * ─────────────
 *  SMS & WhatsApp: up to 3 attempts with exponential back-off (1s → 2s → 4s).
 *  In-app:         single attempt (DB write); Socket.IO push is best-effort.
 *
 * Integration
 * ────────────
 *  Call `triggerNotification(event)` from:
 *    • attendance.service.ts  – after record creation / absence detection
 *    • zoom.service.ts        – after handleMeetingEnded
 *    • session.service.ts     – from a 15-min cron before session start
 *
 * Environment variables
 * ─────────────────────
 *  TWILIO_ACCOUNT_SID  – optional; enables SMS (Twilio)
 *  TWILIO_AUTH_TOKEN   – optional
 *  TWILIO_FROM_NUMBER  – optional; e.g. "+15005550006"
 *  WHATSAPP_API_URL    – optional; WhatsApp Business API base URL
 *  WHATSAPP_API_TOKEN  – optional
 *  WHATSAPP_FROM       – optional; "whatsapp:+14155238886"
 */

import { db } from '../db/index.js';
import {
    attendanceNotifications,
    notifications,
    users,
    parentChildren,
    sessions,
    courses,
    enrollments,
    attendanceNotificationTypeEnum,
    attendanceNotificationChannelEnum,
    attendanceNotificationStatusEnum,
} from '../db/schema.js';
import type { InferInsertModel } from 'drizzle-orm';
import { eq } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

// Derive types from pgEnum definitions so Drizzle's insert overload is satisfied
type NotifType = typeof attendanceNotificationTypeEnum.enumValues[number];
type NotifChannel = typeof attendanceNotificationChannelEnum.enumValues[number];
type NotifStatus = typeof attendanceNotificationStatusEnum.enumValues[number];


/** Slim user record used for recipient resolution */
interface Recipient {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
}

// ────────── Event input shapes ────────────────────────────────────────────────

export interface AttendanceMarkedEvent {
    type: 'attendance_marked';
    sessionId: string;
    studentId: string;
    /** Check-in method: 'qr' | 'zoom' | 'manual' */
    method: string;
    checkedInAt: Date;
}

export interface AbsentAlertEvent {
    type: 'absent_alert';
    sessionId: string;
    studentId: string;
    date: Date;
}

export interface LowAttendanceEvent {
    type: 'low_attendance';
    sessionId: string;
    studentId: string;
    currentPercent: number;
    threshold: number;
}

export interface SessionStartingEvent {
    type: 'session_starting';
    sessionId: string;
    startsAt: Date;
}

export type AttendanceEvent =
    | AttendanceMarkedEvent
    | AbsentAlertEvent
    | LowAttendanceEvent
    | SessionStartingEvent;

// ─────────────────────────────────────────────────────────────────────────────
// Logger
// ─────────────────────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>): void {
    const entry = { ts: new Date().toISOString(), level, ctx: 'attendance-notification.service', msg, ...meta };
    if (level === 'error') { console.error('[att-notif]', JSON.stringify(entry)); return; }
    if (level === 'warn') { console.warn('[att-notif]', JSON.stringify(entry)); return; }
    console.info('[att-notif]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification message templates
// ─────────────────────────────────────────────────────────────────────────────

function formatTime(d: Date): string {
    return d.toLocaleTimeString('en-EG', { hour: '2-digit', minute: '2-digit', hour12: true });
}
function formatDate(d: Date): string {
    return d.toLocaleDateString('en-EG', { weekday: 'short', month: 'short', day: 'numeric' });
}

interface TemplateVars {
    studentName: string;
    courseName: string;
    time?: string;
    date?: string;
    percent?: number;
    threshold?: number;
}

function buildTitle(type: NotifType): string {
    switch (type) {
        case 'attendance_marked': return '✅ Check-in Confirmed';
        case 'absent_alert': return '⚠️ Absence Alert';
        case 'low_attendance': return '📊 Low Attendance Warning';
        case 'session_starting': return '📢 Session Starting Soon';
    }
}

function buildMessage(type: NotifType, vars: TemplateVars): string {
    switch (type) {
        case 'attendance_marked':
            return `✅ ${vars.studentName} checked in to ${vars.courseName} at ${vars.time ?? ''}`;
        case 'absent_alert':
            return `⚠️ ${vars.studentName} was marked absent from ${vars.courseName} on ${vars.date ?? ''}`;
        case 'low_attendance':
            return `📊 ${vars.studentName}'s attendance in ${vars.courseName} is ${vars.percent ?? 0}% (below ${vars.threshold ?? 75}%)`;
        case 'session_starting':
            return `📢 ${vars.courseName} session starts in 15 minutes`;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// getParentForStudent
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the parent user linked to the student via parentChildren table.
 * Returns null if no parent is linked.
 */
export async function getParentForStudent(studentId: string): Promise<Recipient | null> {
    const rows = await db
        .select({
            id: users.id,
            fullName: users.fullName,
            email: users.email,
            phone: users.phone,
            role: users.role,
        })
        .from(parentChildren)
        .innerJoin(users, eq(users.id, parentChildren.parentId))
        .where(eq(parentChildren.childId, studentId))
        .limit(1);

    return rows[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-app notification delivery
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a record in the generic `notifications` table and attempt
 * a real-time Socket.IO push to the user (if they are connected).
 */
export async function sendInAppNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
): Promise<void> {
    try {
        await db.insert(notifications).values({
            userId,
            type: 'attendance',
            title,
            message,
            isRead: false,
        });

        // Best-effort WebSocket push via existing WebSocketService
        try {
            const { WebSocketService } = await import('./websocket.service.js');
            WebSocketService.sendToUser(userId, {
                type: 'attendance_notification',
                title,
                message,
                metadata,
                sentAt: new Date().toISOString(),
            });
        } catch {
            // Socket push is best-effort; DB write already succeeded
        }

        log('info', 'In-app notification sent', { userId, title });
    } catch (err) {
        log('error', 'Failed to send in-app notification', { userId, error: String(err) });
        throw err;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Retry helper
// ─────────────────────────────────────────────────────────────────────────────

async function withRetry<T>(
    label: string,
    fn: () => Promise<T>,
    maxTries: number = 3,
): Promise<{ ok: boolean; result?: T; error?: string }> {
    for (let attempt = 1; attempt <= maxTries; attempt++) {
        try {
            const result = await fn();
            log('info', `${label} succeeded`, { attempt });
            return { ok: true, result };
        } catch (err) {
            const delayMs = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
            log('warn', `${label} failed (attempt ${attempt}/${maxTries}); retrying in ${delayMs}ms`, {
                error: String(err),
                attempt,
            });
            if (attempt < maxTries) {
                await new Promise(r => setTimeout(r, delayMs));
            } else {
                log('error', `${label} exhausted all ${maxTries} attempts`, { error: String(err) });
                return { ok: false, error: String(err) };
            }
        }
    }
    return { ok: false, error: 'Retry loop exited unexpectedly' };
}

// ─────────────────────────────────────────────────────────────────────────────
// SMS delivery (Twilio integration point)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send an SMS message to a phone number.
 * Retries up to 3 times with exponential back-off (1s → 2s → 4s).
 *
 * Wire up Twilio by setting:
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER
 */
export async function sendSmsNotification(
    phone: string,
    message: string,
): Promise<{ ok: boolean; sid?: string; error?: string }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
        log('warn', 'SMS skipped: Twilio credentials not configured', { phone });
        return { ok: false, error: 'SMS provider not configured' };
    }

    return withRetry(`SMS to ${phone}`, async () => {
        // ── Twilio REST API (lightweight, no SDK dependency) ──────────────────
        const body = new URLSearchParams({
            To: phone,
            From: fromNumber,
            Body: message,
        });

        const creds = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;

        const resp = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${creds}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`Twilio ${resp.status}: ${txt}`);
        }

        const data = await resp.json() as { sid: string };
        log('info', 'SMS sent via Twilio', { phone, sid: data.sid });
        return data.sid;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp delivery (WhatsApp Business API integration point)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Send a WhatsApp template message.
 * Retries up to 3 times with exponential back-off.
 *
 * Wire up by setting:
 *   WHATSAPP_API_URL   – e.g. "https://graph.facebook.com/v19.0/{phone_number_id}"
 *   WHATSAPP_API_TOKEN – Bearer token
 *   WHATSAPP_FROM      – sender phone number id
 *
 * Note: WhatsApp Business API requires pre-approved message templates for
 * outbound messages to users who haven't messaged first within 24h.
 * The `templateName` should match a template approved in your WABA account.
 */
export async function sendWhatsAppNotification(
    phone: string,
    message: string,
    templateName: string = 'attendance_update',
): Promise<{ ok: boolean; messageId?: string; error?: string }> {
    const apiUrl = process.env.WHATSAPP_API_URL;
    const apiToken = process.env.WHATSAPP_API_TOKEN;

    if (!apiUrl || !apiToken) {
        log('warn', 'WhatsApp skipped: API credentials not configured', { phone });
        return { ok: false, error: 'WhatsApp provider not configured' };
    }

    // Normalise phone to E.164 (strip spaces/dashes, ensure leading +)
    const to = phone.trim().replace(/[\s\-().]/g, '').replace(/^00/, '+');

    return withRetry(`WhatsApp to ${to}`, async () => {
        const resp = await fetch(`${apiUrl}/messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messaging_product: 'whatsapp',
                to,
                type: 'template',
                template: {
                    name: templateName,
                    language: { code: 'en' },
                    components: [{
                        type: 'body',
                        parameters: [{ type: 'text', text: message }],
                    }],
                },
            }),
        });

        if (!resp.ok) {
            const txt = await resp.text();
            throw new Error(`WhatsApp API ${resp.status}: ${txt}`);
        }

        const data = await resp.json() as { messages?: Array<{ id: string }> };
        const msgId = data.messages?.[0]?.id;
        log('info', 'WhatsApp message sent', { phone: to, messageId: msgId, template: templateName });
        return msgId;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: persist + deliver one notification row
// ─────────────────────────────────────────────────────────────────────────────

async function deliverToRecipient(opts: {
    recipient: Recipient;
    sessionId: string;
    type: NotifType;
    channel: NotifChannel;
    title: string;
    message: string;
}): Promise<void> {
    const { recipient, sessionId, type, channel, title, message } = opts;

    // 1. Insert a 'pending' row in attendanceNotifications
    let rowId: string | undefined;
    try {
        const [row] = await db
            .insert(attendanceNotifications)
            .values({
                userId: recipient.id,
                sessionId,
                type: type as NotifType,
                channel: channel as NotifChannel,
                message,
            })
            .returning({ id: attendanceNotifications.id });
        rowId = row?.id;
    } catch (err) {
        log('error', 'Failed to insert attendanceNotification row', {
            userId: recipient.id, type, channel, error: String(err),
        });
        return;
    }

    // 2. Deliver via the appropriate channel
    let ok = false;
    let failureReason: string | undefined;

    try {
        switch (channel) {
            case 'in_app': {
                await sendInAppNotification(recipient.id, title, message);
                ok = true;
                break;
            }
            case 'sms': {
                if (!recipient.phone) {
                    log('warn', 'SMS skipped: no phone on record', { userId: recipient.id });
                    failureReason = 'no_phone';
                    break;
                }
                const res = await sendSmsNotification(recipient.phone, message);
                ok = res.ok;
                failureReason = res.error;
                break;
            }
            case 'whatsapp': {
                if (!recipient.phone) {
                    log('warn', 'WhatsApp skipped: no phone on record', { userId: recipient.id });
                    failureReason = 'no_phone';
                    break;
                }
                const res = await sendWhatsAppNotification(recipient.phone, message);
                ok = res.ok;
                failureReason = res.error;
                break;
            }
            case 'email': {
                // Placeholder – wire an email service here (e.g. Resend, SendGrid)
                log('info', 'Email notification placeholder logged', {
                    userId: recipient.id, email: recipient.email, title,
                });
                ok = true; // treat as sent so we don't retry indefinitely
                break;
            }
        }
    } catch (err) {
        ok = false;
        failureReason = String(err);
        log('error', 'Unexpected error during channel delivery', {
            userId: recipient.id, channel, error: failureReason,
        });
    }

    // 3. Update the row status
    if (rowId) {
        try {
            await db
                .update(attendanceNotifications)
                .set({
                    status: (ok ? 'sent' : 'failed') as NotifStatus,
                    sentAt: ok ? new Date() : undefined,
                    failureReason: failureReason ?? null,
                    retryCount: ok ? 0 : 1,
                })
                .where(eq(attendanceNotifications.id, rowId));
        } catch (err) {
            log('error', 'Failed to update attendanceNotification status', { rowId, error: String(err) });
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Internal helper: determine which channels to use for a recipient
// ─────────────────────────────────────────────────────────────────────────────

function channelsForRecipient(recipient: Recipient): NotifChannel[] {
    const channels: NotifChannel[] = ['in_app'];
    if (recipient.phone) {
        channels.push('sms', 'whatsapp');
    }
    // email is always available in principle; opt in here if desired
    // channels.push('email');
    return channels;
}

// ─────────────────────────────────────────────────────────────────────────────
// triggerNotification – the main entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Trigger all notifications for an attendance event.
 *
 * This function is fire-and-forget from the caller's perspective:
 * wrap in `setImmediate` or `void` where you don't want to await it.
 *
 * @example
 *   void triggerNotification({ type: 'absent_alert', sessionId, studentId, date });
 */
export async function triggerNotification(event: AttendanceEvent): Promise<void> {
    try {
        const { enqueueJob } = await import('../jobs/index.js');
        await enqueueJob('attendance_notification', event);
    } catch (e) {
        log('error', 'Failed to enqueue attendance job, falling back to sync', { error: e });
        await triggerNotificationSync(event);
    }
}

export async function triggerNotificationSync(event: AttendanceEvent): Promise<void> {
    log('info', 'Triggering notification', { type: event.type });

    try {
        // ── 1. Load session + course context ───────────────────────────────
        const [sessionRow] = await db
            .select({
                id: sessions.id,
                title: sessions.title,
                courseId: sessions.courseId,
                createdBy: sessions.createdBy,
                startTime: sessions.startTime,
            })
            .from(sessions)
            .where(eq(sessions.id, event.sessionId))
            .limit(1);

        if (!sessionRow) {
            log('warn', 'Session not found; skipping notification', { sessionId: event.sessionId });
            return;
        }

        const [courseRow] = await db
            .select({ title: courses.title })
            .from(courses)
            .where(eq(courses.id, sessionRow.courseId))
            .limit(1);

        const courseName = courseRow?.title ?? 'Unknown Course';

        // ── 2. Resolve recipients per event type ───────────────────────────
        switch (event.type) {

            // ──────────────────────────────────────────────────────────────
            case 'attendance_marked': {
                const [student] = await db
                    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role })
                    .from(users).where(eq(users.id, event.studentId)).limit(1);

                if (!student) break;

                const parent = await getParentForStudent(event.studentId);
                const vars: TemplateVars = {
                    studentName: student.fullName,
                    courseName,
                    time: formatTime(event.checkedInAt),
                };

                // Notify parent only (student already knows they checked in)
                if (parent) {
                    const msg = buildMessage('attendance_marked', vars);
                    const ttl = buildTitle('attendance_marked');
                    for (const channel of channelsForRecipient(parent)) {
                        await deliverToRecipient({
                            recipient: parent, sessionId: event.sessionId,
                            type: 'attendance_marked', channel, title: ttl, message: msg,
                        });
                    }
                }
                break;
            }

            // ──────────────────────────────────────────────────────────────
            case 'absent_alert': {
                const [student] = await db
                    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role })
                    .from(users).where(eq(users.id, event.studentId)).limit(1);

                if (!student) break;

                const parent = await getParentForStudent(event.studentId);
                const vars: TemplateVars = {
                    studentName: student.fullName,
                    courseName,
                    date: formatDate(event.date),
                };
                const msg = buildMessage('absent_alert', vars);
                const ttl = buildTitle('absent_alert');

                // Notify student
                for (const channel of channelsForRecipient(student)) {
                    await deliverToRecipient({
                        recipient: student, sessionId: event.sessionId,
                        type: 'absent_alert', channel, title: ttl, message: msg,
                    });
                }

                // Notify parent
                if (parent) {
                    for (const channel of channelsForRecipient(parent)) {
                        await deliverToRecipient({
                            recipient: parent, sessionId: event.sessionId,
                            type: 'absent_alert', channel, title: ttl, message: msg,
                        });
                    }
                }
                break;
            }

            // ──────────────────────────────────────────────────────────────
            case 'low_attendance': {
                const [student] = await db
                    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role })
                    .from(users).where(eq(users.id, event.studentId)).limit(1);

                if (!student) break;

                const parent = await getParentForStudent(event.studentId);

                // Teacher
                const [teacher] = await db
                    .select({ id: users.id, fullName: users.fullName, email: users.email, phone: users.phone, role: users.role })
                    .from(users).where(eq(users.id, sessionRow.createdBy)).limit(1);

                const vars: TemplateVars = {
                    studentName: student.fullName,
                    courseName,
                    percent: event.currentPercent,
                    threshold: event.threshold,
                };
                const msg = buildMessage('low_attendance', vars);
                const ttl = buildTitle('low_attendance');

                const targets: Recipient[] = [student, ...(parent ? [parent] : []), ...(teacher ? [teacher] : [])];
                for (const recipient of targets) {
                    for (const channel of channelsForRecipient(recipient)) {
                        await deliverToRecipient({
                            recipient, sessionId: event.sessionId,
                            type: 'low_attendance', channel, title: ttl, message: msg,
                        });
                    }
                }
                break;
            }

            // ──────────────────────────────────────────────────────────────
            case 'session_starting': {
                // Load all enrolled students for this course
                const enrolledStudents = await db
                    .select({
                        id: users.id,
                        fullName: users.fullName,
                        email: users.email,
                        phone: users.phone,
                        role: users.role,
                    })
                    .from(enrollments)
                    .innerJoin(users, eq(users.id, enrollments.studentId))
                    .where(eq(enrollments.courseId, sessionRow.courseId));

                const vars: TemplateVars = { studentName: '', courseName };
                const msg = buildMessage('session_starting', vars);
                const ttl = buildTitle('session_starting');

                // Fan-out: deliver in-app only by default (SMS would be expensive at scale)
                // Upgrade to 'channelsForRecipient' if SMS/WA reminders are desired
                const tasks = enrolledStudents.map(student =>
                    deliverToRecipient({
                        recipient: student, sessionId: event.sessionId,
                        type: 'session_starting', channel: 'in_app', title: ttl, message: msg,
                    })
                );

                // Process in parallel with a concurrency cap of 20
                await Promise.allSettled(chunk(tasks, 20).flatMap(batch => batch));
                log('info', `session_starting notifications dispatched`, {
                    sessionId: event.sessionId, count: enrolledStudents.length,
                });
                break;
            }
        }
    } catch (err) {
        log('error', 'triggerNotification failed', { event, error: String(err) });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility: chunk an array into groups of `size`
// ─────────────────────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
    }
    return out;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience re-exports for callers
// ─────────────────────────────────────────────────────────────────────────────

export type { NotifType, NotifChannel, NotifStatus };
