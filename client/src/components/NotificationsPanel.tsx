import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Bell, X, Megaphone, FileText, CheckCircle, AlertCircle,
  Calendar, MessageCircle, Trophy, TrendingUp, BookOpen, Pin
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint, assetUrl, WS_URL } from '@/lib/config';

interface Notification {
  id: string;
  type: 'announcement' | 'assignment' | 'grade' | 'reminder' | 'achievement' | 'message';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  priority: 'low' | 'medium' | 'high';
  courseId?: string;
  courseName?: string;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: any;
}

const notificationIcons = {
  announcement: Megaphone,
  assignment: FileText,
  grade: TrendingUp,
  reminder: Calendar,
  achievement: Trophy,
  message: MessageCircle,
};

const notificationColors = {
  announcement: 'text-blue-600 bg-blue-50',
  assignment: 'text-orange-600 bg-orange-50',
  grade: 'text-green-600 bg-green-50',
  reminder: 'text-purple-600 bg-purple-50',
  achievement: 'text-yellow-600 bg-yellow-50',
  message: 'text-pink-600 bg-pink-50',
};

const priorityColors = {
  low: 'border-gray-200',
  medium: 'border-yellow-300',
  high: 'border-red-400',
};

function NotificationItem({ notification, onRead, onNavigate }: {
  notification: Notification;
  onRead: (id: string) => void;
  onNavigate: (url: string) => void;
}) {
  const Icon = notificationIcons[notification.type];
  const colorClass = notificationColors[notification.type];
  const borderClass = priorityColors[notification.priority];
  
  const getRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - time.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return time.toLocaleDateString();
  };

  return (
    <div 
      className={`
        p-3 sm:p-4 border-l-4 rounded-lg transition-all cursor-pointer
        ${borderClass}
        ${notification.isRead 
          ? 'bg-gray-50 opacity-75' 
          : 'bg-white shadow-sm hover:shadow-md'
        }
      `}
      onClick={() => {
        if (!notification.isRead) onRead(notification.id);
        if (notification.actionUrl) onNavigate(notification.actionUrl);
      }}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div className={`p-1.5 sm:p-2 rounded-lg ${colorClass}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className={`font-semibold text-sm ${notification.isRead ? 'text-gray-600' : 'text-gray-900'}`}>
              {notification.title}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {notification.priority === 'high' && (
                <AlertCircle className="h-4 w-4 text-red-500" />
              )}
              {!notification.isRead && (
                <div className="h-2 w-2 rounded-full bg-blue-600" />
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-600 mb-2 line-clamp-2">
            {notification.message}
          </p>
          
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span>{getRelativeTime(notification.timestamp)}</span>
              {notification.courseName && (
                <>
                  <span>•</span>
                  <Badge variant="secondary" className="text-xs">
                    {notification.courseName}
                  </Badge>
                </>
              )}
            </div>
            
            {notification.actionLabel && (
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  if (notification.actionUrl) onNavigate(notification.actionUrl);
                }}
              >
                {notification.actionLabel} →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function NotificationsPanel() {
  const { getAuthHeaders, token } = useAuth();
  const [, setLocation] = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread count immediately on mount and set up interval
  useEffect(() => {
    // Small delay to ensure localStorage is available
    const initialFetch = setTimeout(() => {
      fetchUnreadCount();
    }, 100);
    
    // Set up interval to refresh the count periodically
    const interval = setInterval(fetchUnreadCount, 30000); // Every 30 seconds
    
    return () => {
      clearTimeout(initialFetch);
      clearInterval(interval);
    };
  }, []);

  // Also fetch when token changes (login/logout)
  useEffect(() => {
    if (token) {
      fetchUnreadCount();
    }
  }, [token]);

  // WebSocket listener for real-time notifications
  useEffect(() => {
    if (!token) return;

    const wsUrl = `${WS_URL}?token=${token}`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'notification') {
          // Increment unread count when a new notification arrives
          setUnreadCount(prev => prev + 1);
          // If panel is open, refresh notifications
          if (isOpen) {
            fetchNotifications();
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    return () => {
      ws.close();
    };
  }, [token, isOpen]);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchUnreadCount = async () => {
    // Get token directly from localStorage to ensure it's available
    const storedToken = localStorage.getItem('auth_token') || localStorage.getItem('eduverse_token');
    if (!storedToken) return;

    const headers: HeadersInit = {
      'Authorization': `Bearer ${storedToken}`,
      'Content-Type': 'application/json'
    };

    try {
      let totalUnread = 0;

      // Fetch unread count from notifications table
      const notifResponse = await fetch(apiEndpoint("/api/notifications/unread-count"), {
        headers,
      });
      
      if (notifResponse.ok) {
        const data = await notifResponse.json();
        totalUnread += data.count || 0;
      }

      // Also fetch unread announcements count
      const annResponse = await fetch(apiEndpoint("/api/announcements/student"), {
        headers,
      });
      
      if (annResponse.ok) {
        const data = await annResponse.json();
        const announcements = Array.isArray(data.announcements) ? data.announcements : [];
        const unreadAnnouncements = announcements.filter((ann: any) => !ann.isRead).length;
        totalUnread += unreadAnnouncements;
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // Fetch announcements
      const announcementsRes = await fetch(apiEndpoint("/api/announcements/student"), {
        headers: authHeaders,
      });

      const allNotifications: Notification[] = [];

      if (announcementsRes.ok) {
        const data = await announcementsRes.json();
        const announcements = Array.isArray(data.announcements) ? data.announcements : [];
        
        announcements.forEach((ann: any) => {
          allNotifications.push({
            id: `ann-${ann.id}`,
            type: 'announcement',
            title: ann.title,
            message: ann.content,
            timestamp: ann.createdAt,
            isRead: ann.isRead || false,
            priority: ann.isPinned ? 'high' : 'medium',
            courseId: ann.courseId,
            courseName: ann.courseName,
            actionUrl: `/student/courses/${ann.courseId}/announcements`,
            actionLabel: 'View',
            metadata: ann
          });
        });
      }

      // Fetch assignments (pending)
      const assignmentsRes = await fetch(apiEndpoint("/api/assignments?status=pending"), {
        headers: authHeaders,
      });

      if (assignmentsRes.ok) {
        const assignments = await assignmentsRes.json();
        const assignmentsList = Array.isArray(assignments) ? assignments : [];
        
        assignmentsList.slice(0, 5).forEach((asgn: any) => {
          const dueDate = new Date(asgn.dueDate);
          const now = new Date();
          const hoursUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60));
          
          let priority: 'low' | 'medium' | 'high' = 'low';
          if (hoursUntilDue < 24) priority = 'high';
          else if (hoursUntilDue < 72) priority = 'medium';

          allNotifications.push({
            id: `asgn-${asgn.id}`,
            type: 'assignment',
            title: `Assignment Due: ${asgn.title}`,
            message: `Due ${dueDate.toLocaleDateString()} at ${dueDate.toLocaleTimeString()}`,
            timestamp: asgn.createdAt,
            isRead: false,
            priority,
            courseId: asgn.courseId,
            courseName: asgn.course?.title,
            actionUrl: `/student/assignments/${asgn.id}`,
            actionLabel: 'Submit',
            metadata: asgn
          });
        });
      }

      // Fetch recent grades
      const gradesRes = await fetch(apiEndpoint("/api/grades/student?limit=5"), {
        headers: authHeaders,
      });

      if (gradesRes.ok) {
        const grades = await gradesRes.json();
        const gradesList = Array.isArray(grades) ? grades : [];
        
        gradesList.forEach((grade: any) => {
          allNotifications.push({
            id: `grade-${grade.id}`,
            type: 'grade',
            title: 'New Grade Posted',
            message: `${grade.assignment?.title}: ${grade.score}/${grade.maxScore}`,
            timestamp: grade.gradedAt,
            isRead: false,
            priority: 'low',
            courseId: grade.assignment?.courseId,
            courseName: grade.assignment?.course?.title,
            actionUrl: `/student/grades`,
            actionLabel: 'View Details',
            metadata: grade
          });
        });
      }

      // Fetch study group and DM notifications
      const studyGroupNotifs = await fetch(apiEndpoint("/api/notifications?unread=true"), {
        headers: authHeaders,
      });

      if (studyGroupNotifs.ok) {
        const sgNotifs = await studyGroupNotifs.json();
        const notifsList = Array.isArray(sgNotifs) ? sgNotifs : [];
        
        notifsList.forEach((notif: any) => {
          allNotifications.push({
            id: `sg-${notif.id}`,
            type: 'message',
            title: notif.title || 'New Message',
            message: notif.message || '',
            timestamp: notif.createdAt,
            isRead: notif.isRead,
            priority: notif.type === 'mention' ? 'high' : 'medium',
            actionUrl: notif.type === 'dm_request' || notif.type === 'new_message' 
              ? '/student/messages' 
              : '/student/groups',
            actionLabel: 'View',
            metadata: notif
          });
        });
      }

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(allNotifications);
      // Update unread count from fetched notifications
      setUnreadCount(allNotifications.filter(n => !n.isRead).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    // Check if notification was unread before marking
    const notification = notifications.find(n => n.id === notificationId);
    if (notification && !notification.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    
    setNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );

    // If it's an announcement, mark it on the server
    if (notificationId.startsWith('ann-')) {
      const announcementId = notificationId.replace('ann-', '');
      try {
        const authHeaders = getAuthHeaders();
        await fetch(apiEndpoint(`/api/announcements/${announcementId}/read`), {
          method: 'PATCH',
          headers: authHeaders,
        });
      } catch (error) {
        console.error("Failed to mark announcement as read:", error);
      }
    }
    
    // If it's a study group notification, mark it on the server
    if (notificationId.startsWith('sg-')) {
      const sgNotifId = notificationId.replace('sg-', '');
      try {
        const authHeaders = getAuthHeaders();
        await fetch(apiEndpoint(`/api/notifications/${sgNotifId}/read`), {
          method: 'PUT',
          headers: authHeaders,
        });
      } catch (error) {
        console.error("Failed to mark study group notification as read:", error);
      }
    }
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    setUnreadCount(0);
  };

  const handleNavigate = (url: string) => {
    setIsOpen(false);
    setLocation(url);
  };

  const filteredNotifications = notifications.filter(n => {
    if (activeTab === 'all') return true;
    if (activeTab === 'unread') return !n.isRead;
    return n.type === activeTab;
  });

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 min-w-5 text-xs p-0 flex items-center justify-center bg-red-600">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      
      <SheetContent className="w-full sm:max-w-lg p-0">
        <div className="flex flex-col h-full">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {unreadCount} new
                  </Badge>
                )}
              </SheetTitle>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-xs"
                >
                  Mark all read
                </Button>
              )}
            </div>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <div className="px-6 pt-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all" className="text-xs">
                  All
                  {notifications.length > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs">
                      {notifications.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="unread" className="text-xs">
                  Unread
                  {unreadCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-4 min-w-4 text-xs">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="announcement" className="text-xs">
                  <Megaphone className="h-3 w-3" />
                </TabsTrigger>
                <TabsTrigger value="assignment" className="text-xs">
                  <FileText className="h-3 w-3" />
                </TabsTrigger>
              </TabsList>
            </div>

            <ScrollArea className="flex-1 px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                </div>
              ) : filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mb-4" />
                  <p className="text-gray-600 font-medium">
                    No notifications
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {activeTab === 'unread' 
                      ? "You're all caught up!"
                      : "You'll see updates here"}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredNotifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onRead={markAsRead}
                      onNavigate={handleNavigate}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}
