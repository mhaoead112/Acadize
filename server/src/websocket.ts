import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import { db } from './db/index.js';
import { messages, conversationParticipants, conversations, users, messageReadReceipts, userPresence, notifications } from './db/schema.js';
import { eq, and, desc, inArray, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { clients, conversationClients, broadcastToUser, broadcastToConversation, AuthenticatedWebSocket } from './websocket-state.js';
import * as ConversationsService from './services/conversations.service.js';
import { logger } from './utils/logger.js';
import { WS_CHAT_PATH } from './realtime.config.js';

// ─────────────────────────────────────────────────────────────────────────────
// websocket.ts — OWNERSHIP: raw ws at path /ws
// Purpose  : real-time chat messages + user presence
// Namespace: only one (the default namespace on path /ws)
// See      : server/src/realtime.config.ts for the authoritative path registry
// Contrast : realtime.service.ts owns Socket.IO /attendance (live attendance)
// ─────────────────────────────────────────────────────────────────────────────

// JWT secret must be set in environment variables
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required!');
}
const JWT_SECRET = process.env.JWT_SECRET;

interface WSMessage {
  type: 'auth' | 'message' | 'typing' | 'read' | 'join' | 'leave' | 'delivered' | 'presence';
  token?: string;
  conversationId?: string;
  content?: string;
  messageType?: 'text' | 'file' | 'image' | 'video';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  fileType?: string;
  messageId?: string;
  messageIds?: string[];
  status?: 'online' | 'offline' | 'away';
}

export function setupWebSocketServer(wss: WebSocketServer) {
  logger.info(`[ws] Handler attached — owns path ${WS_CHAT_PATH} (chat + presence)`);

  wss.on('connection', (ws: AuthenticatedWebSocket, request: IncomingMessage) => {
    logger.info('[ws] New connection established');

    ws.on('message', async (data: Buffer) => {
      try {
        const message: WSMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'auth':
            await handleAuth(ws, message);
            break;

          case 'join':
            await handleJoinConversation(ws, message);
            break;

          case 'leave':
            await handleLeaveConversation(ws, message);
            break;

          case 'message':
            await handleMessage(ws, message);
            break;

          case 'typing':
            await handleTyping(ws, message);
            break;

          case 'read':
            await handleRead(ws, message);
            break;

          case 'delivered':
            await handleDelivered(ws, message);
            break;

          case 'presence':
            await handlePresence(ws, message);
            break;

          default:
            ws.send(JSON.stringify({ error: 'Unknown message type' }));
        }
      } catch (error) {
        logger.error('[ws] Message handler error', { error: String(error) });
        ws.send(JSON.stringify({ error: 'Invalid message format' }));
      }
    });

    ws.on('close', () => {
      handleDisconnect(ws);
    });

    ws.on('error', (error) => {
      logger.error('[ws] Socket error', { error: String(error) });
    });
  });
}

async function handleAuth(ws: AuthenticatedWebSocket, message: WSMessage) {
  try {
    if (!message.token) {
      ws.send(JSON.stringify({ type: 'error', message: 'Token required' }));
      return;
    }

    const decoded = jwt.verify(message.token, JWT_SECRET) as any;
    ws.userId = decoded.id; // JWT uses 'id' not 'userId'
    ws.organizationId = decoded.organizationId;

    // Tenant validation: JWT must include organizationId
    if (!ws.organizationId) {
      ws.send(JSON.stringify({ type: 'error', message: 'No organization context in token' }));
      ws.close();
      return;
    }

    // Fetch username from database and verify org membership
    const [user] = await db
      .select({ username: users.username, fullName: users.fullName, organizationId: users.organizationId })
      .from(users)
      .where(and(eq(users.id, decoded.id), eq(users.organizationId, ws.organizationId)))
      .limit(1);

    if (!user) {
      ws.send(JSON.stringify({ type: 'error', message: 'User not found or organization mismatch' }));
      ws.close();
      return;
    }

    ws.username = user.username;

    // Store client connection
    if (ws.userId && !clients.has(ws.userId)) {
      clients.set(ws.userId, new Set());
    }
    if (ws.userId) {
      clients.get(ws.userId)!.add(ws);
    }

    // Update user presence to online
    if (ws.userId) {
      await updateUserPresence(ws.userId, 'online');
    }

    ws.send(JSON.stringify({
      type: 'auth_success',
      userId: ws.userId,
      username: ws.username
    }));

    logger.info(`[ws] User authenticated`, { userId: ws.userId, username: ws.username, organizationId: ws.organizationId });
  } catch (error) {
    logger.error('[ws] Auth error', { error: String(error) });
    ws.send(JSON.stringify({ type: 'error', message: 'Authentication failed' }));
    ws.close();
  }
}

async function handleJoinConversation(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !ws.organizationId || !message.conversationId) return;

  // Verify user is participant
  const participant = await db
    .select({ userId: conversationParticipants.userId })
    .from(conversationParticipants)
    .where(
      and(
        eq(conversationParticipants.conversationId, message.conversationId),
        eq(conversationParticipants.userId, ws.userId)
      )
    )
    .limit(1);

  if (participant.length === 0) {
    ws.send(JSON.stringify({ type: 'error', message: 'Not authorized or wrong organization' }));
    return;
  }

  // Add to conversation clients
  if (!conversationClients.has(message.conversationId)) {
    conversationClients.set(message.conversationId, new Set());
  }
  conversationClients.get(message.conversationId)!.add(ws.userId);

  ws.send(JSON.stringify({
    type: 'joined',
    conversationId: message.conversationId
  }));

  // Broadcast user joined
  broadcastToConversation(message.conversationId, {
    type: 'user_joined',
    userId: ws.userId,
    username: ws.username
  }, ws.userId);
}

async function handleLeaveConversation(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.conversationId) return;

  const conversationUsers = conversationClients.get(message.conversationId);
  if (conversationUsers) {
    conversationUsers.delete(ws.userId);
  }

  broadcastToConversation(message.conversationId, {
    type: 'user_left',
    userId: ws.userId,
    username: ws.username
  }, ws.userId);
}

async function handleMessage(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.conversationId) return;

  try {
    // CENTRALIZED: Use common service for both REST and WebSocket
    await ConversationsService.sendMessage({
      conversationId: message.conversationId,
      senderId: ws.userId,
      type: message.messageType || 'text',
      content: message.content || undefined,
      fileUrl: message.fileUrl || undefined,
      fileName: message.fileName || undefined,
      fileSize: message.fileSize || undefined,
      fileType: message.fileType || undefined,
      organizationId: ws.organizationId!
    });

    // Note: ConversationsService.sendMessage already handles broadcasts to all participants
    // including the sender, so we don't need to broadcast here.
  } catch (error) {
    logger.error('[ws] handleMessage error', { error: String(error), conversationId: message.conversationId });
    ws.send(JSON.stringify({ type: 'error', message: 'Failed to send message' }));
  }
}

async function handleTyping(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.conversationId) return;

  broadcastToConversation(message.conversationId, {
    type: 'typing',
    userId: ws.userId,
    username: ws.username
  }, ws.userId);
}

async function handleRead(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.conversationId) return;

  try {
    // Get unread messages in this conversation
    const unreadMessages = await db
      .select({ id: messages.id, senderId: messages.senderId })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, message.conversationId),
          eq(messages.isDeleted, false)
        )
      );

    // Create read receipts for messages not sent by this user
    const receiptsToCreate = unreadMessages
      .filter(msg => msg.senderId !== ws.userId)
      .map(msg => ({
        id: createId(),
        messageId: msg.id,
        userId: ws.userId!,
        readAt: new Date()
      }));

    if (receiptsToCreate.length > 0) {
      // Use INSERT ... ON CONFLICT to avoid duplicates
      for (const receipt of receiptsToCreate) {
        try {
          await db.insert(messageReadReceipts).values(receipt);
        } catch (err) {
          // Ignore duplicate key errors
        }
      }
    }

    // Update last read timestamp
    await db
      .update(conversationParticipants)
      .set({ lastReadAt: new Date() })
      .where(
        and(
          eq(conversationParticipants.conversationId, message.conversationId),
          eq(conversationParticipants.userId, ws.userId!)
        )
      );

    // Notify senders about read receipts
    const uniqueSenders = Array.from(new Set(unreadMessages.map((m: any) => m.senderId)));
    uniqueSenders.forEach(senderId => {
      if (senderId !== ws.userId) {
        broadcastToUser(senderId, {
          type: 'messages_read',
          conversationId: message.conversationId,
          readBy: ws.userId,
          readByUsername: ws.username,
          readAt: new Date()
        });
      }
    });

    broadcastToConversation(message.conversationId, {
      type: 'read',
      userId: ws.userId,
      username: ws.username,
      conversationId: message.conversationId
    }, ws.userId);
  } catch (error) {
    logger.error('[ws] handleRead error', { error: String(error), conversationId: message.conversationId });
  }
}

function handleDisconnect(ws: AuthenticatedWebSocket) {
  if (ws.userId) {
    const userClients = clients.get(ws.userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        clients.delete(ws.userId);

        // Update user presence to offline
        updateUserPresence(ws.userId, 'offline').catch(console.error);
      }
    }

    // Remove from all conversations
    conversationClients.forEach((users, conversationId) => {
      if (users.has(ws.userId!)) {
        users.delete(ws.userId!);
        broadcastToConversation(conversationId, {
          type: 'user_offline',
          userId: ws.userId,
          username: ws.username
        });
      }
    });

    logger.info('[ws] User disconnected', { userId: ws.userId, username: ws.username });
  }
}

function deprecatedBroadcastToConversation1(conversationId: string, data: any, excludeUserId?: string) {
  const conversationUsers = conversationClients.get(conversationId);
  if (!conversationUsers) return;

  conversationUsers.forEach(userId => {
    if (userId === excludeUserId) return;

    const userClients = clients.get(userId);
    if (userClients) {
      userClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(data));
        }
      });
    }
  });
}

async function handleDelivered(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.messageIds) return;

  try {
    // Update delivery status for messages
    await db
      .update(messages)
      .set({ deliveredAt: new Date() })
      .where(
        and(
          inArray(messages.id, message.messageIds),
          sql`${messages.deliveredAt} IS NULL`
        )
      );

    // Notify sender that messages were delivered
    message.messageIds.forEach(messageId => {
      const msg = messages;
      db.select({ senderId: messages.senderId })
        .from(messages)
        .where(eq(messages.id, messageId))
        .limit(1)
        .then(([result]) => {
          if (result) {
            broadcastToUser(result.senderId, {
              type: 'message_delivered',
              messageId,
              deliveredBy: ws.userId,
              deliveredAt: new Date()
            });
          }
        });
    });
  } catch (error) {
    logger.error('[ws] handleDelivered error', { error: String(error) });
  }
}

async function handlePresence(ws: AuthenticatedWebSocket, message: WSMessage) {
  if (!ws.userId || !message.status) return;

  try {
    await updateUserPresence(ws.userId, message.status);

    // Broadcast presence to all user's conversations
    conversationClients.forEach((users, conversationId) => {
      if (users.has(ws.userId!)) {
        broadcastToConversation(conversationId, {
          type: 'presence_update',
          userId: ws.userId,
          username: ws.username,
          status: message.status
        }, ws.userId);
      }
    });
  } catch (error) {
    logger.error('[ws] handlePresence error', { error: String(error) });
  }
}

async function updateUserPresence(userId: string, status: string) {
  try {
    // Check if presence record exists
    const existing = await db
      .select()
      .from(userPresence)
      .where(eq(userPresence.userId, userId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(userPresence)
        .set({
          status,
          lastSeen: new Date(),
        })
        .where(eq(userPresence.userId, userId));
    } else {
      await db
        .insert(userPresence)
        .values({
          userId,
          status: status as 'online' | 'offline' | 'away',
          lastSeen: new Date()
        });
    }
  } catch (error) {
    logger.error('[ws] updateUserPresence error', { userId, status, error: String(error) });
  }
}

function deprecatedBroadcastToUser1(userId: string, data: any) {
  const userClients = clients.get(userId);
  if (userClients) {
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  }
}
