// server/src/services/websocket.service.ts
// OWNERSHIP: raw ws — chat messages + user presence
// Path: /ws (defined in realtime.config.ts → WS_CHAT_PATH)

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { WS_CHAT_PATH } from '../realtime.config.js';
import { logger } from '../utils/logger.js';

interface WebSocketClient {
    userId: string;
    role: string;
    ws: WebSocket;
}

export class WebSocketService {
    private static wss: WebSocketServer | null = null;
    private static clients: Map<string, WebSocketClient[]> = new Map();

    /**
     * Initialize WebSocket server
     */
    static initialize(server: Server): void {
        this.wss = new WebSocketServer({ server, path: WS_CHAT_PATH });

        this.wss.on('connection', (ws: WebSocket, req) => {
            logger.info('[WebSocketService] New connection established');

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(ws, data);
                } catch (error) {
                    logger.error('[WebSocketService] Error parsing message', { error: String(error) });
                }
            });

            ws.on('close', () => {
                this.removeClient(ws);
                logger.info('[WebSocketService] Connection closed');
            });

            ws.on('error', (error) => {
                logger.error('[WebSocketService] Socket error', { error: String(error) });
            });
        });

        logger.info(`[WebSocketService] Server initialized on ${WS_CHAT_PATH} (chat + presence)`);
    }

    /**
     * Handle incoming messages
     */
    private static handleMessage(ws: WebSocket, data: any): void {
        const { type, userId, role, token } = data;

        if (type === 'auth') {
            // TODO: Verify JWT token
            this.registerClient(userId, role, ws);
            ws.send(JSON.stringify({ type: 'auth_success', userId }));
        }
    }

    /**
     * Register a client
     */
    private static registerClient(userId: string, role: string, ws: WebSocket): void {
        if (!this.clients.has(userId)) {
            this.clients.set(userId, []);
        }

        this.clients.get(userId)!.push({ userId, role, ws });
        logger.info('[WebSocketService] Client registered', { userId, role });
    }

    /**
     * Remove a client
     */
    private static removeClient(ws: WebSocket): void {
        const entries = Array.from(this.clients.entries());
        for (const [userId, clients] of entries) {
            const index = clients.findIndex((c: WebSocketClient) => c.ws === ws);
            if (index !== -1) {
                clients.splice(index, 1);
                if (clients.length === 0) {
                    this.clients.delete(userId);
                }
                logger.info('[WebSocketService] Client removed', { userId });
                break;
            }
        }
    }

    /**
     * Send notification to specific user
     */
    static sendToUser(userId: string, message: any): void {
        const clients = this.clients.get(userId);
        if (!clients || clients.length === 0) {
            logger.warn('[WebSocketService] No active connections for user', { userId });
            return;
        }

        const payload = JSON.stringify(message);
        clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
            }
        });

        logger.info('[WebSocketService] Message sent to user', { userId, type: message.type });
    }

    /**
     * Send notification to all users with specific role
     */
    static sendToRole(role: string, message: any): void {
        const payload = JSON.stringify(message);
        let count = 0;

        const clientsValues = Array.from(this.clients.values());
        for (const clients of clientsValues) {
            clients.forEach((client: WebSocketClient) => {
                if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(payload);
                    count++;
                }
            });
        }

        logger.info('[WebSocketService] Broadcast to role', { role, count, type: message.type });
    }

    /**
     * Broadcast to all connected clients
     */
    static broadcast(message: any): void {
        if (!this.wss) return;

        const payload = JSON.stringify(message);
        this.wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(payload);
            }
        });

        logger.info('[WebSocketService] Broadcast sent', { type: message.type });
    }

    /**
     * Get active connection count
     */
    static getConnectionCount(): number {
        return this.wss?.clients.size || 0;
    }

    /**
     * Get active users count
     */
    static getActiveUsersCount(): number {
        return this.clients.size;
    }
}
