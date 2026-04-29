import React, { Suspense, useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { useDevToolsDetection } from '@/hooks/useDevToolsDetection';
import { useScreenRecording } from '@/hooks/useScreenRecording';
import { useWebcamProctoring } from '@/hooks/useWebcamProctoring';
import { ProctoringConsent, ProctoringOverlay, ProctoringAlert } from '@/components/exam';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator';
import { FillBlankQuestion } from '@/components/FillBlankQuestion';
import { MatchingQuestion } from '@/components/MatchingQuestion';
import QuestionContentRenderer from '@/components/QuestionContentRenderer';
import '@/components/QuestionContentRenderer.css';
import { usePortalI18n } from '@/hooks/usePortalI18n';


const RichTextEditor = React.lazy(() =>
  import('@/components/RichTextEditor').then((mod) => ({ default: mod.RichTextEditor }))
);
const CodeEditor = React.lazy(() =>
  import('@/components/CodeEditor').then((mod) => ({ default: mod.CodeEditor }))
);

// ============================================================================
// TYPES
// ============================================================================

interface Question {
  id: string;
  questionType: string;
  questionText: string;
  options: Array<{id: string; text: string; isCorrect?: boolean}> | string[];
  points: number;
  order: number;
  leftItems?: string[];
  rightItems?: string[];
}

interface ExamAttempt {
  id: string;
  examId: string;
  studentId: string;
  attemptNumber: number;
  status: string;
  startedAt: string;
  submittedAt: string | null;
  score: number | null;
  percentage: number | null;
  passed: boolean | null;
  isRetake: boolean;
  flaggedForReview: boolean;
}

interface ExamData {
  attempt: ExamAttempt;
  exam: {
    id: string;
    title: string;
    duration: number;
    totalPoints: number;
    passingScore: number;
    antiCheatEnabled: boolean;
  };
  questions: Question[];
  answers: Record<string, number | string | string[] | Record<string, string>>;
}

type EventType = 'blur' | 'focus' | 'fullscreen_exit' | 'tab_switch' | 'copy_attempt' | 'paste_attempt' | 'cut_attempt' | 'right_click' | 'page_unload' | 'keyboard_shortcut' | 'devtools_open';

// ============================================================================
// COMPONENT
// ============================================================================

const StudentExamAttempt: React.FC = () => {
  const { t } = usePortalI18n("common");
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/student/exams/:examId/attempt/:attemptId');
  const { user, getAuthHeaders, isAuthenticated } = useAuth();

  // Route params
  const examId = params?.examId as string;
  const attemptId = params?.attemptId as string;

  // State management
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number | string | string[] | Record<string, string>>>({});
  const [isFocused, setIsFocused] = useState(true);
  const [showFocusNotification, setShowFocusNotification] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [lastSaved, setLastSaved] = useState<Date | undefined>();
  const [showProctoringConsent, setShowProctoringConsent] = useState(false);
  const [proctoringAlert, setProctoringAlert] = useState<{ type: 'face_not_detected' | 'multiple_faces' | 'looking_away' | 'info'; isOpen: boolean }>({ type: 'info', isOpen: false });
  const antiCheatEnabled = examData?.exam.antiCheatEnabled ?? false;

  // Refs for managing state without re-renders
  const answersRef = useRef(answers);
  const isSubmittingRef = useRef(false);
  const notificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastEventLogRef = useRef<number>(0);

  // Update refs when state changes
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // ============================================================================
  // ANTI-CHEAT HOOKS
  // ============================================================================

  // DevTools detection
  useDevToolsDetection(() => {
    if (antiCheatEnabled) {
      logEvent('devtools_open');
    }
  }, 4000, antiCheatEnabled);

  // Screen recording
  const {
    isRecording,
    isSupported: isRecordingSupported,
    startRecording,
    stopRecording,
    error: recordingError
  } = useScreenRecording(attemptId, async (chunk, chunkIndex) => {
    // Upload chunk to backend
    if (examData?.exam.antiCheatEnabled) {
      try {
        const formData = new FormData();
        formData.append('chunk', chunk);
        formData.append('chunkIndex', chunkIndex.toString());
        formData.append('attemptId', attemptId);

        const headers = getAuthHeaders();
        await fetch(apiEndpoint('/api/recordings/upload-chunk'), {
          method: 'POST',
          headers: {
            ...headers,
          },
          body: formData
        });
      } catch (err) {
        console.error('Failed to upload recording chunk:', err);
      }
    }
  });

  // Webcam proctoring
  const {
    status: proctoringStatus,
    webcamRef,
    startProctoring,
    stopProctoring,
    isSupported: isProctoringSupported
  } = useWebcamProctoring(attemptId, antiCheatEnabled);

  // Show proctoring alert when violations occur
  useEffect(() => {
    if (proctoringStatus.faceCount === 0 && proctoringStatus.status === 'active') {
      setProctoringAlert({ type: 'face_not_detected', isOpen: true });
    } else if (proctoringStatus.faceCount > 1) {
      setProctoringAlert({ type: 'multiple_faces', isOpen: true });
    } else if (proctoringStatus.isLookingAway) {
      setProctoringAlert({ type: 'looking_away', isOpen: true });
    }
  }, [proctoringStatus.faceCount, proctoringStatus.isLookingAway, proctoringStatus.status]);

  // Show proctoring consent when anti-cheat is enabled
  useEffect(() => {
    if (examData?.exam.antiCheatEnabled && isProctoringSupported && proctoringStatus.status === 'initializing') {
      setShowProctoringConsent(true);
    }
  }, [examData?.exam.antiCheatEnabled, isProctoringSupported, proctoringStatus.status]);

  const handleProctoringAccept = async () => {
    setShowProctoringConsent(false);
    await startProctoring();
  };

  const handleProctoringDecline = () => {
    setShowProctoringConsent(false);
    // Continue without proctoring, but log the decline
    logEvent('blur'); // Log as a suspicious event
  };

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && examId && attemptId) {
      fetchExamAttemptData();
    }
  }, [isAuthenticated, examId, attemptId]);

  // Clamp question index when questions load/change
  useEffect(() => {
    const len = examData?.questions?.length ?? 0;
    if (len > 0) {
      setCurrentIndex((idx) => Math.min(Math.max(0, idx), len - 1));
    }
  }, [examData?.questions]);

  const fetchExamAttemptData = async () => {
    setLoading(true);
    setError(null);

    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        apiEndpoint(`/api/exam-attempts/${attemptId}`),
        { headers }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch exam attempt');
      }

      const data: ExamData = await response.json();

      // Validate attempt is in progress
      if (data.attempt.status !== 'in_progress') {
        throw new Error('This exam session is no longer active');
      }

      setExamData(data);
      setAnswers(data.answers || {});
      
      // Calculate time remaining
      const startTime = new Date(data.attempt.startedAt).getTime();
      const durationMs = data.exam.duration * 60 * 1000;
      const endTime = startTime + durationMs;
      const now = Date.now();
      setTimeLeft(Math.max(0, Math.floor((endTime - now) / 1000)));
    } catch (err) {
      console.error('Error fetching exam attempt:', err);
      setError(err instanceof Error ? err.message : 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  // Start screen recording when exam loads (if anti-cheat enabled)
  useEffect(() => {
    if (antiCheatEnabled && isRecordingSupported && !isRecording) {
      startRecording().catch((err) => {
        console.error('[RECORDING] Failed to start:', err);
        // Log event but allow exam to continue
        logEvent('page_unload'); // Use generic event for recording failure
      });
    }
  }, [antiCheatEnabled, isRecordingSupported]);

  // ============================================================================
  // TIMER & AUTO-SUBMIT
  // ============================================================================

  useEffect(() => {
    if (!examData || examData.attempt.status !== 'in_progress') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = Math.max(0, prev - 1);

        // Auto-submit when time expires
        if (newTime === 0 && !isSubmittingRef.current) {
          clearInterval(timer);
          handleAutoSubmit();
        }

        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [examData?.attempt.status, examData?.exam.antiCheatEnabled]);

  // ============================================================================
  // AUTO-SAVE ANSWERS
  // ============================================================================

  useEffect(() => {
    // Set up auto-save every 5 seconds
    if (!examData || isSubmittingRef.current) return;

    autoSaveTimeoutRef.current = setInterval(() => {
      saveAnswers();
    }, 5000);

    return () => {
      if (autoSaveTimeoutRef.current) clearInterval(autoSaveTimeoutRef.current);
    };
  }, [examData?.attempt.status, examData?.exam.antiCheatEnabled]);

  const saveAnswers = async () => {
    if (!attemptId || isSubmittingRef.current) return;

    try {
      setSaveStatus('saving');
      const headers = getAuthHeaders();
      const response = await fetch(
        apiEndpoint(`/api/exam-attempts/${attemptId}/answers`),
        {
          method: 'PATCH',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ answers: answersRef.current })
        }
      );

      if (!response.ok) {
        console.error('Failed to save answers');
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 3000);
      } else {
        setSaveStatus('saved');
        setLastSaved(new Date());
        setTimeout(() => setSaveStatus('idle'), 2000);
      }
    } catch (err) {
      console.error('Error saving answers:', err);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  // ============================================================================
  // ANTI-CHEAT EVENT LOGGING
  // ============================================================================

  const logEvent = async (type: EventType) => {
    if (!attemptId || isSubmittingRef.current) return;

    // Skip non-violating events if needed
    if (type === 'focus') return;

    // Throttle event logging to max 1 per second per event type
    const now = Date.now();
    if (now - lastEventLogRef.current < 1000) return;
    lastEventLogRef.current = now;

    // Map client event types to server enum + severity
    const mapEvent = (t: EventType): { eventType: string; severity: 'low' | 'medium' | 'high' | 'critical'; description?: string } => {
      switch (t) {
        case 'blur':
          return { eventType: 'window_blur', severity: 'low', description: 'Window lost focus' };
        case 'tab_switch':
          return { eventType: 'tab_switch', severity: 'medium', description: 'Tab switch detected' };
        case 'fullscreen_exit':
          return { eventType: 'fullscreen_exit', severity: 'high', description: 'Exited fullscreen during exam' };
        case 'copy_attempt':
          return { eventType: 'copy_paste', severity: 'medium', description: 'Copy action attempted' };
        case 'paste_attempt':
          return { eventType: 'copy_paste', severity: 'medium', description: 'Paste action attempted' };
        case 'cut_attempt':
          return { eventType: 'copy_paste', severity: 'medium', description: 'Cut action attempted' };
        case 'right_click':
          return { eventType: 'right_click', severity: 'low', description: 'Right click detected' };
        case 'keyboard_shortcut':
          return { eventType: 'keyboard_shortcut', severity: 'medium', description: 'Suspicious keyboard shortcut detected' };
        case 'devtools_open':
          return { eventType: 'devtools_open', severity: 'critical', description: 'Developer tools opened during exam' };
        case 'page_unload':
          return { eventType: 'suspicious_pattern', severity: 'low', description: 'Page unload or navigation away' };
        default:
          return { eventType: 'suspicious_pattern', severity: 'low' };
      }
    };

    const mapped = mapEvent(type);

    try {
      const headers = getAuthHeaders();
      await fetch(
        apiEndpoint(`/api/exam-attempts/${attemptId}/events`),
        {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            eventType: mapped.eventType,
            severity: mapped.severity,
            description: mapped.description,
            metadata: { clientType: type, clientTs: new Date().toISOString() }
          })
        }
      );
    } catch (err) {
      console.error('Error logging event:', err);
    }
  };

  // Focus loss tracking
  useEffect(() => {
    const handleBlur = () => {
      setIsFocused(false);
      logEvent('blur');

      // Show transient notification
      setShowFocusNotification(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = setTimeout(() => {
        setShowFocusNotification(false);
      }, 4000);
    };

    const handleFocus = () => {
      setIsFocused(true);
      logEvent('focus');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
    };
  }, []);

  // Tab switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        logEvent('tab_switch');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Fullscreen exit detection
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement && examData?.exam.antiCheatEnabled) {
        logEvent('fullscreen_exit');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, [antiCheatEnabled]);

  // Context menu blocking
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      if (examData?.exam.antiCheatEnabled) {
        e.preventDefault();
        logEvent('right_click');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [antiCheatEnabled]);

  // Copy/Paste/Cut blocking
  useEffect(() => {
    const handleCopy = (e: ClipboardEvent) => {
      if (examData?.exam.antiCheatEnabled) {
        e.preventDefault();
        logEvent('copy_attempt');
      }
    };

    const handlePaste = (e: ClipboardEvent) => {
      if (examData?.exam.antiCheatEnabled) {
        e.preventDefault();
        logEvent('paste_attempt');
      }
    };

    const handleCut = (e: ClipboardEvent) => {
      if (examData?.exam.antiCheatEnabled) {
        e.preventDefault();
        logEvent('cut_attempt');
      }
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
    };
  }, [antiCheatEnabled]);

  // Keyboard shortcut blocking
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!examData?.exam.antiCheatEnabled) return;

      const isCtrl = e.ctrlKey || e.metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)
      
      // Block common shortcuts
      const blockedShortcuts = [
        { key: 'c', ctrl: true, name: 'Copy' },
        { key: 'v', ctrl: true, name: 'Paste' },
        { key: 'x', ctrl: true, name: 'Cut' },
        { key: 'a', ctrl: true, name: 'Select All' },
        { key: 'p', ctrl: true, name: 'Print' },
        { key: 's', ctrl: true, name: 'Save' },
        { key: 'F12', ctrl: false, name: 'DevTools' },
      ];

      for (const shortcut of blockedShortcuts) {
        const keyMatches = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? isCtrl : true;
        
        if (keyMatches && ctrlMatches) {
          e.preventDefault();
          logEvent('keyboard_shortcut');
          console.log(`[ANTI-CHEAT] Blocked keyboard shortcut: ${shortcut.name}`);
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [antiCheatEnabled]);

  // Prevent navigation away
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmittingRef.current && examData?.attempt.status === 'in_progress') {
        e.preventDefault();
        e.returnValue = '';
        logEvent('page_unload');
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [antiCheatEnabled]);

  // ============================================================================
  // EXAM SUBMISSION
  // ============================================================================

  const handleAutoSubmit = async () => {
    // Auto-submit when time runs out - no confirmation needed
    await submitExam(true);
  };

  const handleManualSubmit = async () => {
    // Manual submit - validate and confirm
    const unansweredCount = examData!.questions.length - Object.keys(answers).length;
    
    if (unansweredCount > 0) {
      const confirmSubmit = window.confirm(
        `You have ${unansweredCount} unanswered question${unansweredCount > 1 ? 's' : ''}. Are you sure you want to submit?`
      );
      if (!confirmSubmit) return;
    } else {
      const confirmSubmit = window.confirm(
        'Are you sure you want to submit your exam? You cannot change your answers after submission.'
      );
      if (!confirmSubmit) return;
    }
    
    await submitExam(false);
  };

  const submitExam = async (autoSubmit: boolean) => {
    if (isSubmittingRef.current || !attemptId) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // 1. Stop screen recording if active
      if (isRecording) {
        try {
          const finalBlob = await stopRecording();
          if (finalBlob) {
            // Upload final recording
            const formData = new FormData();
            formData.append('recording', finalBlob);
            formData.append('attemptId', attemptId);

            const headers = getAuthHeaders();
            await fetch(apiEndpoint('/api/recordings/finalize'), {
              method: 'POST',
              headers: {
                ...headers,
              },
              body: formData
            });
            console.log('[RECORDING] Final recording uploaded');
          }
        } catch (err) {
          console.error('[RECORDING] Failed to finalize recording:', err);
          // Continue with submission even if recording fails
        }
      }

      // 2. Save final answers
      await saveAnswers();

      // 3. Log submission event
      await logEvent('page_unload');

      // 3. Submit attempt with retry logic
      const headers = getAuthHeaders();
      let retries = 3;
      let lastError: Error | null = null;

      while (retries > 0) {
        try {
          const response = await fetch(
            apiEndpoint(`/api/exam-attempts/${attemptId}/submit`),
            {
              method: 'POST',
              headers: {
                ...headers,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                timeRemaining: timeLeft,
                finalAnswers: Object.entries(answersRef.current).map(([questionId, answer]) => ({
                  questionId,
                  answer
                }))
              })
            }
          );

          if (response.ok) {
            // Success - navigate to results
            const data = await response.json().catch(() => null);
            if (data?.xp) {
              import('@/hooks/useXPAward').then(({ triggerXPAward, triggerQuestCompletion }) => {
                triggerXPAward(data.xp);
                if (Array.isArray(data.completedQuests)) {
                  data.completedQuests.forEach((quest: any) => {
                    triggerQuestCompletion({
                      title: quest.title,
                      xpAwarded: quest.xpAward
                    });
                  });
                }
              });
            }
            setLocation(`/student/exams/${examId}/results/${attemptId}`);
            return;
          }

          const errorData = await response.json().catch(() => ({ message: 'Failed to submit exam' }));
          throw new Error(errorData.message || 'Failed to submit exam');
        } catch (err) {
          lastError = err as Error;
          retries--;
          
          // Wait before retry (exponential backoff)
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
          }
        }
      }

      // All retries failed
      throw lastError || new Error('Failed to submit exam after multiple attempts');

    } catch (err) {
      console.error('Error submitting exam:', err);
      
      // Show user-friendly error message
      const errorMessage = err instanceof Error 
        ? err.message 
        : 'Failed to submit exam. Please check your connection and try again.';
      
      setError(errorMessage);
      
      // Show browser alert for critical failure
      alert(
        'Submission Failed\n\n' + 
        errorMessage + 
        '\n\nYour answers have been saved. Please check your internet connection and try submitting again.'
      );
      
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // ANSWER HANDLING
  // ============================================================================

  const handleAnswerChange = (questionId: string, answer: number | string | string[] | Record<string, string>) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const getTimeColor = () => {
    if (timeLeft < 60) return 'text-red-500 dark:text-red-500 animate-pulse';
    if (timeLeft < 300) return 'text-orange-500 dark:text-orange-400';
    return 'dark:text-white text-slate-900';
  };

  // ============================================================================
  // LOADING & ERROR STATES
  // ============================================================================

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 dark:border-primary border-yellow-400 mx-auto"></div>
          <p className="dark:text-slate-400 text-slate-600">Loading exam...</p>
        </div>
      </div>
    );
  }

  if (error || !examData) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
        <div className="max-w-md w-full dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2 block">error</span>
          <p className="dark:text-red-400 text-red-600 font-medium mb-4">{error || 'Failed to load exam'}</p>
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

  // Guard: no questions available
  if (!examData.questions || examData.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
        <div className="max-w-md w-full dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-4xl dark:text-orange-400 text-orange-600 mb-2 block">help</span>
          <p className="dark:text-slate-300 text-slate-700 font-medium mb-3">This exam currently has no questions.</p>
          <p className="text-xs dark:text-slate-500 text-slate-600 mb-6">Please contact your instructor or try another exam.</p>
          <button 
            onClick={() => setLocation('/student/exams')}
            className="px-6 py-2 dark:bg-primary/20 dark:hover:bg-primary/30 dark:text-primary bg-yellow-200 hover:bg-yellow-300 text-yellow-800 rounded-lg transition-all font-medium"
          >
            Back to Exams
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = examData.questions[currentIndex];

  return (
    <div className="flex flex-col h-screen dark:bg-[#0a192f] bg-white overflow-hidden">
      {/* Proctoring Consent Dialog */}
      <ProctoringConsent
        isOpen={showProctoringConsent}
        onAccept={handleProctoringAccept}
        onDecline={handleProctoringDecline}
        examTitle={examData.exam.title}
      />

      {/* Proctoring Alert */}
      <ProctoringAlert
        isOpen={proctoringAlert.isOpen}
        type={proctoringAlert.type}
        onDismiss={() => setProctoringAlert({ ...proctoringAlert, isOpen: false })}
      />

      {/* Proctoring Overlay (shows webcam preview) */}
      {examData.exam.antiCheatEnabled && proctoringStatus.status === 'active' && (
        <ProctoringOverlay
          status={proctoringStatus}
          webcamRef={webcamRef}
          showPreview={true}
        />
      )}

      {/* Hidden video element for face detection (used by proctoring hook) */}
      {/* Must have proper dimensions for face-api.js to work - visually hidden but not size=0 */}
      <video
        ref={webcamRef}
        autoPlay
        playsInline
        muted
        style={{ 
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '640px',
          height: '480px',
          visibility: 'hidden',
          pointerEvents: 'none'
        }}
      />

      {/* Submitting Overlay */}
      {isSubmitting && (
        <div className="fixed inset-0 dark:bg-black/80 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-2xl p-8 max-w-md mx-4 shadow-2xl">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 dark:border-green-500 border-green-600 mx-auto"></div>
              <h3 className="text-xl font-bold dark:text-white text-slate-900">Submitting Your Exam</h3>
              <p className="dark:text-slate-400 text-slate-600 text-sm">
                Please wait while we process your submission. Do not close this window.
              </p>
              <div className="flex items-center gap-2 justify-center pt-2">
                <div className="size-2 rounded-full dark:bg-green-500 bg-green-600 animate-pulse"></div>
                <p className="text-xs dark:text-slate-500 text-slate-600">Saving answers...</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-20 dark:bg-navy-card dark:border-navy-border bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="dark:text-white text-slate-900 text-lg font-bold leading-tight tracking-tight">{examData.exam.title}</h1>
            <div className="flex items-center gap-3">
              <p className="dark:text-slate-400 text-slate-600 text-xs font-normal">
                {examData.attempt.isRetake ? 'Mistake Resolution Mode' : 'Proctored Exam Session'}
              </p>
              <AutoSaveIndicator status={saveStatus} lastSaved={lastSaved} />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center">
          <div className={`flex items-center gap-2 dark:bg-navy-dark dark:border-navy-border bg-slate-100 border border-slate-200 px-4 py-2 rounded-full shadow-inner`}>
            <span className="material-symbols-outlined dark:text-primary text-yellow-500" style={{ fontSize: '20px' }}>timer</span>
            <span className={`text-xl font-bold tracking-widest tabular-nums ${getTimeColor()}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
          <span className="text-[10px] dark:text-slate-500 text-slate-600 mt-1 uppercase tracking-wider font-medium">Auto-Submit at 00:00</span>
        </div>

        <button 
          onClick={handleManualSubmit}
          disabled={isSubmitting}
          className={`flex items-center gap-2 px-5 h-10 rounded-full transition-colors font-bold text-sm ${
            isSubmitting
              ? 'dark:bg-slate-700 dark:text-slate-400 bg-slate-300 text-slate-600 cursor-not-allowed'
              : 'dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900'
          }`}
        >
          {isSubmitting ? (
            <>
              <span className="material-symbols-outlined animate-spin" style={{ fontSize: '18px' }}>progress_activity</span>
              Submitting...
            </>
          ) : (
            <>
              Submit Exam
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>check_circle</span>
            </>
          )}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Question Navigator Sidebar - Desktop Only */}
        <aside className="w-80 dark:bg-navy-dark dark:border-navy-border bg-slate-50 border-r border-slate-200 flex flex-col hidden lg:flex shrink-0">
          <div className="p-6 dark:border-navy-border border-b border-slate-200">
            <h2 className="dark:text-white text-slate-900 text-base font-semibold mb-4">Question Navigator</h2>
            <div className="grid grid-cols-5 gap-2">
              {examData.questions.map((q, i) => (
                <button 
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`aspect-square rounded flex items-center justify-center text-sm font-medium transition ${
                    currentIndex === i
                      ? 'dark:bg-primary dark:text-navy-dark bg-yellow-400 text-slate-900 scale-105 font-bold shadow-lg dark:shadow-lg dark:shadow-primary/30 shadow-yellow-400/30'
                      : answers[q.id] !== undefined
                      ? 'dark:bg-navy-border dark:text-white bg-slate-300 text-slate-700'
                      : 'dark:border-navy-border dark:text-slate-500 border border-slate-300 text-slate-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Session Monitor */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="dark:bg-navy-lighter/30 dark:border-navy-border bg-slate-100 border border-slate-200 rounded-lg p-4">
              <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase tracking-widest font-bold mb-2">Session Monitor</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs dark:text-slate-400 text-slate-600">Sync Active</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 dark:border-navy-border/50 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className={`size-1.5 rounded-full ${isFocused ? 'bg-green-500/50' : 'bg-yellow-500'}`}></div>
                    <span className="text-[11px] dark:text-slate-500 text-slate-600 font-medium">Activity focus</span>
                  </div>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isFocused ? 'dark:bg-green-500/10 dark:text-green-500 bg-green-100 text-green-700' : 'dark:bg-yellow-500/10 dark:text-yellow-500 bg-yellow-100 text-yellow-700'}`}>
                    {isFocused ? 'ACTIVE' : 'BACKGROUND'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto dark:bg-[#0a192f]/50 bg-slate-50/50 relative p-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Focus Notification - Transient */}
            {showFocusNotification && (
              <div className="dark:bg-navy-card/80 dark:border-navy-border bg-white/80 border border-slate-200 backdrop-blur-md px-5 py-3 rounded-xl flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <div className="size-8 rounded-full dark:bg-yellow-500/10 dark:text-yellow-500 bg-yellow-100 text-yellow-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[18px]">info</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold dark:text-slate-200 text-slate-800">Session focus adjustment</p>
                    <p className="text-[10px] dark:text-slate-400 text-slate-600">The browser window was redirected. Please maintain focus for session integrity.</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 dark:bg-navy-dark dark:border-navy-border bg-slate-100 border border-slate-200 rounded-full">
                  <span className="text-[9px] font-mono dark:text-slate-500 text-slate-600 uppercase tracking-widest">Notice</span>
                </div>
              </div>
            )}

            {/* Question Card */}
            <div className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded dark:bg-navy-dark dark:text-primary dark:border dark:border-navy-border bg-slate-100 text-yellow-600 border border-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                      Question • {currentIndex + 1} of {examData.questions.length}
                    </span>
                    <h2 className="text-2xl font-bold dark:text-white text-slate-900">Question {currentIndex + 1}</h2>
                  </div>
                  <span className="text-sm dark:text-slate-400 text-slate-600 font-medium">{currentQuestion.points} points</span>
                </div>

                <div className="text-lg dark:text-slate-200 text-slate-800 leading-relaxed">
                  <QuestionContentRenderer content={currentQuestion.questionText} />
                </div>

                {/* Render answer input based on question type */}
                <div className="flex flex-col gap-3">
                  {/* Multiple Choice & True/False */}
                  {(currentQuestion.questionType === 'multiple_choice' || currentQuestion.questionType === 'true_false') && (
                    <>
                      <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-2">Select one answer:</p>
                      {currentQuestion.options.map((opt, i) => {
                        const optionText = typeof opt === 'string' ? opt : opt.text;
                        return (
                          <label 
                            key={i} 
                            className={`group relative flex items-center p-4 rounded-lg border cursor-pointer transition-all ${
                              answers[currentQuestion.id] === i
                                ? 'dark:border-primary dark:bg-primary/10 border-yellow-400 bg-yellow-100/50'
                                : 'dark:border-navy-border dark:bg-navy-dark/50 dark:hover:bg-navy-dark bg-slate-100 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            <input 
                              className="peer sr-only" 
                              name="answer" 
                              type="radio" 
                              checked={answers[currentQuestion.id] === i}
                              onChange={() => handleAnswerChange(currentQuestion.id, i)}
                            />
                            <div className={`flex-shrink-0 size-5 rounded-full border mr-4 flex items-center justify-center transition-colors ${
                              answers[currentQuestion.id] === i
                                ? 'dark:bg-primary dark:border-primary bg-yellow-400 border-yellow-400'
                                : 'dark:border-slate-500 dark:group-hover:border-primary border-slate-400 group-hover:border-yellow-400'
                            }`}>
                              {answers[currentQuestion.id] === i && (
                                <div className="size-2 dark:bg-navy-dark bg-white rounded-full"></div>
                              )}
                            </div>
                            <span className={`flex-1 transition-colors ${
                              answers[currentQuestion.id] === i
                                ? 'dark:text-white text-slate-900 font-bold'
                                : 'dark:text-slate-300 text-slate-700 group-hover:dark:text-white group-hover:text-slate-900 font-medium'
                            }`}>
                              {String.fromCharCode(65 + i)}. {optionText}
                            </span>
                          </label>
                        );
                      })}
                    </>
                  )}

                                    {/* Essay Question with Rich Text Editor */}
                  {currentQuestion.questionType === 'essay' && (
                    <Suspense fallback={<div className="rounded-lg border border-slate-300 dark:border-navy-border p-4 text-sm text-slate-600 dark:text-slate-400">Loading editor...</div>}>
                      <RichTextEditor
                        value={(answers[currentQuestion.id] as string) || ''}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                        placeholder="Write your essay answer here... Be thorough and provide detailed explanations."
                        maxLength={5000}
                      />
                    </Suspense>
                  )}

                  {/* Short Answer Question */}
                  {currentQuestion.questionType === 'short_answer' && (
                    <>
                      <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-2">Type your answer:</p>
                      <input
                        type="text"
                        className="w-full p-4 rounded-lg border dark:bg-navy-dark dark:border-navy-border dark:text-white bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary"
                        placeholder="Type your answer here..."
                        value={(answers[currentQuestion.id] as string) || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      />
                    </>
                  )}

                  {/* Fill in the Blank with Inline Inputs */}
                  {currentQuestion.questionType === 'fill_blank' && (
                    <FillBlankQuestion
                      questionText={currentQuestion.questionText}
                      value={(answers[currentQuestion.id] as string[]) || []}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                    />
                  )}

                  {/* Code Question with Monaco Editor */}
                  {currentQuestion.questionType === 'code' && (
                    <Suspense fallback={<div className="rounded-lg border border-slate-300 dark:border-navy-border p-4 text-sm text-slate-600 dark:text-slate-400">Loading code editor...</div>}>
                      <CodeEditor
                        value={(answers[currentQuestion.id] as string) || ''}
                        onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                        language="javascript"
                        height="400px"
                        maxLines={200}
                      />
                    </Suspense>
                  )}

                  {/* Matching Question with Dropdown Selectors */}
                  {currentQuestion.questionType === 'matching' && (
                    <MatchingQuestion
                      leftItems={currentQuestion.leftItems || []}
                      rightItems={currentQuestion.rightItems || []}
                      value={(answers[currentQuestion.id] as Record<string, string>) || {}}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                    />
                  )}

                  {/* Fallback for unknown question types */}
                  {!['multiple_choice', 'true_false', 'essay', 'short_answer', 'fill_blank', 'code', 'matching'].includes(currentQuestion.questionType) && (
                    <>
                      <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-2">Your answer:</p>
                      <textarea
                        className="w-full min-h-[200px] p-4 rounded-lg border dark:bg-navy-dark dark:border-navy-border dark:text-white bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                        placeholder="Type your answer here..."
                        value={(answers[currentQuestion.id] as string) || ''}
                        onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      />
                      <p className="text-xs dark:text-orange-400 text-orange-600">
                        Unknown question type: {currentQuestion.questionType}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between gap-4">
              <button 
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex(currentIndex - 1)}
                className="flex items-center gap-2 px-6 h-12 rounded-lg dark:border-navy-border dark:bg-navy-card dark:text-white dark:hover:bg-navy-border border border-slate-300 bg-white text-slate-900 hover:bg-slate-100 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">arrow_back</span> Previous
              </button>

              {currentIndex < examData.questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="flex items-center gap-2 px-8 h-12 rounded-lg dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition font-bold shadow-lg dark:shadow-primary/20 shadow-yellow-400/20"
                >
                  Next Question <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              ) : (
                <button 
                  onClick={handleManualSubmit}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-8 h-12 rounded-lg dark:bg-green-500 dark:hover:bg-green-400 dark:text-white bg-green-500 hover:bg-green-600 text-white transition font-bold shadow-lg dark:shadow-green-500/20 shadow-green-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin material-symbols-outlined text-[20px]">sync</span>
                      Submitting...
                    </>
                  ) : (
                    <>
                      Submit Exam <span className="material-symbols-outlined text-[20px]">check_circle</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Info Banner */}
            <div className="dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg p-4">
              <div className="flex gap-2">
                <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 shrink-0 text-[20px]">info</span>
                <div className="space-y-1">
                  <p className="dark:text-blue-300 text-blue-700 text-xs leading-relaxed">
                    Your answers are automatically saved every 5 seconds. When you submit, your exam will be locked and you cannot make changes.
                  </p>
                  <p className="dark:text-blue-400 text-blue-600 text-[10px] leading-relaxed">
                    {Object.keys(answers).length} of {examData.questions.length} questions answered
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default StudentExamAttempt;

