// Push Notification Routes for EduVerse
import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import pushNotificationService from '../services/push-notification.service.js';

const router = Router();

// GET /api/push/vapid-key - Get the VAPID public key for client subscription
router.get('/vapid-key', (req, res) => {
  try {
    const publicKey = pushNotificationService.getVapidPublicKey();
    res.json({ publicKey });
  } catch (error) {
    console.error('Error getting VAPID key:', error);
    res.status(500).json({ error: 'Failed to get VAPID key' });
  }
});

// POST /api/push/subscribe - Subscribe to push notifications
router.post('/subscribe', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { subscription } = req.body;

    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Invalid subscription object' });
    }

    const userAgent = req.headers['user-agent'];
    const result = await pushNotificationService.subscribeUser(
      userId,
      subscription,
      userAgent
    );

    if (result.success) {
      res.json({ 
        message: 'Successfully subscribed to push notifications',
        subscriptionId: result.subscriptionId 
      });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    res.status(500).json({ error: 'Failed to subscribe to push notifications' });
  }
});

// POST /api/push/unsubscribe - Unsubscribe from push notifications
router.post('/unsubscribe', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { endpoint } = req.body;

    const result = await pushNotificationService.unsubscribeUser(userId, endpoint);

    if (result.success) {
      res.json({ message: 'Successfully unsubscribed from push notifications' });
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    res.status(500).json({ error: 'Failed to unsubscribe from push notifications' });
  }
});

// POST /api/push/test - Send a test notification (for development)
router.post('/test', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { title = 'Test Notification', body = 'This is a test notification from EduVerse!' } = req.body;

    const result = await pushNotificationService.sendPushNotification(userId, {
      title,
      body,
      icon: '/logo.png',
      tag: 'test',
      data: { type: 'system', test: true }
    });

    res.json({
      message: 'Test notification sent',
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});

// Admin only: Send notification to specific user
router.post('/send/:userId', isAuthenticated, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { userId } = req.params;
    const { title, body, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    const result = await pushNotificationService.sendPushNotification(userId, {
      title,
      body,
      icon: '/logo.png',
      data: data || {}
    });

    res.json({
      message: 'Notification sent',
      sent: result.sent,
      failed: result.failed
    });
  } catch (error) {
    console.error('Error sending notification:', error);
    res.status(500).json({ error: 'Failed to send notification' });
  }
});

// Admin only: Broadcast notification to all users
router.post('/broadcast', isAuthenticated, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { title, body, role, data } = req.body;

    if (!title || !body) {
      return res.status(400).json({ error: 'Title and body are required' });
    }

    let result;
    if (role) {
      // Send to specific role
      result = await pushNotificationService.sendPushNotificationToRole(role, {
        title,
        body,
        icon: '/logo.png',
        data: data || {}
      });
    } else {
      // Send to all users
      result = await pushNotificationService.sendPushNotificationToAll({
        title,
        body,
        icon: '/logo.png',
        data: data || {}
      });
    }

    res.json({
      message: 'Broadcast notification sent',
      totalSent: result.totalSent,
      totalFailed: result.totalFailed
    });
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    res.status(500).json({ error: 'Failed to broadcast notification' });
  }
});

export default router;
