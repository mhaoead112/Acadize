/**
 * parent-attendance-history.tsx
 * Parent View Full History — student header, attendance rate, tabs (All / Absences / Check-ins / Upcoming),
 * activity feed with check-ins, scheduled, absences, check-outs, and Load Older Activity.
 * Route: /parent/attendance/history?child=:childId
 */

import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSearch, Link } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { apiEndpoint } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import {
  Loader2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Calendar,
  LogOut,
  MessageCircle,
  Info,
} from "lucide-react";

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
  joinTime?: string;
  leaveTime?: string;
  sessionTitle?: string;
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

type ActivityType = "check-in" | "check-out" | "absent" | "scheduled" | "upcoming";
interface ActivityItem {
  id: string;
  type: ActivityType;
  date: string;
  dateLabel: string;
  title: string;
  subtitle: string;
  timeLabel: string;
  record?: AttendanceRecord;
  event?: { id: string; title: string; startTime: string; endTime?: string; location?: string; courseName?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatFeedDate(d: string): string {
  const date = new Date(d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (dDate.getTime() === today.getTime())
    return "TODAY, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  if (dDate.getTime() === yesterday.getTime())
    return "YESTERDAY, " + date.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase();
}

function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  } catch {
    return "";
  }
}

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffM = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);
  if (diffM < 1) return "Just now";
  if (diffM < 60) return `${diffM}m ago`;
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD === 1) return "24h ago";
  if (diffD < 7) return `${diffD}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
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

const INITIAL_PAGE_SIZE = 20;
const PAGE_SIZE = 20;

export default function ParentAttendanceHistory() {
  const { t } = useTranslation('parent');
  const searchString = useSearch();
  const searchParams = new URLSearchParams(typeof searchString === "string" ? searchString : "");
  const childIdParam = searchParams.get("child") || "";
  const { token, getAuthHeaders } = useAuth();

  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string>(childIdParam);
  const [attendance, setAttendance] = useState<AttendanceResponse | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [feedTab, setFeedTab] = useState<"all" | "absences" | "check-ins" | "upcoming">("all");
  const [displayCount, setDisplayCount] = useState(INITIAL_PAGE_SIZE);

  useEffect(() => {
    setSelectedChildId((prev) => childIdParam || prev);
  }, [childIdParam]);

  useEffect(() => {
    const fetchChildren = async () => {
      if (!token) return;
      try {
        const res = await fetch(apiEndpoint("/api/parent/children"), {
          headers: { Accept: "application/json", ...getAuthHeaders() },
          credentials: "include",
        });
        if (res.ok) {
          const data = await res.json();
          const list = (data.children || data).map((c: any) => ({
            id: c.id,
            name: c.name || c.fullName || [c.firstName, c.lastName].filter(Boolean).join(" ") || "Child",
            fullName: c.fullName || c.name,
            profilePicture: c.profilePicture,
            grade: c.grade || c.gradeLevel,
          }));
          setChildren(list);
          if (!selectedChildId && list.length > 0) setSelectedChildId(list[0].id);
        }
      } catch {
        setChildren([]);
      }
    };
    fetchChildren();
  }, [token, getAuthHeaders]);

  useEffect(() => {
    if (!selectedChildId || !token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + 14);
    (async () => {
      try {
        const [attRes, eventsRes] = await Promise.all([
          fetch(apiEndpoint(`/api/parent/children/${selectedChildId}/attendance`), {
            headers: { Accept: "application/json", ...getAuthHeaders() },
            credentials: "include",
          }),
          fetch(
            apiEndpoint(
              `/api/parent/children/${selectedChildId}/calendar?startDate=${now.toISOString()}&endDate=${end.toISOString()}`
            ),
            { headers: { Accept: "application/json", ...getAuthHeaders() }, credentials: "include" }
          ),
        ]);
        if (attRes.ok) {
          const data = await attRes.json();
          const records = (data.records || []).map((r: any) => ({
            id: r.id,
            date: r.date,
            status: r.status === "tardy" ? "late" : r.status,
            courseName: r.courseName || "Unknown",
            notes: r.notes,
            joinTime: r.joinTime,
            leaveTime: r.leaveTime,
            sessionTitle: r.sessionTitle,
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
        if (eventsRes.ok) {
          const eventsData = await eventsRes.json();
          setUpcomingEvents(eventsData.events || []);
        } else {
          setUpcomingEvents([]);
        }
      } catch {
        setAttendance(null);
        setUpcomingEvents([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [selectedChildId, token, getAuthHeaders]);

  const selectedChild = useMemo(
    () => children.find((c) => c.id === selectedChildId),
    [children, selectedChildId]
  );

  const overallPct = attendance
    ? Math.round(
        attendance.totalDays > 0
          ? ((attendance.presentDays + attendance.tardyDays) / attendance.totalDays) * 100
          : 0
      )
    : 0;

  const activityItems = useMemo((): ActivityItem[] => {
    const items: ActivityItem[] = [];
    (attendance?.records || []).forEach((r) => {
      const dateKey = r.date;
      const dateLabel = formatFeedDate(dateKey);
      if (r.status === "absent") {
        items.push({
          id: `absent-${r.id}`,
          type: "absent",
          date: dateKey,
          dateLabel,
          title: `Absent from ${r.courseName} — ${new Date(dateKey).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
          subtitle: `${r.courseName} • No excused absence note found on file.`,
          timeLabel: relativeTime(dateKey + "T12:00:00"),
          record: r,
        });
      } else {
        if (r.joinTime) {
          items.push({
            id: `in-${r.id}`,
            type: "check-in",
            date: dateKey,
            dateLabel,
            title: `Checked in at ${formatTime(r.joinTime)} — ${r.courseName}`,
            subtitle: `${r.sessionTitle || r.courseName} • Arrived ${r.status === "late" ? "late" : "on time"} for the session.`,
            timeLabel: relativeTime(r.joinTime),
            record: r,
          });
        }
        if (r.leaveTime) {
          items.push({
            id: `out-${r.id}`,
            type: "check-out",
            date: dateKey,
            dateLabel,
            title: `Checked out at ${formatTime(r.leaveTime)}`,
            subtitle: `${r.courseName || "Session"} • End of session.`,
            timeLabel: new Date(r.leaveTime).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            record: r,
          });
        }
        if (!r.joinTime && !r.leaveTime) {
          items.push({
            id: `in-${r.id}`,
            type: "check-in",
            date: dateKey,
            dateLabel,
            title: `Checked in — ${r.courseName}`,
            subtitle: `${r.sessionTitle || r.courseName} • ${new Date(dateKey).toLocaleDateString("en-US")}`,
            timeLabel: dateLabel,
            record: r,
          });
        }
      }
    });
    upcomingEvents.forEach((ev: any) => {
      const start = ev.startTime || ev.start;
      if (!start) return;
      const d = new Date(start);
      const dateKey = d.toISOString().slice(0, 10);
      const courseName = ev.course?.title || ev.courseName;
      items.push({
        id: `ev-${ev.id}`,
        type: "upcoming",
        date: dateKey,
        dateLabel: formatFeedDate(dateKey),
        title: ev.title ? `Scheduled: ${ev.title}` : "Scheduled event",
        subtitle: [courseName, ev.location].filter(Boolean).join(" • ") || "Attendance will be recorded upon entry.",
        timeLabel: d.getTime() > Date.now() ? `Upcoming (${formatTime(start)})` : formatTime(start),
        event: {
          id: ev.id,
          title: ev.title,
          startTime: start,
          endTime: ev.endTime || ev.end,
          location: ev.location,
          courseName,
        },
      });
    });
    items.sort((a, b) => {
      const tA = a.record?.joinTime || a.record?.leaveTime || a.event?.startTime || a.date + "T12:00:00";
      const tB = b.record?.joinTime || b.record?.leaveTime || b.event?.startTime || b.date + "T12:00:00";
      return new Date(tB).getTime() - new Date(tA).getTime();
    });
    return items;
  }, [attendance?.records, upcomingEvents]);

  const filteredItems = useMemo(() => {
    if (feedTab === "all") return activityItems;
    if (feedTab === "absences") return activityItems.filter((i) => i.type === "absent");
    if (feedTab === "check-ins") return activityItems.filter((i) => i.type === "check-in" || i.type === "check-out");
    if (feedTab === "upcoming") return activityItems.filter((i) => i.type === "upcoming" || i.type === "scheduled");
    return activityItems;
  }, [activityItems, feedTab]);

  const paginatedItems = useMemo(
    () => filteredItems.slice(0, displayCount),
    [filteredItems, displayCount]
  );
  const hasMore = filteredItems.length > displayCount;

  const byDate = useMemo(() => {
    const map: Record<string, ActivityItem[]> = {};
    paginatedItems.forEach((item) => {
      const key = item.dateLabel;
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return map;
  }, [paginatedItems]);

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
      const csv = [
        headers.join(","),
        ...rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")),
      ].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `attendance-history-${selectedChild.name.replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  if (loading && !attendance && !selectedChildId) {
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
      <div className="flex-1 overflow-y-auto no-scrollbar bg-[#0a192f] min-h-screen">
        <div className="max-w-[900px] mx-auto p-4 md:p-8">
          {/* Child selector when multiple */}
          {children.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {children.map((child) => (
                <Link key={child.id} href={`/parent/attendance/history?child=${child.id}`}>
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      selectedChildId === child.id
                        ? "bg-[#FFD700] text-slate-900"
                        : "bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    {child.name.split(" ")[0]}
                  </button>
                </Link>
              ))}
            </div>
          )}

          {!selectedChildId ? (
            <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
              Select a child to view full history.
            </div>
          ) : (
            <>
              {/* Header: Student profile + actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 border-2 border-[#FFD700]/30">
                    <AvatarFallback className="bg-[#FFD700]/20 text-[#FFD700] text-lg">
                      {selectedChild ? getInitials(selectedChild.name) : "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-xl md:text-2xl font-bold text-white">
                        {selectedChild?.name || "Student"}
                      </h1>
                      {selectedChild?.grade && (
                        <span className="inline-block px-2.5 py-0.5 rounded-md text-xs font-bold bg-[#FFD700] text-slate-900">
                          GRADE {selectedChild.grade}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-400 mt-0.5">
                      {t('attendanceRate')}: <span className="text-emerald-400 font-semibold">{overallPct}%</span>
                      {" • "}
                      Active Feed
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
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
                    Export Log
                  </Button>
                  <Button variant="outline" className="bg-white/5 border-white/20 text-white hover:bg-white/10 gap-2" asChild>
                    <Link href={`/parent/attendance?child=${selectedChildId}`}>
                      <Calendar className="h-4 w-4" />
                      Back to Attendance
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 p-1 rounded-lg bg-white/5 border border-white/10 mb-6">
                {(
                  [
                    { key: "all", label: "All Activity" },
                    { key: "absences", label: "Absences" },
                    { key: "check-ins", label: "Check-ins" },
                    { key: "upcoming", label: "Upcoming" },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setFeedTab(key)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      feedTab === key
                        ? "bg-[#FFD700] text-slate-900"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Activity feed grouped by date */}
              <div className="space-y-6">
                {Object.keys(byDate).length === 0 ? (
                  <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center text-slate-400">
                    No activity to show for this filter.
                  </div>
                ) : (
                  Object.entries(byDate).map(([dateLabel, items]) => (
                    <div key={dateLabel}>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 text-center">
                        {dateLabel}
                      </p>
                      <ul className="space-y-3">
                        {items.map((item) => (
                          <li
                            key={item.id}
                            className={`rounded-xl border p-4 ${
                              item.type === "check-in"
                                ? "bg-emerald-500/10 border-emerald-500/30"
                                : item.type === "absent"
                                  ? "bg-amber-500/10 border-amber-500/30"
                                  : item.type === "check-out"
                                    ? "bg-slate-500/10 border-slate-500/20"
                                    : "bg-white/5 border-white/10"
                            }`}
                          >
                            <div className="flex gap-3">
                              <div
                                className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                  item.type === "check-in"
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : item.type === "absent"
                                      ? "bg-amber-500/20 text-amber-400"
                                      : item.type === "check-out"
                                        ? "bg-slate-500/20 text-slate-400"
                                        : "bg-[#FFD700]/20 text-[#FFD700]"
                                }`}
                              >
                                {item.type === "check-in" && <CheckCircle2 className="h-5 w-5" />}
                                {item.type === "absent" && <AlertTriangle className="h-5 w-5" />}
                                {item.type === "check-out" && <LogOut className="h-5 w-5" />}
                                {(item.type === "scheduled" || item.type === "upcoming") && (
                                  <Clock className="h-5 w-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white">{item.title}</p>
                                <p className="text-sm text-slate-400 mt-0.5">{item.subtitle}</p>
                                <div className="flex flex-wrap items-center justify-between gap-2 mt-3">
                                  <div className="flex gap-2">
                                    {item.type === "check-in" && (
                                      <>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-emerald-500/20 text-emerald-400">
                                          <CheckCircle2 className="h-3 w-3" />
                                          PRESENT
                                        </span>
                                        <Button variant="ghost" size="sm" className="h-7 text-xs text-slate-300">
                                          Quick Action
                                        </Button>
                                      </>
                                    )}
                                    {item.type === "absent" && (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-amber-400 hover:bg-amber-500/10 gap-1"
                                        >
                                          <MessageCircle className="h-3 w-3" />
                                          Send Note
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 text-xs text-amber-400 hover:bg-amber-500/10 gap-1"
                                        >
                                          <Info className="h-3 w-3" />
                                          Details
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                  <span className="text-xs text-slate-500">{item.timeLabel}</span>
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>

              {/* Load Older Activity */}
              {hasMore && (
                <div className="mt-8 flex justify-center">
                  <Button
                    variant="outline"
                    className="w-full max-w-md bg-white/5 border-white/20 text-white hover:bg-white/10"
                    onClick={() => setDisplayCount((c) => c + PAGE_SIZE)}
                  >
                    Load Older Activity
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </ParentLayout>
  );
}
