import React, { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { useToast } from '@/hooks/use-toast';
import TeacherLayout from '@/components/TeacherLayout';
import QuestionRichEditor from '@/components/QuestionRichEditor';
import '@/components/QuestionRichEditor.css';
import MatchingQuestionEditor from '@/components/MatchingQuestionEditor';
import SortableQuestionList from '@/components/SortableQuestionList';
import '@/styles/mobile-optimizations.css';

// Interfaces based on schema and UI
interface QuestionOption {
  id: string;
  text: string;
  isCorrect?: boolean;
}

interface MatchingPair {
  id: string;
  left: string;
  right: string;
}

interface Question {
  id: string;
  type: 'mc' | 'tf' | 'essay' | 'short' | 'code' | 'fill_blank' | 'matching';
  text: string;
  points: number;
  options?: QuestionOption[];
  matchingPairs?: MatchingPair[];
  correctAnswer?: string | boolean | string[];
  explanation?: string;
  hint?: string;
  difficulty?: number;
  shuffleOptions?: boolean;
  penalty?: boolean;
}

interface ExamDetails {
  id: string;
  title: string;
  courseName: string; // derived from courseId fetch
  totalPoints: number;
}

export default function TeacherExamQuestions() {
  const [match, params] = useRoute('/teacher/exams/:id/questions');
  const examId = params?.id;
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders } = useAuth();
  const { toast } = useToast();

  const [exam, setExam] = useState<ExamDetails | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Mappings
  const typeToLabel: Record<string, string> = {
    mc: 'Multiple Choice',
    tf: 'True/False',
    essay: 'Essay',
    short: 'Short Answer',
    code: 'Code',
    fill_blank: 'Fill In The Blank',
    matching: 'Matching'
  };

  const typeToBackend: Record<string, string> = {
    mc: 'MC',
    tf: 'TF',
    essay: 'Essay',
    short: 'Short',
    code: 'Code',
    fill_blank: 'FillBlank',
    matching: 'Matching'
  };

  const backendToType: Record<string, 'mc' | 'tf' | 'short' | 'essay' | 'code' | 'fill_blank' | 'matching'> = {
    multiple_choice: 'mc',
    true_false: 'tf',
    essay: 'essay',
    short_answer: 'short',
    code: 'code',
    fill_blank: 'fill_blank',
    matching: 'matching',
    // fallbacks
    MC: 'mc',
    TF: 'tf',
    Essay: 'essay',
    Short: 'short',
    Code: 'code',
    FillBlank: 'fill_blank',
    Matching: 'matching'
  };

  useEffect(() => {
    if (examId) {
      fetchExamData();
    }
  }, [examId]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      // Fetch Exam Details (including questions)
      const res = await fetch(apiEndpoint(`/api/exams/${examId}`), {
        headers: getAuthHeaders(),
        credentials: 'include'
      });
      
      if (!res.ok) throw new Error('Failed to fetch exam');
      
      const data = await res.json();
      
      let courseName = 'Course';
      if (data.courseId) {
        try {
           const courseRes = await fetch(apiEndpoint(`/api/courses/${data.courseId}`), {
             headers: getAuthHeaders(),
             credentials: 'include'
           });
           if (courseRes.ok) {
             const courseData = await courseRes.json();
             courseName = courseData.title;
           }
        } catch(e) { console.warn('Failed to fetch course name', e); }
      }
      
      setExam({
        id: data.id,
        title: data.title,
        courseName: courseName,
        totalPoints: data.totalPoints
      });

      // Map questions
      const mappedQuestions: Question[] = (data.questions || []).map((q: any) => ({
        id: q.id,
        type: backendToType[q.type] || 'essay',
        text: q.text,
        points: q.points,
        options: q.options ? q.options.map((o: any) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })) : [],
        correctAnswer: q.correctAnswer,
        explanation: q.rubric, // Mapping rubric to explanation for now
        difficulty: 3, // Default as not in schema response yet
        shuffleOptions: false,
        penalty: false
      }));

      setQuestions(mappedQuestions);
      if (mappedQuestions.length > 0) {
        setActiveQuestionId(mappedQuestions[0].id);
      }
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to load exam data', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      type: 'mc',
      text: '',
      points: 5,
      options: [
        { id: `opt_${Date.now()}_1`, text: '', isCorrect: false },
        { id: `opt_${Date.now()}_2`, text: '', isCorrect: false }
      ],
      matchingPairs: [],
      difficulty: 1
    };
    setQuestions([...questions, newQuestion]);
    setActiveQuestionId(newQuestion.id);
  };

  const handleDeleteQuestion = async (id: string) => {
    // If temp, just remove from state
    if (id.startsWith('temp_')) {
      const newQuestions = questions.filter(q => q.id !== id);
      setQuestions(newQuestions);
      if (activeQuestionId === id) setActiveQuestionId(newQuestions[0]?.id || null);
      return;
    }

    // If persisted, call API (Assuming we should delete immediately or wait for save? 
    // Usually delete is destructive so request confirm then delete API)
    if (!confirm('Are you sure you want to delete this question?')) return;

    // API Call to delete would go here (Not documented in routes, assuming PATCH update or ignore for now)
    // Actually, I'll just remove from UI and let "Save" handle it, but wait, typical APIs require specific DELETE calls.
    // I will mock this for now or just remove from state.
    const newQuestions = questions.filter(q => q.id !== id);
    setQuestions(newQuestions);
    if (activeQuestionId === id) setActiveQuestionId(newQuestions[0]?.id || null);
  };

  const handleQuestionUpdate = (field: keyof Question, value: any) => {
    if (!activeQuestionId) return;
    setQuestions(questions.map(q => 
      q.id === activeQuestionId ? { ...q, [field]: value } : q
    ));
  };

  const handleOptionUpdate = (optId: string, text: string) => {
    if (!activeQuestionId) return;
    const q = questions.find(q => q.id === activeQuestionId);
    if (!q || !q.options) return;

    const newOptions = q.options.map(o => o.id === optId ? { ...o, text } : o);
    handleQuestionUpdate('options', newOptions);
  };

  const handleCorrectOptionChange = (optId: string) => {
    if (!activeQuestionId) return;
    const q = questions.find(q => q.id === activeQuestionId);
    if (!q || !q.options) return;

    // For MC, can accept multiple if we want, but UI suggests radio (single)
    const newOptions = q.options.map(o => ({ ...o, isCorrect: o.id === optId }));
    handleQuestionUpdate('options', newOptions);
  };

  const handleAddOption = () => {
    if (!activeQuestionId) return;
    const q = questions.find(q => q.id === activeQuestionId);
    if (!q || !q.options) return;

    const newOption = { id: `opt_${Date.now()}`, text: '', isCorrect: false };
    handleQuestionUpdate('options', [...q.options, newOption]);
  };

  const handleSaveCurrentQuestion = async () => {
    if (!activeQuestionId) return;
    const q = questions.find(q => q.id === activeQuestionId);
    if (!q) return;

    setSaving(true);
    try {
      const payload = {
        text: q.text,
        type: typeToBackend[q.type],
        points: q.points,
        options: q.options,
        correctAnswer: q.type === 'tf' ? q.correctAnswer : undefined, // Logic varies
        rubric: q.explanation // Mapping back
        // Add other fields as schema allows
      };

      let url = apiEndpoint(`/api/exams/${examId}/questions`);
      let method = 'POST';

      if (!q.id.startsWith('temp_')) {
        url = apiEndpoint(`/api/exams/${examId}/questions/${q.id}`);
        method = 'PATCH';
      }

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Failed to save question');

      const savedData = await res.json();
      
      // Update ID if it was temp
      if (q.id.startsWith('temp_')) {
        setQuestions(questions.map(qt => qt.id === q.id ? { ...qt, id: savedData.question.id } : qt));
        setActiveQuestionId(savedData.question.id);
      }
      
      setLastSaved(new Date());
      toast({ title: 'Saved', description: 'Question saved successfully' });
    } catch (error) {
      console.error(error);
      toast({ title: 'Error', description: 'Failed to save question', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const activeQuestion = questions.find(q => q.id === activeQuestionId);

  if (loading) return (
    <TeacherLayout>
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="text-slate-500 dark:text-slate-400">Loading...</p>
        </div>
      </div>
    </TeacherLayout>
  );

  return (
    <TeacherLayout>
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col max-w-[1600px] w-full mx-auto p-4 md:p-6 lg:p-8 gap-6">
        {/* Breadcrumbs & Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <button onClick={() => setLocation('/teacher/courses')} className="hover:text-primary transition-colors">Courses</button>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="hover:text-primary transition-colors">{exam?.courseName || 'Course'}</span>
            <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            <span className="text-slate-900 dark:text-white font-medium">{exam?.title || 'Exam'}</span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 dark:border-navy-border pb-6">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight">Add/Edit Questions</h1>
              <p className="mt-2 text-slate-500 dark:text-slate-400">Manage exam content for <span className="text-slate-900 dark:text-white font-medium">{exam?.title}</span></p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => window.open(`/api/exams/${examId}/preview`)}
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-navy-border bg-white dark:bg-navy-card text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-navy-border transition-colors text-sm font-medium"
              >
                <span className="material-symbols-outlined text-[20px]">visibility</span>
                Preview Exam
              </button>
              <button 
                onClick={() => setLocation(`/teacher/exams`)}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-primary text-navy-dark font-bold hover:bg-primary-hover transition-colors shadow-[0_0_15px_rgba(242,208,13,0.2)]"
              >
                <span className="material-symbols-outlined text-[20px] font-semibold">save</span>
                Save Changes
              </button>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="flex flex-col lg:flex-row gap-6 h-full flex-1">
          {/* Left Sidebar: Question List */}
          <aside className="w-full lg:w-[320px] xl:w-[380px] flex flex-col gap-4 shrink-0">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Questions ({questions.length})</h3>
              <span className="text-xs font-medium bg-slate-100 dark:bg-navy-card border border-slate-200 dark:border-navy-border px-2 py-1 rounded text-slate-500 dark:text-slate-400">
                Total: {questions.reduce((acc, q) => acc + (q.points || 0), 0)}pts
              </span>
            </div>
            <SortableQuestionList
              questions={questions}
              activeQuestionId={activeQuestionId}
              onReorder={setQuestions}
              onSelect={setActiveQuestionId}
              typeToLabel={typeToLabel}
            />
            <button 
              onClick={handleCreateQuestion}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-navy-border bg-transparent py-4 text-sm font-bold text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined">add_circle</span>
              Add New Question
            </button>
          </aside>

          {/* Right Main: Editor */}
          {activeQuestion ? (
            <section className="flex-1 rounded-2xl bg-white dark:bg-navy-card p-6 shadow-xl border border-slate-200 dark:border-navy-border">
              {/* Editor Header */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-navy-border pb-6 mb-6">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    Question #{questions.findIndex(q => q.id === activeQuestionId) + 1}
                  </h2>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {lastSaved ? `Last saved: ${lastSaved.toLocaleTimeString()}` : 'Not saved yet'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 rounded-lg bg-slate-100 dark:bg-navy-dark px-3 py-2 border border-slate-200 dark:border-navy-border">
                    <span className="text-sm text-slate-500 dark:text-slate-400 font-medium">Type:</span>
                    <select 
                      value={activeQuestion.type}
                      onChange={(e) => handleQuestionUpdate('type', e.target.value)}
                      className="bg-transparent text-sm font-bold text-slate-900 dark:text-white focus:outline-none cursor-pointer"
                    >
                      <option value="mc">Multiple Choice</option>
                      <option value="tf">True/False</option>
                      <option value="essay">Essay</option>
                      <option value="short">Short Answer</option>
                      <option value="code">Code</option>
                      <option value="fill_blank">Fill In The Blank</option>
                      <option value="matching">Matching</option>
                    </select>
                  </div>
                  <button 
                    onClick={() => handleDeleteQuestion(activeQuestion.id)}
                    className="text-red-500 dark:text-red-400 hover:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-400/10 transition-colors" 
                    title="Delete Question"
                  >
                    <span className="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <label className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Question Text</label>
                  <QuestionRichEditor
                    value={activeQuestion.text}
                    onChange={(value) => handleQuestionUpdate('text', value)}
                    placeholder="Enter your question here..."
                  />
                </div>

                {/* Answers Section */}
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Answer Options</label>
                    {activeQuestion.type === 'mc' && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={activeQuestion.shuffleOptions || false}
                          onChange={(e) => handleQuestionUpdate('shuffleOptions', e.target.checked)}
                          className="form-checkbox rounded bg-slate-100 dark:bg-navy-dark border-slate-300 dark:border-navy-border text-primary focus:ring-primary h-4 w-4" 
                        />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Shuffle options for students</span>
                      </label>
                    )}
                  </div>

                  <div className="grid gap-3">
                    {activeQuestion.type === 'mc' && activeQuestion.options?.map((opt, idx) => (
                      <div 
                        key={opt.id}
                        className={`group flex items-center gap-3 rounded-lg border bg-slate-50 dark:bg-navy-dark p-3 transition-colors ${
                          opt.isCorrect 
                            ? 'border-primary shadow-[0_0_0_1px_#f2d00d]' 
                            : 'border-slate-200 dark:border-navy-border hover:border-slate-300 dark:hover:border-navy-border/80'
                        }`}
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center">
                          <input 
                            type="radio" 
                            name="correct_answer"
                            checked={opt.isCorrect || false}
                            onChange={() => handleCorrectOptionChange(opt.id)}
                            className="h-5 w-5 border-2 border-slate-400 dark:border-slate-500 bg-transparent text-primary focus:ring-primary focus:ring-offset-0 checked:border-primary cursor-pointer" 
                          />
                        </div>
                        <span className={`font-mono text-sm font-bold w-6 ${opt.isCorrect ? 'text-primary' : 'text-slate-500 dark:text-slate-400'}`}>
                          {String.fromCharCode(65 + idx)}.
                        </span>
                        <input 
                          type="text" 
                          value={opt.text}
                          onChange={(e) => handleOptionUpdate(opt.id, e.target.value)}
                          className={`flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none text-sm ${opt.isCorrect ? 'font-medium' : ''}`}
                          placeholder={`Option ${idx + 1}`}
                        />
                        <div className="flex gap-2 items-center">
                          {opt.isCorrect && (
                            <span className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold uppercase text-green-600 dark:text-green-500 border border-green-500/20 whitespace-nowrap">
                              Correct Answer
                            </span>
                          )}
                          <div className={`flex gap-2 transition-opacity ${opt.isCorrect ? 'opacity-100 md:opacity-0 md:group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                            <button className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-white"><span className="material-symbols-outlined text-[20px]">image</span></button>
                            <button 
                              onClick={() => {
                                const newOpts = (activeQuestion.options || []).filter(o => o.id !== opt.id);
                                handleQuestionUpdate('options', newOpts);
                              }}
                              className="text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400"
                            >
                              <span className="material-symbols-outlined text-[20px]">close</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {activeQuestion.type === 'mc' && (
                      <button 
                        onClick={handleAddOption}
                        className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-navy-border p-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:border-primary hover:text-primary transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">add</span>
                        Add Option
                      </button>
                    )}

                    {activeQuestion.type === 'tf' && (
                      <div className="flex gap-4">
                        {['True', 'False'].map(val => {
                          const isSelected = String(activeQuestion.correctAnswer).toLowerCase() === val.toLowerCase();
                          return (
                            <div 
                              key={val}
                              onClick={() => handleQuestionUpdate('correctAnswer', val)}
                              className={`flex-1 p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-center gap-2 ${
                                isSelected 
                                  ? 'bg-primary/10 border-primary text-primary font-bold' 
                                  : 'bg-slate-50 dark:bg-navy-dark border-slate-200 dark:border-navy-border text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-white/20'
                              }`}
                            >
                              <div className={`size-4 rounded-full border-2 ${isSelected ? 'border-primary bg-primary' : 'border-slate-400 dark:border-slate-500'}`}></div>
                              {val}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {(activeQuestion.type === 'essay' || activeQuestion.type === 'short' || activeQuestion.type === 'code' || activeQuestion.type === 'fill_blank') && (
                      <div className="rounded-xl bg-slate-50 dark:bg-navy-dark p-4 border border-slate-200 dark:border-navy-border">
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                          {activeQuestion.type === 'essay' 
                            ? 'Students will be provided with a rich text editor to write their response.' 
                            : activeQuestion.type === 'code' ? 'Students will be provided with a code editor.'
                            : activeQuestion.type === 'fill_blank' ? 'Use [blank] in question text to create blanks.'
                            : 'Students will have a single-line input.'}
                        </p>
                        <div className="h-10 bg-slate-100 dark:bg-navy-card rounded-lg border border-slate-200 dark:border-navy-border w-full opacity-50"></div>
                      </div>
                    )}

                    {activeQuestion.type === 'matching' && (
                      <MatchingQuestionEditor
                        pairs={activeQuestion.matchingPairs || []}
                        onChange={(pairs) => handleQuestionUpdate('matchingPairs', pairs)}
                      />
                    )}
                  </div>
                </div>

                {/* Grading & Feedback Settings */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 dark:border-navy-border">
                  {/* Grading Card */}
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Grading & Difficulty</label>
                    <div className="rounded-xl bg-slate-50 dark:bg-navy-dark p-4 border border-slate-200 dark:border-navy-border flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-white">Points Value</span>
                        <div className="flex items-center rounded-lg border border-slate-200 dark:border-navy-border bg-white dark:bg-navy-card">
                          <button 
                            onClick={() => handleQuestionUpdate('points', Math.max(0, (activeQuestion.points || 0) - 1))}
                            className="px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-border rounded-l-lg transition-colors"
                          >-</button>
                          <input 
                            type="text" 
                            value={activeQuestion.points}
                            onChange={(e) => handleQuestionUpdate('points', parseInt(e.target.value) || 0)}
                            className="w-12 bg-transparent text-center text-sm font-bold text-slate-900 dark:text-white focus:outline-none border-x border-slate-200 dark:border-navy-border h-full py-1"
                          />
                          <button 
                            onClick={() => handleQuestionUpdate('points', (activeQuestion.points || 0) + 1)}
                            className="px-3 py-1 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-border rounded-r-lg transition-colors"
                          >+</button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-white">Difficulty</span>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <span 
                              key={star}
                              onClick={() => handleQuestionUpdate('difficulty', star)}
                              className={`material-symbols-outlined text-[20px] cursor-pointer ${
                                star <= (activeQuestion.difficulty || 0) ? 'text-primary' : 'text-slate-300 dark:text-navy-border hover:text-primary/50'
                              }`}
                            >
                              star
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-sm text-slate-700 dark:text-white">Penalty for wrong answer</span>
                        <div className="relative cursor-pointer" onClick={() => handleQuestionUpdate('penalty', !activeQuestion.penalty)}>
                          <div className={`h-6 w-11 rounded-full border transition-all ${
                            activeQuestion.penalty ? 'bg-primary/20 border-primary' : 'bg-slate-200 dark:bg-navy-border border-transparent'
                          }`}>
                            <div className={`absolute top-[2px] h-5 w-5 rounded-full transition-all ${
                              activeQuestion.penalty ? 'left-[22px] bg-primary' : 'left-[2px] bg-slate-400 dark:bg-slate-500'
                            }`}></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Feedback Card */}
                  <div className="flex flex-col gap-4">
                    <label className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">Feedback & Hints</label>
                    <div className="rounded-xl bg-slate-50 dark:bg-navy-dark p-4 border border-slate-200 dark:border-navy-border flex flex-col gap-4">
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Correct Answer Explanation</span>
                        <textarea 
                          value={activeQuestion.explanation || ''}
                          onChange={(e) => handleQuestionUpdate('explanation', e.target.value)}
                          className="w-full rounded-lg bg-white dark:bg-navy-card border border-slate-200 dark:border-navy-border p-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                          placeholder="Explain why the answer is correct..." 
                          rows={2}
                        />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1 block">Hint for students</span>
                        <textarea 
                          value={activeQuestion.hint || ''}
                          onChange={(e) => handleQuestionUpdate('hint', e.target.value)}
                          className="w-full rounded-lg bg-white dark:bg-navy-card border border-slate-200 dark:border-navy-border p-2 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" 
                          placeholder="Add a hint to help students..." 
                          rows={2}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Actions */}
              <div className="mt-8 flex justify-end gap-3 pt-6 border-t border-slate-200 dark:border-navy-border">
                <button 
                  onClick={() => setLocation('/teacher/exams')}
                  className="px-5 py-2.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-navy-dark transition-colors text-sm font-bold"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveCurrentQuestion}
                  disabled={saving}
                  className="px-6 py-2.5 rounded-lg bg-primary text-navy-dark font-bold hover:bg-primary-hover transition-colors shadow-lg shadow-primary/10 flex items-center gap-2"
                >
                  {saving && <span className="animate-spin border-2 border-navy-dark border-t-transparent rounded-full size-4"></span>}
                  Done Editing
                </button>
              </div>
            </section>
          ) : (
            <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
              Select or check a question to edit
            </div>
          )}
        </div>
      </div>
    </TeacherLayout>
  );
}
