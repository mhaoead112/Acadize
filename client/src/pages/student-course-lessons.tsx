import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import LessonViewer from "@/components/LessonViewer";
import StudyBuddyChat from "@/components/StudyBuddyChat";
import NotificationBell from "@/components/NotificationBell";
import { apiEndpoint } from "@/lib/config";
import StudentLayout from "@/components/StudentLayout";
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
  const [match, params] = useRoute("/student/courses/:courseId/lessons");
  const courseId = params?.courseId as string | undefined;
  const { getAuthHeaders, user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [viewedLessons, setViewedLessons] = useState<Set<string>>(new Set());
  const [showAIChat, setShowAIChat] = useState<boolean>(true);
  const [bookmarkedLessons, setBookmarkedLessons] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'discussion'>('overview');
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");

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
      return 'Video';
    }
    if (type.includes('image') || name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg')) {
      return 'Image';
    }
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return 'PDF';
    }
    return 'Document';
  }, []);

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
        if (!res.ok) throw new Error("Failed to load lessons");
        const data = await res.json();
        const items = data?.lessons || [];
        const lessonsWithUrls = items.map((lesson: Lesson) => ({
          ...lesson,
          fileUrl: apiEndpoint(`/api/lessons/${lesson.id}/download`)
        }));
        setLessons(lessonsWithUrls);
        if (lessonsWithUrls.length > 0) {
          setSelectedLesson(lessonsWithUrls[0]);
          setSelectedIndex(0);
        }
      } catch (err: any) {
        setError(err?.message || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId]);

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
    
    try {
      const authHeaders = getAuthHeaders();
      const headers = {
        ...(authHeaders as any).Authorization ? authHeaders : {},
        'Content-Type': 'application/json',
      };
      
      await fetch(apiEndpoint(`/api/progress`), {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseId,
          lessonId: selectedLesson.id,
          completed: true,
        }),
      });
      
      setViewedLessons(prev => {
        const newSet = new Set(Array.from(prev));
        newSet.add(selectedLesson.id);
        return newSet;
      });
    } catch (err) {
      console.error('Failed to mark lesson as complete:', err);
    }
  };

  const progressPercentage = useMemo(() => 
    lessons.length > 0 
      ? Math.round((viewedLessons.size / lessons.length) * 100) 
      : 0
  , [lessons.length, viewedLessons.size]);

  if (isLoading) {
    return (
      <div className="font-display bg-slate-50 dark:bg-background text-slate-900 dark:text-white overflow-hidden h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="font-display bg-slate-50 dark:bg-[#0a192f] text-slate-900 dark:text-white overflow-hidden h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-400 dark:text-slate-500 mb-4 block">school</span>
          <p className="text-slate-600 dark:text-slate-300 mb-6">Please sign in to view class lessons.</p>
          <Link href="/login">
            <button className="px-6 py-3 bg-primary text-black rounded-lg font-bold hover:bg-primary/90 transition-colors shadow-lg">
              Sign In
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <StudentLayout>
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
              <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              <span className="font-medium">Back to Course</span>
            </motion.button>
          </Link>
          <div className="border-l border-slate-300 dark:border-white/20 pl-4">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">{course?.title || 'Course Lessons'}</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">{lessons.length} lessons</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg">
            <span className="material-symbols-outlined text-primary text-[18px]">check_circle</span>
            <span className="text-sm text-slate-700 dark:text-slate-300">
              <span className="font-bold text-primary">{progressPercentage}%</span> Complete
            </span>
          </div>
        </div>
      </motion.header>

      <main className="flex flex-1 overflow-hidden">
        {/* Lessons Sidebar */}
        <motion.aside 
          className="w-80 bg-white dark:bg-[#112240] border-r border-slate-200 dark:border-white/10 flex flex-col shrink-0 transition-all duration-300 hidden md:flex"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={springConfigs.gentle}
        >
          <div className="p-5 border-b border-slate-200 dark:border-white/10">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mb-1">{course?.title || 'Course Lessons'}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">{lessons.length} lesson{lessons.length !== 1 ? 's' : ''} available</p>
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
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex-shrink-0">
                      {isSelected ? (
                        <span className="material-symbols-outlined text-primary text-[18px]">play_circle</span>
                      ) : (
                        <span className={`material-symbols-outlined text-[18px] ${isViewed ? 'text-green-400' : 'text-slate-400 dark:text-slate-600'}`}>
                          {isViewed ? 'check_circle' : 'circle'}
                        </span>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>
                        {lesson.title || lesson.fileName || 'Untitled'}
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
                      {viewedLessons.has(lesson.id) && !isSelected && (
                        <span className="material-symbols-outlined text-green-400 text-[16px]">check_circle</span>
                      )}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </motion.div>
          <div className="p-4 border-t border-slate-200 dark:border-white/10">
            <Link href={`/student/courses/${courseId}`}>
              <motion.button 
                className="w-full flex items-center justify-center gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 py-2.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white transition-colors text-sm font-medium"
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
              >
                <span className="material-symbols-outlined text-[18px]">arrow_back</span>
                Back to Course
              </motion.button>
            </Link>
          </div>
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
                {course?.title || 'Course'}
              </Link>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors cursor-pointer">Lesson {selectedIndex + 1}</span>
              <span className="text-slate-300 dark:text-white/20">/</span>
              <span className="text-primary font-medium px-2 py-0.5 bg-primary/10 border border-primary/20 rounded text-xs uppercase tracking-wide">
                {selectedLesson ? getFileTypeLabel(selectedLesson.fileType, selectedLesson.fileName) : 'Content'}
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
                {selectedLesson && bookmarkedLessons.has(selectedLesson.id) ? 'Saved' : 'Save'}
              </button>
              <button 
                onClick={markAsComplete}
                disabled={selectedLesson ? viewedLessons.has(selectedLesson.id) : true}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg shadow-md shadow-black/20 transition-all text-sm font-bold ${
                  selectedLesson && viewedLessons.has(selectedLesson.id)
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-primary hover:bg-primary/90 text-black'
                }`}
              >
                {selectedLesson && viewedLessons.has(selectedLesson.id) ? 'Completed' : 'Mark as Complete'}
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
                      {selectedLesson.title || selectedLesson.fileName || 'Lesson Content'}
                    </h1>
                    <p className="text-slate-400 text-lg">Lesson {selectedIndex + 1} of {lessons.length}</p>
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
                        Overview
                      </button>
                      <button 
                        onClick={() => setActiveTab('resources')}
                        className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                          activeTab === 'resources' 
                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Resources
                      </button>
                      <button 
                        onClick={() => setActiveTab('discussion')}
                        className={`px-6 py-4 font-semibold text-sm whitespace-nowrap transition-all ${
                          activeTab === 'discussion' 
                            ? 'text-primary border-b-2 border-primary bg-primary/5' 
                            : 'text-slate-300 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        Discussion
                      </button>
                    </div>
                    <div className="p-6">
                      {/* Overview Tab */}
                      {activeTab === 'overview' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">About this lesson</h4>
                          <p className="text-slate-300 leading-relaxed mb-6">
                            Learn key concepts and practical applications in this lesson. Take your time to review the material and use the AI Study Buddy for any questions.
                          </p>
                          <h4 className="text-lg font-bold text-white mb-3">Quick Actions</h4>
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
                          <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                          Previous Lesson
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
                          Next Lesson
                          <span className="material-symbols-outlined text-[20px]">arrow_forward</span>
                        </button>
                          </div>
                        </>
                      )}

                      {/* Resources Tab */}
                      {activeTab === 'resources' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">Lesson Resources</h4>
                          <p className="text-slate-300 mb-4">Download and access additional materials for this lesson.</p>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between p-4 bg-[#0a192f]/50 border border-white/10 rounded-lg hover:border-primary/30 transition-colors">
                              <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-primary text-2xl">description</span>
                                <div>
                                  <p className="font-medium text-white">{selectedLesson.fileName || 'Lesson File'}</p>
                                  <p className="text-xs text-slate-400">{getFileTypeLabel(selectedLesson.fileType, selectedLesson.fileName)}</p>
                                </div>
                              </div>
                              <a href={selectedLesson.fileUrl} download className="px-4 py-2 bg-primary/10 border border-primary/30 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm font-medium">
                                Download
                              </a>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Discussion Tab */}
                      {activeTab === 'discussion' && (
                        <>
                          <h4 className="text-lg font-bold text-white mb-3">Discussion</h4>
                          <div className="text-center py-12">
                            <span className="material-symbols-outlined text-5xl text-slate-600 mb-3 block">forum</span>
                            <p className="text-slate-400">Discussion feature coming soon!</p>
                            <p className="text-xs text-slate-500 mt-2">Connect with classmates and instructors to discuss this lesson.</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-20">
                  <span className="material-symbols-outlined text-6xl text-slate-600 mb-4 block">description</span>
                  <h3 className="text-xl font-semibold text-white mb-2">No Lesson Selected</h3>
                  <p className="text-slate-400">Choose a lesson from the sidebar to view its content.</p>
                </div>
              )}
            </div>
          </div>
        </motion.section>

        {/* AI Study Buddy Sidebar - Enhanced */}
        {showAIChat && selectedLesson && (
          <aside className="w-96 bg-gradient-to-b from-[#112240] via-[#0d1b2a] to-[#0a192f] border-l border-purple-500/20 flex flex-col shrink-0 shadow-2xl z-10 relative hidden xl:flex">
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
                    AI Study Buddy
                    <span className="px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-[9px] font-black text-white rounded-full uppercase tracking-wide shadow-lg">
                      Pro
                    </span>
                  </h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div className="h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-green-400 font-bold uppercase tracking-wider">Online & Ready</p>
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
                lessonTitle={selectedLesson.title || selectedLesson.fileName || 'this lesson'} 
              />
            </div>
          </aside>
        )}

        {/* Show AI Button when hidden - Enhanced */}
        {!showAIChat && (
          <motion.button
            onClick={() => setShowAIChat(true)}
            className="group fixed bottom-6 right-6 z-50 transition-all hover:scale-110 active:scale-95"
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
            
            {/* AI label */}
            <div className="absolute -left-2 -bottom-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg uppercase tracking-wide">
              AI
            </div>
          </motion.button>
        )}
      </main>
    </motion.div>
    </StudentLayout>
  );
}
