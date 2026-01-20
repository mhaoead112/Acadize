import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import StudentLayout from '../components/StudentLayout';
import { useAuth } from '../hooks/useAuth';

interface Question {
  id: string;
  questionText: string;
  questionType: string;
  options: any[];
  points: number;
  topic: string;
  difficulty: string;
  timeLimit?: number;
}

interface RetakeAttempt {
  retake: any;
  questions: Question[];
  mistakeCount: number;
}

export default function StudentRetakeAttempt() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  // Extract retakeId from URL
  const retakeId = location.split('/').pop();

  const [attempt, setAttempt] = useState<RetakeAttempt | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: any }>({});
  const [startTime] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    if (retakeId) {
      fetchRetake();
    }
  }, [retakeId]);

  const fetchRetake = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/retakes/${retakeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('authToken')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch retake');

      const data = await response.json();
      setAttempt(data);

      // Initialize answers
      const initialAnswers: { [key: string]: any } = {};
      data.questions.forEach((q: Question) => {
        initialAnswers[q.id] = null;
      });
      setAnswers(initialAnswers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load retake');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const durationSeconds = Math.floor((Date.now() - startTime) / 1000);

      // Format answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/api/retakes/${retakeId}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('authToken')}`,
        },
        body: JSON.stringify({
          answers: formattedAnswers,
          durationSeconds,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit retake');
      }

      const result = await response.json();
      setLocation(`/student/exam-results/${result.attemptId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit retake');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <StudentLayout>
        <div className="w-full h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </StudentLayout>
    );
  }

  if (error || !attempt) {
    return (
      <StudentLayout>
        <div className="w-full max-w-4xl mx-auto p-4 sm:p-8">
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400">
            <span className="material-symbols-outlined">error</span>
            <p className="text-sm font-medium">{error || 'Failed to load retake'}</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const question = attempt.questions[currentQuestion];
  const allAnswered = Object.values(answers).every((a) => a !== null);

  return (
    <StudentLayout>
      <div className="w-full max-w-4xl mx-auto p-4 sm:p-8">
        {/* Info Banner */}
        {showInfo && (
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 p-4 rounded-xl flex items-start gap-3 text-blue-400">
            <span className="material-symbols-outlined mt-1">info</span>
            <div className="flex-1">
              <p className="text-sm font-medium">Retake Mode - Learning Focused</p>
              <p className="text-xs opacity-75 mt-1">
                This is a learning-focused attempt. Focus on understanding rather than speed.
              </p>
            </div>
            <button
              onClick={() => setShowInfo(false)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">close</span>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {attempt.retake.title}
            </h1>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">quiz</span>
                {currentQuestion + 1} of {attempt.questions.length}
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-base">star</span>
                {question?.points || 1} points
              </span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">
              Progress
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {Math.round(((currentQuestion + 1) / attempt.questions.length) * 100)}%
            </span>
          </div>
          <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / attempt.questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white dark:bg-background-card border border-slate-200 dark:border-slate-700 rounded-xl p-6 sm:p-8 mb-6 shadow-sm">
          {/* Question Text */}
          <div className="mb-6">
            <div className="flex items-start gap-2 mb-4">
              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex-shrink-0">
                {currentQuestion + 1}
              </span>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                  {question?.questionText}
                </h2>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                    {question?.topic}
                  </span>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded ${
                      question?.difficulty === 'hard'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : question?.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                          : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    }`}
                  >
                    {question?.difficulty || 'medium'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Answer Input */}
          <div className="mb-6">
            {question?.questionType === 'multiple_choice' ? (
              <div className="space-y-2">
                {question?.options?.map((option: any, idx: number) => (
                  <label
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer transition-colors"
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="w-4 h-4 text-primary"
                    />
                    <span className="flex-1 text-slate-900 dark:text-white">{option}</span>
                  </label>
                ))}
              </div>
            ) : question?.questionType === 'true_false' ? (
              <div className="grid grid-cols-2 gap-3">
                {['True', 'False'].map((val) => (
                  <button
                    key={val}
                    onClick={() => handleAnswerChange(question.id, val)}
                    className={`p-4 rounded-lg border-2 font-medium transition-all ${
                      answers[question.id] === val
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            ) : (
              <textarea
                value={answers[question.id] || ''}
                onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                placeholder="Enter your answer..."
                className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary"
                rows={4}
              />
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between gap-3">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span className="material-symbols-outlined text-xl">chevron_left</span>
              Previous
            </button>

            <div className="flex items-center gap-2">
              {currentQuestion > 0 && (
                <button
                  onClick={() => setCurrentQuestion(0)}
                  className="px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  Start Over
                </button>
              )}
            </div>

            <button
              onClick={() => setCurrentQuestion(Math.min(attempt.questions.length - 1, currentQuestion + 1))}
              disabled={currentQuestion === attempt.questions.length - 1}
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
              <span className="material-symbols-outlined text-xl">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Submit Section */}
        <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-xl p-6 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-1">Ready to Submit?</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {allAnswered
                ? 'All questions answered. You can submit when ready.'
                : `${attempt.questions.length - Object.values(answers).filter((a) => a !== null).length} questions remaining.`}
            </p>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allAnswered || submitting}
            className="flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary-hover disabled:bg-slate-300 dark:disabled:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            <span className="material-symbols-outlined">check</span>
            {submitting ? 'Submitting...' : 'Submit Retake'}
          </button>
        </div>
      </div>
    </StudentLayout>
  );
}
