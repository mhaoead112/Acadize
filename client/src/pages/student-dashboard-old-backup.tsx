import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { 
  BookOpen, Clock, Download, Video, Sparkles,
  FlaskConical, FileEdit, Calculator, BookOpenCheck,
  Loader2, CheckCircle2, Circle, Megaphone, FileText, Calendar, Flame,
  ArrowRight, MoreHorizontal, Trophy, Target, Zap
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import VersaFloatingChat from "@/components/VersaFloatingChat";
import { apiEndpoint, assetUrl } from '@/lib/config';
import {
  pageVariants,
  staggerContainer,
  staggerContainerFast,
  fadeInUpVariants,
  glowCardVariants,
  buttonVariants,
  progressBarVariants,
  pulseVariants,
  springConfigs
} from '@/lib/animations';

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
  const { user, token, isLoading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
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

  const getAuthHeaders = (): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!authLoading && token) {
      fetchDashboardData();
    }
  }, [authLoading, token]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const authHeaders = getAuthHeaders();

      // Fetch enrolled courses for the student using enrollments API
      const enrollmentsRes = await fetch(apiEndpoint("/api/enrollments/student"), {
        headers: authHeaders,
        credentials: "include",
      });

      if (!enrollmentsRes.ok) {
        throw new Error("Failed to fetch enrolled courses");
      }

      const enrollmentsData = await enrollmentsRes.json();
      console.log('enrollmentsData:', enrollmentsData);
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

      // Set enrollments state
      setEnrollments(enrollmentsList.map((e: any) => ({
        courseId: e.courseId,
        course: e.course
      })));

      // Fetch announcements only for enrolled courses
      const allAnnouncements: Announcement[] = [];
      for (const course of enrolledCourses) {
        try {
          const announcementsRes = await fetch(
            apiEndpoint(`/api/announcements/course/${course.id}`),
            { headers: authHeaders, credentials: "include" }
          );

          if (announcementsRes.ok) {
            const data = await announcementsRes.json();
            const courseAnnouncements = Array.isArray(data.announcements) ? data.announcements : [];
            
            courseAnnouncements.forEach((announcement: Announcement) => {
              allAnnouncements.push({
                ...announcement,
                courseName: course.title,
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

      setAnnouncements(allAnnouncements.slice(0, 5)); // Limit to 5 most recent

      // Fetch assignments only for enrolled courses
      const allAssignments: Assignment[] = [];
      for (const course of enrolledCourses) {
        try {
          const assignmentsRes = await fetch(
            apiEndpoint(`/api/assignments/courses/${course.id}/assignments`),
            { headers: authHeaders, credentials: "include" }
          );
          if (assignmentsRes.ok) {
            const data = await assignmentsRes.json();
            const courseAssignments = Array.isArray(data) ? data : [];
            
            // Fetch student's submissions to check completion status
            for (const assignment of courseAssignments) {
              try {
                const submissionRes = await fetch(
                  apiEndpoint(`/api/assignments/${assignment.id}/my-submission`),
                  { headers: authHeaders, credentials: "include" }
                );
                
                let status: 'pending' | 'submitted' | 'graded' = 'pending';
                if (submissionRes.ok) {
                  const submissionData = await submissionRes.json();
                  if (submissionData.submission) {
                    status = submissionData.grade ? 'graded' : 'submitted';
                  }
                }
                
                allAssignments.push({
                  id: assignment.id,
                  title: assignment.title,
                  dueDate: assignment.dueDate,
                  courseId: course.id,
                  courseName: course.title,
                  status: status,
                  priority: new Date(assignment.dueDate).getTime() - Date.now() < 86400000 * 2 ? 'high' : 'medium'
                });
              } catch (error) {
                console.error(`Failed to fetch submission for assignment ${assignment.id}:`, error);
                allAssignments.push({
                  id: assignment.id,
                  title: assignment.title,
                  dueDate: assignment.dueDate,
                  courseId: course.id,
                  courseName: course.title,
                  status: 'pending',
                  priority: new Date(assignment.dueDate).getTime() - Date.now() < 86400000 * 2 ? 'high' : 'medium'
                });
              }
            }
          }
        } catch (error) {
          console.error(`Failed to fetch assignments for course ${course.id}:`, error);
        }
      }
      
      // Sort by due date
      allAssignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
      setAssignments(allAssignments.slice(0, 4)); // Top 4 upcoming

      // Fetch overall progress
      try {
        const progressRes = await fetch(apiEndpoint('/api/progress/overall'), {
          headers: authHeaders,
          credentials: "include",
        });
        if (progressRes.ok) {
          const progressData = await progressRes.json();
          setOverallProgress(progressData);
        }
      } catch (error) {
        console.error('Failed to fetch overall progress:', error);
      }

      // Fetch course progress
      try {
        const courseProgressRes = await fetch(apiEndpoint('/api/progress/courses'), {
          headers: authHeaders,
          credentials: "include",
        });
        if (courseProgressRes.ok) {
          const courseProgressData = await courseProgressRes.json();
          const progress: Record<string, number> = {};
          courseProgressData.forEach((cp: any) => {
            progress[cp.courseId] = cp.progressPercentage;
          });
          setCourseProgress(progress);
        }
      } catch (error) {
        console.error('Failed to fetch course progress:', error);
      }

      // Fetch streak information
      try {
        const streakRes = await fetch(apiEndpoint('/api/streaks/me'), {
          headers: authHeaders,
          credentials: "include",
        });
        if (streakRes.ok) {
          const streakData = await streakRes.json();
          setStreakInfo(streakData);
          
          // Check if we should prompt for weekly goal (every Monday or if not set)
          checkWeeklyGoalPrompt(streakData);
        }
      } catch (error) {
        console.error('Failed to fetch streak info:', error);
      }

      // Fetch lessons count only for enrolled courses
      let totalLessons = 0;
      for (const course of enrolledCourses) {
        try {
          const lessonsRes = await fetch(
            apiEndpoint(`/api/lessons/course/${course.id}`),
            { headers: authHeaders, credentials: "include" }
          );
          if (lessonsRes.ok) {
            const lessonsData = await lessonsRes.json();
            totalLessons += Array.isArray(lessonsData) ? lessonsData.length : 0;
          }
        } catch (error) {
          console.error(`Failed to fetch lessons for course ${course.id}:`, error);
        }
      }
      setLessons(Array(totalLessons).fill({})); // Just for count

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkWeeklyGoalPrompt = (streakData: any) => {
    const lastPrompted = localStorage.getItem('lastWeeklyGoalPrompt');
    const today = new Date();
    const isMonday = today.getDay() === 1;
    
    // Prompt if it's Monday and we haven't prompted this week
    if (isMonday && (!lastPrompted || isNewWeek(lastPrompted))) {
      setWeeklyGoal(streakData.weeklyGoalHours || 10);
      setTimeout(() => setShowGoalDialog(true), 1500);
    }
  };

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

  const handleUpdateGoal = async () => {
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
          title: 'Goal Updated',
          description: `Your weekly study goal is now ${weeklyGoal} hours`,
        });
      }
    } catch (error) {
      console.error('Failed to update weekly goal:', error);
      toast({
        title: 'Error',
        description: 'Failed to update weekly goal',
        variant: 'destructive',
      });
    }
  };

  const getIconForCourse = (title: string) => {
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
  };

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

  const quickActions = [
    {
      title: 'View Announcements',
      description: 'Check latest updates',
      icon: Megaphone,
      color: 'blue' as const,
      onClick: () => setLocation('/student/announcements'),
      badge: announcements.length > 0 ? `${announcements.length}` : undefined
    },
    {
      title: 'My Classes',
      description: 'Browse your enrolled classes',
      icon: BookOpen,
      color: 'green' as const,
      onClick: () => setLocation('/student/courses')
    },
    {
      title: 'Lessons',
      description: 'Access course materials',
      icon: FileText,
      color: 'purple' as const,
      onClick: () => setLocation('/student/courses')
    },
    {
      title: 'View Schedule',
      description: 'Check upcoming classes',
      icon: Calendar,
      color: 'orange' as const,
      onClick: () => setLocation('/student/courses')
    }
  ];

  // Use the overall progress from API (calculated from total scores / total max scores)
  const displayProgress = Math.round(overallProgress.progressPercentage);

  if (loading) {
    return (
      <StudentLayout>
        <motion.div 
          className="flex-1 flex items-center justify-center bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={springConfigs.smooth}
        >
          <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
        </motion.div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <motion.div 
        className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50 dark:bg-[#0a192f] scroll-smooth"
        initial="initial"
        animate="animate"
        variants={pageVariants}
      >
        <motion.div 
          className="max-w-[1200px] mx-auto flex flex-col gap-8"
          variants={staggerContainer}
        >
          {/* Hero Banner */}
          <motion.div 
            className="rounded-2xl overflow-hidden relative min-h-[240px] flex items-end shadow-xl group"
            variants={fadeInUpVariants}
            whileHover={{ scale: 1.02, boxShadow: '0 25px 50px rgba(255, 215, 0, 0.2)' }}
            transition={springConfigs.gentle}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#001f3f] via-[#112240] to-[#0a192f]"></div>
            <motion.div 
              className="absolute inset-0 bg-cover bg-center" 
              style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDcx_pJ4Z1hxD3m_mTJ9CxPfs9KuPtt7Cf7DnmkdP0Q-xXzSdx9LaB5pst4inEl1kz6trbS-Jlem8_h4UwpHLASQAVJBINjDh2Ky7c5Kk_RZ_w28US2Dyhz2yDAg6noplpCck9vwcc-vGHkZrV7Lak3Poii2nk7ry-3Ts0iGFuMkcy7VybN2ipDZPOvjdvWLjT7l-4KXlzoSOKKf8jPxP-_99z9PAp5j6W797YsUKRBqfpas3CQpZOR8sYEKvd53mgYOqDgp7bnxKg")' }}
              whileHover={{ scale: 1.1 }}
              transition={{ duration: 0.7, ease: "easeOut" }}
            />
            <motion.div 
              className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.2, 0.1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div 
              className="relative z-10 p-8 w-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...springConfigs.gentle, delay: 0.2 }}
            >
              <motion.h1 
                className="text-3xl md:text-4xl font-bold mb-2 text-white"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfigs.gentle, delay: 0.3 }}
              >
                Welcome back, {user?.fullName?.split(' ')[0]}! 
              </motion.h1>
              <motion.p 
                className="text-slate-300 text-lg mb-4"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...springConfigs.gentle, delay: 0.4 }}
              >
                You have <motion.span className="text-[#FFD700] font-bold" whileHover={{ scale: 1.1 }} transition={springConfigs.snappy}>{assignments.length} assignments</motion.span> due soon. Keep up the momentum!
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...springConfigs.gentle, delay: 0.5 }}
              >
                <Button onClick={() => setLocation('/student/assignments')} className="bg-[#FFD700] text-slate-900 hover:bg-yellow-500 rounded-full px-6 py-2 font-semibold transition-all shadow-lg shadow-[#FFD700]/30">
                  View Assignments <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
            variants={staggerContainer}
          >
                {/* Main Column */}
                <motion.div 
                  className="lg:col-span-2 space-y-8"
                  variants={fadeInUpVariants}
                >
                    {/* My Classes */}
                    <motion.section variants={fadeInUpVariants}>
                        <motion.div 
                          className="flex justify-between items-center mb-4"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={springConfigs.gentle}
                        >
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">My Classes</h2>
                            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                              <Button variant="link" onClick={() => setLocation('/student/courses')} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white">View All</Button>
                            </motion.div>
                        </motion.div>
                        <motion.div 
                          className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
                          variants={staggerContainerFast}
                          initial="initial"
                          animate="animate"
                        >
                            {enrollments.slice(0, 3).map((enrollment, index) => {
                                const Icon = getIconForCourse(enrollment.course.title);
                                const progress = courseProgress[enrollment.courseId] || 0;
                                return (
                                    <motion.div 
                                      key={enrollment.courseId} 
                                      className="bg-white/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden cursor-pointer group relative"
                                      variants={glowCardVariants}
                                      custom={index}
                                      whileHover="hover"
                                      whileTap="tap"
                                      onClick={() => setLocation(`/student/course/${enrollment.courseId}`)}
                                      style={{
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                                      }}
                                    >
                                        {/* Course Image */}
                                        <div className="h-36 relative overflow-hidden">
                                            {enrollment.course.imageUrl ? (
                                                <motion.img 
                                                    src={enrollment.course.imageUrl}
                                                    alt={enrollment.course.title}
                                                    className="w-full h-full object-cover"
                                                    whileHover={{ scale: 1.1 }}
                                                    transition={{ duration: 0.4 }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-[#112240] dark:to-[#0a192f] flex items-center justify-center">
                                                    <motion.div 
                                                      className="w-16 h-16 bg-white/20 dark:bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm"
                                                      whileHover={{ rotate: 360, scale: 1.1 }}
                                                      transition={{ duration: 0.6 }}
                                                    >
                                                        <Icon className="h-8 w-8 text-slate-600 dark:text-slate-400" />
                                                    </motion.div>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                                        </div>
                                        <div className="p-5">
                                            <div className="flex justify-between items-start mb-2">
                                                <h3 className="font-bold text-lg truncate text-slate-900 dark:text-white flex-1">{enrollment.course.title}</h3>
                                                <motion.div whileHover={{ rotate: 90 }} transition={springConfigs.snappy}>
                                                  <MoreHorizontal className="h-5 w-5 text-slate-400 ml-2" />
                                                </motion.div>
                                            </div>
                                            <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">{enrollment.course.description}</p>
                                            <div className="space-y-2">
                                                <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                                                    <span>Progress</span>
                                                    <motion.span
                                                      initial={{ opacity: 0, scale: 0.8 }}
                                                      animate={{ opacity: 1, scale: 1 }}
                                                      transition={{ delay: 0.2 + index * 0.1 }}
                                                    >
                                                      {Math.round(progress)}%
                                                    </motion.span>
                                                </div>
                                                <Progress value={progress} className="h-1.5 bg-slate-200 dark:bg-[#233554]" indicatorClassName="bg-[#FFD700]" />
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {enrollments.length === 0 && (
                                <motion.div 
                                  className="col-span-3 text-center py-8 text-slate-600 dark:text-slate-400 bg-slate-100/80 dark:bg-[#112240]/80 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={springConfigs.bouncy}
                                >
                                    No classes enrolled yet.
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.section>

                    {/* Upcoming Due Dates */}
                    <motion.section variants={fadeInUpVariants}>
                        <motion.h2 
                          className="text-xl font-bold mb-4 text-slate-900 dark:text-white"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={springConfigs.gentle}
                        >
                          Upcoming Due Dates
                        </motion.h2>
                        <motion.div 
                          className="space-y-3"
                          variants={staggerContainerFast}
                          initial="initial"
                          animate="animate"
                        >
                            {assignments.slice(0, 3).map((assignment, index) => {
                                const TaskIcon = getTaskIcon(assignment.title);
                                return (
                                    <motion.div 
                                      key={assignment.id} 
                                      className="bg-white/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex items-center justify-between group"
                                      variants={fadeInUpVariants}
                                      whileHover={{ 
                                        scale: 1.02, 
                                        borderColor: "#FFD700",
                                        boxShadow: "0 12px 24px rgba(255, 215, 0, 0.15)",
                                        transition: springConfigs.snappy
                                      }}
                                      whileTap={{ scale: 0.98 }}
                                    >
                                        <div className="flex items-center gap-4">
                                            <motion.div 
                                              className={`p-3 rounded-xl ${getTaskColor(assignment.priority || 'medium')} bg-opacity-20`}
                                              whileHover={{ scale: 1.1, rotate: 5 }}
                                              transition={springConfigs.bouncy}
                                            >
                                                <TaskIcon className="h-5 w-5" />
                                            </motion.div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 dark:text-white">{assignment.title}</h4>
                                                <p className="text-sm text-slate-600 dark:text-slate-400">{assignment.courseName} • {formatDueDate(assignment.dueDate)}</p>
                                            </div>
                                        </div>
                                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                          <Button onClick={() => setLocation('/student/assignments')} size="sm" variant={assignment.status === 'submitted' ? "outline" : "default"} className={assignment.status === 'submitted' ? "border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300" : "bg-[#FFD700] text-slate-900 hover:bg-yellow-500"}>
                                              {assignment.status === 'submitted' ? 'View' : 'Start'}
                                          </Button>
                                        </motion.div>
                                    </motion.div>
                                );
                            })}
                            {assignments.length === 0 && (
                                <motion.div 
                                  className="text-center py-8 text-slate-500 dark:text-slate-400 bg-white/80 dark:bg-[#112240]/30 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-700 border-dashed"
                                  initial={{ opacity: 0, scale: 0.9 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={springConfigs.bouncy}
                                >
                                  No upcoming assignments
                                </motion.div>
                            )}
                        </motion.div>
                    </motion.section>
                </motion.div>

                {/* Right Sidebar - Performance Insights */}
                <motion.div 
                  className="space-y-6"
                  variants={fadeInUpVariants}
                >
                    <motion.h2 
                      className="text-xl font-bold text-slate-900 dark:text-white"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={springConfigs.gentle}
                    >
                      Performance Insights
                    </motion.h2>
                    
                    {/* Weekly Study Time */}
                    <motion.div 
                      className="bg-white/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      variants={glowCardVariants}
                      whileHover="hover"
                      style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Weekly Study Time</h3>
                            <motion.span 
                              className="text-xs text-slate-600 dark:text-slate-400"
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: 0.3 }}
                            >
                              {streakInfo.currentWeekHours}h / {streakInfo.weeklyGoalHours}h
                            </motion.span>
                        </div>
                        <div className="h-24 flex items-end justify-between gap-2 mb-2">
                            {/* Fake chart bars for visual */}
                            {[40, 60, 30, 80, 50, 20, 40].map((h, i) => (
                                <motion.div 
                                  key={i} 
                                  className="w-full bg-slate-200 dark:bg-[#233554] rounded-t-sm relative group overflow-hidden"
                                  initial={{ scaleY: 0 }}
                                  animate={{ scaleY: 1 }}
                                  transition={{ ...springConfigs.bouncy, delay: 0.1 * i }}
                                  style={{ originY: 1 }}
                                  whileHover={{ scaleY: 1.1 }}
                                >
                                    <motion.div 
                                      className="absolute bottom-0 left-0 right-0 bg-[#FFD700]/80 rounded-t-sm"
                                      initial={{ height: 0 }}
                                      animate={{ height: `${h}%` }}
                                      transition={{ ...springConfigs.bouncy, delay: 0.2 + 0.1 * i, duration: 0.8 }}
                                    />
                                </motion.div>
                            ))}
                        </div>
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                        </div>
                    </motion.div>

                    {/* Major Progress */}
                    <motion.div 
                      className="bg-white/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      variants={glowCardVariants}
                      whileHover="hover"
                      style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Overall Progress</h3>
                            <motion.span 
                              className="text-sm text-[#FFD700]"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ delay: 0.4 }}
                            >
                              {Math.round(overallProgress.progressPercentage)}% Complete
                            </motion.span>
                        </div>
                        <Progress value={overallProgress.progressPercentage} className="h-2 bg-slate-200 dark:bg-[#233554]" indicatorClassName="bg-[#FFD700]" />
                        <motion.p 
                          className="text-xs text-slate-600 dark:text-slate-400 mt-2"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.5 }}
                        >
                          Accumulated {overallProgress.totalScore} points
                        </motion.p>
                    </motion.div>

                    {/* Streak */}
                    <motion.div 
                      className="bg-gradient-to-br from-orange-500/20 to-[#112240]/80 backdrop-blur-md border border-orange-500/30 rounded-2xl p-6 flex items-center justify-between relative overflow-hidden"
                      variants={glowCardVariants}
                      whileHover="hover"
                      style={{
                        boxShadow: '0 8px 32px rgba(255, 165, 0, 0.15)',
                      }}
                    >
                        <motion.div
                          className="absolute inset-0 bg-orange-500/5"
                          animate={{ opacity: [0.05, 0.15, 0.05] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        />
                        <div className="relative z-10">
                            <motion.div 
                              className="text-3xl font-bold text-slate-900 dark:text-white"
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ ...springConfigs.bouncy, delay: 0.2 }}
                            >
                              {streakInfo.currentStreak}
                            </motion.div>
                            <div className="text-sm text-orange-600 dark:text-orange-300">Day Streak!</div>
                        </div>
                        <motion.div 
                          className="h-12 w-12 bg-orange-500/20 rounded-full flex items-center justify-center relative z-10"
                          whileHover={{ scale: 1.2, rotate: 15 }}
                          transition={springConfigs.bouncy}
                        >
                            <motion.div
                              animate={{ scale: [1, 1.2, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                            >
                              <Flame className="h-6 w-6 text-orange-500" />
                            </motion.div>
                        </motion.div>
                    </motion.div>

                    {/* Recent Assignments */}
                    <motion.div 
                      className="bg-white/80 dark:bg-[#112240]/80 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-2xl p-6"
                      variants={glowCardVariants}
                      whileHover="hover"
                      style={{
                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                      }}
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-semibold text-slate-900 dark:text-white">Recent Assignments</h3>
                        </div>
                        <motion.div 
                          className="space-y-4"
                          variants={staggerContainerFast}
                          initial="initial"
                          animate="animate"
                        >
                            {assignments.slice(0, 3).map((assignment, i) => (
                                <motion.div 
                                  key={i} 
                                  className="flex items-center justify-between"
                                  variants={fadeInUpVariants}
                                  whileHover={{ x: 4, transition: springConfigs.snappy }}
                                >
                                    <div className="flex items-center gap-3">
                                        <motion.div 
                                          className={`h-8 w-8 rounded-full flex items-center justify-center ${i % 2 === 0 ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'}`}
                                          whileHover={{ scale: 1.2, rotate: 360 }}
                                          transition={springConfigs.bouncy}
                                        >
                                            {assignment.title.charAt(0)}
                                        </motion.div>
                                        <div>
                                            <p className="font-medium text-sm text-slate-900 dark:text-white">{assignment.title}</p>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">{assignment.courseName}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <motion.p 
                                          className="font-bold text-sm text-slate-900 dark:text-white"
                                          initial={{ opacity: 0, scale: 0.8 }}
                                          animate={{ opacity: 1, scale: 1 }}
                                          transition={{ delay: 0.2 + i * 0.1 }}
                                        >
                                          {assignment.status === 'graded' ? '95%' : 'Pending'}
                                        </motion.p>
                                        <p className="text-xs text-green-600 dark:text-green-400">{assignment.status === 'graded' ? '+2%' : ''}</p>
                                    </div>
                                </motion.div>
                            ))}
                            {assignments.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No recent assignments</p>}
                        </motion.div>
                    </motion.div>
                </motion.div>
            </motion.div>
        </motion.div>
      </motion.div>

        {/* Dialogs and Chat */}
        <Dialog open={showGoalDialog} onOpenChange={setShowGoalDialog}>
             <DialogContent className="sm:max-w-[425px] bg-white dark:bg-[#112240] text-slate-900 dark:text-white border-slate-200 dark:border-slate-700">
                <DialogHeader>
                    <DialogTitle>Set Your Weekly Study Goal</DialogTitle>
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
                    💡 Tip: Start with a realistic goal like 5-15 hours per week
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

        <VersaFloatingChat />
    </StudentLayout>
  );
}
