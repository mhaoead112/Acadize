import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import TeacherLayout from '../components/TeacherLayout';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '../lib/config';

// ============================================================================
// TYPES
// ============================================================================

interface Course {
  id: string;
  title: string;
  description: string | null;
}

interface ValidationError {
  field: string;
  message: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function TeacherExamCreate() {
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  
  // Form state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  
  // Form data
  const [formData, setFormData] = useState({
    // Metadata & Timing
    courseId: '',
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
    
    // Question & Feedback Settings
    shuffleQuestions: false,
    shuffleOptions: false,
    showResults: true,
    showResultsImmediately: false,
    showCorrectAnswers: false,
    allowReview: true,
    allowBacktracking: false,
    
    // Section & Timing
    lateSubmissionAllowed: false,
    lateSubmissionPenalty: 0,
    
    // Anti-Cheat Configuration
    antiCheatEnabled: true,
    requireWebcam: false,
    requireScreenShare: false,
    requireFullscreen: true,
    requireLockdownBrowser: false,
    tabSwitchLimit: 3,
    copyPasteAllowed: false,
    rightClickAllowed: false,
    
    // Retake Settings
    retakeEnabled: true,
    retakeDelay: 24,
    adaptiveRetake: true,
    
    // Privacy
    recordingDisclosure: '',
    dataRetentionDays: 365,
  });

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiEndpoint('/api/courses'), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch courses');
      }

      const data = await response.json();
      const teacherCourses = Array.isArray(data) 
        ? data.filter((course: any) => course.teacherId === user?.id)
        : [];
      setCourses(teacherCourses);
    } catch (err: any) {
      console.error('Error fetching courses:', err);
      setErrors(['Failed to load courses. Please refresh the page.']);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    if (!formData.courseId) {
      newErrors.push({ field: 'courseId', message: 'Please select a course' });
    }
    
    if (!formData.title.trim()) {
      newErrors.push({ field: 'title', message: 'Exam title is required' });
    }
    
    if (formData.duration <= 0) {
      newErrors.push({ field: 'duration', message: 'Duration must be greater than 0' });
    }
    
    if (formData.timeLimit <= 0) {
      newErrors.push({ field: 'timeLimit', message: 'Time limit must be greater than 0' });
    }
    
    if (formData.totalPoints < 0) {
      newErrors.push({ field: 'totalPoints', message: 'Total points cannot be negative' });
    }
    
    if (formData.passingScore < 0 || formData.passingScore > formData.totalPoints) {
      newErrors.push({ field: 'passingScore', message: 'Passing score must be between 0 and total points' });
    }
    
    if (formData.attemptsAllowed < 1) {
      newErrors.push({ field: 'attemptsAllowed', message: 'At least 1 attempt must be allowed' });
    }
    
    if (!formData.scheduledStartAt) {
      newErrors.push({ field: 'scheduledStartAt', message: 'Start date/time is required' });
    }
    if (!formData.scheduledEndAt) {
      newErrors.push({ field: 'scheduledEndAt', message: 'End date/time is required' });
    }
    if (formData.scheduledStartAt && formData.scheduledEndAt) {
      const start = new Date(formData.scheduledStartAt);
      const end = new Date(formData.scheduledEndAt);
      if (start >= end) {
        newErrors.push({ field: 'scheduledEndAt', message: 'End date must be after start date' });
      }
    }
    
    if (formData.lateSubmissionPenalty < 0 || formData.lateSubmissionPenalty > 100) {
      newErrors.push({ field: 'lateSubmissionPenalty', message: 'Penalty must be between 0 and 100%' });
    }
    
    if (formData.tabSwitchLimit < 0) {
      newErrors.push({ field: 'tabSwitchLimit', message: 'Tab switch limit cannot be negative' });
    }
    
    if (formData.retakeDelay < 0) {
      newErrors.push({ field: 'retakeDelay', message: 'Retake delay cannot be negative' });
    }
    
    if (formData.dataRetentionDays < 1) {
      newErrors.push({ field: 'dataRetentionDays', message: 'Data retention must be at least 1 day' });
    }
    
    setValidationErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setErrors(['Please fix the validation errors below']);
      return;
    }
    
    setSubmitting(true);
    setErrors([]);
    
    try {
      const payload = {
        courseId: formData.courseId,
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
        showResultsImmediately: formData.showResultsImmediately,
        showCorrectAnswers: formData.showCorrectAnswers,
        allowReview: formData.allowReview,
        allowBacktracking: formData.allowBacktracking,
        lateSubmissionAllowed: formData.lateSubmissionAllowed,
        lateSubmissionPenalty: formData.lateSubmissionPenalty,
        antiCheatEnabled: formData.antiCheatEnabled,
        requireWebcam: formData.requireWebcam,
        requireScreenShare: formData.requireScreenShare,
        requireFullscreen: formData.requireFullscreen,
        requireLockdownBrowser: formData.requireLockdownBrowser,
        tabSwitchLimit: formData.tabSwitchLimit,
        copyPasteAllowed: formData.copyPasteAllowed,
        rightClickAllowed: formData.rightClickAllowed,
        retakeEnabled: formData.retakeEnabled,
        retakeDelay: formData.retakeDelay,
        adaptiveRetake: formData.adaptiveRetake,
        recordingDisclosure: formData.recordingDisclosure || undefined,
        dataRetentionDays: formData.dataRetentionDays,
      };
      
      const response = await fetch(apiEndpoint('/api/exams'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setErrors(errorData.errors);
        } else {
          setErrors([errorData.message || 'Failed to create exam']);
        }
        return;
      }

      const result = await response.json();
      
      // Success - navigate to exam detail or exams list
      setLocation(`/teacher/exams`);
    } catch (err: any) {
      console.error('Error creating exam:', err);
      setErrors([err.message || 'An unexpected error occurred']);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation errors for this field
    setValidationErrors(prev => prev.filter(e => e.field !== field));
  };

  const getFieldError = (field: string): string | undefined => {
    return validationErrors.find(e => e.field === field)?.message;
  };

  if (loading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
            <p className="text-text-muted">Loading courses...</p>
          </div>
        </div>
      </TeacherLayout>
    );
  }



  return (
    <TeacherLayout>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 pb-16">
        {/* Header */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center gap-4 mb-3">
            <button
              onClick={() => setLocation('/teacher/exams')}
              className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-navy-800 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all shadow-sm group"
            >
              <span className="material-symbols-outlined transition-transform group-hover:-translate-x-1">arrow_back</span>
            </button>
            <h1 className="text-3xl lg:text-5xl font-black tracking-tight text-slate-900 dark:text-white">
              Create New Exam
            </h1>
          </div>
          <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-400 ml-14 max-w-3xl">
            Configure metadata, timing, security protocols, and anti-cheat settings for your assessment.
          </p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-xl">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-red-400 mt-0.5">error</span>
              <div className="flex-1">
                <p className="font-bold text-red-400 mb-2">Please fix the following errors:</p>
                <ul className="list-disc list-inside space-y-1 text-red-400 text-sm">
                  {errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 lg:space-y-12">
          {/* Metadata & Timing */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">edit_document</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Metadata & Timing</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Course Selection */}
              <div className="space-y-2.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Course *
                </label>
                <select
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none appearance-none"
                  value={formData.courseId}
                  onChange={(e) => handleInputChange('courseId', e.target.value)}
                  required
                >
                  <option value="">Select a course...</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
                {getFieldError('courseId') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('courseId')}</p>
                )}
              </div>

              {/* Exam Title */}
              <div className="space-y-2.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Exam Title *
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  placeholder="e.g., Midterm Exam: Thermodynamics"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
                {getFieldError('title') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('title')}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Description (Optional)
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[100px]"
                  placeholder="Brief description of the exam content and objectives..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2.5 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Instructions (Optional)
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[120px]"
                  placeholder="Special instructions for students taking this exam..."
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                />
              </div>

              {/* Duration */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Duration (Minutes) *
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  min="1"
                  value={formData.duration}
                  onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                  required
                />
                {getFieldError('duration') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('duration')}</p>
                )}
              </div>

              {/* Time Limit Per Attempt */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Time Limit Per Attempt (Minutes) *
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  min="1"
                  value={formData.timeLimit}
                  onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value) || 0)}
                  required
                />
                {getFieldError('timeLimit') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('timeLimit')}</p>
                )}
              </div>

              {/* Total Points */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Total Points *
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  min="0"
                  value={formData.totalPoints}
                  onChange={(e) => handleInputChange('totalPoints', parseInt(e.target.value) || 0)}
                  required
                />
                {getFieldError('totalPoints') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('totalPoints')}</p>
                )}
              </div>

              {/* Passing Score */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Passing Score *
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  min="0"
                  max={formData.totalPoints}
                  value={formData.passingScore}
                  onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value) || 0)}
                  required
                />
                {getFieldError('passingScore') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('passingScore')}</p>
                )}
              </div>

              {/* Attempts Allowed */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Attempts Allowed *
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  min="1"
                  value={formData.attemptsAllowed}
                  onChange={(e) => handleInputChange('attemptsAllowed', parseInt(e.target.value) || 1)}
                  required
                />
                {getFieldError('attemptsAllowed') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('attemptsAllowed')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Scheduling */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <span className="material-symbols-outlined text-[28px]">schedule</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Scheduling (Optional)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
              {/* Start Date */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Start Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  value={formData.scheduledStartAt}
                  onChange={(e) => handleInputChange('scheduledStartAt', e.target.value)}
                />
              </div>

              {/* End Date */}
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  End Date & Time
                </label>
                <input
                  type="datetime-local"
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                  value={formData.scheduledEndAt}
                  onChange={(e) => handleInputChange('scheduledEndAt', e.target.value)}
                />
                {getFieldError('scheduledEndAt') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('scheduledEndAt')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Randomization Settings */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[28px]">shuffle</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Question Randomization & Display</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
              {[
                { key: 'shuffleQuestions', label: 'Shuffle Questions', desc: 'Randomize question order for each student', icon: 'shuffle' },
                { key: 'shuffleOptions', label: 'Shuffle Options', desc: 'Randomize answer choices for MCQs', icon: 'format_list_bulleted' },
                { key: 'showResults', label: 'Show Results', desc: 'Display exam results to students', icon: 'analytics' },
                { key: 'showResultsImmediately', label: 'Show Results Immediately', desc: 'Display results right after submission', icon: 'speed' },
                { key: 'showCorrectAnswers', label: 'Show Correct Answers', desc: 'Reveal correct answers in results', icon: 'check_circle' },
                { key: 'allowReview', label: 'Allow Review', desc: 'Let students review their answers', icon: 'rate_review' },
                { key: 'allowBacktracking', label: 'Allow Backtracking', desc: 'Allow returning to previous questions', icon: 'undo' },
              ].map(item => (
                <label key={item.key} className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${
                  (formData as any)[item.key]
                    ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                    : 'bg-slate-50 dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                      (formData as any)[item.key] ? 'bg-primary text-navy-950' : 'bg-slate-200 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">{item.label}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{item.desc}</span>
                    </div>
                  </div>
                  <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    (formData as any)[item.key] ? 'bg-primary border-primary' : 'border-slate-300 dark:border-navy-600'
                  }`}>
                    {(formData as any)[item.key] && (
                      <span className="material-symbols-outlined text-[16px] text-navy-950 font-bold">check</span>
                    )}
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={(formData as any)[item.key]}
                    onChange={(e) => handleInputChange(item.key, e.target.checked)}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Late Submission Settings */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500">
                <span className="material-symbols-outlined text-[28px]">schedule_send</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Late Submission Settings</h3>
            </div>
            
            <div className="space-y-6">
              <label className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group ${
                formData.lateSubmissionAllowed
                  ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                  : 'bg-slate-50 dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
              }`}>
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                    formData.lateSubmissionAllowed ? 'bg-primary text-navy-950' : 'bg-slate-200 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-[20px]">history</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-900 dark:text-white">Allow Late Submissions</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Permit exam submissions after deadline</span>
                  </div>
                </div>
                <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                  formData.lateSubmissionAllowed ? 'bg-primary border-primary' : 'border-slate-300 dark:border-navy-600'
                }`}>
                  {formData.lateSubmissionAllowed && (
                    <span className="material-symbols-outlined text-[16px] text-navy-950 font-bold">check</span>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.lateSubmissionAllowed}
                  onChange={(e) => handleInputChange('lateSubmissionAllowed', e.target.checked)}
                />
              </label>

              {formData.lateSubmissionAllowed && (
                <div className="space-y-2.5 animate-fade-in">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                    Late Submission Penalty (%)
                  </label>
                  <input
                    type="number"
                    className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    min="0"
                    max="100"
                    value={formData.lateSubmissionPenalty}
                    onChange={(e) => handleInputChange('lateSubmissionPenalty', parseInt(e.target.value) || 0)}
                  />
                  {getFieldError('lateSubmissionPenalty') && (
                    <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('lateSubmissionPenalty')}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Anti-Cheat & Proctoring */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <span className="material-symbols-outlined text-[28px]">security</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Anti-Cheat & Proctoring</h3>
            </div>
            
            <div className="space-y-8">
              {/* Anti-Cheat Enabled Toggle */}
              <label className={`flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer group ${
                formData.antiCheatEnabled
                  ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                  : 'bg-slate-50 dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
              }`}>
                <div className="flex items-center gap-5">
                  <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                    formData.antiCheatEnabled ? 'bg-primary text-navy-950' : 'bg-slate-200 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-slate-900 dark:text-white">Enable Anti-Cheat System</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Activate comprehensive cheating prevention measures</span>
                  </div>
                </div>
                <div className={`h-7 w-12 rounded-full p-1 transition-colors ${
                  formData.antiCheatEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-navy-700'
                }`}>
                  <div className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
                    formData.antiCheatEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.antiCheatEnabled}
                  onChange={(e) => handleInputChange('antiCheatEnabled', e.target.checked)}
                />
              </label>

              {formData.antiCheatEnabled && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    {[
                      { key: 'requireWebcam', label: 'Require Webcam', desc: 'Verify identity via webcam', icon: 'videocam' },
                      { key: 'requireScreenShare', label: 'Require Screen Share', desc: 'Monitor student screen', icon: 'screen_share' },
                      { key: 'requireFullscreen', label: 'Force Fullscreen', desc: 'Restrict browser escape', icon: 'fullscreen' },
                      { key: 'requireLockdownBrowser', label: 'Lockdown Mode', desc: 'Prevent tab switching', icon: 'browser_updated' },
                      { key: 'copyPasteAllowed', label: 'Allow Clipboard', desc: 'Permit copy/paste actions', icon: 'content_paste' },
                      { key: 'rightClickAllowed', label: 'Allow Right-Click', desc: 'Enable context menus', icon: 'mouse' },
                    ].map(item => (
                      <label key={item.key} className={`flex flex-col p-5 rounded-2xl border transition-all cursor-pointer group ${
                        (formData as any)[item.key]
                          ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                          : 'bg-slate-50 dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
                      }`}>
                        <div className="flex items-center justify-between mb-3">
                          <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                            (formData as any)[item.key] ? 'bg-primary text-navy-950' : 'bg-slate-200 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                          </div>
                          <div className={`size-5 rounded-md border-2 flex items-center justify-center transition-all ${
                            (formData as any)[item.key] ? 'bg-primary border-primary' : 'border-slate-300 dark:border-navy-600'
                          }`}>
                            {(formData as any)[item.key] && (
                              <span className="material-symbols-outlined text-[14px] text-navy-950 font-bold">check</span>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 dark:text-white text-sm">{item.label}</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.desc}</span>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={(formData as any)[item.key]}
                          onChange={(e) => handleInputChange(item.key, e.target.checked)}
                        />
                      </label>
                    ))}
                  </div>

                  <div className="space-y-2.5 p-6 bg-slate-50 dark:bg-navy-950/30 rounded-2xl border border-slate-200 dark:border-navy-800">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                      Tab Switch Limit
                    </label>
                    <div className="flex items-center gap-4">
                      <input
                        type="number"
                        className="w-32 bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                        min="0"
                        placeholder="0"
                        value={formData.tabSwitchLimit}
                        onChange={(e) => handleInputChange('tabSwitchLimit', parseInt(e.target.value) || 0)}
                      />
                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Set to 0 for unlimited switches. Recommended: 3.
                      </p>
                    </div>
                    {getFieldError('tabSwitchLimit') && (
                      <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('tabSwitchLimit')}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Retake Settings */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-purple-500/10 flex items-center justify-center text-purple-500">
                <span className="material-symbols-outlined text-[28px]">repeat</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Retake Configuration</h3>
            </div>
            
            <div className="space-y-8">
              <label className={`flex items-center justify-between p-6 rounded-2xl border transition-all cursor-pointer group ${
                formData.retakeEnabled
                  ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                  : 'bg-slate-50 dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
              }`}>
                <div className="flex items-center gap-5">
                  <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                    formData.retakeEnabled ? 'bg-primary text-navy-950' : 'bg-slate-200 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-[24px]">autorenew</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-lg text-slate-900 dark:text-white">Enable Retake Exams</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">Allow mistake-based practice sessions</span>
                  </div>
                </div>
                <div className={`h-7 w-12 rounded-full p-1 transition-colors ${
                  formData.retakeEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-navy-700'
                }`}>
                  <div className={`size-5 rounded-full bg-white shadow-sm transition-transform ${
                    formData.retakeEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.retakeEnabled}
                  onChange={(e) => handleInputChange('retakeEnabled', e.target.checked)}
                />
              </label>

              {formData.retakeEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10 animate-fade-in p-8 rounded-2xl bg-slate-50 dark:bg-navy-950/30 border border-slate-200 dark:border-navy-800">
                  <div className="space-y-2.5">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                      Retake Delay (Hours)
                    </label>
                    <input
                      type="number"
                      className="w-full bg-white dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                      min="0"
                      value={formData.retakeDelay}
                      onChange={(e) => handleInputChange('retakeDelay', parseInt(e.target.value) || 0)}
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400 italic ml-1">
                      Cooldown period between attempts.
                    </p>
                    {getFieldError('retakeDelay') && (
                      <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('retakeDelay')}</p>
                    )}
                  </div>

                  <label className={`flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer group mt-auto ${
                    formData.adaptiveRetake
                      ? 'bg-primary/5 border-primary/50 dark:bg-primary/10'
                      : 'bg-white dark:bg-navy-950/50 border-slate-200 dark:border-navy-700 hover:border-primary/30'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                        formData.adaptiveRetake ? 'bg-primary text-navy-950' : 'bg-slate-100 dark:bg-navy-800 text-slate-500 dark:text-slate-400'
                      }`}>
                        <span className="material-symbols-outlined text-[20px]">psychology</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white">Adaptive</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Targeted review</span>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      className="form-checkbox h-5 w-5 rounded-lg text-primary focus:ring-primary border-slate-300 dark:border-navy-600"
                      checked={formData.adaptiveRetake}
                      onChange={(e) => handleInputChange('adaptiveRetake', e.target.checked)}
                    />
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Privacy & Compliance */}
          <div className="bg-white dark:bg-navy-900/50 backdrop-blur-sm border border-slate-200 dark:border-navy-800 rounded-3xl p-6 lg:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none space-y-8 lg:space-y-10">
            <div className="flex items-center gap-4 mb-2">
              <div className="size-12 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                <span className="material-symbols-outlined text-[28px]">policy</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Privacy & Compliance</h3>
            </div>
            
            <div className="space-y-8">
              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Recording Disclosure (Optional)
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-2xl px-5 py-4 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none min-h-[100px]"
                  placeholder="Inform students about recording/monitoring practices..."
                  value={formData.recordingDisclosure}
                  onChange={(e) => handleInputChange('recordingDisclosure', e.target.value)}
                />
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                  Data Retention (Days)
                </label>
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    className="w-32 bg-slate-50 dark:bg-navy-950 border border-slate-200 dark:border-navy-700 text-slate-900 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all outline-none"
                    min="1"
                    value={formData.dataRetentionDays}
                    onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value) || 365)}
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    Duration for keeping exam data (GDPR/FERPA compliance).
                  </p>
                </div>
                {getFieldError('dataRetentionDays') && (
                  <p className="text-red-500 text-sm mt-1 ml-1">{getFieldError('dataRetentionDays')}</p>
                )}
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-10 border-t border-slate-200 dark:border-navy-800 flex flex-col sm:flex-row justify-end gap-4">
            <button
              type="button"
              onClick={() => setLocation('/teacher/exams')}
              className="order-2 sm:order-1 px-8 py-4 rounded-2xl font-bold bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-navy-700 transition-all flex items-center justify-center gap-2"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="order-1 sm:order-2 px-10 py-4 rounded-2xl bg-primary text-navy-950 font-black hover:bg-primary-hover shadow-xl shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-1 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              {submitting ? (
                <span className="animate-spin border-3 border-navy-950/30 border-t-navy-950 rounded-full size-5"></span>
              ) : (
                <span className="material-symbols-outlined text-[24px] group-hover:scale-110 transition-transform">add_circle</span>
              )}
              {submitting ? 'Creating Assessment...' : 'Create Assessment'}
            </button>
          </div>
        </form>
      </div>
    </TeacherLayout>
  );
}
