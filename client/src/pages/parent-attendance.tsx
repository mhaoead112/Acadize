/**
 * parent-attendance.tsx
 * Parent Attendance — child overview, attendance gauge, course breakdown, activity feed, export.
 * Route: /parent/attendance
 * Uses: GET /api/parent/children, GET /api/parent/children/:childId/attendance
 *       (Optional: GET /api/parent/children/:childId/courses for teacher names)
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { 
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Download,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Child {
  id: string;
  name: string;
  fullName?: string;
  profilePicture?: string;
  grade?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "tardy" | "excused";
  courseName: string;
  notes?: string;
}

interface AttendanceResponse {
  totalDays: number;
  presentDays: number;
  absentDays: number;
  tardyDays: number;
  excusedDays: number;
  attendanceRate: number;
  records: AttendanceRecord[];
}

type StatusLabel = "Excellent" | "Good" | "Needs Attention" | "Critical";

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function getStatusLabel(pct: number): StatusLabel {
  if (pct >= 90) return "Excellent";
  if (pct >= 80) return "Good";
  if (pct >= 60) return "Needs Attention";
  return "Critical";
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatFeedDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dDate.getTime() === today.getTime()) return "TODAY, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  if (dDate.getTime() === yesterday.getTime()) return "YESTERDAY, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

const MONTHLY_GOAL = 95;

export default function ParentAttendance() {
  const { t } = useTranslation('parent');
  const searchString = useSearch();
  const searchParams = new URLSearchParams(typeof searchString === "string" ? searchString : "");
  const childIdParam = searchParams.get("child") || "";
  const { token, getAuthHeaders } = useAuth();
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>(childIdParam);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string; teacherName?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [feedTab, setFeedTab] = useState<"all" | "absences" | "check-ins" | "upcoming">("all");

  useEffect(() => {
    const fetchChildren = async () => {
      if (!token) return;
      try {
        const res = await fetch(apiEndpoint("/api/parent/children"), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          credentials: "include",
        });
        if (!res.ok) return;
        const data = await res.json();
        const list: Child[] = (data.children || []).map((c: any) => ({
          id: String(c.id),
          name: c.fullName || c.name || "Unknown",
          fullName: c.fullName || c.name,
          profilePicture: c.profilePicture,
          grade: c.grade,
        }));
        setChildren(list);
        if (!selectedChildId && list.length > 0) setSelectedChildId(list[0].id);
      } catch {
        setChildren([]);
      }
    };
    fetchChildren();
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (!selectedChildId || !token) {
      setLoading(false);
      setAttendance(null);
      return;
    }
    setLoading(true);
    const fetchAttendance = async () => {
      try {
        const [attRes, coursesRes] = await Promise.all([
          fetch(apiEndpoint(`/api/parent/children/${selectedChildId}/attendance`), {
            headers: { Accept: "application/json", ...getAuthHeaders() },
            credentials: "include",
          }),
          fetch(apiEndpoint(`/api/parent/children/${selectedChildId}/courses`), {
            headers: { Accept: "application/json", ...getAuthHeaders() },
            credentials: "include",
          }),
        ]);
        if (attRes.ok) {
          const data = await attRes.json();
          const records = (data.records || []).map((r: any) => ({
            id: r.id,
            date: r.date,
            status: r.status === "tardy" ? "late" : r.status,
            courseName: r.courseName || "Unknown",
            notes: r.notes,
          }));
          setAttendance({
            totalDays: data.totalDays ?? 0,
            presentDays: data.presentDays ?? 0,
            absentDays: data.absentDays ?? 0,
            tardyDays: data.tardyDays ?? 0,
            excusedDays: data.excusedDays ?? 0,
            attendanceRate: data.attendanceRate ?? 0,
            records,
          });
        } else {
          setAttendance(null);
        }
        if (coursesRes.ok) {
          const coursesData = await coursesRes.json();
          const courseList = (coursesData.courses || []).map((c: any) => ({
            id: c.id,
            title: c.title || c.courseName || c.name,
            teacherName: c.teacherName || c.teacher?.name || c.teacher?.fullName,
          }));
          setCourses(courseList);
      } else {
          setCourses([]);
        }
      } catch {
        setAttendance(null);
        setCourses([]);
    } finally {
      setLoading(false);
    }
  };
    fetchAttendance();
  }, [selectedChildId, token, getAuthHeaders]);

  const selectedChild = useMemo(() => children.find((c) => c.id === selectedChildId), [children, selectedChildId]);

  // Derived: overall % (treat late as attended for gauge), status, trend (placeholder)
  const overallPct = attendance
    ? Math.round(
        attendance.totalDays > 0
          ? ((attendance.presentDays + attendance.tardyDays) / attendance.totalDays) * 100
          : 0
      )
    : 0;
  const statusLabel = getStatusLabel(overallPct);
  const trendPct = 0; // would need previous period from API

  // Course breakdown from records
  const courseBreakdown = useMemo(() => {
    if (!attendance?.records?.length) return [];
    const byCourse: Record<
      string,
      { courseName: string; attended: number; total: number; lastAbsence: string | null }
    > = {};
    attendance.records.forEach((r) => {
      const name = r.courseName || "Other";
      if (!byCourse[name]) {
        byCourse[name] = { courseName: name, attended: 0, total: 0, lastAbsence: null };
      }
      byCourse[name].total += 1;
      if (r.status === "present" || r.status === "late" || r.status === "tardy") byCourse[name].attended += 1;
      if (r.status === "absent" && !byCourse[name].lastAbsence) byCourse[name].lastAbsence = r.date;
    });
    return Object.values(byCourse).map((c) => ({
      ...c,
      pct: c.total > 0 ? Math.round((c.attended / c.total) * 100) : 0,
    }));
  }, [attendance?.records]);

  // Activity feed: group by date, map to feed items
  const feedItems = useMemo(() => {
    if (!attendance?.records?.length) return [];
    const sorted = [...attendance.records].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    return sorted.slice(0, 30).map((r) => ({
      ...r,
      type: r.status === "absent" ? "absent" : r.status === "present" || r.status === "late" ? "check-in" : "check-in",
    }));
  }, [attendance?.records]);

  const filteredFeed = useMemo(() => {
    if (feedTab === "all") return feedItems;
    if (feedTab === "absences") return feedItems.filter((i) => i.status === "absent");
    if (feedTab === "check-ins") return feedItems.filter((i) => i.status === "present" || i.status === "late");
    return feedItems;
  }, [feedItems, feedTab]);

  const handleExport = async () => {
    if (!attendance?.records?.length || !selectedChild?.name) return;
    setExporting(true);
    try {
      const headers = ["Date", "Course", "Status", "Notes"];
      const rows = attendance.records.map((r) => [
        r.date,
        r.courseName,
        r.status,
        r.notes || "",
      ]);
      const csv = [headers.join(","), ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-${selectedChild.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !attendance) {
    return (
      <ParentLayout>
        <div className="flex-1 overflow-y-auto p-4 md:p-8 flex items-center justify-center min-h-[60vh] bg-slate-50 dark:bg-[#0a192f]">
          <Loader2 className="h-10 w-10 animate-spin text-[#FFD700]" />
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50 dark:bg-[#0a192f]">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
          {/* Child selector */}
          {children.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {children.map((child) => {
                const isSelected = selectedChildId === child.id;
                return (
                  <button
                    key={child.id}
                    type="button"
                    onClick={() => setSelectedChildId(child.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all min-w-[80px] ${
                      isSelected
                        ? "border-[#FFD700] bg-[#FFD700]/10 dark:bg-[#FFD700]/10"
                        : "border-transparent bg-white dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-700/50"
                    }`}
                  >
                    <Avatar className="h-12 w-12 border-2 border-slate-200 dark:border-white/10">
                      <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm">
                        {getInitials(child.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      className={`text-sm font-medium truncate max-w-[80px] ${
                        isSelected ? "text-[#FFD700]" : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {child.name.split(" ")[0]}
                    </span>
                  </button>
                );
              })}
          </div>
          )}

          {!selectedChildId ? (
            <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
              <CardContent className="py-12 text-center text-slate-500 dark:text-slate-400">
                {t('selectChildToViewAttendance')}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Two-column: Left overview + course breakdown, Right activity feed */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
                {/* Left: Attendance overview + course breakdown */}
                <div className="space-y-6">
                  {/* Attendance overview card */}
                  <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10 overflow-hidden">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-900 dark:text-white">
                        {t('attendanceOverview')}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col sm:flex-row sm:items-center gap-6">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                          <span className="inline-block px-3 py-1.5 rounded-md text-sm font-bold bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30">
                            STATUS: {statusLabel}
                          </span>
                          <span className="inline-flex items-center gap-1 text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                            <TrendingUp className="h-4 w-4" />
                            TREND: {trendPct >= 0 ? "⬆" : "⬇"} {trendPct >= 0 ? "+" : ""}{trendPct}%
                          </span>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                          Monthly Goal: {MONTHLY_GOAL}%
                        </p>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          {selectedChild?.name} is maintaining {statusLabel.toLowerCase()} attendance this semester.
                          Consistent attendance correlates with higher academic performance.
                        </p>
                      </div>
                      <div className="relative w-32 h-32 shrink-0">
                        <svg className="w-32 h-32 -rotate-90" viewBox="0 0 36 36">
                          <path
                            className="text-slate-200 dark:text-white/10"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                          />
                          <path
                            className="text-emerald-500"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeDasharray={`${overallPct}, 100`}
                            fill="none"
                            strokeLinecap="round"
                            d="M18 2.5 a 15.5 15.5 0 0 1 0 31 a 15.5 15.5 0 0 1 0 -31"
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-2xl font-bold text-slate-900 dark:text-white">
                          {overallPct}%
                        </span>
                      </div>
              </CardContent>
            </Card>

                  {/* Current courses breakdown */}
                  <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
                    <CardHeader>
                      <CardTitle className="text-xl text-slate-900 dark:text-white">
                        Current Courses
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {courseBreakdown.map((c) => {
                          const teacher = courses.find(
                            (co) => co.title === c.courseName || co.title?.toLowerCase() === c.courseName?.toLowerCase()
                          )?.teacherName;
                          const barColor =
                            c.pct >= 90 ? "bg-emerald-500" : c.pct >= 75 ? "bg-[#FFD700]" : "bg-red-500";
                          return (
                            <div
                              key={c.courseName}
                              className="p-4 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5"
                            >
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h4 className="font-bold text-slate-900 dark:text-white">
                                    {c.courseName}
                                  </h4>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {teacher || "—"}
                                  </p>
                                </div>
                                <span className="text-lg font-bold text-slate-900 dark:text-white">
                                  {c.attended}/{c.total} ({c.pct}%)
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                                ATTENDANCE PROGRESS
                              </p>
                              <div className="w-full h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden mb-3">
                                <div
                                  className={`h-full rounded-full ${barColor} transition-all`}
                                  style={{ width: `${c.pct}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                                LAST ABSENCE:{" "}
                                {c.lastAbsence ? formatDate(c.lastAbsence).toUpperCase() : "N/A"}
                              </p>
                              <Link href="/parent/messages">
                                <Button variant="outline" size="sm" className="w-full gap-2">
                                  <MessageCircle className="h-4 w-4" />
                                  Contact
                                </Button>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                      {courseBreakdown.length === 0 && (
                        <p className="text-slate-500 dark:text-slate-400 text-center py-6">
                          No course attendance data yet.
                        </p>
                      )}
              </CardContent>
            </Card>

                  {/* Export + View Full History */}
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleExport}
                      disabled={!attendance?.records?.length || exporting}
                      className="bg-[#FFD700] text-slate-900 hover:bg-[#FFD700]/90 gap-2"
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Export Report (Excel)
                  </Button>
                    <Button variant="outline" className="gap-2" asChild>
                      <Link href={`/parent/attendance/history?child=${selectedChildId}`}>
                        View Full History
                    <ChevronRight className="h-4 w-4" />
                      </Link>
                  </Button>
                  </div>
              </div>

                {/* Right: Activity feed */}
                <Card className="bg-white dark:bg-card border-slate-200 dark:border-white/10 h-fit lg:max-h-[calc(100vh-12rem)] flex flex-col">
                  <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                    <div>
                      <CardTitle className="text-lg text-slate-900 dark:text-white">
                        Attendance Activity Feed
                      </CardTitle>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedChild?.name} • Attendance Rate: {overallPct}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleExport}
                        disabled={!attendance?.records?.length || exporting}
                        className="bg-[#FFD700] text-slate-900 hover:bg-[#FFD700]/90 gap-1"
                      >
                        <Download className="h-4 w-4" />
                        Export Log
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/parent/attendance/history?child=${selectedChildId}`}>History</Link>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1 min-h-0 pt-0">
                    <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      {(["all", "absences", "check-ins"] as const).map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setFeedTab(tab)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                            feedTab === tab
                              ? "bg-[#FFD700]/20 text-[#FFD700] border border-[#FFD700]/30"
                              : "bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-400 border border-transparent"
                          }`}
                        >
                          {tab === "all" ? "All Activity" : tab === "absences" ? "Absences" : "Check-ins"}
                      </button>
                      ))}
              </div>
                    <div className="flex-1 overflow-y-auto space-y-4">
                      {filteredFeed.length === 0 ? (
                        <p className="text-slate-500 dark:text-slate-400 text-sm text-center py-8">
                          No activity to show.
                        </p>
                      ) : (
                        (() => {
                          const byDate: Record<string, typeof filteredFeed> = {};
                          filteredFeed.forEach((item) => {
                            const key = item.date;
                            if (!byDate[key]) byDate[key] = [];
                            byDate[key].push(item);
                          });
                          return Object.entries(byDate).map(([date, items]) => (
                            <div key={date}>
                              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                {formatFeedDate(date)}
                              </p>
                              <ul className="space-y-2">
                                {items.map((r) => (
                                  <li
                                    key={r.id}
                                    className={`p-3 rounded-xl border ${
                                      r.status === "absent"
                                        ? "bg-amber-500/10 border-amber-500/20"
                                        : r.status === "present" || r.status === "late"
                                          ? "bg-emerald-500/10 border-emerald-500/20"
                                          : "bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10"
                                    }`}
                                  >
                                    <div className="flex gap-3">
                                      {r.status === "absent" ? (
                                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                      ) : (
                                        <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        {r.status === "absent" ? (
                                          <p className="font-medium text-slate-900 dark:text-white">
                                            Absent from {r.courseName} – {formatDate(r.date)}
                                          </p>
                                        ) : (
                                          <p className="font-medium text-slate-900 dark:text-white">
                                            Checked in – {r.courseName}
                                          </p>
                                        )}
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                          {r.status === "absent"
                                            ? "No excused absence note on file. REASON: Not Available"
                                            : formatDate(r.date)}
                                        </p>
                                        <div className="flex gap-2 mt-2">
                                          {r.status === "present" || r.status === "late" ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                              <CheckCircle2 className="h-3 w-3" />
                                              PRESENT
                                            </span>
                                          ) : (
                                            <>
                                              <Button variant="outline" size="sm" className="h-7 text-xs">
                                                Send Note
                                              </Button>
                                              <Button variant="ghost" size="sm" className="h-7 text-xs">
                                                Details
                                              </Button>
                                            </>
                        )}
                      </div>
                    </div>
                  </div>
                                  </li>
                ))}
                              </ul>
                            </div>
                          ));
                        })()
                      )}
              </div>
            </CardContent>
          </Card>
              </div>
            </>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
