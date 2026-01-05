import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Megaphone, Plus, Search, Filter, Pin, PinOff, 
  Edit, Trash2, Loader2, Calendar, User, BookOpen,
  Globe, Eye, Clock
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiEndpoint, assetUrl } from '@/lib/config';
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
  courseId?: string;
  teacherId: string;
  title: string;
  content: string;
  isPinned: boolean;
  isGlobal?: boolean;
  createdAt: string;
  updatedAt: string;
  course?: {
    id: string;
    title: string;
  };
  teacher?: {
    id: string;
    fullName: string;
  };
}

interface Course {
  id: string;
  title: string;
}

export default function AdminAnnouncements() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<Announcement | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");

  const [newAnnouncement, setNewAnnouncement] = useState({
    title: "",
    content: "",
    courseId: "",
    isPinned: false,
    isGlobal: false
  });

  useEffect(() => {
    fetchAnnouncements();
    fetchCourses();
  }, [token]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const response = await fetch(apiEndpoint('/api/announcements'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setAnnouncements(Array.isArray(data) ? data : (data.announcements || []));
      } else {
        // Demo data as fallback
        setAnnouncements([
          {
            id: '1',
            title: 'Welcome to the New Semester',
            content: 'We are excited to welcome all students and staff to the new academic semester. Please review your course schedules and reach out if you have any questions.',
            isPinned: true,
            isGlobal: true,
            teacherId: 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          {
            id: '2',
            title: 'System Maintenance Notice',
            content: 'The learning management system will undergo scheduled maintenance this weekend. Please save your work before Friday evening.',
            isPinned: false,
            isGlobal: true,
            teacherId: 'admin',
            createdAt: new Date(Date.now() - 86400000).toISOString(),
            updatedAt: new Date(Date.now() - 86400000).toISOString()
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching announcements:', error);
      setAnnouncements([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await fetch(apiEndpoint('/api/courses'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : (data.courses || []));
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const handleCreateAnnouncement = async () => {
    if (!newAnnouncement.title || !newAnnouncement.content) {
      toast({
        title: "Validation Error",
        description: "Please fill in the title and content",
        variant: "destructive"
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(apiEndpoint('/api/announcements'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: newAnnouncement.title,
          content: newAnnouncement.content,
          courseId: newAnnouncement.isGlobal ? null : newAnnouncement.courseId,
          isPinned: newAnnouncement.isPinned,
          isGlobal: newAnnouncement.isGlobal
        })
      });

      if (response.ok) {
        toast({
          title: "Announcement Created",
          description: "The announcement has been published successfully"
        });
        fetchAnnouncements();
        setCreateDialogOpen(false);
        resetNewAnnouncement();
      } else {
        throw new Error('Failed to create announcement');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async () => {
    if (!selectedAnnouncement) return;

    try {
      const response = await fetch(apiEndpoint(`/api/announcements/${selectedAnnouncement.id}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        toast({
          title: "Announcement Deleted",
          description: "The announcement has been removed"
        });
        fetchAnnouncements();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete announcement",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      setSelectedAnnouncement(null);
    }
  };

  const handleTogglePin = async (announcement: Announcement) => {
    try {
      const response = await fetch(apiEndpoint(`/api/announcements/${announcement.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          isPinned: !announcement.isPinned
        })
      });

      if (response.ok) {
        fetchAnnouncements();
        toast({
          title: announcement.isPinned ? "Unpinned" : "Pinned",
          description: `Announcement has been ${announcement.isPinned ? 'unpinned' : 'pinned'}`
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update announcement",
        variant: "destructive"
      });
    }
  };

  const resetNewAnnouncement = () => {
    setNewAnnouncement({
      title: "",
      content: "",
      courseId: "",
      isPinned: false,
      isGlobal: false
    });
  };

  const filteredAnnouncements = announcements
    .filter(a => {
      const matchesSearch = searchQuery === "" ||
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.content.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCourse = filterCourse === "all" || 
        (filterCourse === "global" && a.isGlobal) ||
        a.courseId === filterCourse;
      return matchesSearch && matchesCourse;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-purple-600 mx-auto mb-4" />
            <p className="text-gray-500">Loading announcements...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 rounded-2xl p-6 md:p-8 text-white shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl">
                <Megaphone className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Announcements</h1>
                <p className="text-purple-200 mt-1 text-sm md:text-base">Manage school-wide and course announcements</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-lg px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-white">{announcements.length}</div>
                <div className="text-xs text-purple-200">Total</div>
              </div>
              <div className="bg-white/20 rounded-lg px-4 py-2 text-center min-w-[80px]">
                <div className="text-xl font-bold text-white">{announcements.filter(a => a.isPinned).length}</div>
                <div className="text-xs text-purple-200">Pinned</div>
              </div>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-white text-purple-700 hover:bg-gray-100 font-semibold shadow-lg h-11">
                    <Plus className="h-4 w-4 mr-2" />
                    New Announcement
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Megaphone className="h-5 w-5 text-purple-600" />
                      Create Announcement
                    </DialogTitle>
                    <DialogDescription>Create a new announcement for students and staff</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newAnnouncement.title}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })}
                        placeholder="Announcement title"
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="content">Content *</Label>
                      <Textarea
                        id="content"
                        value={newAnnouncement.content}
                        onChange={(e) => setNewAnnouncement({ ...newAnnouncement, content: e.target.value })}
                        placeholder="Write your announcement here..."
                        rows={5}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <div>
                        <Label className="font-medium">Global Announcement</Label>
                        <p className="text-xs text-gray-500">Visible to all users across all classes</p>
                      </div>
                      <Switch
                        checked={newAnnouncement.isGlobal}
                        onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, isGlobal: checked })}
                      />
                    </div>

                    {!newAnnouncement.isGlobal && (
                      <div className="space-y-2">
                        <Label>Course (Optional)</Label>
                        <Select 
                          value={newAnnouncement.courseId} 
                          onValueChange={(v) => setNewAnnouncement({ ...newAnnouncement, courseId: v })}
                        >
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select a course" />
                          </SelectTrigger>
                          <SelectContent>
                            {courses.map(course => (
                              <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <Label className="font-medium">Pin Announcement</Label>
                        <p className="text-xs text-gray-500">Pinned announcements appear at the top</p>
                      </div>
                      <Switch
                        checked={newAnnouncement.isPinned}
                        onCheckedChange={(checked) => setNewAnnouncement({ ...newAnnouncement, isPinned: checked })}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleCreateAnnouncement} 
                      disabled={saving}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        'Publish Announcement'
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search announcements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 w-full"
                />
              </div>
              <Select value={filterCourse} onValueChange={setFilterCourse}>
                <SelectTrigger className="w-[180px] h-11">
                  <SelectValue placeholder="All Announcements" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Announcements</SelectItem>
                  <SelectItem value="global">Global Only</SelectItem>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Announcements List */}
        <div className="space-y-4">
          {filteredAnnouncements.length === 0 ? (
            <Card className="border border-gray-200">
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">No announcements found</h3>
                <p className="text-gray-500 mt-1">Create your first announcement to get started</p>
                <Button 
                  className="mt-4 bg-purple-600 hover:bg-purple-700"
                  onClick={() => setCreateDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Announcement
                </Button>
              </CardContent>
            </Card>
          ) : (
            filteredAnnouncements.map((announcement) => (
              <Card 
                key={announcement.id} 
                className={`border transition-all hover:shadow-md ${
                  announcement.isPinned ? 'border-purple-200 bg-purple-50/30' : 'border-gray-200'
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {announcement.isPinned && (
                          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {announcement.isGlobal ? (
                          <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                            <Globe className="h-3 w-3 mr-1" />
                            Global
                          </Badge>
                        ) : announcement.course ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <BookOpen className="h-3 w-3 mr-1" />
                            {announcement.course.title}
                          </Badge>
                        ) : null}
                      </div>
                      
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
                      <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
                      
                      <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {formatDate(announcement.createdAt)}
                        </div>
                        {announcement.teacher && (
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {announcement.teacher.fullName}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePin(announcement)}
                        className="h-9 w-9"
                      >
                        {announcement.isPinned ? (
                          <PinOff className="h-4 w-4 text-gray-500" />
                        ) : (
                          <Pin className="h-4 w-4 text-gray-500" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedAnnouncement(announcement);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this announcement? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAnnouncement}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
