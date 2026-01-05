import { Router } from 'express';
import { db } from '../db/index.js';
import { notifications, blockedUsers, reportedUsers, users } from '../db/schema.js';
import { eq, and, desc, or, sql } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { createId } from '@paralleldrive/cuid2';
import { broadcastToUser } from '../websocket.js';

const router = Router();

// GET /api/notifications - Get user notifications
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly = 'false' } = req.query;

    const whereCondition = unreadOnly === 'true'
      ? and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      : eq(notifications.userId, userId);

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
      .limit(50);

    res.json(userNotifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    const [result] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, false)
        )
      );

    res.json({ count: Number(result.count) || 0 });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(
        and(
          eq(notifications.id, id),
          eq(notifications.userId, userId)
        )
      );

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put('/read-all', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

    await db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId));

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// POST /api/notifications - Create notification (internal use)
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  senderId?: string;
  conversationId?: string;
  groupId?: string;
}) {
  try {
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
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

// POST /api/notifications/block - Block a user
router.post('/block', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { blockedUserId, reason } = req.body;

    if (!blockedUserId) {
      return res.status(400).json({ error: 'Blocked user ID is required' });
    }

    if (blockedUserId === userId) {
      return res.status(400).json({ error: 'Cannot block yourself' });
    }

    // Check if already blocked
    const existing = await db
      .select()
      .from(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, userId),
          eq(blockedUsers.blockedUserId, blockedUserId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return res.status(400).json({ error: 'User already blocked' });
    }

    await db.insert(blockedUsers).values({
      id: createId(),
      userId,
      blockedUserId,
      reason,
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    console.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// DELETE /api/notifications/block/:blockedUserId - Unblock a user
router.delete('/block/:blockedUserId', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { blockedUserId } = req.params;

    await db
      .delete(blockedUsers)
      .where(
        and(
          eq(blockedUsers.userId, userId),
          eq(blockedUsers.blockedUserId, blockedUserId)
        )
      );

    res.json({ message: 'User unblocked successfully' });
  } catch (error) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// GET /api/notifications/blocked - Get blocked users
router.get('/blocked', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;

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

    res.json(blocked);
  } catch (error) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ error: 'Failed to fetch blocked users' });
  }
});

// POST /api/notifications/report - Report a user
router.post('/report', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { reportedUserId, reason, context } = req.body;

    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'Reported user ID and reason are required' });
    }

    if (reportedUserId === userId) {
      return res.status(400).json({ error: 'Cannot report yourself' });
    }

    await db.insert(reportedUsers).values({
      id: createId(),
      reporterId: userId,
      reportedUserId,
      reason,
      context,
    });

    res.json({ message: 'User reported successfully' });
  } catch (error) {
    console.error('Error reporting user:', error);
    res.status(500).json({ error: 'Failed to report user' });
  }
});

export default router;
