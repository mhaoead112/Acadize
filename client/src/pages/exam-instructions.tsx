import React, { useState, useEffect } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';

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
  requireWebcam: boolean;
  requireScreenShare: boolean;
  requireFullscreen: boolean;
  requireLockdownBrowser: boolean;
  tabSwitchLimit: number;
  copyPasteAllowed: boolean;
  rightClickAllowed: boolean;
  metadata?: Record<string, any>;
}

interface SystemCheckStatus {
  webcam: boolean;
  internet: boolean;
  lockdownBrowser: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

const ExamInstructions: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/student/exams/:examId/start');
  const { user, getAuthHeaders, isAuthenticated } = useAuth();

  // State management
  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmChecked, setConfirmChecked] = useState(false);
  const [systemCheckStatus, setSystemCheckStatus] = useState<SystemCheckStatus>({
    webcam: false,
    internet: true, // Assume internet is OK if page loaded
    lockdownBrowser: false
  });
  const [attemptCreating, setAttemptCreating] = useState(false);

  const examId = params?.examId as string;

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && examId) {
      fetchExamDetails();
      checkSystemRequirements();
    }
  }, [isAuthenticated, examId]);

  const fetchExamDetails = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/exams/${examId}`), { headers });

      if (!response.ok) {
        throw new Error('Failed to fetch exam details');
      }

      const examData: Exam = await response.json();

      // Validate exam is available
      if (examData.status !== 'active' && examData.status !== 'scheduled') {
        throw new Error('This exam is not available');
      }

      // Check scheduling window
      if (examData.scheduledStartAt && new Date(examData.scheduledStartAt) > new Date()) {
        throw new Error(
          `This exam is not yet available. It starts on ${new Date(examData.scheduledStartAt).toLocaleString()}`
        );
      }

      if (examData.scheduledEndAt && new Date(examData.scheduledEndAt) < new Date()) {
        throw new Error('This exam period has ended');
      }

      setExam(examData);
    } catch (err) {
      console.error('Error fetching exam details:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const checkSystemRequirements = async () => {
    // Check webcam access
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasWebcam = devices.some(device => device.kind === 'videoinput');
      setSystemCheckStatus(prev => ({ ...prev, webcam: hasWebcam }));
    } catch (err) {
      console.error('Error checking webcam:', err);
    }
  };

  // ============================================================================
  // EXAM START LOGIC
  // ============================================================================

  const handleStartExam = async () => {
    if (!confirmChecked || !exam || attemptCreating) return;

    setAttemptCreating(true);
    setError(null);

    try {
      const headers = getAuthHeaders();

      // Check for active attempts first
      const attemptsResponse = await fetch(
        apiEndpoint('/api/student/attempts/active'),
        { headers }
      );

      if (!attemptsResponse.ok) {
        throw new Error('Failed to check active attempts');
      }

      const activeAttemptsRaw = await attemptsResponse.json();
      // API now returns { data: [...] } — unwrap gracefully
      const activeAttempts: any[] = Array.isArray(activeAttemptsRaw?.data)
        ? activeAttemptsRaw.data
        : Array.isArray(activeAttemptsRaw) ? activeAttemptsRaw : [];
      const hasActiveAttempt = activeAttempts.some((a: any) => a.examId === exam.id);

      if (hasActiveAttempt) {
        throw new Error('You already have an active attempt for this exam');
      }

      // Create new exam attempt
      const createResponse = await fetch(
        apiEndpoint('/api/exam-attempts/start'),
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            examId: exam.id,
            consent: confirmChecked
          })
        }
      );

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        throw new Error(errorData.message || 'Failed to create exam attempt');
      }

      const result = await createResponse.json();
      const attempt = result.attempt || result;

      // Navigate to exam page
      setLocation(`/student/exams/${exam.id}/attempt/${attempt.id}`);
    } catch (err) {
      console.error('Error starting exam:', err);
      setError(err instanceof Error ? err.message : 'Failed to start exam');
      setAttemptCreating(false);
    }
  };

  const handleCancel = () => {
    setLocation('/student/exams');
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const getSystemCheckStyle = (status: boolean) => {
    return status
      ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
      : 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20';
  };

  const getSystemCheckIcon = (status: boolean) => {
    return status ? 'check_circle' : 'warning';
  };

  const getSystemCheckLabel = (status: boolean) => {
    return status ? 'READY' : 'CHECK';
  };

  // ============================================================================
  // MAIN RENDER
  // ============================================================================

  if (loading) {
    return (
      <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-12 lg:px-20 min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 dark:border-primary border-yellow-400 mx-auto"></div>
          <p className="dark:text-slate-400 text-slate-600">Loading exam details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-12 lg:px-20">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
          <button onClick={() => setLocation('/student/exams')} className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">home</span>Home
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-800 dark:text-primary font-medium">Exam Instructions</span>
        </nav>

        <main className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="dark:bg-red-500/10 dark:border-red-500/20 bg-red-100 border border-red-300 rounded-xl p-8 text-center max-w-md">
            <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2 block">error</span>
            <p className="dark:text-red-400 text-red-600 font-medium mb-4">{error}</p>
            <button 
              onClick={() => setLocation('/student/exams')}
              className="px-6 py-2 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg transition-all font-medium"
            >
              Back to Exams
            </button>
          </div>
        </main>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-12 lg:px-20">
        <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
          <button onClick={() => setLocation('/student/exams')} className="hover:text-primary transition-colors flex items-center gap-1">
            <span className="material-symbols-outlined text-[18px]">home</span>Home
          </button>
          <span className="material-symbols-outlined text-[16px]">chevron_right</span>
          <span className="text-slate-800 dark:text-primary font-medium">Exam Instructions</span>
        </nav>

        <main className="flex flex-col items-center justify-center min-h-[500px]">
          <div className="text-center">
            <p className="dark:text-slate-400 text-slate-600 font-medium">No exam data available</p>
          </div>
        </main>
      </div>
    );
  }

  const questionCount = (exam.metadata?.questionCount as number | undefined) || exam.totalPoints || 0;
  const antiCheatRules = [];

  if (exam.antiCheatEnabled) {
    antiCheatRules.push('One continuous sitting required.');
    if (exam.tabSwitchLimit > 0) {
      antiCheatRules.push(`Switching tabs will be logged (limit: ${exam.tabSwitchLimit})`);
    } else {
      antiCheatRules.push('Tab switching is monitored.');
    }
  }

  antiCheatRules.push('Answers are final once submitted.');

  if (exam.requireWebcam) {
    antiCheatRules.push('Webcam is required for this exam.');
  }

  if (exam.requireFullscreen) {
    antiCheatRules.push('You must stay in fullscreen mode throughout the exam.');
  }

  if (!exam.copyPasteAllowed) {
    antiCheatRules.push('Copy and paste functionality is disabled.');
  }

  const systemChecks = [
    {
      label: 'Webcam',
      status: !exam.requireWebcam || systemCheckStatus.webcam,
      required: exam.requireWebcam
    },
    {
      label: 'Internet',
      status: systemCheckStatus.internet,
      required: true
    },
    {
      label: 'Lockdown Browser',
      status: !exam.requireLockdownBrowser || systemCheckStatus.lockdownBrowser,
      required: exam.requireLockdownBrowser
    }
  ];

  return (
    <div className="relative flex flex-col grow w-full max-w-[1280px] mx-auto px-6 py-8 md:px-12 lg:px-20">
      <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-8">
        <button onClick={() => setLocation('/student/exams')} className="hover:text-primary transition-colors flex items-center gap-1">
          <span className="material-symbols-outlined text-[18px]">home</span>Home
        </button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className="text-slate-800 dark:text-primary font-medium">{exam.title}</span>
      </nav>

      <main className="flex flex-col md:flex-row gap-8 items-start">
        <div className="flex-1 w-full dark:bg-navy-card bg-white rounded-xl p-8 dark:shadow-lg shadow-sm dark:border-navy-border border border-slate-200">
          <div className="mb-8 dark:border-slate-700 border-b border-slate-200 pb-6">
            <span className="inline-block px-3 py-1 rounded-full dark:bg-primary/20 dark:text-primary bg-yellow-100 text-yellow-700 text-xs font-bold uppercase tracking-wider mb-3">
              Proctored Exam
            </span>
            <h1 className="text-3xl md:text-4xl font-bold dark:text-white text-slate-900 mb-2 leading-tight">
              {exam.title}
            </h1>
            {exam.description && (
              <p className="text-slate-600 dark:text-slate-400 mt-2">{exam.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="dark:bg-navy-lighter dark:border-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 dark:text-slate-400 text-slate-500 mb-1">
                <span className="material-symbols-outlined text-[20px] text-primary icon-filled">timer</span>
                <span className="text-xs font-semibold uppercase tracking-wide">Duration</span>
              </div>
              <p className="text-xl font-bold dark:text-white text-slate-900">{exam.duration} Mins</p>
            </div>
            <div className="dark:bg-navy-lighter dark:border-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 dark:text-slate-400 text-slate-500 mb-1">
                <span className="material-symbols-outlined text-[20px] text-primary icon-filled">quiz</span>
                <span className="text-xs font-semibold uppercase tracking-wide">Questions</span>
              </div>
              <p className="text-xl font-bold dark:text-white text-slate-900">{questionCount} Items</p>
            </div>
            <div className="dark:bg-navy-lighter dark:border-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 dark:text-slate-400 text-slate-500 mb-1">
                <span className="material-symbols-outlined text-[20px] text-primary icon-filled">assignment_turned_in</span>
                <span className="text-xs font-semibold uppercase tracking-wide">Points</span>
              </div>
              <p className="text-xl font-bold dark:text-white text-slate-900">{exam.totalPoints} Pts</p>
            </div>
            <div className="dark:bg-navy-lighter dark:border-slate-700 bg-slate-50 border border-slate-200 p-4 rounded-lg">
              <div className="flex items-center gap-2 dark:text-slate-400 text-slate-500 mb-1">
                <span className="material-symbols-outlined text-[20px] text-primary icon-filled">percent</span>
                <span className="text-xs font-semibold uppercase tracking-wide">Pass Score</span>
              </div>
              <p className="text-xl font-bold dark:text-white text-slate-900">{exam.passingScore}%</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-lg font-bold dark:text-white text-slate-900 mb-3">Instructions & Rules</h2>
            <div className="space-y-3">
              {antiCheatRules.map((rule, i) => (
                <div key={i} className="flex items-start gap-3 p-3 dark:bg-navy-lighter/50 bg-slate-50 rounded-lg">
                  <span className="material-symbols-outlined dark:text-slate-500 text-slate-400 mt-0.5">check_circle</span>
                  <p className="dark:text-slate-300 text-slate-700 text-sm">{rule}</p>
                </div>
              ))}
            </div>
          </div>

          {exam.antiCheatEnabled && (
            <div className="dark:bg-orange-500/10 dark:border-orange-500/20 bg-orange-100 border border-orange-300 rounded-lg p-4 flex gap-3">
              <span className="material-symbols-outlined dark:text-orange-400 text-orange-600 shrink-0 mt-0.5">warning</span>
              <div>
                <p className="dark:text-orange-400 text-orange-700 font-bold text-sm">Anti-Cheat Enabled</p>
                <p className="dark:text-slate-300 text-slate-700 text-sm mt-1">
                  This exam uses proctoring technology to monitor your activity. Webcam access and screen recording may be required.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="w-full md:w-[360px] flex flex-col gap-6">
          <div className="dark:bg-navy-card bg-white rounded-xl p-6 dark:shadow-lg shadow-sm dark:border-navy-border border border-slate-200">
            <h3 className="text-md font-bold dark:text-white text-slate-900 mb-4">System Check</h3>
            <div className="space-y-4">
              {systemChecks.map((check, i) => (
                <div key={i} className="flex justify-between items-center pb-3 last:border-b-0 border-b dark:border-slate-700/50 border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="dark:text-slate-300 text-slate-700 text-sm font-medium">{check.label}</span>
                    {check.required && (
                      <span className="text-xs dark:text-orange-400 text-orange-600 font-semibold">REQUIRED</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`material-symbols-outlined text-[18px] ${getSystemCheckStyle(check.status)}`}>
                      {getSystemCheckIcon(check.status)}
                    </span>
                    <span className={`text-xs font-bold px-2 py-1 rounded ${getSystemCheckStyle(check.status)}`}>
                      {getSystemCheckLabel(check.status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="dark:bg-navy-card bg-white rounded-xl p-6 dark:shadow-lg shadow-sm dark:border-navy-border border border-slate-200 flex flex-col gap-4">
            <div className="space-y-3">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={confirmChecked}
                  onChange={(e) => setConfirmChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 rounded dark:accent-primary accent-yellow-400"
                />
                <span className="text-sm dark:text-slate-300 text-slate-700">
                  I understand the exam rules and anti-cheat policies. I agree to comply with all requirements.
                </span>
              </label>
            </div>

            <button 
              onClick={handleStartExam}
              disabled={!confirmChecked || attemptCreating}
              className={`group relative w-full flex items-center justify-center gap-3 font-bold text-lg py-4 px-6 rounded-lg transition-all ${
                confirmChecked && !attemptCreating
                  ? 'dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 dark:shadow-lg dark:shadow-primary/20 shadow-lg shadow-yellow-400/20 hover:dark:-translate-y-0.5 hover:-translate-y-0.5'
                  : 'dark:bg-navy-dark dark:text-slate-600 bg-slate-200 text-slate-600 cursor-not-allowed'
              }`}
            >
              {attemptCreating ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  Starting...
                </>
              ) : (
                <>
                  Start Exam
                  <span className={`material-symbols-outlined ${confirmChecked ? 'group-hover:translate-x-1' : ''} transition-transform`}>
                    arrow_forward
                  </span>
                </>
              )}
            </button>

            <button 
              onClick={handleCancel}
              disabled={attemptCreating}
              className="w-full py-2 px-4 dark:bg-navy-darker dark:hover:bg-navy-dark dark:text-slate-400 dark:border dark:border-navy-border bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-all font-medium disabled:opacity-50"
            >
              Cancel
            </button>
          </div>

          <div className="dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg p-4">
            <div className="flex gap-2">
              <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 shrink-0 text-[20px]">info</span>
              <p className="dark:text-blue-300 text-blue-700 text-xs leading-relaxed">
                Your exam session will be locked once you start. Make sure your system is ready and all distractions are minimized.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExamInstructions;
