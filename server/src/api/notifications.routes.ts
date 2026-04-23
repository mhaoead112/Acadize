// server/src/api/notifications.routes.ts

import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import * as NotificationsService from '../services/notifications.service.js';

import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

const router = Router();

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { unreadOnly = 'false' } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { limit, offset, page } = getPaginationParams(req);

    const { data, totalCount } = await NotificationsService.getUserNotifications(
      userId,
      unreadOnly === 'true',
      orgId,
      limit,
      offset
    );

    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch notifications' });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const count = await NotificationsService.getUnreadCount(userId, orgId);

    res.json({ count });
  } catch (error: any) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch unread count' });
  }
});

/**
 * PUT /api/notifications/:id/read
 * Mark notification as read
 */
router.put('/:id/read', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await NotificationsService.markNotificationAsRead(id, userId, orgId);

    res.json({ message: 'Notification marked as read' });
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark notification as read' });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await NotificationsService.markAllNotificationsAsRead(userId, orgId);

    res.json({ message: 'All notifications marked as read' });
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message || 'Failed to mark all notifications as read' });
  }
});

/**
 * POST /api/notifications/block
 * Block a user
 */
router.post('/block', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { blockedUserId, reason } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (!blockedUserId) {
      return res.status(400).json({ error: 'Blocked user ID is required' });
    }

    await NotificationsService.blockUser({
      userId,
      blockedUserId,
      reason,
      organizationId: orgId,
    });

    res.json({ message: 'User blocked successfully' });
  } catch (error: any) {
    console.error('Error blocking user:', error);
    const statusCode = error.message.includes('Cannot block') || error.message.includes('already blocked') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to block user' });
  }
});

/**
 * DELETE /api/notifications/block/:blockedUserId
 * Unblock a user
 */
router.delete('/block/:blockedUserId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { blockedUserId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await NotificationsService.unblockUser(userId, blockedUserId, orgId);

    res.json({ message: 'User unblocked successfully' });
  } catch (error: any) {
    console.error('Error unblocking user:', error);
    res.status(500).json({ error: error.message || 'Failed to unblock user' });
  }
});

/**
 * GET /api/notifications/blocked
 * Get blocked users
 */
router.get('/blocked', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const blocked = await NotificationsService.getBlockedUsers(userId, orgId);

    res.json(blocked);
  } catch (error: any) {
    console.error('Error fetching blocked users:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch blocked users' });
  }
});

/**
 * POST /api/notifications/report
 * Report a user
 */
router.post('/report', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { reportedUserId, reason, context } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (!reportedUserId || !reason) {
      return res.status(400).json({ error: 'Reported user ID and reason are required' });
    }

    await NotificationsService.reportUser({
      reporterId: userId,
      reportedUserId,
      reason,
      context,
      organizationId: orgId,
    });

    res.json({ message: 'User reported successfully' });
  } catch (error: any) {
    console.error('Error reporting user:', error);
    const statusCode = error.message.includes('Cannot report') ? 400 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to report user' });
  }
});

// Export createNotification for internal use
export { createNotification } from '../services/notifications.service.js';

export default router;
