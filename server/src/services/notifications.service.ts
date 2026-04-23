// server/src/services/notifications.service.ts

import { db } from '../db/index.js';
import { notifications, blockedUsers, reportedUsers, users } from '../db/schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { requireTenantId } from '../utils/tenant-query.js';
import { broadcastToUser } from '../websocket-state.js';

// ==================== TYPE DEFINITIONS ====================

export interface CreateNotificationInput {
    userId: string;
    type: string;
    title: string;
    message: string;
    senderId?: string;
    conversationId?: string;
    groupId?: string;
}

export interface BlockUserInput {
    userId: string;
    blockedUserId: string;
    reason?: string;
    organizationId: string;
}

export interface ReportUserInput {
    reporterId: string;
    reportedUserId: string;
    reason: string;
    context?: string;
    organizationId: string;
}

// ==================== SERVICE FUNCTIONS ====================

/**
 * Get user notifications
 * Enforces tenant isolation
 */
import { count } from 'drizzle-orm';

export async function getUserNotifications(
    userId: string,
    unreadOnly: boolean,
    organizationId: string,
    limit: number = 50,
    offset: number = 0
) {
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

    const whereCondition = unreadOnly
        ? and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        )
        : eq(notifications.userId, userId);

    const countResult = await db.select({ count: count() }).from(notifications).where(whereCondition);
    const totalCount = countResult[0].count;

    const userNotifications = await db
        .select({
            id: notifications.id,
            type: notifications.type,
            title: notifications.title,
            message: notifications.message,
            senderId: notifications.senderId,
            senderName: users.fullName,
            senderUsername: users.username,
            conversationId: notifications.conversationId,
            groupId: notifications.groupId,
            isRead: notifications.isRead,
            createdAt: notifications.createdAt,
        })
        .from(notifications)
        .leftJoin(users, eq(users.id, notifications.senderId))
        .where(whereCondition)
        .orderBy(desc(notifications.createdAt))
        .limit(limit)
        .offset(offset);

    return { data: userNotifications, totalCount };
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: string, organizationId: string) {
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

    const [result] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(notifications)
        .where(and(
            eq(notifications.userId, userId),
            eq(notifications.isRead, false)
        ));

    return Number(result.count) || 0;
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(
    notificationId: string,
    userId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    await db
        .update(notifications)
        .set({ isRead: true })
        .where(and(
            eq(notifications.id, notificationId),
            eq(notifications.userId, userId)
        ));

    return { success: true };
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    await db
        .update(notifications)
        .set({ isRead: true })
        .where(eq(notifications.userId, userId));

    return { success: true };
}

/**
 * Create notification
 * Used internally by other services
 */
export async function createNotification(data: CreateNotificationInput) {
    const [notification] = await db.insert(notifications).values({
        id: createId(),
        ...data,
    }).returning();

    // Broadcast to user via WebSocket
    broadcastToUser(data.userId, {
        type: 'new_notification',
        notification
    });

    return notification;
}

/**
 * Block a user
 * Enforces tenant isolation
 */
export async function blockUser(input: BlockUserInput) {
    const orgId = requireTenantId(input.organizationId);

    if (input.blockedUserId === input.userId) {
        throw new Error('Cannot block yourself');
    }

    // Verify both users belong to same organization
    const bothUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            eq(users.organizationId, orgId),
            sql`${users.id} IN (${input.userId}, ${input.blockedUserId})`
        ));

    if (bothUsers.length !== 2) {
        throw new Error('Users not found in organization');
    }

    // Check if already blocked
    const [existing] = await db
        .select()
        .from(blockedUsers)
        .where(and(
            eq(blockedUsers.userId, input.userId),
            eq(blockedUsers.blockedUserId, input.blockedUserId)
        ))
        .limit(1);

    if (existing) {
        throw new Error('User already blocked');
    }

    await db.insert(blockedUsers).values({
        id: createId(),
        userId: input.userId,
        blockedUserId: input.blockedUserId,
        reason: input.reason,
    });

    return { success: true };
}

/**
 * Unblock a user
 */
export async function unblockUser(
    userId: string,
    blockedUserId: string,
    organizationId: string
) {
    const orgId = requireTenantId(organizationId);

    await db
        .delete(blockedUsers)
        .where(and(
            eq(blockedUsers.userId, userId),
            eq(blockedUsers.blockedUserId, blockedUserId)
        ));

    return { success: true };
}

/**
 * Get blocked users
 */
export async function getBlockedUsers(userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    const blocked = await db
        .select({
            id: blockedUsers.id,
            blockedUserId: blockedUsers.blockedUserId,
            blockedUserName: users.fullName,
            blockedUsername: users.username,
            reason: blockedUsers.reason,
            createdAt: blockedUsers.createdAt,
        })
        .from(blockedUsers)
        .innerJoin(users, eq(users.id, blockedUsers.blockedUserId))
        .where(eq(blockedUsers.userId, userId));

    return blocked;
}

/**
 * Report a user
 * Enforces tenant isolation
 */
export async function reportUser(input: ReportUserInput) {
    const orgId = requireTenantId(input.organizationId);

    if (input.reportedUserId === input.reporterId) {
        throw new Error('Cannot report yourself');
    }

    // Verify both users belong to same organization
    const bothUsers = await db
        .select({ id: users.id })
        .from(users)
        .where(and(
            eq(users.organizationId, orgId),
            sql`${users.id} IN (${input.reporterId}, ${input.reportedUserId})`
        ));

    if (bothUsers.length !== 2) {
        throw new Error('Users not found in organization');
    }

    await db.insert(reportedUsers).values({
        id: createId(),
        reporterId: input.reporterId,
        reportedUserId: input.reportedUserId,
        reason: input.reason,
        context: input.context,
    });

    return { success: true };
}
