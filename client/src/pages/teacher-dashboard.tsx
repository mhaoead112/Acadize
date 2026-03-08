import { useState, useEffect, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, Link } from "wouter";
import { 
  BookOpen, Clock, Users, FileText, Calendar,
  TrendingUp, Bell, Plus
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { DashboardStatsSkeleton } from "@/components/skeletons/DashboardStatsSkeleton";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";

const VersaFloatingChat = lazy(() => import("@/components/VersaFloatingChat"));

interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  status: string;
}

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  courseId: string;
  courseName?: string;
  submissionsCount?: number;
  totalStudents?: number;
}

interface ScheduleEvent {
  id: string;
  title: string;
  time: string;
  course: string;
}

export default function TeacherDashboard() {
  const { t } = useTranslation('teacher');
  const { user, getAuthHeaders, token, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    pendingGrading: 0,
    activeStudents: 0,
  });
  
  const [scheduleEvents] = useState<ScheduleEvent[]>([
    { id: '1', title: 'Physics - Section A', time: '9:00 AM', course: 'PHY-101' },
    { id: '2', title: 'Advanced Calculus', time: '11:30 AM', course: 'MAT-201' },
    { id: '3', title: 'Organic Chemistry', time: '2:00 PM', course: 'CHM-305' }
  ]);

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchDashboardData();
    }
  }, [token, isAuthenticated]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // Fetch teacher's OWN courses only (using /user endpoint for teacher's courses)
      const coursesRes = await fetch(apiEndpoint("/api/courses/user"), {
        headers: authHeaders,
      });

      if (!coursesRes.ok) {
        throw new Error("Failed to fetch courses");
      }

      const coursesData = await coursesRes.json();
      const allCourses = Array.isArray(coursesData) ? coursesData : [];
      setCourses(allCourses);

      // Fetch assignments and calculate stats
      const allAssignments: Assignment[] = [];
      const uniqueStudentIds = new Set<string>();
      let pendingGrading = 0;

      for (const course of allCourses) {
        // Fetch enrollments to count students
        try {
          const enrollmentsRes = await fetch(
            apiEndpoint(`/api/enrollments/course/${course.id}`),
            { headers: authHeaders }
          );
          if (enrollmentsRes.ok) {
            const enrollmentData = await enrollmentsRes.json();
            if (Array.isArray(enrollmentData)) {
              enrollmentData.forEach((e: any) => {
                if (e.studentId) uniqueStudentIds.add(e.studentId);
              });
            }
          }
        } catch (error) {
          // Silently handle enrollment fetch errors
        }

        try {
          const assignmentsRes = await fetch(
            apiEndpoint(`/api/assignments/courses/${course.id}/assignments`),
            { headers: authHeaders }
          );
          
          if (assignmentsRes.ok) {
            const data = await assignmentsRes.json();
            const courseAssignments = Array.isArray(data) ? data : [];
            
            for (const assignment of courseAssignments) {
              try {
                const submissionsRes = await fetch(
                  apiEndpoint(`/api/assignments/${assignment.id}/submissions`),
                  { headers: authHeaders }
                );
                
                if (submissionsRes.ok) {
                  const submissionData = await submissionsRes.json();
                  const submissions = Array.isArray(submissionData) ? submissionData : 
                                     (submissionData.submissions ? submissionData.submissions : []);
                  const ungradedCount = submissions.filter((s: any) => !s.grade).length;
                  pendingGrading += ungradedCount;
                  
                  allAssignments.push({
                    id: assignment.id,
                    title: assignment.title,
                    dueDate: assignment.dueDate,
                    courseId: course.id,
                    courseName: course.title,
                    submissionsCount: submissions.length,
                    totalStudents: submissions.length,
                  });
                }
              } catch (error) {
                // Silently handle submission fetch errors
              }
            }
          }
        } catch (error) {
          // Silently handle assignment fetch errors
        }
      }

      allAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAssignments(allAssignments.slice(0, 3));

      const totalStudents = uniqueStudentIds.size;
      setStats({
        totalCourses: allCourses.length,
        totalStudents: totalStudents,
        pendingGrading: pendingGrading,
        activeStudents: totalStudents,
      });

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: t('error'),
        description: t('failedToLoadDashboard'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getIconForCourse = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('math') || lower.includes('algebra') || lower.includes('calculus')) {
      return '📐';
    }
    if (lower.includes('science') || lower.includes('chemistry') || lower.includes('physics')) {
      return '🧪';
    }
    if (lower.includes('writing') || lower.includes('english') || lower.includes('literature')) {
      return '✍️';
    }
    if (lower.includes('history')) {
      return '📜';
    }
    return '📚';
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-4 bg-slate-50 dark:bg-navy-dark">
          <div className="max-w-6xl mx-auto space-y-8">
            <DashboardStatsSkeleton />
            <section className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('myCourses')}
              </h2>
              <CardSkeleton count={3} />
            </section>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-4 bg-slate-50 dark:bg-navy-dark">
        <header className="sticky top-0 z-10 py-6 bg-slate-50 dark:bg-navy-dark transition-colors duration-300">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-navy dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                {t('welcomeBack', { name: user?.fullName || 'Teacher' })}
              </h1>
              <p className="text-muted-foreground dark:text-slate-400 text-base font-normal leading-normal">
                {t('heresWhatsHappening')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                onClick={() => setLocation('/teacher/assignments')}
                className="flex items-center gap-2 bg-navy hover:bg-navy-light dark:bg-gold dark:hover:bg-gold-light text-white dark:text-navy px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Plus className="h-5 w-5" />
                {t('createAssignment')}
              </Button>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-normal">{t('activeClasses')}</p>
<div className="p-2 rounded-lg bg-navy/10 dark:bg-gold/10">
  <BookOpen className="h-5 w-5 text-navy dark:text-gold" />
</div>
            </div>
            <p className="text-navy dark:text-white tracking-tight text-3xl font-bold leading-tight">
              {stats.totalCourses}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-normal">{t('totalStudents')}</p>
              <Users className="h-5 w-5 text-navy dark:text-gold" />
            </div>
            <p className="text-navy dark:text-white tracking-tight text-3xl font-bold leading-tight">
              {stats.totalStudents}
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden transition-colors duration-300">
            <div className="absolute right-0 top-0 p-5 opacity-5">
              <Clock className="h-20 w-20" />
            </div>
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-normal">{t('pendingGrading')}</p>
              <Clock className="h-5 w-5 text-gold" />
            </div>
            <p className="text-navy dark:text-white tracking-tight text-3xl font-bold leading-tight">
              {stats.pendingGrading}
            </p>
            {stats.pendingGrading > 0 && (
              <p className="text-xs text-gold font-bold">{t('needsAttention')}</p>
            )}
          </div>

          <div className="flex flex-col gap-2 rounded-xl p-5 border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 shadow-sm transition-colors duration-300">
            <div className="flex justify-between items-start">
              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium leading-normal">{t('unreadMessages')}</p>
              <Bell className="h-5 w-5 text-navy dark:text-gold" />
            </div>
            <p className="text-navy dark:text-white tracking-tight text-3xl font-bold leading-tight">5</p>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Active Classes Section - Takes 2 columns */}
          <div className="xl:col-span-2 flex flex-col gap-8">
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-navy dark:text-white text-[20px] font-bold leading-tight tracking-[-0.015em]">
                  {t('activeClasses')}
                </h2>
                <Link href="/teacher/courses" className="text-navy dark:text-gold text-sm font-medium hover:underline">
                  {t('viewAll')}
                </Link>
              </div>

              {courses.length === 0 ? (
                <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-12 text-center transition-colors duration-300">
                  <BookOpen className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    {t('noCoursesYet')}
                  </p>
                  <Button onClick={() => setLocation('/teacher/courses/create')}>
                    {t('createClass')}
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {courses.slice(0, 4).map((course) => {
                    const emoji = getIconForCourse(course.title);
                    
                    return (
                      <Link key={course.id} href={`/teacher/courses/${course.id}`} className="block">
                        <div className="flex flex-col gap-3 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-4 shadow-sm hover:shadow-md transition-all cursor-pointer group">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-200 to-teal-300 flex items-center justify-center text-2xl flex-shrink-0">
                              {emoji}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-navy dark:text-white text-base leading-tight group-hover:text-emerald-600 transition-colors truncate">
                                {course.title}
                              </h3>
                              <p className="text-sm text-slate-500 dark:text-gray-400">
                                {course.status === 'published' ? t('published') : t('draft')}
                              </p>
                            </div>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-gray-400 line-clamp-2">
                            {course.description || t('noDescriptionAvailable')}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent Assignments Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-navy dark:text-white text-[20px] font-bold leading-tight tracking-[-0.015em]">
                  {t('upcomingAssignments')}
                </h2>
                <Link href="/teacher/assignments" className="text-navy dark:text-gold text-sm font-medium hover:underline">
                  {t('viewAll')}
                </Link>
              </div>

              <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 shadow-sm overflow-hidden transition-colors duration-300">
                {assignments.length === 0 ? (
                  <div className="p-12 text-center">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-600 dark:text-gray-400">No assignments yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-gray-800">
                    {assignments.map((assignment) => {
                      const dueDate = new Date(assignment.dueDate);
                      const now = new Date();
                      const diffTime = dueDate.getTime() - now.getTime();
                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                      
                      let dueDateText = '';
                      if (diffDays === 0) dueDateText = 'Due Today';
                      else if (diffDays === 1) dueDateText = 'Due Tomorrow';
                      else if (diffDays < 7) dueDateText = `Due in ${diffDays} days`;
                      else dueDateText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                      
                      return (
                        <div 
                          key={assignment.id}
                          onClick={() => setLocation(`/teacher/assignments/${assignment.id}`)}
                          className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-navy transition-colors cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm text-navy dark:text-white truncate">
                              {assignment.title}
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-gray-400">
                              {assignment.courseName}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge 
                              variant={diffDays <= 1 ? 'destructive' : 'secondary'}
                              className="text-xs"
                            >
                              {dueDateText}
                            </Badge>
                            {assignment.submissionsCount !== undefined && assignment.totalStudents !== undefined && (
                              <span className="text-xs text-slate-500 dark:text-gray-400">
                                {assignment.submissionsCount}/{assignment.totalStudents} submitted
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar - Takes 1 column */}
          <div className="flex flex-col gap-6">
            {/* Upcoming Schedule */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-5 shadow-sm transition-colors duration-300">
              <h3 className="text-navy dark:text-white text-lg font-bold leading-tight mb-4">
                {t('upcomingSchedule')}
              </h3>
              <div className="flex flex-col gap-4">
                {scheduleEvents.map((event) => (
                  <div key={event.id} className="flex gap-3">
                    <div className="flex flex-col items-center justify-center bg-navy dark:bg-gold rounded-lg p-2 min-w-[48px]">
                      <span className="text-white dark:text-navy text-xs font-bold">
                        {event.time.split(' ')[1]}
                      </span>
                      <span className="text-white dark:text-navy text-[10px]">
                        {event.time.split(' ')[0]}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-navy dark:text-white">
                        {event.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-gray-400">
                        {event.course}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full mt-5 py-2 text-sm text-navy dark:text-gold font-medium hover:bg-navy/5 dark:hover:bg-gold/5 rounded-lg transition-colors">
                View Full Calendar
              </button>
            </div>

            {/* Quick Announcements */}
            <div className="rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-slate-800 p-5 shadow-sm flex flex-col flex-1 transition-colors duration-300">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-navy dark:text-white text-lg font-bold leading-tight">
                  Announcements
                </h3>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setLocation('/teacher/courses')}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                    <Bell className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy dark:text-white">
                      New assignment submissions
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      2 hours ago
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 pb-3 border-b border-slate-100 dark:border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
                    <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy dark:text-white">
                      3 new students enrolled
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      Yesterday
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-navy dark:text-white">
                      Faculty meeting tomorrow
                    </p>
                    <p className="text-xs text-slate-500 dark:text-gray-400">
                      3 days ago
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Suspense fallback={null}><VersaFloatingChat /></Suspense>
    </TeacherLayout>
  );
}

