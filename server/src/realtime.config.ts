/**
 * server/src/realtime.config.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Authoritative path registry for all WebSocket / real-time services.
 *
 * This file is the single source of truth for path assignments.
 * It is imported by no runtime code — it exists purely as documentation and
 * a guard against future path conflicts.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  Protocol      │ Path             │ Implementation           │ Purpose   │
 * ├────────────────┼──────────────────┼──────────────────────────┼───────────┤
 * │  raw ws (ws)   │ /ws              │ websocket.service.ts     │ Chat msgs │
 * │                │                  │ websocket.ts (handlers)  │ + presence│
 * ├────────────────┼──────────────────┼──────────────────────────┼───────────┤
 * │  Socket.IO     │ /socket.io/*     │ realtime.service.ts      │ Live      │
 * │  (engine.io)   │  namespace:      │   /attendance NS         │ attendance│
 * │                │  /attendance     │                          │ tracking  │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Why two separate technologies?
 * ───────────────────────────────
 *  • Chat/presence needs low overhead and stateless message fan-out. Raw ws is
 *    lean and already integrated with the auth + conversation service layer.
 *  • Attendance needs rooms, namespaces, Redis fan-out, automatic reconnection,
 *    and debounced aggregate broadcasts — all built into Socket.IO.
 *
 * How path isolation works
 * ────────────────────────
 * Both services attach to the SAME `http.Server` instance (created in
 * index.ts). Node's HTTP upgrade path segregates them:
 *
 *   Upgrade request →  req.url checked by each library's 'upgrade' handler
 *     /ws          →  ws.WebSocketServer (path: '/ws') handles it
 *     /socket.io/* →  Socket.IO's engine.io handles it
 *     anything else → falls through (not upgraded)
 *
 * There is NO shared port, NO shared path, and NO shared listener registry.
 *
 * Initialization order (index.ts)
 * ────────────────────────────────
 *   1. `createServer(app)`                  — HTTP server created
 *   2. Express routes mounted
 *   3. `WebSocketService.initialize(server)` — attaches ws on /ws
 *   4. `initializeSocket(server)`            — attaches Socket.IO on /socket.io
 *   5. `server.listen(PORT)`                 — starts accepting connections
 *
 * Environment variables
 * ─────────────────────
 *   JWT_SECRET    — used by BOTH services for token verification
 *   REDIS_URL     — if set, Socket.IO uses Redis adapter (multi-process)
 *   CORS_ORIGINS  — comma-separated origins; respected by both services
 *
 * Startup log lines to verify correct init
 * ─────────────────────────────────────────
 *   ✅ Acadize backend server is running on http://localhost:<PORT>
 *   🔌 WebSocket (chat) running on ws://localhost:<PORT>/ws
 *   ⚡ Socket.IO (attendance) running on ws://localhost:<PORT>/attendance
 *
 * Path conflict checklist (run before adding new real-time services)
 * ──────────────────────────────────────────────────────────────────
 *   [ ] New path must not start with /ws        (owned by WebSocketService)
 *   [ ] New path must not start with /socket.io (owned by Socket.IO engine)
 *   [ ] Do NOT create WebSocketServer({ server }) without a `path` option —
 *       that creates a catch-all that intercepts ALL upgrades.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Runtime‐accessible constants (import these instead of hardcoding strings)
// ─────────────────────────────────────────────────────────────────────────────

/** Path for the raw ws server used by chat and presence. */
export const WS_CHAT_PATH = '/ws' as const;

/**
 * Socket.IO namespace for live attendance tracking.
 * The engine itself is always available at /socket.io/*.
 */
export const SOCKETIO_ATTENDANCE_NAMESPACE = '/attendance' as const;
