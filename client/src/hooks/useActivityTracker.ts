import { useCallback } from 'react';
import { apiEndpoint, assetUrl } from '@/lib/config';

export function useActivityTracker() {
  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    return token ? { 
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    } : {
      'Content-Type': 'application/json'
    };
  };

  const trackActivity = useCallback(async (
    activityType: 'lesson_view' | 'assignment_submit' | 'quiz_complete' | 'login' | 'study_session',
    durationMinutes?: number
  ) => {
    try {
      await fetch(apiEndpoint('/api/streaks/activity'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activityType, durationMinutes }),
      });
      // Silent success - don't need to notify user
    } catch (error) {
      console.error('Failed to track activity:', error);
      // Don't show error to user - this is background tracking
    }
  }, []);

  return { trackActivity };
}
