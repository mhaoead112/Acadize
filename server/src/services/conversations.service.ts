// server/src/services/conversations.service.ts

import { db } from '../db/index.js';
import {
    conversations,
    conversationParticipants,
    messages,
    users,
    userPresence,
    messageReadReceipts,
    notifications
} from '../db/schema.js';
import { eq, and, desc, sql, or, inArray, not, notInArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireTenantId } from '../utils/tenant-query.js';
import pushNotificationService from './push-notification.service.js';
import { broadcastToUser } from '../websocket.js';

// ==================== TYPE DEFINITIONS ====================

export interface SendMessageInput {
    conversationId: string;
    senderId: string;
    type?: string;
    content?: string;
    fileUrl?: string;
    fileName?: string;
    fileSize?: string;
    fileType?: string;
    organizationId: string;
}

export interface GetMessagesInput {
    conversationId: string;
    userId: string;
    limit?: number;
    before?: string;
    organizationId: string;
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Verify user is participant of conversation
 */
async function verifyParticipant(conversationId: string, userId: string): Promise<boolean> {
    const [participant] = await db
        .select()
        .from(conversationParticipants)
        .where(and(
            eq(conversationParticipants.conversationId, conversationId),
            eq(conversationParticipants.userId, userId)
        ))
        .limit(1);

    return !!participant;
}

/**
 * Verify conversation belongs to organization (via participants)
 */
async function verifyConversationTenant(conversationId: string, organizationId: string): Promise<boolean> {
    const participants = await db
        .select({ userId: conversationParticipants.userId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.conversationId, conversationId));

    if (participants.length === 0) return false;

    const participantIds = participants.map(p => p.userId);

    // Verify all participants belong to the organization
    const orgUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            inArray(users.id, participantIds),
            eq(users.organizationId, organizationId)
        ));

    return orgUsers.length === participants.length;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get all direct message conversations for a user
 * Enforces tenant isolation
 */
export async function getDirectConversations(userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify user belongs to organization
    const [user] = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, userId),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!user) {
        throw new Error('User not found in organization');
    }

    // Get all conversations where user is a participant
    const userConversations = await db
        .select({ conversationId: conversationParticipants.conversationId })
        .from(conversationParticipants)
        .where(eq(conversationParticipants.userId, userId));

    const conversationIds = userConversations.map(c => c.conversationId);

    if (conversationIds.length === 0) {
        return [];
    }

    // Get direct conversations only
    const directConversations = await db
        .select({
            id: conversations.id,
            type: conversations.type,
            createdAt: conversations.createdAt,
        })
        .from(conversations)
        .where(and(
            eq(conversations.type, 'direct'),
            inArray(conversations.id, conversationIds)
        ));

    // For each conversation, get the other participant
    const conversationsWithUsers = await Promise.all(
        directConversations.map(async (conv) => {
            // Get other participant
            const participants = await db
                .select({ userId: conversationParticipants.userId })
                .from(conversationParticipants)
                .where(and(
                    eq(conversationParticipants.conversationId, conv.id),
                    not(eq(conversationParticipants.userId, userId))
                ))
                .limit(1);

            if (participants.length === 0) return null;

            const otherUserId = participants[0].userId;

            // TENANT ISOLATION: Verify other user belongs to same organization
            const [otherUser] = await db
                .select({
                    id: users.id,
                    username: users.username,
                    fullName: users.fullName,
                    role: users.role,
                    organizationId: users.organizationId,
                })
                .from(users)
                .where(eq(users.id, otherUserId))
                .limit(1);

            if (!otherUser || otherUser.organizationId !== orgId) return null;

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

            // Get unread count
            const readMessageIds = await db
                .select({ messageId: messageReadReceipts.messageId })
                .from(messageReadReceipts)
                .where(eq(messageReadReceipts.userId, userId));

            const readIds = readMessageIds.map(r => r.messageId);

            const unreadMessages = readIds.length > 0
                ? await db
                    .select({ count: sql<number>`COUNT(*)` })
                    .from(messages)
                    .where(and(
                        eq(messages.conversationId, conv.id),
                        not(eq(messages.senderId, userId)),
                        notInArray(messages.id, readIds)
                    ))
                : await db
                    .select({ count: sql<number>`COUNT(*)` })
                    .from(messages)
                    .where(and(
                        eq(messages.conversationId, conv.id),
                        not(eq(messages.senderId, userId))
                    ));

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
    return conversationsWithUsers.filter(c => c !== null);
}

/**
 * Get messages in a conversation
 * Enforces tenant isolation and participant verification
 */
export async function getConversationMessages(input: GetMessagesInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify user is participant
    if (!await verifyParticipant(input.conversationId, input.userId)) {
        throw new Error('Not authorized - user is not a participant');
    }

    // Verify conversation belongs to organization
    if (!await verifyConversationTenant(input.conversationId, orgId)) {
        throw new Error('Not authorized - conversation not in organization');
    }

    const limit = input.limit || 50;

    const messagesList = await db
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
        .where(and(
            eq(messages.conversationId, input.conversationId),
            eq(messages.isDeleted, false)
        ))
        .orderBy(desc(messages.createdAt))
        .limit(limit);

    return messagesList.reverse();
}

/**
 * Send a message in a conversation
 * Enforces tenant isolation and creates notifications
 */
export async function sendMessage(input: SendMessageInput) {
    const orgId = requireTenantId(input.organizationId);

    // Verify user is participant
    if (!await verifyParticipant(input.conversationId, input.senderId)) {
        throw new Error('Not authorized - user is not a participant');
    }

    // Verify conversation belongs to organization
    if (!await verifyConversationTenant(input.conversationId, orgId)) {
        throw new Error('Not authorized - conversation not in organization');
    }

    // Create message
    const [message] = await db.insert(messages).values({
        id: createId(),
        conversationId: input.conversationId,
        senderId: input.senderId,
        type: input.type || 'text',
        content: input.content,
        fileUrl: input.fileUrl,
        fileName: input.fileName,
        fileSize: input.fileSize,
        fileType: input.fileType,
    }).returning();

    // Get sender details
    const [sender] = await db
        .select({
            fullName: users.fullName,
            username: users.username,
        })
        .from(users)
        .where(eq(users.id, input.senderId))
        .limit(1);

    const messageWithSender = {
        ...message,
        senderName: sender.fullName,
        senderUsername: sender.username,
    };

    // Send notifications to other participants
    try {
        const otherParticipants = await db
            .select({ userId: conversationParticipants.userId })
            .from(conversationParticipants)
            .where(and(
                eq(conversationParticipants.conversationId, input.conversationId),
                not(eq(conversationParticipants.userId, input.senderId))
            ));

        const recipientIds = otherParticipants.map(p => p.userId);

        if (recipientIds.length > 0) {
            // Create notification entries
            for (const recipientId of recipientIds) {
                await db.insert(notifications).values({
                    id: createId(),
                    userId: recipientId,
                    type: 'message',
                    title: `New message from ${sender.fullName}`,
                    message: input.content?.substring(0, 100) || 'You have a new message',
                    senderId: input.senderId,
                    conversationId: input.conversationId,
                    isRead: false
                });

                // Broadcast via WebSocket
                broadcastToUser(recipientId, {
                    type: 'notification',
                    data: {
                        type: 'message',
                        title: `New message from ${sender.fullName}`,
                        message: input.content?.substring(0, 50) || 'You have a new message',
                        conversationId: input.conversationId,
                        senderId: input.senderId
                    }
                });
            }

            // Send push notification
            const payload = pushNotificationService.createNotificationPayload('MESSAGE', {
                senderName: sender.fullName,
                preview: input.content?.substring(0, 50) || 'New message',
                conversationId: input.conversationId,
                senderId: input.senderId
            });
            await pushNotificationService.sendPushNotificationToUsers(recipientIds, payload);
        }
    } catch (notifError) {
        console.error('Error sending notification for message:', notifError);
    }

    return messageWithSender;
}

/**
 * Send typing indicator
 * Enforces participant verification
 */
export async function sendTypingIndicator(
    conversationId: string,
    userId: string,
    isTyping: boolean,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify user is participant
    if (!await verifyParticipant(conversationId, userId)) {
        throw new Error('Not authorized');
    }

    // Get user details
    const [user] = await db
        .select({
            fullName: users.fullName,
            username: users.username,
        })
        .from(users)
        .where(and(
            eq(users.id, userId),
            eq(users.organizationId, orgId)
        ))
        .limit(1);

    if (!user) {
        throw new Error('User not found');
    }

    return {
        userId,
        username: user.username,
        fullName: user.fullName,
        isTyping,
        conversationId,
    };
}

/**
 * Mark messages as read
 * Enforces participant verification
 */
export async function markMessagesAsRead(
    conversationId: string,
    userId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify user is participant
    if (!await verifyParticipant(conversationId, userId)) {
        throw new Error('Not authorized');
    }

    // Get all unread messages in conversation
    const unreadMessages = await db
        .select({ id: messages.id })
        .from(messages)
        .where(and(
            eq(messages.conversationId, conversationId),
            not(eq(messages.senderId, userId))
        ));

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

    return { count: messagesToMarkRead.length };
}

/**
 * Search users for conversations
 * Enforces tenant isolation
 */
export async function searchUsers(
    userId: string,
    query: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    if (!query) {
        return [];
    }

    const searchQuery = `%${query}%`;

    const searchResults = await db
        .select({
            id: users.id,
            username: users.username,
            fullName: users.fullName,
            role: users.role,
        })
        .from(users)
        .where(and(
            not(eq(users.id, userId)),
            eq(users.organizationId, orgId),
            or(
                sql`${users.username} ILIKE ${searchQuery}`,
                sql`${users.fullName} ILIKE ${searchQuery}`
            )!
        ))
        .limit(10);

    return searchResults;
}

/**
 * Create or get direct conversation
 * Enforces tenant isolation
 */
export async function getOrCreateDirectConversation(
    userId: string,
    targetUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify both users belong to same organization
    const bothUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            inArray(users.id, [userId, targetUserId]),
            eq(users.organizationId, orgId)
        ));

    if (bothUsers.length !== 2) {
        throw new Error('User not found in organization');
    }

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
            .where(and(
                eq(conversations.type, 'direct'),
                inArray(conversations.id, conversationIds)
            ))
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

                return {
                    conversationId: conv.id,
                    user: otherUser,
                };
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

    return {
        conversationId: conversation.id,
        user: otherUser,
    };
}

/**
 * Get conversation participants
 * Enforces participant verification
 */
export async function getConversationParticipants(
    conversationId: string,
    userId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    // Verify user is participant
    if (!await verifyParticipant(conversationId, userId)) {
        throw new Error('Not authorized');
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

    return participants;
}
