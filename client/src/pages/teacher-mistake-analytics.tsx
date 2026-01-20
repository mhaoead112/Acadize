import React, { useState, useEffect } from 'react';
import TeacherLayout from '@/components/TeacherLayout';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiEndpoint } from '@/lib/config';
import { Loader2 } from 'lucide-react';

interface Exam {
  id: string;
  title: string;
}

interface TopicBreakdown {
  topic: string;
  errorRate: number;
  color: string;
}

interface QuestionBreakdown {
  id: string;
  text: string;
  mistakeFrequency: number;
  commonMistakes: string[];
}

interface MistakeAnalyticsData {
  avgErrorRate: number;
  errorRateChange: number;
  hardestTopic: string;
  hardestTopicStruggle: number;
  mostCommonMistake: string;
  improvementRate: number;
  totalQuestionsAnalyzed: number;
  topicBreakdown: TopicBreakdown[];
  questionBreakdown: QuestionBreakdown[];
}

const TeacherMistakeAnalytics: React.FC = () => {
  const { toast } = useToast();
  const { token, isLoading: authLoading, getAuthHeaders } = useAuth();
  const [data, setData] = useState<MistakeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exams, setExams] = useState<Exam[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('all');
  const [isDark, setIsDark] = useState(false);

  // Detect dark mode from system or localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setIsDark(JSON.parse(savedDarkMode));
    } else {
      setIsDark(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }

    // Listen for dark mode changes
    const handleDarkModeChange = (e: MediaQueryListEvent) => {
      setIsDark(e.matches);
    };
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', handleDarkModeChange);
    return () => {
      window.matchMedia('(prefers-color-scheme: dark)').removeEventListener('change', handleDarkModeChange);
    };
  }, []);

  // Fetch exams on mount
  useEffect(() => {
    if (!authLoading && token) {
      fetchExams();
    }
  }, [authLoading, token]);

  // Fetch analytics data when selected exam changes
  useEffect(() => {
    if (!authLoading && token) {
      fetchAnalyticsData();
    }
  }, [selectedExam, authLoading, token]);

  const fetchExams = async () => {
    try {
      const headers = getAuthHeaders();
      const res = await fetch(apiEndpoint('/api/teacher/exams'), {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const examsData = await res.json();
        setExams(Array.isArray(examsData) ? examsData : []);
      }
    } catch (error) {
      console.error('Failed to fetch exams:', error);
    }
  };

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      
      const params = new URLSearchParams();
      if (selectedExam !== 'all') {
        params.append('examId', selectedExam);
      }

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(apiEndpoint(`/api/teacher/mistakes/analytics${queryString}`), {
        headers,
        credentials: 'include',
      });

      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      } else {
        throw new Error('Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load mistake analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <TeacherLayout>
        <div className={`flex-1 flex flex-col h-full relative overflow-y-auto ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className={`${isDark ? 'text-slate-300' : 'text-slate-600'} font-medium`}>
              Loading analytics...
            </p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
      <div className={`flex-1 flex flex-col h-full relative overflow-y-auto ${isDark ? 'bg-navy-950' : 'bg-slate-50'}`}>
        <div className="p-6 md:p-8">
          {/* Header Section */}
          <div className="flex flex-col xl:flex-row gap-6 justify-between items-start xl:items-end mb-10">
            <div>
              <h1 className={`text-4xl lg:text-5xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'} mb-3`}>
                Mistake Analytics
              </h1>
              <p className={`${isDark ? 'text-slate-400' : 'text-slate-600'} text-lg max-w-2xl`}>
                Identify common misconceptions across all student cohorts and refine your teaching strategy.
              </p>
            </div>

            {/* Exam Filter */}
            <div className={`${isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200'} border rounded-2xl p-2 flex gap-4`}>
              <select
                value={selectedExam}
                onChange={(e) => setSelectedExam(e.target.value)}
                className={`${isDark ? 'bg-transparent text-white' : 'bg-white text-slate-900'} border-none font-bold text-sm focus:ring-0 cursor-pointer`}
              >
                <option value="all">All Exams</option>
                {exams.map((exam) => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title}
                  </option>
                ))}
              </select>
              <button
                onClick={fetchAnalyticsData}
                className="bg-primary text-navy-950 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary/90 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {[
              {
                label: 'Avg Error Rate',
                val: `${data.avgErrorRate}%`,
                trend: `+${data.errorRateChange}%`,
                icon: 'warning',
                color: isDark ? 'text-red-400' : 'text-red-500',
              },
              {
                label: 'Hardest Topic',
                val: data.hardestTopic,
                trend: `${data.hardestTopicStruggle}% struggle`,
                icon: 'psychology',
                color: isDark ? 'text-primary' : 'text-blue-600',
              },
              {
                label: 'Common Mistake',
                val: data.mostCommonMistake,
                trend: `${data.improvementRate}% improvement`,
                icon: 'repeat',
                color: isDark ? 'text-green-400' : 'text-green-500',
              },
              {
                label: 'Questions Analyzed',
                val: data.totalQuestionsAnalyzed.toLocaleString(),
                trend: 'Across all attempts',
                icon: 'quiz',
                color: isDark ? 'text-blue-400' : 'text-blue-600',
              },
            ].map((kpi, idx) => (
              <div
                key={idx}
                className={`${isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200'} border rounded-2xl p-6 relative overflow-hidden group`}
              >
                <div className="absolute right-2 top-2 p-2 opacity-5 group-hover:opacity-10 transition-opacity">
                  <span className={`material-symbols-outlined text-[80px] ${kpi.color}`}>
                    {kpi.icon}
                  </span>
                </div>
                <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'} mb-2`}>
                  {kpi.label}
                </p>
                <h3 className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {kpi.val}
                </h3>
                <p className={`text-xs font-bold mt-1 ${kpi.color}`}>{kpi.trend}</p>
              </div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
            {/* Error Frequency by Topic */}
            <div className={`lg:col-span-2 ${isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200'} border rounded-2xl p-8`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-8`}>
                Error Frequency by Topic
              </h3>
              <div className="space-y-6">
                {data.topicBreakdown.map((t, i) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-2">
                      <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {t.topic}
                      </span>
                      <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        {t.errorRate}%
                      </span>
                    </div>
                    <div className={`h-3 ${isDark ? 'bg-navy-950' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                      <div
                        className="h-full rounded-full transition-all duration-1000"
                        style={{ width: `${t.errorRate}%`, backgroundColor: t.color }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructional Insight */}
            <div className={`lg:col-span-1 ${isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200'} border rounded-2xl p-8`}>
              <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-6`}>
                Instructional Insight
              </h3>
              <div className={`p-6 ${isDark ? 'bg-primary/10 border-primary/30' : 'bg-blue-50 border-blue-200'} border rounded-2xl`}>
                <div className="flex gap-3 items-start">
                  <span className="material-symbols-outlined text-primary">lightbulb</span>
                  <div>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-2`}>
                      Topic Focus: {data.hardestTopic}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'} leading-relaxed`}>
                      Students are consistently struggling with {data.hardestTopic.toLowerCase()}. Consider incorporating more practice problems and interactive demonstrations to improve mastery.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <p className={`text-xs font-black uppercase tracking-widest ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Most Difficult Question
                </p>
                {data.questionBreakdown.length > 0 && (
                  <div className={`p-4 ${isDark ? 'bg-navy-950 border-navy-800' : 'bg-slate-50 border-slate-200'} rounded-xl border`}>
                    <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'} italic mb-2`}>
                      "{data.questionBreakdown[0].text}"
                    </p>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-red-400 font-bold">
                        {data.questionBreakdown[0].mistakeFrequency}% Missed
                      </span>
                      <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>
                        ID: {data.questionBreakdown[0].id}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Question Breakdown */}
          <div className={`${isDark ? 'bg-navy-900 border-navy-700' : 'bg-white border-slate-200'} border rounded-2xl p-8`}>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'} mb-6`}>
              Question Mistake Frequency
            </h3>
            <div className="space-y-4">
              {data.questionBreakdown.map((q, idx) => (
                <div
                  key={idx}
                  className={`p-4 ${isDark ? 'bg-navy-950 border-navy-800 hover:border-navy-700' : 'bg-slate-50 border-slate-200 hover:border-slate-300'} border rounded-xl transition-colors`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Q{idx + 1}: {q.text}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ml-4 ${isDark ? 'text-red-400' : 'text-red-500'}`}>
                      {q.mistakeFrequency}% Error
                    </span>
                  </div>
                  {q.commonMistakes.length > 0 && (
                    <div className="text-xs space-y-1">
                      <p className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        Common Mistakes:
                      </p>
                      <ul className={`list-disc list-inside ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {q.commonMistakes.slice(0, 3).map((mistake, i) => (
                          <li key={i}>{mistake}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
};

export default TeacherMistakeAnalytics;
