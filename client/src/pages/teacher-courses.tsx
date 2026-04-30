import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import { 
  BookOpen, Plus, Eye, EyeOff,
  CheckCircle2, XCircle, Lock, Search
} from "lucide-react";
import { useLocation } from "wouter";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
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

interface Course {
  id: string;
  title: string;
  description?: string | null;
  teacherId: string;
  isPublished: boolean;
  createdAt: string;
  updatedAt?: string | null;
  imageUrl?: string | null;
  studentCount?: number;
}

const unwrapList = <T,>(payload: unknown): T[] => {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const value = (payload as { data?: unknown; courses?: unknown }).data ?? (payload as { courses?: unknown }).courses;
    return Array.isArray(value) ? value as T[] : [];
  }
  return [];
};

// Get course icon based on title
const getCourseStyle = (title: string) => {
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('math') || lowerTitle.includes('algebra') || lowerTitle.includes('geometry')) {
    return { bg: 'bg-gradient-to-br from-amber-200 to-amber-300', icon: '📐' };
  }
  if (lowerTitle.includes('science') || lowerTitle.includes('physics') || lowerTitle.includes('chemistry') || lowerTitle.includes('biology')) {
    return { bg: 'bg-gradient-to-br from-green-200 to-green-300', icon: '🔬' };
  }
  if (lowerTitle.includes('english') || lowerTitle.includes('writing') || lowerTitle.includes('literature')) {
    return { bg: 'bg-gradient-to-br from-blue-200 to-blue-300', icon: '📚' };
  }
  if (lowerTitle.includes('history') || lowerTitle.includes('social')) {
    return { bg: 'bg-gradient-to-br from-orange-200 to-orange-300', icon: '🏛️' };
  }
  if (lowerTitle.includes('art') || lowerTitle.includes('music') || lowerTitle.includes('drama')) {
    return { bg: 'bg-gradient-to-br from-purple-200 to-purple-300', icon: '🎨' };
  }
  if (lowerTitle.includes('computer') || lowerTitle.includes('programming') || lowerTitle.includes('coding')) {
    return { bg: 'bg-gradient-to-br from-cyan-200 to-cyan-300', icon: '💻' };
  }
  return { bg: 'bg-gradient-to-br from-indigo-200 to-indigo-300', icon: '📖' };
};

export default function TeacherCoursesPage() {
  const { t } = useTranslation('teacher');
  const { user, token, isAuthenticated, getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchCourses = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEndpoint("/api/courses/user"), {
        headers: getAuthHeaders(),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error("Failed to fetch courses:", res.status, errorData);
        throw new Error(errorData.message || "Failed to load courses");
      }
      
      const data = await res.json();
      const coursesData = unwrapList<Course>(data);
      
      // Fetch enrollment counts for each course
      const coursesWithCounts = await Promise.all(
        coursesData.map(async (course) => {
          try {
            const enrollRes = await fetch(apiEndpoint(`/api/enrollments/course/${course.id}`), {
              headers: getAuthHeaders(),
            });
            
            if (enrollRes.ok) {
              const enrollments = await enrollRes.json();
              return { ...course, studentCount: unwrapList(enrollments).length };
            }
          } catch (err) {
            console.error(`Failed to fetch enrollments for course ${course.id}:`, err);
          }
          return { ...course, studentCount: 0 };
        })
      );
      
      setCourses(coursesWithCounts);
    } catch (err: any) {
      console.error("Failed to fetch courses:", err);
      setError(err?.message || t("teacherCourses.unknownError", { defaultValue: "Unknown error" }));
      toast({
        title: t("error"),
        description: t("teacherCourses.failedToLoadCourses", { defaultValue: "Failed to load your courses. Please try again." }),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchCourses();
    } else {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  const handleTogglePublish = async (courseId: string, currentStatus: boolean) => {
    setPublishingId(courseId);
    try {
      const res = await fetch(apiEndpoint(`/api/courses/${courseId}/publish`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      if (!res.ok) {
        throw new Error("Failed to update course status");
      }

      const { course } = await res.json();
      
      // Update local state
      setCourses(courses.map(c => c.id === courseId ? course : c));
      
      toast({
        title: t("common.toast.success", { ns: "common", defaultValue: "Success" }),
        description: course.isPublished
          ? t("teacherCourses.coursePublishedSuccessfully", { defaultValue: "Course published successfully" })
          : t("teacherCourses.courseUnpublishedSuccessfully", { defaultValue: "Course unpublished successfully" }),
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err?.message || t("teacherCourses.failedToUpdateCourseStatus", { defaultValue: "Failed to update course status" }),
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };

  const handleDeleteCourse = async () => {
    if (!courseToDelete) return;
    
    setDeletingId(courseToDelete.id);
    try {
      const res = await fetch(apiEndpoint(`/api/courses/${courseToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error("Failed to delete course");
      }

      // Remove from local state
      setCourses(courses.filter(c => c.id !== courseToDelete.id));
      
      toast({
        title: t("common.toast.success", { ns: "common", defaultValue: "Success" }),
        description: t("teacherCourses.courseDeletedSuccessfully", { defaultValue: "Course deleted successfully" }),
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: t("error"),
        description: err?.message || t("teacherCourses.failedToDeleteCourse", { defaultValue: "Failed to delete course" }),
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setCourseToDelete(null);
    }
  };

  // Filter courses based on search and status
  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         course.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" ||
                         (statusFilter === "published" && course.isPublished) ||
                         (statusFilter === "draft" && !course.isPublished);
    return matchesSearch && matchesStatus;
  });

  return (
    <TeacherLayout>
      <div className="flex-1 overflow-y-auto bg-background p-4 lg:p-8">
        <div className="mx-auto max-w-[1200px] flex flex-col gap-6">
          {/* Header Section */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h2 className="text-foreground text-3xl font-bold leading-tight tracking-[-0.033em]">
                {t('myClasses')}
              </h2>
              <p className="text-muted-foreground text-base font-normal leading-normal">
                {t("teacherCourses.manageActiveCourses", { defaultValue: "Manage your active courses." })}
              </p>
            </div>
            <Button 
              onClick={() => setLocation('/teacher/courses/create')}
              className="flex shrink-0 cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-lg h-12 px-6 bg-gold text-navy font-bold leading-normal tracking-[0.015em] hover:bg-gold-light transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="h-5 w-5" />
              <span className="truncate">{t("teacherCourses.createNewClass", { defaultValue: "Create New Class" })}</span>
            </Button>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col gap-4 bg-white dark:bg-slate-900/70 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  className="w-full h-12 pl-11 pr-4 rounded-lg bg-input border border-border text-foreground placeholder:text-muted-foreground transition-shadow"
                  placeholder={t("teacherCourses.searchByCourseNameOrCode", { defaultValue: "Search by course name or code..." })}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px] h-12 bg-input border-border">
                  <SelectValue placeholder={t("common.placeholders.filterByStatus", { ns: "common", defaultValue: "Filter by status" })} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("teacherCourses.allCourses", { defaultValue: "All Courses" })}</SelectItem>
                  <SelectItem value="published">{t("published")}</SelectItem>
                  <SelectItem value="draft">{t("teacherCourses.drafts", { defaultValue: "Drafts" })}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filter Pills */}
            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar items-center">
              <Button 
                variant={statusFilter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("all")}
                className="rounded-full px-4 whitespace-nowrap"
              >
                {t("teacherCourses.all", { defaultValue: "All" })} ({courses.length})
              </Button>
              <Button 
                variant={statusFilter === "published" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("published")}
                className="rounded-full px-4 whitespace-nowrap"
              >
                {t("published")} ({courses.filter(c => c.isPublished).length})
              </Button>
              <Button 
                variant={statusFilter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter("draft")}
                className="rounded-full px-4 whitespace-nowrap"
              >
                {t("teacherCourses.drafts", { defaultValue: "Drafts" })} ({courses.filter(c => !c.isPublished).length})
              </Button>
            </div>
          </div>

          {/* Courses Grid */}
          {isLoading ? (
            <CardSkeleton count={3} />
          ) : error ? (
            <Card className="border-border bg-destructive/10 shadow-[0_2px_8px_rgba(0,0,0,0.08)]">
              <CardContent className="py-8 text-center">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <XCircle className="h-5 w-5" />
                  <span>{error}</span>
                </div>
              </CardContent>
            </Card>
          ) : filteredCourses.length === 0 ? (
            <Card className="border-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] rounded-2xl bg-card">
              <CardContent className="py-16 text-center">
                <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {searchTerm || statusFilter !== "all"
                    ? t("teacherCourses.noCoursesFound", { defaultValue: "No courses found" })
                    : t("teacherCourses.noCoursesYet", { defaultValue: "No courses yet" })}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {searchTerm || statusFilter !== "all" 
                    ? t("teacherCourses.adjustSearchOrFilters", { defaultValue: "Try adjusting your search or filters" })
                    : t("teacherCourses.getStartedByCreatingFirstCourse", { defaultValue: "Get started by creating your first course" })
                  }
                </p>
                {!searchTerm && statusFilter === "all" && (
                  <Button 
                    onClick={() => setLocation('/teacher/courses/create')}
                    className="bg-blue-600 hover:bg-blue-700 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    {t("teacherCourses.createYourFirstCourse", { defaultValue: "Create Your First Course" })}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
              {filteredCourses.map((course, index) => {
                const courseStyle = getCourseStyle(course.title);
                
                return (
                  <article
  key={course.id}
  onClick={() => setLocation(`/teacher/courses/${course.id}`)}
  className="group flex flex-col bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer"
>
  {/* Image Header */}
  <div
    className="h-40 w-full bg-cover bg-center relative"
    style={{
      backgroundImage: course.imageUrl
        ? `url("${course.imageUrl}")`
        : undefined,
    }}
  >
    {!course.imageUrl && (
      <div className={`absolute inset-0 ${getCourseStyle(course.title).bg}`} />
    )}

    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

    {/* Course Code */}
    <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-md text-xs font-bold text-slate-900 dark:text-white shadow-sm">
      {course.id}
    </div>

    {/* Title */}
    <div className="absolute bottom-4 left-4 text-white">
      <h3 className="text-xl font-bold leading-tight drop-shadow-md line-clamp-2">
        {course.title}
      </h3>
    </div>
  </div>

  {/* Content */}
  <div className="p-5 flex flex-col gap-4 flex-1">
    <p className="text-sm font-medium text-muted-foreground dark:text-slate-400 line-clamp-2">
      {course.description || t("teacherCourses.noDescriptionProvided", { defaultValue: "No description provided" })}
    </p>

    <div className="h-px w-full bg-border dark:bg-slate-700" />

    {/* Stats */}
    <div className="grid grid-cols-2 gap-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-muted-foreground dark:text-slate-400" />
        <span className="text-sm font-medium text-foreground dark:text-slate-200">
          {course.studentCount || 0} {t("students")}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {course.isPublished ? (
          <>
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            <span className="text-sm font-bold text-green-600 dark:text-green-400">
              {t("published")}
            </span>
          </>
        ) : (
          <>
            <Lock className="h-5 w-5 text-gold" />
            <span className="text-sm font-bold text-gold">
              {t("draft")}
            </span>
          </>
        )}
      </div>
    </div>

    {/* Actions */}
    <div className="mt-auto pt-2 flex gap-2">
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          setLocation(`/teacher/courses/${course.id}`);
        }}
        className="flex-1 h-9 rounded-lg bg-gold/10 hover:bg-gold hover:text-navy-dark text-gold font-bold transition-all"
      >
        {t("teacherCourses.viewClass", { defaultValue: "View Class" })}
      </Button>

      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          handleTogglePublish(course.id, course.isPublished);
        }}
        className="h-9 w-9 p-0"
      >
        {course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </Button>
    </div>
  </div>
</article>

                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("teacherCourses.deleteDialogTitle", { defaultValue: "Are you sure?" })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("teacherCourses.deleteDialogDescription", {
                defaultValue: "This will permanently delete the course \"{{title}}\" and all its associated lessons and enrollments. This action cannot be undone.",
                title: courseToDelete?.title ?? "",
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.actions.cancel", { ns: "common", defaultValue: "Cancel" })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteCourse}
              className="bg-red-600 hover:bg-red-700"
            >
              {t("teacherCourses.deleteCourse", { defaultValue: "Delete Course" })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TeacherLayout>
  );
}
