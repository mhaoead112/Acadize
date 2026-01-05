import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { apiEndpoint } from "@/lib/config";
import { ArrowLeft, Megaphone, Pin, PinOff, Edit2, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function AnnouncementsPage() {
  const [, params] = useRoute("/courses/:courseId/announcements");
  const courseId = params?.courseId;
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Create/Edit form state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    isPinned: false,
  });
  
  // Delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
        // Backend returns { announcements: [...] }
        setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
      } else {
        throw new Error("Failed to fetch announcements");
      }
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
      setAnnouncements([]); // Set empty array on error
      toast({
        title: "Error",
        description: "Failed to load announcements",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint("/api/announcements"), {
        method: "POST",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          ...formData,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Announcement created successfully",
        });
        setIsCreateDialogOpen(false);
        setFormData({ title: "", content: "", isPinned: false });
        fetchAnnouncements();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to create announcement");
      }
    } catch (error) {
      console.error("Failed to create announcement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create announcement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAnnouncement = async () => {
    if (!editingAnnouncement || !formData.title.trim() || !formData.content.trim()) {
      toast({
        title: "Validation Error",
        description: "Title and content are required",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/announcements/${editingAnnouncement.id}`), {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Announcement updated successfully",
        });
        setEditingAnnouncement(null);
        setFormData({ title: "", content: "", isPinned: false });
        fetchAnnouncements();
      } else {
        const error = await response.json();
        throw new Error(error.message || "Failed to update announcement");
      }
    } catch (error) {
      console.error("Failed to update announcement:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update announcement",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/announcements/${announcement.id}`), {
        method: "PATCH",
        headers: {
          ...authHeaders,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          isPinned: !announcement.isPinned,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: announcement.isPinned ? "Announcement unpinned" : "Announcement pinned",
        });
        fetchAnnouncements();
      } else {
        throw new Error("Failed to toggle pin");
      }
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!deletingId) return;

    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/announcements/${deletingId}`), {
        method: "DELETE",
        headers: authHeaders,
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Announcement deleted successfully",
        });
        fetchAnnouncements();
      } else {
        throw new Error("Failed to delete announcement");
      }
    } catch (error) {
      console.error("Failed to delete announcement:", error);
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
      setShowDeleteDialog(false);
    }
  };

  const openEditDialog = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setFormData({
      title: announcement.title,
      content: announcement.content,
      isPinned: announcement.isPinned,
    });
  };

  const openCreateDialog = () => {
    setEditingAnnouncement(null);
    setFormData({ title: "", content: "", isPinned: false });
    setIsCreateDialogOpen(true);
  };

  const closeDialog = () => {
    setIsCreateDialogOpen(false);
    setEditingAnnouncement(null);
    setFormData({ title: "", content: "", isPinned: false });
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
          Back
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">Announcements</h1>
          {course && (
            <p className="text-gray-600 mt-1">
              {course.title}
            </p>
          )}
        </div>
        <Button onClick={openCreateDialog} className="gap-2">
          <Megaphone className="h-4 w-4" />
          New Announcement
        </Button>
      </div>

      {/* Announcements List */}
      {announcements.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Megaphone className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600 text-center">
              No announcements yet. Create your first announcement to communicate with students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id} className={announcement.isPinned ? "border-blue-500 border-2" : ""}>
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
                      {new Date(announcement.createdAt).toLocaleString()}
                      {announcement.updatedAt !== announcement.createdAt && " (edited)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTogglePin(announcement)}
                      className="gap-2"
                    >
                      {announcement.isPinned ? (
                        <>
                          <PinOff className="h-4 w-4" />
                          Unpin
                        </>
                      ) : (
                        <>
                          <Pin className="h-4 w-4" />
                          Pin
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(announcement)}
                      className="gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        setDeletingId(announcement.id);
                        setShowDeleteDialog(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{announcement.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || editingAnnouncement !== null} onOpenChange={closeDialog}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-gray-900">
              {editingAnnouncement ? "Edit Announcement" : "Create New Announcement"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1 block">
                Title
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter announcement title"
                disabled={submitting}
                className="bg-white text-gray-900"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-900 mb-1 block">
                Content
              </label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Enter announcement content"
                rows={8}
                disabled={submitting}
                className="bg-white text-gray-900"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isPinned"
                checked={formData.isPinned}
                onChange={(e) => setFormData({ ...formData, isPinned: e.target.checked })}
                disabled={submitting}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="isPinned" className="text-sm font-medium text-gray-900">
                Pin this announcement
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} disabled={submitting}>
              Cancel
            </Button>
            <Button
              onClick={editingAnnouncement ? handleUpdateAnnouncement : handleCreateAnnouncement}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {editingAnnouncement ? "Updating..." : "Creating..."}
                </>
              ) : (
                editingAnnouncement ? "Update" : "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletingId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAnnouncement} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
