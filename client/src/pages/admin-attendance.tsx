/**
 * Admin Attendance Analytics Dashboard
 * Route: /admin/attendance
 * Design: dark theme, primary #f2d00d, at-risk red, KPIs, charts (Recharts), at-risk table, export.
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  RefreshCw,
  Download,
  AlertTriangle,
  Users,
  BookOpen,
  Bell,
  Eye,
} from "lucide-react";

const PRIMARY = "#f2d00d";
const SLATE_NAVY = "#1e293b";
const AT_RISK_RED = "#ef4444";
const BACKGROUND_DARK = "#0f172a";

const DATE_RANGES = [
  { value: "7", label: "Last 7 Days" },
  { value: "14", label: "Last 14 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
];

const PAGE_SIZE = 10;

export default function AdminAttendance() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const [dateRange, setDateRange] = useState("30");
  const [courseId, setCourseId] = useState<string>("all");
  const [teacherId, setTeacherId] = useState<string>("all");
  const [grade, setGrade] = useState<string>("all");
  const [chartMode, setChartMode] = useState<"line" | "area">("line");
  const [sortBy, setSortBy] = useState<"attendance" | "missed">("attendance");
  const [atRiskPage, setAtRiskPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const dateTo = useMemo(() => new Date(), []);
  const dateFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - Number(dateRange));
    return d;
  }, [dateRange]);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set("dateFrom", dateFrom.toISOString());
    p.set("dateTo", dateTo.toISOString());
    if (courseId && courseId !== "all") p.set("courseId", courseId);
    if (teacherId && teacherId !== "all") p.set("teacherId", teacherId);
    if (grade && grade !== "all") p.set("grade", grade);
    return p.toString();
  }, [dateFrom, dateTo, courseId, teacherId, grade]);

  const { data: overview, isLoading: overviewLoading, refetch } = useQuery({
    queryKey: ["admin-attendance-overview", queryParams],
    queryFn: async () => {
      const res = await fetch(apiEndpoint(`/api/attendance/admin/overview?${queryParams}`), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch overview");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: atRiskData } = useQuery({
    queryKey: ["admin-attendance-at-risk", queryParams],
    queryFn: async () => {
      const res = await fetch(apiEndpoint(`/api/attendance/admin/at-risk?threshold=75&${queryParams}`), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch at-risk");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: coursesData } = useQuery({
    queryKey: ["admin-courses"],
    queryFn: async () => {
      const res = await fetch(apiEndpoint("/api/admin/courses"), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch courses");
      return res.json();
    },
    enabled: !!token,
  });

  const { data: teachersData } = useQuery({
    queryKey: ["admin-users-teachers"],
    queryFn: async () => {
      const res = await fetch(apiEndpoint("/api/admin/users?role=teacher"), {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch teachers");
      return res.json();
    },
    enabled: !!token,
  });

  const courses = coursesData?.courses ?? [];
  const teachers = (teachersData?.users ?? []).filter((u: any) => u.role === "teacher");
  const atRiskList: any[] = atRiskData?.atRisk ?? [];
  const atRiskSorted = useMemo(() => {
    const list = [...atRiskList];
    if (sortBy === "missed") list.sort((a, b) => b.missedSessions - a.missedSessions);
    else list.sort((a, b) => a.attendancePercent - b.attendancePercent);
    return list;
  }, [atRiskList, sortBy]);
  const atRiskPaginated = useMemo(
    () => atRiskSorted.slice((atRiskPage - 1) * PAGE_SIZE, atRiskPage * PAGE_SIZE),
    [atRiskSorted, atRiskPage]
  );
  const totalAtRiskPages = Math.max(1, Math.ceil(atRiskSorted.length / PAGE_SIZE));

  const dailyTrendData = useMemo(() => {
    const raw = overview?.dailyTrend ?? [];
    return raw.map((d: any) => ({
      date: new Date(d.date).toLocaleDateString("en-US", { weekday: "short" }),
      fullDate: d.date,
      percent: d.attendancePercent,
      attended: d.attended,
      total: d.total,
    }));
  }, [overview?.dailyTrend]);

  const byCourseData = useMemo(() => {
    const raw = overview?.byCourse ?? [];
    return raw.map((c: any) => ({
      name: c.courseTitle.length > 20 ? c.courseTitle.slice(0, 18) + "…" : c.courseTitle,
      fullName: c.courseTitle,
      percent: c.attendancePercent,
      fill: c.attendancePercent >= 75 ? PRIMARY : AT_RISK_RED,
    }));
  }, [overview?.byCourse]);

  const statusBreakdown = overview?.statusBreakdown ?? { present: 82, absent: 12, late: 6 };
  const pieData = [
    { name: "Present", value: statusBreakdown.present, color: PRIMARY },
    { name: "Absent", value: statusBreakdown.absent, color: AT_RISK_RED },
    { name: "Late", value: statusBreakdown.late, color: "#94a3b8" },
  ].filter((d) => d.value > 0);

  const heatmapGrid = useMemo(() => {
    const raw = overview?.heatmap ?? [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const map = new Map<string, number>();
    raw.forEach((r: any) => map.set(`${r.dayOfWeek}-${r.hour}`, r.intensity));
    return { dayNames, map };
  }, [overview?.heatmap]);

  const handleExport = async (atRiskOnly: boolean) => {
    setExporting(true);
    try {
      const q = `${queryParams}&format=xlsx${atRiskOnly ? "&atRiskOnly=true" : ""}`;
      const res = await fetch(apiEndpoint(`/api/attendance/admin/export?${q}`), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = atRiskOnly ? `attendance-at-risk-${dateTo.toISOString().slice(0, 10)}.xlsx` : `attendance-report-${dateTo.toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (overviewLoading && !overview) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[60vh] bg-[#0f172a]">
          <div className="w-10 h-10 border-2 border-[#f2d00d] rounded-full animate-spin border-t-transparent" />
        </div>
      </AdminLayout>
    );
  }

  const orgPct = overview?.orgAttendancePercent ?? 0;
  const totalSessions = overview?.totalSessions ?? 0;
  const atRiskCount = overview?.studentsAtRisk ?? atRiskList.length;
  const mostMissed = overview?.mostMissedCourse ?? "—";
  const targetPct = 95;

  return (
    <AdminLayout>
      <div className="min-h-screen bg-[#0f172a] text-slate-100">
        <div className="max-w-[1600px] mx-auto p-6 space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 py-4 border-b border-slate-700/50">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-slate-100">
                <Calendar className="h-4 w-4 mr-2 text-[#f2d00d]" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseId} onValueChange={setCourseId}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-slate-100">
                <BookOpen className="h-4 w-4 mr-2 text-[#f2d00d]" />
                <SelectValue placeholder="All Courses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger className="w-[160px] bg-slate-800 border-slate-700 text-slate-100">
                <Users className="h-4 w-4 mr-2 text-[#f2d00d]" />
                <SelectValue placeholder="All Faculty" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Faculty</SelectItem>
                {teachers.map((t: any) => (
                  <SelectItem key={t.id} value={t.id}>{t.fullName || t.username}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={grade} onValueChange={setGrade}>
              <SelectTrigger className="w-[140px] bg-slate-800 border-slate-700 text-slate-100">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {["9", "10", "11", "12"].map((g) => (
                  <SelectItem key={g} value={g}>Grade {g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="ml-auto bg-[#f2d00d]/10 border-[#f2d00d]/30 text-[#f2d00d] hover:bg-[#f2d00d] hover:text-slate-900"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Data
            </Button>
          </div>

          {/* KPI Cards */}
          <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <CardContent className="p-6 relative">
                <p className="text-slate-400 text-sm font-medium">{t('attendance')}</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-slate-100">{orgPct}%</span>
                  {(overview?.orgAttendanceTrend ?? 0) < 0 && (
                    <span className="text-xs font-bold text-red-400 flex items-center">
                      <TrendingDown className="h-3 w-3 mr-0.5" /> {Math.abs(overview?.orgAttendanceTrend ?? 0)}%
                    </span>
                  )}
                </div>
                <span className="absolute -right-2 -bottom-2 text-6xl font-bold text-[#f2d00d]/10">%</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <CardContent className="p-6 relative">
                <p className="text-slate-400 text-sm font-medium">Total Sessions</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-slate-100">{totalSessions.toLocaleString()}</span>
                  {(overview?.totalSessionsTrend ?? 0) > 0 && (
                    <span className="text-xs font-bold text-green-400 flex items-center">
                      <TrendingUp className="h-3 w-3 mr-0.5" /> {overview?.totalSessionsTrend}%
                    </span>
                  )}
                </div>
                <span className="absolute -right-2 -bottom-2 text-6xl font-bold text-[#f2d00d]/10">📅</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-2 border-red-500/30 overflow-hidden">
              <CardContent className="p-6 relative">
                <p className="text-slate-400 text-sm font-medium">Students At Risk</p>
                <div className="flex items-baseline gap-2 mt-2">
                  <span className="text-3xl font-bold text-red-400">{atRiskCount}</span>
                </div>
                <span className="absolute -right-2 -bottom-2 text-6xl font-bold text-red-500/10">!</span>
              </CardContent>
            </Card>
            <Card className="bg-slate-800 border-slate-700 overflow-hidden">
              <CardContent className="p-6 relative">
                <p className="text-slate-400 text-sm font-medium">Most Missed Course</p>
                <p className="text-xl font-bold text-[#f2d00d] truncate mt-2">{mostMissed}</p>
                <span className="absolute -right-2 -bottom-2 text-6xl font-bold text-[#f2d00d]/10">⚠</span>
              </CardContent>
            </Card>
          </section>

          {/* Charts + Sidebar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-9 space-y-6">
              {/* Daily trend */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg text-slate-100">Daily Attendance Trends</CardTitle>
                    <p className="text-sm text-slate-400">Tracking aggregate attendance % over time</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={chartMode === "line" ? "default" : "outline"}
                      className={chartMode === "line" ? "bg-[#f2d00d] text-slate-900" : "border-slate-600 text-slate-400"}
                      onClick={() => setChartMode("line")}
                    >
                      Line
                    </Button>
                    <Button
                      size="sm"
                      variant={chartMode === "area" ? "default" : "outline"}
                      className={chartMode === "area" ? "bg-[#f2d00d] text-slate-900" : "border-slate-600 text-slate-400"}
                      onClick={() => setChartMode("area")}
                    >
                      Area
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      {chartMode === "area" ? (
                        <AreaChart data={dailyTrendData}>
                          <defs>
                            <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor={PRIMARY} stopOpacity={0.4} />
                              <stop offset="100%" stopColor={PRIMARY} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: SLATE_NAVY, border: "1px solid #475569", borderRadius: 8 }}
                            labelStyle={{ color: "#f2d00d" }}
                            formatter={(value: number) => [`${value}%`, "Attendance"]}
                          />
                          <Area type="monotone" dataKey="percent" stroke={PRIMARY} strokeWidth={2} fill="url(#attGrad)" />
                        </AreaChart>
                      ) : (
                        <LineChart data={dailyTrendData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} />
                          <YAxis stroke="#94a3b8" fontSize={11} domain={[0, 100]} />
                          <Tooltip
                            contentStyle={{ backgroundColor: SLATE_NAVY, border: "1px solid #475569", borderRadius: 8 }}
                            formatter={(value: number) => [`${value}%`, "Attendance"]}
                          />
                          <Line type="monotone" dataKey="percent" stroke={PRIMARY} strokeWidth={2} dot={{ fill: PRIMARY, r: 3 }} />
                        </LineChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* By course */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100">Attendance by Course</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {byCourseData.slice(0, 6).map((c, i) => (
                        <div key={i} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300">{c.fullName}</span>
                            <span className={`font-bold ${c.percent >= 75 ? "text-[#f2d00d]" : "text-red-400"}`}>{c.percent}%</span>
                          </div>
                          <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, c.percent)}%`, backgroundColor: c.fill }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Pie */}
                <Card className="bg-slate-800 border-slate-700">
                  <CardHeader>
                    <CardTitle className="text-lg text-slate-100">Global Status Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                            nameKey="name"
                            label={({ name, value }) => `${name} ${value}%`}
                          >
                            {pieData.map((e, i) => (
                              <Cell key={i} fill={e.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: SLATE_NAVY, border: "1px solid #475569", borderRadius: 8 }}
                            formatter={(value: number) => [`${value}%`, ""]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center mt-2 text-xs">
                      <div><p className="text-slate-500">Present</p><p className="font-bold text-[#f2d00d]">{statusBreakdown.present}%</p></div>
                      <div><p className="text-slate-500">Absent</p><p className="font-bold text-red-400">{statusBreakdown.absent}%</p></div>
                      <div><p className="text-slate-500">Late</p><p className="font-bold text-slate-300">{statusBreakdown.late}%</p></div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Heatmap placeholder */}
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg text-slate-100">Attendance Density</CardTitle>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase">
                    <span>Low</span>
                    <div className="flex gap-0.5">
                      <div className="w-2 h-2 rounded-sm bg-slate-700" />
                      <div className="w-2 h-2 rounded-sm bg-[#f2d00d]/30" />
                      <div className="w-2 h-2 rounded-sm bg-[#f2d00d]/70" />
                      <div className="w-2 h-2 rounded-sm bg-[#f2d00d]" />
                    </div>
                    <span>High</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    <div className="flex flex-col justify-between py-1 text-[8px] text-slate-500 font-bold uppercase gap-1">
                      {heatmapGrid.dayNames.slice(1, 6).map((d) => (
                        <span key={d}>{d}</span>
                      ))}
                    </div>
                    <div className="grid grid-cols-10 gap-0.5">
                      {[1, 2, 3, 4, 5].map((dow) =>
                        [8, 9, 10, 11, 12, 13, 14, 15, 16, 17].map((h) => {
                          const intensity = heatmapGrid.map.get(`${dow}-${h}`) ?? 0;
                          return (
                            <div
                              key={`${dow}-${h}`}
                              className="aspect-square rounded-sm min-w-[12px]"
                              style={{ backgroundColor: `rgba(242, 208, 13, ${0.15 + intensity * 0.85})` }}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between mt-2 text-[10px] text-slate-500 pl-10">
                    <span>08:00</span>
                    <span>12:00</span>
                    <span>16:00</span>
                  </div>
                </CardContent>
              </Card>

              {/* At-risk table */}
              <Card className="bg-slate-800 border-slate-700 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between border-b border-slate-700">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <CardTitle className="text-lg text-slate-100">At-Risk Students (&lt;75% Attendance)</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">Sort by:</span>
                    <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                      <SelectTrigger className="w-[140px] h-8 bg-slate-700 border-slate-600 text-slate-100 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="attendance">Attendance %</SelectItem>
                        <SelectItem value="missed">Missed Sessions</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-700/50 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                          <th className="px-6 py-4">Student</th>
                          <th className="px-6 py-4">Grade</th>
                          <th className="px-6 py-4">Course</th>
                          <th className="px-6 py-4">Attendance %</th>
                          <th className="px-6 py-4 text-center">Missed Sessions</th>
                          <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700">
                        {atRiskPaginated.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-6 py-8 text-center text-slate-500">No at-risk students in this period.</td>
                          </tr>
                        ) : (
                          atRiskPaginated.map((row: any) => (
                            <tr
                              key={row.studentId}
                              className={`hover:bg-slate-700/30 ${row.attendancePercent < 75 ? "bg-red-500/5" : ""}`}
                            >
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-bold text-slate-100">{row.studentName}</p>
                                  <p className="text-[10px] text-slate-500">ID: #{row.studentId.slice(-6)}-S</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-slate-400">{row.grade ?? "—"}</td>
                              <td className="px-6 py-4 text-sm text-slate-400">{row.worstCourseTitle ?? "—"}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-bold ${row.attendancePercent < 75 ? "text-red-400" : "text-slate-100"}`}>
                                    {row.attendancePercent}%
                                  </span>
                                  <div className="flex-1 w-16 bg-slate-700 h-1 rounded-full max-w-[80px]">
                                    <div
                                      className={`h-full rounded-full ${row.attendancePercent < 75 ? "bg-red-400" : "bg-[#f2d00d]"}`}
                                      style={{ width: `${Math.min(100, row.attendancePercent)}%` }}
                                    />
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-center">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${row.attendancePercent < 75 ? "bg-red-500/20 text-red-400" : "bg-slate-700 text-slate-400"}`}>
                                  {row.missedSessions} Sessions
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex justify-end gap-2">
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-red-400 hover:bg-red-500/10" title="Send Alert">
                                    <Bell className="h-4 w-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-[#f2d00d]" title="View Profile">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                  {atRiskSorted.length > 0 && (
                    <div className="px-6 py-4 bg-slate-700/20 border-t border-slate-700 flex justify-between items-center">
                      <p className="text-xs text-slate-500 italic">
                        Showing {(atRiskPage - 1) * PAGE_SIZE + 1}–{Math.min(atRiskPage * PAGE_SIZE, atRiskSorted.length)} of {atRiskSorted.length} at-risk entries
                      </p>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-slate-600"
                          disabled={atRiskPage <= 1}
                          onClick={() => setAtRiskPage((p) => p - 1)}
                        >
                          ←
                        </Button>
                        {Array.from({ length: Math.min(5, totalAtRiskPages) }, (_, i) => i + 1).map((p) => (
                          <Button
                            key={p}
                            size="icon"
                            variant={atRiskPage === p ? "default" : "outline"}
                            className={`h-8 w-8 ${atRiskPage === p ? "bg-[#f2d00d] text-slate-900" : "border-slate-600"}`}
                            onClick={() => setAtRiskPage(p)}
                          >
                            {p}
                          </Button>
                        ))}
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 border-slate-600"
                          disabled={atRiskPage >= totalAtRiskPages}
                          onClick={() => setAtRiskPage((p) => p + 1)}
                        >
                          →
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Export + Quick insights */}
            <aside className="lg:col-span-3 space-y-4">
              <Card className="bg-slate-800 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Export Tools</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    className="w-full bg-[#f2d00d] text-slate-900 font-bold hover:opacity-90"
                    onClick={() => handleExport(false)}
                    disabled={exporting}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Full Report
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full border-[#f2d00d]/50 text-[#f2d00d] hover:bg-[#f2d00d]/10"
                    onClick={() => handleExport(true)}
                    disabled={exporting}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    At-Risk List
                  </Button>
                  <Button variant="outline" className="w-full border-slate-600 text-slate-300 hover:border-slate-500">
                    <Bell className="h-4 w-4 mr-2" />
                    Bulk Alert
                  </Button>
                </CardContent>
              </Card>
              <Card className="bg-slate-800/50 border-slate-700">
                <CardHeader>
                  <CardTitle className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase">Target Attendance</p>
                    <div className="flex justify-between items-end">
                      <span className="text-lg font-bold text-[#f2d00d]">{targetPct}%</span>
                      <span className="text-[10px] text-slate-400">Target</span>
                    </div>
                    <div className="w-full bg-slate-700 h-1.5 rounded-full mt-1 overflow-hidden">
                      <div
                        className="bg-[#f2d00d] h-full rounded-full"
                        style={{ width: `${Math.min(100, (orgPct / targetPct) * 100)}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </aside>
          </div>

          <footer className="border-t border-slate-700 py-4 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-slate-500">
            <p>Attendance Analytics Engine v2.4.0 | LMS Admin Console</p>
            <div className="flex gap-6">
              <a href="#" className="hover:text-[#f2d00d]">Documentation</a>
              <a href="#" className="hover:text-[#f2d00d]">Support Portal</a>
              <a href="#" className="hover:text-[#f2d00d]">Privacy Policy</a>
            </div>
          </footer>
        </div>
      </div>
    </AdminLayout>
  );
}
