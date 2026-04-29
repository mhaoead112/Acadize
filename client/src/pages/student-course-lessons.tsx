import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useBranding } from "@/contexts/BrandingContext";
import LessonViewer from "@/components/LessonViewer";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import NotificationBell from "@/components/NotificationBell";
import { apiEndpoint } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";

import { 
  pageVariants, 
  staggerContainer,
  staggerContainerFast, 
  fadeInUpVariants, 
  glowCardVariants, 
  buttonVariants,
  springConfigs 
} from "@/lib/animations";

interface Lesson {
  id: string;
  courseId: string;
  title: string;
  fileName?: string;
  fileType?: string;
  fileUrl?: string;
  createdAt?: string;
}

interface Course {
  id: string;
  title: string;
  description?: string;
}

export default function StudentCourseLessonsPage() {
  const { t, i18n } = useTranslation(['dashboard', 'common', 'auth']);
  const [match, params] = useRoute("/student/courses/:courseId/lessons");
  const courseId = params?.courseId as string | undefined;
  const { getAuthHeaders, user } = useAuth();
  const { features } = useBranding();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedLessons, setViewedLessons] = useState<Set<string>>(new Set());
  const [completedLessons, setCompletedLessons] = useState<Set<string>>(new Set());
  const [completingLessonId, setCompletingLessonId] = useState<string | null>(null);
  const [courseCompleted, setCourseCompleted] = useState<boolean>(false);
  const [showAIChat, setShowAIChat] = useState<boolean>(true);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'discussion'>('overview');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [chatWidth, setChatWidth] = useState<number>(384); // 24rem = w-96
  const locale = i18n.language?.startsWith('ar') ? 'ar-EG' : 'en-US';
  const isRTL = i18n.dir() === 'rtl';

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, []);

  const getFileTypeIcon = useCallback((fileType?: string, fileName?: string) => {
    const type = fileType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';
    
    if (type.includes('video') || name.endsWith('.mp4') || name.endsWith('.webm')) {
      return 'play_circle';
    }
    if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return 'image';
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return 'description';
    }
    return 'description';
  }, []);

  const getFileTypeLabel = useCallback((fileType?: string, fileName?: string) => {
    const type = fileType?.toLowerCase() || '';
    const name = fileName?.toLowerCase() || '';
    
    if (type.includes('video') || name.endsWith('.mp4') || name.endsWith('.webm')) {
      return t('fileTypeVideo');
    }
    if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return t('fileTypeImage');
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return 'PDF';
    }
    return t('fileTypeDocument');
  }, [t]);

  useEffect(() => {
    if (!courseId) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const authHeaders = getAuthHeaders();
        const headers = (authHeaders as any).Authorization ? authHeaders : {};
        
        // Fetch course details
        const courseRes = await fetch(apiEndpoint(`/api/courses/${courseId}`), { headers });
        if (courseRes.ok) {
          const courseData = await courseRes.json();
          setCourse(courseData.course || courseData);
        }
        
        // Fetch lessons
        const res = await fetch(apiEndpoint(`/api/lessons/course/${courseId}`), { headers });
        if (!res.ok) throw new Error(t('failedToLoadLessons'));
        const data = await res.json();
        const items = data?.lessons || [];
        const lessonsWithUrls = items.map((lesson: Lesson) => ({
          ...lesson,
          fileUrl: apiEndpoint(`/api/lessons/${lesson.id}/download?view=inline`)
        }));
        setLessons(lessonsWithUrls);
        if (lessonsWithUrls.length > 0) {
          setSelectedLesson(lessonsWithUrls[0]);
          setSelectedIndex(0);
        }

        // Restore persisted completion state from gamification events so the
        // UI survives refreshes and revisit sessions.
        if (user?.role === 'student' && lessonsWithUrls.length > 0) {
          const activityRes = await fetch(
            apiEndpoint('/api/gamification/activity?limit=500&offset=0'),
            { headers },
          );

          if (activityRes.ok) {
            const activityData = await activityRes.json();
            const events = Array.isArray(activityData?.events) ? activityData.events : [];
            const lessonIds = new Set(lessonsWithUrls.map((lesson: Lesson) => lesson.id));
            const completedFromEvents = new Set<string>();

            for (const event of events) {
              if (event?.eventType === 'lesson_completion' && lessonIds.has(event.entityId)) {
                completedFromEvents.add(event.entityId);
              }
            }

            setCompletedLessons(completedFromEvents);
            setCourseCompleted(
              events.some(
                (event: any) =>
                  event?.eventType === 'course_completion' && event.entityId === courseId,
              ),
            );
          }
        }
      } catch (err: any) {
        setError(err?.message || t('unknownError'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, getAuthHeaders, t, user?.role]);

  // Mark lesson as viewed when selected
  useEffect(() => {
    if (selectedLesson) {
      setViewedLessons(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(selectedLesson.id);
        return newSet;
      });
    }
  }, [selectedLesson]);

  const handleSelectLesson = (lesson: Lesson, index: number) => {
    setSelectedLesson(lesson);
    setSelectedIndex(index);
    setViewedLessons(prev => {
      const newSet = new Set(Array.from(prev));
      newSet.add(lesson.id);
      return newSet;
    });
  };

  const toggleBookmark = useCallback((lessonId: string) => {
    setBookmarkedLessons(prev => {
      const newSet = new Set(Array.from(prev));
      if (newSet.has(lessonId)) {
        newSet.delete(lessonId);
      } else {
        newSet.add(lessonId);
      }
      return newSet;
    });
  }, []);

  const markAsComplete = async () => {
    if (!selectedLesson) return;
    if (completedLessons.has(selectedLesson.id)) return;
    
    try {
      setCompletingLessonId(selectedLesson.id);
      const authHeaders = getAuthHeaders();
      const headers = {
        ...(authHeaders as any).Authorization ? authHeaders : {},
      };
      
      const response = await fetch(apiEndpoint(`/api/lessons/${selectedLesson.id}/complete`), {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        throw new Error(t('failedToLoadLessons'));
      }

      const result = await response.json();
      const nextCompletedLessons = new Set(Array.from(completedLessons));
      nextCompletedLessons.add(selectedLesson.id);
      
      setCompletedLessons(nextCompletedLessons);
      void queryClient.invalidateQueries({ queryKey: ['gamification'] });
      void queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });

      setViewedLessons(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(selectedLesson.id);
        return newSet;
      });

      const pointsAwarded = result?.gamification?.pointsAwarded ?? 0;
      
      if (result?.xp) {
        import('@/hooks/useXPAward').then(({ triggerXPAward, triggerQuestCompletion }) => {
          triggerXPAward(result.xp);
          if (Array.isArray(result.gamification?.completedQuests)) {
            result.gamification.completedQuests.forEach((quest: any) => {
              triggerQuestCompletion({
                title: quest.title,
                xpAwarded: quest.xpAwarded
              });
            });
          }
        });
      }

      toast({
        title: pointsAwarded > 0 ? "Lesson completed" : "Marked as complete",
        description: pointsAwarded > 0
          ? `You earned ${pointsAwarded} XP for this lesson.`
          : "Your progress has been updated.",
      });

      const allLessonsCompleted = lessons.length > 0 && nextCompletedLessons.size === lessons.length;

      if (allLessonsCompleted && courseId && !courseCompleted) {
        const courseResponse = await fetch(apiEndpoint(`/api/enrollments/${courseId}/complete`), {
          method: 'POST',
          headers,
        });

        if (courseResponse.ok) {
          const courseResult = await courseResponse.json();
          const coursePoints = courseResult?.gamification?.pointsAwarded ?? 0;
          setCourseCompleted(true);
          void queryClient.invalidateQueries({ queryKey: ['gamification'] });
          void queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
          toast({
            title: "Course completed",
            description: coursePoints > 0
              ? `You finished the course and earned ${coursePoints} bonus XP.`
              : "You finished all lessons in this course.",
          });
        }
      }
    } catch (err) {
      console.error('Failed to mark lesson as complete:', err);
      toast({
        title: "Couldn't mark lesson as complete",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setCompletingLessonId(null);
    }
  };

  const progressPercentage = useMemo(() => 
    lessons.length > 0 
      ? Math.round((completedLessons.size / lessons.length) * 100) 
      : 0
  , [completedLessons.size, lessons.length]);

  if (isLoading) {
    return (
      <div className="font-display bg-slate-50 dark:bg-background text-slate-900 dark:text-white overflow-hidden h-screen flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">{t('common:common.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="font-display bg-slate-50 dark:bg-[#0a192f] text-slate-900 dark:text-white overflow-hidden h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500 mb-4 block">school</span>
          <p className="text-slate-600 dark:text-slate-300 mb-6">{t('dashboard:pleaseSignInToViewLessons')}</p>
          <Link href="/login">
            <button className="px-6 py-3 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg">
              {t('auth:signIn')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="font-display bg-slate-50 dark:bg-[#0a192f] text-slate-900 dark:text-white overflow-hidden h-screen flex flex-col"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
      `}</style>
      
      {/* Simple Header with Back Button */}
      <motion.header 
        className="flex shrink-0 items-center justify-between border-b border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] px-6 py-4 shadow-lg z-20"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={springConfigs.snappy}
      >
        <div className="flex items-center gap-4">
          <Link href={`/student/courses/${courseId}`}>
            <motion.button 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 hover:border-primary/30 text-slate-700 dark:text-slate-300 hover:text-primary transition-all"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
            >
              <span className="material-symbols-outlined text-[20px]">{isRTL ? 'arrow_forward' : 'arrow_back'}</span>
              <span className="font-medium">{t('dashboard:backToCourse')}</span>
            </motion.button>
          </Link>
          <div className="border-l border-slate-300 dark:border-white/20 pl-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{course?.title || t('dashboard:courseLessons')}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('lessonCount', { count: lessons.length })}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-primary">{progressPercentage}%</span> {t('complete')}
            </span>
          </div>
        </div>
      </motion.header>

      <main className="flex flex-1 overflow-hidden">
        {/* Lessons Sidebar */}
        <motion.aside 
          className={`${sidebarCollapsed ? 'w-16' : 'w-80'} bg-white dark:bg-[#112240] border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 transition-all duration-300 hidden md:flex`}
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={springConfigs.gentle}
        >
          {/* Sidebar Header with Toggle */}
          <div className="p-4 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
            {!sidebarCollapsed && (
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{course?.title || t('courseLessons')}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">{t('lessonsAvailableCount', { count: lessons.length })}</p>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-400 transition-all hover:scale-105"
              title={sidebarCollapsed ? t('expandSidebar') : t('collapseSidebar')}
            >
              <span className="material-symbols-outlined text-xl">
                {isRTL ? (sidebarCollapsed ? 'chevron_left' : 'chevron_right') : (sidebarCollapsed ? 'chevron_right' : 'chevron_left')}
              </span>
            </button>
          </div>
          <motion.div 
            className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
            variants={staggerContainerFast}
            initial="initial"
            animate="animate"
          >
            {lessons.map((lesson, index) => {
              const isSelected = selectedLesson?.id === lesson.id;
              const isViewed = viewedLessons.has(lesson.id);
              const isCompleted = completedLessons.has(lesson.id);
              
              return (
                <motion.button
                  key={lesson.id}
                  onClick={() => handleSelectLesson(lesson, index)}
                  className={`w-full text-left rounded-lg border transition-all ${
                    isSelected 
                      ? 'border-primary/40 bg-primary/10 shadow-md shadow-primary/5' 
                      : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/50 hover:bg-slate-100 dark:hover:bg-[#1a2f4f] hover:border-slate-300 dark:hover:border-white/20'
                  }`}
                  variants={fadeInUpVariants}
                  whileHover={{ scale: 1.02, transition: springConfigs.snappy }}
                  whileTap={{ scale: 0.98 }}
                  title={sidebarCollapsed ? (lesson.title || lesson.fileName || t('lesson')) : undefined}
                >
                  <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'p-2 justify-center' : 'p-3'}`}>
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <span className="material-symbols-outlined text-primary text-[18px]">play_circle</span>
                      ) : isCompleted ? (
                        <span className="material-symbols-outlined text-[18px] text-green-400">
                          check_circle
                        </span>
                      ) : isViewed ? (
                        <span className="material-symbols-outlined text-[18px] text-slate-500 dark:text-slate-400">
                          visibility
                        </span>
                      ) : (
                        <span className="material-symbols-outlined text-[18px] text-slate-400 dark:text-slate-600">
                          circle
                        </span>
                      )}
                    </div>
                    {!sidebarCollapsed && (
                      <>
                        <div className="flex-1">
                          <p className={`text-sm font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                            {lesson.title || lesson.fileName || t('untitled')}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                            <span className="material-symbols-outlined text-[14px]">
                              {getFileTypeIcon(lesson.fileType, lesson.fileName)}
                            </span>
                            <span>{getFileTypeLabel(lesson.fileType, lesson.fileName)}</span>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          {bookmarkedLessons.has(lesson.id) && (
                            <span className="material-symbols-outlined text-primary text-[16px]" style={{fontVariationSettings: "'FILL' 1"}}>bookmark</span>
                          )}
                          {completedLessons.has(lesson.id) && !isSelected && (
                            <span className="material-symbols-outlined text-green-400 text-[16px]">check_circle</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
          {!sidebarCollapsed && (
            <div className="p-4 border-t border-slate-200 dark:border-white/10">
              <Link href={`/student/courses/${courseId}`}>
                <motion.button 
                  className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span className="material-symbols-outlined text-[18px]">{isRTL ? 'arrow_forward' : 'arrow_back'}</span>
                  {t('backToCourse')}
                </motion.button>
              </Link>
            </div>
          )}
        </motion.aside>

        {/* Main Content */}
        <motion.section 
          className="flex-1 flex flex-col h-full overflow-hidden relative bg-slate-50 dark:bg-[#0a192f]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, ...springConfigs.gentle }}
        >
          <div className="px-8 py-5 flex items-center justify-between shrink-0">
            <div className="flex flex-wrap gap-2 items-center text-sm">
              <Link className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors" href={`/student/courses/${courseId}`}>
                {course?.title || t('course')}
              </Link>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer">{t('lessonNumber', { number: selectedIndex + 1 })}</span>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-primary font-medium px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs uppercase tracking-wide">
                {selectedLesson ? getFileTypeLabel(selectedLesson.fileType, selectedLesson.fileName) : t('content')}
              </span>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => selectedLesson && toggleBookmark(selectedLesson.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                  selectedLesson && bookmarkedLessons.has(selectedLesson.id)
                    ? 'border-primary/30 bg-primary/10 text-primary'
                    : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:border-slate-300 dark:hover:border-white/20 hover:text-primary'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: selectedLesson && bookmarkedLessons.has(selectedLesson.id) ? '"FILL" 1' : '"FILL" 0' }}>
                  bookmark
                </span>
                {selectedLesson && bookmarkedLessons.has(selectedLesson.id) ? t('saved') : t('save')}
              </button>
              <button 
                onClick={markAsComplete}
                disabled={!selectedLesson || !courseId || (selectedLesson ? completedLessons.has(selectedLesson.id) : true) || completingLessonId === selectedLesson?.id}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md shadow-black/20 transition-all text-sm font-bold ${
                  selectedLesson && completedLessons.has(selectedLesson.id)
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-primary hover:bg-primary/90 text-black disabled:opacity-60 disabled:cursor-not-allowed'
                }`}
              >
                {completingLessonId === selectedLesson?.id
                  ? t('common:common.loading')
                  : selectedLesson && completedLessons.has(selectedLesson.id)
                    ? t('completed')
                    : t('markAsComplete')}
                <span className="material-symbols-outlined text-[20px]">check</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-8 pb-10 scrollbar-hide">
            <div className="max-w-5xl mx-auto space-y-6">
              {selectedLesson ? (
                <>
                  <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-white tracking-tight">
                      {selectedLesson.title || selectedLesson.fileName || t('lessonContent')}
                    </h1>
                    <p className="text-slate-400 text-lg">{t('lessonOfTotal', { current: selectedIndex + 1, total: lessons.length })}</p>
                  </div>

                  {/* Lesson Viewer */}
                  <div className="w-full bg-gradient-to-br from-black to-[#0a0a0a] rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 relative border border-white/20 ring-1 ring-white/5">
                    <LessonViewer 
                      key={selectedLesson.id}
                      fileUrl={selectedLesson.fileUrl} 
                      fileType={selectedLesson.fileType} 
                      fileName={selectedLesson.fileName} 
                    />
                  </div>

                  {/* Lesson Tabs */}
                  <div className="bg-[#112240] rounded-xl border border-white/10 shadow-lg mt-8">
                    <div className="flex border-b border-white/10 overflow-x-auto">
                      <button 
                        onClick={() => setActiveTab('overview')}
                        className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                          activeTab === 'overview' 
                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {t('overview')}
                      </button>
                      <button 
                        onClick={() => setActiveTab('resources')}
                        className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                          activeTab === 'resources' 
                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {t('resources')}
                      </button>
                      {features?.enableCourseDiscussions && (
                        <button 
                          onClick={() => setActiveTab('discussion')}
                          className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                            activeTab === 'discussion' 
                              ? 'text-primary border-b-2 border-primary bg-primary/5' 
                              : 'text-slate-300 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {t('discussion')}
                        </button>
                      )}
                    </div>
                    <div className="p-6">
                      {/* Overview Tab */}
                      {activeTab === 'overview' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">{t('aboutThisLesson')}</h4>
                          <p className="text-slate-300 leading-relaxed mb-6">
                            {t('aboutLessonDescription')}
                          </p>
                          <h4 className="text-lg font-bold text-white mb-3">{t('quickActions')}</h4>
                          <div className="grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => {
                            if (selectedIndex > 0) {
                              handleSelectLesson(lessons[selectedIndex - 1], selectedIndex - 1);
                            }
                          }}
                          disabled={selectedIndex === 0}
                          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-sm text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">{isRTL ? 'arrow_forward' : 'arrow_back'}</span>
                          {t('previousLesson')}
                        </button>
                        <button 
                          onClick={() => {
                            if (selectedIndex < lessons.length - 1) {
                              handleSelectLesson(lessons[selectedIndex + 1], selectedIndex + 1);
                            }
                          }}
                          disabled={selectedIndex === lessons.length - 1}
                          className="flex items-center justify-center gap-2 p-3 rounded-lg bg-[#0a192f]/50 border border-white/10 hover:bg-[#1a2f4f] hover:border-white/20 text-sm text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {t('nextLesson')}
                          <span className="material-symbols-outlined text-[20px]">{isRTL ? 'arrow_back' : 'arrow_forward'}</span>
                        </button>
                          </div>
                        </>
                      )}

                      {/* Resources Tab */}
                      {activeTab === 'resources' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">{t('lessonResources')}</h4>
                          <p className="text-slate-300 mb-4">{t('lessonResourcesDescription')}</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-[#0a192f]/50 border border-white/10 rounded-lg hover:border-primary/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-2xl">description</span>
                                <div>
                                  <p className="font-medium text-white">{selectedLesson.fileName || t('lessonFile')}</p>
                                  <p className="text-xs text-slate-400">{getFileTypeLabel(selectedLesson.fileType, selectedLesson.fileName)}</p>
                                </div>
                              </div>
                              <a href={selectedLesson.fileUrl} download className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                                {t('download')}
                              </a>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Discussion Tab */}
                      {features?.enableCourseDiscussions && activeTab === 'discussion' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">{t('discussion')}</h4>
                          <div className="text-center py-12">
                            <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">forum</span>
                            <p className="text-slate-400">{t('discussionComingSoon')}</p>
                            <p className="text-xs text-slate-500 mt-2">{t('discussionComingSoonDesc')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">description</span>
                  <h3 className="text-xl font-semibold text-white mb-2">{t('noLessonSelected')}</h3>
                  <p className="text-slate-400">{t('noLessonSelectedDesc')}</p>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* Versa AI Chat Sidebar - Resizable */}
        {showAIChat && selectedLesson && (
          <aside 
            className="bg-gradient-to-b from-[#112240] via-[#0d1b2a] to-[#0a192f] border-l border-purple-500/20 flex flex-col shrink-0 shadow-2xl z-10 relative hidden xl:flex"
            style={{ width: `${chatWidth}px`, minWidth: '320px', maxWidth: '600px' }}
          >
            {/* Resize Handle */}
            <div 
              className={`absolute ${isRTL ? 'right-0' : 'left-0'} top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-purple-500/50 transition-colors group z-20`}
              onMouseDown={(e) => {
                e.preventDefault();
                const startX = e.clientX;
                const startWidth = chatWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = isRTL ? moveEvent.clientX - startX : startX - moveEvent.clientX;
                  const newWidth = Math.min(600, Math.max(320, startWidth + delta));
                  setChatWidth(newWidth);
                };
                
                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };
                
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
              }}
            >
              <div className={`absolute ${isRTL ? 'right-0.5' : 'left-0.5'} top-1/2 -translate-y-1/2 w-0.5 h-12 bg-purple-500/30 rounded-full group-hover:bg-purple-400 transition-colors`} />
            </div>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-blue-900/30 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="size-11 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 border-2 border-white/30 flex items-center justify-center text-white shadow-xl shadow-purple-500/30">
                    <span className="material-symbols-outlined text-xl animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>auto_awesome</span>
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-green-400 rounded-full border-2 border-[#0a192f] flex items-center justify-center animate-pulse">
                    <div className="h-2 w-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    Versa
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-[9px] font-black text-white rounded-full uppercase tracking-wide shadow-lg">
                      Pro
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">{t('onlineAndReady')}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setShowAIChat(false)}
                className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-white/5 transition-all hover:scale-110 active:scale-95"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <StudyBuddyChat 
                key={selectedLesson.id}
                lessonId={selectedLesson.id} 
                lessonTitle={selectedLesson.title || selectedLesson.fileName || t('thisLesson')} 
              />
            </div>
          </aside>
        )}

        {/* Show AI Button when hidden - Enhanced */}
        {!showAIChat && (
          <motion.button
            onClick={() => setShowAIChat(true)}
            className={`group fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 transition-all hover:scale-110 active:scale-95`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={springConfigs.bouncy}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* Pulsing glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 rounded-full opacity-40 blur-xl animate-pulse group-hover:opacity-60"></div>
            
            {/* Main button */}
            <div className="relative size-16 bg-gradient-to-br from-purple-500 via-pink-500 to-blue-500 hover:from-purple-600 hover:via-pink-600 hover:to-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center border-2 border-white/30">
              <span className="material-symbols-outlined text-3xl animate-pulse" style={{ fontVariationSettings: '"FILL" 1' }}>auto_awesome</span>
              
              {/* Online indicator */}
              <span className="absolute -top-1 -right-1 flex h-5 w-5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 border-2 border-white"></span>
              </span>
            </div>
            
            {/* Versa label */}
            <div className={`absolute ${isRTL ? '-right-2' : '-left-2'} -bottom-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide`}>
              Versa
            </div>
          </motion.button>
        )}
      </main>
    </motion.div>
  );
}
