import { useState, useEffect, useMemo, useCallback, lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { LazyMotion, domAnimation, m, useReducedMotion } from "framer-motion";
import { 
  BookOpen, Calendar, Flame,
  FlaskConical, FileEdit, Calculator, BookOpenCheck,
  CheckCircle2, Circle, Megaphone, FileText,
  ArrowRight, MoreHorizontal
} from "lucide-react";

import { DashboardStatsSkeleton } from "@/components/skeletons/DashboardStatsSkeleton";
import { CardSkeleton } from "@/components/skeletons/CardSkeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useStudentNotifications } from "@/contexts/StudentNotificationContext";
import { apiEndpoint } from '@/lib/config';
import {
  premiumCardVariants,
  premiumEnterVariants,
  premiumMotionDurations,
  premiumMotionEase,
  premiumMotionSpring,
  premiumStaggerVariants
} from '@/lib/animations';

const VersaFloatingChat = lazy(() => import("@/components/VersaFloatingChat"));

interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  status: string;
  imageUrl?: string | null;
}

interface Enrollment {
  courseId: string;
  course: Course;
}

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

interface Assignment {
  id: string;
  title: string;
  dueDate: string;
  courseId: string;
  courseName?: string;
  status?: 'pending' | 'submitted' | 'graded';
  priority?: 'high' | 'medium' | 'low';
}

export default function StudentDashboard() {
  const { t } = useTranslation('dashboard');
  const { user, token, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { checkProgressNudges } = useStudentNotifications();
  const prefersReducedMotion = useReducedMotion();
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessonsCount, setLessonsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, number>>({});
  const [overallProgress, setOverallProgress] = useState({
    totalScore: 0,
    totalMaxScore: 0,
    progressPercentage: 0,
    totalBonusPoints: 0,
    assignmentsCompleted: 0,
    totalAssignments: 0,
  });
  const [streakInfo, setStreakInfo] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalActiveDays: 0,
    weeklyGoalHours: 10,
    currentWeekHours: 0,
    weeklyProgress: 0,
  });
  const [showGoalDialog, setShowGoalDialog] = useState(false);
  const [weeklyGoal, setWeeklyGoal] = useState(10);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) {
      fetchDashboardData();
    }
  }, [authLoading, token]);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // Parallelize all API calls for better performance
      const [enrollmentsRes, progressOverallRes, progressCoursesRes, streakRes] = await Promise.all([
        fetch(apiEndpoint("/api/enrollments/student"), {
          headers: authHeaders,
          credentials: "include",
        }),
        fetch(apiEndpoint("/api/progress/overall"), {
          headers: authHeaders,
          credentials: "include",
        }).catch(() => null),
        fetch(apiEndpoint("/api/progress/courses"), {
          headers: authHeaders,
          credentials: "include",
        }).catch(() => null),
        fetch(apiEndpoint("/api/streaks/me"), {
          headers: authHeaders,
          credentials: "include",
        }).catch(() => null),
      ]);

      if (!enrollmentsRes.ok) {
        throw new Error("Failed to fetch enrolled courses");
      }

      const enrollmentsData = await enrollmentsRes.json();
      const enrollmentsList = Array.isArray(enrollmentsData) ? enrollmentsData : [];
      
      // Extract courses from enrollments
      const enrolledCourses: Course[] = enrollmentsList
        .filter((e: any) => e.course)
        .map((e: any) => ({
          id: e.course.id,
          title: e.course.title,
          description: e.course.description,
          teacherId: e.course.teacherId,
          status: e.course.isPublished ? 'published' : 'draft',
          imageUrl: e.course.imageUrl,
        }));

      const prioritizedCourses = enrolledCourses.slice(0, 3);

      // Set enrollments state
      setEnrollments(enrollmentsList.map((e: any) => ({
        courseId: e.courseId,
        course: e.course
      })));

      // Parallelize top courses first to reduce dashboard request fan-out
      // and improve first paint responsiveness.
      // Remaining course details can be loaded on-demand from their dedicated pages.
      const announcementPromises = prioritizedCourses.map(course =>
        fetch(apiEndpoint(`/api/announcements/course/${course.id}`), {
          headers: authHeaders,
          credentials: "include",
        })
          .then(res => res.ok ? res.json() : null)
          .then(data => ({
            courseTitle: course.title,
            announcements: data?.announcements || [],
          }))
          .catch(() => ({ courseTitle: course.title, announcements: [] }))
      );

      const assignmentPromises = prioritizedCourses.map(course =>
        fetch(apiEndpoint(`/api/assignments/courses/${course.id}/assignments`), {
          headers: authHeaders,
          credentials: "include",
        })
          .then(res => res.ok ? res.json() : [])
          .then(assignments => ({
            courseId: course.id,
            courseTitle: course.title,
            assignments: Array.isArray(assignments) ? assignments : [],
          }))
          .catch(() => ({ courseId: course.id, courseTitle: course.title, assignments: [] }))
      );

      const lessonsPromises = prioritizedCourses.map(course =>
        fetch(apiEndpoint(`/api/lessons/course/${course.id}`), {
          headers: authHeaders,
          credentials: "include",
        })
          .then(res => res.ok ? res.json() : { lessons: [] })
          .then(data => data.lessons?.length || 0)
          .catch(() => 0)
      );

      // Fetch progress and streak data in parallel
      const [announcementResults, assignmentResults, lessonCounts] = await Promise.all([
        Promise.all(announcementPromises),
        Promise.all(assignmentPromises),
        Promise.all(lessonsPromises),
      ]);

      // Process announcements
      const allAnnouncements: Announcement[] = [];
      announcementResults.forEach(result => {
        result.announcements.forEach((announcement: Announcement) => {
          allAnnouncements.push({
            ...announcement,
            courseName: result.courseTitle,
          });
        });
      });

      allAnnouncements.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      setAnnouncements(allAnnouncements.slice(0, 5));

      // Process assignments - simplified without checking submissions for faster load
      const allAssignments: Assignment[] = [];
      assignmentResults.forEach(result => {
        result.assignments.forEach((assignment: any) => {
          const dueTime = new Date(assignment.dueDate).getTime();
          const now = Date.now();
          allAssignments.push({
            id: assignment.id,
            title: assignment.title,
            dueDate: assignment.dueDate,
            courseId: result.courseId,
            courseName: result.courseTitle,
            status: 'pending',
            priority: dueTime - now < 86400000 * 2 ? 'high' : 'medium'
          });
        });
      });

      allAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAssignments(allAssignments.slice(0, 4));

      // Set lessons count
      const totalLessons = lessonCounts.reduce((sum, count) => sum + count, 0);
      setLessonsCount(totalLessons);

      // Handle progress data if available
      let nextOverall = overallProgress;
      if (progressOverallRes?.ok) {
        const overallData = await progressOverallRes.json();
        nextOverall = {
          totalScore: overallData.totalScore ?? 0,
          totalMaxScore: overallData.totalMaxScore ?? 0,
          progressPercentage: overallData.progressPercentage ?? 0,
          totalBonusPoints: overallData.totalBonusPoints ?? 0,
          assignmentsCompleted: overallData.assignmentsCompleted ?? 0,
          totalAssignments: overallData.totalAssignments ?? 0,
        };
        setOverallProgress(nextOverall);
      }
      if (progressCoursesRes?.ok) {
        const coursesData = await progressCoursesRes.json();
        const progress: Record<string, number> = {};
        (Array.isArray(coursesData) ? coursesData : []).forEach((cp: any) => {
          if (cp?.courseId != null) progress[cp.courseId] = cp.progressPercentage ?? 0;
        });
        setCourseProgress(progress);
      }

      // Handle streak data if available
      if (streakRes?.ok) {
        const streakData = await streakRes.json();
        const nextStreak = {
          currentStreak: streakData.currentStreak ?? 0,
          longestStreak: streakData.longestStreak ?? 0,
          totalActiveDays: streakData.totalActiveDays ?? 0,
          weeklyGoalHours: streakData.weeklyGoalHours ?? 10,
          currentWeekHours: streakData.currentWeekHours ?? 0,
          weeklyProgress: streakData.weeklyProgress ?? 0,
        };
        setStreakInfo(nextStreak);
        checkWeeklyGoalPrompt(streakData);
        checkProgressNudges(nextOverall, nextStreak, enrollmentsList);
      }

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
  }, [getAuthHeaders, toast]);

  const checkWeeklyGoalPrompt = useCallback((streakData: any) => {
    const lastPrompted = localStorage.getItem('lastWeeklyGoalPrompt');
    const today = new Date();
    const isMonday = today.getDay() === 1;
    
    // Prompt if it's Monday and we haven't prompted this week
    if (isMonday && (!lastPrompted || isNewWeek(lastPrompted))) {
      setWeeklyGoal(streakData.weeklyGoalHours || 10);
      setTimeout(() => setShowGoalDialog(true), 1500);
    }
  }, []);

  const isNewWeek = (lastPromptDate: string): boolean => {
    const last = new Date(lastPromptDate);
    const today = new Date();
    
    // Get Monday of last prompt week
    const lastMonday = new Date(last);
    lastMonday.setDate(last.getDate() - last.getDay() + 1);
    
    // Get Monday of current week
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - today.getDay() + 1);
    
    return thisMonday.getTime() > lastMonday.getTime();
  };

  const handleUpdateGoal = useCallback(async () => {
    try {
      const authHeaders = getAuthHeaders();
      const response = await fetch(apiEndpoint('/api/streaks/weekly-goal'), {
        method: 'PUT',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        credentials: "include",
        body: JSON.stringify({ goalHours: weeklyGoal }),
      });

      if (response.ok) {
        const data = await response.json();
        setStreakInfo(data.streak);
        localStorage.setItem('lastWeeklyGoalPrompt', new Date().toISOString());
        setShowGoalDialog(false);
        toast({
          title: t('goalUpdated'),
          description: t('goalUpdatedDesc', { hours: weeklyGoal }),
        });
      }
    } catch (error) {
      console.error('Failed to update weekly goal:', error);
      toast({
        title: t('error'),
        description: t('failedToUpdateGoal'),
        variant: 'destructive',
      });
    }
  }, [getAuthHeaders, weeklyGoal, toast]);

  const getIconForCourse = useCallback((title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('math') || lower.includes('algebra') || lower.includes('calculus')) {
      return Calculator;
    }
    if (lower.includes('science') || lower.includes('chemistry') || lower.includes('physics')) {
      return FlaskConical;
    }
    if (lower.includes('writing') || lower.includes('english') || lower.includes('literature')) {
      return FileEdit;
    }
    return BookOpen;
  }, []);

  const getTaskIcon = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes('lab')) return FlaskConical;
    if (lower.includes('essay') || lower.includes('writing')) return FileEdit;
    if (lower.includes('quiz') || lower.includes('test') || lower.includes('exam')) return Calculator;
    if (lower.includes('reading')) return BookOpenCheck;
    return Circle;
  };

  const getTaskColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-600';
      case 'medium': return 'bg-purple-100 text-purple-600';
      case 'low': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400';
    }
  };

  const formatDueDate = (dueDate: string) => {
    const date = new Date(dueDate);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Due: Today';
    if (diffDays === 1) return 'Due: Tomorrow, ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    if (diffDays < 7) return `Due: In ${diffDays} days`;
    return 'Due: ' + date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const quickActions = useMemo(() => [
    {
      title: t('scanAttendance'),
      description: t('scanAttendanceDesc'),
      icon: CheckCircle2,
      color: 'green' as const,
      onClick: () => setLocation('/student/attendance/scan')
    },
    {
      title: t('myAttendance'),
      description: t('myAttendanceDesc'),
      icon: Calendar,
      color: 'blue' as const,
      onClick: () => setLocation('/student/attendance')
    },
    {
      title: t('viewAnnouncements'),
      description: t('viewAnnouncementsDesc'),
      icon: Megaphone,
      color: 'blue' as const,
      onClick: () => setLocation('/student/announcements'),
      badge: announcements.length > 0 ? `${announcements.length}` : undefined
    },
    {
      title: t('myClasses'),
      description: t('myClassesDesc'),
      icon: BookOpen,
      color: 'green' as const,
      onClick: () => setLocation('/student/courses')
    },
    {
      title: t('lessons'),
      description: t('lessonsDesc'),
      icon: FileText,
      color: 'purple' as const,
      onClick: () => setLocation('/student/courses')
    },
    {
      title: t('viewSchedule'),
      description: t('viewScheduleDesc'),
      icon: Calendar,
      color: 'orange' as const,
      onClick: () => setLocation('/student/courses')
    }
  ], [t, announcements.length, setLocation]);

  // Use the overall progress from API (calculated from total scores / total max scores)
  const displayProgress = useMemo(() => Math.round(overallProgress.progressPercentage), [overallProgress.progressPercentage]);
  const dashboardPulseCopy = useMemo(
    () => `${assignments.length} ${t('pending').toLowerCase()} · ${announcements.length} updates`,
    [assignments.length, announcements.length, t]
  );

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50 dark:bg-[#0a192f] scroll-smooth">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-6">
          <section className="premium-page-header">
            <div className="h-6 w-48 rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse mb-3" />
            <div className="h-4 w-80 max-w-full rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse" />
          </section>
          <section>
            <DashboardStatsSkeleton />
          </section>
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">{t('myCourses')}</h2>
            <CardSkeleton count={3} />
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      <LazyMotion features={domAnimation}>
        <div className="flex-1 overflow-y-auto p-4 md:p-7 no-scrollbar bg-slate-50 dark:bg-[#0a192f] scroll-smooth">
          <m.div
            className="mx-auto flex max-w-[1200px] flex-col gap-5"
            initial={prefersReducedMotion ? false : "hidden"}
            animate="visible"
            variants={premiumStaggerVariants}
          >
            <m.section variants={premiumEnterVariants} className="premium-page-header">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div className="space-y-2">
                  <p className="premium-kpi-label">{t('studentDashboard')}</p>
                  <h1 className="text-2xl font-semibold tracking-tight text-slate-900 md:text-3xl dark:text-white">
                    {t('welcomeBack', { name: user?.fullName?.split(' ')[0] ?? '' })}
                  </h1>
                  <p className="premium-muted">{dashboardPulseCopy}</p>
                </div>
                <div className="flex items-center gap-2.5">
                  <Button onClick={() => setLocation('/student/assignments')} className="h-10 bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-[#FFD700] dark:text-slate-900 dark:hover:bg-yellow-500">
                    {t('viewAssignments')}
                    <m.span
                      className="ml-2 inline-flex"
                      animate={prefersReducedMotion ? undefined : { x: [0, 2, 0] }}
                      transition={prefersReducedMotion ? undefined : { duration: 1.8, repeat: Infinity, ease: premiumMotionEase }}
                    >
                      <ArrowRight className="h-4 w-4" />
                    </m.span>
                  </Button>
                  <Button variant="outline" onClick={() => setLocation('/student/courses')} className="h-10 border-slate-300 px-4 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-[#233554]">
                    {t('myCourses')}
                  </Button>
                </div>
              </div>
            </m.section>

            <m.section variants={premiumEnterVariants} className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <m.article className="premium-surface premium-surface-interactive p-5" whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"} variants={premiumCardVariants}>
                <p className="premium-kpi-label">{t('overallProgress')}</p>
                <p className="premium-kpi-value mt-1.5">{displayProgress}%</p>
                <div className="mt-3">
                  <Progress value={displayProgress} className="h-2 bg-slate-200 dark:bg-[#233554]" indicatorClassName="bg-slate-900 dark:bg-[#FFD700]" />
                </div>
              </m.article>
              <m.article className="premium-surface premium-surface-interactive p-5" whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"} variants={premiumCardVariants}>
                <p className="premium-kpi-label">{t('weeklyStudyTime')}</p>
                <p className="premium-kpi-value mt-1.5">{streakInfo.currentWeekHours}h</p>
                <p className="premium-muted mt-1.5">{streakInfo.weeklyGoalHours}h goal</p>
              </m.article>
              <m.article className="premium-surface premium-surface-interactive p-5" whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"} variants={premiumCardVariants}>
                <p className="premium-kpi-label">{t('myCourses')}</p>
                <p className="premium-kpi-value mt-1.5">{enrollments.length}</p>
                  <p className="premium-muted mt-1.5">{lessonsCount} {t('lessons').toLowerCase()}</p>
              </m.article>
              <m.article className="premium-surface premium-surface-interactive p-5" whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"} variants={premiumCardVariants}>
                <p className="premium-kpi-label">{t('upcomingDueDates')}</p>
                <p className="premium-kpi-value mt-1.5">{assignments.length}</p>
                <p className="premium-muted mt-1.5">{t('pending')}</p>
              </m.article>
            </m.section>

            <m.section variants={premiumEnterVariants} className="flex flex-col gap-3">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{t('quickActions')}</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-3.5 lg:grid-cols-6">
                {quickActions.map((action, index) => {
                  const Icon = action.icon;
                  const iconColorMap = {
                    green: 'text-emerald-600 dark:text-emerald-400',
                    blue: 'text-blue-600 dark:text-blue-400',
                    purple: 'text-purple-600 dark:text-purple-400',
                    orange: 'text-orange-600 dark:text-orange-400',
                  };
                  const iconColor = iconColorMap[action.color] || iconColorMap.green;
                  return (
                    <m.button
                      key={action.title}
                      type="button"
                      onClick={action.onClick}
                      className="premium-surface-interactive group min-h-[96px] px-3 py-3.5 text-left text-slate-900 dark:text-white"
                      variants={premiumCardVariants}
                      initial={prefersReducedMotion ? false : "hidden"}
                      animate="visible"
                      whileHover={prefersReducedMotion ? undefined : "hover"}
                      whileTap={prefersReducedMotion ? undefined : "tap"}
                      transition={prefersReducedMotion ? undefined : { ...premiumMotionSpring, delay: index * 0.03 }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="premium-icon-shell">
                          <Icon className={`h-5 w-5 ${iconColor}`} />
                        </div>
                        {action.badge != null && (
                          <span className="min-w-[18px] rounded-full bg-[#FFD700] px-1.5 text-[10px] font-bold leading-5 text-slate-900">
                            {action.badge}
                          </span>
                        )}
                      </div>
                      <span className="mt-2.5 line-clamp-1 text-sm font-semibold">{action.title}</span>
                      {action.description && (
                        <span className="mt-0.5 line-clamp-1 text-xs text-slate-500 transition-colors duration-200 group-hover:text-slate-700 dark:text-slate-400 dark:group-hover:text-slate-300">{action.description}</span>
                      )}
                    </m.button>
                  );
                })}
              </div>
            </m.section>

            <m.div variants={premiumEnterVariants} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <div className="space-y-5 lg:col-span-2">
                <section className="premium-surface p-5 md:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{t('myCourses')}</h2>
                    <Button variant="link" onClick={() => setLocation('/student/courses')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">{t('viewAll')}</Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {enrollments.slice(0, 3).map((enrollment, index) => {
                      const Icon = getIconForCourse(enrollment.course.title);
                      const progress = courseProgress[enrollment.courseId] || 0;
                      return (
                        <m.div
                          key={enrollment.courseId}
                          className="premium-surface-interactive overflow-hidden cursor-pointer group relative"
                          variants={premiumCardVariants}
                          initial={prefersReducedMotion ? false : "hidden"}
                          animate="visible"
                          whileHover={prefersReducedMotion ? undefined : "hover"}
                          whileTap={prefersReducedMotion ? undefined : "tap"}
                          transition={prefersReducedMotion ? undefined : { delay: index * 0.04, duration: premiumMotionDurations.standard }}
                          onClick={() => setLocation(`/student/courses/${enrollment.courseId}`)}
                        >
                          <div className="h-36 relative overflow-hidden">
                            {enrollment.course.imageUrl ? (
                              <m.img
                                src={enrollment.course.imageUrl}
                                alt={enrollment.course.title}
                                className="w-full h-full object-cover"
                                whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
                                transition={{ duration: premiumMotionDurations.standard }}
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#112240] dark:to-[#0a192f] flex items-center justify-center">
                                <div className="w-16 h-16 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                  <Icon className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                                </div>
                              </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent"></div>
                          </div>
                          <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="line-clamp-1 flex-1 text-base font-semibold text-slate-900 dark:text-white">{enrollment.course.title}</h3>
                              <MoreHorizontal className="ml-2 h-4 w-4 text-slate-400" />
                            </div>
                            <p className="mb-3 line-clamp-2 text-sm text-slate-600 dark:text-slate-400">{enrollment.course.description}</p>
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                <span>{t('progress')}</span>
                                <span>{Math.round(progress)}%</span>
                              </div>
                              <Progress value={progress} className="h-1.5 bg-slate-200 dark:bg-[#233554]" indicatorClassName="bg-slate-900 dark:bg-[#FFD700]" />
                            </div>
                          </div>
                        </m.div>
                      );
                    })}
                    {enrollments.length === 0 && (
                      <div className="col-span-3 text-center py-8 text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-[#112240]/80 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        {t('noClassesEnrolledYet')}
                      </div>
                    )}
                  </div>
                </section>

                <section className="premium-surface p-5 md:p-6">
                  <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-white">{t('upcomingDueDates')}</h2>
                  <div className="space-y-2.5">
                    {assignments.slice(0, 3).map((assignment, index) => {
                      const TaskIcon = getTaskIcon(assignment.title);
                      return (
                        <m.div
                          key={assignment.id}
                          className="premium-surface-interactive group flex items-center justify-between p-3.5"
                          variants={premiumCardVariants}
                          initial={prefersReducedMotion ? false : "hidden"}
                          animate="visible"
                          whileHover={prefersReducedMotion ? undefined : "hover"}
                          whileTap={prefersReducedMotion ? undefined : "tap"}
                          transition={{ delay: index * 0.03 }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`premium-icon-shell ${getTaskColor(assignment.priority || 'medium')} bg-opacity-20`}>
                              <TaskIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <h4 className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{assignment.title}</h4>
                              <p className="text-xs text-slate-600 dark:text-slate-400">{assignment.courseName} - {formatDueDate(assignment.dueDate)}</p>
                            </div>
                          </div>
                          <Button onClick={() => setLocation('/student/assignments')} size="sm" variant={assignment.status === 'submitted' ? "outline" : "default"} className={assignment.status === 'submitted' ? "h-8 border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300" : "h-8 bg-slate-900 text-white hover:bg-slate-800 dark:bg-[#FFD700] dark:text-slate-900 dark:hover:bg-yellow-500"}>
                            {assignment.status === 'submitted' ? t('view') : t('start')}
                          </Button>
                        </m.div>
                      );
                    })}
                    {assignments.length === 0 && (
                      <div className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#112240]/30 rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed">
                        {t('noUpcomingAssignments')}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              <div className="space-y-5">
                <m.div className="premium-surface premium-surface-interactive p-5" variants={premiumCardVariants} whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"}>
                  <h3 className="font-semibold text-slate-900 dark:text-white">{t('weeklyStudyTime')}</h3>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">{streakInfo.currentWeekHours}h</p>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{streakInfo.weeklyGoalHours}h goal</p>
                  </div>
                  <Progress value={Math.min(100, streakInfo.weeklyProgress)} className="mt-3 h-2 bg-slate-200 dark:bg-[#233554]" indicatorClassName="bg-slate-900 dark:bg-[#FFD700]" />
                </m.div>

                <m.div className="premium-surface p-5" variants={premiumCardVariants}>
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{t('recentAssignments')}</h3>
                  <div className="space-y-2.5">
                    {assignments.slice(0, 3).map((assignment, i) => (
                      <m.div key={i} className="flex items-center justify-between rounded-xl px-1 py-1.5" whileHover={prefersReducedMotion ? undefined : { x: 2 }} transition={{ duration: premiumMotionDurations.quick }}>
                        <div className="flex items-center gap-3">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold ${i % 2 === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}>
                            {assignment.title.charAt(0)}
                          </div>
                          <div>
                            <p className="line-clamp-1 font-medium text-sm text-slate-900 dark:text-white">{assignment.title}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{assignment.courseName}</p>
                          </div>
                        </div>
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">{assignment.status === 'graded' ? '95%' : t('pending')}</p>
                      </m.div>
                    ))}
                    {assignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">{t('noRecentAssignments')}</p>}
                  </div>
                </m.div>

                <m.div className="premium-surface p-5" variants={premiumCardVariants}>
                  <h3 className="mb-3 font-semibold text-slate-900 dark:text-white">Activity Feed</h3>
                  <div className="space-y-2.5">
                    {announcements.slice(0, 3).map((announcement) => (
                      <m.div key={announcement.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700" whileHover={prefersReducedMotion ? undefined : { y: -1 }} transition={{ duration: premiumMotionDurations.quick }}>
                        <p className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">{announcement.title}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{announcement.content}</p>
                      </m.div>
                    ))}
                    {announcements.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500 dark:border-slate-600 dark:text-slate-400">
                        No recent announcements.
                      </div>
                    )}
                  </div>
                </m.div>

                <m.div className="premium-surface premium-surface-interactive flex items-center justify-between p-5" variants={premiumCardVariants} whileHover={prefersReducedMotion ? undefined : "hover"} whileTap={prefersReducedMotion ? undefined : "tap"}>
                  <div>
                    <p className="premium-kpi-label">{t('dayStreak')}</p>
                    <p className="premium-kpi-value">{streakInfo.currentStreak}</p>
                  </div>
                  <m.div
                    className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/25"
                    animate={prefersReducedMotion ? undefined : { scale: [1, 1.04, 1] }}
                    transition={prefersReducedMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Flame className="h-5 w-5 text-orange-500" />
                  </m.div>
                </m.div>
              </div>
            </m.div>
          </m.div>
        </div>
      </LazyMotion>

        {/* Dialogs and Chat */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
             <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#112240] text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle>{t('setWeeklyGoal')}</DialogTitle>
                    <DialogDescription className="text-slate-600 dark:text-slate-400">
                    How many hours do you want to study this week? Setting a goal helps you stay motivated!
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="goal" className="text-right">
                        Hours
                    </Label>
                    <Input
                        id="goal"
                        type="number"
                        min="1"
                        max="168"
                        value={weeklyGoal}
                        onChange={(e) => setWeeklyGoal(parseInt(e.target.value) || 10)}
                        className="col-span-3 bg-slate-100 dark:bg-[#233554] border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white"
                    />
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400 px-1">
                    Tip: Start with a realistic goal like 5-15 hours per week
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => setShowGoalDialog(false)} className="border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#233554] hover:text-slate-900 dark:hover:text-white">
                    Skip
                    </Button>
                    <Button onClick={handleUpdateGoal} className="bg-[#FFD700] text-slate-900 hover:bg-yellow-500">
                    Set Goal
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        <Suspense fallback={null}><VersaFloatingChat /></Suspense>
    </>
  );
}





