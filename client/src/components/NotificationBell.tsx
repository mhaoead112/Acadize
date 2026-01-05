import React, { useState, useEffect, useRef } from 'react';
import { useStudentNotifications } from '@/contexts/StudentNotificationContext';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

interface ApiNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  createdAt: string;
  read: boolean;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'warning':
      return 'warning';
    case 'success':
      return 'check_circle';
    case 'alert':
      return 'error';
    default:
      return 'info';
  }
};

const getColorClass = (type: string) => {
  switch (type) {
    case 'warning':
      return 'bg-orange-500';
    case 'success':
      return 'bg-green-500';
    case 'alert':
      return 'bg-red-500';
    default:
      return 'bg-blue-600';
  }
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead, clearNotifications, addNotification } = useStudentNotifications();
  const { token } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch notifications from API
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!token) return;
      
      setIsLoading(true);
      try {
        const res = await fetch(apiEndpoint('/api/notifications'), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (res.ok) {
          const data: ApiNotification[] = await res.json();
          // Clear existing and add fetched notifications
          clearNotifications();
          data.forEach(notif => {
            addNotification({
              title: notif.title,
              message: notif.message,
              type: notif.type
            });
          });
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative group p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all duration-200 hover:scale-105 active:scale-95"
        aria-label="Notifications"
      >
        <span className="material-symbols-outlined text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
          notifications
        </span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-gradient-to-br from-red-500 to-red-600 dark:from-[#FFD700] dark:to-yellow-600 text-white dark:text-slate-900 text-[10px] font-bold size-5 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 dark:shadow-[#FFD700]/30 ring-2 ring-white dark:ring-[#0a192f] animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 md:w-96 rounded-2xl shadow-2xl dark:shadow-black/50 border border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#112240]/95 backdrop-blur-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="sticky top-0 px-5 py-4 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-[#112240]/95 backdrop-blur-sm z-10">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}
                  </p>
                )}
              </div>
              {notifications.length > 0 && (
                <button
                  onClick={clearNotifications}
                  className="text-xs font-semibold text-[#FFD700] hover:text-yellow-600 dark:hover:text-yellow-500 transition-colors duration-150 px-3 py-1.5 rounded-lg hover:bg-[#FFD700]/10"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[450px] overflow-y-auto">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-[#FFD700] mx-auto"></div>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-3xl">notifications_off</span>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-white/10">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markAsRead(notification.id)}
                    className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors border-l-4 ${
                      !notification.read 
                        ? `border-l-blue-600 dark:border-l-[#FFD700] bg-blue-50/50 dark:bg-blue-500/5` 
                        : 'border-l-transparent'
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className={`flex-shrink-0 size-11 rounded-xl flex items-center justify-center font-semibold text-white shadow-lg transition-transform duration-200 hover:scale-105 ${getColorClass(notification.type)}`}>
                        <span className="material-symbols-outlined text-lg">{getIcon(notification.type)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-sm text-slate-900 dark:text-white leading-snug">{notification.title}</p>
                          {!notification.read && (
                            <span className="flex-shrink-0 size-2 bg-blue-600 dark:bg-[#FFD700] rounded-full mt-1.5 animate-pulse"></span>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1.5 leading-relaxed">{notification.message}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500 mt-2.5 font-medium flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          {notification.time}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
