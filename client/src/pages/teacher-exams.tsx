import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { 
  fadeInVariants, 
  staggerContainer,
  cardVariants, 
  buttonVariants,
  springConfigs
} from '@/lib/animations';
import { useLocation } from 'wouter';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import TeacherLayout from '@/components/TeacherLayout';

// The project uses Material Symbols via <span className="material-symbols-outlined">
// No need for @mui/icons-material package


// Add custom scrollbar styles as a constant but better to handle in CSS if possible.
// I'll keep the styles as they are but localized or moved to index.css if not there.


// ============================================================================
// TYPES
// ============================================================================

interface ExamStats {
  totalAttempts: number;
  completedAttempts: number;
  inProgressAttempts: number;
  flaggedAttempts: number;
  averageScore: number | null;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  courseId: string;
  courseName: string;
  scheduledStart: string | null;
  scheduledEnd: string | null;
  duration: number;
  totalPoints: number;
  passingScore: number;
  antiCheatEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  stats: ExamStats;
}

interface FlaggedAttempt {
  id: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  percentage: number | null;
  integrityScore: number | null;
  riskScore: number;
  riskLevel: string;
  requiresManualReview: boolean;
  reviewPriority: number;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TeacherExams() {
  const { t } = useTranslation('teacher');
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders } = useAuth();
  
  const [exams, setExams] = useState<Exam[]>([]);
  const [flaggedAttempts, setFlaggedAttempts] = useState<FlaggedAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [examsResponse, flaggedResponse] = await Promise.all([
        fetch(apiEndpoint('/api/teacher/exams'), {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
        fetch(apiEndpoint('/api/teacher/attempts/flagged'), {
          headers: getAuthHeaders(),
          credentials: 'include',
        }),
      ]);

      if (!examsResponse.ok) {
        throw new Error('Failed to fetch exams');
      }

      if (!flaggedResponse.ok) {
        throw new Error('Failed to fetch flagged attempts');
      }

      const examsData = await examsResponse.json();
      const flaggedData = await flaggedResponse.json();

      setExams(Array.isArray(examsData) ? examsData : []);
      setFlaggedAttempts(Array.isArray(flaggedData) ? flaggedData : []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message || 'Failed to load exam data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  // Calculate KPI stats
  const activeExams = exams.filter(e => e.status === 'active').length;
  const scheduledExams = exams.filter(e => e.status === 'scheduled').length;
  const totalFlagged = flaggedAttempts.length;
  
  const allGradedAttempts = exams.flatMap(e => 
    e.stats.averageScore !== null ? [e.stats.averageScore] : []
  );
  const avgClassScore = allGradedAttempts.length > 0
    ? Math.round(allGradedAttempts.reduce((sum, score) => sum + score, 0) / allGradedAttempts.length)
    : 0;

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20';
      case 'draft':
        return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20';
      default:
        return 'bg-navy/10 text-navy/60 dark:text-slate-400 border-navy/20';
    }
  };


  const getRiskLevelColor = (level: string) => {
    switch (level.toLowerCase()) {
      case 'critical':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      case 'low':
        return 'text-green-400';
      default:
        return 'text-gray-400';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getNextScheduledExam = () => {
    const scheduled = exams
      .filter(e => e.scheduledStart && e.status === 'scheduled')
      .sort((a, b) => new Date(a.scheduledStart!).getTime() - new Date(b.scheduledStart!).getTime());
    
    if (scheduled.length === 0) return 'None';
    const nextDate = new Date(scheduled[0].scheduledStart!);
    return nextDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <motion.div 
            className="size-16 border-4 border-gold/20 border-t-gold rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <p className="text-slate-500 dark:text-slate-400 font-medium animate-pulse">Loading exam intelligence...</p>
        </div>
      </TeacherLayout>
    );
  }

  if (error) {
    return (
      <TeacherLayout>
        <div className="max-w-7xl mx-auto p-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-5xl text-red-500 mb-4 block">error</span>
            <p className="text-red-500 font-bold text-xl mb-2">Sync Error</p>
            <p className="text-red-600/80 dark:text-red-400/80 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-8 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-all font-bold shadow-lg shadow-red-500/20"
            >
              Retry Connection
            </button>
          </motion.div>
        </div>
      </TeacherLayout>
    );
  }


  return (
    <TeacherLayout>
      <div className="w-full bg-slate-50 dark:bg-navy-dark min-h-screen transition-colors duration-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12 space-y-8 lg:space-y-12 pb-24">
          
          {/* Header Section */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 lg:gap-8"
          >
            <motion.div variants={fadeInVariants} className="space-y-4">
              <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-navy dark:text-white leading-[1.1]">
                {t('examIntelligence')}
              </h1>
              <p className="text-slate-600 dark:text-slate-400 text-lg lg:text-xl max-w-2xl leading-relaxed">
                Empower your classroom with data-driven assessments. Monitor live sessions and review flagged activities in real-time.
              </p>
            </motion.div>
            
            <motion.div variants={fadeInVariants} className="flex flex-wrap items-center gap-3 lg:gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white dark:bg-navy/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-navy dark:hover:text-gold hover:border-gold/50 transition-all text-sm font-bold shadow-sm disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {refreshing ? 'Syncing...' : 'Sync Data'}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation('/teacher/exams/create')}
                className="flex items-center gap-2 px-8 py-3.5 rounded-xl bg-gold hover:bg-gold-light text-navy text-base font-black shadow-[0_8px_20px_-4px_rgba(234,179,8,0.4)] hover:shadow-[0_12px_24px_-4px_rgba(234,179,8,0.5)] transition-all transform"
              >
                <span className="material-symbols-outlined text-[22px] font-bold">add_circle</span>
                New Assessment
              </motion.button>
            </motion.div>
          </motion.div>

          {/* KPI Dashboard Grid */}
          <motion.div 
            variants={staggerContainer}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6"
          >
            {[
              { label: 'Active Sessions', value: activeExams, icon: 'timer', color: 'green', suffix: 'Live' },
              { label: 'Review Required', value: totalFlagged, icon: 'security', color: 'orange', suffix: 'Alert' },
              { label: 'Class Average', value: `${avgClassScore}%`, icon: 'analytics', color: 'blue', suffix: 'Score' },
              { label: 'Upcoming', value: scheduledExams, icon: 'calendar_today', color: 'purple', suffix: getNextScheduledExam() }
            ].map((kpi, idx) => (
              <motion.div
                key={kpi.label}
                variants={cardVariants}
                whileHover={{ y: -8, scale: 1.02 }}
                className="relative overflow-hidden group bg-white dark:bg-navy/40 backdrop-blur-xl rounded-3xl p-6 border border-slate-200 dark:border-white/10 shadow-sm hover:shadow-2xl transition-all duration-500"
              >
                {/* Decorative background glow */}
                <div className={`absolute -right-8 -top-8 size-32 bg-${kpi.color}-500/10 rounded-full blur-3xl group-hover:bg-${kpi.color}-500/20 transition-colors`} />
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-3 rounded-2xl bg-${kpi.color}-500/10 text-${kpi.color}-600 dark:text-${kpi.color}-400 border border-${kpi.color}-500/20`}>
                      <span className="material-symbols-outlined text-[24px]">{kpi.icon}</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 group-hover:border-${kpi.color}-500/30 transition-colors`}>
                      {kpi.suffix}
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-4xl font-black text-navy dark:text-white mb-1 group-hover:text-gold transition-colors">
                      {kpi.value}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm font-bold tracking-tight">
                      {kpi.label}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 lg:gap-10">
            {/* Detailed Assessments Table */}
            <motion.div 
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              className="xl:col-span-8 space-y-6"
            >
              <div className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 dark:shadow-none">
                <div className="p-6 lg:p-8 border-b border-slate-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div>
                    <h3 className="text-xl lg:text-2xl font-black text-navy dark:text-white flex items-center gap-3">
                      <div className="size-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold">
                        <span className="material-symbols-outlined">quiz</span>
                      </div>
                      Assessment List
                    </h3>
                  </div>
                  
                  <div className="relative group">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 group-focus-within:text-gold transition-colors">
                      <span className="material-symbols-outlined text-[20px]">search</span>
                    </span>
                    <input
                      className="bg-slate-100/50 dark:bg-navy-dark/50 border border-slate-200 dark:border-white/10 rounded-2xl text-sm py-3 pl-12 pr-6 w-full sm:w-64 focus:ring-4 focus:ring-gold/10 focus:border-gold focus:bg-white dark:focus:bg-navy-dark transition-all outline-none text-navy dark:text-white font-medium"
                      placeholder="Locate an exam..."
                      type="text"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto overflow-y-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-500 dark:text-slate-400 text-[10px] uppercase font-black tracking-[0.15em] border-b border-slate-100 dark:border-white/5">
                        <th className="px-8 py-5">Assessment</th>
                        <th className="px-6 py-5">Course</th>
                        <th className="px-6 py-5">Status</th>
                        <th className="px-6 py-5">Volume</th>
                        <th className="px-8 py-5 text-right">Control</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                      {exams.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-8 py-20 lg:py-32 text-center">
                            <motion.div 
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="flex flex-col items-center max-w-sm mx-auto"
                            >
                              <div className="size-24 rounded-full bg-slate-50 dark:bg-navy-dark flex items-center justify-center mb-6 shadow-inner">
                                <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-navy/50">inbox</span>
                              </div>
                              <h4 className="text-xl font-black text-navy dark:text-white mb-2">No Assessments Yet</h4>
                              <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
                                Ready to challenge your students? Design your first innovative assessment in seconds.
                              </p>
                              <button
                                onClick={() => setLocation('/teacher/exams/create')}
                                className="w-full py-4 bg-gold hover:bg-gold-light text-navy font-black rounded-2xl shadow-xl shadow-gold/20 transition-all"
                              >
                                Draft New Exam
                              </button>
                            </motion.div>
                          </td>
                        </tr>
                      ) : (
                        exams.map((exam, idx) => (
                          <motion.tr 
                            key={exam.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all duration-300"
                          >
                            <td className="px-8 py-6">
                              <div className="space-y-1">
                                <div className="font-black text-navy dark:text-white text-base group-hover:text-gold transition-colors">{exam.title}</div>
                                <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">
                                  <span className="flex items-center gap-1.5 p-1 rounded-md bg-slate-100 dark:bg-white/5">
                                    <span className="material-symbols-outlined text-[14px]">timer</span>
                                    {exam.duration} Min
                                  </span>
                                  <span className="flex items-center gap-1.5 p-1 rounded-md bg-slate-100 dark:bg-white/5">
                                    <span className="material-symbols-outlined text-[14px]">stars</span>
                                    {exam.totalPoints} Pts
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <span className="px-3 py-1.5 rounded-xl bg-navy/5 dark:bg-white/10 text-xs font-black text-navy/70 dark:text-slate-200 border border-navy/10 dark:border-white/10 uppercase tracking-tight">
                                {exam.courseName}
                              </span>
                            </td>
                            <td className="px-6 py-6 font-primary">
                              <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusStyle(exam.status)}`}>
                                <div className={`size-1.5 rounded-full ${
                                  exam.status === 'active' ? 'bg-green-500 animate-pulse' :
                                  exam.status === 'scheduled' ? 'bg-blue-500' :
                                  exam.status === 'completed' ? 'bg-purple-500' : 'bg-slate-500'
                                }`} />
                                {exam.status}
                              </div>
                            </td>
                            <td className="px-6 py-6">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                  <span className="material-symbols-outlined text-[16px]">groups</span>
                                  <span className="text-navy dark:text-white font-black">{exam.stats.totalAttempts}</span>
                                  <span>Attempts</span>
                                </div>
                                {exam.stats.averageScore !== null && (
                                  <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    <span className="material-symbols-outlined text-[16px] text-green-500">trending_up</span>
                                    <span className="text-navy dark:text-white font-black">{exam.stats.averageScore}%</span>
                                    <span>Average</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <motion.button
                                whileHover={{ scale: 1.1, rotate: 90 }}
                                whileTap={{ scale: 0.9 }}
                                onClick={() => setLocation(`/teacher/exams/${exam.id}`)}
                                className="size-10 inline-flex items-center justify-center rounded-xl bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 hover:bg-gold hover:text-navy dark:hover:bg-gold transition-all"
                              >
                                <span className="material-symbols-outlined text-[20px]">settings_suggest</span>
                              </motion.button>
                            </td>
                          </motion.tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>

            {/* AI Fraud & Risk Monitor Sidebar */}
            <motion.div 
              variants={fadeInVariants}
              initial="initial"
              animate="animate"
              className="xl:col-span-4 space-y-8"
            >
              <section className="bg-white dark:bg-navy/40 backdrop-blur-3xl border border-slate-200 dark:border-white/10 rounded-[2.5rem] p-8 shadow-2xl space-y-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-xl lg:text-2xl font-black text-navy dark:text-white flex items-center gap-3">
                      Risk Monitor
                      <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]"></span>
                      </span>
                    </h3>
                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Live Security Feed</p>
                  </div>
                  <div className="size-12 rounded-2xl bg-orange-500 text-navy font-black flex items-center justify-center shadow-lg shadow-orange-500/20">
                    {flaggedAttempts.length}
                  </div>
                </div>

                <div className="space-y-4 max-h-[650px] overflow-y-auto pr-2 custom-scrollbar lg:pr-4">
                  <AnimatePresence mode="popLayout">
                    {flaggedAttempts.length === 0 ? (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-16 px-4 bg-green-500/10 rounded-3xl border border-green-500/20"
                      >
                        <div className="size-20 rounded-full bg-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] flex items-center justify-center mx-auto mb-6">
                          <span className="material-symbols-outlined text-4xl text-navy font-black">verified</span>
                        </div>
                        <h4 className="text-lg font-black text-green-700 dark:text-green-400 mb-2">Zero Intrusions</h4>
                        <p className="text-sm font-bold text-green-600/60 dark:text-green-500/50 uppercase tracking-tighter">System integrity confirmed</p>
                      </motion.div>
                    ) : (
                      flaggedAttempts.map((attempt, idx) => (
                        <motion.div
                          key={attempt.id}
                          initial={{ opacity: 0, x: 20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="relative group bg-slate-50 dark:bg-white/5 rounded-3xl p-6 border-l-4 border-orange-500 hover:bg-white dark:hover:bg-navy/60 transition-all duration-500 hover:shadow-2xl hover:shadow-orange-500/10 cursor-default"
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="min-w-0 flex-1">
                              <h5 className="text-navy dark:text-white font-black truncate group-hover:text-orange-500 transition-colors">{attempt.studentName}</h5>
                              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5 truncate">{attempt.examTitle}</p>
                            </div>
                            <div className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-tighter border ${
                              attempt.riskLevel.toLowerCase() === 'critical' ? 'bg-red-500 text-white border-red-600' :
                              attempt.riskLevel.toLowerCase() === 'high' ? 'bg-orange-500 text-navy border-orange-600' :
                              'bg-yellow-500 text-navy border-yellow-600'
                            }`}>
                              {attempt.riskLevel}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mb-6">
                            <div className="flex-1 space-y-2">
                              <div className="flex justify-between text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase">
                                <span>Risk Level</span>
                                <span className={getRiskLevelColor(attempt.riskLevel)}>{attempt.riskScore}%</span>
                              </div>
                              <div className="h-2 w-full bg-slate-200 dark:bg-white/5 rounded-full overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${attempt.riskScore}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className={`h-full rounded-full ${
                                    attempt.riskScore > 80 ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                    attempt.riskScore > 50 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' :
                                    'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]'
                                  }`}
                                />
                              </div>
                            </div>
                          </div>

                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setLocation(`/teacher/review/${attempt.id}`)}
                            className="w-full py-4 rounded-2xl bg-navy dark:bg-gold text-white dark:text-navy text-xs font-black uppercase tracking-widest hover:shadow-xl transition-all shadow-lg shadow-black/5"
                          >
                            Review Analytics
                          </motion.button>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </section>

              {/* Quick Analytics Card */}
              <motion.div 
                whileHover={{ y: -5 }}
                className="bg-navy dark:bg-gold rounded-[2.5rem] p-8 text-white dark:text-navy shadow-2xl relative overflow-hidden group transition-all"
              >
                <div className="absolute -right-12 -bottom-12 size-48 bg-white/10 dark:bg-black/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
                <div className="relative z-10 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white/20 dark:bg-navy/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-[24px]">analytics</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-black italic tracking-tight">System Health</h4>
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Real-time status</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/10 dark:bg-navy/5 rounded-3xl">
                      <div className="text-2xl font-black">99.8%</div>
                      <div className="text-[9px] font-black uppercase opacity-60">Integrity</div>
                    </div>
                    <div className="p-4 bg-white/10 dark:bg-navy/5 rounded-3xl">
                      <div className="text-2xl font-black">12ms</div>
                      <div className="text-[9px] font-black uppercase opacity-60">Latency</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
