import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}

interface ProgressNudge {
  type: 'start' | 'milestone' | 'streak';
  triggered: boolean;
}

interface StudentNotificationContextType {
  notifications: StudentNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<StudentNotification, 'id' | 'read' | 'time'>) => void;
  checkProgressNudges: (progressData: any, streakData: any, enrollments: any[]) => void;
}

const StudentNotificationContext = createContext<StudentNotificationContextType | undefined>(undefined);

let notificationIdCounter = 1000;

export const StudentNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [nudgesTriggered, setNudgesTriggered] = useState<Record<string, boolean>>({});

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const addNotification = useCallback((notification: Omit<StudentNotification, 'id' | 'read' | 'time'>) => {
    notificationIdCounter++;
    const newNotif: StudentNotification = {
      ...notification,
      id: `notif-${notificationIdCounter}-${Date.now()}`,
      read: false,
      time: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);
  }, []);

  // Progress nudge logic
  const checkProgressNudges = useCallback((progressData: any, streakData: any, enrollments: any[]) => {
    const today = new Date();
    const nudgeKey = `nudges-${today.toDateString()}`;
    
    // Check localStorage to avoid duplicate nudges in same session
    const existingNudges = localStorage.getItem(nudgeKey);
    const triggeredToday = existingNudges ? JSON.parse(existingNudges) : {};

    // Nudge 1: 0% progress after enrollment (check if any course has 0% progress)
    if (!triggeredToday['start'] && progressData?.progressPercentage === 0 && enrollments.length > 0) {
      addNotification({
        title: '📚 Ready to Start?',
        message: 'Your first lesson awaits! Begin your learning journey today.',
        type: 'info'
      });
      triggeredToday['start'] = true;
    }

    // Nudge 2: 50% milestone
    if (!triggeredToday['milestone'] && progressData?.progressPercentage >= 50 && progressData?.progressPercentage < 55) {
      addNotification({
        title: '🎉 Halfway There!',
        message: 'You\'re making great progress. Keep up the amazing work!',
        type: 'success'
      });
      triggeredToday['milestone'] = true;
    }

    // Nudge 3: Streak at risk (last activity more than 23 hours ago)
    if (!triggeredToday['streak'] && streakData?.currentStreak > 0) {
      const lastActivity = streakData.lastActivityDate ? new Date(streakData.lastActivityDate) : null;
      if (lastActivity) {
        const hoursSinceActivity = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActivity >= 23 && hoursSinceActivity < 48) {
          addNotification({
            title: '🔥 Keep Your Streak!',
            message: `Log in to maintain your ${streakData.currentStreak}-day streak!`,
            type: 'warning'
          });
          triggeredToday['streak'] = true;
        }
      }
    }

    localStorage.setItem(nudgeKey, JSON.stringify(triggeredToday));
  }, [addNotification]);

  return (
    <StudentNotificationContext.Provider value={{ 
      notifications, 
      unreadCount, 
      markAsRead, 
      markAllAsRead, 
      clearNotifications, 
      addNotification,
      checkProgressNudges
    }}>
      {children}
    </StudentNotificationContext.Provider>
  );
};

export const useStudentNotifications = () => {
  const context = useContext(StudentNotificationContext);
  if (!context) {
    throw new Error('useStudentNotifications must be used within a StudentNotificationProvider');
  }
  return context;
};
