import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import StudentLayout from '@/components/StudentLayout';

// ============================================================================
// TYPES
// ============================================================================

interface Exam {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseName?: string;
  status: 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  duration: number;
  totalPoints: number;
  passingScore: number;
  attemptsAllowed: number;
  antiCheatEnabled: boolean;
  metadata?: Record<string, any>;
}

interface ExamAttempt {
  id: string;
  examId: string;
  exam?: Exam;
  attemptNumber: number;
  status: 'in_progress' | 'submitted' | 'graded' | 'flagged' | 'under_review' | 'invalidated';
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  isRetake: boolean;
  flaggedForReview: boolean;
}

interface RetakeEligibility {
  eligible: boolean;
  reasons: string[];
  examId: string;
  mistakesAvailable?: number;
}

interface ExamCategory {
  available: Exam[];
  inProgress: ExamAttempt[];
  completed: ExamAttempt[];
  retakeEligible: RetakeEligibility[];
}

type CategoryType = 'main' | 'mock' | 'practice' | 'all';

// ============================================================================
// COMPONENT
// ============================================================================

const StudentExams: React.FC = () => {
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders, isAuthenticated } = useAuth();
  const { toast } = useToast();
  
  // State management
  const [examData, setExamData] = useState<ExamCategory>({
    available: [],
    inProgress: [],
    completed: [],
    retakeEligible: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeExamLock, setActiveExamLock] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('all');

  // ============================================================================
  // DERIVED STATE & HELPERS
  // ============================================================================

  const getCategoryFromExam = (exam: Exam): CategoryType => {
    const meta = exam.metadata as Record<string, any> | undefined;
    const category = meta?.category?.toLowerCase();
    
    if (category === 'mock') return 'mock';
    if (category === 'practice') return 'practice';
    return 'main';
  };

  const categorizeExams = (exams: Exam[]) => {
    return {
      main: exams.filter(e => getCategoryFromExam(e) === 'main'),
      mock: exams.filter(e => getCategoryFromExam(e) === 'mock'),
      practice: exams.filter(e => getCategoryFromExam(e) === 'practice'),
      all: exams
    };
  };

  const getFilteredExams = (category: CategoryType, exams: Exam[]) => {
    if (category === 'all') return exams;
    return categorizeExams(exams)[category];
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchAllExamData();
    }
  }, [isAuthenticated, user]);

  const fetchAllExamData = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();

      // Fetch in parallel for better performance
      const [
        availableResponse,
        attemptsResponse,
        enrollmentsResponse
      ] = await Promise.all([
        fetch(apiEndpoint('/api/student/exams'), { headers }),
        fetch(apiEndpoint('/api/student/attempts/active'), { headers }),
        fetch(apiEndpoint('/api/enrollments/my-courses'), { headers })
      ]);

      if (!availableResponse.ok || !attemptsResponse.ok || !enrollmentsResponse.ok) {
        throw new Error('Failed to fetch exam data');
      }

      const availableExams: Exam[] = await availableResponse.json();
      const attempts: ExamAttempt[] = await attemptsResponse.json();
      const enrollments = await enrollmentsResponse.json();

      // Categorize attempts
      const inProgressAttempts = attempts.filter(a => a.status === 'in_progress');
      const completedAttempts = attempts.filter(a => 
        ['submitted', 'graded', 'flagged', 'under_review'].includes(a.status)
      );

      // Helper to count attempts per exam
      const getAttemptCount = (examId: string) => {
        return attempts.filter(a => a.examId === examId).length;
      };

      // Filter available exams: Remove those where max attempts reached
      const filteredAvailableExams = availableExams.filter(exam => {
        const attemptsUsed = getAttemptCount(exam.id);
        const attemptsAllowed = exam.attemptsAllowed || 1; // Default to 1 if not specified
        return attemptsUsed < attemptsAllowed;
      });

      // Check if student has an active exam session
      const activeAttempt = inProgressAttempts[0];
      if (activeAttempt) {
        setActiveExamLock(activeAttempt.examId);
      }

      // Fetch retake eligibility for completed exams
      const retakePromises = completedAttempts
        .filter(a => a.examId)
        .map(async (attempt) => {
          try {
            const response = await fetch(
              apiEndpoint(`/api/retake-exams/eligibility?studentId=${user!.id}&examId=${attempt.examId}`),
              { headers }
            );
            
            if (response.ok) {
              const eligibility: RetakeEligibility = await response.json();
              return eligibility.eligible ? eligibility : null;
            }
            return null;
          } catch (err) {
            console.error(`Failed to check retake eligibility for exam ${attempt.examId}:`, err);
            return null;
          }
        });

      const retakeResults = await Promise.all(retakePromises);
      const retakeEligible = retakeResults.filter((r): r is RetakeEligibility => r !== null);

      // Enrich exams with course names
      const enrichedExams = availableExams.map(exam => {
        const enrollment = enrollments.find((e: any) => e.courseId === exam.courseId);
        return {
          ...exam,
          courseName: enrollment?.course?.title || 'Unknown Course'
        };
      });

      setExamData({
        available: filteredAvailableExams,
        inProgress: inProgressAttempts,
        completed: completedAttempts,
        retakeEligible
      });

    } catch (err) {
      console.error('Error fetching exam data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  // ============================================================================
  // EXAM ACTIONS
  // ============================================================================

  const handleStartExam = async (exam: Exam) => {
    // Exam lock: prevent starting new exam if one is active
    if (activeExamLock && activeExamLock !== exam.id) {
      toast({
        title: "Exam Session Active",
        description: "You have an active exam in progress. Please complete or submit it before starting a new exam.",
        variant: "destructive",
      });
      
      const activeAttempt = examData.inProgress.find(a => a.examId === activeExamLock);
      if (activeAttempt) {
        setLocation(`/student/exams/${activeExamLock}/attempt/${activeAttempt.id}`);
      }
      
      return;
    }

    // Check if exam is within scheduled time window
    if (exam.scheduledStartAt && new Date(exam.scheduledStartAt) > new Date()) {
      toast({
        title: "Exam Not Available Yet",
        description: `This exam starts on ${new Date(exam.scheduledStartAt).toLocaleString()}`,
        variant: "default",
      });
      return;
    }

    if (exam.scheduledEndAt && new Date(exam.scheduledEndAt) < new Date()) {
      toast({
        title: "Exam Period Ended",
        description: "This exam period has ended and is no longer available.",
        variant: "destructive",
      });
      return;
    }

    setLocation(`/student/exams/${exam.id}/start`);
  };

  const handleResumeAttempt = (attempt: ExamAttempt) => {
    setLocation(`/student/exams/${attempt.examId}/attempt/${attempt.id}`);
  };

  const handleViewResults = (attempt: ExamAttempt) => {
    setLocation(`/student/exams/${attempt.examId}/results/${attempt.id}`);
  };

  const handleStartRetake = async (eligibility: RetakeEligibility) => {
    setLocation(`/student/exams/${eligibility.examId}/retake`);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getStatusStyle = (status: Exam['status'] | ExamAttempt['status']) => {
    switch (status) {
      case 'available':
      case 'active':
      case 'scheduled':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'completed':
      case 'graded':
        return 'dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 bg-slate-200/30 text-slate-700 border-slate-300/30';
      case 'draft':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'submitted':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'flagged':
      case 'under_review':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'invalidated':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20 bg-slate-200/30 text-slate-700 border-slate-300/30';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getQuestionCount = (exam: Exam) => {
    const meta = exam.metadata as Record<string, any> | undefined;
    return meta?.questionCount || exam.totalPoints;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStats = () => {
    const totalAssigned = examData.available.length + examData.inProgress.length;
    const totalCompleted = examData.completed.length;
    const averageScore = examData.completed.length > 0
      ? examData.completed
          .filter(a => a.percentage !== null)
          .reduce((sum, a) => sum + (a.percentage || 0), 0) / examData.completed.filter(a => a.percentage !== null).length
      : 0;

    return (
      <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
        {[
          { label: 'Assigned', count: totalAssigned, color: 'dark:text-primary text-yellow-600' },
          { label: 'Completed', count: totalCompleted, color: 'dark:text-green-400 text-green-600' },
          { label: 'Total Score', count: `${Math.round(averageScore)}%`, color: 'dark:text-white text-slate-700' }
        ].map((stat, i) => (
          <div key={i} className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 p-4 rounded-xl min-w-[120px] shrink-0 shadow-lg dark:shadow-lg">
            <span className="text-[10px] font-bold dark:text-slate-500 text-slate-500 uppercase tracking-widest block mb-1">{stat.label}</span>
            <span className={`text-2xl font-bold ${stat.color}`}>{stat.count}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderExamCard = (exam: Exam) => {
    const isLocked = activeExamLock && activeExamLock !== exam.id;

    return (
      <div key={exam.id} className="group dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-2xl overflow-hidden dark:hover:border-primary/50 hover:border-yellow-400/50 transition-all shadow-xl dark:shadow-xl flex flex-col">
        <div className="p-6 flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(exam.status)}`}>
              {exam.status}
            </span>
            <span className="text-xs dark:text-slate-500 text-slate-600 font-medium">
              {formatDate(exam.scheduledStartAt)}
            </span>
          </div>
          
          <div>
            <span className="text-[10px] font-bold dark:text-primary text-yellow-600 uppercase tracking-widest mb-1 block">
              {exam.courseName || 'Course'}
            </span>
            <h4 className="text-lg font-bold dark:text-white text-slate-900 leading-tight dark:group-hover:text-primary group-hover:text-yellow-600 transition-colors">
              {exam.title}
            </h4>
            <p className="text-sm dark:text-slate-400 text-slate-600 mt-2 line-clamp-2">
              {exam.description || 'No description available'}
            </p>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <div className="flex items-center gap-1.5 dark:text-slate-500 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">timer</span>
              <span className="text-xs">{exam.duration}m</span>
            </div>
            <div className="flex items-center gap-1.5 dark:text-slate-500 text-slate-600">
              <span className="material-symbols-outlined text-[18px]">quiz</span>
              <span className="text-xs">{getQuestionCount(exam)} Qs</span>
            </div>
            {exam.antiCheatEnabled && (
              <div className="flex items-center gap-1.5 text-orange-400">
                <span className="material-symbols-outlined text-[18px]">visibility</span>
                <span className="text-xs">Proctored</span>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 dark:bg-navy-dark/40 dark:border-navy-border bg-slate-50 border-t border-slate-200">
          <button 
            onClick={() => handleStartExam(exam)}
            disabled={isLocked}
            className={`w-full py-2.5 font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
              isLocked
                ? 'dark:bg-navy-dark dark:text-slate-600 bg-slate-200 text-slate-600 dark:border dark:border-navy-border cursor-not-allowed'
                : 'dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900'
            }`}
          >
            {isLocked ? (
              <>
                <span className="material-symbols-outlined text-[18px]">lock</span>
                Exam Locked
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                Enter Session
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderAttemptCard = (attempt: ExamAttempt) => {
    const exam = attempt.exam || examData.available.find(e => e.id === attempt.examId);

    return (
      <div key={attempt.id} className="group dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-2xl overflow-hidden dark:hover:border-primary/50 hover:border-yellow-400/50 transition-all shadow-xl dark:shadow-xl flex flex-col">
        <div className="p-6 flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${getStatusStyle(attempt.status)}`}>
              {attempt.status.replace('_', ' ')}
            </span>
            <span className="text-xs dark:text-slate-500 text-slate-600 font-medium">
              Attempt {attempt.attemptNumber}
            </span>
          </div>
          
          <div>
            <h4 className="text-lg font-bold dark:text-white text-slate-900 leading-tight">
              {exam?.title || 'Unknown Exam'}
            </h4>
            <p className="text-sm dark:text-slate-400 text-slate-600 mt-1">
              {formatDate(attempt.startedAt)}
            </p>
            {attempt.score !== null && (
              <p className={`text-sm mt-1 font-bold ${attempt.passed ? 'text-green-400' : 'text-red-400'}`}>
                Score: {attempt.score} / {exam?.totalPoints || 100} ({Math.round(attempt.percentage || 0)}%)
              </p>
            )}
          </div>

          {attempt.flaggedForReview && (
            <div className="flex items-center gap-2 px-3 py-2 bg-orange-500/10 border border-orange-500/20 rounded-lg">
              <span className="material-symbols-outlined text-orange-400 text-[18px]">flag</span>
              <span className="text-xs text-orange-400 font-medium">Flagged for Review</span>
            </div>
          )}

          {attempt.isRetake && (
            <div className="flex items-center gap-2 px-3 py-2 dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg">
              <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 text-[18px]">refresh</span>
              <span className="text-xs dark:text-blue-400 text-blue-600 font-medium">Retake Attempt</span>
            </div>
          )}
        </div>

        <div className="p-4 dark:bg-navy-dark/40 dark:border-navy-border bg-slate-50 border-t border-slate-200">
          {attempt.status === 'in_progress' ? (
            <button 
              onClick={() => handleResumeAttempt(attempt)}
              className="w-full py-2.5 dark:bg-green-500 dark:hover:bg-green-400 bg-green-400 hover:bg-green-500 dark:text-white text-slate-900 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">play_arrow</span>
              Resume Exam
            </button>
          ) : attempt.status === 'graded' ? (
            <button 
              onClick={() => handleViewResults(attempt)}
              className="w-full py-2.5 dark:bg-navy-lighter dark:text-slate-300 dark:border dark:border-navy-border bg-slate-200 text-slate-700 font-bold rounded-lg hover:dark:bg-navy-border hover:bg-slate-300 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">analytics</span>
              View Report
            </button>
          ) : (
            <button 
              disabled
              className="w-full py-2.5 dark:bg-navy-dark dark:text-slate-600 bg-slate-200 text-slate-600 font-bold rounded-lg dark:border dark:border-navy-border cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">pending</span>
              Pending Review
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderRetakeCard = (eligibility: RetakeEligibility) => {
    const exam = examData.available.find(e => e.id === eligibility.examId) ||
                 examData.completed.find(a => a.examId === eligibility.examId)?.exam;

    return (
      <div key={eligibility.examId} className="group dark:bg-navy-card dark:border-blue-500/30 bg-white border border-blue-300 rounded-2xl overflow-hidden dark:hover:border-blue-500 hover:border-blue-500 transition-all shadow-xl dark:shadow-xl flex flex-col">
        <div className="p-6 flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20 bg-blue-100 text-blue-600 border-blue-300">
              Retake Available
            </span>
          </div>
          
          <div>
            <h4 className="text-lg font-bold dark:text-white text-slate-900 leading-tight">
              {exam?.title || 'Exam Retake'}
            </h4>
            <p className="text-sm dark:text-slate-400 text-slate-600 mt-2">
              Focus on {eligibility.mistakesAvailable || 0} unresolved mistakes
            </p>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg">
            <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 text-[18px]">school</span>
            <span className="text-xs dark:text-blue-400 text-blue-600 font-medium">Adaptive Learning Mode</span>
          </div>
        </div>

        <div className="p-4 dark:bg-navy-dark/40 dark:border-navy-border bg-slate-50 border-t border-blue-300">
          <button 
            onClick={() => handleStartRetake(eligibility)}
            className="w-full py-2.5 dark:bg-blue-500 dark:hover:bg-blue-400 bg-blue-400 hover:bg-blue-500 dark:text-white text-slate-900 font-bold rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Start Retake
          </button>
        </div>
      </div>
    );
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  const filteredAvailableExams = getFilteredExams(selectedCategory, examData.available);

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 dark:border-primary border-yellow-400 mx-auto"></div>
            <p className="dark:text-slate-400 text-slate-600">Loading your exams...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-8">
          <div className="dark:bg-red-500/10 dark:border-red-500/20 bg-red-100 border border-red-300 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2">error</span>
            <p className="dark:text-red-400 text-red-600 font-medium">{error}</p>
            <button 
              onClick={fetchAllExamData}
              className="mt-4 px-4 py-2 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const categoryLabels: Record<CategoryType, string> = {
    'all': 'All Assessments',
    'main': 'Main Assessments',
    'mock': 'Mock Exams',
    'practice': 'Practice Exams'
  };

  const categoryIcons: Record<CategoryType, string> = {
    'all': 'assignment',
    'main': 'verified_user',
    'mock': 'simulation',
    'practice': 'fitness_center'
  };

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full dark:bg-primary/10 dark:border-primary/20 dark:text-primary bg-yellow-200 border border-yellow-400 text-yellow-700 text-xs font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">assignment</span>
              Student Assessments
            </div>
            <h2 className="text-3xl md:text-4xl font-bold dark:text-white text-slate-900 tracking-tight">Examination Center</h2>
            <p className="dark:text-slate-400 text-slate-600 max-w-2xl">
              Access your scheduled proctored exams, practice simulations, and performance reviews.
            </p>
          </div>
          
          {renderStats()}
        </div>

        {/* Active Exam Lock Warning */}
        {activeExamLock && (
          <div className="dark:bg-yellow-500/10 dark:border-yellow-500/20 bg-yellow-100 border border-yellow-400 rounded-xl p-4 flex items-start gap-3">
            <span className="material-symbols-outlined dark:text-yellow-400 text-yellow-600 text-[24px]">warning</span>
            <div>
              <p className="dark:text-yellow-400 text-yellow-700 font-bold">Exam Session Active</p>
              <p className="dark:text-slate-400 text-slate-600 text-sm mt-1">
                You have an active exam in progress. Complete or submit it before starting a new exam.
              </p>
            </div>
          </div>
        )}

        {/* In Progress Section */}
        {examData.inProgress.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 dark:border-navy-border border-slate-200 border-b pb-4">
              <div className="p-2 rounded-lg dark:bg-yellow-500/10 dark:text-yellow-400 bg-yellow-200 text-yellow-600">
                <span className="material-symbols-outlined">pending_actions</span>
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white text-slate-900">In Progress</h3>
                <p className="text-xs dark:text-slate-500 text-slate-600">{examData.inProgress.length} active session(s)</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {examData.inProgress.map(renderAttemptCard)}
            </div>
          </section>
        )}

        {/* Available Exams Section with Category Filter */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 dark:border-navy-border border-slate-200 border-b pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg dark:bg-primary/10 dark:text-primary bg-yellow-200 text-yellow-600">
                <span className="material-symbols-outlined">verified_user</span>
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white text-slate-900">Available Exams</h3>
                <p className="text-xs dark:text-slate-500 text-slate-600">{examData.available.length} exam(s) available</p>
              </div>
            </div>

            {/* Category Filter Buttons */}
            <div className="flex gap-2">
              {(['all', 'main', 'mock', 'practice'] as CategoryType[]).map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    selectedCategory === cat
                      ? 'dark:bg-primary dark:text-navy-dark bg-yellow-400 text-slate-900'
                      : 'dark:bg-navy-darker dark:text-slate-400 dark:hover:bg-navy-dark bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {filteredAvailableExams.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAvailableExams.map(renderExamCard)}
            </div>
          ) : (
            <div className="col-span-full py-12 dark:bg-navy-dark/30 dark:border-navy-border bg-slate-100 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center text-center">
              <span className="material-symbols-outlined text-4xl dark:text-slate-700 text-slate-400 mb-2">inbox</span>
              <p className="dark:text-slate-500 text-slate-600 font-medium">No {selectedCategory !== 'all' ? selectedCategory : ''} exams currently assigned.</p>
            </div>
          )}
        </section>

        {/* Retake Available Section */}
        {examData.retakeEligible.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 dark:border-navy-border border-slate-200 border-b pb-4">
              <div className="p-2 rounded-lg dark:bg-blue-500/10 dark:text-blue-400 bg-blue-200 text-blue-600">
                <span className="material-symbols-outlined">refresh</span>
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white text-slate-900">Retake Opportunities</h3>
                <p className="text-xs dark:text-slate-500 text-slate-600">{examData.retakeEligible.length} retake(s) available</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {examData.retakeEligible.map(renderRetakeCard)}
            </div>
          </section>
        )}

        {/* Completed Exams Section */}
        {examData.completed.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3 dark:border-navy-border border-slate-200 border-b pb-4">
              <div className="p-2 rounded-lg dark:bg-green-500/10 dark:text-green-400 bg-green-200 text-green-600">
                <span className="material-symbols-outlined">check_circle</span>
              </div>
              <div>
                <h3 className="text-xl font-bold dark:text-white text-slate-900">Completed Exams</h3>
                <p className="text-xs dark:text-slate-500 text-slate-600">{examData.completed.length} exam(s) completed</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {examData.completed.map(renderAttemptCard)}
            </div>
          </section>
        )}
      </div>
    </StudentLayout>
  );
};

export default StudentExams;

// ============================================================================
// COMPONENT
// ============================================================================

