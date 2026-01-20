import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import StudentLayout from '@/components/StudentLayout';

// ============================================================================
// TYPES
// ============================================================================

interface Mistake {
  mistakeId: string;
  examId: string;
  examTitle: string;
  questionId: string;
  questionText: string;
  questionType: string;
  topic: string | null;
  subtopic: string | null;
  skillTag: string | null;
  difficultyLevel: string | null;
  studentAnswer: any;
  pointsLost: number;
  pointsPossible: number;
  occurredAt: string;
  mistakeType: string;
  isRepeatedMistake: boolean;
  repetitionCount: number;
  remediationStatus: string;
  correctedInRetake: boolean | null;
  attemptId: string;
}

interface TopicGroup {
  topic: string;
  count: number;
  mistakes: Mistake[];
}

interface MistakesData {
  mistakes: Mistake[];
  activeMistakes: Mistake[];
  resolvedMistakes: Mistake[];
  byExam: Array<{ examId: string; examTitle: string; mistakes: Mistake[] }>;
  byTopic: TopicGroup[];
  byDifficulty: Record<string, number>;
  stats: {
    total: number;
    active: number;
    resolved: number;
    repeated: number;
  };
}

// ============================================================================
// COMPONENT
// ============================================================================

const StudentMistakes: React.FC = () => {
  const [, setLocation] = useLocation();
  const { getAuthHeaders, isAuthenticated } = useAuth();

  const [data, setData] = useState<MistakesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMistakes();
    }
  }, [isAuthenticated]);

  const fetchMistakes = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(apiEndpoint('/api/student/mistakes'), { 
        headers,
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error('Failed to fetch mistakes');
      }

      const mistakesData: MistakesData = await response.json();
      setData(mistakesData);
    } catch (err) {
      console.error('Error fetching mistakes:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mistakes');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full p-8 flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="size-12 rounded-full border-4 dark:border-primary/20 dark:border-t-primary border-yellow-400/20 border-t-yellow-400 animate-spin"></div>
            <p className="dark:text-slate-500 text-slate-600 font-medium">Analyzing mistake pool...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  if (error || !data) {
    return (
      <StudentLayout>
        <div className="max-w-7xl mx-auto w-full p-4 sm:p-8">
          <div className="dark:bg-red-500/10 dark:border-red-500/20 bg-red-100 border border-red-300 rounded-xl p-6 text-center">
            <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2">error</span>
            <p className="dark:text-red-400 text-red-600 font-medium">{error || 'Failed to load mistakes'}</p>
            <button 
              onClick={fetchMistakes}
              className="mt-4 px-4 py-2 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg transition-all"
            >
              Retry
            </button>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const activeMistakes = data.activeMistakes;
  const resolvedMistakes = data.resolvedMistakes;
  const topics = data.byTopic;

  return (
    <StudentLayout>
      <div className="max-w-7xl mx-auto w-full p-4 sm:p-8 space-y-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-2 border-b dark:border-slate-800/60 border-slate-200">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 mb-3 rounded-full dark:bg-primary/10 dark:border-primary/20 dark:text-primary bg-yellow-100 border border-yellow-400 text-yellow-700 text-xs font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-[16px]">psychology</span>
              Growth Mindset
            </div>
            <h2 className="text-3xl md:text-4xl font-bold dark:text-white text-slate-900 mb-2 tracking-tight">My Learning Mistakes</h2>
            <p className="dark:text-slate-400 text-slate-500 max-w-2xl text-lg">
              Turn your errors into expertise. {activeMistakes.length === 0 ? "You've resolved all recent mistakes! Great work." : "Reviewing incorrect answers is the fastest path to mastery."}
            </p>
          </div>
          <div className="flex gap-4">
            <div className="dark:bg-background-card bg-white p-4 rounded-xl dark:border-slate-700 border border-slate-200 shadow-sm min-w-[140px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full bg-red-500"></div>
                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase font-bold tracking-wider">Active</span>
              </div>
              <div className="text-3xl font-bold dark:text-white text-slate-900">{activeMistakes.length}</div>
              <div className="text-xs dark:text-slate-500 text-slate-600">To review</div>
            </div>
            <div className="dark:bg-background-card bg-white p-4 rounded-xl dark:border-slate-700 border border-slate-200 shadow-sm min-w-[140px]">
              <div className="flex items-center gap-2 mb-1">
                <div className="size-2 rounded-full dark:bg-primary bg-yellow-400"></div>
                <span className="text-xs dark:text-slate-500 text-slate-600 uppercase font-bold tracking-wider">Resolved</span>
              </div>
              <div className="text-3xl font-bold dark:text-white text-slate-900">{resolvedMistakes.length}</div>
              <div className="text-xs dark:text-slate-500 text-slate-600">Mastered</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <aside className="lg:col-span-3 space-y-6">
            <div className="dark:bg-background-card bg-white rounded-xl dark:border-slate-700 border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b dark:border-slate-700 border-slate-200 dark:bg-slate-800/50 bg-slate-50">
                <h3 className="font-bold dark:text-white text-slate-900 flex items-center gap-2">
                  <span className="material-symbols-outlined dark:text-primary text-yellow-600 text-[20px]">pie_chart</span>
                  Error Distribution
                </h3>
              </div>
              <div className="p-4 space-y-4">
                {topics.length === 0 ? (
                  <p className="text-sm dark:text-slate-500 text-slate-600 text-center py-4">No topics yet</p>
                ) : (
                  topics.map(topic => {
                    const topicActive = activeMistakes.filter(q => q.topic === topic.topic).length;
                    return (
                      <div key={topic.topic} className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="dark:text-slate-300 text-slate-700">{topic.topic}</span>
                          <span className="font-mono dark:text-primary text-yellow-600">{topicActive} left</span>
                        </div>
                        <div className="h-1.5 w-full dark:bg-slate-700 bg-slate-200 rounded-full overflow-hidden">
                          <div className="h-full dark:bg-primary bg-yellow-400 rounded-full" style={{ width: `${Math.min(100, (topicActive / 5) * 100)}%` }}></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="dark:bg-background-card bg-white rounded-xl dark:border-slate-700 border border-slate-200 p-5 shadow-sm sticky top-24 space-y-3">
              <button 
                onClick={() => setLocation('/student/retake-config')}
                className="w-full py-3 px-4 dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-bold rounded-lg dark:shadow-lg dark:shadow-primary/20 shadow-lg shadow-yellow-400/20 transition-all flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined">auto_awesome</span>
                Start Retake Exam
              </button>
              <button 
                onClick={() => setLocation('/student/exams')}
                className="w-full py-2.5 px-4 dark:bg-navy-lighter dark:hover:bg-navy-border dark:text-white dark:border dark:border-navy-border bg-slate-200 hover:bg-slate-300 text-slate-900 rounded-lg transition-all flex items-center justify-center gap-2 text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">assignment</span>
                Go to Exams Center
              </button>
            </div>
          </aside>

          <div className="lg:col-span-9 space-y-10">
            <section>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg dark:bg-primary/10 dark:text-primary bg-yellow-100 text-yellow-600">
                    <span className="material-symbols-outlined">calculate</span>
                  </div>
                  <h3 className="text-xl font-bold dark:text-white text-slate-900">Active Mistake Review</h3>
                </div>
              </div>
              {activeMistakes.length === 0 ? (
                <div className="dark:bg-navy-lighter/30 bg-slate-50 border-2 border-dashed dark:border-slate-700 border-slate-200 rounded-2xl p-12 text-center">
                  <span className="material-symbols-outlined text-6xl dark:text-slate-600 text-slate-300 mb-4">task_alt</span>
                  <p className="dark:text-slate-400 text-slate-500 font-medium">No active mistakes to review. Keep up the great work!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeMistakes.map(q => (
                    <div key={q.mistakeId} className="group relative dark:bg-background-card bg-white border border-l-4 dark:border-slate-700 border-slate-200 border-l-red-500 rounded-r-xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="space-y-3 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">{q.difficultyLevel || 'medium'}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider dark:bg-slate-700 bg-slate-200 dark:text-slate-300 text-slate-700 dark:border-slate-600 border border-slate-300 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[12px]">repeat</span> {q.repetitionCount}x Error
                            </span>
                            <span className="text-xs dark:text-slate-400 text-slate-600 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">schedule</span> {formatDate(q.occurredAt)}
                            </span>
                          </div>
                          <h4 className="text-base md:text-lg font-medium dark:text-slate-100 text-slate-800 leading-snug">
                            {q.questionText}
                          </h4>
                          <div className="flex items-center gap-2 text-xs dark:text-slate-500 text-slate-600">
                            <span className="material-symbols-outlined text-[14px]">folder</span>
                            <span>{q.topic || 'General'}</span>
                            {q.subtopic && (
                              <>
                                <span>•</span>
                                <span>{q.subtopic}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="shrink-0 w-full md:w-auto">
                          <button 
                            onClick={() => setLocation('/student/exams')}
                            className="w-full md:w-auto px-5 py-2.5 dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 rounded-lg text-sm font-bold dark:shadow-lg dark:shadow-primary/20 shadow-lg shadow-yellow-400/20 transition-all flex items-center justify-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">refresh</span>
                            Retry Question
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {resolvedMistakes.length > 0 && (
              <section className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                    <span className="material-symbols-outlined">verified</span>
                  </div>
                  <h3 className="text-xl font-bold dark:text-white text-slate-900">Resolved Recently</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resolvedMistakes.map(q => (
                    <div key={q.mistakeId} className="dark:bg-background-card bg-white dark:border-slate-700 border border-slate-200 rounded-xl p-4 flex items-center gap-4">
                      <div className="size-10 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 shrink-0">
                        <span className="material-symbols-outlined">check</span>
                      </div>
                      <p className="text-sm font-medium dark:text-slate-300 text-slate-700 line-clamp-1">{q.questionText}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
};

export default StudentMistakes;
