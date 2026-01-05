import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { ArrowLeft, Megaphone, Pin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
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
}

interface Course {
  id: string;
  title: string;
}

export default function StudentAnnouncementsPage() {
  const [, params] = useRoute("/student/courses/:courseId/announcements");
  const courseId = params?.courseId;
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem("auth_token") || localStorage.getItem("eduverse_token");
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchAnnouncements();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/courses/${courseId}`), {
        headers: authHeaders,
      });
      if (response.ok) {
        const data = await response.json();
        setCourse(data);
      }
    } catch (error) {
      console.error("Failed to fetch course:", error);
    }
  };

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/announcements/course/${courseId}`), {
        headers: authHeaders,
      });
      
      if (response.ok) {
        const data = await response.json();
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
      } else {
        throw new Error("Failed to fetch announcements");
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      setAnnouncements([]);
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="outline"
          onClick={() => window.history.back()}
          className="gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Course
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          {course && (
            <p className="text-gray-600 mt-1">
              {course.title}
            </p>
          )}
        </div>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              No announcements yet. Check back later for updates from your instructor.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card 
              key={announcement.id} 
              className={announcement.isPinned ? "border-blue-500 border-2 bg-blue-50" : ""}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-xl">{announcement.title}</CardTitle>
                      {announcement.isPinned && (
                        <Badge variant="default" className="gap-1">
                          <Pin className="h-3 w-3" />
                          Pinned
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Posted {new Date(announcement.createdAt).toLocaleString()}
                      {announcement.updatedAt !== announcement.createdAt && " • Edited"}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {announcement.content}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
