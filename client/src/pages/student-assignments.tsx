import { useState } from "react";
import { useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { queryClient } from "@/lib/queryClient";
import NotificationBell from "@/components/NotificationBell";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { ListSkeleton } from "@/components/skeletons/ListSkeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiEndpoint } from '@/lib/config';
import { 
  pageVariants, 
  staggerContainer,
  staggerContainerFast, 
  fadeInUpVariants, 
  glowCardVariants, 
  buttonVariants,
  springConfigs 
} from "@/lib/animations";

interface APIAssignment {
  id: number;
  courseId: number;
  lessonId: number | null;
  title: string;
  description: string;
  type: string;
  dueDate: string;
  maxScore: number;
  isPublished: boolean;
  createdAt: string;
  courseTitle: string;
  courseDescription: string | null;
  submission: {
    id: number;
    content: string | null;
    filePath: string | null;
    fileName: string | null;
    submittedAt: string;
    status: string;
    score: number | null;
    feedback: string | null;
  } | null;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
}

// Fetch assignments from API
const fetchAssignments = async (token: string): Promise<APIAssignment[]> => {
  const response = await fetch(apiEndpoint('/api/assignments/student'), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch assignments');
  }
  
  return response.json();
};

export default function StudentAssignments() {
  const { t } = useTranslation('assignments');
  const { token, user } = useAuth();
  const { toast } = useToast();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  const [selectedAssignment, setSelectedAssignment] = useState<APIAssignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [isViewSubmissionDialogOpen, setIsViewSubmissionDialogOpen] = useState(false);

  // Fetch assignments
  const { data: apiAssignments = [], isLoading } = useQuery<APIAssignment[]>({
    queryKey: ['studentAssignments'],
    queryFn: () => fetchAssignments(token || ''),
    enabled: !!token,
    refetchInterval: 30000,
  });

  // Submit assignment mutation
  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, content, file }: { assignmentId: number; content: string; file: File | null }) => {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(apiEndpoint(`/api/assignments/${assignmentId}/submit`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to submit assignment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentAssignments'] });
      toast({
        title: t('assignmentSubmitted'),
        description: t('assignmentSubmittedDesc'),
      });
      setIsSubmitDialogOpen(false);
      setSubmissionContent("");
      setSubmissionFile(null);
    },
    onError: () => {
      toast({
        title: t('submissionFailed'),
        description: t('submissionFailedDesc'),
        variant: "destructive",
      });
    },
  });

  // Filter and sort - memoized for performance
  const filteredAssignments = useMemo(() => apiAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           assignment.courseTitle?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || 
                           (filterStatus === "todo" && !assignment.submission) ||
                           (filterStatus === "inprogress" && assignment.submission && assignment.submission.status !== 'graded') ||
                           (filterStatus === "graded" && assignment.submission?.status === 'graded') ||
                           (filterStatus === "overdue" && assignment.status === 'overdue');
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      } else if (sortBy === "course") {
        return (a.courseTitle || '').localeCompare(b.courseTitle || '');
      }
      return 0;
    }), [apiAssignments, searchQuery, filterStatus, sortBy]);

  // Calculate stats - memoized
  const stats = useMemo(() => ({
    total: apiAssignments.length,
    todo: apiAssignments.filter(a => !a.submission).length,
    inProgress: apiAssignments.filter(a => a.submission && a.submission.status !== 'graded').length,
    graded: apiAssignments.filter(a => a.submission?.status === 'graded').length,
    overdue: apiAssignments.filter(a => a.status === 'overdue').length,
  }), [apiAssignments]);

  // Get due soon assignment (first pending assignment due today or tomorrow) - memoized
  const dueSoonAssignment = useMemo(() => apiAssignments
    .filter(a => !a.submission)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    [0], [apiAssignments]);

  const handleSubmit = (assignment: APIAssignment) => {
    setSelectedAssignment(assignment);
    setIsSubmitDialogOpen(true);
  };

  const handleViewSubmission = (assignment: APIAssignment) => {
    setSelectedAssignment(assignment);
    setIsViewSubmissionDialogOpen(true);
  };

  const handleSubmitForm = () => {
    if (!selectedAssignment) return;
    submitMutation.mutate({
      assignmentId: selectedAssignment.id,
      content: submissionContent,
      file: submissionFile,
    });
  };

  const formatDueDate = useCallback((dueDate: string): string => {
    const due = new Date(dueDate);
    const now = new Date();
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('tomorrow');
    if (diffDays < 7 && diffDays > 0) return t('inDays', { count: diffDays });
    return due.toLocaleDateString();
  }, [t]);

  const getTimeRemaining = (dueDate: string): string => {
    const due = new Date(dueDate).getTime();
    const now = new Date().getTime();
    const diff = due - now;
    
    if (diff < 0) return t('overdue');
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const getIcon = useCallback((type?: string) => {
    if (!type) return 'assignment';
    switch(type.toLowerCase()) {
      case 'math': return 'functions';
      case 'history': return 'history_edu';
      case 'science': case 'physics': return 'science';
      case 'code': case 'programming': return 'code';
      case 'homework': return 'assignment';
      case 'quiz': return 'quiz';
      case 'project': return 'folder';
      case 'essay': return 'description';
      default: return 'assignment';
    }
  }, []);

  if (isLoading) {
    return (
      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50 dark:bg-background">
        <div className="max-w-6xl mx-auto">
          <ListSkeleton rows={6} />
        </div>
      </main>
    );
  }

  return (
    <>
      <style>{`
        .material-symbols-outlined {
          font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      {/* <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-20 sticky top-0">
        <div className="hidden md:flex max-w-md w-full">
          <label className="flex w-full items-center rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm h-12 px-4 transition-all focus-within:ring-2 focus-within:ring-secondary/20 dark:focus-within:ring-primary/50 focus-within:border-secondary dark:focus-within:border-primary">
            <span className="material-symbols-outlined text-slate-400 dark:text-slate-500">search</span>
            <input 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-none focus:ring-0 text-secondary dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-sm ml-2" 
              placeholder="Search assignments, courses..." 
              type="text"
            />
          </label>
        </div>
        <div className="flex items-center gap-4 ml-auto">
          <NotificationBell />
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-slate-200 dark:border-slate-700 shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDYNwQXmyG2cmcatoIpuxCXAUKYCkLbWmRVeIGDWXjeCjESv3EokpknZEHjczDP4AdgN3rMICWR_zdgzwjtA_69iQJV8c5jILUWhbB9P4gD0X6kfDo-LB0d1vSbbSTVCIqUF37hfDVWsHw4GpG27-q_56SRmL9dR8T4pYRMv9q9t206j7AQvKp1b7U0URKhDT08_ycy5iw2NiXi0vntQjt-DuXa8_10jrWNwJ8p9vwTEEI6vgrioFM-oohZvAqqcfDDrEuOkGYG-So")' }}></div>
        </div>
      </header> */}

      <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-slate-50 dark:bg-background">
        <motion.div 
          className="max-w-6xl mx-auto space-y-10"
          variants={pageVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div className="space-y-6" variants={fadeInUpVariants}>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <motion.div variants={fadeInUpVariants}>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-secondary dark:text-white mb-2 font-display">{t('myAssignments')}</h1>
                <p className="text-slate-600 dark:text-slate-300 text-lg">{t('trackProgress')}</p>
              </motion.div>
              <motion.div 
                className="flex gap-2"
                variants={fadeInUpVariants}
              >
                <motion.button 
                  onClick={() => toast({ title: t('selectAssignment'), description: t('selectAssignmentDesc') })}
                  className="bg-secondary dark:bg-primary text-white dark:text-secondary font-bold px-6 py-2.5 rounded-full text-sm hover:brightness-110 transition-all shadow-lg shadow-secondary/20 dark:shadow-primary/20 flex items-center gap-2"
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  {t('submitExternalWork')}
                </motion.button>
              </motion.div>
            </div>

            <motion.div 
              className="flex flex-col xl:flex-row gap-4 justify-between xl:items-center"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <motion.div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar" variants={fadeInUpVariants}>
                <motion.button 
                  onClick={() => setFilterStatus("all")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors font-medium text-sm ${
                    filterStatus === "all"
                      ? 'bg-secondary dark:bg-white text-white dark:text-secondary shadow-md shadow-secondary/10'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
>
                  {t('all')}
                </motion.button>
                <motion.button
                  onClick={() => setFilterStatus("todo")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors text-sm ${
                    filterStatus === "todo"
                      ? 'bg-secondary dark:bg-white text-white dark:text-secondary shadow-md shadow-secondary/10 font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {t('toDo')}
                  <span className="bg-slate-100 dark:bg-white/10 text-xs px-1.5 py-0.5 rounded-md ml-1 font-semibold">{stats.todo}</span>
                </motion.button>
                <motion.button 
                  onClick={() => setFilterStatus("inprogress")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors text-sm ${
                    filterStatus === "inprogress"
                      ? 'bg-secondary dark:bg-white text-white dark:text-secondary shadow-md shadow-secondary/10 font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {t('inProgress')}
                  <span className="bg-slate-100 dark:bg-white/10 text-xs px-1.5 py-0.5 rounded-md ml-1 font-semibold">{stats.inProgress}</span>
                </motion.button>
                <motion.button 
                  onClick={() => setFilterStatus("graded")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors text-sm ${
                    filterStatus === "graded"
                      ? 'bg-secondary dark:bg-white text-white dark:text-secondary shadow-md shadow-secondary/10 font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
>
                  {t('graded')}
                </motion.button>
                <motion.button
                  onClick={() => setFilterStatus("overdue")}
                  className={`flex h-9 shrink-0 items-center justify-center gap-x-2 rounded-full px-5 transition-colors text-sm ${
                    filterStatus === "overdue"
                      ? 'bg-secondary dark:bg-white text-white dark:text-secondary shadow-md shadow-secondary/10 font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 shadow-sm'
                  }`}
                  variants={buttonVariants}
                  whileHover="hover"
                  whileTap="tap"
                >
                  {t('overdue')}
                  {stats.overdue > 0 && (
                    <span className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs px-1.5 py-0.5 rounded-md ml-1 font-semibold">{stats.overdue}</span>
                  )}
                </motion.button>
              </motion.div>
              <motion.div className="hidden md:block w-72" variants={fadeInUpVariants}>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[20px]">filter_list</span>
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-sm rounded-lg pl-10 pr-4 py-2.5 focus:ring-1 focus:ring-secondary dark:focus:ring-primary focus:border-secondary dark:focus:border-primary appearance-none cursor-pointer shadow-sm"
                  >
                    <option value="dueDate">{t('sortByDueDate')}</option>
                    <option value="course">{t('sortByCourse')}</option>
                    <option value="status">{t('sortByStatus')}</option>
                  </select>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>

          {dueSoonAssignment && (
            <motion.section
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springConfigs.gentle}
            >
              <h3 className="text-secondary dark:text-white font-bold text-lg mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary dark:text-primary">priority_high</span>
                {t('dueSoon')}
              </h3>
              <motion.div 
                className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[#001f3f] to-[#0a192f] dark:from-[#112240] dark:to-[#0a192f] border border-slate-200/20 dark:border-slate-700 p-6 md:p-8 flex flex-col md:flex-row justify-between gap-8 group shadow-2xl"
                variants={glowCardVariants}
                whileHover="hover"
              >
                <div className="absolute -right-20 -top-20 size-64 bg-primary/20 rounded-full blur-3xl pointer-events-none group-hover:bg-primary/30 transition-all duration-700"></div>
                <div className="flex flex-col justify-between relative z-10">
                  <div>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 text-red-200 dark:text-red-300 text-xs font-bold uppercase tracking-wider mb-4 border border-red-500/30">
                      <span className="size-2 rounded-full bg-red-400 animate-pulse"></span>
                      {t('due')} {formatDueDate(dueSoonAssignment.dueDate)}
                    </span>
                    <h2 className="text-3xl font-bold text-white mb-2">{dueSoonAssignment.title}</h2>
                    <p className="text-slate-300 text-sm md:text-base max-w-xl">{dueSoonAssignment.description}</p>
                  </div>
                  <div className="flex items-center gap-6 mt-8">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-lg bg-white/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">{getIcon(dueSoonAssignment.type)}</span>
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium">{dueSoonAssignment.courseTitle}</p>
                        <p className="text-slate-400 text-xs">{dueSoonAssignment.type}</p>
                      </div>
                    </div>
                    <div className="h-8 w-px bg-white/20"></div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs">{t('points')}</span>
                      <span className="text-white text-sm font-medium">{dueSoonAssignment.maxScore} {t('points')}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col justify-end items-end gap-4 min-w-[200px] relative z-10">
                  <div className="text-right">
                    <p className="text-slate-400 text-xs mb-1">{t('timeRemaining')}</p>
                    <p className="text-3xl font-mono text-white font-bold tracking-widest text-shadow-sm">{getTimeRemaining(dueSoonAssignment.dueDate)}</p>
                  </div>
                  <motion.button 
                    onClick={() => handleSubmit(dueSoonAssignment)}
                    className="w-full md:w-auto bg-primary hover:bg-[#ffe033] text-secondary font-bold py-3 px-8 rounded-full transition-all shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] flex items-center justify-center gap-2"
                    variants={buttonVariants}
                    whileHover="hover"
                    whileTap="tap"
                  >
                    {t('startNow')}
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </motion.button>
                </div>
              </motion.div>
            </motion.section>
          )}

          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...springConfigs.gentle, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-secondary dark:text-white font-bold text-lg">{t('comingUpThisWeek')}</h3>
              <Link href="/student/calendar" className="text-secondary dark:text-primary text-sm font-medium hover:underline flex items-center gap-1">
                {t('viewCalendar')}
                <span className="material-symbols-outlined text-[16px]">calendar_month</span>
              </Link>
            </div>
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
              variants={staggerContainerFast}
              initial="initial"
              animate="animate"
            >
              {filteredAssignments.slice(0, 6).map((assignment, index) => (
                <motion.div 
                  key={assignment.id} 
                  className={`bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-300 dark:border-slate-600 hover:border-secondary/50 dark:hover:border-primary/50 transition-all group flex flex-col justify-between h-full shadow-md hover:shadow-lg ring-1 ring-slate-900/5 ${assignment.submission?.status === 'graded' ? 'opacity-80 hover:opacity-100' : ''}`}
                  variants={glowCardVariants}
                  whileHover="hover"
                  custom={index}
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                          <span className="material-symbols-outlined">{getIcon(assignment.type)}</span>
                        </div>
                        <div>
                          <p className="text-slate-600 dark:text-slate-300 text-xs font-bold uppercase tracking-wide">{assignment.courseTitle}</p>
                          <p className="text-secondary dark:text-white font-bold text-lg">{assignment.title}</p>
                        </div>
                      </div>
                      <button className="text-slate-400 hover:text-secondary dark:hover:text-white">
                        <span className="material-symbols-outlined">more_vert</span>
                      </button>
                    </div>
                    <p className="text-slate-700 dark:text-slate-200 text-sm mb-4 line-clamp-2 font-medium">{assignment.description}</p>
                  </div>
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-700/50">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 text-xs font-bold">
                        <span className="material-symbols-outlined text-[16px]">schedule</span>
                        {t('due')} {formatDueDate(assignment.dueDate)}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-md font-bold ${
                        assignment.submission?.status === 'graded' 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800'
                          : assignment.submission
                          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                          : 'bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-white border border-slate-200 dark:border-slate-500'
                      }`}>
                        {assignment.submission?.status === 'graded' ? t('done') : assignment.submission ? t('inProgress') : t('notStarted')}
                      </span>
                    </div>
                    {assignment.submission?.status === 'graded' && assignment.submission.score !== null ? (
                      <div className="text-center py-2 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                        <p className="text-sm font-bold text-green-700 dark:text-green-300">
                          {t('score')}: {assignment.submission.score}/{assignment.maxScore}
                        </p>
                      </div>
                    ) : assignment.submission ? (
                      <motion.button 
                        onClick={() => handleViewSubmission(assignment)}
                        className="w-full bg-slate-50 dark:bg-white/5 text-secondary dark:text-white border border-slate-300 dark:border-slate-600 font-bold py-2 rounded-lg text-sm hover:bg-slate-100 dark:hover:bg-white/10 transition-colors shadow-sm"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {t('viewSubmission')}
                      </motion.button>
                    ) : (
                      <motion.button 
                        onClick={() => handleSubmit(assignment)}
                        className="w-full bg-secondary dark:bg-white text-white dark:text-secondary font-bold py-2 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-md"
                        variants={buttonVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        {t('startAssignment')}
                      </motion.button>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.section>
        </motion.div>
      </main>

      {/* Submit Assignment Dialog */}
      <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('submitAssignment')}</DialogTitle>
            <DialogDescription className="text-base">
              {t('submitFor', { title: selectedAssignment?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <p className="font-semibold text-lg text-blue-900 dark:text-blue-100">{selectedAssignment?.title}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">{selectedAssignment?.courseTitle}</p>
                </div>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                  {selectedAssignment?.maxScore} {t('points')}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-blue-700 dark:text-blue-300">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">calendar_today</span>
                  {t('due')}: {selectedAssignment && formatDueDate(selectedAssignment.dueDate)}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="content" className="text-base font-medium">
                {t('submissionContent')}
              </Label>
              <Textarea
                id="content"
                placeholder={t('writeSubmission')}
                value={submissionContent}
                onChange={(e) => setSubmissionContent(e.target.value)}
                className="min-h-[150px] resize-none bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-700"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file" className="text-base font-medium">
                {t('attachFile')}
              </Label>
              <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-lg p-6 text-center hover:border-secondary dark:hover:border-primary transition-colors cursor-pointer bg-slate-50 dark:bg-slate-700/50">
                <input
                  type="file"
                  id="file"
                  onChange={(e) => setSubmissionFile(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="file" className="cursor-pointer">
                  <span className="material-symbols-outlined text-4xl text-slate-400 dark:text-slate-500 mb-2 block">upload_file</span>
                  <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
                    {submissionFile ? submissionFile.name : t('clickToUpload')}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    PDF, DOC, DOCX, ZIP (max 10MB)
                  </p>
                </label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsSubmitDialogOpen(false)}
              className="mr-2"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmitForm}
              disabled={submitMutation.isPending || (!submissionContent && !submissionFile)}
              className="bg-primary hover:bg-primary/90 text-black font-bold"
            >
              {submitMutation.isPending ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
                  {t('submitting')}
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">send</span>
                  {t('submitAssignment')}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog open={isViewSubmissionDialogOpen} onOpenChange={setIsViewSubmissionDialogOpen}>
        <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl">{t('submissionDetails')}</DialogTitle>
            <DialogDescription className="text-base">
              {t('reviewSubmission', { title: selectedAssignment?.title ?? '' })}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('status')}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                  selectedAssignment?.submission?.status === 'graded' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  {selectedAssignment?.submission?.status || t('pending')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('submittedOn')}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-white">
                  {selectedAssignment?.submission?.submittedAt ? new Date(selectedAssignment.submission.submittedAt).toLocaleString() : '-'}
                </span>
              </div>
            </div>

            {selectedAssignment?.submission?.content && (
              <div className="space-y-2">
                <Label className="text-base font-medium">{t('submissionContent')}</Label>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700 text-sm whitespace-pre-wrap">
                  {selectedAssignment.submission.content}
                </div>
              </div>
            )}

            {selectedAssignment?.submission?.fileName && (
              <div className="space-y-2">
                <Label className="text-base font-medium">{t('attachedFile')}</Label>
                <div className="flex items-center gap-3 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
                  <span className="material-symbols-outlined text-blue-500">description</span>
                  <span className="flex-1 text-sm font-medium truncate">{selectedAssignment.submission.fileName}</span>
                  <Button variant="ghost" size="sm" className="text-blue-500 hover:text-blue-600">
                    {t('download')}
                  </Button>
                </div>
              </div>
            )}

            {selectedAssignment?.submission?.status === 'graded' && (
              <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">{t('grade')}</Label>
                  <span className="text-xl font-bold text-green-600 dark:text-green-400">
                    {selectedAssignment.submission.score} / {selectedAssignment.maxScore}
                  </span>
                </div>
                {selectedAssignment.submission.feedback && (
                  <div className="space-y-2">
                    <Label className="text-base font-medium">{t('feedback')}</Label>
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200">
                      {selectedAssignment.submission.feedback}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setIsViewSubmissionDialogOpen(false)}>
              {t('close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

