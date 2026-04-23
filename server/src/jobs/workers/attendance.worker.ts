import { triggerNotificationSync, AttendanceEvent } from '../../services/attendance-notification.service.js';

export async function handleAttendanceNotification(jobData: AttendanceEvent) {
    if (!jobData.type) {
        throw new Error('Attendance job requires an AttendanceEvent payload');
    }
    
    await triggerNotificationSync(jobData);
}
