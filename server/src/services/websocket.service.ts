// server/src/services/websocket.service.ts

import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';

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
        this.wss = new WebSocketServer({ server, path: '/ws' });

        this.wss.on('connection', (ws: WebSocket, req) => {
            console.log('[WebSocket] New connection established');

            ws.on('message', (message: string) => {
                try {
                    const data = JSON.parse(message.toString());
                    this.handleMessage(ws, data);
                } catch (error) {
                    console.error('[WebSocket] Error parsing message:', error);
                }
            });

            ws.on('close', () => {
                this.removeClient(ws);
                console.log('[WebSocket] Connection closed');
            });

            ws.on('error', (error) => {
                console.error('[WebSocket] Error:', error);
            });
        });

        console.log('[WebSocket] Server initialized on /ws');
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
        console.log(`[WebSocket] Client registered: ${userId} (${role})`);
    }

    /**
     * Remove a client
     */
    private static removeClient(ws: WebSocket): void {
        for (const [userId, clients] of this.clients.entries()) {
            const index = clients.findIndex(c => c.ws === ws);
            if (index !== -1) {
                clients.splice(index, 1);
                if (clients.length === 0) {
                    this.clients.delete(userId);
                }
                console.log(`[WebSocket] Client removed: ${userId}`);
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
            console.warn(`[WebSocket] No active connections for user: ${userId}`);
            return;
        }

        const payload = JSON.stringify(message);
        clients.forEach(client => {
            if (client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(payload);
            }
        });

        console.log(`[WebSocket] Message sent to user ${userId}:`, message.type);
    }

    /**
     * Send notification to all users with specific role
     */
    static sendToRole(role: string, message: any): void {
        const payload = JSON.stringify(message);
        let count = 0;

        for (const clients of this.clients.values()) {
            clients.forEach(client => {
                if (client.role === role && client.ws.readyState === WebSocket.OPEN) {
                    client.ws.send(payload);
                    count++;
                }
            });
        }

        console.log(`[WebSocket] Message sent to ${count} ${role}s:`, message.type);
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

        console.log('[WebSocket] Broadcast sent:', message.type);
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
