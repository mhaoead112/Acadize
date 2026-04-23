import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read' | 'time'>) => void;
  setNotificationsFromServer: (notifications: Notification[]) => void;
  checkProgressNudges: (progressData: any, streakData: any, enrollments: any[]) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

let notificationIdCounter = 1000;

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const setNotificationsFromServer = useCallback((incoming: Notification[]) => {
    setNotifications((prev) => {
      const prevById = new Map(prev.map((item) => [item.id, item]));
      const next = incoming.map((item) => {
        const existing = prevById.get(item.id);
        return {
          ...item,
          read: item.read ?? existing?.read ?? false,
          time: item.time || existing?.time || 'Just now',
        };
      });

      if (
        prev.length === next.length &&
        prev.every((item, index) => {
          const other = next[index];
          return (
            !!other &&
            item.id === other.id &&
            item.title === other.title &&
            item.message === other.message &&
            item.type === other.type &&
            item.read === other.read &&
            item.time === other.time
          );
        })
      ) {
        return prev;
      }

      return next;
    });
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'read' | 'time'>) => {
    notificationIdCounter++;
    const newNotif: Notification = {
      ...notification,
      id: `notif-${notificationIdCounter}-${Date.now()}`,
      read: false,
      time: 'Just now',
    };
    setNotifications((prev) => [newNotif, ...prev]);
  }, []);

  const checkProgressNudges = useCallback((progressData: any, streakData: any, enrollments: any[]) => {
    const today = new Date();
    const nudgeKey = `nudges-${today.toDateString()}`;

    const existingNudges = localStorage.getItem(nudgeKey);
    const triggeredToday = existingNudges ? JSON.parse(existingNudges) : {};

    if (!triggeredToday.start && progressData?.progressPercentage === 0 && enrollments.length > 0) {
      addNotification({
        title: 'Ready to Start?',
        message: 'Your first lesson awaits! Begin your learning journey today.',
        type: 'info',
      });
      triggeredToday.start = true;
    }

    if (!triggeredToday.milestone && progressData?.progressPercentage >= 50 && progressData?.progressPercentage < 55) {
      addNotification({
        title: 'Halfway There!',
        message: "You're making great progress. Keep up the amazing work!",
        type: 'success',
      });
      triggeredToday.milestone = true;
    }

    if (!triggeredToday.streak && streakData?.currentStreak > 0) {
      const lastActivity = streakData.lastActivityDate ? new Date(streakData.lastActivityDate) : null;
      if (lastActivity) {
        const hoursSinceActivity = (today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60);
        if (hoursSinceActivity >= 23 && hoursSinceActivity < 48) {
          addNotification({
            title: 'Keep Your Streak!',
            message: `Log in to maintain your ${streakData.currentStreak}-day streak!`,
            type: 'warning',
          });
          triggeredToday.streak = true;
        }
      }
    }

    localStorage.setItem(nudgeKey, JSON.stringify(triggeredToday));
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearNotifications,
        addNotification,
        setNotificationsFromServer,
        checkProgressNudges,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
