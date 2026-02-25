import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, Link, useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import {
  pageVariants,
  staggerContainer,
  staggerContainerFast,
  fadeInUpVariants,
  glowCardVariants,
  buttonVariants,
  tabVariants,
  springConfigs
} from '@/lib/animations';

interface Course {
  id: string;
  title: string;
  description: string;
  teacherId: string;
  teacherName?: string;
  teacher?: {
    id: string;
    fullName?: string;
    username?: string;
    email?: string;
    profilePicture?: string;
    bio?: string;
    officeHours?: string;
    department?: string;
  };
  isPublished: boolean;
  imageUrl?: string;
  syllabusUrl?: string;
  createdAt: string;
}

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  fileName?: string;
  fileType?: string;
  createdAt?: string;
}

interface Assignment {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  maxScore?: string;
  isPublished: boolean;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  isPinned: boolean;
  createdAt: string;
}

export default function StudentCourseDetailPage() {
  const { t } = useTranslation(['courses', 'dashboard', 'common']);
  const [match, params] = useRoute("/student/courses/:courseId");
  const courseId = params?.courseId;
  const [, setLocation] = useLocation();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [progress, setProgress] = useState(75);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { name: t('overview'), key: 'overview', icon: 'grid_view' },
    { name: t('lessons'), key: 'lessons', icon: 'book_2' },
    { name: t('assignments'), key: 'assignments', icon: 'assignment' },
    { name: t('announcements'), key: 'announcements', icon: 'campaign' },
  ];

  const getAuthHeaders = (): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!courseId) return;
    fetchCourseData();
  }, [courseId, token]);

  const fetchCourseData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();

      // Parallelize all API calls for better performance
      const [courseRes, lessonsRes, assignmentsRes, announcementsRes, progressRes] = await Promise.all([
        fetch(apiEndpoint(`/api/courses/${courseId}`), { headers }),
        fetch(apiEndpoint(`/api/lessons/course/${courseId}`), { headers }),
        fetch(apiEndpoint(`/api/assignments/courses/${courseId}/assignments`), { headers }),
        fetch(apiEndpoint(`/api/announcements/course/${courseId}`), { headers }),
        fetch(apiEndpoint(`/api/progress/course/${courseId}`), { headers }).catch(() => null),
      ]);

      // Fetch course details
      if (courseRes.ok) {
        const courseData = await courseRes.json();
        const fetchedCourse = courseData.course || courseData;
        
        // Fetch teacher details if we have a teacherId
        if (fetchedCourse.teacherId) {
          try {
            const teacherRes = await fetch(apiEndpoint(`/api/users/${fetchedCourse.teacherId}`), { headers });
            if (teacherRes.ok) {
              const teacherData = await teacherRes.json();
              fetchedCourse.teacher = teacherData.user || teacherData;
            }
          } catch (err) {
            console.error('Failed to fetch teacher details:', err);
          }
        }
        
        setCourse(fetchedCourse);
      }

      // Fetch lessons
      if (lessonsRes.ok) {
        const lessonsData = await lessonsRes.json();
        setLessons(lessonsData.lessons || []);
      }

      // Fetch assignments
      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData.assignments || assignmentsData || []);
      }

      // Fetch announcements
      if (announcementsRes.ok) {
        const announcementsData = await announcementsRes.json();
        setAnnouncements(announcementsData.announcements || announcementsData || []);
      }

      // Fetch student progress for this course
      if (progressRes?.ok) {
        const progressData = await progressRes.json();
        setProgress(progressData.progressPercentage || 75);
      }
    } catch (error) {
      console.error("Error fetching course data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'TBD';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return formatDate(dateStr);
  };

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex flex-col items-center justify-center gap-4 min-h-screen bg-slate-50 dark:bg-transparent">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="text-slate-600 dark:text-slate-400 text-sm">{t('common:common.loading')}</p>
        </div>
      </StudentLayout>
    );
  }

  if (!course) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center min-h-screen bg-transparent">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">{t('courseNotFound')}</h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">{t('courseNotFoundDesc')}</p>
            <Link href="/student/courses">
              <button className="px-4 py-2 bg-primary text-white dark:text-black rounded-lg font-bold hover:bg-primary/90 transition-colors">
                {t('browseCourses')}
              </button>
            </Link>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const upcomingAssignments = assignments.filter(a => a.isPublished && a.dueDate);
  const nextAssignment = upcomingAssignments.sort((a, b) => 
    new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime()
  )[0];
  const recentAnnouncements = announcements.slice(0, 2);

  const handleContactInstructor = () => {
    const email = course?.teacher?.email;
    if (!email) {
      toast({
        title: t('contactInfoUnavailable'),
        description: t('noInstructorEmail'),
        variant: "destructive"
      });
      return;
    }
    
    const subject = encodeURIComponent(`Question about ${course.title}`);
    const body = encodeURIComponent(`Hello ${course.teacher?.fullName || 'Professor'},\n\nI have a question about ${course.title}.\n\n`);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  };

  const handleDownloadSyllabus = async () => {
    if (!course?.syllabusUrl) {
      toast({
        title: t('syllabusUnavailable'),
        description: t('noSyllabusYet'),
        variant: "destructive"
      });
      return;
    }
    
    try {
      const response = await fetch(course.syllabusUrl, {
        headers: getAuthHeaders()
      });
      
      if (!response.ok) throw new Error('Download failed');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${course.title}-Syllabus.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: t('syllabusDownloaded'),
        description: t('syllabusDownloaded')
      });
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: t('downloadFailed'),
        description: t('downloadFailedDesc'),
        variant: "destructive"
      });
    }
  };

  return (
    <StudentLayout>
      <main className="flex-1 flex flex-col px-4 md:px-10 lg:px-40 py-8 w-full max-w-[1600px] mx-auto overflow-y-auto bg-slate-50 dark:bg-transparent">
        {/* Breadcrumbs */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-wrap gap-2 pb-6"
        >
          <Link href="/student/dashboard" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">dashboard</span> {t('dashboard')}
          </Link>
          <span className="text-slate-400 text-sm font-medium">/</span>
          <Link href="/student/courses" className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white text-sm font-medium">{t('myClasses')}</Link>
          <span className="text-slate-400 text-sm font-medium">/</span>
          <span className="text-slate-900 dark:text-white text-sm font-medium">{course.title}</span>
        </motion.div>

        {/* Page Header & Progress Section */}
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          <motion.div 
            className="lg:col-span-8 flex flex-col justify-center gap-4"
            variants={fadeInUpVariants}
          >
            <div className="flex flex-col gap-2">
              <span className="text-primary font-bold text-sm tracking-widest uppercase">
                {course.id.slice(0, 8).toUpperCase()} • {t('activeCourse')}
              </span>
              <h1 className="text-slate-900 dark:text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                {course.title}
              </h1>
              <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-base font-normal">
                <span className="material-symbols-outlined text-[20px]">person</span>
                <span>{course.teacher?.fullName || course.teacher?.username || course.teacherName || t('instructor')}</span>
              </div>
            </div>
            <div className="flex gap-4 mt-2">
              <Link href={`/student/courses/${courseId}/lessons`}>
                <motion.button 
                  className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-primary hover:bg-primary/90 transition-colors text-white dark:text-black text-sm font-bold shadow-lg"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined">play_circle</span>
                    {t('continueLearning')}
                  </span>
                </motion.button>
              </Link>
              <motion.button 
                onClick={handleDownloadSyllabus}
                className="flex items-center justify-center overflow-hidden rounded-lg h-12 px-6 bg-white dark:bg-card border border-slate-300 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 hover:border-primary/30 text-slate-900 dark:text-white text-sm font-bold transition-all"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <span className="flex items-center gap-2">
                  <span className="material-symbols-outlined">download</span>
                  {t('syllabus')}
                </span>
              </motion.button>
            </div>
          </motion.div>

          {/* Progress Widget */}
          <motion.div 
            className="lg:col-span-4 flex items-end"
            variants={fadeInUpVariants}
          >
            <motion.div 
              className="w-full bg-white/80 dark:bg-card/80 backdrop-blur-sm p-5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm"
              whileHover={{ scale: 1.02, boxShadow: '0 12px 24px rgba(0, 0, 0, 0.15)' }}
              transition={springConfigs.gentle}
            >
              <div className="flex flex-col gap-3">
                <div className="flex gap-6 justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">trophy</span>
                    <p className="text-slate-900 dark:text-white text-base font-bold">Course Progress</p>
                  </div>
                  <motion.p 
                    className="text-primary text-lg font-bold"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    {progress}%
                  </motion.p>
                </div>
                <motion.div
                  className="h-3 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden"
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ ...springConfigs.gentle, delay: 0.2 }}
                >
                  <motion.div
                    className="h-full bg-primary"
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    transition={{ ...springConfigs.gentle, delay: 0.4, duration: 1 }}
                  />
                </motion.div>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-right mt-1">
                  {lessons.length - Math.floor(lessons.length * progress / 100)} Lessons remaining
                </p>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Tabs Navigation */}
        <motion.div 
          className="border-b border-slate-200 dark:border-white/10 mb-8 sticky top-0 bg-slate-50/95 dark:bg-[#0a192f]/95 backdrop-blur-sm z-30 pt-2"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={springConfigs.gentle}
        >
          <div role="tablist" className="flex gap-8 overflow-x-auto no-scrollbar">
            {tabs.map((tab, index) => {
              const isActive = activeTab === tab.key;
              return (
                <motion.button
                  key={tab.name}
                  role="tab"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 border-b-[3px] pb-[13px] pt-2 px-1 transition-colors whitespace-nowrap ${
                    isActive 
                      ? 'border-b-primary text-primary' 
                      : 'border-b-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ ...springConfigs.gentle, delay: 0.1 * index }}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.span 
                    className="material-symbols-outlined text-[20px]"
                    animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  >
                    {tab.icon}
                  </motion.span>
                  <p className="text-sm font-bold">{tab.name}</p>
                </motion.button>
              );
            })}
          </div>
        </motion.div>

        {/* Tab Content: Overview */}
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div 
              className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-10"
              key="overview"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
              exit={{ opacity: 0, y: 20 }}
            >
            {/* Main Content Column */}
            <div className="lg:col-span-2 flex flex-col gap-8">
              {/* About Course */}
              <motion.div variants={fadeInUpVariants}>
                <section className="flex flex-col gap-4 bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <h3 className="text-slate-900 dark:text-white text-xl font-bold">About this Course</h3>
                  <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed">
                    {course.description || 'Explore key concepts and develop practical skills in this comprehensive course. Access lessons, complete assignments, and track your progress throughout the semester.'}
                  </p>
                  <div className="mt-4 pt-6 border-t border-slate-200 dark:border-white/10">
                    <h4 className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider mb-4">What you'll learn</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Core Concepts & Fundamentals</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Practical Applications</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Advanced Techniques</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-green-500 text-[20px]">check_circle</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Real-World Projects</span>
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>

              {/* Instructor Card - Enhanced with Real Data */}
              <motion.div variants={fadeInUpVariants}>
                <section className="bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6">Your Instructor</h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    {/* Profile Picture */}
                    {course.teacher?.profilePicture ? (
                      <div 
                        className="bg-center bg-no-repeat bg-cover rounded-full size-24 border-4 border-primary/30 shadow-lg"
                        style={{ backgroundImage: `url("${course.teacher.profilePicture}")` }}
                      ></div>
                    ) : (
                      <div className="size-24 rounded-full border-4 border-slate-200 dark:border-white/10 shadow-lg bg-gradient-to-br from-primary/30 to-primary/50 flex items-center justify-center">
                        <span className="text-4xl font-bold text-white">
                          {(course.teacher?.fullName || course.teacher?.username || course.teacherName || 'I')[0].toUpperCase()}
                        </span>
                      </div>
                    )}
                    
                    {/* Instructor Details */}
                    <div className="flex flex-col gap-3 flex-1">
                      <div>
                        <p className="text-slate-900 dark:text-white text-lg font-bold">
                          {course.teacher?.fullName || course.teacher?.username || course.teacherName || 'Course Instructor'}
                        </p>
                        <p className="text-primary text-sm font-medium">
                          {course.teacher?.department || 'Course Instructor'}
                        </p>
                      </div>
                      
                      {/* Email */}
                      {course.teacher?.email && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                          <span className="material-symbols-outlined text-[16px]">mail</span>
                          <a href={`mailto:${course.teacher.email}`} className="hover:text-primary transition-colors">
                            {course.teacher.email}
                          </a>
                        </div>
                      )}
                      
                      {/* Office Hours */}
                      {course.teacher?.officeHours && (
                        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm">
                          <span className="material-symbols-outlined text-[16px]">schedule</span>
                          <span>{course.teacher.officeHours}</span>
                        </div>
                      )}
                      
                      {/* Bio */}
                      <p className="text-slate-600 dark:text-slate-400 text-sm max-w-lg leading-relaxed">
                        {course.teacher?.bio || 'Questions about the course? Feel free to reach out during office hours or send a message through the platform.'}
                      </p>
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-2">
                        <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" 
                          onClick={handleContactInstructor}
                          disabled={!course.teacher?.email}
                          className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-black disabled:text-slate-500 rounded-lg text-sm font-bold transition-colors shadow-md"
                        >
                          <span className="material-symbols-outlined text-[18px]">mail</span> 
                          Contact
                        </motion.button>
                        {course.teacher?.officeHours && (
                          <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white rounded-lg text-sm font-medium transition-colors">
                            <span className="material-symbols-outlined text-[18px]">calendar_month</span> 
                            Office Hours
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>
                </section>
              </motion.div>
            </div>

            {/* Sidebar Column */}
            <div className="flex flex-col gap-6">
              {/* Next Assignment Widget */}
              {nextAssignment && (
                <motion.div variants={fadeInUpVariants}>
                  <motion.div variants={glowCardVariants} whileHover="hover" className="relative overflow-hidden bg-gradient-to-br from-amber-100 dark:from-amber-900/20 to-white dark:to-card p-6 rounded-xl border border-amber-300 dark:border-amber-700/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-amber-200 dark:bg-amber-900/30 p-1.5 rounded-lg text-amber-600 dark:text-amber-400">
                        <span className="material-symbols-outlined text-[20px]">timer</span>
                      </div>
                      <span className="text-amber-700 dark:text-amber-500 text-xs font-bold uppercase tracking-wider">Upcoming Deadline</span>
                    </div>
                    <h4 className="text-slate-900 dark:text-white text-lg font-bold mb-1">{nextAssignment.title}</h4>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-5">Due: {formatDate(nextAssignment.dueDate)}</p>
                    <div className="flex items-center justify-between pt-4 border-t border-amber-300 dark:border-amber-800/30">
                      <span className="text-xs font-medium bg-card px-2 py-1 rounded border border-white/10 text-slate-400">
                        {nextAssignment.maxScore || '100'} points
                      </span>
                      <Link href={`/student/assignments/${nextAssignment.id}`} className="text-primary text-sm font-bold hover:underline">
                        View Details
                      </Link>
                    </div>
                  </motion.div>
                </motion.div>
              )}

              {/* Announcements Widget */}
              <motion.div variants={fadeInUpVariants}>
                <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-slate-900 dark:text-white text-base font-bold">Announcements</h4>
                    {announcements.length > 0 && (
                      <span className="bg-red-100 dark:bg-red-100 text-red-600 dark:text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {announcements.length} NEW
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    {recentAnnouncements.length > 0 ? recentAnnouncements.map((ann, i) => (
                      <div key={ann.id} className="flex gap-3 items-start">
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-2 rounded-full shrink-0 mt-1">
                          <span className="material-symbols-outlined text-blue-600 dark:text-primary text-[18px]">campaign</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{ann.title}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">{ann.content}</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 mt-2">{getTimeAgo(ann.createdAt)}</p>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-slate-600 dark:text-slate-400 text-center py-4">{t('dashboard:noAnnouncementsYetShort')}</p>
                    )}
                  </div>
                  <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" 
                    onClick={() => setActiveTab('announcements')}
                    className="w-full mt-5 py-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium border border-slate-200 dark:border-white/10 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    View All Announcements
                  </motion.button>
                </div>
              </motion.div>

              {/* Course Resources Widget */}
              <motion.div variants={fadeInUpVariants}>
                <div className="bg-white/80 dark:bg-card/80 backdrop-blur-sm p-6 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
                  <h4 className="text-slate-900 dark:text-white text-base font-bold mb-4">Course Resources</h4>
                  <ul className="flex flex-col gap-3">
                    {course.syllabusUrl ? (
                      <li>
                        <button 
                          onClick={handleDownloadSyllabus}
                          className="w-full flex items-center gap-3 group cursor-pointer"
                        >
                          <div className="bg-slate-100 dark:bg-white/5 p-2 rounded text-slate-600 dark:text-slate-400 group-hover:bg-primary group-hover:text-black transition-colors">
                            <span className="material-symbols-outlined text-[20px]">picture_as_pdf</span>
                          </div>
                          <span className="text-sm text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-left">Course Syllabus.pdf</span>
                        </button>
                      </li>
                    ) : null}
                    <li>
                      <button 
                        onClick={() => setActiveTab('lessons')}
                        className="w-full flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="bg-slate-100 dark:bg-white/5 p-2 rounded text-slate-600 dark:text-slate-400 group-hover:bg-primary group-hover:text-black transition-colors">
                          <span className="material-symbols-outlined text-[20px]">book_2</span>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-left">Course Lessons ({lessons.length})</span>
                      </button>
                    </li>
                    <li>
                      <button 
                        onClick={() => setActiveTab('assignments')}
                        className="w-full flex items-center gap-3 group cursor-pointer"
                      >
                        <div className="bg-slate-100 dark:bg-white/5 p-2 rounded text-slate-600 dark:text-slate-400 group-hover:bg-primary group-hover:text-black transition-colors">
                          <span className="material-symbols-outlined text-[20px]">assignment</span>
                        </div>
                        <span className="text-sm text-slate-600 dark:text-slate-400 font-medium group-hover:text-slate-900 dark:group-hover:text-white transition-colors text-left">Assignments ({assignments.length})</span>
                      </button>
                    </li>
                  </ul>
                </div>
              </motion.div>
            </div>
          </motion.div>
          )}
        </AnimatePresence>

        {/* Tab Content: Lessons */}
        <AnimatePresence mode="wait">
        {activeTab === 'lessons' && (
          <motion.div 
            className="pb-10"
            key="lessons"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={springConfigs.gentle}
          >
            <motion.div variants={fadeInUpVariants} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-slate-900 dark:text-white text-xl font-bold">Course Lessons</h3>
                <Link href={`/student/courses/${courseId}/lessons`}>
                  <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-black rounded-lg font-bold transition-colors">
                    <span className="material-symbols-outlined text-[20px]">play_circle</span>
                    Open Lesson Viewer
                  </motion.button>
                </Link>
              </div>
              {lessons.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-6xl mb-4 block">book_2</span>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">{t('dashboard:noLessonsAvailableYet')}</p>
                </div>
              ) : (
                <motion.div variants={staggerContainerFast} initial="initial" animate="animate" className="grid gap-3">
                  {lessons.map((lesson, index) => (
                    <motion.div variants={fadeInUpVariants} key={lesson.id}>
                      <Link
                        href={`/student/courses/${courseId}/lessons`}
                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 transition-colors group"
                      >
                        <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center group-hover:bg-primary group-hover:text-black transition-colors">
                          <span className="material-symbols-outlined text-primary group-hover:text-black text-[24px]">book_2</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-500">
                              Lesson {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <h4 className="font-medium text-slate-900 dark:text-white truncate">
                            {lesson.title || lesson.fileName}
                          </h4>
                          {lesson.createdAt && (
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                              Added {new Date(lesson.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                      </Link>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Tab Content: Assignments */}
        <AnimatePresence mode="wait">
        {activeTab === 'assignments' && (
          <motion.div 
            className="pb-10"
            key="assignments"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={springConfigs.gentle}
          >
            <motion.div variants={fadeInUpVariants} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6">Course Assignments</h3>
              {assignments.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-6xl mb-4 block">assignment</span>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">{t('dashboard:noAssignmentsAvailableYet')}</p>
                </div>
              ) : (
                <motion.div variants={staggerContainerFast} initial="initial" animate="animate" className="grid gap-4">
                  {assignments.map(assignment => (
                    <motion.div variants={fadeInUpVariants} key={assignment.id}>
                      <motion.div variants={glowCardVariants} whileHover="hover"
                        className="flex items-center gap-4 p-5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-primary/50 transition-colors"
                      >
                        <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center">
                          <span className="material-symbols-outlined text-purple-600 dark:text-purple-400 text-[28px]">assignment</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-900 dark:text-white mb-1">{assignment.title}</h4>
                          {assignment.description && (
                            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-1 mb-2">{assignment.description}</p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            {assignment.dueDate && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">schedule</span>
                                Due: {formatDate(assignment.dueDate)}
                              </span>
                            )}
                            {assignment.maxScore && (
                              <span className="flex items-center gap-1">
                                <span className="material-symbols-outlined text-[14px]">trophy</span>
                                {assignment.maxScore} points
                              </span>
                            )}
                          </div>
                        </div>
                        <Link href="/student/assignments">
                          <motion.button variants={buttonVariants} whileHover="hover" whileTap="tap" className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-primary hover:text-black text-slate-900 dark:text-white rounded-lg font-medium transition-colors border border-slate-200 dark:border-white/10">
                            View
                          </motion.button>
                        </Link>
                      </motion.div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>

        {/* Tab Content: Announcements */}
        <AnimatePresence mode="wait">
        {activeTab === 'announcements' && (
          <motion.div 
            className="pb-10"
            key="announcements"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={springConfigs.gentle}
          >
            <motion.div variants={fadeInUpVariants} className="bg-white/80 dark:bg-card/80 backdrop-blur-sm rounded-xl border border-slate-200 dark:border-white/10 shadow-sm p-6">
              <h3 className="text-slate-900 dark:text-white text-xl font-bold mb-6">Course Announcements</h3>
              {announcements.length === 0 ? (
                <div className="text-center py-16">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-6xl mb-4 block">campaign</span>
                  <p className="text-slate-600 dark:text-slate-400 text-lg">{t('dashboard:noAnnouncementsYetShort')}</p>
                </div>
              ) : (
                <motion.div variants={staggerContainerFast} initial="initial" animate="animate" className="grid gap-4">
                  {announcements.map(announcement => (
                    <motion.div variants={fadeInUpVariants} key={announcement.id}>
                      <div
                        className={`p-5 rounded-xl border ${
                          announcement.isPinned 
                            ? 'border-amber-300 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/10' 
                            : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                            announcement.isPinned ? 'bg-amber-200 dark:bg-amber-900/30' : 'bg-blue-50 dark:bg-blue-900/20'
                          }`}>
                            <span className={`material-symbols-outlined text-[24px] ${
                              announcement.isPinned ? 'text-amber-600 dark:text-amber-400' : 'text-blue-600 dark:text-blue-400'
                            }`}>campaign</span>
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-900 dark:text-white text-lg">{announcement.title}</h4>
                              {announcement.isPinned && (
                                <span className="bg-amber-200 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700/30">
                                  PINNED
                                </span>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">{announcement.content}</p>
                            <p className="text-xs text-slate-500">
                              Posted {new Date(announcement.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>
    </StudentLayout>
  );
}

