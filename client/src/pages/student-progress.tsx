import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import StudentLayout from "@/components/StudentLayout";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, FileText, GraduationCap, AlertCircle } from "lucide-react";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface StudentAssignment {
  id: string;
  title: string;
  courseTitle?: string;
  dueDate?: string | null;
  status?: string;
}

interface StudentSubmission {
  id: string;
  assignmentTitle?: string;
  submittedAt?: string | null;
  status?: string;
}

interface StudentGrade {
  id: string;
  courseTitle?: string;
  assignmentTitle?: string;
  score?: number | null;
  maxScore?: number | null;
  letterGrade?: string | null;
}

interface MyProgressResponse {
  assignments?: StudentAssignment[];
  submissions?: StudentSubmission[];
  grades?: StudentGrade[];
}

export default function StudentProgressPage() {
  const { user, getAuthHeaders } = useAuth();
  const [data, setData] = useState<MyProgressResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(apiEndpoint("/api/student/my-progress"), {
          headers: getAuthHeaders(),
        });
        if (!res.ok) throw new Error("Failed to load progress");
        const json = await res.json();
        setData(json || {});
      } catch (err: any) {
        setError(err?.message || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchProgress();
  }, []);

  const assignments = data?.assignments || [];
  const submissions = data?.submissions || [];
  const grades = data?.grades || [];

  return (
    <StudentLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm z-20">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Progress</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-text-secondary">
            View your assignments, submissions, and grades in one place.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-slate-50 dark:bg-background-dark">
        <div className="max-w-6xl mx-auto space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-slate-500 dark:text-text-secondary">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <Card className="border-red-500/20 bg-red-500/10 dark:bg-red-500/10">
            <CardContent className="py-6 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              {error}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-3">
            {/* Assignments */}
            <Card className="md:col-span-1 bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                  <FileText className="h-4 w-4 text-primary" />
                  Upcoming Assignments
                  <Badge variant="secondary" className="ml-auto text-xs bg-primary text-black">{assignments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {assignments.length === 0 ? (
                  <p className="text-slate-500 text-xs">No assignments found.</p>
                ) : (
                  assignments.map((a) => (
                    <div key={a.id} className="rounded-md border border-slate-100 p-3">
                      <div className="font-medium text-slate-900">{a.title}</div>
                      {a.courseTitle && (
                        <div className="text-xs text-slate-500 mt-0.5">{a.courseTitle}</div>
                      )}
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        {a.dueDate && <span>Due {new Date(a.dueDate).toLocaleString()}</span>}
                        {a.status && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {a.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Submissions */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Recent Submissions
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {submissions.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {submissions.length === 0 ? (
                  <p className="text-slate-500 text-xs">No submissions yet.</p>
                ) : (
                  submissions.map((s) => (
                    <div key={s.id} className="rounded-md border border-slate-100 p-3">
                      <div className="font-medium text-slate-900">
                        {s.assignmentTitle || "Assignment"}
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                        {s.submittedAt && <span>Submitted {new Date(s.submittedAt).toLocaleString()}</span>}
                        {s.status && (
                          <Badge variant="outline" className="text-[10px] uppercase">
                            {s.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {/* Grades */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <GraduationCap className="h-4 w-4 text-indigo-600" />
                  Grades
                  <Badge variant="secondary" className="ml-auto text-xs">
                    {grades.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {grades.length === 0 ? (
                  <p className="text-slate-500 text-xs">No grades posted yet.</p>
                ) : (
                  grades.map((g) => (
                    <div key={g.id} className="rounded-md border border-slate-100 p-3">
                      <div className="font-medium text-slate-900 flex justify-between items-center">
                        <span>{g.assignmentTitle || g.courseTitle || "Assessment"}</span>
                        {g.letterGrade && (
                          <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 rounded-full px-2 py-0.5">
                            {g.letterGrade}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 flex justify-between">
                        {g.courseTitle && <span>{g.courseTitle}</span>}
                        {g.score != null && g.maxScore != null && (
                          <span>
                            {g.score}/{g.maxScore}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>
        )}
        </div>
      </div>
    </StudentLayout>
  );
}
