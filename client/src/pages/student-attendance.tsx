/**
 * student-attendance.tsx
 * Student Attendance Dashboard — overview, course breakdown, recent activity, full history, calendar view.
 * Route: /student/attendance
 * API: GET /api/attendance/my (records + courseSummaries)
 */

import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Calendar as CalendarIcon,
  List,
  Flame,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  Download,
  Info,
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Menu,
} from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────────────────────────────────────
// Types (match API response)
// ─────────────────────────────────────────────────────────────────────────────

interface AttendanceRecord {
  id: string;
  sessionId: string;
  sessionTitle: string;
  courseId: string;
  courseTitle: string;
  sessionStart: string;
  sessionEnd: string | null;
  joinTime: string | null;
  leaveTime: string | null;
  durationMinutes: number | null;
  attendancePercent: number | null;
  status: "present" | "late" | "absent" | "excused";
  checkInMethod: string | null;
  gpsValid: boolean | null;
  createdAt: string;
}

interface CourseSummary {
  courseId: string;
  courseTitle: string;
  total: number;
  present: number;
  late: number;
  absent: number;
}

type ViewMode = "list" | "calendar";
type AcademicStatus = "Good Standing" | "At Risk" | "Critical";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(d: Date | string): string {
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatTimeRange(start: string, end: string | null): string {
  const s = formatTime(start);
  if (!end) return s;
  return `${s} - ${formatTime(end)}`;
}

function monthYearLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (dDate.getTime() === today.getTime()) return `Today ${formatTime(d)}`;
  if (dDate.getTime() === yesterday.getTime()) return `Yesterday ${formatTime(d)}`;
  return `${formatDate(d)} ${formatTime(d)}`;
}

function getStatusBadgeClass(status: AttendanceRecord["status"]): string {
  switch (status) {
    case "present":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
    case "late":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    case "absent":
      return "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/30";
    case "excused":
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
    default:
      return "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30";
  }
}

function getStatusLabel(status: AttendanceRecord["status"]): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function computeCurrentStreak(records: AttendanceRecord[]): number {
  const sorted = [...records].sort(
    (a, b) => new Date(b.sessionStart).getTime() - new Date(a.sessionStart).getTime()
  );
  let streak = 0;
  for (const r of sorted) {
    if (r.status === "present" || r.status === "late") streak++;
    else break;
  }
  return streak;
}

function getAcademicStatus(overallPct: number): AcademicStatus {
  if (overallPct >= 80) return "Good Standing";
  if (overallPct >= 60) return "At Risk";
  return "Critical";
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function StudentAttendancePage() {
  const { t } = useTranslation('dashboard');
  const { token, getAuthHeaders } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [courseSummaries, setCourseSummaries] = useState<CourseSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [calendarMonth, setCalendarMonth] = useState<Date>(() => new Date());
  const [tablePage, setTablePage] = useState(0);
  const [tableFilter, setTableFilter] = useState<string>("all"); // all | present | late | absent
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  useEffect(() => {
    const fetchAttendance = async () => {
      if (!token) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(apiEndpoint("/api/attendance/my"), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          credentials: "include",
        });
        if (!res.ok) throw new Error("Failed to load attendance");
        const data = await res.json();
        setRecords(data.records ?? []);
        setCourseSummaries(data.courseSummaries ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, [token, getAuthHeaders]);

  // Derived: overview
  const overview = useMemo(() => {
    const totalSessions = courseSummaries.reduce((s, c) => s + c.total, 0);
    const attended = courseSummaries.reduce((s, c) => s + c.present + c.late, 0);
    const overallPct = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;
    const currentStreak = computeCurrentStreak(records);
    const status = getAcademicStatus(overallPct);
    return {
      overallPct,
      sessionsAttended: attended,
      totalSessions,
      currentStreak,
      status,
    };
  }, [courseSummaries, records]);

  // Recent activity (last 10)
  const recentActivity = useMemo(() => records.slice(0, 10), [records]);

  // Table: filtered and paginated
  const filteredRecords = useMemo(() => {
    if (tableFilter === "all") return records;
    return records.filter((r) => r.status === tableFilter);
  }, [records, tableFilter]);

  const paginatedRecords = useMemo(() => {
    const start = tablePage * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, tablePage]);

  const totalPages = Math.ceil(filteredRecords.length / PAGE_SIZE);

  // Calendar: per-day list of dot statuses (green=present/late, red=absent, gray=no session)
  const dotsByDay = useMemo(() => {
    const map: Record<string, ("present" | "absent" | "no_class")[]> = {};
    records.forEach((r) => {
      const d = new Date(r.sessionStart);
      const key = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      if (!map[key]) map[key] = [];
      if (r.status === "present" || r.status === "late") map[key].push("present");
      else if (r.status === "absent") map[key].push("absent");
      else map[key].push("no_class");
    });
    return map;
  }, [records]);

  // Month summary for right panel (current calendar month)
  const monthSummary = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const start = new Date(y, m, 1).getTime();
    const end = new Date(y, m + 1, 0, 23, 59, 59).getTime();
    let present = 0;
    let absent = 0;
    records.forEach((r) => {
      const t = new Date(r.sessionStart).getTime();
      if (t >= start && t <= end) {
        if (r.status === "present" || r.status === "late") present++;
        else if (r.status === "absent") absent++;
      }
    });
    return { present, absent };
  }, [records, calendarMonth]);

  // Calendar grid: weeks (Mon–Sun) for the displayed month
  const calendarWeeks = useMemo(() => {
    const y = calendarMonth.getFullYear();
    const m = calendarMonth.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    const startDay = first.getDay();
    const startMonday = startDay === 0 ? -6 : 1 - startDay;
    const weeks: { date: Date; isCurrentMonth: boolean }[][] = [];
    let d = new Date(y, m, startMonday);
    while (weeks.length < 6) {
      const week: { date: Date; isCurrentMonth: boolean }[] = [];
      for (let i = 0; i < 7; i++) {
        week.push({
          date: new Date(d),
          isCurrentMonth: d.getMonth() === m,
        });
        d.setDate(d.getDate() + 1);
      }
      weeks.push(week);
      if (d > last && d.getDay() === 1) break;
    }
    return weeks;
  }, [calendarMonth]);

  const sessionsOnSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    return records.filter((r) => {
      const t = new Date(r.sessionStart).getTime();
      return t >= dayStart.getTime() && t < dayEnd.getTime();
    });
  }, [records, selectedDate]);

  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-background flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-10 w-10 animate-spin text-[#FFD700]" />
        </div>
      </StudentLayout>
    );
  }

  if (error) {
    return (
      <StudentLayout>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-background">
          <div className="max-w-[1200px] mx-auto">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-8 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      </StudentLayout>
    );
  }

  const academicYearLabel = `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`;
  const semesterLabel = new Date().getMonth() >= 7 ? "Fall" : "Spring";

  return (
    <StudentLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50 dark:bg-background">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">{t('myAttendance')}</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">
                Academic Year {academicYearLabel} • {semesterLabel} Semester
              </p>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 dark:border-white/10 p-1 bg-white dark:bg-card">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "list"
                    ? "bg-[#FFD700] text-slate-900"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <List className="h-4 w-4" />
                List View
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === "calendar"
                    ? "bg-[#FFD700] text-slate-900"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <CalendarIcon className="h-4 w-4" />
                Calendar View
              </button>
            </div>
          </div>

          {/* Overview cards (4) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-l-4 border-l-[#FFD700] bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardContent className="p-6 flex flex-row items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Overall Attendance</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white mt-1">{overview.overallPct}%</p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Sessions tracked</p>
                </div>
                <div className="relative w-16 h-16">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-200 dark:text-white/10"
                      stroke="currentColor"
                      strokeWidth="3"
                      fill="none"
                      d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                    />
                    <path
                      className="text-[#FFD700]"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeDasharray={`${overview.overallPct}, 100`}
                      fill="none"
                      strokeLinecap="round"
                      d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-900 dark:text-white">
                    {overview.overallPct}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <CalendarIcon className="h-5 w-5" />
                  <span className="text-sm font-medium">Sessions Attended</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                  {overview.sessionsAttended}/{overview.totalSessions}
                </p>
                <div className="mt-2 w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                  <div
                    className="bg-[#FFD700] h-2 rounded-full transition-all"
                    style={{
                      width: overview.totalSessions ? `${(overview.sessionsAttended / overview.totalSessions) * 100}%` : "0%",
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                  <Flame className="h-5 w-5 text-orange-500" />
                  <span className="text-sm font-medium">Current Streak</span>
                </div>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{overview.currentStreak} Sessions</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Consecutive days with attendance</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-600 bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Academic Status</p>
                <span
                  className={`inline-block mt-2 px-3 py-1.5 rounded-md text-sm font-bold ${
                    overview.status === "Good Standing"
                      ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30"
                      : overview.status === "At Risk"
                        ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                        : "bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30"
                  }`}
                >
                  {overview.status.toUpperCase()}
                </span>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Verified by system
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Course breakdown */}
          <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <FolderOpen className="h-5 w-5 text-[#FFD700]" />
                Course Breakdown
              </CardTitle>
              <Link href="/student/courses">
                <Button variant="link" className="text-[#FFD700] font-semibold p-0 h-auto">
                  View All Courses
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {courseSummaries.map((c) => {
                  const attended = c.present + c.late;
                  const pct = c.total > 0 ? Math.round((attended / c.total) * 100) : 0;
                  const isFull = pct === 100;
                  return (
                    <div
                      key={c.courseId}
                      className={`p-4 rounded-xl border ${
                        isFull
                          ? "border-[#FFD700]/50 bg-[#FFD700]/5 dark:bg-[#FFD700]/5"
                          : "border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white">{c.courseTitle}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400">—</p>
                        </div>
                        <span className="text-xl font-bold text-slate-900 dark:text-white">{pct}%</span>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                        {attended}/{c.total} SESSIONS
                      </p>
                      <div className="mt-2">
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">PROGRESS</p>
                        <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-[#FFD700] transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                      <Link href={`/student/courses/${c.courseId}`}>
                        <Button variant="ghost" size="sm" className="mt-3 text-[#FFD700] hover:text-[#FFD700]/80 p-0 h-auto font-semibold">
                          View Details
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </div>
              {courseSummaries.length === 0 && (
                <p className="text-slate-500 dark:text-slate-400 text-center py-8">No course attendance data yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent activity (timeline) */}
          <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-xl">
                <Clock className="h-5 w-5 text-[#FFD700]" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10" />
                <ul className="space-y-4">
                  {recentActivity.map((r) => (
                    <li key={r.id} className="relative flex gap-4 pl-10">
                      <span
                        className={`absolute left-0 flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                          r.status === "present"
                            ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                            : r.status === "late"
                              ? "bg-amber-500/20 border-amber-500/50 text-amber-600 dark:text-amber-400"
                              : "bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {r.status === "present" && <CheckCircle2 className="h-4 w-4" />}
                        {r.status === "late" && <Clock className="h-4 w-4" />}
                        {r.status === "absent" && <XCircle className="h-4 w-4" />}
                        {r.status === "excused" && <Info className="h-4 w-4" />}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 dark:text-white">{r.courseTitle}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{r.sessionTitle}</p>
                        <p
                          className={`text-xs mt-1 ${
                            r.status === "absent" ? "text-red-500 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"
                          }`}
                        >
                          {r.status === "absent" ? formatDate(r.sessionStart) + " ABSENT" : formatRelative(r.joinTime || r.sessionStart)}
                        </p>
                      </div>
                      <span className={`shrink-0 text-xs font-bold px-2 py-1 rounded border ${getStatusBadgeClass(r.status)}`}>
                        {getStatusLabel(r.status)}
                      </span>
                    </li>
                  ))}
                </ul>
                {recentActivity.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No recent activity.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* List view: Full attendance history table */}
          {viewMode === "list" && (
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl">Full Attendance History</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={tableFilter}
                      onChange={(e) => {
                        setTableFilter(e.target.value);
                        setTablePage(0);
                      }}
                      className="pl-9 pr-4 py-2 bg-white dark:bg-card border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm"
                    >
                      <option value="all">All</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                    </select>
                  </div>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-white/10 text-left text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        <th className="pb-3 pr-4">Date</th>
                        <th className="pb-3 pr-4">Course</th>
                        <th className="pb-3 pr-4">Instructor</th>
                        <th className="pb-3 pr-4">Time</th>
                        <th className="pb-3 pr-4">Status</th>
                        <th className="pb-3 w-10">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedRecords.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5">
                          <td className="py-3 pr-4 text-slate-900 dark:text-white">{formatDate(r.sessionStart)}</td>
                          <td className="py-3 pr-4 text-slate-900 dark:text-white">{r.courseTitle}</td>
                          <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">—</td>
                          <td className="py-3 pr-4 text-slate-500 dark:text-slate-400">
                            {r.joinTime ? formatTime(r.joinTime) : "—"}
                          </td>
                          <td className="py-3 pr-4">
                            <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${getStatusBadgeClass(r.status)}`}>
                              {getStatusLabel(r.status)}
                            </span>
                          </td>
                          <td className="py-3">
                            <button type="button" className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1">
                              <Info className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {filteredRecords.length === 0 && (
                  <p className="text-slate-500 dark:text-slate-400 text-center py-8">No records match the filter.</p>
                )}
                {filteredRecords.length > 0 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200 dark:border-white/10">
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Showing {tablePage * PAGE_SIZE + 1}-{Math.min((tablePage + 1) * PAGE_SIZE, filteredRecords.length)} of {filteredRecords.length} records
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTablePage((p) => Math.max(0, p - 1))}
                        disabled={tablePage === 0}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setTablePage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={tablePage >= totalPages - 1}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Calendar view — monthly overview with dots and session history panel */}
          {viewMode === "calendar" && (
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10 overflow-hidden">
              <CardContent className="p-0">
                {/* Header: Month title + subtitle + nav + Back to List View */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
                      {monthYearLabel(calendarMonth)}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                      Monthly attendance overview and session history
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
                      }
                      className="p-2 rounded-lg text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                      aria-label="Previous month"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#FFD700] hover:bg-[#FFD700]/10 hover:text-[#FFD700]"
                      onClick={() => {
                        const today = new Date();
                        setCalendarMonth(today);
                        setSelectedDate(today);
                      }}
                    >
                      Today
                    </Button>
                    <button
                      type="button"
                      onClick={() =>
                        setCalendarMonth((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))
                      }
                      className="p-2 rounded-lg text-[#FFD700] hover:bg-[#FFD700]/10 transition-colors"
                      aria-label="Next month"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                    <Button
                      onClick={() => setViewMode("list")}
                      className="bg-[#FFD700] text-slate-900 hover:bg-[#FFD700]/90 gap-2 ml-2"
                    >
                      <Menu className="h-4 w-4" />
                      Back to List View
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col lg:flex-row">
                  {/* Left: Calendar grid (~2/3) */}
                  <div className="flex-1 p-6 lg:min-w-0 lg:max-w-[66%]">
                    <div className="grid grid-cols-7 gap-1">
                      {["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].map((day) => (
                        <div
                          key={day}
                          className="py-2 text-center text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400"
                        >
                          {day}
                        </div>
                      ))}
                      {calendarWeeks.flat().map(({ date, isCurrentMonth }) => {
                        const key =
                          date.getFullYear() +
                          "-" +
                          (date.getMonth() + 1) +
                          "-" +
                          date.getDate();
                        const dots = dotsByDay[key] || [];
                        const isSelected =
                          selectedDate &&
                          selectedDate.getFullYear() === date.getFullYear() &&
                          selectedDate.getMonth() === date.getMonth() &&
                          selectedDate.getDate() === date.getDate();
                        const isToday =
                          new Date().toDateString() === date.toDateString();
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setSelectedDate(new Date(date))}
                            className={`min-h-[72px] sm:min-h-[80px] flex flex-col items-start justify-start p-2 rounded-lg border-2 transition-colors text-left ${
                              isSelected
                                ? "border-[#FFD700] bg-[#FFD700]/10 dark:bg-[#FFD700]/10"
                                : "border-transparent bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-200 dark:hover:bg-slate-700/50"
                            } ${!isCurrentMonth ? "opacity-50" : ""}`}
                          >
                            <span
                              className={`text-sm font-medium ${
                                isCurrentMonth
                                  ? "text-slate-900 dark:text-white"
                                  : "text-slate-500 dark:text-slate-400"
                              } ${isToday ? "ring-1 ring-[#FFD700] rounded px-1" : ""}`}
                            >
                              {date.getDate()}
                            </span>
                            <div className="mt-auto flex flex-wrap gap-0.5 gap-y-1 justify-start w-full">
                              {dots.slice(0, 5).map((status, i) => (
                                <span
                                  key={i}
                                  className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                                    status === "present"
                                      ? "bg-emerald-500"
                                      : status === "absent"
                                        ? "bg-red-500"
                                        : "bg-slate-400 dark:bg-slate-500"
                                  }`}
                                />
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right: Summary cards + selected day sessions (~1/3) */}
                  <div className="w-full lg:w-[34%] border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10 p-6 bg-slate-50/30 dark:bg-white/[0.02] flex flex-col">
                    {/* PRESENT / ABSENT summary cards */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className="rounded-xl bg-emerald-600 dark:bg-emerald-700/90 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                          Present
                        </p>
                        <p className="text-2xl font-bold mt-1">{monthSummary.present}</p>
                      </div>
                      <div className="rounded-xl bg-red-600 dark:bg-red-700/90 p-4 text-white">
                        <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                          Absent
                        </p>
                        <p className="text-2xl font-bold mt-1">{monthSummary.absent}</p>
                      </div>
                    </div>

                    {/* Selected day details */}
                    {selectedDate ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <p className="text-base font-semibold text-slate-900 dark:text-white">
                            {formatDate(selectedDate)}
                          </p>
                          <span className="text-slate-500 dark:text-slate-400 text-sm">
                            {sessionsOnSelectedDate.length} Session
                            {sessionsOnSelectedDate.length !== 1 ? "s" : ""} Scheduled
                          </span>
                          <Info className="h-4 w-4 text-slate-400 shrink-0" />
                        </div>
                        <ul className="space-y-4 flex-1 min-h-0 overflow-y-auto">
                          {[...sessionsOnSelectedDate]
                            .sort(
                              (a, b) =>
                                new Date(a.sessionStart).getTime() -
                                new Date(b.sessionStart).getTime()
                            )
                            .map((r) => (
                              <li key={r.id} className="flex gap-3">
                                <span
                                  className={`shrink-0 mt-1 w-2 h-2 rounded-full ${
                                    r.status === "present" || r.status === "late"
                                      ? "bg-emerald-500"
                                      : r.status === "absent"
                                        ? "bg-red-500"
                                        : "bg-slate-400"
                                  }`}
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-slate-500 dark:text-slate-400">
                                    {formatTimeRange(
                                      r.sessionStart,
                                      r.sessionEnd
                                    )}
                                  </p>
                                  <p className="font-semibold text-slate-900 dark:text-white mt-0.5">
                                    {r.courseTitle}
                                  </p>
                                  <span
                                    className={`inline-flex items-center gap-1 mt-1 text-xs font-bold px-2 py-0.5 rounded ${
                                      r.status === "present" || r.status === "late"
                                        ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {(r.status === "present" || r.status === "late") && (
                                      <CheckCircle2 className="h-3 w-3" />
                                    )}
                                    {r.status === "absent" && (
                                      <XCircle className="h-3 w-3" />
                                    )}
                                    {r.status === "present" || r.status === "late"
                                      ? "PRESENT"
                                      : getStatusLabel(r.status)}
                                  </span>
                                </div>
                              </li>
                            ))}
                        </ul>
                        {sessionsOnSelectedDate.length === 0 && (
                          <p className="text-slate-500 dark:text-slate-400 text-sm py-4">
                            No sessions on this day.
                          </p>
                        )}
                        <Link href="/student/courses" className="block mt-6">
                          <Button
                            className="w-full bg-[#FFD700] text-slate-900 hover:bg-[#FFD700]/90 gap-2"
                            size="lg"
                          >
                            <BookOpen className="h-4 w-4" />
                            View Course Materials
                          </Button>
                        </Link>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center py-8">
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center">
                          Select a day to see sessions
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer: Legend */}
                <div className="flex flex-wrap items-center gap-4 px-6 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 text-sm">
                  <span className="text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
                    Legend:
                  </span>
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    Present
                  </span>
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                    Absent
                  </span>
                  <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
                    No Class Scheduled
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
