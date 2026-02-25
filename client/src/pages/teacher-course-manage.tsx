import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, useLocation } from "wouter";
import { 
  BookOpen, Users, FileText, Settings, Trash2, Plus,
  ArrowLeft, Calendar, Clock, TrendingUp, CheckCircle2, Loader2,
  UserPlus, Search, Megaphone, Pin, ChevronRight, BarChart3
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Course {
  id: string;
  title: string;
  description: string;
  status: string;
  teacherId: string;
  createdAt: string;
}

interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string;
  createdAt: string;
}

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  maxScore: number;
}

interface Enrollment {
  enrollmentId: string;
  enrolledAt: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentRole: string;
  progress?: number;
  completedAssignments?: number;
  totalAssignments?: number;
  averageScore?: number;
}

interface Student {
  id: string;
  fullName: string;
  email: string;
  username: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function TeacherCourseManage() {
  const { t } = useTranslation('teacher');
  const [, params] = useRoute("/teacher/courses/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, token, isAuthenticated, getAuthHeaders } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Announcement dialog states
  const [isAnnouncementDialogOpen, setIsAnnouncementDialogOpen] = useState(false);
  const [announcementTitle, setAnnouncementTitle] = useState("");
  const [announcementContent, setAnnouncementContent] = useState("");
  const [announcementPinned, setAnnouncementPinned] = useState(false);
  const [savingAnnouncement, setSavingAnnouncement] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  
  // Enrollment states
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);
  const [studentSearchTerm, setStudentSearchTerm] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'assignments' | 'roster' | 'announcements'>('overview');
  const [rosterSearch, setRosterSearch] = useState("");

  const courseId = params?.id;

  // Handle redirect for 'create' courseId - must be in useEffect, not during render
  useEffect(() => {
    if (courseId === 'create') {
      setLocation('/teacher/courses/create');
    }
  }, [courseId, setLocation]);

  useEffect(() => {
    if (courseId && courseId !== 'create' && token && isAuthenticated) {
      fetchCourseData();
    } else if (!token || !isAuthenticated) {
      setLoading(false);
    }
  }, [courseId, token, isAuthenticated]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();

      // Fetch course details
      const courseRes = await fetch(apiEndpoint(`/api/courses/${courseId}`), { headers });
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        setCourse(courseData);
        setEditTitle(courseData.title);
        setEditDescription(courseData.description);
      }

      // Fetch lessons
      const lessonsRes = await fetch(apiEndpoint(`/api/lessons/course/${courseId}`), { headers });
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(Array.isArray(lessonsData.lessons) ? lessonsData.lessons : []);
      }

      // Fetch assignments
      const assignmentsRes = await fetch(apiEndpoint(`/api/assignments/courses/${courseId}/assignments`), { headers });
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(Array.isArray(assignmentsData) ? assignmentsData : []);
      }

      // Fetch enrolled students
      const studentsRes = await fetch(apiEndpoint(`/api/enrollments/course/${courseId}`), { headers });
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setEnrollments(Array.isArray(studentsData) ? studentsData : []);
      }

      // Fetch announcements
      const announcementsRes = await fetch(apiEndpoint(`/api/announcements/course/${courseId}`), { headers });
      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json();
        setAnnouncements(announcementsData.announcements || []);
      }
    } catch (error) {
      console.error("Failed to fetch course data:", error);
      toast({
        title: "Error",
        description: "Failed to load course data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateCourse = async () => {
    try {
      const response = await fetch(apiEndpoint(`/api/courses/${courseId}`), {
        method: "PUT",
        headers: getAuthHeaders(),
        body: JSON.stringify({ title: editTitle, description: editDescription }),
      });

      if (response.ok) {
        toast({ title: "Success", description: "Class updated successfully" });
        setIsEditDialogOpen(false);
        fetchCourseData();
      } else {
        throw new Error("Failed to update course");
      }
    } catch (error) {
      toast({ title: "Error", description: "Failed to update course", variant: "destructive" });
    }
  };

  // Fetch available students (not already enrolled)
  const fetchAvailableStudents = async () => {
    if (!token || !courseId) return;
    
    setLoadingStudents(true);
    try {
      // Use the enrollment API that already filters out enrolled students
      const response = await fetch(apiEndpoint(`/api/enrollments/students/available/${courseId}`), {
        headers: getAuthHeaders()
      });

      if (!response.ok) throw new Error('Failed to fetch students');

      const availableStudentsList = await response.json();
      
      // Map to expected format (API returns id, username, email)
      const available = availableStudentsList.map((s: any) => ({
        id: s.id,
        fullName: s.username, // Use username as display name
        email: s.email,
        username: s.username
      }));
      
      setAvailableStudents(available);
    } catch (err) {
      console.error('Failed to fetch students:', err);
      toast({
        title: "Error",
        description: "Failed to load students list",
        variant: "destructive"
      });
    } finally {
      setLoadingStudents(false);
    }
  };

  // Enroll selected student
  const handleEnrollStudent = async () => {
    if (!selectedStudentId || !courseId) {
      toast({
        title: "Error",
        description: "Please select a student",
        variant: "destructive"
      });
      return;
    }

    setEnrolling(true);
    try {
      // Use the enrollment API endpoint
      const response = await fetch(apiEndpoint('/api/enrollments/enroll'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ studentId: selectedStudentId, courseId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to enroll student');
      }

      const data = await response.json();
      
      toast({
        title: "Success",
        description: `${data.student?.fullName || 'Student'} has been enrolled in this course`
      });
      
      setIsEnrollDialogOpen(false);
      setSelectedStudentId("");
      setStudentSearchTerm("");
      fetchCourseData(); // Refresh enrollment list
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to enroll student",
        variant: "destructive"
      });
    } finally {
      setEnrolling(false);
    }
  };

  // Unenroll student
  const handleUnenrollStudent = async (enrollmentId: string, studentName: string) => {
    if (!confirm(`Are you sure you want to remove ${studentName} from this course?`)) return;

    try {
      // Use the enrollment API endpoint with enrollmentId
      const response = await fetch(apiEndpoint(`/api/enrollments/${enrollmentId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to unenroll student');
      }

      toast({
        title: "Success",
        description: `${studentName} has been removed from this course`
      });
      
      fetchCourseData(); // Refresh enrollment list
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to unenroll student",
        variant: "destructive"
      });
    }
  };

  // Create announcement
  const handleCreateAnnouncement = async () => {
    if (!announcementTitle.trim() || !announcementContent.trim()) {
      toast({
        title: "Error",
        description: "Please fill in both title and content",
        variant: "destructive"
      });
      return;
    }

    setSavingAnnouncement(true);
    try {
      const response = await fetch(apiEndpoint('/api/announcements'), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          courseId,
          title: announcementTitle.trim(),
          content: announcementContent.trim(),
          isPinned: announcementPinned
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create announcement');
      }

      toast({
        title: "Success",
        description: "Announcement created successfully"
      });

      setIsAnnouncementDialogOpen(false);
      setAnnouncementTitle("");
      setAnnouncementContent("");
      setAnnouncementPinned(false);
      fetchCourseData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to create announcement",
        variant: "destructive"
      });
    } finally {
      setSavingAnnouncement(false);
    }
  };

  // Delete announcement
  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;

    try {
      const response = await fetch(apiEndpoint(`/api/announcements/${announcementId}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to delete announcement');
      }

      toast({
        title: "Success",
        description: "Announcement deleted successfully"
      });

      fetchCourseData();
    } catch (err) {
      toast({
        title: "Error",
        description: err instanceof Error ? err.message : "Failed to delete announcement",
        variant: "destructive"
      });
    }
  };

  const handleExportRoster = () => {
    toast({
      title: "Export queued",
      description: "Roster export will be available soon",
    });
  };

  // Open enroll dialog and fetch students
  const openEnrollDialog = () => {
    setIsEnrollDialogOpen(true);
    fetchAvailableStudents();
  };

  // Filter students by search term
  const filteredStudents = availableStudents.filter(student =>
    student.fullName?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.email?.toLowerCase().includes(studentSearchTerm.toLowerCase()) ||
    student.username?.toLowerCase().includes(studentSearchTerm.toLowerCase())
  );

  const filteredRoster = enrollments
    .filter((enrollment) => {
      const query = rosterSearch.toLowerCase();
      return (
        enrollment.studentName?.toLowerCase().includes(query) ||
        enrollment.studentEmail?.toLowerCase().includes(query) ||
        enrollment.studentId?.toLowerCase().includes(query)
      );
    })
    .sort((a, b) => (a.studentName || '').localeCompare(b.studentName || ''));

  const averageProgress = enrollments.length
    ? Math.round(
        enrollments.reduce((sum, enrollment) => sum + (enrollment.progress ?? 0), 0) /
          enrollments.length
      )
    : 0;

  const upcomingAssignment = assignments
    .filter((assignment) => assignment.dueDate)
    .sort(
      (a, b) =>
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    )[0];

  const activityItems = [
    ...lessons.map((lesson) => ({
      id: `lesson-${lesson.id}`,
      title: lesson.title,
      subtitle: 'Lesson published',
      date: lesson.createdAt,
      icon: BookOpen,
    })),
    ...assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      title: assignment.title,
      subtitle: 'Assignment scheduled',
      date: assignment.dueDate,
      icon: FileText,
    })),
    ...announcements.map((announcement) => ({
      id: `announcement-${announcement.id}`,
      title: announcement.title,
      subtitle: 'Announcement posted',
      date: announcement.createdAt,
      icon: Megaphone,
    })),
  ]
    .filter((item) => item.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 6);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'grid_view' },
    { id: 'content', label: 'Course Content', icon: 'folder' },
    { id: 'assignments', label: 'Assignments', icon: 'assignment' },
    { id: 'roster', label: 'Roster', icon: 'groups' },
    { id: 'announcements', label: 'Announcements', icon: 'campaign' },
  ] as const;

  if (loading && courseId !== 'create') {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </TeacherLayout>
    );
  }

  if (!course && courseId !== 'create') {
    return (
      <TeacherLayout>
        <div className="text-center py-12">
          <p className="text-gray-600">Class not found</p>
          <Button onClick={() => setLocation("/teacher/courses")} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </TeacherLayout>
    );
  }

  // If courseId is 'create', show loading while useEffect handles redirect
  if (courseId === 'create') {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </TeacherLayout>
    );
  }

  // At this point, course must exist (due to checks above)
  if (!course) return null;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="flex flex-col gap-8 animate-in fade-in duration-300">
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Students</span>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[11px]">Active</Badge>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-bold">{enrollments.length}</p>
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  Growing roster
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm ring-1 ring-gold/30">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Assignments</span>
                  <Badge variant="secondary" className="text-[11px]">Open</Badge>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-bold">{assignments.length}</p>
                <p className="text-xs text-gold font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {upcomingAssignment ? `Next due ${new Date(upcomingAssignment.dueDate).toLocaleDateString()}` : 'No upcoming due dates'}
                </p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Lessons</span>
                  <Badge variant="outline" className="text-[11px]">Content</Badge>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-bold">{lessons.length}</p>
                <p className="text-xs text-slate-400 font-medium">Latest {lessons[0]?.title ? 'added' : 'pending'}</p>
              </div>
              <div className="flex flex-col gap-1 rounded-xl p-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Avg Progress</span>
                  <Badge variant="secondary" className="text-[11px] flex items-center gap-1"><TrendingUp className="h-3 w-3" />Trend</Badge>
                </div>
                <p className="text-slate-900 dark:text-white text-3xl font-bold">{averageProgress}%</p>
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">On track</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 flex flex-col gap-4">
                <h2 className="text-slate-900 dark:text-white text-xl font-bold">Recent Activity</h2>
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 shadow-sm overflow-hidden">
                  {activityItems.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">No recent activity yet.</div>
                  ) : (
                    activityItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <div key={item.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gold/10 text-gold flex items-center justify-center">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">{item.subtitle}</p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-400">
                            {item.date ? new Date(item.date).toLocaleDateString() : ''}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-6">
                <div className="bg-gold/5 dark:bg-gold/10 rounded-xl p-5 border border-gold/20 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <Megaphone className="h-5 w-5 text-gold" />
                    <span className="text-sm font-bold text-navy dark:text-navy">Class Updates</span>
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-200">
                    {announcements[0]?.title || 'Share an announcement to keep everyone aligned.'}
                  </p>
                  <div className="flex gap-2">
                    <Button onClick={() => setIsAnnouncementDialogOpen(true)} className="bg-gold text-navy hover:bg-yellow-500">
                      New Announcement
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
                      Edit Course
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={openEnrollDialog}
                    className="flex items-center justify-between rounded-xl px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left hover:shadow-sm transition"
                  >
                    <div>
                      <p className="text-xs text-slate-500">Enrollments</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Add students</p>
                    </div>
                    <UserPlus className="h-4 w-4 text-slate-400" />
                  </button>
                  <button
                    onClick={() => setLocation(`/teacher/courses/${courseId}/lessons/create`)}
                    className="flex items-center justify-between rounded-xl px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-left hover:shadow-sm transition"
                  >
                    <div>
                      <p className="text-xs text-slate-500">Lesson</p>
                      <p className="text-sm font-bold text-slate-900 dark:text-white">Add content</p>
                    </div>
                    <Plus className="h-4 w-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'content':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Active Curriculum</h2>
              <Button 
                onClick={() => setLocation(`/teacher/courses/${courseId}/lessons/create`)}
                className="flex items-center gap-2 bg-gold text-navy px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-gold/20 hover:bg-yellow-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Lesson
              </Button>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
              {lessons.length === 0 ? (
                <div className="p-6 text-center text-slate-500">No lessons yet. Create your first lesson.</div>
              ) : (
                lessons.map((lesson, i) => (
                  <div key={lesson.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${i === 0 ? 'bg-gold/5 border-l-4 border-l-gold' : ''}`}>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-700 dark:text-white">
                        {i + 1}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{lesson.title}</p>
                        <p className="text-xs text-slate-500">Published {new Date(lesson.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setLocation(`/teacher/courses/${courseId}/lessons/${lesson.id}`)}
                      className="bg-white dark:bg-navy border-slate-200 dark:border-gray-800"
                    >
                      View
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        );

      case 'assignments':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Course Assignments</h2>
              <Button 
                onClick={() => setLocation('/teacher/assignments')}
                className="flex items-center gap-2 bg-gold text-navy px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-gold/20 hover:bg-yellow-500 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Max Score</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {assignments.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-10 text-center text-slate-500">No assignments yet.</td>
                    </tr>
                  ) : (
                    assignments.map((assignment) => (
                      <tr key={assignment.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4 font-semibold text-slate-900 dark:text-white">{assignment.title}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{new Date(assignment.dueDate).toLocaleDateString()}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{assignment.maxScore}</td>
                        <td className="px-4 py-4 text-right">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setLocation(`/teacher/assignments/${assignment.id}`)}
                            className="bg-white dark:bg-navy border-slate-200 dark:border-gray-800"
                          >
                            View
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'roster':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Student Roster</h2>
              <div className="flex items-center gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input 
                    type="text" 
                    placeholder="Search by name or email..."
                    value={rosterSearch}
                    onChange={(e) => setRosterSearch(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-lg pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-gold/50 outline-none transition-all"
                  />
                </div>
                <Button 
                  variant="outline"
                  className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-50 transition-colors shrink-0"
                  onClick={handleExportRoster}
                >
                  <BarChart3 className="h-4 w-4" />
                  Export
                </Button>
                <Button className="flex items-center gap-2 bg-gold text-navy px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-gold/20 hover:bg-yellow-500 transition-colors shrink-0" onClick={openEnrollDialog}>
                  <UserPlus className="h-4 w-4" />
                  Enroll
                </Button>
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Enrolled</th>
                    <th className="px-4 py-3">Progress</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredRoster.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-500">No students found.</td>
                    </tr>
                  ) : (
                    filteredRoster.map((enrollment) => (
                      <tr key={enrollment.enrollmentId} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold">
                              {enrollment.studentName?.charAt(0) || 'S'}
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">{enrollment.studentName || 'Student'}</p>
                              <p className="text-xs text-slate-500">ID: {enrollment.studentId}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{enrollment.studentEmail}</td>
                        <td className="px-4 py-4 text-slate-600 dark:text-slate-300">{new Date(enrollment.enrolledAt).toLocaleDateString()}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <Progress value={enrollment.progress ?? 0} className="h-2 flex-1" />
                            <span className="text-xs text-slate-500">{enrollment.progress ?? 0}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setLocation(`/teacher/students/${enrollment.studentId}`)}
                              className="bg-white dark:bg-navy border-slate-200 dark:border-gray-800"
                            >
                              View
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-gray-800"
                              onClick={() => handleUnenrollStudent(enrollment.enrollmentId, enrollment.studentName)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'announcements':
        return (
          <div className="flex flex-col gap-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">Announcements</h2>
              <Button 
                onClick={() => setIsAnnouncementDialogOpen(true)}
                className="bg-gold hover:bg-yellow-500 text-navy dark:bg-gold dark:hover:bg-yellow-500 dark:text-navy flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Announcement
              </Button>
            </div>

            {announcements.length === 0 ? (
              <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-12 text-center shadow-sm">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-slate-600 dark:text-gray-400 mb-4">No announcements yet.</p>
                <Button 
                  onClick={() => setIsAnnouncementDialogOpen(true)}
                  className="bg-gold hover:bg-yellow-500 text-navy"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Announcement
                </Button>
              </div>
            ) : (
              <div className="grid gap-4">
                {announcements.map((announcement) => (
                  <div 
                    key={announcement.id} 
                    className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-6 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-lg text-navy dark:text-white">{announcement.title}</h3>
                          {announcement.isPinned && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-xs">
                              <Pin className="h-3 w-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 dark:text-gray-400 mb-3 whitespace-pre-wrap">{announcement.content}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Posted {new Date(announcement.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 border-slate-200 dark:border-gray-800"
                        onClick={() => handleDeleteAnnouncement(announcement.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <TeacherLayout>
      <div className="flex flex-col h-full overflow-hidden bg-slate-50 dark:bg-navy-dark">
        <div className="px-6 py-8 md:px-10 md:py-10 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <button onClick={() => setLocation('/teacher/courses')} className="hover:text-gold transition-colors flex items-center gap-1">
                  <ArrowLeft className="h-4 w-4" />
                  {t('courses')}
                </button>
                <ChevronRight className="h-4 w-4" />
                <span className="text-gold">{courseId}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-slate-900 dark:text-white">{course.title}</h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">{course.description}</p>
              <div className="flex items-center gap-3 mt-2">
                <Badge variant="outline" className="bg-white dark:bg-slate-800 text-xs">
                  <Calendar className="h-3 w-3 mr-1" />
                  Created {new Date(course.createdAt).toLocaleDateString()}
                </Badge>
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-400 text-xs">
                  {course.status}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white text-sm font-bold hover:bg-slate-100 transition-colors" onClick={() => setIsEditDialogOpen(true)}>
                <Settings className="h-4 w-4" />
                {t('courseSettings')}
              </Button>
              <Button 
                onClick={() => setLocation(`/teacher/courses/${courseId}/lessons/create`)}
                className="flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-gold text-navy text-sm font-bold hover:bg-yellow-500 transition-colors shadow-lg shadow-gold/20"
              >
                <Plus className="h-4 w-4" />
                Create New
              </Button>
            </div>
          </div>

          <div className="max-w-6xl mx-auto mt-8">
            <div className="flex gap-8 overflow-x-auto no-scrollbar">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`group flex items-center gap-2 pb-3 border-b-2 transition-all min-w-max ${
                    activeTab === tab.id
                      ? 'border-gold text-gold'
                      : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  <span className={`material-symbols-outlined text-[20px] ${activeTab === tab.id ? 'fill' : ''}`}>
                    {tab.icon}
                  </span>
                  <span className="text-sm font-bold">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          <div className="max-w-6xl mx-auto">
            {renderTabContent()}
          </div>
        </div>

        {/* Dialogs */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-navy dark:text-white">Edit Course</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-gray-400">Update course information</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-navy dark:text-white">Course Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="bg-white dark:bg-navy-dark border-slate-200 dark:border-gray-700"
                />
              </div>
              <div>
                <Label htmlFor="description" className="text-navy dark:text-white">Description</Label>
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="bg-white dark:bg-navy-dark border-slate-200 dark:border-gray-700"
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setIsEditDialogOpen(false)}
                className="border-slate-200 dark:border-gray-700"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleUpdateCourse}
                className="bg-gold hover:bg-yellow-500 text-navy"
              >
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
          <DialogContent className="max-w-md bg-white dark:bg-slate-800">
            <DialogHeader>
              <DialogTitle className="text-navy dark:text-white">Enroll Student</DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-gray-400">
                Select a student to enroll in this course
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search students..."
                  value={studentSearchTerm}
                  onChange={(e) => setStudentSearchTerm(e.target.value)}
                  className="pl-10 bg-white dark:bg-navy-dark border-slate-200 dark:border-gray-700"
                />
              </div>

              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-slate-600 dark:text-gray-400">Loading students...</span>
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-8 text-center text-slate-500 dark:text-gray-400">
                  {studentSearchTerm ? "No students match your search" : "No available students to enroll"}
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-gray-700 rounded-lg divide-y divide-slate-200 dark:divide-gray-700">
                  {filteredStudents.map((student) => (
                    <div
                      key={student.id}
                      className={`p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-navy transition-colors flex items-center gap-3 ${
                        selectedStudentId === student.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                      }`}
                      onClick={() => setSelectedStudentId(student.id)}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold text-sm">
                        {student.fullName?.charAt(0) || 'S'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{student.fullName}</p>
                        <p className="text-sm text-gray-500 truncate">{student.email}</p>
                      </div>
                      {selectedStudentId === student.id && (
                        <CheckCircle2 className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setIsEnrollDialogOpen(false);
                  setSelectedStudentId("");
                  setStudentSearchTerm("");
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleEnrollStudent}
                disabled={!selectedStudentId || enrolling}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {enrolling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enrolling...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Enroll Student
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isAnnouncementDialogOpen} onOpenChange={setIsAnnouncementDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Announcement</DialogTitle>
              <DialogDescription>
                Share important updates with your students
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="announcementTitle">Title</Label>
                <Input
                  id="announcementTitle"
                  placeholder="Announcement title..."
                  value={announcementTitle}
                  onChange={(e) => setAnnouncementTitle(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="announcementContent">Content</Label>
                <Textarea
                  id="announcementContent"
                  placeholder="Write your announcement here..."
                  value={announcementContent}
                  onChange={(e) => setAnnouncementContent(e.target.value)}
                  rows={5}
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="announcementPinned"
                  checked={announcementPinned}
                  onChange={(e) => setAnnouncementPinned(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="announcementPinned" className="text-sm font-normal">
                  Pin this announcement (will appear at the top)
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAnnouncementDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreateAnnouncement} 
                disabled={savingAnnouncement || !announcementTitle.trim() || !announcementContent.trim()}
              >
                {savingAnnouncement ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Megaphone className="h-4 w-4 mr-2" />
                    Create Announcement
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TeacherLayout>
  );
}
