import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { motion, AnimatePresence } from 'framer-motion';
import TeacherLayout from '../components/TeacherLayout';
import { CardSkeleton } from '../components/skeletons/CardSkeleton';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '@/contexts/ThemeContext';
import { apiEndpoint } from '../lib/config';
import { useToast } from '@/hooks/use-toast';
import { 
  fadeInVariants, 
  staggerContainer, 
  cardVariants, 
  buttonVariants,
  springConfigs
} from '@/lib/animations';
import { Button } from '@/components/ui/button';


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
  const { t } = useTranslation('teacher');
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  
  // Form state
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const errorBannerRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to error banner whenever errors appear
  useEffect(() => {
    if (errors.length > 0 && errorBannerRef.current) {
      errorBannerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors]);
  
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
      setErrors([t('teacherExamCreate.failedToLoadCourses')]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationError[] = [];
    
    if (!formData.courseId) {
      newErrors.push({ field: 'courseId', message: t('teacherExamCreate.validation.selectCourse') });
    }
    
    if (!formData.title.trim()) {
      newErrors.push({ field: 'title', message: t('teacherExamCreate.validation.examTitleRequired') });
    }
    
    if (formData.duration <= 0) {
      newErrors.push({ field: 'duration', message: t('teacherExamCreate.validation.durationPositive') });
    }
    
    if (formData.timeLimit <= 0) {
      newErrors.push({ field: 'timeLimit', message: t('teacherExamCreate.validation.timeLimitPositive') });
    }
    
    if (formData.totalPoints < 0) {
      newErrors.push({ field: 'totalPoints', message: t('teacherExamCreate.validation.totalPointsNonNegative') });
    }
    
    if (formData.passingScore < 0 || formData.passingScore > formData.totalPoints) {
      newErrors.push({ field: 'passingScore', message: t('teacherExamCreate.validation.passingScoreRange') });
    }
    
    if (formData.attemptsAllowed < 1) {
      newErrors.push({ field: 'attemptsAllowed', message: t('teacherExamCreate.validation.atLeastOneAttempt') });
    }
    
    if (!formData.scheduledStartAt) {
      newErrors.push({ field: 'scheduledStartAt', message: t('teacherExamCreate.validation.startDateRequired') });
    }
    if (!formData.scheduledEndAt) {
      newErrors.push({ field: 'scheduledEndAt', message: t('teacherExamCreate.validation.endDateRequired') });
    }
    if (formData.scheduledStartAt && formData.scheduledEndAt) {
      const start = new Date(formData.scheduledStartAt);
      const end = new Date(formData.scheduledEndAt);
      if (start >= end) {
        newErrors.push({ field: 'scheduledEndAt', message: t('teacherExamCreate.validation.endAfterStart') });
      }
    }
    
    if (formData.lateSubmissionPenalty < 0 || formData.lateSubmissionPenalty > 100) {
      newErrors.push({ field: 'lateSubmissionPenalty', message: t('teacherExamCreate.validation.penaltyRange') });
    }
    
    if (formData.tabSwitchLimit < 0) {
      newErrors.push({ field: 'tabSwitchLimit', message: t('teacherExamCreate.validation.tabSwitchNonNegative') });
    }
    
    if (formData.retakeDelay < 0) {
      newErrors.push({ field: 'retakeDelay', message: t('teacherExamCreate.validation.retakeDelayNonNegative') });
    }
    
    if (formData.dataRetentionDays < 1) {
      newErrors.push({ field: 'dataRetentionDays', message: t('teacherExamCreate.validation.dataRetentionMin') });
    }
    
    setValidationErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setErrors([t('teacherExamCreate.validation.fixErrors')]);
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
        const errorData = await response.json().catch(() => ({ message: t('teacherExamCreate.failedToCreateExam') }));
        const msg = errorData.message || t('teacherExamCreate.failedToCreateExam');
        if (errorData.errors && Array.isArray(errorData.errors)) {
          setErrors(errorData.errors);
        } else {
          setErrors([msg]);
        }
        toast({
          title: t('teacherExamCreate.configurationError'),
          description: msg,
          variant: 'destructive',
        });
        return;
      }

      const result = await response.json();
      const examId: string = result.examId || result.exam?.id;

      if (!examId) {
        // Unexpected — server returned 2xx but no ID
        const msg = 'Exam was created but no ID was returned. Please check your exam list.';
        toast({ title: 'Warning', description: msg, variant: 'destructive' });
        setLocation('/teacher/exams');
        return;
      }

      toast({
        title: t('teacherExamCreate.successTitle') || 'Exam Created!',
        description: t('teacherExamCreate.successDesc') || 'Now add your questions below.',
      });

      // Navigate directly to the question builder — the primary UX goal
      setLocation(`/teacher/exams/${examId}/questions`);

    } catch (err: any) {
      console.error('Error creating exam:', err);
      const msg = err.message || t('teacherExamCreate.unexpectedError');
      setErrors([msg]);
      toast({ title: 'Error', description: msg, variant: 'destructive' });
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
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
          <CardSkeleton count={3} />
        </div>
      </TeacherLayout>
    );
  }




  return (
    <TeacherLayout>
      <div className="w-full bg-slate-50 dark:bg-navy-dark min-h-screen transition-colors duration-500 font-sans">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-16 pb-24 space-y-12">
          
          {/* Header Section */}
          <motion.div 
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="space-y-6"
          >
            <motion.div variants={fadeInVariants} className="flex items-center gap-6">
              <motion.button
                whileHover={{ scale: 1.1, x: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setLocation('/teacher/exams')}
                className="size-14 flex items-center justify-center rounded-2xl bg-white dark:bg-navy/40 backdrop-blur-xl border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:text-gold hover:border-gold/50 transition-all shadow-sm group"
              >
                <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              </motion.button>
              <div className="space-y-1">
                <h1 className="text-4xl lg:text-6xl font-black tracking-tight text-navy dark:text-white leading-[1.1]">
                  {t('createExam')}
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-lg lg:text-xl font-medium">
                  {t('architectYourNext')}
                </p>
              </div>
            </motion.div>
          </motion.div>


          {/* Validation Feedback */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div 
                ref={errorBannerRef}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-[2rem] backdrop-blur-md flex gap-4">
                  <div className="size-10 rounded-xl bg-red-500 text-white flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined">security</span>
                  </div>
                  <div>
                    <h4 className="text-red-500 font-black text-lg mb-1 uppercase tracking-tight">{t('teacherExamCreate.configurationError')}</h4>
                    <ul className="space-y-1">
                      {errors.map((error, idx) => (
                        <li key={idx} className="text-red-600/80 dark:text-red-400/80 text-sm font-bold flex items-center gap-2">
                          <div className="size-1 bg-red-500 rounded-full" />
                          {error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-10 lg:space-y-14">

          {/* Metadata & Timing */}
          <motion.div 
            variants={fadeInVariants}
            className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 lg:space-y-12"
          >
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-gold/10 flex items-center justify-center text-gold">
                <span className="material-symbols-outlined text-[32px]">edit_note</span>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-navy dark:text-white tracking-tight italic">{t('teacherExamCreate.metadataAndTiming')}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-60">{t('teacherExamCreate.generalConfiguration')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
              {/* Course Selection */}
              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  {t('teacherExamCreate.targetCourse')} <span className="text-gold">*</span>
                </label>
                <div className="relative group">
                  <select
                    className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none appearance-none font-bold text-lg cursor-pointer"
                    value={formData.courseId}
                    onChange={(e) => handleInputChange('courseId', e.target.value)}
                    required
                  >
                    <option value="" className="dark:bg-navy">{t('teacherExamCreate.selectObjective')}</option>
                    {courses.map(course => (
                      <option key={course.id} value={course.id} className="dark:bg-navy">{course.title}</option>
                    ))}
                  </select>
                  <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-hover:text-gold transition-colors">
                    <span className="material-symbols-outlined">expand_more</span>
                  </div>
                </div>
                {getFieldError('courseId') && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {getFieldError('courseId')}
                  </p>
                )}
              </div>

              {/* Exam Title */}
              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  Exam Title <span className="text-gold">*</span>
                </label>
                <input
                  type="text"
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none font-bold text-lg placeholder:text-slate-400/40"
                  placeholder="e.g. Midterm Exam — Chapter 1–5"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  required
                />
                {getFieldError('title') && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {getFieldError('title')}
                  </p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  Description
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none min-h-[100px] font-medium placeholder:text-slate-400/40 leading-relaxed resize-none"
                  placeholder="Brief overview of this exam's scope and purpose..."
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-3 md:col-span-2">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  Student Instructions
                </label>
                <textarea
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none min-h-[100px] font-medium placeholder:text-slate-400/40 leading-relaxed resize-none"
                  placeholder="Rules, tips, and special instructions for students before they begin..."
                  value={formData.instructions}
                  onChange={(e) => handleInputChange('instructions', e.target.value)}
                />
              </div>

              {/* Time Limit */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">timer</span>
                  {t('teacherExamCreate.timeLimitMin')} <span className="text-gold">*</span>
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none font-black text-xl"
                  min="1"
                  value={formData.timeLimit}
                  onChange={(e) => handleInputChange('timeLimit', parseInt(e.target.value) || 0)}
                  required
                />
                {getFieldError('timeLimit') && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {getFieldError('timeLimit')}
                  </p>
                )}
              </div>

              {/* Points */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">grade</span>
                  {t('teacherExamCreate.totalPoints')} <span className="text-gold">*</span>
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none font-black text-xl"
                  min="0"
                  value={formData.totalPoints}
                  onChange={(e) => handleInputChange('totalPoints', parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              {/* Passing Score */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">verified</span>
                  {t('teacherExamCreate.passingScore')} <span className="text-gold">*</span>
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none font-black text-xl"
                  min="0"
                  max={formData.totalPoints}
                  value={formData.passingScore}
                  onChange={(e) => handleInputChange('passingScore', parseInt(e.target.value) || 0)}
                  required
                />
              </div>

              {/* Attempts */}
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px]">replay</span>
                  {t('teacherExamCreate.maxAttempts')} <span className="text-gold">*</span>
                </label>
                <input
                  type="number"
                  className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-gold/10 focus:border-gold transition-all outline-none font-black text-xl"
                  min="1"
                  value={formData.attemptsAllowed}
                  onChange={(e) => handleInputChange('attemptsAllowed', parseInt(e.target.value) || 1)}
                  required
                />
              </div>
            </div>
          </motion.div>

          {/* Scheduling */}
          <motion.div 
            variants={fadeInVariants}
            className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 lg:space-y-12"
          >
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <span className="material-symbols-outlined text-[32px]">event_available</span>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-navy dark:text-white tracking-tight italic">{t('teacherExamCreate.deploymentWindow')}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-60">{t('teacherExamCreate.schedulingProtocols')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  {t('teacherExamCreate.windowOpenDateTime')} <span className="text-gold">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`w-full bg-slate-50 dark:bg-navy/60 border-2 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold ${
                    getFieldError('scheduledStartAt') ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/5'
                  }`}
                  value={formData.scheduledStartAt}
                  onChange={(e) => handleInputChange('scheduledStartAt', e.target.value)}
                />
                {getFieldError('scheduledStartAt') && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {getFieldError('scheduledStartAt')}
                  </p>
                )}
              </div>
              <div className="space-y-3">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">
                  {t('teacherExamCreate.windowCloseDateTime')} <span className="text-gold">*</span>
                </label>
                <input
                  type="datetime-local"
                  className={`w-full bg-slate-50 dark:bg-navy/60 border-2 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all outline-none font-bold ${
                    getFieldError('scheduledEndAt') ? 'border-red-400 dark:border-red-500' : 'border-slate-200 dark:border-white/5'
                  }`}
                  value={formData.scheduledEndAt}
                  onChange={(e) => handleInputChange('scheduledEndAt', e.target.value)}
                />
                {getFieldError('scheduledEndAt') && (
                  <p className="text-red-500 text-xs font-bold mt-1 ml-2 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">error</span>
                    {getFieldError('scheduledEndAt')}
                  </p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Logic & Feedback */}
          <motion.div 
            variants={fadeInVariants}
            className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 lg:space-y-12"
          >
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[32px]">terminal</span>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-navy dark:text-white tracking-tight italic">{t('teacherExamCreate.engineLogic')}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-60">{t('teacherExamCreate.executionAndFeedbackSettings')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { key: 'shuffleQuestions', label: t('teacherExamCreate.logic.randomizeOrder'), desc: t('teacherExamCreate.logic.randomizeOrderDesc'), icon: 'shuffle' },
                { key: 'shuffleOptions', label: t('teacherExamCreate.logic.shuffleOptions'), desc: t('teacherExamCreate.logic.shuffleOptionsDesc'), icon: 'list' },
                { key: 'showResults', label: t('teacherExamCreate.logic.publishResults'), desc: t('teacherExamCreate.logic.publishResultsDesc'), icon: 'visibility' },
                { key: 'showCorrectAnswers', label: t('teacherExamCreate.logic.revealKeys'), desc: t('teacherExamCreate.logic.revealKeysDesc'), icon: 'key' },
                { key: 'allowBacktracking', label: t('teacherExamCreate.logic.allowReturn'), desc: t('teacherExamCreate.logic.allowReturnDesc'), icon: 'undo' },
                { key: 'lateSubmissionAllowed', label: t('teacherExamCreate.logic.lateGrace'), desc: t('teacherExamCreate.logic.lateGraceDesc'), icon: 'history' },
              ].map(item => (
                <motion.label 
                  key={item.key} 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex flex-col p-6 rounded-3xl border-2 transition-all cursor-pointer group ${
                  (formData as any)[item.key]
                    ? 'bg-primary/10 border-primary shadow-xl shadow-primary/5'
                    : 'bg-slate-50/50 dark:bg-navy/40 border-slate-200 dark:border-white/5 opacity-60 hover:opacity-100'
                }`}>
                  <div className="flex justify-between items-start mb-4">
                    <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${
                      (formData as any)[item.key] ? 'bg-primary text-navy' : 'bg-slate-200 dark:bg-white/5 text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                      (formData as any)[item.key] ? 'bg-primary border-primary' : 'border-slate-300 dark:border-white/10'
                    }`}>
                      {(formData as any)[item.key] && <span className="material-symbols-outlined text-[14px] text-navy font-black">check</span>}
                    </div>
                  </div>
                  <span className="font-black text-navy dark:text-white tracking-tight">{item.label}</span>
                  <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{item.desc}</p>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={(formData as any)[item.key]}
                    onChange={(e) => handleInputChange(item.key, e.target.checked)}
                  />
                </motion.label>
              ))}
            </div>

            {formData.lateSubmissionAllowed && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-10 p-8 rounded-[2rem] bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm"
              >
                <div className="flex flex-col sm:flex-row items-center gap-6">
                  <div className="size-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                    <span className="material-symbols-outlined text-[32px]">history_toggle_off</span>
                  </div>
                  <div className="flex-1 space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">{t('teacherExamCreate.lateSubmissionPenalty')}</label>
                    <div className="relative">
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition-all outline-none font-black text-xl"
                        min="0"
                        max="100"
                        value={formData.lateSubmissionPenalty}
                        onChange={(e) => handleInputChange('lateSubmissionPenalty', parseInt(e.target.value) || 0)}
                      />
                      <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 font-bold px-6">{t('teacherExamCreate.penaltySuffix')}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>



          {/* Security & Integrity */}
          <motion.div 
            variants={fadeInVariants}
            className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 lg:space-y-12"
          >
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                <span className="material-symbols-outlined text-[32px]">security</span>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-navy dark:text-white tracking-tight italic">{t('teacherExamCreate.securityProtocols')}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-60">{t('teacherExamCreate.antiCheatAndProctoring')}</p>
              </div>
            </div>
            
            <div className="space-y-10">
              <motion.label 
                whileHover={{ scale: 1.01 }}
                className={`flex items-center justify-between p-8 rounded-[2rem] border-2 transition-all cursor-pointer group ${
                formData.antiCheatEnabled
                  ? 'bg-red-500/10 border-red-500 shadow-xl shadow-red-500/5'
                  : 'bg-slate-50/50 dark:bg-navy/40 border-slate-200 dark:border-white/5 opacity-60'
              }`}>
                <div className="flex items-center gap-6">
                  <div className={`size-14 rounded-2xl flex items-center justify-center transition-colors ${
                    formData.antiCheatEnabled ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-[28px]">verified_user</span>
                  </div>
                  <div>
                    <span className="font-black text-xl text-navy dark:text-white tracking-tight uppercase italic underline decoration-red-500/30">{t('teacherExamCreate.activateSecurity')}</span>
                    <p className="text-xs font-bold text-slate-500 mt-1">{t('teacherExamCreate.activateSecurityDesc')}</p>
                  </div>
                </div>
                <div className={`h-8 w-14 rounded-full p-1.5 transition-colors ${
                  formData.antiCheatEnabled ? 'bg-red-500' : 'bg-slate-300 dark:bg-navy-700'
                }`}>
                  <div className={`size-5 rounded-full bg-white shadow-xl transition-transform ${
                    formData.antiCheatEnabled ? 'translate-x-6' : 'translate-x-0'
                  }`} />
                </div>
                <input
                  type="checkbox"
                  className="hidden"
                  checked={formData.antiCheatEnabled}
                  onChange={(e) => handleInputChange('antiCheatEnabled', e.target.checked)}
                />
              </motion.label>

              {formData.antiCheatEnabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                  {[
                    { key: 'requireWebcam', label: t('teacherExamCreate.security.biometrics'), desc: t('teacherExamCreate.security.biometricsDesc'), icon: 'videocam' },
                    { key: 'requireScreenShare', label: t('teacherExamCreate.security.streamFeed'), desc: t('teacherExamCreate.security.streamFeedDesc'), icon: 'screen_share' },
                    { key: 'requireFullscreen', label: t('teacherExamCreate.security.lockFrame'), desc: t('teacherExamCreate.security.lockFrameDesc'), icon: 'fullscreen' },
                    { key: 'requireLockdownBrowser', label: t('teacherExamCreate.security.isolation'), desc: t('teacherExamCreate.security.isolationDesc'), icon: 'lock' },
                    { key: 'copyPasteAllowed', label: t('teacherExamCreate.security.clipboardLock'), desc: t('teacherExamCreate.security.clipboardLockDesc'), icon: 'content_paste_off' },
                    { key: 'rightClickAllowed', label: t('teacherExamCreate.security.menuLock'), desc: t('teacherExamCreate.security.menuLockDesc'), icon: 'mouse' },
                  ].map(item => (
                    <motion.label 
                      key={item.key} 
                      whileHover={{ scale: 1.02 }}
                      className={`flex flex-col p-6 rounded-3xl border-2 transition-all cursor-pointer group ${
                      (formData as any)[item.key]
                        ? 'bg-red-500/10 border-red-500 shadow-xl shadow-red-500/5'
                        : 'bg-slate-50/50 dark:bg-navy/40 border-slate-200 dark:border-white/5 opacity-60'
                    }`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className={`size-12 rounded-2xl flex items-center justify-center transition-colors ${
                          (formData as any)[item.key] ? 'bg-red-500 text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-400'
                        }`}>
                          <span className="material-symbols-outlined">{item.icon}</span>
                        </div>
                        <div className={`size-6 rounded-full border-2 flex items-center justify-center transition-all ${
                          (formData as any)[item.key] ? 'bg-red-500 border-red-500' : 'border-slate-300 dark:border-white/10'
                        }`}>
                          {(formData as any)[item.key] && <span className="material-symbols-outlined text-[14px] text-white font-black">check</span>}
                        </div>
                      </div>
                      <span className="font-black text-navy dark:text-white tracking-tight">{item.label}</span>
                      <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-wider">{item.desc}</p>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={(formData as any)[item.key]}
                        onChange={(e) => handleInputChange(item.key, e.target.checked)}
                      />
                    </motion.label>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Compliance & Post-Exam */}
          <motion.div 
            variants={fadeInVariants}
            className="bg-white dark:bg-navy/40 backdrop-blur-2xl border border-slate-200 dark:border-white/10 rounded-[3rem] p-8 lg:p-12 shadow-2xl shadow-slate-200/50 dark:shadow-none space-y-10 lg:space-y-12"
          >
            <div className="flex items-center gap-5">
              <div className="size-14 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-500">
                <span className="material-symbols-outlined text-[32px]">verified_user</span>
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-black text-navy dark:text-white tracking-tight italic">{t('teacherExamCreate.complianceAndRetake')}</h3>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 opacity-60">{t('teacherExamCreate.legalAndMaintenanceSettings')}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">{t('teacherExamCreate.privacyDisclosure')}</label>
                  <textarea
                    className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none min-h-[140px] font-medium placeholder:text-slate-400/40 leading-relaxed resize-none"
                    placeholder={t('teacherExamCreate.privacyDisclosurePlaceholder')}
                    value={formData.recordingDisclosure}
                    onChange={(e) => handleInputChange('recordingDisclosure', e.target.value)}
                  />
                </div>
                
                <div className="space-y-3">
                  <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">{t('teacherExamCreate.archiveDurationDays')}</label>
                  <div className="relative group">
                    <input
                      type="number"
                      className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-teal-500/10 focus:border-teal-500 transition-all outline-none font-black text-xl"
                      min="1"
                      value={formData.dataRetentionDays}
                      onChange={(e) => handleInputChange('dataRetentionDays', parseInt(e.target.value) || 365)}
                    />
                    <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                      <span className="text-xs font-black uppercase tracking-widest">{t('teacherExamCreate.daysArchive')}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                <motion.label 
                  whileHover={{ scale: 1.02 }}
                  className={`flex items-center justify-between p-7 rounded-[2rem] border-2 transition-all cursor-pointer group ${
                  formData.retakeEnabled
                    ? 'bg-purple-500/10 border-purple-500 shadow-xl shadow-purple-500/5'
                    : 'bg-slate-50/50 dark:bg-navy/40 border-slate-200 dark:border-white/5 opacity-60'
                }`}>
                  <div className="flex items-center gap-5">
                    <div className={`size-12 rounded-xl flex items-center justify-center transition-colors ${
                      formData.retakeEnabled ? 'bg-purple-500 text-white' : 'bg-slate-200 dark:bg-white/5 text-slate-400'
                    }`}>
                      <span className="material-symbols-outlined text-[24px]">replay_circle_filled</span>
                    </div>
                    <div>
                      <span className="font-black text-navy dark:text-white tracking-tight uppercase italic underline decoration-purple-500/30">{t('teacherExamCreate.allowRetakes')}</span>
                      <p className="text-[10px] font-bold text-slate-500 mt-0.5">{t('teacherExamCreate.allowRetakesDesc')}</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={formData.retakeEnabled}
                    onChange={(e) => handleInputChange('retakeEnabled', e.target.checked)}
                  />
                </motion.label>

                {formData.retakeEnabled && (
                  <div className="space-y-6 animate-fade-in p-8 rounded-[2.5rem] bg-purple-500/5 border border-purple-500/20 backdrop-blur-sm">
                    <div className="space-y-3">
                      <label className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 ml-1">{t('teacherExamCreate.retakeCooldownHours')}</label>
                      <input
                        type="number"
                        className="w-full bg-slate-50 dark:bg-navy/60 border-2 border-slate-200 dark:border-white/5 text-navy dark:text-white rounded-[1.5rem] px-6 py-5 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none font-black text-xl text-center"
                        min="0"
                        value={formData.retakeDelay}
                        onChange={(e) => handleInputChange('retakeDelay', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <motion.label 
                      whileHover={{ scale: 1.02 }}
                      className={`flex items-center justify-between p-5 rounded-2xl border-2 transition-all cursor-pointer group ${
                      formData.adaptiveRetake
                        ? 'bg-primary border-primary shadow-lg shadow-primary/20'
                        : 'bg-white/50 dark:bg-navy/40 border-slate-200 dark:border-white/5'
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                          formData.adaptiveRetake ? 'bg-navy text-primary' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                        }`}>
                          <span className="material-symbols-outlined text-[20px]">psychology</span>
                        </div>
                        <span className={`font-black text-sm tracking-tight ${formData.adaptiveRetake ? 'text-navy' : 'text-slate-500 dark:text-slate-400'}`}>{t('teacherExamCreate.adaptiveEngine')}</span>
                      </div>
                      <input
                        type="checkbox"
                        className="hidden"
                        checked={formData.adaptiveRetake}
                        onChange={(e) => handleInputChange('adaptiveRetake', e.target.checked)}
                      />
                    </motion.label>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Form Actions */}
          <motion.div 
            variants={fadeInVariants}
            className="pt-12 border-t border-slate-200 dark:border-white/5 flex flex-col sm:flex-row justify-end gap-5"
          >
            <motion.button
              type="button"
              whileHover={{ scale: 1.02, x: -5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setLocation('/teacher/exams')}
              className="order-2 sm:order-1 px-10 py-5 rounded-[2rem] font-black uppercase tracking-widest text-xs bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-white/40 hover:bg-slate-200 dark:hover:bg-white/10 transition-all flex items-center justify-center gap-3"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              {t('teacherExamCreate.abortDeployment')}
            </motion.button>
            
            <motion.button
              type="submit"
              disabled={submitting}
              whileHover={!submitting ? { scale: 1.05, y: -5 } : {}}
              whileTap={!submitting ? { scale: 0.95 } : {}}
              className="order-1 sm:order-2 px-14 py-5 rounded-[2rem] bg-gold text-navy font-black uppercase tracking-widest text-xs shadow-2xl shadow-gold/30 hover:shadow-gold/50 transition-all flex items-center justify-center gap-4 disabled:opacity-50 disabled:cursor-not-allowed group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
              {submitting ? (
                <span className="animate-spin border-3 border-navy/30 border-t-navy rounded-full size-5" />
              ) : (
                <span className="material-symbols-outlined text-[20px] group-hover:rotate-12 transition-transform">rocket_launch</span>
              )}
              {submitting ? t('teacherExamCreate.initializing') : t('teacherExamCreate.deployAssessment')}
            </motion.button>
          </motion.div>
        </form>
      </div>
    </div>
</TeacherLayout>
  );
}
