import React, { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint, assetUrl } from "@/lib/config";
import {
  Loader2,
  User,
  Mail,
  Phone,
  GraduationCap,
  BookOpen,
  Trophy,
  Target,
  TrendingUp,
  Calendar,
  Eye,
  MessageSquare,
  MoreHorizontal,
  Users
} from "lucide-react";

interface StudentProfile {
  id: string;
  fullName: string;
  username: string;
  email: string;
  phone?: string;
  profilePicture?: string;
  bio?: string;
  grade?: string;
  createdAt: string;
}

interface EnrolledCourse {
  courseId: string;
  courseTitle: string;
  grade?: string;
  teacher?: string;
}

interface AssignmentStats {
  total: number;
  completed: number;
  pending: number;
  averageScore: number; // percentage 0-100; GPA = averageScore/25
  attendance?: number;
  overdue?: number;
}

interface GradeInfo {
  courseTitle: string;
  assignmentTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  gradedAt: string;
}

interface TeacherNote {
  id: string;
  content: string;
  date: string;
}

interface RecentActivity {
  id: string;
  type: "submission" | "missed" | "discussion";
  title: string;
  module: string;
  time: string;
  icon: string;
}

export default function StudentProfilePage() {
  const [match, params] = useRoute("/teacher/students/:studentId");
  const studentId = params?.studentId;
  const [, setLocation] = useLocation();
  const { token } = useAuth();
  const { toast } = useToast();

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [grades, setGrades] = useState<GradeInfo[]>([]);
  const [stats, setStats] = useState<AssignmentStats>({
    total: 0,
    completed: 0,
    pending: 0,
    averageScore: 0,
    attendance: 0,
    overdue: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingNote, setIsSavingNote] = useState(false);

  const [notes, setNotes] = useState<TeacherNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [activities, setActivities] = useState<RecentActivity[]>([]);

  const getAuthHeaders = (): Record<string, string> => {
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    if (!studentId) return;
    fetchStudentData();
    // Load any locally saved notes as a fallback
    try {
      const local = localStorage.getItem(`teacher_notes_${studentId}`);
      if (local) {
        const parsed: TeacherNote[] = JSON.parse(local);
        if (Array.isArray(parsed)) setNotes(parsed);
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId, token]);

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return "Just now";
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  const fetchStudentData = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();

      if (!studentId) {
        setIsLoading(false);
        return;
      }

      // Student
      const studentRes = await fetch(apiEndpoint(`/api/users/${studentId}`), {
        headers,
      });
      if (studentRes.ok) {
        const studentData = await studentRes.json();
        setStudent(studentData.user || studentData);
      } else {
        console.error("Failed to fetch student:", studentRes.status);
      }

      // Enrollments
      const enrollmentsRes = await fetch(
        apiEndpoint(`/api/enrollments/student/${studentId}`),
        { headers }
      );
      if (enrollmentsRes.ok) {
        const enrollmentsData = await enrollmentsRes.json();
        const enrollments = enrollmentsData.enrollments || enrollmentsData || [];
        setCourses(
          enrollments.map((e: any) => ({
            courseId: e.courseId,
            courseTitle: e.course?.title || "Unknown Course",
            grade: e.grade,
            teacher: e.course?.teacher || "Unknown Teacher",
          }))
        );
      }

      // Grades
      let avgPercentage = 0;
      let totalAssignments = 0;
      let completedAssignments = 0;
      let overdueCount = 0;
      let gradesDataForActivity: any = null;

      const gradesRes = await fetch(apiEndpoint(`/api/grades/student/${studentId}`), { headers });

      if (gradesRes.ok) {
        const gradesData = await gradesRes.json();
        gradesDataForActivity = gradesData;
        const gradesList = gradesData.grades || gradesData || [];
        setGrades(
          gradesList.map((g: any) => ({
            courseTitle: g.courseName || "Course",
            assignmentTitle: g.assignmentTitle || "Assignment",
            score: parseFloat(g.score) || 0,
            maxScore: parseFloat(g.maxScore) || 100,
            percentage:
              ((parseFloat(g.score) || 0) / (parseFloat(g.maxScore) || 100)) *
              100,
            gradedAt: g.gradedAt || g.createdAt,
          }))
        );

        const totalScore = gradesList.reduce(
          (sum: number, g: any) => sum + (parseFloat(g.score) || 0),
          0
        );
        const totalMax = gradesList.reduce(
          (sum: number, g: any) => sum + (parseFloat(g.maxScore) || 100),
          0
        );
        avgPercentage = totalMax > 0 ? (totalScore / totalMax) * 100 : 0;
        completedAssignments = gradesList.length; // graded assignments count as completed
      }

      setStats({
        total: totalAssignments,
        completed: completedAssignments,
        pending: totalAssignments - completedAssignments,
        averageScore: avgPercentage, // store avg percentage; GPA = avg/25
        attendance: 0,
        overdue: overdueCount,
      });

      // Submissions -> recent activity
      // NOTE: Using grades to derive recent activity since /api/submissions/student/:studentId doesn't exist
      if (gradesDataForActivity) {
        const gradesList = gradesDataForActivity.grades || gradesDataForActivity || [];
        
        const recentActivities = gradesList.slice(0, 5).map((g: any, idx: number) => ({
          id: `${idx}`,
          type: "submission",
          title: `Submitted: "${g.assignmentTitle || "Assignment"}"`,
          module: g.courseName || "Course",
          time: formatTimeAgo(g.gradedAt || g.createdAt),
          icon: "check_circle",
        }));

        setActivities(recentActivities);
      }
    } catch (error) {
      console.error("Error fetching student data:", error);
      toast({
        title: "Error",
        description: "Failed to load student profile",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 90) return "text-emerald-600 bg-emerald-100";
    if (percentage >= 80) return "text-gold bg-gold/10";
    if (percentage >= 70) return "text-yellow-600 bg-yellow-100";
    if (percentage >= 60) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const handleSaveNote = async () => {
    if (!newNote.trim() || !studentId) return;

    setIsSavingNote(true);
    try {
      const headers = {
        ...getAuthHeaders(),
        "Content-Type": "application/json",
      };

      const response = await fetch(apiEndpoint("/api/teacher/notes"), {
        method: "POST",
        headers,
        body: JSON.stringify({
          studentId,
          content: newNote.trim(),
        }),
      });

      if (response.ok) {
        const savedNote = await response.json();
        const note: TeacherNote = {
          id: savedNote.id || Date.now().toString(),
          content: newNote.trim(),
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        };

        const updated = [note, ...notes];
        setNotes(updated);
        // keep local copy as well
        try { localStorage.setItem(`teacher_notes_${studentId}`, JSON.stringify(updated)); } catch {}
        setNewNote("");
        toast({
          title: "Note saved",
          description: "Your note has been added successfully",
        });
      } else if (response.status === 404) {
        // Backend route not available — gracefully fallback to local storage
        const note: TeacherNote = {
          id: Date.now().toString(),
          content: newNote.trim(),
          date: new Date().toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          }),
        };
        const updated = [note, ...notes];
        setNotes(updated);
        try { localStorage.setItem(`teacher_notes_${studentId}`, JSON.stringify(updated)); } catch {}
        setNewNote("");
        toast({
          title: "Saved locally",
          description: "Backend notes endpoint not available. Stored on this device for now.",
        });
      } else {
        throw new Error("Failed to save note");
      }
    } catch (error) {
      console.error("Error saving note:", error);
      toast({
        title: "Error",
        description: "Failed to save note. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleMessageStudent = () => {
    if (student) {
      setLocation(`/teacher/messages?userId=${student.id}`);
    }
  };

  const handleMessageParents = () => {
    if (student) {
      setLocation(`/teacher/messages?student=${student.id}&type=parent`);
    }
  };

  const handleDownloadReport = async () => {
    if (!studentId || !student) return;

    try {
      const headers = getAuthHeaders();
      const response = await fetch(
        apiEndpoint(`/api/teacher/students/${studentId}/report`),
        { headers }
      );

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${student.fullName.replace(/\s+/g, "_")}_Performance_Report.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        toast({
          title: "Report downloaded",
          description: "Student performance report has been downloaded",
        });
      } else {
        throw new Error("Failed to download report");
      }
    } catch (error) {
      console.error("Error downloading report:", error);
      toast({
        title: "Error",
        description: "Failed to download report. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleViewCourse = (courseId: string) => {
    setLocation(`/teacher/courses/${courseId}`);
  };

  const handleEmailStudent = () => {
    if (student?.email) {
      window.location.href = `mailto:${student.email}`;
    }
  };

  const handleCallStudent = () => {
    if (student?.phone) {
      window.location.href = `tel:${student.phone}`;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case "submission":
        return {
          bg: "bg-emerald-500/10",
          icon: "text-emerald-500",
          icon_name: "check_circle",
        };
      case "missed":
        return {
          bg: "bg-red-500/10",
          icon: "text-red-500",
          icon_name: "assignment_late",
        };
      case "discussion":
        return { bg: "bg-gold/10", icon: "text-gold", icon_name: "forum" };
      default:
        return {
          bg: "bg-gray-500/10",
          icon: "text-gray-500",
          icon_name: "help",
        };
    }
  };

  if (isLoading) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-gold mx-auto mb-4" />
            <p className="text-slate-500 dark:text-slate-400">
              Loading student profile...
            </p>
          </div>
        </div>
      </TeacherLayout>
    );
  }

  if (!student) {
    return (
      <TeacherLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <User className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-700 mb-2">
                Student Not Found
              </h2>
              <p className="text-gray-500 mb-4">
                This student profile doesn't exist or you don't have access.
              </p>
              <Button onClick={() => setLocation("/teacher/students")}>
                Back to Students
              </Button>
            </CardContent>
          </Card>
        </div>
      </TeacherLayout>
    );
  }

  const initials = student.fullName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <TeacherLayout>
      <div className="flex-1 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-navy-dark relative scrollbar-hide">
        {/* Breadcrumb */}
        <div className="w-full px-6 md:px-10 pt-6 pb-2">
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={() => setLocation("/teacher/students")}
              className="text-slate-500 dark:text-slate-400 text-sm font-medium hover:text-gold transition-colors"
            >
              Students
            </button>
            <span className="text-slate-400 text-sm font-medium">/</span>
            <span className="text-slate-900 dark:text-white text-sm font-bold">
              {student.fullName}
            </span>
          </div>
        </div>

        <div className="flex-1 w-full max-w-7xl mx-auto px-6 md:px-10 pb-10 flex flex-col gap-6 mt-4">
          {/* Header Card */}
          <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 shadow-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                <div className="flex flex-col sm:flex-row gap-5 items-center sm:items-start text-center sm:text-left">
                  <Avatar className="h-24 w-24 border-2 border-gold shadow-md">
                    <AvatarImage
                      src={
                        student.profilePicture
                          ? assetUrl(student.profilePicture)
                          : undefined
                      }
                    />
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-gold to-yellow-500 text-navy font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col justify-center gap-1">
                    <h2 className="text-slate-900 dark:text-white text-3xl font-black tracking-tight">
                      {student.fullName}
                    </h2>
                    <div className="flex flex-wrap gap-3 items-center justify-center sm:justify-start text-slate-500 dark:text-slate-400 text-sm">
                      <span className="bg-gold/10 text-gold px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-widest border border-gold/20">
                        Active
                      </span>
                      <span className="font-mono">
                        ID: #{studentId?.slice(0, 6) || "XXXXX"}
                      </span>
                      {student.grade && (
                        <>
                          <span className="size-1 bg-slate-300 dark:bg-slate-700 rounded-full"></span>
                          <span>{student.grade}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-4 mt-3 justify-center sm:justify-start">
                      <span
                        onClick={handleEmailStudent}
                        className="material-symbols-outlined text-slate-400 text-lg cursor-pointer hover:text-gold transition-colors"
                        title="Email"
                      >
                        mail
                      </span>
                      <span
                        onClick={handleCallStudent}
                        className="material-symbols-outlined text-slate-400 text-lg cursor-pointer hover:text-gold transition-colors"
                        title="Phone"
                      >
                        call
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex w-full md:w-auto gap-3">
                  <button
                    onClick={handleMessageStudent}
                    className="flex-1 md:flex-none h-11 px-5 rounded-lg bg-slate-100 dark:bg-navy-dark hover:bg-slate-200 dark:hover:bg-slate-800 text-navy dark:text-white text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                  >
                    <MessageSquare className="h-5 w-5" />
                    Message Student
                  </button>
                  <button
                    onClick={handleMessageParents}
                    className="flex-1 md:flex-none h-11 px-5 rounded-lg bg-gold hover:bg-yellow-500 text-navy text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 shadow-lg shadow-gold/20"
                  >
                    <Users className="h-5 w-5" />
                    Message Parents
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-gold"></div>
              <CardContent className="p-5 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Current GPA
                  </p>
                  <GraduationCap className="h-5 w-5 text-gold" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-black">
                    {(stats.averageScore / 25).toFixed(1)}
                  </p>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
              <CardContent className="p-5 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Attendance Rate
                  </p>
                  <Calendar className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-black">
                    {stats.attendance || 0}%
                  </p>
                  <span className="text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    <TrendingUp className="h-3 w-3 mr-0.5" />
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 shadow-sm relative overflow-hidden">
              <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
              <CardContent className="p-5 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <p className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-widest">
                    Overdue Tasks
                  </p>
                  <Target className="h-5 w-5 text-red-500" />
                </div>
                <div className="flex items-baseline gap-2 mt-2">
                  <p className="text-slate-900 dark:text-white text-3xl font-black">
                    {stats.overdue || 0}
                  </p>
                  <span className="text-red-600 dark:text-red-400 text-xs font-bold flex items-center bg-red-500/10 px-1.5 py-0.5 rounded">
                    <Trophy className="h-3 w-3 mr-0.5" /> Needs Attention
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Performance Table */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">
                    Course Performance
                  </h3>
                  <button
                    onClick={handleDownloadReport}
                    className="text-gold text-sm font-bold hover:underline"
                  >
                    Download Report
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-navy-dark text-slate-500 text-xs uppercase font-black tracking-widest">
                      <tr>
                        <th className="p-4 font-black">Subject</th>
                        <th className="p-4 font-black">Teacher</th>
                        <th className="p-4 font-black">Grade</th>
                        <th className="p-4 font-black">Trend</th>
                        <th className="p-4 font-black text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                      {courses.map((course) => {
                        const gradeNum = parseFloat(course.grade || "0");
                        const percentage = gradeNum * 10;
                        return (
                          <tr
                            key={course.courseId}
                            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                          >
                            <td className="p-4 text-slate-900 dark:text-white font-bold">
                              {course.courseTitle}
                            </td>
                            <td className="p-4 text-slate-500 dark:text-slate-400">
                              {course.teacher || "Unknown"}
                            </td>
                            <td className="p-4">
                              <span
                                className={`px-2 py-0.5 rounded font-bold text-xs ${getGradeColor(
                                  percentage
                                )}`}
                              >
                                {course.grade
                                  ? `${course.grade} (${percentage.toFixed(0)}%)`
                                  : "N/A"}
                              </span>
                            </td>
                            <td className="p-4">
                              <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={`${
                                    percentage >= 90
                                      ? "bg-emerald-500"
                                      : percentage >= 80
                                      ? "bg-gold"
                                      : "bg-red-500"
                                  } h-full rounded-full`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <button
                                onClick={() => handleViewCourse(course.courseId)}
                                className="text-slate-400 hover:text-gold transition-colors"
                                title="View Course"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {courses.length === 0 && (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Not enrolled in any courses</p>
                    </div>
                  )}
                </div>
              </Card>

              {/* Recent Activity */}
              <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-4">
                  Recent Activity
                </h3>
                <div className="flex flex-col gap-3">
                  {activities.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 dark:text-slate-400">
                      <Trophy className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No recent activity</p>
                    </div>
                  ) : (
                    activities.map((activity) => {
                      const colors = getActivityColor(activity.type);
                      return (
                        <div
                          key={activity.id}
                          className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-800 group hover:border-gold/30 transition-all cursor-pointer"
                        >
                          <div
                            className={`${colors.bg} ${colors.icon} p-2 rounded-full size-10 flex items-center justify-center shrink-0`}
                          >
                            <span className="material-symbols-outlined text-[24px]">
                              {colors.icon_name}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-900 dark:text-white font-bold text-sm truncate">
                              {activity.title}
                            </p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs">
                              {activity.module} • {activity.time}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </Card>
            </div>

            {/* Right Side */}
            <div className="flex flex-col gap-6">
              {/* Teacher Notes */}
              <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 flex flex-col shadow-sm overflow-hidden">
                <div className="p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <h3 className="text-slate-900 dark:text-white font-bold text-lg">
                    Teacher Notes
                  </h3>
                </div>
                <div className="p-4 flex flex-col gap-4 max-h-[350px] overflow-y-auto no-scrollbar">
                  {notes.length === 0 ? (
                    <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                      <MoreHorizontal className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>No notes yet</p>
                    </div>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-slate-50 dark:bg-navy-dark p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 relative group"
                      >
                        <p className="text-gold text-[10px] mb-1 font-black uppercase tracking-widest">
                          {note.date}
                        </p>
                        <p className="text-slate-700 dark:text-slate-200 text-sm leading-relaxed">
                          {note.content}
                        </p>
                        <button className="absolute top-2 right-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
                <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10">
                  <textarea
                    className="w-full bg-white dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg p-3 text-slate-900 dark:text-white text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-transparent resize-none transition-shadow"
                    placeholder="Add a private note..."
                    rows={3}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end mt-3">
                    <button
                      onClick={handleSaveNote}
                      disabled={isSavingNote || !newNote.trim()}
                      className="bg-gold hover:bg-yellow-500 text-navy text-[10px] font-black py-2 px-5 rounded-lg transition-all uppercase tracking-widest shadow-md shadow-gold/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSavingNote ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </div>
              </Card>

              {/* Contact Info */}
              <Card className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-800 p-5 shadow-sm">
                <h3 className="text-slate-900 dark:text-white font-bold text-lg mb-4">
                  Contact Information
                </h3>
                <div className="flex flex-col gap-5">
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
                      Parent / Guardian
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-navy-dark rounded-full p-2 text-navy dark:text-gold border border-slate-200 dark:border-slate-700">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-slate-900 dark:text-white text-sm font-bold">
                          Parent Contact
                        </p>
                        <p className="text-slate-400 text-xs">Primary Contact</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
                      Phone
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-navy-dark rounded-full p-2 text-navy dark:text-gold border border-slate-200 dark:border-slate-700">
                        <Phone className="h-5 w-5" />
                      </div>
                      <p className="text-slate-900 dark:text-white text-sm font-medium hover:text-gold cursor-pointer transition-colors">
                        {student.phone || "No phone"}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">
                      Email
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 dark:bg-navy-dark rounded-full p-2 text-navy dark:text-gold border border-slate-200 dark:border-slate-700">
                        <Mail className="h-5 w-5" />
                      </div>
                      <p className="text-slate-900 dark:text-white text-sm font-medium hover:text-gold cursor-pointer transition-colors truncate">
                        {student.email}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </TeacherLayout>
  );
}
