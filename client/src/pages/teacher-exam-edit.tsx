import React, { useEffect, useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import TeacherLayout from '../components/TeacherLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '../lib/config';

interface ValidationError { field: string; message: string }

export default function TeacherExamEdit() {
  const [match, params] = useRoute('/teacher/exams/:id/edit');
  const examId = params?.id;
  const [, setLocation] = useLocation();
  const { getAuthHeaders } = useAuth();
  const { theme } = useTheme();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);

  const [formData, setFormData] = useState({
    // Read-only context
    courseId: '',
    // Metadata & Timing
    title: '',
    description: '',
    instructions: '',
    duration: 60,
    timeLimit: 60,
    totalPoints: 100,
    passingScore: 70,
    attemptsAllowed: 1,
    // Scheduling
    scheduledStartAt: '',
    scheduledEndAt: '',
    // Display & behavior
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showResultsImmediately: false,
    showCorrectAnswers: false,
    allowReview: true,
    allowBacktracking: false,
    // Late submission
    lateSubmissionAllowed: false,
    lateSubmissionPenalty: 0,
    // Anti-cheat
    antiCheatEnabled: true,
    requireWebcam: false,
    requireScreenShare: false,
    requireFullscreen: true,
    requireLockdownBrowser: false,
    tabSwitchLimit: 3,
    copyPasteAllowed: false,
    rightClickAllowed: false,
    // Retake
    retakeEnabled: true,
    retakeDelay: 24,
    adaptiveRetake: true,
    // Privacy
    recordingDisclosure: '',
    dataRetentionDays: 365,
  });

  useEffect(() => { if (examId) loadExam() }, [examId]);

  async function loadExam() {
    setLoading(true);
    setErrors([]);
    try {
      const res = await fetch(apiEndpoint(`/api/exams/${examId}`), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ message: 'Failed to fetch exam' }));
        throw new Error(err.message || 'Failed to fetch exam');
      }
      const exam = await res.json();
      setFormData(prev => ({
        ...prev,
        courseId: exam.courseId || '',
        title: exam.title || '',
        description: exam.description || '',
        instructions: exam.instructions || '',
        duration: exam.duration ?? 60,
        timeLimit: typeof exam.timeLimit === 'string' ? parseInt(exam.timeLimit, 10) || 60 : (exam.timeLimit ?? 60),
        totalPoints: exam.totalPoints ?? 100,
        passingScore: exam.passingScore ?? 70,
        attemptsAllowed: typeof exam.attemptsAllowed === 'string' ? parseInt(exam.attemptsAllowed, 10) || 1 : (exam.attemptsAllowed ?? 1),
        scheduledStartAt: exam.scheduledStartAt ? new Date(exam.scheduledStartAt).toISOString().slice(0,16) : '',
        scheduledEndAt: exam.scheduledEndAt ? new Date(exam.scheduledEndAt).toISOString().slice(0,16) : '',
        shuffleQuestions: !!exam.shuffleQuestions,
        shuffleOptions: !!exam.shuffleOptions,
        showResults: !!exam.showResults,
        showResultsImmediately: !!exam.showResultsImmediately,
        showCorrectAnswers: !!exam.showCorrectAnswers,
        allowReview: !!exam.allowReview,
        allowBacktracking: !!exam.allowBacktracking,
        lateSubmissionAllowed: !!exam.lateSubmissionAllowed,
        lateSubmissionPenalty: exam.lateSubmissionPenalty ?? 0,
        antiCheatEnabled: !!exam.antiCheatEnabled,
        requireWebcam: !!exam.requireWebcam,
        requireScreenShare: !!exam.requireScreenShare,
        requireFullscreen: !!exam.requireFullscreen,
        requireLockdownBrowser: !!exam.requireLockdownBrowser,
        tabSwitchLimit: exam.tabSwitchLimit ?? 3,
        copyPasteAllowed: !!exam.copyPasteAllowed,
        rightClickAllowed: !!exam.rightClickAllowed,
        retakeEnabled: !!exam.retakeEnabled,
        retakeDelay: exam.retakeDelay ?? 24,
        adaptiveRetake: !!exam.adaptiveRetake,
        recordingDisclosure: exam.recordingDisclosure || '',
        dataRetentionDays: exam.dataRetentionDays ?? 365,
      }));
    } catch (e: any) {
      setErrors([e.message || 'Failed to load exam']);
    } finally {
      setLoading(false);
    }
  }

  function handleInputChange(field: string, value: any) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  }

  const inputClasses = `w-full ${theme === 'dark' ? 'bg-navy-950 border-navy-800 text-white' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary focus:border-primary transition-all`;
  const cardClasses = `${theme === 'dark' ? 'bg-navy-900 border-navy-700' : 'bg-white border-gray-200'} border rounded-2xl p-8 space-y-8 shadow-xl`;
  const checkboxCardClasses = (checked: boolean) => `flex items-center justify-between p-4 ${theme === 'dark' ? `bg-navy-950 rounded-xl border ${checked ? 'border-primary/50' : 'border-navy-800'}` : `bg-gray-50 rounded-xl border ${checked ? 'border-primary/50' : 'border-gray-300'}`} hover:border-primary/30 transition-all cursor-pointer`;

  function validateForm(): boolean {
    const v: ValidationError[] = [];
    if (!formData.title.trim()) v.push({ field: 'title', message: 'Exam title is required' });
    if (formData.duration <= 0) v.push({ field: 'duration', message: 'Duration must be greater than 0' });
    if (formData.timeLimit <= 0) v.push({ field: 'timeLimit', message: 'Time limit must be greater than 0' });
    if (formData.totalPoints < 0) v.push({ field: 'totalPoints', message: 'Total points cannot be negative' });
    if (formData.passingScore < 0 || formData.passingScore > formData.totalPoints) v.push({ field: 'passingScore', message: 'Passing score must be between 0 and total points' });
    if (formData.attemptsAllowed < 1) v.push({ field: 'attemptsAllowed', message: 'At least 1 attempt must be allowed' });
    if (formData.scheduledStartAt && formData.scheduledEndAt) {
      const start = new Date(formData.scheduledStartAt);
      const end = new Date(formData.scheduledEndAt);
      if (start >= end) v.push({ field: 'scheduledEndAt', message: 'End date must be after start date' });
    }
    if (formData.lateSubmissionPenalty < 0 || formData.lateSubmissionPenalty > 100) v.push({ field: 'lateSubmissionPenalty', message: 'Penalty must be between 0 and 100%' });
    if (formData.tabSwitchLimit < 0) v.push({ field: 'tabSwitchLimit', message: 'Tab switch limit cannot be negative' });
    if (formData.retakeDelay < 0) v.push({ field: 'retakeDelay', message: 'Retake delay cannot be negative' });
    if (formData.dataRetentionDays < 1) v.push({ field: 'dataRetentionDays', message: 'Data retention must be at least 1 day' });
    setValidationErrors(v);
    return v.length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validateForm()) {
      setErrors(['Please fix the validation errors below']);
      return;
    }
    setSubmitting(true);
    setErrors([]);
    try {
      // 1) General exam settings (PATCH /api/exams/:id)
      const generalPayload: any = {
        title: formData.title,
        description: formData.description || undefined,
        instructions: formData.instructions || undefined,
        duration: formData.duration,
        timeLimit: formData.timeLimit,
        totalPoints: formData.totalPoints,
        passingScore: formData.passingScore,
        attemptsAllowed: formData.attemptsAllowed,
        scheduledStartAt: formData.scheduledStartAt || undefined,
        scheduledEndAt: formData.scheduledEndAt || undefined,
        shuffleQuestions: formData.shuffleQuestions,
        shuffleOptions: formData.shuffleOptions,
        showResults: formData.showResults,
        showCorrectAnswers: formData.showCorrectAnswers,
        lateSubmissionAllowed: formData.lateSubmissionAllowed,
        lateSubmissionPenalty: formData.lateSubmissionPenalty,
      };

      const genRes = await fetch(apiEndpoint(`/api/exams/${examId}`), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(generalPayload),
      });
      if (!genRes.ok) {
        const err = await genRes.json().catch(() => ({ message: 'Failed to update exam settings' }));
        throw new Error(err.message || 'Failed to update exam settings');
      }

      // 2) Anti-cheat settings (PATCH /api/exams/:id/anti-cheat)
      const antiPayload: any = {
        antiCheatEnabled: formData.antiCheatEnabled,
        requireWebcam: formData.requireWebcam,
        requireScreenShare: formData.requireScreenShare,
        requireFullscreen: formData.requireFullscreen,
        requireLockdownBrowser: formData.requireLockdownBrowser,
        tabSwitchLimit: formData.tabSwitchLimit,
        copyPasteAllowed: formData.copyPasteAllowed,
        rightClickAllowed: formData.rightClickAllowed,
        recordingDisclosure: formData.recordingDisclosure || undefined,
        dataRetentionDays: formData.dataRetentionDays,
      };
      const antiRes = await fetch(apiEndpoint(`/api/exams/${examId}/anti-cheat`), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(antiPayload),
      });
      if (!antiRes.ok) {
        const err = await antiRes.json().catch(() => ({ message: 'Failed to update anti-cheat settings' }));
        throw new Error(err.message || 'Failed to update anti-cheat settings');
      }

      // 3) Retake settings (PATCH /api/exams/:id/retake-settings)
      const retakePayload: any = {
        retakeEnabled: formData.retakeEnabled,
        retakeDelay: formData.retakeDelay,
        adaptiveRetake: formData.adaptiveRetake,
      };
      const retakeRes = await fetch(apiEndpoint(`/api/exams/${examId}/retake-settings`), {
        method: 'PATCH',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(retakePayload),
      });
      if (!retakeRes.ok) {
        const err = await retakeRes.json().catch(() => ({ message: 'Failed to update retake settings' }));
        throw new Error(err.message || 'Failed to update retake settings');
      }

      // Success: navigate back to manage page
      setLocation(`/teacher/exams/${examId}`);
    } catch (e: any) {
      setErrors([e.message || 'Failed to save changes']);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-muted">Loading exam...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <button
              onClick={() => setLocation(`/teacher/exams/${examId}`)}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'hover:bg-navy-800 text-text-muted hover:text-white' : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'} transition-all`}
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <h1 className={`text-4xl font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>
              Edit Exam
            </h1>
          </div>
          <p className={`${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'} text-lg ml-14`}>
            Update metadata, timing, anti-cheat, and retake settings.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 mt-0.5">error</span>
              <div className="flex-1">
                <p className="font-bold text-red-400 mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1 text-red-400 text-sm">
                  {errors.map((error, idx) => (<li key={idx}>{error}</li>))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Metadata & Timing */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>edit_document</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Metadata & Timing</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Course (read-only) */}
              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Course</label>
                <input className={inputClasses} value={formData.courseId} readOnly />
                <p className="text-xs text-text-muted">Course cannot be changed for an existing exam.</p>
              </div>
              {/* Title */}
              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Exam Title *</label>
                <input type="text" className={inputClasses} value={formData.title} onChange={(e) => handleInputChange('title', e.target.value)} required />
              </div>
              {/* Description */}
              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Description (Optional)</label>
                <textarea className={inputClasses} rows={3} value={formData.description} onChange={(e) => handleInputChange('description', e.target.value)} />
              </div>
              {/* Instructions */}
              <div className="space-y-2 md:col-span-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Instructions (Optional)</label>
                <textarea className={inputClasses} rows={4} value={formData.instructions} onChange={(e) => handleInputChange('instructions', e.target.value)} />
              </div>
              {/* Duration */}
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Duration (Minutes) *</label>
                <input type="number" className={inputClasses} min="1" value={formData.duration} onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)} required />
              </div>
              {/* Time Limit */}
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Time Limit Per Attempt (Minutes) *</label>
                <input type="number" className={inputClasses} min="1" value={formData.timeLimit} onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value) || 0)} required />
              </div>
              {/* Total Points */}
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Total Points *</label>
                <input type="number" className={inputClasses} min="0" value={formData.totalPoints} onChange={(e) => handleInputChange('totalPoints', parseInt(e.target.value) || 0)} required />
              </div>
              {/* Passing Score */}
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Passing Score *</label>
                <input type="number" className={inputClasses} min="0" max={formData.totalPoints} value={formData.passingScore} onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value) || 0)} required />
              </div>
              {/* Attempts Allowed */}
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Attempts Allowed *</label>
                <input type="number" className={inputClasses} min="1" value={formData.attemptsAllowed} onChange={(e) => handleInputChange('attemptsAllowed', parseInt(e.target.value) || 1)} required />
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>schedule</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Scheduling (Optional)</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Start Date & Time</label>
                <input type="datetime-local" className={inputClasses} value={formData.scheduledStartAt} onChange={(e) => handleInputChange('scheduledStartAt', e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>End Date & Time</label>
                <input type="datetime-local" className={inputClasses} value={formData.scheduledEndAt} onChange={(e) => handleInputChange('scheduledEndAt', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Display/Behavior */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>shuffle</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Question Randomization & Display</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'shuffleQuestions', label: 'Shuffle Questions', desc: 'Randomize question order for each student' },
                { key: 'shuffleOptions', label: 'Shuffle Options', desc: 'Randomize answer choices for MCQs' },
                { key: 'showResults', label: 'Show Results', desc: 'Display exam results to students' },
                { key: 'showCorrectAnswers', label: 'Show Correct Answers', desc: 'Reveal correct answers in results' },
                { key: 'allowReview', label: 'Allow Review', desc: 'Let students review their answers' },
                { key: 'allowBacktracking', label: 'Allow Backtracking', desc: 'Allow returning to previous questions' },
              ].map(item => (
                <label key={item.key} className={checkboxCardClasses((formData as any)[item.key])}>
                  <div className="flex flex-col flex-1">
                    <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.label}</span>
                    <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>{item.desc}</span>
                  </div>
                  <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={(formData as any)[item.key]} onChange={(e) => handleInputChange(item.key, e.target.checked)} />
                </label>
              ))}
            </div>
          </div>

          {/* Late Submission */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>schedule_send</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Late Submission Settings</h3>
            </div>
            <div className="space-y-6">
              <label className={checkboxCardClasses(formData.lateSubmissionAllowed)}>
                <div className="flex flex-col flex-1">
                  <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Allow Late Submissions</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Permit exam submissions after deadline</span>
                </div>
                <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={formData.lateSubmissionAllowed} onChange={(e) => handleInputChange('lateSubmissionAllowed', e.target.checked)} />
              </label>
              {formData.lateSubmissionAllowed && (
                <div className="space-y-2">
                  <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Late Submission Penalty (%)</label>
                  <input type="number" className={inputClasses} min="0" max="100" value={formData.lateSubmissionPenalty} onChange={(e) => handleInputChange('lateSubmissionPenalty', parseInt(e.target.value) || 0)} />
                </div>
              )}
            </div>
          </div>

          {/* Anti-Cheat */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>security</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Anti-Cheat & Proctoring</h3>
            </div>
            <div className="space-y-6">
              <label className={checkboxCardClasses(formData.antiCheatEnabled)}>
                <div className="flex flex-col flex-1">
                  <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enable Anti-Cheat System</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Activate comprehensive cheating prevention measures</span>
                </div>
                <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={formData.antiCheatEnabled} onChange={(e) => handleInputChange('antiCheatEnabled', e.target.checked)} />
              </label>
              {formData.antiCheatEnabled && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { key: 'requireWebcam', label: 'Require Webcam', desc: 'Verify student identity via webcam' },
                      { key: 'requireScreenShare', label: 'Require Screen Share', desc: 'Monitor student screen during exam' },
                      { key: 'requireFullscreen', label: 'Require Fullscreen', desc: 'Force fullscreen mode during exam' },
                      { key: 'requireLockdownBrowser', label: 'Lockdown Browser', desc: 'Prevent browser navigation and switching' },
                      { key: 'copyPasteAllowed', label: 'Allow Copy/Paste', desc: 'Permit clipboard operations' },
                      { key: 'rightClickAllowed', label: 'Allow Right-Click', desc: 'Enable context menu access' },
                    ].map(item => (
                      <label key={item.key} className={checkboxCardClasses((formData as any)[item.key])}>
                        <div className="flex flex-col flex-1">
                          <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>{item.label}</span>
                          <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>{item.desc}</span>
                        </div>
                        <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={(formData as any)[item.key]} onChange={(e) => handleInputChange(item.key, e.target.checked)} />
                      </label>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Tab Switch Limit</label>
                    <input type="number" className={inputClasses} min="0" placeholder="0 = unlimited" value={formData.tabSwitchLimit} onChange={(e) => handleInputChange('tabSwitchLimit', parseInt(e.target.value) || 0)} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Maximum number of allowed tab switches (0 = unlimited)</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Retake Settings */}
          <div className={cardClasses}>
            <div className="flex items-center gap-3 mb-6">
              <span className={`material-symbols-outlined ${theme === 'dark' ? 'text-primary' : 'text-primary'}`}>repeat</span>
              <h3 className={`text-xl font-bold ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Retake Configuration</h3>
            </div>
            <div className="space-y-6">
              <label className={checkboxCardClasses(formData.retakeEnabled)}>
                <div className="flex flex-col flex-1">
                  <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Enable Retake Exams</span>
                  <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Allow students to take mistake-based retake exams</span>
                </div>
                <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={formData.retakeEnabled} onChange={(e) => handleInputChange('retakeEnabled', e.target.checked)} />
              </label>
              {formData.retakeEnabled && (
                <>
                  <div className="space-y-2">
                    <label className={`text-sm font-bold uppercase ${theme === 'dark' ? 'text-text-muted' : 'text-gray-600'}`}>Retake Delay (Hours)</label>
                    <input type="number" className={inputClasses} min="0" value={formData.retakeDelay} onChange={(e) => handleInputChange('retakeDelay', parseInt(e.target.value) || 0)} />
                    <p className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Time students must wait before retake becomes available</p>
                  </div>
                  <label className={checkboxCardClasses(formData.adaptiveRetake)}>
                    <div className="flex flex-col flex-1">
                      <span className={`font-bold text-sm ${theme === 'dark' ? 'text-white' : 'text-gray-900'}`}>Adaptive Retake</span>
                      <span className={`text-xs ${theme === 'dark' ? 'text-text-muted' : 'text-gray-500'}`}>Generate retakes based on student mistakes</span>
                    </div>
                    <input type="checkbox" className="form-checkbox h-5 w-5 rounded text-primary focus:ring-primary" checked={formData.adaptiveRetake} onChange={(e) => handleInputChange('adaptiveRetake', e.target.checked)} />
                  </label>
                </>
              )}
            </div>
          </div>

          {/* Form Actions */}
          <div className={`pt-6 border-t ${theme === 'dark' ? 'border-navy-800' : 'border-gray-200'} flex justify-end gap-4`}>
            <button type="button" onClick={() => setLocation(`/teacher/exams/${examId}`)} className={`px-6 py-3 rounded-xl font-bold transition-all ${theme === 'dark' ? 'bg-navy-800 text-text-muted hover:text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>Cancel</button>
            <button type="submit" disabled={submitting} className="px-8 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting && (<span className="animate-spin border-2 border-white border-t-transparent rounded-full size-4"></span>)}
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </TeacherLayout>
  );
}
