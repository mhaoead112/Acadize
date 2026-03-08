import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { 
  ArrowLeft, FileText, Video, Download, Edit, 
  Trash2, Loader2, Clock, Calendar, BookOpen
} from "lucide-react";
import { apiEndpoint, assetUrl } from "@/lib/config";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { usePortalI18n } from '@/hooks/usePortalI18n';


interface Lesson {
  id: string;
  title: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: string;
  order: string | null;
  courseId: string;
  courseName?: string;
  isPublished?: boolean;
  createdAt: Date;
  updatedAt?: Date | null;
}

export default function TeacherLessonView() {
  const { t } = usePortalI18n("common");
  const [, params] = useRoute("/teacher/courses/:courseId/lessons/:lessonId");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { token, isLoading: authLoading, getAuthHeaders } = useAuth();
  
  const courseId = params?.courseId;
  const lessonId = params?.lessonId;
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  // Edit form state
  const [editTitle, setEditTitle] = useState("");

  // Helper function to get file URL
  const getFileUrl = (filePath: string) => {
    // Extract the path after 'uploads'
    const uploadsIndex = filePath.indexOf('uploads');
    if (uploadsIndex !== -1) {
      const relativePath = filePath.substring(uploadsIndex);
      return assetUrl(relativePath.replace(/\\/g, '/'));
    }
    // Fallback: assume it's already a relative path
    return assetUrl(filePath);
  };

  useEffect(() => {
    if (!authLoading && token && courseId && lessonId) {
      fetchLesson();
    }
  }, [authLoading, token, courseId, lessonId]);

  const fetchLesson = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        apiEndpoint(`/api/courses/${courseId}/lessons/${lessonId}`),
        {
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (response.ok) {
        const data = await response.json();
        setLesson(data);
        setEditTitle(data.title || "");
      } else {
        throw new Error("Failed to fetch lesson");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load lesson details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLesson = async () => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/courses/${courseId}/lessons/${lessonId}`),
        {
          method: "PUT",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({
            title: editTitle,
          }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Lesson updated successfully",
        });
        setIsEditDialogOpen(false);
        fetchLesson();
      } else {
        throw new Error("Failed to update lesson");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lesson",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLesson = async () => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/courses/${courseId}/lessons/${lessonId}`),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
          credentials: "include",
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "Lesson deleted successfully",
        });
        setLocation(`/teacher/courses/${courseId}`);
      } else {
        throw new Error("Failed to delete lesson");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete lesson",
        variant: "destructive",
      });
    }
  };

  const handleTogglePublish = async () => {
    try {
      const response = await fetch(
        apiEndpoint(`/api/courses/${courseId}/lessons/${lessonId}/publish`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          credentials: "include",
          body: JSON.stringify({ isPublished: !lesson?.isPublished }),
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: lesson?.isPublished ? "Lesson unpublished" : "Lesson published",
        });
        fetchLesson();
      } else {
        throw new Error("Failed to toggle publish status");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update lesson status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!lesson) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Lesson not found</p>
          <Button onClick={() => setLocation(`/teacher/courses/${courseId}`)} className="mt-4">
            Back to Course
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 rounded-2xl p-6 shadow-lg border border-blue-100">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setLocation(`/teacher/courses/${courseId}`)}
                className="hover:bg-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  {lesson.order && (
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                      Lesson {lesson.order}
                    </Badge>
                  )}
                  <h1 className="text-3xl font-bold text-gray-900">{lesson.title}</h1>
                </div>
                <p className="text-gray-600 max-w-2xl">{lesson.fileName}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {lesson.fileType}
                  </span>
                  <span className="flex items-center gap-1">
                    <Download className="h-4 w-4" />
                    {lesson.fileSize}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Created {new Date(lesson.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(true)}
                className="bg-white"
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button 
                variant="destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* File Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Lesson File
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{lesson.fileName}</p>
                    <p className="text-sm text-gray-500 mt-1">Type: {lesson.fileType} • Size: {lesson.fileSize}</p>
                  </div>
                  <Button 
                    variant="outline"
                    onClick={() => window.open(getFileUrl(lesson.filePath), '_blank')}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Lesson</DialogTitle>
              <DialogDescription>Update lesson title</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateLesson}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Lesson</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this lesson? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleDeleteLesson}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
