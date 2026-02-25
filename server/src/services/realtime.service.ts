/**
 * realtime.service.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Socket.IO real-time layer for live attendance tracking on the teacher dashboard.
 *
 * Architecture
 * ────────────
 *  Namespace : /attendance
 *  Rooms     : session:{sessionId}          – all participants (teacher + students)
 *              session:{sessionId}:teachers – teacher-only events (QR rotation etc.)
 *
 * Connection auth (JWT handshake)
 * ────────────────────────────────
 *  Client sends  { auth: { token: "<JWT>" } }  in the Socket.IO handshake.
 *  Token is verified with the same JWT_SECRET used by the REST API.
 *  Payload fields (from TokenPayload in token.service.ts):
 *    { id, email, role, fullName, organizationId }
 *
 * Events emitted TO clients (server → client)
 * ────────────────────────────────────────────
 *  'student:checked-in'   → { studentId, studentName, time, method }
 *  'student:left'         → { studentId, time }
 *  'attendance:updated'   → { totalEnrolled, checkedIn, livePercent }
 *  'qr:rotated'           → { newToken, expiresAt }            (teacher-only room)
 *  'session:ended'        → { finalStats }
 *
 * Events received FROM clients (client → server)
 * ────────────────────────────────────────────────
 *  'join:session'         → { sessionId }   – teacher joins monitoring room
 *  'leave:session'        → { sessionId }   – teacher leaves monitoring room
 *
 * Integration hooks (called by other services)
 * ─────────────────────────────────────────────
 *  emitStudentCheckedIn(sessionId, data)
 *  emitStudentLeft(sessionId, data)
 *  emitAttendanceUpdate(sessionId, data)   ← debounced; max once per second
 *  emitQrRotated(sessionId, data)          ← teacher-only
 *  emitSessionEnded(sessionId, finalStats)
 *
 * Scalability
 * ────────────
 *  • Uses socket.io with optional Redis adapter (REDIS_URL env var).
 *  • attendance:updated events are debounced per session (≤ 1 event/second).
 *  • Heartbeat ping every 30 seconds to shed dead connections quickly.
 *  • Designed for 500+ concurrent students — rooms fan-out natively via Socket.IO.
 *
 * Environment variables
 * ─────────────────────
 *  JWT_SECRET     – verifies connection tokens (required)
 *  REDIS_URL      – if set, uses @socket.io/redis-adapter for multi-process (optional)
 *  CLIENT_URL     – used for CORS origin whitelist
 *  CORS_ORIGINS   – comma-separated extra origins (optional)
 */

import { Server as SocketIOServer, Socket, Namespace } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the decoded JWT (mirrors TokenPayload in token.service.ts) */
interface AuthPayload {
    id: string;
    email: string;
    role: string;
    fullName: string;
    organizationId: string;
}

/** Socket with our custom typed data attached */
interface AttendanceSocket extends Socket {
    data: {
        userId: string;
        fullName: string;
        role: string;
        organizationId: string;
    };
}

// Public event payload types (also used by callers)
export interface CheckedInPayload { studentId: string; studentName: string; time: string; method: 'qr' | 'zoom' | 'manual'; }
export interface StudentLeftPayload { studentId: string; time: string; }
export interface AttendanceUpdatePayload { totalEnrolled: number; checkedIn: number; livePercent: number; }
export interface QrRotatedPayload { newToken: string; expiresAt: string; }
export interface SessionEndedPayload { finalStats: Record<string, unknown>; }

// ─────────────────────────────────────────────────────────────────────────────
// Module state
// ─────────────────────────────────────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'change-me';

/** The /attendance namespace – set once in initializeSocket */
let attendanceNs: Namespace | null = null;

/**
 * Debounce timers for attendance:updated per session.
 * We buffer the latest payload and flush it at most once per second.
 */
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingUpdates = new Map<string, AttendanceUpdatePayload>();

const DEBOUNCE_MS = 1_000;   // max 1 emit/second per session
const HEARTBEAT_MS = 30_000;  // server → client ping interval

// ─────────────────────────────────────────────────────────────────────────────
// Logging helpers
// ─────────────────────────────────────────────────────────────────────────────

function log(level: 'info' | 'warn' | 'error', msg: string, meta?: Record<string, unknown>) {
    const entry = { ts: new Date().toISOString(), level, ctx: 'realtime.service', msg, ...meta };
    if (level === 'error') { console.error('[realtime]', JSON.stringify(entry)); return; }
    if (level === 'warn') { console.warn('[realtime]', JSON.stringify(entry)); return; }
    console.info('[realtime]', JSON.stringify(entry));
}

// ─────────────────────────────────────────────────────────────────────────────
// CORS origin helper (mirrors index.ts logic)
// ─────────────────────────────────────────────────────────────────────────────

function buildCorsOrigins(): string[] {
    const origins: string[] = ['http://localhost:5173', 'http://localhost:3000'];
    if (process.env.CLIENT_URL) origins.push(process.env.CLIENT_URL);
    if (process.env.CORS_ORIGINS) {
        process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean).forEach(o => origins.push(o));
    }
    return [...new Set(origins)];
}

// ─────────────────────────────────────────────────────────────────────────────
// Redis adapter (optional – enabled when REDIS_URL is present)
// ─────────────────────────────────────────────────────────────────────────────

async function attachRedisAdapter(io: SocketIOServer): Promise<void> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) {
        log('info', 'No REDIS_URL set — running in single-process mode');
        return;
    }

    try {
        // Dynamic import so the package is optional (doesn't break if not installed)
        const { createAdapter } = await import('@socket.io/redis-adapter' as any);
        const { createClient } = await import('redis' as any);

        const pubClient = createClient({ url: redisUrl });
        const subClient = pubClient.duplicate();

        await Promise.all([pubClient.connect(), subClient.connect()]);

        io.adapter(createAdapter(pubClient, subClient));
        log('info', 'Redis adapter attached', { url: redisUrl.replace(/:\/\/.*@/, '://***@') });
    } catch (err) {
        log('warn', 'Redis adapter failed to load — falling back to in-memory', { error: String(err) });
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// JWT authentication middleware
// ─────────────────────────────────────────────────────────────────────────────

function authMiddleware(socket: AttendanceSocket, next: (err?: Error) => void): void {
    try {
        const token: string | undefined =
            socket.handshake.auth?.token ??
            socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, '');

        if (!token) {
            return next(new Error('AUTH_REQUIRED: No token provided'));
        }

        const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

        if (!payload.id || !payload.organizationId) {
            return next(new Error('AUTH_INVALID: Token missing required claims'));
        }

        // Attach decoded claims to socket.data for use in event handlers
        socket.data = {
            userId: payload.id,
            fullName: payload.fullName,
            role: payload.role,
            organizationId: payload.organizationId,
        };

        log('info', 'Socket authenticated', { userId: payload.id, role: payload.role });
        next();
    } catch (err) {
        next(new Error(`AUTH_FAILED: ${String(err)}`));
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-connection event handler
// ─────────────────────────────────────────────────────────────────────────────

function registerConnectionHandlers(socket: AttendanceSocket): void {
    const { userId, fullName, role } = socket.data;

    log('info', 'Client connected to /attendance', { socketId: socket.id, userId, role });

    // ── join:session ──────────────────────────────────────────────────────────
    socket.on('join:session', (payload: { sessionId: string }) => {
        if (!payload?.sessionId) {
            socket.emit('error', { message: 'join:session requires { sessionId }' });
            return;
        }

        const room = sessionRoom(payload.sessionId);
        const teacherRoom = teacherOnlyRoom(payload.sessionId);

        socket.join(room);
        log('info', 'Socket joined session room', { userId, sessionId: payload.sessionId, role });

        // Teachers get access to the exclusive teacher room (QR events etc.)
        if (role === 'teacher' || role === 'admin') {
            socket.join(teacherRoom);
            log('info', 'Teacher joined teacher-only room', { userId, sessionId: payload.sessionId });
        }

        socket.emit('joined:session', {
            sessionId: payload.sessionId,
            room,
            timestamp: new Date().toISOString(),
        });
    });

    // ── leave:session ─────────────────────────────────────────────────────────
    socket.on('leave:session', (payload: { sessionId: string }) => {
        if (!payload?.sessionId) return;

        socket.leave(sessionRoom(payload.sessionId));
        socket.leave(teacherOnlyRoom(payload.sessionId));

        log('info', 'Socket left session room', { userId, sessionId: payload.sessionId });
        socket.emit('left:session', { sessionId: payload.sessionId });
    });

    // ── disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', (reason) => {
        log('info', 'Client disconnected from /attendance', { socketId: socket.id, userId, reason });
    });

    // ── error ────────────────────────────────────────────────────────────────
    socket.on('error', (err) => {
        log('error', 'Socket error', { socketId: socket.id, userId, error: String(err) });
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Room name helpers
// ─────────────────────────────────────────────────────────────────────────────

function sessionRoom(sessionId: string): string { return `session:${sessionId}`; }
function teacherOnlyRoom(sessionId: string): string { return `session:${sessionId}:teachers`; }

// ─────────────────────────────────────────────────────────────────────────────
// initializeSocket – attach Socket.IO to the HTTP server
// ─────────────────────────────────────────────────────────────────────────────

export async function initializeSocket(httpServer: HttpServer): Promise<SocketIOServer> {
    const io = new SocketIOServer(httpServer, {
        cors: {
            origin: buildCorsOrigins(),
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Tune for high-concurrency: 500+ clients
        pingTimeout: 20_000,
        pingInterval: HEARTBEAT_MS,
        // Allow both polling fallback and WebSocket upgrade
        transports: ['websocket', 'polling'],
        // Limit payload size (protects against oversized messages)
        maxHttpBufferSize: 1e5, // 100 KB
    });

    // Optional Redis adapter for multi-process / multi-dyno deployments
    await attachRedisAdapter(io);

    // ─────────────────────── /attendance namespace ────────────────────────────
    const attendance = io.of('/attendance');
    attendanceNs = attendance;

    // Apply JWT auth before any connection handler runs
    attendance.use((socket, next) => authMiddleware(socket as AttendanceSocket, next));

    attendance.on('connection', (socket) => {
        registerConnectionHandlers(socket as AttendanceSocket);
    });

    log('info', 'Socket.IO /attendance namespace initialised', {
        origins: buildCorsOrigins(),
        heartbeatSecs: HEARTBEAT_MS / 1000,
    });

    return io;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public integration functions — call these from attendance/QR/Zoom services
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emit 'student:checked-in' to everyone in the session room.
 * Call this immediately after an attendanceRecord is created.
 */
export function emitStudentCheckedIn(sessionId: string, data: CheckedInPayload): void {
    if (!attendanceNs) return;
    attendanceNs.to(sessionRoom(sessionId)).emit('student:checked-in', data);
    log('info', 'student:checked-in emitted', { sessionId, studentId: data.studentId, method: data.method });
}

/**
 * Emit 'student:left' to everyone in the session room.
 * Call this when a student explicitly leaves or when the Zoom webhook fires.
 */
export function emitStudentLeft(sessionId: string, data: StudentLeftPayload): void {
    if (!attendanceNs) return;
    attendanceNs.to(sessionRoom(sessionId)).emit('student:left', data);
    log('info', 'student:left emitted', { sessionId, studentId: data.studentId });
}

/**
 * Emit 'attendance:updated' — DEBOUNCED to max once per second per session.
 * This is the high-frequency aggregate stat update for the teacher's live view.
 * Call this after every check-in, leave, or status change.
 */
export function emitAttendanceUpdate(sessionId: string, data: AttendanceUpdatePayload): void {
    if (!attendanceNs) return;

    // Always overwrite with the latest value so stale counts are never sent
    pendingUpdates.set(sessionId, data);

    if (debounceTimers.has(sessionId)) return; // already scheduled — let it flush

    const timer = setTimeout(() => {
        const latest = pendingUpdates.get(sessionId);
        if (latest && attendanceNs) {
            attendanceNs.to(sessionRoom(sessionId)).emit('attendance:updated', latest);
            log('info', 'attendance:updated emitted', {
                sessionId,
                checkedIn: latest.checkedIn,
                total: latest.totalEnrolled,
                livePercent: latest.livePercent,
            });
        }
        debounceTimers.delete(sessionId);
        pendingUpdates.delete(sessionId);
    }, DEBOUNCE_MS);

    debounceTimers.set(sessionId, timer);
}

/**
 * Emit 'qr:rotated' — only to teachers/admins in the session.
 * Call this after generating a new QR token in the attendance service.
 */
export function emitQrRotated(sessionId: string, data: QrRotatedPayload): void {
    if (!attendanceNs) return;
    attendanceNs.to(teacherOnlyRoom(sessionId)).emit('qr:rotated', data);
    log('info', 'qr:rotated emitted to teacher room', { sessionId, expiresAt: data.expiresAt });
}

/**
 * Emit 'session:ended' to everyone in the session room, then clean up.
 * Call this after the session's status is set to 'ended' and final stats are computed.
 */
export function emitSessionEnded(sessionId: string, finalStats: SessionEndedPayload['finalStats']): void {
    if (!attendanceNs) return;

    const room = sessionRoom(sessionId);
    attendanceNs.to(room).emit('session:ended', { finalStats });
    log('info', 'session:ended emitted', { sessionId });

    // Flush any pending debounced update before cleanup
    const timer = debounceTimers.get(sessionId);
    if (timer) {
        clearTimeout(timer);
        debounceTimers.delete(sessionId);
        pendingUpdates.delete(sessionId);
    }

    // Remove all sockets from the room (they still stay connected to the namespace)
    attendanceNs.in(room).socketsLeave(room);
    attendanceNs.in(teacherOnlyRoom(sessionId)).socketsLeave(teacherOnlyRoom(sessionId));
}

/**
 * Return the number of sockets currently in a session room.
 * Useful for "live count" queries from the REST API.
 */
export async function getSessionRoomSize(sessionId: string): Promise<number> {
    if (!attendanceNs) return 0;
    const sockets = await attendanceNs.in(sessionRoom(sessionId)).fetchSockets();
    return sockets.length;
}
