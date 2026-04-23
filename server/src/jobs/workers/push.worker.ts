import { 
    sendPushNotificationToUsersSync, 
    sendPushNotificationToAllSync, 
    sendPushNotificationToRoleSync,
    sendPushNotificationSync
} from '../../services/push-notification.service.js';

export interface PushJobData {
    type: 'single' | 'users' | 'role' | 'all';
    userId?: string;
    userIds?: string[];
    role?: 'student' | 'teacher' | 'admin' | 'parent';
    organizationId?: string;
    payload: any;
}

export async function handlePushNotification(jobData: PushJobData) {
    switch (jobData.type) {
        case 'single':
            if (jobData.userId) {
                await sendPushNotificationSync(jobData.userId, jobData.payload);
            }
            break;
        case 'users':
            if (jobData.userIds && jobData.userIds.length > 0) {
                await sendPushNotificationToUsersSync(jobData.userIds, jobData.payload);
            }
            break;
        case 'role':
            if (jobData.role) {
                await sendPushNotificationToRoleSync(jobData.role, jobData.payload, jobData.organizationId);
            }
            break;
        case 'all':
            await sendPushNotificationToAllSync(jobData.payload);
            break;
    }
}
