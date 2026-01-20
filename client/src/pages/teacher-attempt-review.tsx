import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import TeacherLayout from '../components/TeacherLayout';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '@/lib/config';

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

interface ReviewData {
  attempt: Attempt;
  student: Student;
  exam: Exam;
  riskScore: RiskScore;
  events: AntiCheatEvent[];
  statistics: Statistics;
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

  const [data, setData] = useState<ReviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<'valid' | 'invalid' | 'allow_retake' | null>(null);
  const [decisionNotes, setDecisionNotes] = useState('');

  // Styling
  const cardBase = isDark 
    ? 'bg-navy-900 border border-navy-700 rounded-2xl' 
    : 'bg-white border border-slate-200 rounded-2xl';
  const textPrimary = isDark ? 'text-white' : 'text-slate-900';
  const textMuted = isDark ? 'text-slate-400' : 'text-slate-600';
  const bgHover = isDark ? 'hover:bg-navy-800' : 'hover:bg-slate-50';

  useEffect(() => {
    if (attemptId) {
      fetchReviewData();
    }
  }, [attemptId]);

  const fetchReviewData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(apiEndpoint(`/api/exam-attempts/${attemptId}/review`), {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to fetch review data' }));
        throw new Error(errorData.message || 'Failed to fetch review data');
      }

      const reviewData = await response.json();
      setData(reviewData);
    } catch (err: any) {
      console.error('Error fetching review data:', err);
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to process decision' }));
        throw new Error(errorData.message || 'Failed to process decision');
      }

      // Refresh data
      await fetchReviewData();
      setShowConfirmDialog(false);
      setPendingDecision(null);
      setDecisionNotes('');
    } catch (err: any) {
      console.error('Error processing decision:', err);
      alert(err.message || 'Failed to process decision');
    } finally {
      setProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatEventType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  const getRiskColor = () => {
    if (!data) return isDark ? 'text-slate-400' : 'text-slate-600';
    switch (data.riskScore.level) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return 'text-green-500';
      default: return isDark ? 'text-slate-400' : 'text-slate-600';
    }
  };

  const getRiskBg = () => {
    if (!data) return isDark ? 'bg-navy-900' : 'bg-slate-100';
    switch (data.riskScore.level) {
      case 'high': return isDark ? 'bg-red-500/10' : 'bg-red-50';
      case 'medium': return isDark ? 'bg-orange-500/10' : 'bg-orange-50';
      case 'low': return isDark ? 'bg-green-500/10' : 'bg-green-50';
      default: return isDark ? 'bg-navy-900' : 'bg-slate-100';
    }
  };

  const getRiskBorder = () => {
    if (!data) return isDark ? 'border-navy-700' : 'border-slate-200';
    switch (data.riskScore.level) {
      case 'high': return isDark ? 'border-red-500/50' : 'border-red-300';
      case 'medium': return isDark ? 'border-orange-500/50' : 'border-orange-300';
      case 'low': return isDark ? 'border-green-500/50' : 'border-green-300';
      default: return isDark ? 'border-navy-700' : 'border-slate-200';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-orange-500';
      case 'low': return isDark ? 'text-blue-400' : 'text-blue-600';
      default: return textMuted;
    }
  };

  const getSeverityBg = (severity: string) => {
    switch (severity) {
      case 'high': return isDark ? 'bg-red-500/10' : 'bg-red-50';
      case 'medium': return isDark ? 'bg-orange-500/10' : 'bg-orange-50';
      case 'low': return isDark ? 'bg-blue-500/10' : 'bg-blue-50';
      default: return isDark ? 'bg-navy-900' : 'bg-slate-100';
    }
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center py-20">
          <div className={`animate-spin rounded-full h-10 w-10 border-4 border-t-transparent ${isDark ? 'border-primary' : 'border-yellow-400'}`}></div>
        </div>
      </TeacherLayout>
    );
  }

  if (error || !data) {
    return (
      <TeacherLayout>
        <div className="py-20 text-center space-y-4">
          <span className={`material-symbols-outlined text-[64px] ${textMuted}`}>error</span>
          <h2 className={`text-2xl font-bold ${textPrimary}`}>{error || 'Review data not found'}</h2>
          <p className={textMuted}>Unable to load the attempt review information.</p>
          <button
            onClick={() => navigate('/teacher/exams')}
            className={`px-6 py-2.5 ${cardBase} ${textPrimary} font-bold ${bgHover} transition-all`}
          >
            Back to Exams
          </button>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className={`${cardBase} p-8 max-w-lg w-full shadow-2xl`}>
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-orange-500 text-3xl">warning</span>
              <h3 className={`text-xl font-bold ${textPrimary}`}>Confirm Decision</h3>
            </div>
            
            <p className={`${textMuted} mb-4`}>
              {pendingDecision === 'valid' && 'Mark this attempt as valid? The score will be officially recorded.'}
              {pendingDecision === 'invalid' && 'Invalidate this attempt? The score will be removed and the attempt will be marked as compromised.'}
              {pendingDecision === 'allow_retake' && 'Allow a graded retake? The student will be granted another attempt opportunity.'}
            </p>

            <div className="mb-6">
              <label className={`block text-xs font-bold ${textMuted} uppercase mb-2`}>Notes (Optional)</label>
              <textarea
                className={`w-full ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-white border-slate-200'} border rounded-xl px-4 py-3 ${textPrimary} focus:ring-1 focus:ring-primary focus:border-primary transition-all resize-none`}
                rows={3}
                placeholder="Add any notes about this decision..."
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={confirmDecision}
                disabled={processing}
                className={`flex-1 py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 ${
                  pendingDecision === 'invalid'
                    ? isDark ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-primary text-navy-950 hover:bg-primary-hover shadow-lg shadow-primary/20'
                }`}
              >
                {processing && (
                  <span className="animate-spin border-2 border-current border-t-transparent rounded-full size-4"></span>
                )}
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingDecision(null);
                  setDecisionNotes('');
                }}
                disabled={processing}
                className={`px-6 py-3 rounded-xl font-bold ${isDark ? 'bg-navy-800 text-slate-400' : 'bg-slate-200 text-slate-600'} ${bgHover} transition-all`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Breadcrumb */}
      <div className={`flex flex-wrap items-center gap-2 pb-6 text-sm ${textMuted}`}>
        <button onClick={() => navigate('/teacher/dashboard')} className="hover:text-primary transition-colors">
          Dashboard
        </button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <button onClick={() => navigate(`/teacher/exams/${data.exam.id}`)} className="hover:text-primary transition-colors">
          {data.exam.title}
        </button>
        <span className="material-symbols-outlined text-[16px]">chevron_right</span>
        <span className={`${textPrimary} font-medium`}>Attempt Review</span>
      </div>

      {/* Header */}
      <div className={`flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 mb-8 ${isDark ? 'border-navy-800' : 'border-slate-200'}`}>
        <div>
          <div className="flex items-center gap-4 flex-wrap mb-2">
            <h1 className={`text-3xl lg:text-4xl font-black ${textPrimary}`}>Attempt Review</h1>
            {data.attempt.reviewStatus && (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                data.attempt.reviewStatus === 'approved'
                  ? isDark ? 'bg-green-950/40 border-green-600/50 text-green-400' : 'bg-green-100 border-green-300 text-green-700'
                  : data.attempt.reviewStatus === 'rejected'
                  ? isDark ? 'bg-red-950/40 border-red-600/50 text-red-400' : 'bg-red-100 border-red-300 text-red-700'
                  : isDark ? 'bg-navy-900 border-navy-700 text-slate-400' : 'bg-slate-100 border-slate-300 text-slate-600'
              }`}>
                {data.attempt.reviewStatus === 'approved' && 'Validated'}
                {data.attempt.reviewStatus === 'rejected' && 'Invalidated'}
                {data.attempt.reviewStatus === 'retake_granted' && 'Retake Granted'}
                {!['approved', 'rejected', 'retake_granted'].includes(data.attempt.reviewStatus) && 'Pending Review'}
              </span>
            )}
          </div>
          <p className={`${textMuted} flex items-center gap-2`}>
            <span className="material-symbols-outlined text-[18px]">person</span>
            {data.student.fullName} • Attempt #{data.attempt.attemptNumber}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className={`${cardBase} p-5 flex items-center gap-4`}>
          <div className={`size-12 rounded-xl ${isDark ? 'bg-navy-950' : 'bg-slate-100'} flex items-center justify-center text-primary`}>
            <span className="material-symbols-outlined">grade</span>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Score</p>
            <p className={`text-lg font-bold ${textPrimary}`}>
              {data.attempt.score !== null ? `${data.attempt.score}/${data.exam.totalPoints}` : 'N/A'}
            </p>
          </div>
        </div>
        
        <div className={`${cardBase} p-5 flex items-center gap-4`}>
          <div className={`size-12 rounded-xl ${isDark ? 'bg-navy-950' : 'bg-slate-100'} flex items-center justify-center ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
            <span className="material-symbols-outlined">percent</span>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Percentage</p>
            <p className={`text-lg font-bold ${textPrimary}`}>
              {data.attempt.percentage !== null ? `${data.attempt.percentage}%` : 'N/A'}
            </p>
          </div>
        </div>

        <div className={`${cardBase} p-5 flex items-center gap-4`}>
          <div className={`size-12 rounded-xl ${isDark ? 'bg-navy-950' : 'bg-slate-100'} flex items-center justify-center ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>
            <span className="material-symbols-outlined">event</span>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Events Logged</p>
            <p className={`text-lg font-bold ${textPrimary}`}>{data.statistics.totalEvents}</p>
          </div>
        </div>

        <div className={`${cardBase} p-5 flex items-center gap-4`}>
          <div className={`size-12 rounded-xl ${isDark ? 'bg-navy-950' : 'bg-slate-100'} flex items-center justify-center text-orange-500`}>
            <span className="material-symbols-outlined">timer</span>
          </div>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest ${textMuted}`}>Submitted</p>
            <p className={`text-sm font-bold ${textPrimary}`}>
              {data.attempt.submittedAt ? formatDate(data.attempt.submittedAt) : 'In Progress'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Risk Assessment */}
          <div className={`${cardBase} p-8`}>
            <h3 className={`text-xl font-bold ${textPrimary} mb-6 flex items-center gap-2`}>
              <span className="material-symbols-outlined text-primary">analytics</span>
              Risk Assessment
            </h3>

            <div className={`p-6 rounded-xl border ${getRiskBorder()} ${getRiskBg()}`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className={`text-sm font-bold ${textMuted} uppercase tracking-wider mb-1`}>Overall Risk Score</p>
                  <p className={`text-4xl font-black ${getRiskColor()}`}>
                    {Math.round(data.riskScore.overall)}
                    <span className="text-2xl">/100</span>
                  </p>
                </div>
                <div className={`px-4 py-2 rounded-lg border ${getRiskBorder()} ${getRiskBg()}`}>
                  <p className={`text-xs font-black uppercase ${getRiskColor()}`}>
                    {data.riskScore.level} RISK
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6">
                <div>
                  <p className={`text-xs font-bold ${textMuted} mb-1`}>Behavior</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{Math.round(data.riskScore.behaviorScore)}</p>
                </div>
                <div>
                  <p className={`text-xs font-bold ${textMuted} mb-1`}>Environment</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{Math.round(data.riskScore.environmentScore)}</p>
                </div>
                <div>
                  <p className={`text-xs font-bold ${textMuted} mb-1`}>Performance</p>
                  <p className={`text-lg font-bold ${textPrimary}`}>{Math.round(data.riskScore.performanceScore)}</p>
                </div>
              </div>
            </div>

            <div className={`mt-6 p-4 rounded-lg border ${isDark ? 'bg-blue-500/10 border-blue-500/50 text-blue-400' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
              <div className="flex gap-3 items-start">
                <span className="material-symbols-outlined text-[20px] flex-shrink-0">info</span>
                <div className="text-sm">
                  <p className="font-bold mb-1">Review Note</p>
                  <p>Risk scores are automated assessments based on behavioral patterns. Please review all events and context before making a final decision.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Event Statistics */}
          <div className={`${cardBase} p-8`}>
            <h3 className={`text-xl font-bold ${textPrimary} mb-6`}>Event Statistics</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {[
                { label: 'Focus Loss', value: data.statistics.focusLossCount, icon: 'visibility_off', color: 'text-orange-500' },
                { label: 'Tab Switches', value: data.statistics.tabSwitchCount, icon: 'tab', color: 'text-yellow-500' },
                { label: 'Copy Attempts', value: data.statistics.copyAttemptCount, icon: 'content_copy', color: 'text-red-500' },
                { label: 'High Severity', value: data.statistics.highSeverityCount, icon: 'priority_high', color: 'text-red-500' },
                { label: 'Medium Severity', value: data.statistics.mediumSeverityCount, icon: 'warning', color: 'text-orange-500' },
                { label: 'Low Severity', value: data.statistics.lowSeverityCount, icon: 'info', color: isDark ? 'text-blue-400' : 'text-blue-600' },
              ].map((stat, idx) => (
                <div key={idx} className={`${isDark ? 'bg-navy-950' : 'bg-slate-50'} rounded-lg p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`material-symbols-outlined text-[18px] ${stat.color}`}>{stat.icon}</span>
                    <p className={`text-xs font-bold ${textMuted}`}>{stat.label}</p>
                  </div>
                  <p className={`text-2xl font-black ${textPrimary}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Events Timeline */}
          <div className={`${cardBase} p-8`}>
            <h3 className={`text-xl font-bold ${textPrimary} mb-6`}>Anti-Cheat Events</h3>
            
            {data.events.length === 0 ? (
              <div className={`text-center py-12 ${isDark ? 'bg-navy-900/30' : 'bg-slate-50'} border-2 border-dashed ${isDark ? 'border-navy-800' : 'border-slate-200'} rounded-2xl`}>
                <span className={`material-symbols-outlined text-[48px] ${isDark ? 'text-navy-700' : 'text-slate-300'} mb-2`}>check_circle</span>
                <p className={textMuted}>No suspicious events detected during this attempt.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.events.map((event) => (
                  <div key={event.id} className={`${isDark ? 'bg-navy-950' : 'bg-slate-50'} rounded-xl p-4 ${isDark ? 'border border-navy-800' : 'border border-slate-200'} ${bgHover} transition-colors`}>
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex items-center gap-3 flex-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${getSeverityBg(event.severity)} ${getSeverityColor(event.severity)}`}>
                          {event.severity}
                        </span>
                        <p className={`font-bold ${textPrimary}`}>{formatEventType(event.eventType)}</p>
                      </div>
                      <span className={`text-xs ${textMuted}`}>{formatDate(event.timestamp)}</span>
                    </div>
                    {event.description && (
                      <p className={`text-sm ${textMuted} pl-14`}>{event.description}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Actions */}
        <div className="lg:col-span-1 space-y-6">
          <div className={`${cardBase} p-6`}>
            <h4 className={`font-bold ${textPrimary} mb-4`}>Review Actions</h4>
            
            {data.attempt.reviewStatus && ['approved', 'rejected', 'retake_granted'].includes(data.attempt.reviewStatus) ? (
              <div className={`p-4 rounded-lg border ${isDark ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-green-50 border-green-300 text-green-700'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  <p className="font-bold">Decision Recorded</p>
                </div>
                <p className="text-sm">
                  This attempt has been reviewed and marked as {
                    data.attempt.reviewStatus === 'approved' ? 'valid' :
                    data.attempt.reviewStatus === 'rejected' ? 'invalid' :
                    'retake granted'
                  }.
                </p>
                {data.attempt.reviewNotes && (
                  <div className="mt-3 pt-3 border-t border-current/20">
                    <p className="text-xs font-bold mb-1">Notes:</p>
                    <p className="text-sm">{data.attempt.reviewNotes}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <button
                  onClick={() => handleDecisionClick('valid')}
                  disabled={processing}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                      : 'bg-green-500 text-white hover:bg-green-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">check_circle</span>
                  Mark as Valid
                </button>

                <button
                  onClick={() => handleDecisionClick('invalid')}
                  disabled={processing}
                  className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' 
                      : 'bg-red-500 text-white hover:bg-red-600'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">cancel</span>
                  Invalidate Attempt
                </button>

                <button
                  onClick={() => handleDecisionClick('allow_retake')}
                  disabled={processing}
                  className={`w-full py-3 px-4 rounded-xl border font-bold text-sm ${bgHover} transition-all flex items-center justify-center gap-2 ${
                    isDark 
                      ? 'bg-navy-950 border-navy-800 text-white' 
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]">replay</span>
                  Allow Graded Retake
                </button>
              </div>
            )}
          </div>

          {/* Student Info */}
          <div className={`${cardBase} p-6`}>
            <h4 className={`font-bold ${textPrimary} mb-4`}>Student Information</h4>
            <div className="space-y-3">
              <div>
                <p className={`text-xs font-bold ${textMuted} uppercase mb-1`}>Name</p>
                <p className={`${textPrimary} font-medium`}>{data.student.fullName}</p>
              </div>
              <div>
                <p className={`text-xs font-bold ${textMuted} uppercase mb-1`}>Email</p>
                <p className={`${textPrimary} text-sm`}>{data.student.email}</p>
              </div>
              <div>
                <p className={`text-xs font-bold ${textMuted} uppercase mb-1`}>Started At</p>
                <p className={`${textPrimary} text-sm`}>{formatDate(data.attempt.startedAt)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
