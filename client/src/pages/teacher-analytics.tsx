import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiEndpoint, assetUrl } from "@/lib/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";

interface Course { id: string; title: string; }
interface StudentAnalytics {
  id: string;
  username: string;
  fullName: string;
  email: string;
  profilePicture?: string;
  averageScore: number;
  totalAssignments: number;
  completedAssignments: number;
  pendingAssignments: number;
  attendanceRate: number;
  lastActivity: string;
  trend: "up" | "down" | "stable";
  coursesEnrolled: number;
}
interface CourseAnalytics {
  courseId: string;
  courseTitle: string;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  totalAssignments: number;
  submittedAssignments: number;
}
interface OverviewStats {
  totalStudents: number;
  averageClassScore: number;
  totalAssignments: number;
  averageCompletionRate: number;
  studentsAtRisk: number;
  topPerformers: number;
}

interface PerformancePoint {
  weekStart: string;
  label: string;
  averageGrade: number;
}

interface SubmissionStatus {
  totalAssignments: number;
  totalSubmissions: number;
  onTime: number;
  late: number;
  missing: number;
  pending: number;
}

export default function TeacherAnalytics() {
  const { t } = useTranslation('teacher');
  const { toast } = useToast();
  const { token, isLoading: authLoading, getAuthHeaders } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedCourse, setSelectedCourse] = useState<string>("all");
  const [timeframe, setTimeframe] = useState<string>("30d");
  const [courses, setCourses] = useState<Course[]>([]);
  const [students, setStudents] = useState<StudentAnalytics[]>([]);
  const [courseAnalytics, setCourseAnalytics] = useState<CourseAnalytics[]>([]);
  const [overviewStats, setOverviewStats] = useState<OverviewStats>({
    totalStudents: 0,
    averageClassScore: 0,
    totalAssignments: 0,
    averageCompletionRate: 0,
    studentsAtRisk: 0,
    topPerformers: 0,
  });
  const [trendData, setTrendData] = useState<PerformancePoint[]>([]);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus>({
    totalAssignments: 0,
    totalSubmissions: 0,
    onTime: 0,
    late: 0,
    missing: 0,
    pending: 0,
  });

  const timeframeDaysMap: Record<string, number> = {
    "30d": 30,
    "semester": 120,
    "year": 365,
  };

  // Export analytics to CSV (preserved API-independent behavior)
  const handleExportAnalytics = () => {
    try {
      if (!students || students.length === 0) {
        toast({
          title: t("teacherAnalytics.noData"),
          description: t("teacherAnalytics.noStudentDataToExport"),
          variant: "destructive",
        });
        return;
      }

      const headers = [
        t("teacherAnalytics.studentName"),
        t("teacherAnalytics.email"),
        t("teacherAnalytics.averageScore"),
        t("teacherAnalytics.assignmentsCompleted"),
        t("teacherAnalytics.completionRate"),
        t("teacherAnalytics.status"),
      ];
      const rows = students.map(student => [
        student.fullName || student.username || 'N/A',
        student.email || 'N/A',
        student.averageScore ? `${student.averageScore.toFixed(1)}%` : '0%',
        student.completedAssignments || 0,
        student.totalAssignments > 0 ? `${((student.completedAssignments / student.totalAssignments) * 100).toFixed(1)}%` : '0%',
        (student.averageScore || 0) >= 70
          ? t("teacherAnalytics.goodStanding")
          : (student.averageScore || 0) >= 60
            ? t("teacherAnalytics.atRisk")
            : t("teacherAnalytics.needsAttention")
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `analytics_report_${selectedCourse}_${Date.now()}.csv`;
      link.click();
      URL.revokeObjectURL(url);

      toast({
        title: t("common:toast.success"),
        description: t('analyticsExported'),
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: t("error"),
        description: error instanceof Error ? error.message : t("teacherAnalytics.failedToExport"),
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!authLoading && token) fetchAnalyticsData();
  }, [authLoading, token, selectedCourse, timeframe]);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const headers = getAuthHeaders();
      const query = new URLSearchParams();
      if (selectedCourse !== "all") {
        query.set("courseId", selectedCourse);
      }

      const courseParam = query.toString() ? `?${query.toString()}` : "";
      const days = timeframeDaysMap[timeframe] ?? 60;
      const trendQuery = new URLSearchParams(query);
      trendQuery.set("timeframeDays", days.toString());
      const trendParam = trendQuery.toString() ? `?${trendQuery.toString()}` : "";

      // Fetch courses
      const coursesRes = await fetch(apiEndpoint("/api/courses/user"), { 
        headers,
        credentials: "include"
      });
      if (coursesRes.ok) {
        const coursesData = await coursesRes.json();
        setCourses(coursesData);
      }

      // Fetch analytics overview
      const overviewRes = await fetch(apiEndpoint(`/api/analytics/overview${courseParam}`), { 
        headers,
        credentials: "include"
      });
      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverviewStats(overviewData);
      }

      // Fetch student analytics
      const studentsRes = await fetch(apiEndpoint(`/api/analytics/students${courseParam}`), { 
        headers,
        credentials: "include"
      });
      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }

      // Fetch course analytics
      if (selectedCourse === "all") {
        const courseAnalyticsRes = await fetch(apiEndpoint("/api/analytics/courses"), { 
          headers,
          credentials: "include"
        });
        if (courseAnalyticsRes.ok) {
          const courseAnalyticsData = await courseAnalyticsRes.json();
          setCourseAnalytics(courseAnalyticsData);
        }
      }

      // Fetch performance trend
      const trendRes = await fetch(apiEndpoint(`/api/analytics/performance-trend${trendParam}`), {
        headers,
        credentials: "include"
      });
      if (trendRes.ok) {
        const trendData = await trendRes.json();
        setTrendData(trendData);
      }

      // Fetch submission status
      const submissionRes = await fetch(apiEndpoint(`/api/analytics/submission-status${trendParam}`), {
        headers,
        credentials: "include"
      });
      if (submissionRes.ok) {
        const submissionData = await submissionRes.json();
        setSubmissionStatus(submissionData);
      }
    } catch (error) {
      console.error("Failed to fetch analytics:", error);
      toast({
        title: t("error"),
        description: t('failedToLoadAnalytics'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  // Derived UI values for reference layout
  const avgGrade = overviewStats.averageClassScore || 0;
  const completionRate = overviewStats.averageCompletionRate || 0; // 0..100
  const missingOrLatePct = useMemo(() => {
    const totalStatuses = submissionStatus.onTime + submissionStatus.late + submissionStatus.missing + submissionStatus.pending;
    if (totalStatuses === 0) return Math.max(0, 100 - completionRate);
    return Math.round(((submissionStatus.late + submissionStatus.missing) / totalStatuses) * 100);
  }, [submissionStatus, completionRate]);
  const studentsAtRisk = overviewStats.studentsAtRisk || 0;
  const attendanceAvg = useMemo(() => {
    if (!students.length) return 0;
    const sum = students.reduce((acc, s) => acc + (s.attendanceRate || 0), 0);
    return Math.round(sum / students.length);
  }, [students]);

  // Build chart series matching reference
  const areaData = useMemo(() => {
    if (!trendData.length) return [];
    return trendData.map((point) => ({ name: point.label, grade: point.averageGrade }));
  }, [trendData]);

  const pieData = useMemo(() => {
    const total = submissionStatus.onTime + submissionStatus.late + submissionStatus.missing + submissionStatus.pending;
    if (total > 0) {
      return [
        { name: t("teacherAnalytics.onTime"), value: Math.round((submissionStatus.onTime / total) * 100), color: '#EAB308' },
        { name: t("teacherAnalytics.late"), value: Math.round((submissionStatus.late / total) * 100), color: '#1e3a8a' },
        { name: t("teacherAnalytics.missing"), value: Math.round((submissionStatus.missing / total) * 100), color: '#ef4444' },
        { name: t("teacherAnalytics.pending"), value: Math.round((submissionStatus.pending / total) * 100), color: '#94a3b8' },
      ];
    }
    return [
      { name: t("teacherAnalytics.onTime"), value: 0, color: '#EAB308' },
      { name: t("teacherAnalytics.late"), value: 0, color: '#1e3a8a' },
      { name: t("teacherAnalytics.missing"), value: 0, color: '#ef4444' },
      { name: t("teacherAnalytics.pending"), value: 0, color: '#94a3b8' },
    ];
  }, [submissionStatus]);

  const needsAttention = useMemo(() => {
    return students
      .filter((s) => (s.averageScore || 0) < 65)
      .sort((a, b) => (a.averageScore || 0) - (b.averageScore || 0))
      .slice(0, 5);
  }, [students]);

  if (loading) {
    return (
      <TeacherLayout>
      <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[#f8f9fc] dark:bg-navy-dark">
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">{t('loadingAnalytics')}</p>
        </div>
      </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
    <div className="flex-1 flex flex-col h-full relative overflow-y-auto bg-[#f8f9fc] dark:bg-navy-dark">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-3">
        <div className="flex items-center gap-4">
          <button className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
            <span className="material-symbols-outlined">menu</span>
          </button>
          <div className="flex flex-col">
            <h2 className="text-slate-900 dark:text-white text-lg font-bold leading-tight">{t('analyticsDashboard')}</h2>
            <p className="text-slate-500 dark:text-slate-400 text-xs">{t("teacherAnalytics.overviewSubtitle")}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative hidden sm:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[20px]">search</span>
            <input className="h-10 pl-10 pr-4 bg-slate-100 dark:bg-slate-800 border-none rounded-lg text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-gold/50 w-64 transition-all" placeholder={t("teacherAnalytics.searchData")} type="text"/>
          </div>
          <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 size-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
          </button>
          <button className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
            <span className="material-symbols-outlined">help</span>
          </button>
        </div>
      </header>

      <div className="p-6 md:p-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">{t("teacherAnalytics.selectClass")}</label>
              <select
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-gold focus:border-gold block p-2.5 pr-8"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
              >
                <option value="all">{t("teacherAnalytics.allClasses")}</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-2 bottom-2.5 text-slate-400 pointer-events-none text-xl">expand_more</span>
            </div>
            <div className="relative min-w-[160px]">
              <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">{t("teacherAnalytics.timeframe")}</label>
              <select
                className="w-full appearance-none bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm rounded-lg focus:ring-gold focus:border-gold block p-2.5 pr-8"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
              >
                <option value="30d">{t("teacherAnalytics.last30Days")}</option>
                <option value="semester">{t("teacherAnalytics.thisSemester")}</option>
                <option value="year">{t("teacherAnalytics.thisYear")}</option>
              </select>
              <span className="material-symbols-outlined absolute right-2 bottom-2.5 text-slate-400 pointer-events-none text-xl">expand_more</span>
            </div>
          </div>
          <button onClick={handleExportAnalytics} className="flex items-center justify-center gap-2 bg-white dark:bg-navy-light border border-slate-200 dark:border-transparent text-slate-700 dark:text-white font-medium py-2.5 px-4 rounded-lg hover:bg-slate-50 dark:hover:bg-blue-800 transition-colors shadow-sm">
            <span className="material-symbols-outlined text-[20px]">download</span>
            <span>{t("teacherAnalytics.exportReport")}</span>
          </button>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 h-full w-1 bg-gold"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gold/10 rounded-lg">
                <span className="material-symbols-outlined text-gold">analytics</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">+2.4%</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAnalytics.averageGrade")}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{avgGrade}%</p>
            <p className="text-xs text-slate-400 mt-2">{t("teacherAnalytics.classAverageRising")}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1 bg-navy-light"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">check_circle</span>
              </div>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">Stable</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAnalytics.assignmentCompletion")}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{completionRate}%</p>
            <p className="text-xs text-slate-400 mt-2">{missingOrLatePct}% {t("teacherAnalytics.missingOrLate")}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-gold/10 dark:bg-gold/20 rounded-lg">
                <span className="material-symbols-outlined text-gold dark:text-gold-light">warning</span>
              </div>
              <span className="text-xs font-medium text-gold bg-gold/10 dark:bg-gold/20 dark:text-gold-light px-2 py-1 rounded-full">{t("teacherAnalytics.actionNeeded")}</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAnalytics.atRiskStudents")}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{studentsAtRisk}</p>
            <p className="text-xs text-slate-400 mt-2">{t("teacherAnalytics.studentsBelow65")}</p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden">
            <div className="absolute right-0 top-0 h-full w-1 bg-emerald-500"></div>
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400">groups</span>
              </div>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 px-2 py-1 rounded-full">{attendanceAvg}%</span>
            </div>
            <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium mb-1">{t("teacherAnalytics.attendanceRate")}</h3>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{Math.round((attendanceAvg/100) * (overviewStats.totalStudents || 0))}/{overviewStats.totalStudents}</p>
            <p className="text-xs text-slate-400 mt-2">{t("teacherAnalytics.presentToday")}</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto">
          <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">{t("teacherAnalytics.classPerformanceTrend")}</h3>
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <span className="block size-2 rounded-full bg-gold"></span> {t("teacherAnalytics.classAverage")}
                </span>
              </div>
            </div>
            <div className="w-full h-[300px]">
              {areaData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-sm text-slate-500 dark:text-slate-400">
                  {t("teacherAnalytics.noPerformanceData")}
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={areaData}>
                    <defs>
                      <linearGradient id="colorGrade" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#EAB308" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#EAB308" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="name" 
                      stroke="#94a3b8" 
                      fontSize={12} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
                      itemStyle={{ color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="grade" stroke="#EAB308" strokeWidth={3} fillOpacity={1} fill="url(#colorGrade)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col">
            <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-6">{t("teacherAnalytics.submissionStatus")}</h3>
            <div className="flex-1 flex flex-col justify-center items-center gap-6 relative">
              <div className="w-[200px] h-[200px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 m-auto w-32 h-32 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-3xl font-bold text-slate-900 dark:text-white">{submissionStatus.totalAssignments || 0}</span>
                  <span className="text-xs text-slate-500">{t("teacherAnalytics.totalAssignments")}</span>
                </div>
              </div>
              
              <div className="w-full flex flex-col gap-3 px-4">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="size-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                      <span className="text-sm text-slate-600 dark:text-slate-300">{item.name}</span>
                    </div>
                    <span className="text-sm font-bold text-slate-900 dark:text-white">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-6">
          {/* Needs Attention Table */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-gold/5 dark:bg-gold/10">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-gold">warning</span>
                <h3 className="text-slate-900 dark:text-white font-bold text-lg">{t("teacherAnalytics.needsAttention")}</h3>
              </div>
              <button className="text-xs text-gold font-medium hover:underline">{t("viewAll")}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50">
                  <tr>
                    <th className="px-6 py-3">{t("teacherAnalytics.student")}</th>
                    <th className="px-6 py-3">{t("teacherAnalytics.grade")}</th>
                    <th className="px-6 py-3">{t("teacherAnalytics.missing")}</th>
                    <th className="px-6 py-3 text-right">{t("teacherAnalytics.action")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {needsAttention.slice(0, 2).map((s) => (
                    <tr key={s.id} className="bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white flex items-center gap-3">
                        <div className="size-8 rounded-full bg-slate-200 bg-cover flex items-center justify-center text-xs font-bold text-slate-700">
                          {(s.fullName || s.username).substring(0,1).toUpperCase()}
                        </div>
                        {s.fullName}
                      </td>
                      <td className="px-6 py-4 text-gold font-bold">{s.averageScore}%</td>
                      <td className="px-6 py-4 text-slate-500">{s.pendingAssignments ?? 0}</td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-gold hover:text-gold-light font-medium text-xs">{t("teacherAnalytics.message")}</button>
                      </td>
                    </tr>
                  ))}
                  {needsAttention.length === 0 && (
                    <tr>
                      <td className="px-6 py-8 text-center text-slate-500" colSpan={4}>{t("teacherAnalytics.noStudentsNeedAttention")}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Topic Mastery */}
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-900 dark:text-white font-bold text-lg">{t("teacherAnalytics.topicMastery")}</h3>
              <button className="p-1 hover:bg-slate-100 rounded">
                <span className="material-symbols-outlined text-slate-400">more_horiz</span>
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t("teacherAnalytics.cellStructure")}</span>
                  <span className="font-bold text-slate-900 dark:text-white">92%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="bg-gold h-2.5 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t("teacherAnalytics.photosynthesis")}</span>
                  <span className="font-bold text-slate-900 dark:text-white">85%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="bg-gold/80 h-2.5 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-slate-700 dark:text-slate-200">{t("teacherAnalytics.ecosystems")}</span>
                  <span className="font-bold text-slate-900 dark:text-white">61%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2.5">
                  <div className="bg-gold/60 h-2.5 rounded-full" style={{ width: '61%' }}></div>
                </div>
                <p className="text-xs text-gold font-medium mt-1 flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  {t("teacherAnalytics.needsReviewNextClass")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </TeacherLayout>
  );
}
