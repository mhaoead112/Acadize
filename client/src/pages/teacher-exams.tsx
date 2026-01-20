import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import TeacherLayout from '../components/TeacherLayout';
import { useAuth } from '../hooks/useAuth';
import { apiEndpoint } from '../lib/config';

// Add custom scrollbar styles
const scrollbarStyles = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.3);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(71, 85, 105, 0.5);
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(71, 85, 105, 0.7);
  }
`;

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
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'scheduled':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'completed':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
      case 'draft':
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
      default:
        return 'bg-navy-800 text-text-muted border-navy-700';
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
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-muted">Loading exam data...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (error) {
    return (
      <TeacherLayout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl text-red-400 mb-2 block">error</span>
            <p className="text-red-400 font-medium mb-4">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-all font-medium"
            >
              Try Again
            </button>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <style>{scrollbarStyles}</style>
      <div className="w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8 space-y-6 lg:space-y-8 pb-16">
          {/* Header */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 lg:gap-6">
            <div>
              <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-white mb-3">
                Exam Management
              </h1>
              <p className="text-text-muted text-lg max-w-2xl">
                Overview of all assessments. Manage active sessions, grade submissions, and create new exams.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-900 border border-navy-700 text-text-muted hover:text-white hover:border-navy-600 hover:bg-navy-800 transition-all text-sm font-bold shadow-sm disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[20px] ${refreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={() => setLocation('/teacher/analytics')}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-navy-900 border border-navy-700 text-text-muted hover:text-white hover:border-navy-600 hover:bg-navy-800 transition-all text-sm font-bold shadow-sm"
              >
                <span className="material-symbols-outlined text-[20px]">analytics</span>
                Mistake Analytics
              </button>
              <button
                onClick={() => setLocation('/teacher/exams/create')}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-navy-950 text-base font-bold shadow-[0_4px_14px_0_rgba(242,208,13,0.39)] hover:shadow-[0_6px_20px_rgba(242,208,13,0.23)] hover:-translate-y-0.5 transition-all"
              >
                <span className="material-symbols-outlined text-[22px] font-bold">add_circle</span>
                Create New Exam
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="bg-navy-900/50 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-navy-800 hover:border-navy-600 transition-all duration-300 relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-green-500/5 hover:-translate-y-1">
              <div className="absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <span className="material-symbols-outlined text-[120px] text-green-400">timer</span>
              </div>
              <div className="relative z-10">
                <p className="text-text-muted text-xs lg:text-sm font-bold uppercase tracking-wider mb-2">
                  Active Sessions
                </p>
                <div className="flex items-end gap-2 lg:gap-3">
                  <h3 className="text-3xl lg:text-4xl font-black text-white">{activeExams}</h3>
                  <span className="mb-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-green-500/10 text-green-400 border border-current opacity-70">
                    Live
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-navy-900/50 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-navy-800 hover:border-navy-600 transition-all duration-300 relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-orange-500/5 hover:-translate-y-1">
              <div className="absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <span className="material-symbols-outlined text-[120px] text-orange-400">flag</span>
              </div>
              <div className="relative z-10">
                <p className="text-text-muted text-xs lg:text-sm font-bold uppercase tracking-wider mb-2">
                  Flagged Attempts
                </p>
                <div className="flex items-end gap-2 lg:gap-3">
                  <h3 className="text-3xl lg:text-4xl font-black text-white">{totalFlagged}</h3>
                  <span className="mb-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-orange-500/10 text-orange-400 border border-current opacity-70">
                    Review
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-navy-900/50 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-navy-800 hover:border-navy-600 transition-all duration-300 relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1">
              <div className="absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <span className="material-symbols-outlined text-[120px] text-blue-400">bar_chart</span>
              </div>
              <div className="relative z-10">
                <p className="text-text-muted text-xs lg:text-sm font-bold uppercase tracking-wider mb-2">
                  Avg. Class Score
                </p>
                <div className="flex items-end gap-2 lg:gap-3">
                  <h3 className="text-3xl lg:text-4xl font-black text-white">{avgClassScore}%</h3>
                  <span className="mb-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-400 border border-current opacity-70">
                    Overall
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-navy-900/50 backdrop-blur-sm rounded-2xl p-5 lg:p-6 border border-navy-800 hover:border-navy-600 transition-all duration-300 relative overflow-hidden group cursor-pointer hover:shadow-xl hover:shadow-purple-500/5 hover:-translate-y-1">
              <div className="absolute -right-6 -top-6 p-4 opacity-5 group-hover:opacity-10 transition-opacity rotate-12">
                <span className="material-symbols-outlined text-[120px] text-purple-400">event</span>
              </div>
              <div className="relative z-10">
                <p className="text-text-muted text-xs lg:text-sm font-bold uppercase tracking-wider mb-2">
                  Upcoming Exams
                </p>
                <div className="flex items-end gap-2 lg:gap-3">
                  <h3 className="text-3xl lg:text-4xl font-black text-white">{scheduledExams}</h3>
                  <span className="mb-1.5 inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-400 border border-current opacity-70 whitespace-nowrap">
                    {getNextScheduledExam()}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-8">
            {/* Exams Table */}
            <div className="xl:col-span-8">
              <section className="bg-navy-900/80 backdrop-blur-sm border border-navy-700 rounded-2xl overflow-hidden shadow-lg">
                <div className="p-4 lg:p-5 border-b border-navy-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">quiz</span>
                    Your Exams
                  </h3>
                  <div className="flex gap-2">
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted">
                        <span className="material-symbols-outlined text-[18px]">search</span>
                      </span>
                      <input
                        className="bg-navy-950 border border-navy-700 rounded-lg text-sm py-2 pl-9 pr-4 w-48 focus:ring-2 focus:ring-primary focus:border-primary text-white placeholder-text-muted transition-all"
                        placeholder="Filter exams..."
                        type="text"
                      />
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-navy-950/50 text-text-muted text-xs uppercase tracking-wider border-b border-navy-700">
                        <th className="px-4 lg:px-6 py-3 lg:py-4 font-semibold">Exam Details</th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 font-semibold">Course</th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 font-semibold">Status</th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 font-semibold">Stats</th>
                        <th className="px-4 lg:px-6 py-3 lg:py-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="text-sm divide-y divide-navy-800">
                      {exams.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-4 lg:px-6 py-12 lg:py-16 text-center">
                            <div className="flex flex-col items-center">
                              <div className="bg-navy-950/50 rounded-full p-6 mb-4">
                                <span className="material-symbols-outlined text-5xl text-text-muted">quiz</span>
                              </div>
                              <p className="text-text-muted text-lg font-medium mb-2">No exams created yet</p>
                              <p className="text-text-muted/70 text-sm mb-6">Start by creating your first exam</p>
                              <button
                                onClick={() => setLocation('/teacher/exams/create')}
                                className="px-6 py-3 bg-primary hover:bg-primary-hover text-navy-950 rounded-xl font-bold transition-all shadow-lg shadow-primary/20 hover:-translate-y-0.5"
                              >
                                Create Your First Exam
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        exams.map((exam) => (
                          <tr key={exam.id} className="group hover:bg-navy-800/40 transition-all duration-200">
                            <td className="px-4 lg:px-6 py-4">
                              <div className="font-bold text-white text-sm lg:text-base">{exam.title}</div>
                              <div className="text-xs text-text-muted flex items-center gap-2 mt-1">
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">schedule</span>
                                  {exam.duration} Mins
                                </span>
                                <span className="text-navy-700">•</span>
                                <span className="flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px]">star</span>
                                  {exam.totalPoints} Points
                                </span>
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <span className="px-2.5 py-1.5 rounded-lg bg-navy-950/70 text-xs font-medium text-white border border-navy-700 inline-block">
                                {exam.courseName}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <span
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusStyle(
                                  exam.status
                                )}`}
                              >
                                <span className={`size-2 rounded-full animate-pulse ${
                                  exam.status === 'active' ? 'bg-green-500' :
                                  exam.status === 'scheduled' ? 'bg-blue-500' :
                                  exam.status === 'completed' ? 'bg-purple-500' : 'bg-gray-500'
                                }`}></span>
                                {exam.status.charAt(0).toUpperCase() + exam.status.slice(1)}
                              </span>
                            </td>
                            <td className="px-4 lg:px-6 py-4">
                              <div className="text-xs space-y-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="material-symbols-outlined text-[14px] text-text-muted">groups</span>
                                  <span className="text-text-muted">Attempts:</span>
                                  <span className="text-white font-semibold">{exam.stats.totalAttempts}</span>
                                </div>
                                {exam.stats.averageScore !== null && (
                                  <div className="flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[14px] text-text-muted">trending_up</span>
                                    <span className="text-text-muted">Avg:</span>
                                    <span className="text-white font-semibold">{exam.stats.averageScore}%</span>
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 lg:px-6 py-4 text-right">
                              <button
                                onClick={() => setLocation(`/teacher/exams/${exam.id}`)}
                                className="text-text-muted hover:text-primary transition-all p-2 hover:bg-navy-800 rounded-lg group-hover:bg-navy-800"
                                title="Manage Exam"
                              >
                                <span className="material-symbols-outlined text-[22px]">settings</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            {/* Flagged Attempts Sidebar */}
            <div className="xl:col-span-4">
              <section className="bg-navy-900/80 backdrop-blur-sm border border-navy-700 rounded-2xl p-5 lg:p-6 shadow-lg">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-lg lg:text-xl font-bold text-white flex items-center gap-2">
                    <span className="material-symbols-outlined text-orange-500">warning</span>
                    Needs Review
                  </h3>
                  <span className="bg-orange-500 text-navy-950 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg shadow-orange-500/20">
                    {flaggedAttempts.length}
                  </span>
                </div>
                <div className="flex flex-col gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                  {flaggedAttempts.length === 0 ? (
                    <div className="text-center py-8 lg:py-12">
                      <div className="bg-navy-950/50 rounded-full p-6 inline-block mb-4">
                        <span className="material-symbols-outlined text-5xl text-green-400">
                          check_circle
                        </span>
                      </div>
                      <p className="text-text-muted text-base font-medium mb-1">All Clear!</p>
                      <p className="text-text-muted/70 text-sm">No flagged attempts at the moment</p>
                    </div>
                  ) : (
                    flaggedAttempts.map((attempt) => (
                      <div
                        key={attempt.id}
                        className="bg-navy-950/50 rounded-xl p-4 border-l-4 border-orange-500 hover:bg-navy-800/50 transition-all duration-200 group hover:shadow-lg hover:shadow-orange-500/5"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-white font-bold text-sm truncate">{attempt.studentName}</p>
                            <p className="text-xs text-text-muted truncate mt-0.5">{attempt.examTitle}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold ${
                            attempt.riskLevel.toLowerCase() === 'critical' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            attempt.riskLevel.toLowerCase() === 'high' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                            attempt.riskLevel.toLowerCase() === 'medium' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                            'bg-green-500/10 text-green-400 border border-green-500/20'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">psychology</span>
                            <span>{attempt.riskScore}%</span>
                          </div>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${getRiskLevelColor(attempt.riskLevel)}`}>
                            {attempt.riskLevel}
                          </span>
                        </div>
                        <button
                          onClick={() => setLocation(`/teacher/review/${attempt.id}`)}
                          className="w-full text-center py-2.5 rounded-lg bg-navy-800 text-sm font-bold text-white group-hover:bg-primary group-hover:text-navy-950 transition-all shadow-sm group-hover:shadow-md"
                        >
                          Review Attempt
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
