import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Loader2, Plus } from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";

const assignmentTypes = ['homework', 'quiz', 'exam', 'project', 'presentation', 'essay'];

interface Assignment {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: string;
  dueDate: string;
  maxScore: string;
  isPublished: boolean;
  createdAt: string;
  courseTitle: string;
  submissionCount: number;
  gradedCount: number;
}

interface Course {
  id: string;
  title: string;
}

export default function TeacherAssignmentsPage() {
  const { t } = useTranslation('teacher');
  const { user, token, isAuthenticated, getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  // Filter and UI state
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'dueDate' | 'title' | 'submissions'>('dueDate');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // Removed create dialog state - now navigating to separate page

  // Edit assignment dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    type: 'homework',
    dueDate: '',
    maxScore: '100',
  });

  // Fetch courses
  const fetchCourses = async () => {
    if (!token) return;

    try {
      const res = await fetch(apiEndpoint("/api/courses/user"), {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error("Failed to load courses");
      }

      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch courses:", err);
    }
  };

  // Fetch assignments
  const fetchAssignments = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEndpoint("/api/assignments/teacher"), {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load assignments");
      }

      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
      setCurrentPage(1);
    } catch (err: any) {
      console.error("Failed to fetch assignments:", err);
      setError(err?.message || "Unknown error");
      toast({
        title: t("error"),
        description: t("teacherAssignments.failedToLoadAssignments"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchCourses();
      fetchAssignments();
    } else {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Derived values for stat cards
  const toGradeCount = assignments.filter(a => a.isPublished && a.submissionCount > a.gradedCount).length;
  const dueSoonCount = assignments.filter(a => {
    const due = new Date(a.dueDate);
    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return a.isPublished && due > now && due <= weekFromNow;
  }).length;
  const missingCount = assignments.filter(a => {
    const due = new Date(a.dueDate);
    const now = new Date();
    return a.isPublished && due < now && a.submissionCount > 0;
  }).length;

  // Filter and sort assignments
  const filteredAssignments = assignments
    .filter(a => {
      if (selectedCourse !== 'all' && a.courseId !== selectedCourse) return false;
      if (selectedStatus === 'to-grade' && (a.submissionCount === 0 || a.submissionCount === a.gradedCount)) return false;
      if (selectedStatus === 'due-soon') {
        const due = new Date(a.dueDate);
        const now = new Date();
        const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (due <= now || due > weekFromNow) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'dueDate') return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'submissions') return b.submissionCount - a.submissionCount;
      return 0;
    });

  // Pagination
  const totalPages = Math.ceil(filteredAssignments.length / itemsPerPage);
  const paginatedAssignments = filteredAssignments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Removed create assignment handler - now using separate page

  // Toggle publish
  const handleTogglePublish = async (assignmentId: string, currentStatus: boolean) => {
    setPublishingId(assignmentId);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${assignmentId}/publish`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      if (!res.ok) {
        throw new Error("Failed to update assignment status");
      }

      const { assignment } = await res.json();

      setAssignments(assignments.map(a => a.id === assignmentId ? { ...a, ...assignment } : a));

      toast({
        title: t("common:toast.success"),
        description: assignment.isPublished ? t("teacherAssignments.assignmentPublished") : t("teacherAssignments.assignmentUnpublished"),
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err?.message || t("teacherAssignments.failedToUpdateStatus"),
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    setDeletingId(assignmentToDelete.id);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${assignmentToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error("Failed to delete assignment");
      }

      setAssignments(assignments.filter(a => a.id !== assignmentToDelete.id));

      toast({
        title: t("common:toast.success"),
        description: t("teacherAssignments.assignmentDeleted"),
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err?.message || t("teacherAssignments.failedToDeleteAssignment"),
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setAssignmentToDelete(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type,
      dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
      maxScore: assignment.maxScore,
    });
    setIsEditDialogOpen(true);
  };

  // Edit assignment
  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setIsEditing(true);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${editingAssignment.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          type: editFormData.type,
          dueDate: editFormData.dueDate,
          maxScore: parseInt(editFormData.maxScore),
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update assignment");
      }

      const updatedAssignment = await res.json();

      setAssignments(assignments.map(a => 
        a.id === editingAssignment.id 
          ? { ...a, ...updatedAssignment }
          : a
      ));

      toast({
        title: t("common:toast.success"),
        description: t("teacherAssignments.assignmentUpdated"),
        variant: "default"
      });

      setIsEditDialogOpen(false);
      setEditingAssignment(null);
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err?.message || t("teacherAssignments.failedToUpdateAssignment"),
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const getTypeLabel = (type: string) => t(`teacherAssignments.types.${type}`);

  return (
    <TeacherLayout>
    <div className="flex-1 overflow-y-auto p-8 bg-background dark:bg-navy-dark">
      <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black tracking-tight text-navy dark:text-white mb-1">{t('assignments')}</h2>
            <p className="text-slate-500 dark:text-slate-400">{t("teacherAssignments.manageCoursework")}</p>
          </div>
          <Button 
            onClick={() => setLocation("/teacher/create-assignment")}
            className="flex items-center justify-center gap-2 bg-gold dark:bg-gold hover:bg-[#001845] text-white font-bold py-2.5 px-5 rounded-lg transition-colors shadow-lg shadow-navy/20"
          >
            <span className="material-symbols-outlined text-[20px] text-gold">add</span>
            <span>{t("createAssignment")}</span>
          </Button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-navy/10 dark:bg-slate-800 rounded-lg text-navy dark:text-gold">
                <span className="material-symbols-outlined">edit_note</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAssignments.toGrade")}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{toGradeCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gold/10 dark:bg-gold/20 rounded-lg text-gold dark:text-gold-light">
                <span className="material-symbols-outlined">schedule</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAssignments.dueThisWeek")}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{dueSoonCount}</h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-50 dark:bg-red-900/30 rounded-lg text-red-600 dark:text-red-400">
                <span className="material-symbols-outlined">warning</span>
              </div>
            </div>
            <div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAssignments.missingSubmissions")}</p>
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{missingCount}</h3>
            </div>
          </div>
        </div>

        {/* Table Container */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm overflow-hidden flex flex-col">
          {/* Filter Toolbar */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/50 dark:bg-slate-800">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <div className="relative group">
                <select 
                  value={selectedCourse} 
                  onChange={(e) => {
                    setSelectedCourse(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/50 dark:focus:ring-gold/50 cursor-pointer"
                >
                  <option value="all">{t("teacherAssignments.allCourses")}</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </div>
              </div>

              <div className="relative group">
                <select 
                  value={selectedStatus} 
                  onChange={(e) => {
                    setSelectedStatus(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="appearance-none bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2 pl-3 pr-8 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy/50 dark:focus:ring-gold/50 cursor-pointer"
                >
                  <option value="all">{t("teacherAssignments.allStatuses")}</option>
                  <option value="to-grade">{t("teacherAssignments.toGrade")}</option>
                  <option value="due-soon">{t("teacherAssignments.dueSoon")}</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </div>
              </div>

              <button className="flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 py-2 px-3 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                <span className="material-symbols-outlined text-sm text-gold">calendar_today</span>
                <span>{t("teacherAssignments.dateRange")}</span>
              </button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500 uppercase font-semibold tracking-wider">{t("teacherAssignments.sortBy")}</span>
              <button 
                onClick={() => {
                  setSortBy('dueDate');
                  setCurrentPage(1);
                }}
                className={`text-sm font-medium transition-colors ${sortBy === 'dueDate' ? 'text-navy dark:text-gold underline' : 'text-slate-600 dark:text-slate-400 hover:text-navy dark:hover:text-gold'}`}
              >
                {t("teacherAssignments.dueDate")}
              </button>
            </div>
          </div>

          {/* Table Content */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-slate-500">
              <Loader2 className="mr-2 h-6 w-6 animate-spin" />
              {t("teacherAssignments.loadingAssignments")}
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 p-6">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <span>{error}</span>
              </div>
            </div>
          ) : assignments.length === 0 ? (
            <div className="py-12 text-center bg-white dark:bg-slate-800">
              <span className="material-symbols-outlined text-6xl mx-auto text-slate-400 mb-4 block">assignment</span>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                {t("teacherAssignments.noAssignmentsYet")}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                {t("teacherAssignments.createFirstAssignment")}
              </p>
              <Button onClick={() => setLocation("/teacher/create-assignment")}>
                <Plus className="h-4 w-4 mr-2" />
                {t("createAssignment")}
              </Button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-800/50 text-xs uppercase font-semibold text-navy/70 dark:text-slate-400">
                    <tr>
                      <th className="px-6 py-4">{t("teacherAssignments.assignmentName")}</th>
                      <th className="px-6 py-4">{t("teacherAssignments.course")}</th>
                      <th className="px-6 py-4">{t("teacherAssignments.status")}</th>
                      <th className="px-6 py-4">{t("teacherAssignments.submissions")}</th>
                      <th className="px-6 py-4">{t("teacherAssignments.dueDate")}</th>
                      <th className="px-6 py-4 text-right">{t("teacherAssignments.actions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {paginatedAssignments.map((assignment) => (
                      <tr key={assignment.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-navy/10 dark:bg-slate-800 text-navy dark:text-gold rounded p-2 hidden sm:block">
                              <span className="material-symbols-outlined text-[20px]">description</span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-900 dark:text-white text-base">{assignment.title}</p>
                              <p className="text-xs text-slate-500">{getTypeLabel(assignment.type)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                            {assignment.courseTitle}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            assignment.isPublished 
                              ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-100 dark:border-blue-800'
                              : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border-gray-100 dark:border-gray-800'
                          }`}>
                            <span className={`size-1.5 rounded-full ${assignment.isPublished ? 'bg-blue-600 dark:bg-blue-400' : 'bg-gray-600 dark:bg-gray-400'}`}></span>
                            {assignment.isPublished ? t("published") : t("draft")}
                          </span>
                        </td>
                        <td className="px-6 py-4 min-w-[140px]">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                              {assignment.gradedCount}/{assignment.submissionCount}
                            </span>
                            <span className="text-xs text-slate-500">
                              {assignment.submissionCount > 0 ? Math.round((assignment.gradedCount / assignment.submissionCount) * 100) : 0}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                            <div 
                              className="bg-gold h-1.5 rounded-full transition-all" 
                              style={{ width: assignment.submissionCount > 0 ? `${(assignment.gradedCount / assignment.submissionCount) * 100}%` : '0%' }}
                            ></div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-medium">
                              {new Date(assignment.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(assignment.dueDate).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button 
                              onClick={() => openEditDialog(assignment)}
                              className="text-slate-400 hover:text-navy dark:hover:text-gold transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title={t("teacherAssignments.editAssignment")}
                            >
                              <span className="material-symbols-outlined">edit</span>
                            </button>
                            <button 
                              onClick={() => setAssignmentToDelete(assignment)}
                              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700"
                              title={t("teacherAssignments.deleteAssignment")}
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="bg-slate-50 dark:bg-slate-800 px-6 py-4 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  {t("teacherAssignments.showing")} <span className="font-bold text-slate-900 dark:text-white">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, filteredAssignments.length)}</span> {t("teacherAssignments.of")} <span className="font-bold text-slate-900 dark:text-white">{filteredAssignments.length}</span> {t("assignments")}
                </span>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("teacherAssignments.previous")}
                  </button>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-3 py-1 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {t("teacherAssignments.next")}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherAssignments.areYouSure")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherAssignments.deleteAssignmentConfirm", { title: assignmentToDelete?.title })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common:actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("teacherAssignments.deleteAssignment")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("teacherAssignments.editAssignment")}</DialogTitle>
            <DialogDescription>
              {t("teacherAssignments.updateAssignmentDetails")}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">{t("teacherAssignments.titleRequired")}</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder={t("teacherAssignments.assignmentTitle")}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">{t("teacherAssignments.description")}</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder={t("teacherAssignments.addInstructions")}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">{t("teacherAssignments.typeRequired")}</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("teacherAssignments.selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {getTypeLabel(type)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxScore">{t("teacherAssignments.maxScoreRequired")}</Label>
                <Input
                  id="edit-maxScore"
                  type="number"
                  value={editFormData.maxScore}
                  onChange={(e) => setEditFormData({ ...editFormData, maxScore: e.target.value })}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">{t("teacherAssignments.dueDateRequired")}</Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t("common:actions.cancel")}
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {t("teacherAssignments.saving")}
                  </>
                ) : (
                  t("common:actions.save")
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
    </TeacherLayout>
  );
}
