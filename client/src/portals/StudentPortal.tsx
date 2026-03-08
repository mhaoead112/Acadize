import React, { Suspense } from "react";
import { Route, Switch, useLocation } from "wouter";
import StudentLayout from "@/components/StudentLayout";
import { StudentRoute } from "@/components/ProtectedRoute";
import { StatePanel } from "@/components/ui/state-panel";

const StudentDashboard = React.lazy(() => import("@/pages/student-dashboard"));
const StudentCoursesPage = React.lazy(() => import("@/pages/student-courses"));
const StudentJoinCoursePage = React.lazy(() => import("@/pages/student-join-course"));
const StudentSearchResultsPage = React.lazy(() => import("@/pages/student-search-results"));
const StudentCourseDetailPage = React.lazy(() => import("@/pages/student-course-detail"));
const StudentCourseLessons = React.lazy(() => import("@/pages/student-course-lessons"));
const StudentAssignments = React.lazy(() => import("@/pages/student-assignments"));
const StudentAttendance = React.lazy(() => import("@/pages/student-attendance"));
const StudentAttendanceScan = React.lazy(() => import("@/pages/student-attendance-scan"));
const StudentCalendar = React.lazy(() => import("@/pages/student-calendar"));
const StudentReportCards = React.lazy(() => import("@/pages/student-report-cards"));
const StudentExams = React.lazy(() => import("@/pages/student-exams"));
const StudentExamPreview = React.lazy(() => import("@/pages/student-exam-preview"));
const StudentExamAttempt = React.lazy(() => import("@/pages/student-exam-attempt"));
const StudentExamResults = React.lazy(() => import("@/pages/student-exam-results"));
const StudentMistakes = React.lazy(() => import("@/pages/student-mistakes"));
const StudentRetakeConfig = React.lazy(() => import("@/pages/student-retake-config"));
const StudentRetakeAttempt = React.lazy(() => import("@/pages/student-retake-attempt"));
const StudentGrades = React.lazy(() => import("@/pages/student-grades"));
const StudentProgressPage = React.lazy(() => import("@/pages/student-progress"));
const StudentSchedule = React.lazy(() => import("@/pages/student-schedule"));
const StudentAllAnnouncementsPage = React.lazy(() => import("@/pages/student-all-announcements"));
const StudentAnnouncementsPage = React.lazy(() => import("@/pages/student-announcements"));
const ProfilePage = React.lazy(() => import("@/pages/student-profile"));
const StudentMessages = React.lazy(() => import("@/pages/study-groups-chat-enhanced"));

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <StatePanel variant="loading" title="Loading page" description="Preparing student content..." className="w-full max-w-sm" />
    </div>
  );
}

export function StudentPortal() {
  const [location, setLocation] = useLocation();

  React.useEffect(() => {
    if (location === "/student") {
      setLocation("/student/dashboard");
    }
  }, [location, setLocation]);

  return (
    <StudentRoute>
      <StudentLayout>
        <Suspense fallback={<RouteFallback />}>
          <Switch>
            <Route path="/student/dashboard" component={StudentDashboard} />
            <Route path="/student/courses" component={StudentCoursesPage} />
            <Route path="/student/join-course" component={StudentJoinCoursePage} />
            <Route path="/student/search" component={StudentSearchResultsPage} />
            <Route path="/student/courses/:courseId/lessons" component={StudentCourseLessons} />
            <Route path="/student/courses/:id/lessons" component={StudentCourseLessons} />
            <Route path="/student/courses/:courseId" component={StudentCourseDetailPage} />
            <Route path="/student/courses/:id" component={StudentCourseDetailPage} />
            <Route path="/student/assignments" component={StudentAssignments} />
            <Route path="/student/attendance" component={StudentAttendance} />
            <Route path="/student/attendance/scan" component={StudentAttendanceScan} />
            <Route path="/student/calendar" component={StudentCalendar} />
            <Route path="/student/report-cards" component={StudentReportCards} />
            <Route path="/student/exams" component={StudentExams} />
            <Route path="/student/exams/:examId/start" component={StudentExamPreview} />
            <Route path="/student/exams/:examId/attempt/:attemptId" component={StudentExamAttempt} />
            <Route path="/student/exams/:examId/results/:attemptId" component={StudentExamResults} />
            <Route path="/student/exams/:examId/review/:attemptId" component={StudentExamResults} />
            <Route path="/student/exams/:examId/retake" component={StudentRetakeConfig} />
            <Route path="/student/exams/preview" component={StudentExamPreview} />
            <Route path="/student/exams/attempt" component={StudentExamAttempt} />
            <Route path="/student/exams/results" component={StudentExamResults} />
            <Route path="/student/exam-results/:attemptId" component={StudentExamResults} />
            <Route path="/student/mistakes" component={StudentMistakes} />
            <Route path="/student/retake-config" component={StudentRetakeConfig} />
            <Route path="/student/retakes/:id" component={StudentRetakeAttempt} />
            <Route path="/student/retake-attempt" component={StudentRetakeAttempt} />
            <Route path="/student/grades" component={StudentGrades} />
            <Route path="/student/messages" component={StudentMessages} />
            <Route path="/student/progress" component={StudentProgressPage} />
            <Route path="/student/schedule" component={StudentSchedule} />
            <Route path="/student/announcements" component={StudentAnnouncementsPage} />
            <Route path="/student/announcements/all" component={StudentAllAnnouncementsPage} />
            <Route path="/student/profile" component={ProfilePage} />
            <Route path="/student/*">
              <StudentDashboard />
            </Route>
          </Switch>
        </Suspense>
      </StudentLayout>
    </StudentRoute>
  );
}
