import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';

import { useAuth } from '../hooks/useAuth';
import { apiEndpoint } from '../lib/config';
import { usePortalI18n } from '@/hooks/usePortalI18n';


interface MistakeTopic {
  topic: string;
  count: number;
  lastAttempt: string;
}

export default function StudentRetakeConfig() {
  const { t } = usePortalI18n("common");
  const [, setLocation] = useLocation();
  const { user, getAuthHeaders } = useAuth();

  const [topics, setTopics] = useState<MistakeTopic[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [difficulty, setDifficulty] = useState<'review' | 'challenge'>('review');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchMistakes();
  }, []);

  const fetchMistakes = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiEndpoint('/api/student/mistakes'), {
        headers: getAuthHeaders(),
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to fetch mistakes');

      const data = await response.json();

      // Extract unique topics from byTopic grouping
      const uniqueTopics = data.byTopic || [];
      setTopics(uniqueTopics);

      // Pre-select first 2 topics
      if (uniqueTopics.length > 0) {
        setSelectedTopics(uniqueTopics.slice(0, 2).map((t: any) => t.topic));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mistakes');
    } finally {
      setLoading(false);
    }
  };

  const toggleTopic = (topicName: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topicName) ? prev.filter((t) => t !== topicName) : [...prev, topicName]
    );
  };

  const handleGenerateRetake = async () => {
    try {
      setGenerating(true);
      setError(null);
      
      const response = await fetch(apiEndpoint('/api/retakes'), {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          topicNames: selectedTopics,
          questionCount,
          difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate retake');
      }

      const retakeData = await response.json();
      setLocation(`/student/retakes/${retakeData.retakeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate retake');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error && topics.length === 0) {
    return (
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-8">
        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400">
          <span className="material-symbols-outlined">error</span>
          <p className="text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col gap-8">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-400">
            <span className="material-symbols-outlined">error</span>
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold uppercase tracking-wider w-fit">
            <span className="material-symbols-outlined text-[16px]">psychology</span>
            Growth Mode
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white">
            Mistake-Based Retake
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
            Don't let past mistakes define you—let them refine you. Create a custom practice exam generated
            specifically from questions you've missed in previous quizzes to turn your weak spots into strengths.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">topic</span>
                Select Topics for Review
              </h3>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                Found {topics.reduce((sum, t) => sum + t.count, 0)} missed questions
              </span>
            </div>

            <div className="bg-white dark:bg-background-card border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-4 p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <div className="col-span-1 flex justify-center">Select</div>
                <div className="col-span-8 md:col-span-9">Topic</div>
                <div className="col-span-3 md:col-span-2 text-right">Mistakes</div>
              </div>

              {/* Table Body */}
              <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {topics.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-4xl mb-2 block opacity-50">
                      check_circle
                    </span>
                    <p className="font-medium">No mistakes found</p>
                    <p className="text-sm">Great job! Keep up the good work.</p>
                  </div>
                ) : (
                  topics.map((topic) => (
                    <label
                      key={topic.topic}
                      className={`grid grid-cols-12 gap-4 p-4 transition-colors group ${
                        topics.length === 0
                          ? 'opacity-50 cursor-not-allowed'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-700/30 cursor-pointer'
                      }`}
                    >
                      <div className="col-span-1 flex justify-center items-center">
                        <input
                          disabled={topics.length === 0}
                          checked={selectedTopics.includes(topic.topic)}
                          onChange={() => toggleTopic(topic.topic)}
                          className="rounded border-slate-300 dark:border-slate-600 text-primary focus:ring-primary bg-white dark:bg-slate-700 size-5"
                          type="checkbox"
                        />
                      </div>
                      <div className="col-span-8 md:col-span-9 flex flex-col justify-center">
                        <span className="text-sm font-medium text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                          {topic.topic}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          Last attempt: {topic.lastAttempt}
                        </span>
                      </div>
                      <div className="col-span-3 md:col-span-2 flex items-center justify-end">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            topic.count > 5
                              ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          }`}
                        >
                          {topic.count}
                        </span>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar Configuration */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            <div className="bg-white dark:bg-background-card border border-slate-200 dark:border-slate-700 rounded-xl p-6 shadow-sm flex flex-col gap-6 sticky top-24">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">tune</span>
                Exam Configuration
              </h3>

              {/* Question Count Slider */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Number of Questions
                  </label>
                  <span className="text-lg font-bold text-primary font-mono">{questionCount}</span>
                </div>
                <input
                  disabled={topics.length === 0}
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50"
                  max="30"
                  min="5"
                  type="range"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                />
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Short Review</span>
                  <span>Deep Dive</span>
                </div>
              </div>

              {/* Difficulty Toggle */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Difficulty Level
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={topics.length === 0}
                    onClick={() => setDifficulty('review')}
                    className={`relative flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      difficulty === 'review'
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined mb-1">refresh</span>
                    <span className="text-xs font-bold">Review</span>
                    {difficulty === 'review' && (
                      <span className="absolute -top-2 -right-2 bg-primary text-slate-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                        Rec.
                      </span>
                    )}
                  </button>
                  <button
                    disabled={topics.length === 0}
                    onClick={() => setDifficulty('challenge')}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border-2 transition-all ${
                      difficulty === 'challenge'
                        ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20'
                        : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <span className="material-symbols-outlined mb-1">fitness_center</span>
                    <span className="text-xs font-bold">Challenge</span>
                  </button>
                </div>
              </div>

              {/* Generate Button */}
              <button
                disabled={selectedTopics.length === 0 || generating || topics.length === 0}
                onClick={handleGenerateRetake}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover disabled:bg-slate-300 dark:disabled:bg-slate-700 text-slate-900 dark:text-white font-bold rounded-lg shadow-lg shadow-primary/20 transition-all transform active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined group-hover:animate-bounce">auto_awesome</span>
                {generating ? 'Generating...' : 'Generate Retake Exam'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
