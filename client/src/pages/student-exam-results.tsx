import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { usePortalI18n } from '@/hooks/usePortalI18n';


interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string;
  score: number | null;
  maxScore: number;
  percentage: number | null;
  passed: boolean | null;
}

interface ExamInfo {
  id: string;
  title: string;
  duration: number;
  totalPoints: number;
  passingScore: number;
}

const StudentExamResults: React.FC = () => {
  const { t } = usePortalI18n("common");
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/student/exams/:examId/results/:attemptId');
  const { getAuthHeaders } = useAuth();

  const examId = params?.examId as string;
  const attemptId = params?.attemptId as string;

  const [attempt, setAttempt] = useState<ExamAttempt | null>(null);
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        apiEndpoint(`/api/exam-attempts/${attemptId}`),
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setAttempt(data.attempt);
      setExam(data.exam);
    } catch (err) {
      console.error('Error fetching results:', err);
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 dark:border-primary border-yellow-400 mx-auto"></div>
          <p className="dark:text-slate-400 text-slate-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !attempt || !exam) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
        <div className="max-w-md w-full dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2 block">error</span>
          <p className="dark:text-red-400 text-red-600 font-medium mb-4">{error || 'Failed to load results'}</p>
          <button 
            onClick={() => setLocation('/student/exams')}
            className="px-6 py-2 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg transition-all font-medium"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const isGraded = attempt.status === 'graded';
  const isPending = attempt.status === 'submitted';

  return (
    <div className="min-h-screen dark:bg-[#0a192f] bg-slate-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-20 rounded-full dark:bg-green-500/10 bg-green-100 mb-4">
            <span className="material-symbols-outlined text-4xl dark:text-green-500 text-green-600">check_circle</span>
          </div>
          <h1 className="text-3xl font-bold dark:text-white text-slate-900 mb-2">Exam Submitted Successfully</h1>
          <p className="dark:text-slate-400 text-slate-600">{exam.title}</p>
        </div>

        {/* Status Card */}
        <div className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 mb-6 shadow-lg">
          {isPending && (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center gap-3 px-6 py-3 dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg">
                <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 animate-pulse">schedule</span>
                <span className="font-medium dark:text-blue-300 text-blue-700">Grading in Progress</span>
              </div>
              <p className="dark:text-slate-400 text-slate-600 text-sm">
                Your exam is being graded. Results will be available soon.
              </p>
            </div>
          )}

          {isGraded && attempt.score !== null && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="text-6xl font-bold dark:text-white text-slate-900 mb-2">
                  {attempt.percentage?.toFixed(1)}%
                </div>
                <p className="dark:text-slate-400 text-slate-600">
                  {attempt.score} out of {attempt.maxScore} points
                </p>
              </div>

              <div className="flex items-center justify-center gap-4">
                {attempt.passed ? (
                  <div className="inline-flex items-center gap-2 px-6 py-3 dark:bg-green-500/10 dark:border-green-500/20 bg-green-100 border border-green-300 rounded-lg">
                    <span className="material-symbols-outlined dark:text-green-400 text-green-600">check_circle</span>
                    <span className="font-medium dark:text-green-300 text-green-700">Passed</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 px-6 py-3 dark:bg-red-500/10 dark:border-red-500/20 bg-red-100 border border-red-300 rounded-lg">
                    <span className="material-symbols-outlined dark:text-red-400 text-red-600">cancel</span>
                    <span className="font-medium dark:text-red-300 text-red-700">
                      Did Not Pass (Required: {exam.passingScore}%)
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Details */}
        <div className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-4">Submission Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm dark:text-slate-500 text-slate-600 mb-1">Attempt Number</p>
              <p className="font-medium dark:text-white text-slate-900">#{attempt.attemptNumber}</p>
            </div>
            <div>
              <p className="text-sm dark:text-slate-500 text-slate-600 mb-1">Submitted At</p>
              <p className="font-medium dark:text-white text-slate-900">
                {new Date(attempt.submittedAt).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm dark:text-slate-500 text-slate-600 mb-1">Status</p>
              <p className="font-medium dark:text-white text-slate-900 capitalize">{attempt.status.replace('_', ' ')}</p>
            </div>
            <div>
              <p className="text-sm dark:text-slate-500 text-slate-600 mb-1">Time Taken</p>
              <p className="font-medium dark:text-white text-slate-900">
                {Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000)} minutes
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => setLocation('/student/exams')}
            className="px-8 py-3 dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-lg font-bold transition shadow-lg"
          >
            Back to Exams
          </button>
          {isGraded && (
            <button
              onClick={() => setLocation(`/student/exams/${examId}/review/${attemptId}`)}
              className="px-8 py-3 dark:bg-navy-dark dark:hover:bg-navy-border dark:text-white dark:border dark:border-navy-border bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg font-medium transition"
            >
              Review Answers
            </button>
          )}
        </div>

        {/* Info */}
        <div className="mt-8 dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg p-4">
          <div className="flex gap-2">
            <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 shrink-0 text-[20px]">info</span>
            <p className="dark:text-blue-300 text-blue-700 text-sm">
              {isPending 
                ? 'Your instructor will grade this exam. You will receive a notification when results are available.'
                : 'You can review your answers and see feedback from your instructor.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentExamResults;
