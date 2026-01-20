import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import TeacherLayout from '../components/TeacherLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '../lib/config';

// ============================================================================
// TYPES
// ============================================================================

type ExamStatus = 'draft' | 'scheduled' | 'active' | 'completed' | 'archived';

interface QuestionOption {
  id: string;
  text: string;
  isCorrect: boolean;
}

interface Question {
  id: string;
  text: string;
  type: 'MC' | 'TF' | 'Short' | 'Essay';
  points: number;
  options?: QuestionOption[];
}

interface SecuritySettings {
  lockdownBrowser: boolean;
  aiProctoring: boolean;
  requireWebcam: boolean;
  trackFocus: boolean;
}

interface Exam {
  id: string;
  title: string;
  description: string | null;
  courseId: string;
  courseCode?: string;
  status: ExamStatus;
  durationMinutes: number;
  totalPoints: number;
  passingScore: number;
  maxAttempts: number;
  attemptsLocked: boolean;
  scheduledStartAt: string | null;
  scheduledEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  activeAttempts?: number;
  completionRate?: number;
  avgScore?: number;
  security?: SecuritySettings;
  questions: Question[];
}

interface ExamAttempt {
  id: number;
  studentId: number;
  studentName: string;
  studentEmail: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  flaggedForReview: boolean;
  reviewStatus: 'pending' | 'valid' | 'invalid' | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TeacherExamManage() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/teacher/exams/:id');
  const examId = params?.id;

  const { getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [showAddQuestion, setShowAddQuestion] = useState(false);

  const [newQuestion, setNewQuestion] = useState<Partial<Question>>({
    text: '',
    type: 'MC',
    points: 1,
    options: [
      { id: 'opt-1', text: '', isCorrect: true },
      { id: 'opt-2', text: '', isCorrect: false },
    ],
  });

  const cardBase = useMemo(
    () =>
      `${isDark ? 'bg-gray-900/70 border-gray-800' : 'bg-white border-gray-200'} border rounded-2xl shadow-sm`,
    [isDark]
  );

  useEffect(() => {
    if (!examId) return;
    fetchExam();
    fetchAttempts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examId]);

  const fetchExam = async () => {
    if (!examId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load exam');
      }

      const data = await response.json();
      const normalized: Exam = {
        ...data,
        status: (data.status || 'draft').toLowerCase() as ExamStatus,
        questions: Array.isArray(data.questions) ? data.questions : [],
        security: {
          lockdownBrowser: data.security?.lockdownBrowser ?? false,
          aiProctoring: data.security?.aiProctoring ?? false,
          requireWebcam: data.security?.requireWebcam ?? false,
          trackFocus: data.security?.trackFocus ?? false,
        },
        activeAttempts: data.activeAttempts ?? 0,
        completionRate: data.completionRate ?? 0,
        avgScore: data.avgScore ?? 0,
        attemptsLocked: data.attemptsLocked ?? false,
      };

      setExam(normalized);
    } catch (err: any) {
      console.error('Error fetching exam:', err);
      setError(err?.message || 'Unable to load exam');
    } finally {
      setLoading(false);
    }
  };

  const fetchAttempts = async () => {
    if (!examId) return;

    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}/attempts`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load attempts');
      }

      const data = await response.json();
      setAttempts(data);
    } catch (err: any) {
      console.error('Error fetching attempts:', err);
    }
  };

  const publishExam = async () => {
    if (!examId) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}/publish`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to publish exam' }));
        throw new Error(errorData.message || 'Failed to publish exam');
      }

      await fetchExam();
    } catch (err: any) {
      console.error('Publish error:', err);
      setError(err?.message || 'Failed to publish exam');
    } finally {
      setUpdating(false);
    }
  };

  const unpublishExam = async () => {
    if (!examId) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}/unpublish`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to unpublish exam' }));
        throw new Error(errorData.message || 'Failed to unpublish exam');
      }

      await fetchExam();
    } catch (err: any) {
      console.error('Unpublish error:', err);
      setError(err?.message || 'Failed to unpublish exam');
    } finally {
      setUpdating(false);
    }
  };

  const toggleStatus = () => {
    if (!exam) return;
    if (exam.status === 'active' || exam.status === 'scheduled') {
      unpublishExam();
    } else {
      publishExam();
    }
  };

  const archiveExamHandler = async () => {
    if (!exam) return;
    const confirmed = window.confirm('Are you sure you want to archive this exam?');
    if (!confirmed) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}/archive`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({}),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to archive exam' }));
        throw new Error(errorData.message || 'Failed to archive exam');
      }

      await fetchExam();
    } catch (err: any) {
      console.error('Archive error:', err);
      setError(err?.message || 'Failed to archive exam');
    } finally {
      setUpdating(false);
    }
  };

  const toggleRetakes = async () => {
    if (!examId || !exam) return;
    setUpdating(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exams/${examId}/retake-settings`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ retakeEnabled: !exam.attemptsLocked }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update retake policy' }));
        throw new Error(errorData.message || 'Failed to update retake policy');
      }

      await fetchExam();
    } catch (err: any) {
      console.error('Retake toggle error:', err);
      setError(err?.message || 'Failed to update retake policy');
    } finally {
      setUpdating(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!examId || !newQuestion.text) return;
    setUpdating(true);
    setError(null);

    try {
      const payload = {
        text: newQuestion.text,
        type: newQuestion.type,
        points: newQuestion.points || 1,
        options: newQuestion.type === 'MC' ? newQuestion.options : undefined,
      };

      const response = await fetch(apiEndpoint(`/api/exams/${examId}/questions`), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to add question');
      }

      await fetchExam();
      setShowAddQuestion(false);
      setNewQuestion({
        text: '',
        type: 'MC',
        points: 1,
        options: [
          { id: 'opt-1', text: '', isCorrect: true },
          { id: 'opt-2', text: '', isCorrect: false },
        ],
      });
    } catch (err: any) {
      console.error('Add question error:', err);
      setError(err?.message || 'Failed to add question. Backend endpoint may need to be implemented.');
    } finally {
      setUpdating(false);
    }
  };

  const addOption = () => {
    const options = [...(newQuestion.options || [])];
    options.push({ id: `opt-${options.length + 1}`, text: '', isCorrect: false });
    setNewQuestion({ ...newQuestion, options });
  };

  const updateOption = (index: number, text: string, isCorrect: boolean) => {
    const options = [...(newQuestion.options || [])];
    options[index] = { ...options[index], text, isCorrect };

    if (isCorrect) {
      options.forEach((opt, i) => {
        if (i !== index) opt.isCorrect = false;
      });
    }

    setNewQuestion({ ...newQuestion, options });
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Not set';
    return new Date(iso).toLocaleString();
  };

  if (!match || !examId) {
    return (
      <TeacherLayout>
        <div className="p-10 text-center text-red-500">Invalid exam URL</div>
      </TeacherLayout>
    );
  }

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-20">
          <div className={`h-10 w-10 animate-spin rounded-full border-4 border-t-transparent ${isDark ? 'border-primary' : 'border-primary'}`}></div>
        </div>
      </TeacherLayout>
    );
  }

  if (error || !exam) {
    return (
      <TeacherLayout>
        <div className="py-16 text-center space-y-4">
          <span className={`material-symbols-outlined text-6xl ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>error</span>
          <div className="text-2xl font-bold">{error || 'Exam not found'}</div>
          <button
            onClick={() => navigate('/teacher/exams')}
            className={`${isDark ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} border px-4 py-2 rounded-xl font-semibold hover:shadow`}
          >
            Back to Exams
          </button>
        </div>
      </TeacherLayout>
    );
  }

  const statusBadge = () => {
    const base = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border';
    switch (exam.status) {
      case 'active':
        return `${base} ${isDark ? 'bg-emerald-900/40 border-emerald-500/60 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-700'}`;
      case 'archived':
        return `${base} ${isDark ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-gray-100 border-gray-200 text-gray-600'}`;
      default:
        return `${base} ${isDark ? 'bg-amber-900/40 border-amber-500/60 text-amber-200' : 'bg-amber-50 border-amber-300 text-amber-700'}`;
    }
  };

  const pillMuted = isDark ? 'text-gray-400' : 'text-gray-600';

  return (
    <TeacherLayout>
      <div className="space-y-8">
        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <a href="#/dashboard" className={isDark ? 'text-gray-400 hover:text-primary' : 'text-gray-600 hover:text-primary'}>
            Dashboard
          </a>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          <button onClick={() => navigate('/teacher/exams')} className={isDark ? 'text-gray-400 hover:text-primary' : 'text-gray-600 hover:text-primary'}>
            Exams
          </button>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          <span className={isDark ? 'text-white font-semibold' : 'text-gray-900 font-semibold'}>{exam.title}</span>
        </div>

        {/* Header */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-6 border-b pb-6 ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className={`text-3xl font-black ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam.title}</h1>
              <span className={statusBadge()}>
                <span className={`size-2 rounded-full ${exam.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-current/50'}`}></span>
                {exam.status}
              </span>
            </div>
            <p className={`${pillMuted} flex items-center gap-2 text-sm`}>
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              Last updated: {formatDate(exam.updatedAt)}
            </p>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => navigate(`/teacher/exams/${exam.id}/preview`)}
              className={`${isDark ? 'bg-gray-800 text-gray-100 border border-gray-700' : 'bg-white text-gray-800 border border-gray-200'} rounded-xl px-5 py-2.5 font-bold flex items-center gap-2 hover:shadow-sm`}
            >
              <span className="material-symbols-outlined text-[20px]">visibility</span>
              Preview
            </button>             <button
               onClick={() => {
                 document.getElementById('questions-section')?.scrollIntoView({ behavior: 'smooth' });
                 setShowAddQuestion(true);
               }}
               className={`rounded-xl px-5 py-2.5 font-bold flex items-center gap-2 shadow-lg shadow-primary/20 ${isDark ? 'bg-primary text-navy-950' : 'bg-primary text-navy-950'} hover:bg-primary-hover`}
             >
               <span className="material-symbols-outlined text-[20px]">add</span>
               Add Question
             </button>          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`${cardBase} p-5 flex items-center gap-4`}>
            <div className={`size-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800 text-primary' : 'bg-amber-50 text-primary'}`}>
              <span className="material-symbols-outlined">book</span>
            </div>
            <div>
              <p className={`${pillMuted} text-[11px] font-black uppercase tracking-widest`}>Course Code</p>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam.courseCode || 'N/A'}</p>
            </div>
          </div>
          <div className={`${cardBase} p-5 flex items-center gap-4`}>
            <div className={`size-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800 text-primary' : 'bg-amber-50 text-primary'}`}>
              <span className="material-symbols-outlined">timer</span>
            </div>
            <div>
              <p className={`${pillMuted} text-[11px] font-black uppercase tracking-widest`}>Duration</p>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam.durationMinutes} Minutes</p>
            </div>
          </div>
          <div className={`${cardBase} p-5 flex items-center gap-4`}>
            <div className={`size-12 rounded-xl flex items-center justify-center ${isDark ? 'bg-gray-800 text-primary' : 'bg-amber-50 text-primary'}`}>
              <span className="material-symbols-outlined">quiz</span>
            </div>
            <div>
              <p className={`${pillMuted} text-[11px] font-black uppercase tracking-widest`}>Questions</p>
              <p className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{exam.questions.length} Active</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            {/* Performance */}
            <div className={`${cardBase} p-6`}>
              <h3 className={`text-xl font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                <span className="material-symbols-outlined text-primary">analytics</span>
                Academic Performance
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: 'Active Attempts', val: `${exam.activeAttempts ?? 0}`, icon: 'insights' },
                  { label: 'Completion Rate', val: `${exam.completionRate ?? 0}%`, icon: 'donut_large' },
                  { label: 'Average Score', val: `${exam.avgScore ?? 0}/100`, icon: 'trending_up' },
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-4">
                    <div className={`size-10 rounded-lg flex items-center justify-center ${isDark ? 'bg-gray-800 text-gray-200' : 'bg-gray-100 text-gray-700'}`}>
                      <span className="material-symbols-outlined">{stat.icon}</span>
                    </div>
                    <div>
                      <p className={`${pillMuted} text-xs font-bold`}>{stat.label}</p>
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{stat.val}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Questions Section */}
            <section id="questions-section" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Question Bank ({exam.questions.length})
                </h3>
                <button
                  onClick={() => setShowAddQuestion(true)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold ${isDark ? 'bg-primary text-navy-950 hover:bg-primary-hover' : 'bg-primary text-navy-950 hover:bg-primary-hover'}`}
                >
                  <span className="material-symbols-outlined">add_circle</span>
                  Add Question
                </button>
              </div>

              {showAddQuestion && (
                <div className={`${cardBase} border-primary/30 p-6 shadow-lg shadow-primary/10`}>
                  <div className="flex justify-between items-center mb-4">
                    <div className={`font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      <span className="material-symbols-outlined text-primary">add_circle</span>
                      Add New Question
                    </div>
                    <button
                      onClick={() => setShowAddQuestion(false)}
                      className={isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-800'}
                    >
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className={`${pillMuted} block text-xs font-bold uppercase mb-2`}>Question Content</label>
                      <textarea
                        className={`${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none`}
                        rows={3}
                        placeholder="Enter the question text..."
                        value={newQuestion.text}
                        onChange={(e) => setNewQuestion({ ...newQuestion, text: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`${pillMuted} block text-xs font-bold uppercase mb-2`}>Question Type</label>
                        <select
                          className={`${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-all`}
                          value={newQuestion.type}
                          onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as Question['type'] })}
                        >
                          <option value="MC">Multiple Choice (MC)</option>
                          <option value="TF">True / False (TF)</option>
                          <option value="Short">Short Answer</option>
                          <option value="Essay">Essay</option>
                        </select>
                      </div>
                      <div>
                        <label className={`${pillMuted} block text-xs font-bold uppercase mb-2`}>Points</label>
                        <input
                          type="number"
                          className={`${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} w-full rounded-xl px-4 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-all`}
                          min="1"
                          value={newQuestion.points || 1}
                          onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                        />
                      </div>
                    </div>

                    {newQuestion.type === 'MC' && (
                      <div className="space-y-3">
                        <label className={`${pillMuted} block text-xs font-bold uppercase mb-2`}>Options</label>
                        {newQuestion.options?.map((opt, idx) => (
                          <div key={opt.id} className="flex gap-2 items-center">
                            <input
                              type="text"
                              className={`${isDark ? 'bg-gray-900 border-gray-800 text-white' : 'bg-white border-gray-200 text-gray-900'} flex-1 rounded-lg px-3 py-2 focus:ring-1 focus:ring-primary focus:border-primary transition-all`}
                              placeholder={`Option ${idx + 1}`}
                              value={opt.text}
                              onChange={(e) => updateOption(idx, e.target.value, opt.isCorrect)}
                            />
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="correct"
                                checked={opt.isCorrect}
                                onChange={() => updateOption(idx, opt.text, true)}
                              />
                              <span className={`text-xs ${pillMuted}`}>Correct</span>
                            </label>
                          </div>
                        ))}
                        <button
                          onClick={addOption}
                          className={`w-full text-sm font-bold py-2 rounded-lg border ${isDark ? 'border-gray-700 text-primary hover:bg-gray-900/50' : 'border-primary/30 text-primary hover:bg-primary/5'}`}
                        >
                          + Add Option
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2 pt-4 border-t" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                      <button
                        onClick={handleAddQuestion}
                        disabled={updating}
                        className={`flex-1 font-bold py-2.5 rounded-xl shadow-lg shadow-primary/20 ${updating ? 'opacity-50 cursor-not-allowed' : ''} ${isDark ? 'bg-primary text-navy-950 hover:bg-primary-hover' : 'bg-primary text-navy-950 hover:bg-primary-hover'}`}
                      >
                        Save Question
                      </button>
                      <button
                        onClick={() => setShowAddQuestion(false)}
                        className={`flex-1 font-bold py-2.5 rounded-xl border ${isDark ? 'border-gray-700 text-gray-300 hover:bg-gray-800' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {exam.questions.map((q, i) => (
                <div key={q.id} className={`${cardBase} p-5 flex justify-between items-start`}>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-block text-sm font-bold px-2.5 py-1 rounded-lg ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        {i + 1}
                      </span>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-primary/20 text-primary' : 'bg-primary/10 text-primary'}`}>
                        {q.type}
                      </span>
                      <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded ${isDark ? 'bg-gray-800 text-gray-400' : 'bg-gray-100 text-gray-600'}`}>
                        {q.points} pts
                      </span>
                    </div>
                    <p className={`${isDark ? 'text-white' : 'text-gray-900'}`}>{q.text}</p>
                    {q.options && q.options.length > 0 && (
                      <div className={`mt-3 space-y-1 text-sm ${pillMuted}`}>
                        {q.options.map((opt) => (
                          <div key={opt.id} className="flex items-center gap-2">
                            <span className={`size-4 rounded-sm border flex items-center justify-center ${opt.isCorrect ? isDark ? 'bg-green-900/40 border-green-600' : 'bg-green-50 border-green-300' : isDark ? 'border-gray-700' : 'border-gray-300'}`}>
                              {opt.isCorrect && <span className="material-symbols-outlined text-[14px] text-green-500">check</span>}
                            </span>
                            {opt.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className={`text-sm font-bold px-3 py-1.5 rounded-lg border ${isDark ? 'border-gray-700 text-gray-400 hover:text-white' : 'border-gray-300 text-gray-600 hover:text-gray-900'}`}
                    onClick={() => console.log('Edit question:', q.id)}
                  >
                    Edit
                  </button>
                </div>
              ))}
            </section>

            {/* Attempts Section */}
            <section className={`${cardBase} p-6`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Student Attempts ({attempts.length})
                </h3>
              </div>

              {attempts.length === 0 ? (
                <div className={`text-center py-12 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <span className="material-symbols-outlined text-5xl mb-3 opacity-50">assignment</span>
                  <p className="font-medium">No attempts yet</p>
                  <p className="text-sm mt-1">Student attempts will appear here once the exam is published</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {attempts.map((attempt) => (
                    <div key={attempt.id} className={`${cardBase} p-4 flex items-center justify-between`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {attempt.studentName}
                          </span>
                          {attempt.flaggedForReview && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-500">
                              <span className="material-symbols-outlined text-[14px]">flag</span>
                              Flagged
                            </span>
                          )}
                          {attempt.reviewStatus && (
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded ${
                              attempt.reviewStatus === 'valid'
                                ? 'bg-green-500/20 text-green-500'
                                : attempt.reviewStatus === 'invalid'
                                ? 'bg-red-500/20 text-red-500'
                                : 'bg-gray-500/20 text-gray-500'
                            }`}>
                              {attempt.reviewStatus === 'valid' && <span className="material-symbols-outlined text-[14px]">check_circle</span>}
                              {attempt.reviewStatus === 'invalid' && <span className="material-symbols-outlined text-[14px]">cancel</span>}
                              {attempt.reviewStatus.charAt(0).toUpperCase() + attempt.reviewStatus.slice(1)}
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-4 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-[16px]">email</span>
                            {attempt.studentEmail}
                          </span>
                          {attempt.submittedAt && (
                            <span className="flex items-center gap-1">
                              <span className="material-symbols-outlined text-[16px]">schedule</span>
                              {new Date(attempt.submittedAt).toLocaleDateString()}
                            </span>
                          )}
                          {attempt.score !== null && (
                            <span className={`flex items-center gap-1 font-bold ${
                              attempt.passed
                                ? 'text-green-500'
                                : 'text-red-500'
                            }`}>
                              <span className="material-symbols-outlined text-[16px]">grade</span>
                              {attempt.percentage?.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => navigate(`/teacher/attempts/${attempt.id}/review`)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                          isDark
                            ? 'bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30'
                            : 'bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20'
                        }`}
                      >
                        <span className="material-symbols-outlined text-[18px]">rate_review</span>
                        Review
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className={`${cardBase} p-6`}>
              <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Quick Actions</h4>
              <div className="space-y-3">
                <button
                  onClick={toggleStatus}
                  disabled={updating}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    exam.status === 'active'
                      ? isDark
                        ? 'bg-red-900/40 border-red-600/60 text-red-300 hover:bg-red-900/60'
                        : 'bg-red-50 border-red-300 text-red-700 hover:bg-red-100'
                      : isDark
                        ? 'bg-green-900/40 border-green-600/60 text-green-300 hover:bg-green-900/60'
                        : 'bg-green-50 border-green-300 text-green-700 hover:bg-green-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {exam.status === 'active' ? 'unpublished' : 'published_with_changes'}
                  </span>
                  {exam.status === 'active' ? 'Unpublish Exam' : 'Publish Exam'}
                </button>

                <button
                  onClick={toggleRetakes}
                  disabled={updating || exam.status === 'archived'}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-gray-900 border-gray-700 text-white hover:bg-gray-700'
                      : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">
                    {exam.attemptsLocked ? 'lock_open' : 'lock'}
                  </span>
                  {exam.attemptsLocked ? 'Unlock Retakes' : 'Lock Retakes'}
                </button>

                <button
                  onClick={archiveExamHandler}
                  disabled={updating || exam.status === 'archived'}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    isDark
                      ? 'bg-gray-900 border-gray-700 text-gray-400 hover:text-white hover:bg-gray-700'
                      : 'bg-white border-gray-300 text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">archive</span>
                  Archive Exam
                </button>
              </div>
            </div>

            {/* Proctoring Config */}
            <div className={`${cardBase} p-6`}>
              <h4 className={`font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>Proctoring Config</h4>
              <div className="space-y-4">
                {[
                  { label: 'Lockdown Browser', active: exam.security?.lockdownBrowser, icon: 'shield' },
                  { label: 'AI Proctoring', active: exam.security?.aiProctoring, icon: 'psychology' },
                  { label: 'Webcam Required', active: exam.security?.requireWebcam, icon: 'videocam' },
                  { label: 'Focus Tracking', active: exam.security?.trackFocus, icon: 'visibility' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`material-symbols-outlined text-[18px] ${item.active ? (isDark ? 'text-primary' : 'text-primary') : isDark ? 'text-gray-700' : 'text-gray-400'}`}>
                        {item.icon}
                      </span>
                      <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{item.label}</span>
                    </div>
                    <span className={`material-symbols-outlined text-[18px] ${item.active ? 'text-green-500' : isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                      {item.active ? 'check_circle' : 'cancel'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
