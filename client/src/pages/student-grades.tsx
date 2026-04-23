import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";

import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Trophy, Award, BookOpen, Calendar, ChevronRight, MessageSquare, AlertCircle,
} from "lucide-react";

import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";

// ─── Types ────────────────────────────────────────────────────────────────────

interface GradeEntry {
  id: string;
  submissionId: string;
  assignmentId: string;
  assignmentTitle: string;
  assignmentDueDate: string | null;
  courseName: string;
  score: number | null;
  maxScore: number | null;
  percentage: number | null;
  feedback: string | null;
  gradedAt: string | null;
  submittedAt: string | null;
  gradedByName: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getGradeColor(pct: number) {
  if (pct >= 90) return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/20 dark:border-green-800";
  if (pct >= 80) return "text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-900/20 dark:border-blue-800";
  if (pct >= 70) return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:text-yellow-400 dark:bg-yellow-900/20 dark:border-yellow-800";
  return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/20 dark:border-red-800";
}

function getLetterGrade(pct: number) {
  if (pct >= 97) return "A+";
  if (pct >= 93) return "A";
  if (pct >= 90) return "A-";
  if (pct >= 87) return "B+";
  if (pct >= 83) return "B";
  if (pct >= 80) return "B-";
  if (pct >= 77) return "C+";
  if (pct >= 73) return "C";
  if (pct >= 70) return "C-";
  if (pct >= 60) return "D";
  return "F";
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function GradesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="p-5 border rounded-xl bg-white dark:bg-slate-800 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  );
}

// ─── Grade detail dialog ──────────────────────────────────────────────────────

function GradeDetailDialog({
  grade,
  onClose,
}: { grade: GradeEntry | null; onClose: () => void }) {
  if (!grade) return null;
  const pct = grade.percentage ?? 0;
  const color = getGradeColor(pct);

  return (
    <Dialog open={!!grade} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[540px] bg-white dark:bg-slate-800">
        <DialogHeader>
          <DialogTitle className="text-xl">{grade.assignmentTitle}</DialogTitle>
          <DialogDescription className="text-slate-500">{grade.courseName}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Score banner */}
          <div className={`flex items-center justify-between p-4 rounded-xl border ${color}`}>
            <div>
              <p className="text-sm font-medium opacity-80">Your Score</p>
              <p className="text-3xl font-black">
                {grade.score ?? "—"} / {grade.maxScore ?? "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-black">{getLetterGrade(pct)}</p>
              <p className="text-sm font-semibold">{pct}%</p>
            </div>
          </div>

          {/* Progress bar */}
          <Progress value={pct} className="h-2.5" />

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 text-xs mb-1">Graded by</p>
              <p className="font-semibold text-slate-900 dark:text-white">{grade.gradedByName || "Teacher"}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
              <p className="text-slate-500 text-xs mb-1">Graded on</p>
              <p className="font-semibold text-slate-900 dark:text-white">
                {grade.gradedAt ? new Date(grade.gradedAt).toLocaleDateString() : "—"}
              </p>
            </div>
          </div>

          {/* Teacher feedback */}
          {grade.feedback ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <span className="font-semibold text-slate-900 dark:text-white text-sm">Teacher Feedback</span>
              </div>
              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed whitespace-pre-wrap">
                {grade.feedback}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-2">
              <MessageSquare className="h-4 w-4" />
              <span>No written feedback provided for this submission.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="w-full sm:w-auto">Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function StudentGrades() {
  const { t } = useTranslation("dashboard");
  const { token } = useAuth();
  const [selectedGrade, setSelectedGrade] = useState<GradeEntry | null>(null);

  // Fetch real grades from API
  const { data, isLoading, isError } = useQuery<{ grades: GradeEntry[] }>({
    queryKey: ["studentGrades"],
    queryFn: async () => {
      const res = await fetch(apiEndpoint("/api/grades/me"), {
        headers: { Authorization: `Bearer ${token}` },
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to load grades");
      return res.json();
    },
    enabled: !!token,
    staleTime: 60_000,
  });

  const grades = data?.grades ?? [];

  // Aggregate stats
  const stats = {
    totalGraded: grades.length,
    avgPct: grades.length
      ? Math.round(grades.reduce((s, g) => s + (g.percentage ?? 0), 0) / grades.length)
      : 0,
    withFeedback: grades.filter((g) => !!g.feedback).length,
    uniqueCourses: new Set(grades.map((g) => g.courseName)).size,
  };

  return (
    <>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-20">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t("myGrades")}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
            Your graded assignments and teacher feedback
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-4xl mx-auto space-y-8">

          {/* Stats row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Average Score</p>
                    <p className="text-3xl font-black text-indigo-600">{stats.avgPct}%</p>
                  </div>
                  <Trophy className="h-10 w-10 text-indigo-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Graded</p>
                    <p className="text-3xl font-black text-green-600">{stats.totalGraded}</p>
                  </div>
                  <Award className="h-10 w-10 text-green-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Courses</p>
                    <p className="text-3xl font-black text-blue-600">{stats.uniqueCourses}</p>
                  </div>
                  <BookOpen className="h-10 w-10 text-blue-600 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-500 mb-1">With Feedback</p>
                    <p className="text-3xl font-black text-purple-600">{stats.withFeedback}</p>
                  </div>
                  <MessageSquare className="h-10 w-10 text-purple-600 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Grades list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-slate-500" />
                Grade History
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <GradesSkeleton />
              ) : isError ? (
                <div className="flex flex-col items-center py-10 text-slate-500 gap-2">
                  <AlertCircle className="h-8 w-8 text-red-400" />
                  <p className="font-medium text-red-500">Failed to load grades</p>
                  <p className="text-xs">Check your connection or try again later.</p>
                </div>
              ) : grades.length === 0 ? (
                <div className="flex flex-col items-center py-14 text-slate-400 gap-3">
                  <Trophy className="h-14 w-14 opacity-20" />
                  <p className="font-semibold text-lg">No graded assignments yet</p>
                  <p className="text-sm">Your grades will appear here once a teacher grades your submission.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {grades.map((grade) => {
                    const pct = grade.percentage ?? 0;
                    const color = getGradeColor(pct);
                    return (
                      <button
                        key={grade.id}
                        onClick={() => setSelectedGrade(grade)}
                        className="w-full text-left p-4 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all group bg-white dark:bg-slate-800"
                      >
                        <div className="flex items-start justify-between gap-4">
                          {/* Left: info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              {/* GRADED badge */}
                              <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800 text-[10px] font-black uppercase tracking-wide">
                                Graded
                              </Badge>
                              {grade.feedback && (
                                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 text-[10px] font-black uppercase tracking-wide gap-1">
                                  <MessageSquare className="h-2.5 w-2.5" />
                                  Feedback
                                </Badge>
                              )}
                            </div>
                            <p className="font-semibold text-slate-900 dark:text-white truncate">
                              {grade.assignmentTitle}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">{grade.courseName}</p>

                            {/* Feedback preview */}
                            {grade.feedback && (
                              <p className="mt-2 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-lg px-3 py-1.5 line-clamp-1 italic">
                                "{grade.feedback}"
                              </p>
                            )}

                            <p className="text-xs text-slate-400 mt-2">
                              Graded {grade.gradedAt ? new Date(grade.gradedAt).toLocaleDateString() : "—"}
                              {grade.gradedByName ? ` by ${grade.gradedByName}` : ""}
                            </p>
                          </div>

                          {/* Right: score */}
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <div className={`px-3 py-1 rounded-lg border font-black text-lg ${color}`}>
                              {getLetterGrade(pct)}
                            </div>
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                              {grade.score ?? "—"}/{grade.maxScore ?? "—"}
                            </p>
                            <p className="text-xs text-slate-500">{pct}%</p>
                            <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-500 transition-colors mt-1" />
                          </div>
                        </div>

                        {/* Score progress bar */}
                        <Progress value={pct} className="h-1.5 mt-3" />
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

        </div>
      </div>

      {/* Detail dialog */}
      <GradeDetailDialog grade={selectedGrade} onClose={() => setSelectedGrade(null)} />
    </>
  );
}
