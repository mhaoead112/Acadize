import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import StudentLayout from "@/components/StudentLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, AlertCircle } from "lucide-react";
import { Link } from "wouter";

interface Preview {
  id: string;
  title: string;
  description: string | null;
  teacherName: string | null;
}

export default function StudentJoinCoursePage() {
  const { t } = useTranslation("courses");
  const [, setLocation] = useLocation();
  const { user, token, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = typeof window !== "undefined" ? window.location.search : "";
  const params = new URLSearchParams(search);
  const courseId = params.get("courseId") ?? undefined;
  const code = params.get("code") ?? undefined;

  // Redirect to login with return URL if not authenticated
  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      const returnPath = `/student/join${search || (courseId ? `?courseId=${encodeURIComponent(courseId)}` : code ? `?code=${encodeURIComponent(code)}` : "")}`;
      setLocation(`/login?returnUrl=${encodeURIComponent(returnPath)}`);
      return;
    }
    if (user && user.role !== "student") {
      setError(t("joinOnlyStudents") ?? "Only students can join courses.");
      setLoading(false);
      return;
    }
    if (!courseId && !code) {
      setError(t("joinMissingParam") ?? "Missing course ID or invite code.");
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      setLoading(true);
      setError(null);
      try {
        const q = courseId ? `courseId=${encodeURIComponent(courseId)}` : `joinCode=${encodeURIComponent(code!)}`;
        const res = await fetch(apiEndpoint(`/api/enrollments/join/preview?${q}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.message || t("joinCourseNotFound") || "Course not found.");
          setPreview(null);
          return;
        }
        const data = await res.json();
        setPreview({
          id: data.id,
          title: data.title,
          description: data.description ?? null,
          teacherName: data.teacherName ?? null,
        });
      } catch {
        setError(t("joinPreviewFailed") ?? "Could not load course.");
        setPreview(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [authLoading, isAuthenticated, user, courseId, code, search, token, t]);

  const handleJoin = async () => {
    if (!preview || !token) return;
    setJoining(true);
    try {
      const body = courseId ? { courseId: preview.id } : { joinCode: code };
      const res = await fetch(apiEndpoint("/api/enrollments/join"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && (data.message || "").toLowerCase().includes("already enrolled")) {
          toast({
            title: t("joinAlreadyEnrolled") ?? "Already enrolled",
            description: t("joinAlreadyEnrolledDesc") ?? "You are already in this course.",
          });
          setLocation(`/student/courses/${preview.id}`);
          return;
        }
        toast({
          title: t("joinFailed") ?? "Could not join",
          description: data.message || t("joinCourseNotFound"),
          variant: "destructive",
        });
        return;
      }
      toast({
        title: t("joinSuccess") ?? "Enrolled",
        description: t("joinSuccessDesc", { title: preview.title }) ?? `You joined ${preview.title}.`,
      });
      setLocation(`/student/courses/${preview.id}`);
    } catch {
      toast({
        title: t("joinFailed") ?? "Could not join",
        description: t("joinPreviewFailed") ?? "Something went wrong.",
        variant: "destructive",
      });
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || (!isAuthenticated && !error)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !preview) {
    return (
      <StudentLayout>
        <div className="container max-w-lg py-8">
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {t("joinError") ?? "Cannot join course"}
              </CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/student/courses">
                <Button variant="outline">{t("myClasses") ?? "My courses"}</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="container max-w-lg py-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              {t("joinCourse") ?? "Join a course"}
            </CardTitle>
            <CardDescription>
              {t("joinConfirmDesc") ?? "Do you want to join this course?"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {preview && (
              <>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{preview.title}</p>
                  {preview.teacherName && (
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {t("teacher") ?? "Teacher"}: {preview.teacherName}
                    </p>
                  )}
                  {preview.description && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 line-clamp-2">
                      {preview.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleJoin} disabled={joining}>
                    {joining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {t("joining") ?? "Joining…"}
                      </>
                    ) : (
                      t("join") ?? "Join course"
                    )}
                  </Button>
                  <Link href="/student/courses">
                    <Button variant="outline">{t("cancel") ?? "Cancel"}</Button>
                  </Link>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </StudentLayout>
  );
}
