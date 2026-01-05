import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface StudentNotification {
  id: string;
  title: string;
  message: string;
  time: string;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'alert';
}

interface StudentNotificationContextType {
  notifications: StudentNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  addNotification: (notification: Omit<StudentNotification, 'id' | 'read' | 'time'>) => void;
}

const StudentNotificationContext = createContext<StudentNotificationContextType | undefined>(undefined);

let notificationIdCounter = 1000;

export const StudentNotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<StudentNotification[]>([
    { id: '1', title: 'Assignment Due', message: 'Physics 101 Lab Report is due tomorrow.', time: '2 hours ago', read: false, type: 'warning' },
    { id: '2', title: 'New Grade Posted', message: 'Your grade for Calculus II Midterm has been posted.', time: '5 hours ago', read: false, type: 'success' },
    { id: '3', title: 'Class Cancelled', message: 'History 101 for tomorrow is cancelled.', time: '1 day ago', read: true, type: 'alert' },
    { id: '4', title: 'Welcome', message: 'Welcome to the new semester!', time: '2 days ago', read: true, type: 'info' },
  ]);

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

  const addNotification = (notification: Omit<StudentNotification, 'id' | 'read' | 'time'>) => {
    notificationIdCounter++;
    const newNotif: StudentNotification = {
      ...notification,
      id: `notif-${notificationIdCounter}-${Date.now()}`,
      read: false,
      time: 'Just now'
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  return (
    <StudentNotificationContext.Provider value={{ notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, addNotification }}>
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
