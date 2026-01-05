import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { InsertGroupMessage, GroupMessage, User } from '@shared/schema';
import { storage } from './storage';

interface WebSocketClient extends WebSocket {
  userId?: string;
  groupIds?: string[];
  isAlive?: boolean;
}

interface WSMessage {
  type: 'join_group' | 'leave_group' | 'send_message' | 'typing' | 'message_reaction' | 'ping';
  data: any;
}

class GroupChatWebSocketService {
  private wss: WebSocketServer;
  private clients: Map<string, Set<WebSocketClient>> = new Map(); // Support multiple connections per user
  private groupClients: Map<string, Set<string>> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws/chat'  // Use specific path to avoid conflicts with Vite HMR
    });
    this.setupWebSocketServer();
    this.setupHeartbeat();
  }

  private setupWebSocketServer() {
    this.wss.on('connection', (ws: WebSocketClient, req) => {
      console.log('New WebSocket connection established');
      
      // Initialize client
      ws.isAlive = true;
      ws.userId = undefined;
      ws.groupIds = [];

      // Handle client messages
      ws.on('message', async (message: Buffer) => {
        try {
          const data: WSMessage = JSON.parse(message.toString());
          await this.handleMessage(ws, data);
        } catch (error) {
          console.error('WebSocket message parsing error:', error);
          this.sendError(ws, 'Invalid message format');
        }
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(ws);
      });

      // Handle heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Send welcome message
      this.sendMessage(ws, 'connection', { status: 'connected' });
    });
  }

  private async handleMessage(ws: WebSocketClient, message: WSMessage) {
    const { type, data } = message;

    switch (type) {
      case 'join_group':
        await this.handleJoinGroup(ws, data);
        break;
      
      case 'leave_group':
        await this.handleLeaveGroup(ws, data);
        break;
      
      case 'send_message':
        await this.handleSendMessage(ws, data);
        break;
      
      case 'typing':
        await this.handleTyping(ws, data);
        break;
      
      case 'message_reaction':
        await this.handleMessageReaction(ws, data);
        break;
      
      case 'ping':
        this.sendMessage(ws, 'pong', { timestamp: Date.now() });
        break;
      
      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  private async handleJoinGroup(ws: WebSocketClient, data: { userId: string, groupId: string }) {
    const { userId, groupId } = data;
    
    try {
      // Verify user is member of the group
      const isMember = await storage.isGroupMember(userId, groupId);
      if (!isMember) {
        this.sendError(ws, 'Unauthorized: Not a member of this group');
        return;
      }

      // Set user ID and add to group
      ws.userId = userId;
      if (!ws.groupIds) ws.groupIds = [];
      if (!ws.groupIds.includes(groupId)) {
        ws.groupIds.push(groupId);
      }

      // Add to client maps (support multiple connections per user)
      if (!this.clients.has(userId)) {
        this.clients.set(userId, new Set());
      }
      this.clients.get(userId)!.add(ws);
      if (!this.groupClients.has(groupId)) {
        this.groupClients.set(groupId, new Set());
      }
      this.groupClients.get(groupId)!.add(userId);

      // Notify user they joined successfully
      this.sendMessage(ws, 'group_joined', { groupId, userId });
      
      // Notify other group members
      this.broadcastToGroup(groupId, 'user_joined', { 
        groupId, 
        userId, 
        timestamp: new Date().toISOString() 
      }, [userId]);

      console.log(`User ${userId} joined group ${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      this.sendError(ws, 'Failed to join group');
    }
  }

  private async handleLeaveGroup(ws: WebSocketClient, data: { groupId: string }) {
    const { groupId } = data;
    const userId = ws.userId;

    if (!userId) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    try {
      // Remove from group
      if (ws.groupIds) {
        ws.groupIds = ws.groupIds.filter(id => id !== groupId);
      }
      
      if (this.groupClients.has(groupId)) {
        this.groupClients.get(groupId)!.delete(userId);
      }

      // Notify user they left
      this.sendMessage(ws, 'group_left', { groupId, userId });
      
      // Notify other group members
      this.broadcastToGroup(groupId, 'user_left', { 
        groupId, 
        userId, 
        timestamp: new Date().toISOString() 
      }, [userId]);

      console.log(`User ${userId} left group ${groupId}`);
    } catch (error) {
      console.error('Error leaving group:', error);
      this.sendError(ws, 'Failed to leave group');
    }
  }

  private async handleSendMessage(ws: WebSocketClient, data: InsertGroupMessage) {
    const userId = ws.userId;

    if (!userId) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    try {
      // Verify user is member of the group
      const isMember = await storage.isGroupMember(userId, data.groupId);
      if (!isMember) {
        this.sendError(ws, 'Unauthorized: Not a member of this group');
        return;
      }

      // Create message in database
      const message = await storage.createGroupMessage({
        ...data,
        userId
      });

      // Broadcast message to all group members
      this.broadcastToGroup(data.groupId, 'new_message', message);

      console.log(`Message sent in group ${data.groupId} by user ${userId}`);
    } catch (error) {
      console.error('Error sending message:', error);
      this.sendError(ws, 'Failed to send message');
    }
  }

  private async handleTyping(ws: WebSocketClient, data: { groupId: string, isTyping: boolean }) {
    const userId = ws.userId;
    const { groupId, isTyping } = data;

    if (!userId) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    // Broadcast typing status to other group members
    this.broadcastToGroup(groupId, 'typing_status', {
      groupId,
      userId,
      isTyping,
      timestamp: new Date().toISOString()
    }, [userId]);
  }

  private async handleMessageReaction(ws: WebSocketClient, data: { messageId: string, emoji: string, action: 'add' | 'remove' }) {
    const userId = ws.userId;
    const { messageId, emoji, action } = data;

    if (!userId) {
      this.sendError(ws, 'User not authenticated');
      return;
    }

    try {
      let reaction;
      if (action === 'add') {
        reaction = await storage.addMessageReaction({
          messageId,
          userId,
          emoji
        });
      } else {
        await storage.removeMessageReaction(messageId, userId, emoji);
      }

      // Get message to find group
      const message = await storage.getGroupMessage(messageId);
      if (message) {
        // Broadcast reaction update to group members
        this.broadcastToGroup(message.groupId, 'message_reaction', {
          messageId,
          userId,
          emoji,
          action,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error handling message reaction:', error);
      this.sendError(ws, 'Failed to update reaction');
    }
  }

  private handleDisconnect(ws: WebSocketClient) {
    const userId = ws.userId;
    
    if (userId) {
      // Remove this specific connection
      const userConnections = this.clients.get(userId);
      if (userConnections) {
        userConnections.delete(ws);
        if (userConnections.size === 0) {
          // Last connection for this user
          this.clients.delete(userId);
          
          // Remove from all groups and notify
          if (ws.groupIds) {
            ws.groupIds.forEach(groupId => {
              if (this.groupClients.has(groupId)) {
                this.groupClients.get(groupId)!.delete(userId);
              }
              
              // Notify group members
              this.broadcastToGroup(groupId, 'user_disconnected', { 
                groupId, 
                userId, 
                timestamp: new Date().toISOString() 
              }, [userId]);
            });
          }
          console.log(`User ${userId} disconnected (all connections)`);
        } else {
          console.log(`User ${userId} disconnected (${userConnections.size} connections remaining)`);
        }
      }
    }
  }

  private broadcastToGroup(groupId: string, type: string, data: any, excludeUsers: string[] = []) {
    const groupMembers = this.groupClients.get(groupId);
    if (!groupMembers) return;

    groupMembers.forEach(userId => {
      if (!excludeUsers.includes(userId)) {
        const userConnections = this.clients.get(userId);
        if (userConnections) {
          userConnections.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
              this.sendMessage(client, type, data);
            }
          });
        }
      }
    });
  }

  private sendMessage(ws: WebSocketClient, type: string, data: any) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type, data }));
    }
  }

  private sendError(ws: WebSocketClient, message: string) {
    this.sendMessage(ws, 'error', { message });
  }

  private setupHeartbeat() {
    const interval = setInterval(() => {
      this.wss.clients.forEach((ws: WebSocketClient) => {
        if (ws.isAlive === false) {
          this.handleDisconnect(ws);
          return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // 30 seconds

    this.wss.on('close', () => {
      clearInterval(interval);
    });
  }

  // Public methods for external use
  public broadcastToGroupExternal(groupId: string, type: string, data: any) {
    this.broadcastToGroup(groupId, type, data);
  }

  public getConnectedUsers(): string[] {
    return Array.from(this.clients.keys());
  }

  public getGroupMembers(groupId: string): string[] {
    const members = this.groupClients.get(groupId);
    return members ? Array.from(members) : [];
  }

  public getUserConnectionCount(userId: string): number {
    const connections = this.clients.get(userId);
    return connections ? connections.size : 0;
  }
}

export { GroupChatWebSocketService };