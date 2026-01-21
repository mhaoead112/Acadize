import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import QuestionContentRenderer from '@/components/QuestionContentRenderer';
import '@/styles/TeacherAttemptReview.css';
import '@/components/QuestionContentRenderer.css';

// ============================================================================
// TYPES
// ============================================================================

interface Student {
  id: string;
  fullName: string;
  email: string;
}

interface Exam {
  id: string;
  title: string;
  duration: number;
  totalPoints: number;
  courseId: string;
}

interface Attempt {
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
  reviewStatus: string | null;
  reviewNotes: string | null;
  flaggedForReview: boolean;
  screenRecordingUrl: string | null;
  recordingMetadata: any | null;
}

interface RiskScore {
  overall: number;
  level: 'low' | 'medium' | 'high';
  behaviorScore: number;
  environmentScore: number;
  performanceScore: number;
}

interface AntiCheatEvent {
  id: string;
  eventType: string;
  severity: 'low' | 'medium' | 'high';
  description: string | null;
  timestamp: string;
  metadata: any;
  reviewStatus: string;
}

interface Statistics {
  totalEvents: number;
  focusLossCount: number;
  tabSwitchCount: number;
  copyAttemptCount: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
}

interface StudentAnswer {
  questionId: string;
  questionText: string;
  questionType: string;
  pointsAwarded: number | null;
  maxPoints: number;
  studentResponse: any;
  isCorrect: boolean | null;
  feedback?: string | null;
  modelAnswer?: any;
  difficulty?: string;
}

interface ReviewData {
  attempt: Attempt;
  student: Student;
  exam: Exam;
  riskScore: RiskScore;
  events: AntiCheatEvent[];
  statistics: Statistics;
  answers?: StudentAnswer[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TeacherAttemptReview() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute('/teacher/attempts/:attemptId/review');
  const attemptId = params?.attemptId;

  const { getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { toast } = useToast();

  // Data state
  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  
  // Decision dialog state
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'valid' | 'invalid' | 'allow_retake' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');
  
  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Score adjustments state
  const [scoreAdjustments, setScoreAdjustments] = useState<Record<string, number>>({});
  
  // Feedback state
  const [feedback, setFeedback] = useState('');
  
  // System time state
  const [systemTime, setSystemTime] = useState('');

  // Fetch review data on mount
  useEffect(() => {
    if (attemptId) {
      fetchReviewData();
    }
  }, [attemptId]);

  // Update system time
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toISOString().replace('T', '_').substring(0, 19) + '_UTC';
      setSystemTime(formatted);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchReviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exam-attempts/${attemptId}/review`), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error('Failed to fetch review data');
      }

      const reviewData = await response.json();
      setData(reviewData);
      
      // Initialize score adjustments from data
      if (reviewData.answers) {
        const initialScores: Record<string, number> = {};
        reviewData.answers.forEach((ans: StudentAnswer) => {
          initialScores[ans.questionId] = ans.pointsAwarded || 0;
        });
        setScoreAdjustments(initialScores);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attempt review');
    } finally {
      setLoading(false);
    }
  };

  const handleDecisionClick = (decision: 'valid' | 'invalid' | 'allow_retake') => {
    setPendingDecision(decision);
    setShowConfirmDialog(true);
    setDecisionNotes('');
  };

  const confirmDecision = async () => {
    if (!pendingDecision || !attemptId) return;

    setProcessing(true);
    try {
      const response = await fetch(apiEndpoint(`/api/exam-attempts/${attemptId}/decision`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          decision: pendingDecision,
          notes: decisionNotes || undefined,
        }),
      });

      if (!response.ok) throw new Error('Failed to process decision');

      await fetchReviewData();
      setShowConfirmDialog(false);
      setPendingDecision(null);
      setDecisionNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to process decision');
    } finally {
      setProcessing(false);
    }
  };

  // Video player handlers
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  // Score adjustment handlers
  const handleScoreChange = (questionId: string, value: number) => {
    setScoreAdjustments(prev => ({ ...prev, [questionId]: value }));
  };

  const applyScoreAdjustment = async (questionId: string) => {
    if (!attemptId) return;
    
    try {
      const response = await fetch(apiEndpoint(`/api/exam-attempts/${attemptId}/adjust-score`), {
        method: 'PATCH',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          questionId,
          newScore: scoreAdjustments[questionId],
        }),
      });

      if (!response.ok) throw new Error('Failed to adjust score');

      const result = await response.json();
      
      // Update local data with new totals
      if (data && answers) {
        // Update the specific answer's points
        const updatedAnswers = answers.map(ans => 
          ans.questionId === questionId 
            ? { ...ans, pointsAwarded: scoreAdjustments[questionId] }
            : ans
        );
        
        setData({
          ...data,
          attempt: {
            ...data.attempt,
            score: result.totalScore,
            percentage: result.percentage,
          },
          answers: updatedAnswers,
        });
      }

      toast({
        title: "Score Updated",
        description: `New total: ${result.totalScore} points (${result.percentage}%)`,
      });
    } catch (error: any) {
      console.error('Error adjusting score:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to adjust score',
        variant: "destructive",
      });
    }
  };

  // Feedback handlers
  const addSnippet = (snippet: string) => {
    setFeedback(prev => prev + (prev ? ' ' : '') + snippet);
  };

  const sendFeedback = async () => {
    if (!attemptId || !feedback.trim()) {
      toast({
        title: "Validation Error",
        description: 'Please enter feedback before sending',
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(apiEndpoint(`/api/exam-attempts/${attemptId}/feedback`), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          feedback: feedback.trim(),
        }),
      });

      if (!response.ok) throw new Error('Failed to send feedback');

      const result = await response.json();
      
      // Update local data
      if (data) {
        setData({
          ...data,
          attempt: result.attempt,
        });
      }

      toast({
        title: "Feedback Sent",
        description: 'Student has been notified of your feedback',
      });
      setFeedback('');
    } catch (error: any) {
      console.error('Error sending feedback:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to send feedback',
        variant: "destructive",
      });
    }
  };

  // Utility functions
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-amber-400';
      case 'low': return 'text-primary';
      default: return 'text-slate-500';
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500/10 border-red-500/20';
      case 'medium': return 'bg-amber-500/10 border-amber-500/20';
      case 'low': return 'bg-primary/10 border-primary/20';
      default: return 'bg-slate-800 border-slate-700';
    }
  };

  const getSeverityBorder = (severity: string) => {
    switch (severity) {
      case 'high': return 'border-red-500/30';
      case 'medium': return 'border-amber-500/30';
      case 'low': return 'border-primary/30';
      default: return 'border-slate-700';
    }
  };

  const getSeverityDot = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
      case 'medium': return 'bg-amber-500';
      case 'low': return 'bg-primary';
      default: return 'bg-slate-700';
    }
  };

  const getSeverityLabel = (severity: string) => {
    switch (severity) {
      case 'high': return 'CRITICAL';
      case 'medium': return 'WARNING';
      case 'low': return 'LOG';
      default: return 'INFO';
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary"></div>
      </div>
    );
  }

  // Error state
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <span className="material-symbols-outlined text-6xl text-slate-700 mb-4">error</span>
        <h2 className="text-2xl font-bold text-white mb-2">Failed to load review</h2>
        <p className="text-slate-400 mb-6">{error || 'Attempt data not found'}</p>
        <button 
          onClick={() => navigate('/teacher/exams')} 
          className="bg-primary text-black px-6 py-2 rounded-lg font-bold hover:bg-yellow-500 transition-colors"
        >
          Back to Exams
        </button>
      </div>
    );
  }

  const { attempt, student, exam, riskScore, events, statistics, answers } = data;

  return (
    <div className={`review-dashboard min-h-screen bg-slate-950 font-display text-slate-200 antialiased overflow-hidden ${isDark ? 'dark' : ''}`}>
      
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-card p-8 max-w-lg w-full shadow-2xl rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-amber-500 text-3xl">warning</span>
              <h3 className="text-xl font-bold text-white">Confirm Decision</h3>
            </div>
            
            <p className="text-slate-400 mb-4">
              {pendingDecision === 'valid' && 'Mark this attempt as valid? The score will be officially recorded.'}
              {pendingDecision === 'invalid' && 'Invalidate this attempt? The score will be removed and marked as compromised.'}
              {pendingDecision === 'allow_retake' && 'Allow a graded retake? The student will be granted another attempt.'}
            </p>

            <textarea
              className="w-full bg-navy-900 border border-slate-700 rounded-xl px-4 py-3 text-white mb-6 outline-none focus:border-primary transition-all resize-none"
              rows={3}
              placeholder="Add review notes (optional)..."
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
            />

            <div className="flex gap-3">
              <button
                onClick={confirmDecision}
                disabled={processing}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  pendingDecision === 'invalid' ? 'bg-red-500 text-white hover:bg-red-600' : 'bg-primary text-black hover:bg-yellow-500'
                }`}
              >
                {processing && <span className="animate-spin border-2 border-current border-t-transparent rounded-full size-4"></span>}
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingDecision(null);
                  setDecisionNotes('');
                }}
                disabled={processing}
                className="px-6 py-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 glass-card border-b border-slate-700/50 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* <div className="flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined text-3xl">shield_person</span>
            <h1 className="font-bold text-xl tracking-tight hidden md:block">PROCTOR_v2.0</h1>
          </div> */}
          {/* <nav className="flex items-center gap-2 text-sm font-medium text-slate-400">
            <button onClick={() => navigate('/teacher/exams')} className="hover:text-primary transition-colors">Exams</button>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="hover:text-primary transition-colors truncate max-w-[150px]">{exam.title}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-white">Review</span>
          </nav> */}
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex flex-col items-end mr-4">
            <span className="text-xs text-slate-500 uppercase font-bold tracking-widest">Reviewing Session</span>
            <span className="text-sm font-mono text-primary">ID: {attempt.id.slice(0, 12).toUpperCase()}</span>
          </div>
          <button 
            onClick={() => handleDecisionClick('valid')}
            className="bg-primary hover:bg-yellow-500 text-black px-5 py-2 rounded font-bold text-sm transition-all gold-glow flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">verified</span>
            GRADE APPROVED
          </button>
          <div className="h-8 w-8 rounded-full bg-slate-700 border border-slate-600 overflow-hidden flex items-center justify-center text-xs font-bold text-white uppercase">
            {student.fullName[0]}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto p-6 grid grid-cols-12 gap-6 h-[calc(100vh-100px)] overflow-hidden">
        
        {/* Left Column: Surveillance & Timeline */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pr-2">
          
          {/* Video Player */}
          <div className="glass-card rounded-xl overflow-hidden shadow-2xl">
            <div className="relative aspect-video bg-black flex items-center justify-center group">
              {attempt.screenRecordingUrl ? (
                <video 
                  ref={videoRef}
                  src={attempt.screenRecordingUrl}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onClick={togglePlay}
                />
              ) : (
                <div className="text-center p-8">
                  <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">videocam_off</span>
                  <p className="text-xs text-slate-500">No recording available</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none"></div>
              
              {/* Webcam Overlay */}
              <div className="absolute top-3 right-3 w-24 aspect-square rounded-lg border-2 border-primary/50 overflow-hidden shadow-lg bg-slate-900">
                <div className="w-full h-full flex items-center justify-center">
                  <span className="material-symbols-outlined text-slate-600">person</span>
                </div>
              </div>

              {!isPlaying && attempt.screenRecordingUrl && (
                <button 
                  onClick={togglePlay}
                  className="absolute inset-0 m-auto size-14 rounded-full bg-primary/20 text-primary border border-primary/50 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform z-10"
                >
                  <span className="material-symbols-outlined text-3xl">play_arrow</span>
                </button>
              )}

              {/* Player Controls */}
              {attempt.screenRecordingUrl && (
                <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all">
                  <div className="flex gap-1 h-1">
                    <div className="bg-primary h-full rounded-full" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
                    <div className="bg-slate-700 h-full flex-1 rounded-full"></div>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{formatTime(currentTime)}</span>
                    <div className="flex gap-3 items-center">
                      <select 
                        value={playbackRate}
                        onChange={(e) => handlePlaybackRateChange(parseFloat(e.target.value))}
                        className="bg-transparent text-primary border-none text-[10px] font-bold cursor-pointer outline-none"
                      >
                        <option value="1">1.0x</option>
                        <option value="1.5">1.5x</option>
                        <option value="2">2.0x</option>
                      </select>
                      <span 
                        className="material-symbols-outlined text-sm cursor-pointer hover:text-primary transition-colors"
                        onClick={() => videoRef.current?.requestFullscreen()}
                      >
                        fullscreen
                      </span>
                    </div>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-900/50">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Activity Waveform</h3>
                <span className="text-[10px] text-primary live-scan-point">LIVE SCAN</span>
              </div>
              <div className="h-10 flex items-end gap-[1px]">
                {Array.from({ length: 40 }).map((_, i) => {
                  const isHighActivity = events.some((e, idx) => idx === Math.floor((i / 40) * events.length) && e.severity === 'high');
                  const isMediumActivity = events.some((e, idx) => idx === Math.floor((i / 40) * events.length) && e.severity === 'medium');
                  return (
                    <div 
                      key={i} 
                      className={`flex-1 rounded-t-sm ${isHighActivity ? 'bg-red-500' : (isMediumActivity ? 'bg-amber-500' : (i % 5 === 0 ? 'bg-primary' : 'bg-slate-700'))}`}
                      style={{ height: `${Math.max(10, Math.min(100, 20 + (i % 7) * 15))}%` }}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Event Timeline */}
          <div className="glass-card rounded-xl p-4 flex-1">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-lg">history_edu</span>
              FORENSIC TIMELINE
            </h3>
            <div className="space-y-4">
              {events.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No events recorded</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className={`relative pl-6 border-l ${getSeverityBorder(event.severity)} py-1`}>
                    <div className={`absolute -left-[5px] top-2 size-2 rounded-full ${getSeverityDot(event.severity)}`}></div>
                    <div className="flex justify-between items-start">
                      <span className={`text-[11px] font-mono ${getSeverityColor(event.severity)}`}>
                        {formatDate(event.timestamp)}
                      </span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getSeverityBg(event.severity)} ${getSeverityColor(event.severity)} font-bold`}>
                        {getSeverityLabel(event.severity)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-200 mt-1 font-medium">{formatEventType(event.eventType)}</p>
                    {event.description && <p className="text-xs text-slate-500 italic">{event.description}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Center Column: Content & Review */}
        <div className="col-span-12 lg:col-span-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar px-2 pb-20">
          
          {/* Student Profile Summary */}
          <div className="glass-card rounded-xl p-6 flex flex-col md:flex-row items-center gap-6">
            <div className="relative">
              <div className="size-24 rounded-full border-2 border-primary p-1 animate-pulse-gold">
                <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-2xl font-bold text-white uppercase">
                  {student.fullName[0]}
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-green-500 size-5 rounded-full border-4 border-slate-900"></div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-white tracking-tight">{student.fullName}</h2>
              <p className="text-slate-400 text-sm">
                Attempt #{attempt.attemptNumber} • {attempt.status} • <span className="text-primary">Submission ID: {attempt.id.slice(0, 6)}</span>
              </p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <span className="px-3 py-1 bg-slate-800 rounded-full text-xs border border-slate-700">{exam.title}</span>
                {attempt.reviewStatus && (
                  <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs border border-primary/20 font-bold">
                    {attempt.reviewStatus === 'approved' ? 'Verified' : attempt.reviewStatus}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-col items-center justify-center border-l border-slate-700 pl-6 h-full">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Raw Score</p>
              <div className="text-4xl font-bold text-primary font-mono">
                {attempt.percentage !== null ? attempt.percentage : '--'}
                <span className="text-lg opacity-50">%</span>
              </div>
              {attempt.percentage !== null && (
                <p className="text-[10px] text-green-400 mt-1">
                  {attempt.percentage >= 70 ? '+' : ''}{Math.round(attempt.percentage - 70)}% vs avg
                </p>
              )}
            </div>
          </div>

          {/* Main Question Feed */}
          <div className="space-y-6">
            {answers && answers.length > 0 ? (
              answers.map((answer, index) => (
                <div 
                  key={answer.questionId} 
                  className={`glass-card rounded-xl overflow-hidden border-l-4 ${index === 0 ? 'border-l-primary' : 'border-l-slate-700'}`}
                >
                  <div className="bg-slate-800/50 px-6 py-4 flex justify-between items-center border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                      <span className={`${index === 0 ? 'bg-primary text-black' : 'bg-slate-700 text-white'} font-bold size-7 flex items-center justify-center rounded-lg text-sm`}>
                        {index + 1}
                      </span>
                      <span className="font-semibold">Question {index + 1}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400">
                        Type: <span className="text-white font-bold">{answer.questionType}</span>
                      </span>
                      <span className="text-xs font-mono bg-slate-900 px-2 py-1 rounded">
                        {scoreAdjustments[answer.questionId] || answer.pointsAwarded || 0}/{answer.maxPoints} PTS
                      </span>
                    </div>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="text-slate-300 text-sm">
                      <QuestionContentRenderer content={answer.questionText} />
                    </div>
                    
                    {answer.questionType === 'code' ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Student Response</label>
                          <pre className="bg-[#1a1b26] rounded-lg p-4 font-mono text-sm border border-slate-800 overflow-x-auto text-blue-400 whitespace-pre custom-scrollbar">
                            {typeof answer.studentResponse === 'string' ? answer.studentResponse : JSON.stringify(answer.studentResponse, null, 2)}
                          </pre>
                        </div>
                        {answer.modelAnswer && (
                          <div className="space-y-2 opacity-60">
                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Model Solution</label>
                            <pre className="bg-slate-900 rounded-lg p-4 font-mono text-sm border border-slate-800 overflow-x-auto text-slate-400 whitespace-pre custom-scrollbar">
                              {typeof answer.modelAnswer === 'string' ? answer.modelAnswer : JSON.stringify(answer.modelAnswer, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="bg-slate-900/80 p-6 rounded-lg border border-slate-800">
                          <p className="text-xs text-slate-500 uppercase mb-2 font-bold tracking-widest">Student Response</p>
                          <p className="text-white">
                            {typeof answer.studentResponse === 'string' ? answer.studentResponse : JSON.stringify(answer.studentResponse)}
                          </p>
                        </div>
                        {answer.modelAnswer && (
                          <div className="bg-slate-900/80 p-6 rounded-lg border border-slate-800 opacity-60">
                            <p className="text-xs text-slate-500 uppercase mb-2 font-bold tracking-widest">Correct Answer</p>
                            <p className="text-slate-400">
                              {typeof answer.modelAnswer === 'string' ? answer.modelAnswer : JSON.stringify(answer.modelAnswer)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Grading Slider */}
                    <div className="mt-6 pt-6 border-t border-slate-700/50 flex flex-col md:flex-row items-center gap-6">
                      <div className="flex-1 w-full">
                        <div className="flex justify-between text-xs mb-2">
                          <span className="text-slate-500 uppercase font-bold tracking-widest">Adjust Score</span>
                          <span className="text-primary font-bold">
                            {scoreAdjustments[answer.questionId] || answer.pointsAwarded || 0} / {answer.maxPoints}
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="0" 
                          max={answer.maxPoints} 
                          value={scoreAdjustments[answer.questionId] || answer.pointsAwarded || 0}
                          onChange={(e) => handleScoreChange(answer.questionId, parseInt(e.target.value))}
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button 
                          onClick={() => handleScoreChange(answer.questionId, Math.min(answer.maxPoints, (scoreAdjustments[answer.questionId] || answer.pointsAwarded || 0) + 1))}
                          className="size-8 flex items-center justify-center rounded bg-slate-800 border border-slate-700 hover:border-primary transition-colors text-slate-400"
                        >
                          <span className="material-symbols-outlined text-xl">add</span>
                        </button>
                        <button 
                          onClick={() => handleScoreChange(answer.questionId, Math.max(0, (scoreAdjustments[answer.questionId] || answer.pointsAwarded || 0) - 1))}
                          className="size-8 flex items-center justify-center rounded bg-slate-800 border border-slate-700 hover:border-primary transition-colors text-slate-400"
                        >
                          <span className="material-symbols-outlined text-xl">remove</span>
                        </button>
                        <button 
                          onClick={() => applyScoreAdjustment(answer.questionId)}
                          className="px-4 h-8 flex items-center justify-center rounded bg-primary text-black font-bold text-xs hover:bg-yellow-500 transition-colors"
                        >
                          APPLY
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="glass-card rounded-xl p-8 text-center">
                <span className="material-symbols-outlined text-4xl text-slate-700 mb-2">quiz</span>
                <p className="text-slate-500">No answers available for this attempt</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Insights & Sidebar */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-20">
          
          {/* Risk Level Gauge */}
          <div className="glass-card rounded-xl p-6 text-center">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">AI PROCTOR RISK LEVEL</h3>
            <div className="relative inline-flex items-center justify-center size-32">
              <svg className="size-full" viewBox="0 0 100 100">
                <circle className="text-slate-800 stroke-current" cx="50" cy="50" fill="transparent" r="40" strokeWidth="8"></circle>
                <circle 
                  className={`stroke-current ${riskScore.level === 'high' ? 'text-red-500' : riskScore.level === 'medium' ? 'text-amber-500' : 'text-green-500'}`}
                  cx="50" cy="50" 
                  fill="transparent" 
                  r="40" 
                  strokeWidth="8" 
                  strokeDasharray="251.2" 
                  strokeDashoffset={251.2 - (251.2 * riskScore.overall) / 100}
                  strokeLinecap="round" 
                  transform="rotate(-90 50 50)"
                ></circle>
              </svg>
              <div className="absolute flex flex-col">
                <span className="text-3xl font-bold text-white">{Math.round(riskScore.overall)}%</span>
                <span className={`text-[10px] font-bold uppercase ${riskScore.level === 'high' ? 'text-red-500' : riskScore.level === 'medium' ? 'text-amber-500' : 'text-green-500'}`}>
                  {riskScore.level}
                </span>
              </div>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Behavior Score</span>
                <span className="text-white">{Math.round(riskScore.behaviorScore)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Environment Score</span>
                <span className="text-white">{Math.round(riskScore.environmentScore)}%</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Performance Score</span>
                <span className="text-white">{Math.round(riskScore.performanceScore)}%</span>
              </div>
            </div>
          </div>

          {/* Attempt Metadata */}
          <div className="glass-card rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500">schedule</span>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Total Time Spent</p>
                <p className="text-sm font-semibold">
                  {attempt.submittedAt && attempt.startedAt 
                    ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 60000) + 'm'
                    : 'N/A'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500">event</span>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Started At</p>
                <p className="text-sm font-semibold">{formatDate(attempt.startedAt)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-slate-500">flag</span>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest leading-none">Total Events</p>
                <p className="text-sm font-semibold">{statistics.totalEvents}</p>
              </div>
            </div>
          </div>

          {/* Feedback Editor */}
          <div className="glass-card rounded-xl p-4 flex flex-col gap-4 flex-1">
            <h3 className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">chat_bubble</span>
              INSTRUCTOR FEEDBACK
            </h3>
            <textarea 
              className="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-sm focus:ring-1 focus:ring-primary focus:border-primary placeholder:text-slate-600 resize-none custom-scrollbar min-h-[150px]" 
              placeholder="Type detailed feedback here..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
            />
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase">Quick Snippets</p>
              <div className="flex flex-wrap gap-2">
                {['Great logic!', 'Optimization needed', 'Handle edge cases'].map(snippet => (
                  <button 
                    key={snippet}
                    onClick={() => addSnippet(snippet)}
                    className="px-2 py-1 bg-slate-800 text-xs rounded border border-slate-700 hover:border-primary text-slate-400 transition-colors"
                  >
                    {snippet}
                  </button>
                ))}
              </div>
            </div>
            <button 
              onClick={sendFeedback}
              className="w-full bg-primary/20 hover:bg-primary/30 text-primary py-2 rounded font-bold text-sm border border-primary/30 transition-colors mt-auto"
            >
              SEND FEEDBACK
            </button>
          </div>
        </div>
      </main>

      {/* Footer Status */}
      <footer className="fixed bottom-0 left-0 right-0 h-8 bg-slate-900 border-t border-slate-800 px-6 flex items-center justify-between text-[10px] font-mono text-slate-500 z-[60]">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <span className="size-2 rounded-full bg-green-500 animate-pulse"></span> SERVER CONNECTED
          </span>
          <span>LATENCY: 42ms</span>
        </div>
        <div>SYSTEM_TIME: {systemTime}</div>
      </footer>
    </div>
  );
}
