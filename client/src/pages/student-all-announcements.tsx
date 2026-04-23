import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Megaphone, Pin, Loader2, BookOpen } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface Announcement {
  id: string;
  courseId: string;
  teacherId: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  courseName?: string;
}

interface Enrollment {
  courseId: string;
  course: {
    id: string;
    title: string;
  };
}

export default function StudentAllAnnouncementsPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  useEffect(() => {
    fetchAllAnnouncements();
  }, []);

  const fetchAllAnnouncements = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // DEV MODE: Fetch all published courses instead of checking enrollments
      const coursesRes = await fetch(apiEndpoint("/api/courses"), {
        headers: authHeaders,
      });

      if (!coursesRes.ok) {
        throw new Error("Failed to fetch courses");
      }

      const coursesData = await coursesRes.json();
      const allCourses = Array.isArray(coursesData) ? coursesData : [];

      if (allCourses.length === 0) {
        setAnnouncements([]);
        setLoading(false);
        return;
      }

      // Fetch announcements for each course
      const allAnnouncements: Announcement[] = [];
      
      for (const course of allCourses) {
        try {
          const courseId = course.id;
          const courseName = course.title || "Unknown Course";

          const announcementsRes = await fetch(
            apiEndpoint(`/api/announcements/course/${courseId}`),
            { headers: authHeaders }
          );

          if (announcementsRes.ok) {
            const data = await announcementsRes.json();
            const courseAnnouncements = Array.isArray(data.announcements) ? data.announcements : [];
            
            // Add course name to each announcement
            courseAnnouncements.forEach((announcement: Announcement) => {
              allAnnouncements.push({
                ...announcement,
                courseName,
              });
            });
          }
        } catch (error) {
          console.error(`Failed to fetch announcements for course ${course.id}:`, error);
        }
      }

      // Sort announcements: pinned first, then by date
      allAnnouncements.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setAnnouncements(allAnnouncements);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 24) {
      if (diffHours < 1) {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return diffMinutes < 1 ? "Just now" : `${diffMinutes}m ago`;
      }
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-slate-600 dark:text-slate-400 text-sm">{t('common:common.loading')}</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {t('allAnnouncements')}
          </h1>
          <p className="text-gray-600 dark:text-slate-400 mt-2">
            {t('allAnnouncementsSubtitle')}
          </p>
        </div>

        {/* Announcements List */}
        {announcements.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Megaphone className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 dark:text-slate-400 text-center">
                {t('noAnnouncementsYet')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {announcements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className={`transition-all hover:shadow-md ${
                  announcement.isPinned ? "border-blue-500 border-2 bg-blue-50" : ""
                }`}
              >
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Link href={`/student/courses/${announcement.courseId}/announcements`}>
                          <Badge 
                            variant="secondary" 
                            className="gap-1 cursor-pointer hover:bg-gray-300"
                          >
                            <BookOpen className="h-3 w-3" />
                            {announcement.courseName}
                          </Badge>
                        </Link>
                        {announcement.isPinned && (
                          <Badge variant="default" className="gap-1">
                            <Pin className="h-3 w-3" />
                            Pinned
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatDate(announcement.createdAt)}
                        </span>
                      </div>
                      <CardTitle className="text-lg">{announcement.title}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-700 whitespace-pre-wrap line-clamp-3">
                    {announcement.content}
                  </p>
                  {announcement.content.length > 200 && (
                    <Link href={`/student/courses/${announcement.courseId}/announcements`}>
                      <button className="text-blue-600 hover:text-blue-700 text-sm mt-2 font-medium">
                        Read more →
                      </button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
