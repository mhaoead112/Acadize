import React, { useState, useEffect, useRef } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { AutoSaveIndicator } from '@/components/AutoSaveIndicator'; // Reusing indicator for visual consistency
import { RichTextEditor } from '@/components/RichTextEditor';
import { CodeEditor } from '@/components/CodeEditor';
import { FillBlankQuestion } from '@/components/FillBlankQuestion';
import { MatchingQuestion } from '@/components/MatchingQuestion';
import QuestionContentRenderer from '@/components/QuestionContentRenderer';
import '@/components/QuestionContentRenderer.css';
import { usePortalI18n } from '@/hooks/usePortalI18n';


// ============================================================================
// TYPES
// ============================================================================

interface Question {
  id: string;
  type: string;
  // Map backend 'type' to frontend 'questionType' expectation if needed, 
  // or ensure data fetching maps it. 
  // checking backend routes: GET /api/exams/:id returns 'type' as MC, TF, Short, Essay etc mapped from questionType.
  // BUT student-exam-attempt expects questionType: 'multiple_choice', etc.
  // We need to handle this mapping or ensure fetch returns compatible types.
  // The server GET /api/exams/:id maps:
  // multiple_choice -> MC
  // true_false -> TF
  // short_answer -> Short
  // essay -> Essay
  // So we need to reverse map or handle these codes.
  // Let's look at student-exam-attempt fetch: it fetches from /api/exam-attempts/:id which returns raw questions.
  // The teacher preview fetches from /api/exams/:id which returns formatted questions.
  // We should probably map them back to full names for consistency with rendering logic.
  
  questionType: string; // We will map 'MC' -> 'multiple_choice' etc during fetch
  questionText: string;
  options: Array<{id: string; text: string; isCorrect?: boolean}> | string[];
  points: number;
  order: number;
  leftItems?: string[];
  rightItems?: string[];
}

interface Exam {
  id: string;
  title: string;
  duration: number;
  totalPoints: number;
  passingScore: number;
  antiCheatEnabled: boolean;
  questions: Question[];
}

// ============================================================================
// COMPONENT
// ============================================================================

const StudentExamPreview: React.FC = () => {
  const { t } = usePortalI18n("common");
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/teacher/exams/:examId/preview');
  const { getAuthHeaders, isAuthenticated } = useAuth();
  const examId = params?.examId as string;

  const [exam, setExam] = useState<Exam | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [timeLeft, setTimeLeft] = useState(0);

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  useEffect(() => {
    if (isAuthenticated && examId) {
      fetchExamData();
    }
  }, [isAuthenticated, examId]);

  const fetchExamData = async () => {
    setLoading(true);
    try {
      const headers = getAuthHeaders();
      const response = await fetch(apiEndpoint(`/api/exams/${examId}`), { headers });
      
      if (!response.ok) throw new Error('Failed to fetch exam');
      
      const data = await response.json();
      
      // Map questions to match StudentExamAttempt expectations
      const mappedQuestions = (data.questions || []).map((q: any) => ({
        ...q,
        questionText: q.text, // map text -> questionText
        questionType: mapTypeToFull(q.type), // map MC -> multiple_choice
        options: q.options || [],
        order: q.order || 0
      }));

      setExam({
        ...data,
        questions: mappedQuestions
      });
      setTimeLeft(data.duration * 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exam');
    } finally {
      setLoading(false);
    }
  };

  const mapTypeToFull = (shortType: string) => {
    // Map from GET /api/exams/:id format to student-exam-attempt format
    switch (shortType) {
      case 'MC': return 'multiple_choice';
      case 'TF': return 'true_false';
      case 'Short': return 'short_answer';
      case 'Essay': return 'essay';
      // If backend returns full strings for others or mixed, handle default
      case 'fill_blank': return 'fill_blank'; 
      case 'code': return 'code';
      case 'matching': return 'matching';
      default: return shortType.toLowerCase();
    }
  };

  // ============================================================================
  // TIMER (Mock)
  // ============================================================================

  useEffect(() => {
    if (!exam) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [exam]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleExit = () => {
    setLocation(`/teacher/exams/${examId}`);
  };

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
  // RENDER
  // ============================================================================

  if (loading) {
     return (
       <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
         <div className="text-center space-y-4">
           <div className="animate-spin rounded-full h-16 w-16 border-b-2 dark:border-primary border-yellow-400 mx-auto"></div>
           <p className="dark:text-slate-400 text-slate-600">Loading exam preview...</p>
         </div>
       </div>
     );
   }
 
   if (error || !exam) {
     return (
       <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
         <div className="max-w-md w-full dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 text-center">
           <span className="material-symbols-outlined text-4xl dark:text-red-400 text-red-600 mb-2 block">error</span>
           <p className="dark:text-red-400 text-red-600 font-medium mb-4">{error || 'Failed to load exam'}</p>
           <button 
             onClick={handleExit}
             className="px-6 py-2 dark:bg-red-500/20 dark:hover:bg-red-500/30 dark:text-red-400 bg-red-200 hover:bg-red-300 text-red-700 rounded-lg transition-all font-medium"
           >
             Exit Preview
           </button>
         </div>
       </div>
     );
   }

  if (!exam.questions || exam.questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen dark:bg-[#0a192f] bg-slate-50">
         <div className="max-w-md w-full dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl p-8 text-center">
           <p className="dark:text-slate-300 text-slate-700 font-medium mb-3">This exam has no questions.</p>
           <button onClick={handleExit} className="px-6 py-2 bg-slate-200 rounded-lg">Exit</button>
         </div>
      </div>
    );
  }

  const currentQuestion = exam.questions[currentIndex];

  return (
    <div className="flex flex-col h-screen dark:bg-[#0a192f] bg-white overflow-hidden">
      {/* PREVIEW BANNER */}
      <div className="bg-yellow-500 dark:bg-yellow-600 text-black font-bold text-center py-1 z-50 text-xs tracking-wider uppercase">
        Teacher Preview Mode - No answers will be saved
      </div>

      {/* Header - Replicating StudentExamAttempt Header */}
      <header className="h-20 dark:bg-navy-card dark:border-navy-border bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 z-20 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="dark:text-white text-slate-900 text-lg font-bold leading-tight tracking-tight">{exam.title}</h1>
            <div className="flex items-center gap-3">
              <p className="dark:text-slate-400 text-slate-600 text-xs font-normal">
                Teacher Preview Session
              </p>
              {/* Mock AutoSave for visuals */}
              <div className="flex items-center gap-1.5 opacity-50">
                 <div className="size-1.5 rounded-full bg-slate-400"></div>
                 <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Saved</span>
              </div>
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
          <span className="text-[10px] dark:text-slate-500 text-slate-600 mt-1 uppercase tracking-wider font-medium">Timer Preview</span>
        </div>

        <button 
          onClick={handleExit}
          className="flex items-center gap-2 px-5 h-10 rounded-full transition-colors font-bold text-sm dark:bg-red-500/20 dark:text-red-400 dark:hover:bg-red-500/30 bg-red-100 text-red-700 hover:bg-red-200"
        >
          Exit Preview
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>logout</span>
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Question Navigator Sidebar - Desktop Only */}
        <aside className="w-80 dark:bg-navy-dark dark:border-navy-border bg-slate-50 border-r border-slate-200 flex flex-col hidden lg:flex shrink-0">
          <div className="p-6 dark:border-navy-border border-b border-slate-200">
            <h2 className="dark:text-white text-slate-900 text-base font-semibold mb-4">Question Navigator</h2>
            <div className="grid grid-cols-5 gap-2">
              {exam.questions.map((q, i) => (
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

          {/* Session Monitor - Mock for Preview */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="dark:bg-navy-lighter/30 dark:border-navy-border bg-slate-100 border border-slate-200 rounded-lg p-4 opacity-70">
              <p className="text-[10px] dark:text-slate-500 text-slate-600 uppercase tracking-widest font-bold mb-2">Session Monitor (Preview)</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-green-500"></div>
                    <span className="text-xs dark:text-slate-400 text-slate-600">Simulated Sync</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-2 dark:border-navy-border/50 border-t border-slate-200 dark:border-slate-700/50">
                  <div className="flex items-center gap-2">
                    <div className="size-1.5 rounded-full bg-green-500/50"></div>
                    <span className="text-[11px] dark:text-slate-500 text-slate-600 font-medium">Activity focus</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded dark:bg-green-500/10 dark:text-green-500 bg-green-100 text-green-700">
                    ACTIVE
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-lg p-4">
               <h4 className="text-sm font-bold text-yellow-800 dark:text-yellow-500 mb-2 flex items-center gap-2">
                 <span className="material-symbols-outlined text-sm">info</span>
                 Preview Mode
               </h4>
               <p className="text-xs text-yellow-700 dark:text-yellow-600 leading-relaxed">
                 You are viewing this exam as a student would. Proctoring features are disabled.
               </p>
             </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto dark:bg-[#0a192f]/50 bg-slate-50/50 relative p-8">
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            
            {/* Question Card */}
            <div className="dark:bg-navy-card dark:border-navy-border bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
              <div className="p-6 md:p-8 flex flex-col gap-6">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="inline-block px-3 py-1 rounded dark:bg-navy-dark dark:text-primary dark:border dark:border-navy-border bg-slate-100 text-yellow-600 border border-slate-300 text-xs font-bold uppercase tracking-wider mb-2">
                      Question • {currentIndex + 1} of {exam.questions.length}
                    </span>
                    <h2 className="text-2xl font-bold dark:text-white text-slate-900">Question {currentIndex + 1}</h2>
                  </div>
                  <span className="text-sm dark:text-slate-400 text-slate-600 font-medium">{currentQuestion.points} points</span>
                </div>

                <div className="text-lg dark:text-slate-200 text-slate-800 leading-relaxed">
                  <QuestionContentRenderer content={currentQuestion.questionText} />
                </div>

                {/* Render answer input based on question type - REPLICATED structure */}
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
                              name={`answer-${currentQuestion.id}`}
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

                  {/* Essay Question */}
                  {currentQuestion.questionType === 'essay' && (
                    <RichTextEditor
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      placeholder="Write your essay answer here..."
                      maxLength={5000}
                    />
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

                  {/* Fill in the Blank */}
                  {currentQuestion.questionType === 'fill_blank' && (
                    <FillBlankQuestion
                      questionText={currentQuestion.questionText}
                      value={(answers[currentQuestion.id] as string[]) || []}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                    />
                  )}

                  {/* Code Question */}
                  {currentQuestion.questionType === 'code' && (
                    <CodeEditor
                      value={(answers[currentQuestion.id] as string) || ''}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                      language="javascript"
                      height="400px"
                      maxLines={200}
                    />
                  )}

                  {/* Matching Question */}
                  {currentQuestion.questionType === 'matching' && (
                    <MatchingQuestion
                      leftItems={currentQuestion.leftItems || []}
                      rightItems={currentQuestion.rightItems || []}
                      value={(answers[currentQuestion.id] as Record<string, string>) || {}}
                      onChange={(val) => handleAnswerChange(currentQuestion.id, val)}
                    />
                  )}
                  
                  {/* Fallback */}
                  {!['multiple_choice', 'true_false', 'essay', 'short_answer', 'fill_blank', 'code', 'matching'].includes(currentQuestion.questionType) && (
                     <>
                        <p className="text-sm font-medium dark:text-slate-400 text-slate-600 mb-2">Your answer:</p>
                        <textarea
                          className="w-full min-h-[200px] p-4 rounded-lg border dark:bg-navy-dark dark:border-navy-border dark:text-white bg-white border-slate-300 text-slate-900 focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                          placeholder="Type your answer here..."
                          value={(answers[currentQuestion.id] as string) || ''}
                          onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                        />
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

              {currentIndex < exam.questions.length - 1 ? (
                <button 
                  onClick={() => setCurrentIndex(currentIndex + 1)}
                  className="flex items-center gap-2 px-8 h-12 rounded-lg dark:bg-primary dark:hover:bg-yellow-400 dark:text-navy-dark bg-yellow-400 hover:bg-yellow-500 text-slate-900 transition font-bold shadow-lg dark:shadow-primary/20 shadow-yellow-400/20"
                >
                  Next Question <span className="material-symbols-outlined">arrow_forward</span>
                </button>
              ) : (
                <button 
                  onClick={handleExit}
                  className="flex items-center gap-2 px-8 h-12 rounded-lg dark:bg-green-500 dark:hover:bg-green-400 dark:text-white bg-green-500 hover:bg-green-600 text-white transition font-bold shadow-lg dark:shadow-green-500/20 shadow-green-500/20"
                >
                  Finish Preview <span className="material-symbols-outlined text-[20px]">check_circle</span>
                </button>
              )}
            </div>

            {/* Info Banner */}
            <div className="dark:bg-blue-500/10 dark:border-blue-500/20 bg-blue-100 border border-blue-300 rounded-lg p-4">
              <div className="flex gap-2">
                <span className="material-symbols-outlined dark:text-blue-400 text-blue-600 shrink-0 text-[20px]">info</span>
                <div className="space-y-1">
                  <p className="dark:text-blue-300 text-blue-700 text-xs leading-relaxed">
                    This is a preview. Answers are not actually saved to a database.
                  </p>
                  <p className="dark:text-blue-400 text-blue-600 text-[10px] leading-relaxed">
                    {Object.keys(answers).length} of {exam.questions.length} questions answered (locally)
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

export default StudentExamPreview;
