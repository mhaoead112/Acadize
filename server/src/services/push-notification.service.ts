// Push Notification Service for EduVerse
// Uses the Web Push protocol to send notifications to browsers

import { db } from '../db/index.js';
import { pushSubscriptions, users } from '../db/schema.js';
import { eq, and, inArray } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

// @ts-ignore - web-push types are available but not picked up by bundler resolution
import webpush from 'web-push';

// VAPID keys for Web Push (should be stored in environment variables in production)
// Generate new keys using: npx web-push generate-vapid-keys
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@eduverse.com';
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BCrR7uUmW3TEpmTNWCdlAW0mv6_rsRtE4KcldE0S_AGXTC3PuONtk7N9zFt9LK3vbD5w91uXpk3QI0ex74fBMBI';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'fGnCPFRbkz5RFqmpFRw7i29gtsreg3k4Seik0eW1_AI';

// Configure web-push with VAPID keys
webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: {
    type?: string;
    conversationId?: string;
    assignmentId?: string;
    courseId?: string;
    groupId?: string;
    url?: string;
    [key: string]: any;
  };
}

interface SubscriptionInfo {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

// Subscribe a user to push notifications
export async function subscribeUser(
  userId: string, 
  subscription: SubscriptionInfo, 
  userAgent?: string
): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
  try {
    // Check if subscription already exists (same endpoint)
    const existing = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, subscription.endpoint))
      .limit(1);

    if (existing.length > 0) {
      // Update existing subscription
      await db
        .update(pushSubscriptions)
        .set({
          userId,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          userAgent,
          isActive: true,
          updatedAt: new Date()
        })
        .where(eq(pushSubscriptions.endpoint, subscription.endpoint));

      return { success: true, subscriptionId: existing[0].id };
    }

    // Create new subscription
    const id = createId();
    await db.insert(pushSubscriptions).values({
      id,
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      userAgent,
      isActive: true
    });

    return { success: true, subscriptionId: id };
  } catch (error) {
    console.error('Error subscribing user to push notifications:', error);
    return { success: false, error: 'Failed to subscribe to push notifications' };
  }
}

// Unsubscribe a user from push notifications
export async function unsubscribeUser(
  userId: string, 
  endpoint?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (endpoint) {
      // Unsubscribe specific endpoint
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(
          and(
            eq(pushSubscriptions.userId, userId),
            eq(pushSubscriptions.endpoint, endpoint)
          )
        );
    } else {
      // Unsubscribe all endpoints for user
      await db
        .update(pushSubscriptions)
        .set({ isActive: false })
        .where(eq(pushSubscriptions.userId, userId));
    }

    return { success: true };
  } catch (error) {
    console.error('Error unsubscribing user from push notifications:', error);
    return { success: false, error: 'Failed to unsubscribe from push notifications' };
  }
}

// Send push notification to a specific user
export async function sendPushNotification(
  userId: string, 
  payload: PushPayload
): Promise<{ success: boolean; sent: number; failed: number }> {
  try {
    // Get all active subscriptions for the user
    const subscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(
        and(
          eq(pushSubscriptions.userId, userId),
          eq(pushSubscriptions.isActive, true)
        )
      );

    if (subscriptions.length === 0) {
      return { success: true, sent: 0, failed: 0 };
    }

    let sent = 0;
    let failed = 0;

    for (const sub of subscriptions) {
      const result = await sendToSubscription(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      );

      if (result.success) {
        sent++;
      } else {
        failed++;
        // If subscription is invalid, mark as inactive
        if (result.statusCode === 410 || result.statusCode === 404) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }

    return { success: true, sent, failed };
  } catch (error) {
    console.error('Error sending push notification:', error);
    return { success: false, sent: 0, failed: 0 };
  }
}

// Send push notification to multiple users
export async function sendPushNotificationToUsers(
  userIds: string[], 
  payload: PushPayload
): Promise<{ success: boolean; totalSent: number; totalFailed: number }> {
  let totalSent = 0;
  let totalFailed = 0;

  for (const userId of userIds) {
    const result = await sendPushNotification(userId, payload);
    totalSent += result.sent;
    totalFailed += result.failed;
  }

  return { success: true, totalSent, totalFailed };
}

// Send push notification to all users with a specific role
export async function sendPushNotificationToRole(
  role: 'student' | 'teacher' | 'admin' | 'parent', 
  payload: PushPayload
): Promise<{ success: boolean; totalSent: number; totalFailed: number }> {
  try {
    const usersWithRole = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, role));

    const userIds = usersWithRole.map(u => u.id);
    return await sendPushNotificationToUsers(userIds, payload);
  } catch (error) {
    console.error('Error sending push notification to role:', error);
    return { success: false, totalSent: 0, totalFailed: 0 };
  }
}

// Send push notification to all subscribed users
export async function sendPushNotificationToAll(
  payload: PushPayload
): Promise<{ success: boolean; totalSent: number; totalFailed: number }> {
  try {
    const allSubscriptions = await db
      .select()
      .from(pushSubscriptions)
      .where(eq(pushSubscriptions.isActive, true));

    let totalSent = 0;
    let totalFailed = 0;

    for (const sub of allSubscriptions) {
      const result = await sendToSubscription(
        {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth
          }
        },
        payload
      );

      if (result.success) {
        totalSent++;
      } else {
        totalFailed++;
        if (result.statusCode === 410 || result.statusCode === 404) {
          await db
            .update(pushSubscriptions)
            .set({ isActive: false })
            .where(eq(pushSubscriptions.id, sub.id));
        }
      }
    }

    return { success: true, totalSent, totalFailed };
  } catch (error) {
    console.error('Error sending push notification to all:', error);
    return { success: false, totalSent: 0, totalFailed: 0 };
  }
}

// Low-level function to send notification to a single subscription
async function sendToSubscription(
  subscription: SubscriptionInfo, 
  payload: PushPayload
): Promise<{ success: boolean; statusCode?: number }> {
  try {
    // Create the payload as a string
    const payloadString = JSON.stringify(payload);
    
    // Use web-push library for proper VAPID authentication
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }
    };

    const options = {
      TTL: 86400, // 24 hours
      urgency: 'normal' as const
    };

    const result = await webpush.sendNotification(
      pushSubscription,
      payloadString,
      options
    );

    return { success: true, statusCode: result.statusCode };
  } catch (error: any) {
    // Handle specific web-push errors
    if (error.statusCode) {
      console.error('Push notification failed:', error.statusCode, error.body || error.message);
      
      // 410 Gone means the subscription is no longer valid
      if (error.statusCode === 410 || error.statusCode === 404) {
        console.log('Subscription expired or invalid, should be removed');
      }
      
      return { success: false, statusCode: error.statusCode };
    }
    
    console.error('Error sending to subscription:', error.message);
    return { success: false };
  }
}

// Get VAPID public key for client subscription
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}

// Notification type helpers
export const NotificationTypes = {
  MESSAGE: 'message',
  ASSIGNMENT: 'assignment',
  GRADE: 'grade',
  ANNOUNCEMENT: 'announcement',
  ENROLLMENT: 'enrollment',
  EVENT: 'event',
  STUDY_GROUP: 'study_group',
  SYSTEM: 'system'
} as const;

// Pre-built notification payloads
export function createNotificationPayload(
  type: keyof typeof NotificationTypes,
  data: Record<string, any>
): PushPayload {
  switch (type) {
    case 'MESSAGE':
      return {
        title: `New message from ${data.senderName || 'Someone'}`,
        body: data.preview || 'You have a new message',
        icon: '/logo.png',
        tag: `message-${data.conversationId}`,
        data: {
          type: NotificationTypes.MESSAGE,
          conversationId: data.conversationId,
          senderId: data.senderId
        }
      };

    case 'ASSIGNMENT':
      return {
        title: data.isNew ? '📝 New Assignment' : '📝 Assignment Update',
        body: `${data.title}${data.courseName ? ` in ${data.courseName}` : ''}`,
        icon: '/logo.png',
        tag: `assignment-${data.assignmentId}`,
        data: {
          type: NotificationTypes.ASSIGNMENT,
          assignmentId: data.assignmentId,
          courseId: data.courseId
        }
      };

    case 'GRADE':
      return {
        title: '📊 New Grade Posted',
        body: `You received ${data.score}/${data.maxScore} on "${data.assignmentTitle}"`,
        icon: '/logo.png',
        tag: `grade-${data.gradeId}`,
        data: {
          type: NotificationTypes.GRADE,
          assignmentId: data.assignmentId,
          courseId: data.courseId
        }
      };

    case 'ANNOUNCEMENT':
      return {
        title: `📢 ${data.courseName || 'Course'} Announcement`,
        body: data.title || 'New announcement',
        icon: '/logo.png',
        tag: `announcement-${data.announcementId}`,
        data: {
          type: NotificationTypes.ANNOUNCEMENT,
          announcementId: data.announcementId,
          courseId: data.courseId
        }
      };

    case 'ENROLLMENT':
      return {
        title: '🎓 Enrollment Confirmed',
        body: `You have been enrolled in "${data.courseName}"`,
        icon: '/logo.png',
        tag: `enrollment-${data.courseId}`,
        data: {
          type: NotificationTypes.ENROLLMENT,
          courseId: data.courseId
        }
      };

    case 'EVENT':
      return {
        title: `📅 ${data.isReminder ? 'Event Reminder' : 'New Event'}`,
        body: `${data.title}${data.startTime ? ` at ${data.startTime}` : ''}`,
        icon: '/logo.png',
        tag: `event-${data.eventId}`,
        data: {
          type: NotificationTypes.EVENT,
          eventId: data.eventId
        }
      };

    case 'STUDY_GROUP':
      return {
        title: `👥 ${data.groupName || 'Study Group'}`,
        body: data.message || 'New activity in your study group',
        icon: '/logo.png',
        tag: `study-group-${data.groupId}`,
        data: {
          type: NotificationTypes.STUDY_GROUP,
          groupId: data.groupId
        }
      };

    case 'SYSTEM':
    default:
      return {
        title: data.title || 'EduVerse Notification',
        body: data.message || 'You have a new notification',
        icon: '/logo.png',
        tag: 'system',
        data: {
          type: NotificationTypes.SYSTEM,
          ...data
        }
      };
  }
}

export default {
  subscribeUser,
  unsubscribeUser,
  sendPushNotification,
  sendPushNotificationToUsers,
  sendPushNotificationToRole,
  sendPushNotificationToAll,
  getVapidPublicKey,
  createNotificationPayload,
  NotificationTypes
};
