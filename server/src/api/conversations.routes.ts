import { Router } from 'express';
import { db } from '../db/index.js';
import { conversations, conversationParticipants, messages, users, userPresence, messageReadReceipts, notifications } from '../db/schema.js';
import { eq, and, desc, sql, or, inArray, not, notInArray } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { createId } from '@paralleldrive/cuid2';
import pushNotificationService from '../services/push-notification.service.js';
import { broadcastToUser } from '../websocket.js';

const router = Router();

// GET /api/conversations/direct - Get all direct message conversations
router.get('/direct', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all conversations where user is a participant
    const userConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = userConversations.map(c => c.conversationId);

    if (conversationIds.length === 0) {
      return res.json([]);
    }

    // Get direct conversations only
    const directConversations = await db
      .select({
        id: conversations.id,
        type: conversations.type,
        createdAt: conversations.createdAt,
      })
      .from(conversations)
      .where(
        and(
          eq(conversations.type, 'direct'),
          inArray(conversations.id, conversationIds)
        )
      );

    // For each conversation, get the other participant
    const conversationsWithUsers = await Promise.all(
      directConversations.map(async (conv) => {
        // Get other participant
        const participants = await db
          .select({
            userId: conversationParticipants.userId,
          })
          .from(conversationParticipants)
          .where(
            and(
              eq(conversationParticipants.conversationId, conv.id),
              not(eq(conversationParticipants.userId, userId))
            )
          )
          .limit(1);

        if (participants.length === 0) return null;

        const otherUserId = participants[0].userId;

        // Get user details
        const [otherUser] = await db
          .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            role: users.role,
          })
          .from(users)
          .where(eq(users.id, otherUserId))
          .limit(1);

        if (!otherUser) return null;

        // Get online status
        const [presence] = await db
          .select()
          .from(userPresence)
          .where(eq(userPresence.userId, otherUserId))
          .limit(1);

        const isOnline = presence ? presence.status === 'online' : false;

        // Get last message
        const [lastMessage] = await db
          .select({
            content: messages.content,
            type: messages.type,
            createdAt: messages.createdAt,
          })
          .from(messages)
          .where(eq(messages.conversationId, conv.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count - messages not in read receipts
        const readMessageIds = await db
          .select({ messageId: messageReadReceipts.messageId })
          .from(messageReadReceipts)
          .where(eq(messageReadReceipts.userId, userId));

        const readIds = readMessageIds.map(r => r.messageId);

        const unreadMessages = readIds.length > 0
          ? await db
              .select({ count: sql<number>`COUNT(*)` })
              .from(messages)
              .where(
                and(
                  eq(messages.conversationId, conv.id),
                  not(eq(messages.senderId, userId)),
                  notInArray(messages.id, readIds)
                )
              )
          : await db
              .select({ count: sql<number>`COUNT(*)` })
              .from(messages)
              .where(
                and(
                  eq(messages.conversationId, conv.id),
                  not(eq(messages.senderId, userId))
                )
              );

        return {
          id: conv.id,
          userId: otherUser.id,
          username: otherUser.username,
          fullName: otherUser.fullName,
          role: otherUser.role,
          isOnline,
          conversationId: conv.id,
          lastMessage: lastMessage?.content || null,
          lastMessageTime: lastMessage?.createdAt || null,
          unreadCount: unreadMessages[0]?.count || 0,
        };
      })
    );

    // Filter out null values
    const validConversations = conversationsWithUsers.filter(c => c !== null);

    res.json(validConversations);
  } catch (error) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ error: 'Failed to fetch direct messages' });
  }
});

// GET /api/conversations/:conversationId/messages - Get messages in a conversation
router.get('/:conversationId/messages', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { limit = 50, before } = req.query;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get messages
    let query = db
      .select({
        id: messages.id,
        conversationId: messages.conversationId,
        senderId: messages.senderId,
        senderName: users.fullName,
        senderUsername: users.username,
        type: messages.type,
        content: messages.content,
        fileUrl: messages.fileUrl,
        fileName: messages.fileName,
        fileSize: messages.fileSize,
        fileType: messages.fileType,
        isEdited: messages.isEdited,
        isDeleted: messages.isDeleted,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .innerJoin(users, eq(users.id, messages.senderId))
      .where(
        and(
          eq(messages.conversationId, conversationId),
          eq(messages.isDeleted, false)
        )
      )
      .orderBy(desc(messages.createdAt))
      .limit(Number(limit));

    const messagesList = await query;

    res.json(messagesList.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /api/conversations/:conversationId/messages - Send a message
router.post('/:conversationId/messages', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { type, content, fileUrl, fileName, fileSize, fileType } = req.body;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Create message
    const [message] = await db.insert(messages).values({
      id: createId(),
      conversationId,
      senderId: userId,
      type: type || 'text',
      content,
      fileUrl,
      fileName,
      fileSize,
      fileType,
    }).returning();

    // Get sender details
    const [sender] = await db
      .select({
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const messageWithSender = {
      ...message,
      senderName: sender.fullName,
      senderUsername: sender.username,
    };

    // Send push notification and create notification entries for other participants
    try {
      const otherParticipants = await db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(
          and(
            eq(conversationParticipants.conversationId, conversationId),
            not(eq(conversationParticipants.userId, userId))
          )
        );

      const recipientIds = otherParticipants.map(p => p.userId);
      if (recipientIds.length > 0) {
        // Create notification entries in the database for each recipient
        for (const recipientId of recipientIds) {
          await db.insert(notifications).values({
            id: createId(),
            userId: recipientId,
            type: 'message',
            title: `New message from ${sender.fullName}`,
            message: content?.substring(0, 100) || 'You have a new message',
            senderId: userId,
            conversationId,
            isRead: false
          });

          // Broadcast via WebSocket for real-time update
          broadcastToUser(recipientId, {
            type: 'notification',
            data: {
              type: 'message',
              title: `New message from ${sender.fullName}`,
              message: content?.substring(0, 50) || 'You have a new message',
              conversationId,
              senderId: userId
            }
          });
        }

        // Send push notification
        const payload = pushNotificationService.createNotificationPayload('MESSAGE', {
          senderName: sender.fullName,
          preview: content?.substring(0, 50) || 'New message',
          conversationId,
          senderId: userId
        });
        await pushNotificationService.sendPushNotificationToUsers(recipientIds, payload);
      }
    } catch (notifError) {
      console.error('Error sending notification for message:', notifError);
    }

    res.status(201).json(messageWithSender);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// POST /api/conversations/:conversationId/typing - Send typing indicator
router.post('/:conversationId/typing', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { isTyping } = req.body;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get user details
    const [user] = await db
      .select({
        fullName: users.fullName,
        username: users.username,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    res.json({
      userId,
      username: user.username,
      fullName: user.fullName,
      isTyping,
      conversationId,
    });
  } catch (error) {
    console.error('Error sending typing indicator:', error);
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

// POST /api/conversations/:conversationId/read - Mark messages as read
router.post('/:conversationId/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all unread messages in conversation
    const unreadMessages = await db
      .select({ id: messages.id })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conversationId),
          not(eq(messages.senderId, userId))
        )
      );

    // Get already read message IDs
    const readReceipts = await db
      .select({ messageId: messageReadReceipts.messageId })
      .from(messageReadReceipts)
      .where(eq(messageReadReceipts.userId, userId));

    const readMessageIds = readReceipts.map(r => r.messageId);

    // Filter out messages already read
    const messagesToMarkRead = unreadMessages
      .filter(m => !readMessageIds.includes(m.id))
      .map(m => m.id);

    // Create read receipts for unread messages
    if (messagesToMarkRead.length > 0) {
      await db.insert(messageReadReceipts).values(
        messagesToMarkRead.map(messageId => ({
          id: createId(),
          messageId,
          userId,
        }))
      );
    }

    res.json({ message: 'Messages marked as read', count: messagesToMarkRead.length });
  } catch (error) {
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// GET /api/conversations/search - Search conversations and users
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { query } = req.query;

    if (!query) {
      return res.json([]);
    }

    const searchQuery = `%${query}%`;

    // Search users (potential DM contacts)
    const searchResults = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          not(eq(users.id, userId)),
          or(
            sql`${users.username} ILIKE ${searchQuery}`,
            sql`${users.fullName} ILIKE ${searchQuery}`
          )
        )
      )
      .limit(10);

    res.json(searchResults);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Failed to search' });
  }
});

// POST /api/conversations/direct/:targetUserId - Create or get direct conversation
router.post('/direct/:targetUserId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.params;

    // Find existing direct conversation
    const existingConversations = await db
      .select({ conversationId: conversationParticipants.conversationId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId));

    const conversationIds = existingConversations.map(c => c.conversationId);

    if (conversationIds.length > 0) {
      const directConversations = await db
        .select({
          id: conversations.id,
          participantCount: sql<number>`COUNT(${conversationParticipants.userId})`,
        })
        .from(conversations)
        .innerJoin(conversationParticipants, eq(conversationParticipants.conversationId, conversations.id))
        .where(
          and(
            eq(conversations.type, 'direct'),
            inArray(conversations.id, conversationIds)
          )
        )
        .groupBy(conversations.id)
        .having(sql`COUNT(${conversationParticipants.userId}) = 2`);

      for (const conv of directConversations) {
        const participants = await db
          .select({ userId: conversationParticipants.userId })
          .from(conversationParticipants)
          .where(eq(conversationParticipants.conversationId, conv.id));

        const participantIds = participants.map(p => p.userId);
        if (participantIds.includes(userId) && participantIds.includes(targetUserId)) {
          // Get other user details
          const [otherUser] = await db
            .select({
              id: users.id,
              username: users.username,
              fullName: users.fullName,
            })
            .from(users)
            .where(eq(users.id, targetUserId))
            .limit(1);

          return res.json({
            conversationId: conv.id,
            user: otherUser,
          });
        }
      }
    }

    // Create new direct conversation
    const [conversation] = await db.insert(conversations).values({
      id: createId(),
      type: 'direct',
    }).returning();

    await db.insert(conversationParticipants).values([
      { id: createId(), conversationId: conversation.id, userId },
      { id: createId(), conversationId: conversation.id, userId: targetUserId },
    ]);

    // Get other user details
    const [otherUser] = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
      })
      .from(users)
      .where(eq(users.id, targetUserId))
      .limit(1);

    res.status(201).json({
      conversationId: conversation.id,
      user: otherUser,
    });
  } catch (error) {
    console.error('Error creating/getting direct conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

// GET /api/conversations/:conversationId/participants - Get conversation participants
router.get('/:conversationId/participants', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;

    // Verify user is participant
    const participant = await db
      .select()
      .from(conversationParticipants)
      .where(
        and(
          eq(conversationParticipants.conversationId, conversationId),
          eq(conversationParticipants.userId, userId)
        )
      )
      .limit(1);

    if (participant.length === 0) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    // Get all participants
    const participants = await db
      .select({
        id: users.id,
        username: users.username,
        fullName: users.fullName,
        role: users.role,
      })
      .from(conversationParticipants)
      .innerJoin(users, eq(users.id, conversationParticipants.userId))
      .where(eq(conversationParticipants.conversationId, conversationId));

    res.json(participants);
  } catch (error) {
    console.error('Error fetching participants:', error);
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
});

export default router;
