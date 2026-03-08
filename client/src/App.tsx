import React, { Suspense } from "react";
import { Switch, Route, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { HreflangLinks } from "@/components/HreflangLinks";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { StatePanel } from "@/components/ui/state-panel";
import { Navigation } from "@/components/navigation";
import Navbar from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { 
  PublicOnlyRoute, 
  StudentRoute, 
  TeacherRoute, 
  AdminRoute,
  MultiRoleRoute,
  ProtectedRoute 
} from "@/components/ProtectedRoute";
import DemoLogin from "@/components/DemoLogin";
// Import new dashboard pages
function ParentRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <StatePanel variant="loading" title="Loading portal" description="Checking your account access..." className="w-full max-w-sm" />
      </div>
    );
  }
  
  if (!user || user.role !== 'parent') {
    setLocation('/login');
    return null;
  }
  
  return <>{children}</>;
}

import { useAuth, AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { StudentNotificationProvider } from "@/contexts/StudentNotificationContext";
const Home = React.lazy(() => import("@/pages/home"));
const About = React.lazy(() => import("@/pages/about"));
const Programs = React.lazy(() => import("@/pages/programs"));
const Subjects = React.lazy(() => import("@/pages/subjects"));
const Admissions = React.lazy(() => import("@/pages/admissions"));
const Contact = React.lazy(() => import("@/pages/contact"));
const AiChat = React.lazy(() => import("@/pages/ai-chat"));
const GroupChat = React.lazy(() => import("@/pages/group-chat"));
const ARLearning = React.lazy(() => import("@/pages/ar-learning"));
const EmotionalLearning = React.lazy(() => import("@/pages/emotional-learning"));
const Avatars = React.lazy(() => import("@/pages/avatars"));
const LMSStructure = React.lazy(() => import("@/pages/lms-structure"));
const TeacherDashboard = React.lazy(() => import("@/pages/teacher-dashboard"));
const TeacherClasses = React.lazy(() => import("@/pages/teacher-classes"));
const TeacherCourses = React.lazy(() => import("@/pages/teacher-courses"));
const TeacherStudents = React.lazy(() => import("@/pages/teacher-students"));
const TeacherStudentProfile = React.lazy(() => import("@/pages/teacher-student-profile"));
const TeacherAssessments = React.lazy(() => import("@/pages/teacher-assessments"));
const TeacherContent = React.lazy(() => import("@/pages/teacher-content"));
const TeacherAnalytics = React.lazy(() => import("@/pages/teacher-analytics"));
const TeacherMistakeAnalytics = React.lazy(() => import("@/pages/teacher-mistake-analytics"));
const TeacherCommunication = React.lazy(() => import("@/pages/teacher-communication"));
const TeacherProfile = React.lazy(() => import("@/pages/teacher-profile"));
const PortalLanding = React.lazy(() => import("@/pages/portal-landing"));
const News = React.lazy(() => import("@/pages/news"));
const Events = React.lazy(() => import("@/pages/events"));
const StaffDirectory = React.lazy(() => import("@/pages/staff"));
const NotFound = React.lazy(() => import("@/pages/not-found"));
const StudentDashboard = React.lazy(() => import("@/pages/student-dashboard"));
const StudentCoursesPage = React.lazy(() => import("@/pages/student-courses"));
const StudentJoinCoursePage = React.lazy(() => import("@/pages/student-join-course"));
const StudentSearchResultsPage = React.lazy(() => import("@/pages/student-search-results"));
const StudentCourseDetailPage = React.lazy(() => import("@/pages/student-course-detail"));
const StudentProgressPage = React.lazy(() => import("@/pages/student-progress"));
const StudentCalendar = React.lazy(() => import("@/pages/student-calendar"));
const TeacherDashboardEnhanced = React.lazy(() => import("@/pages/teacher-dashboard-enhanced"));
const AdminDashboard = React.lazy(() => import("@/pages/admin-dashboard"));
const AdminAnalytics = React.lazy(() => import("@/pages/admin-analytics"));
const AdminAttendance = React.lazy(() => import("@/pages/admin-attendance"));
const AdminReports = React.lazy(() => import("@/pages/admin-reports"));
const AdminSettings = React.lazy(() => import("@/pages/admin-settings"));
const AdminOrganizations = React.lazy(() => import("@/pages/admin-organizations"));
const LessonManagement = React.lazy(() => import("@/pages/lesson-management"));
const CreateCoursePage = React.lazy(() => import("@/pages/create-course"));
const TeacherCourseManage = React.lazy(() => import("@/pages/teacher-course-manage"));
const TeacherCourseLessonCreate = React.lazy(() => import("@/pages/teacher-course-lesson-create"));
const StudentCourseLessons = React.lazy(() => import("@/pages/student-course-lessons"));
const StudentReportCards = React.lazy(() => import("@/pages/student-report-cards"));
const TeacherReportCards = React.lazy(() => import("@/pages/teacher-report-cards"));
const AIStudyBuddy = React.lazy(() => import("@/pages/ai-study-buddy"));
const StudentAssignments = React.lazy(() => import("@/pages/student-assignments"));
const StudentGrades = React.lazy(() => import("@/pages/student-grades"));
const StudentSchedule = React.lazy(() => import("@/pages/student-schedule"));
const StudentExams = React.lazy(() => import("@/pages/student-exams"));
const StudentMistakes = React.lazy(() => import("@/pages/student-mistakes"));
const StudentRetakeConfig = React.lazy(() => import("@/pages/student-retake-config"));
const StudentRetakeAttempt = React.lazy(() => import("@/pages/student-retake-attempt"));
const ExamInstructions = React.lazy(() => import("@/pages/exam-instructions"));
const StudentExamAttempt = React.lazy(() => import("@/pages/student-exam-attempt"));
const StudentExamResults = React.lazy(() => import("@/pages/student-exam-results"));
const AnnouncementsPage = React.lazy(() => import("@/pages/announcements"));
const StudentAnnouncementsPage = React.lazy(() => import("@/pages/student-announcements"));
const StudentAllAnnouncementsPage = React.lazy(() => import("@/pages/student-all-announcements"));
const TeacherAssignments = React.lazy(() => import("@/pages/teacher-assignments"));
const TeacherCreateAssignment = React.lazy(() => import("@/pages/teacher-create-assignment"));
const TeacherAssignmentSubmissions = React.lazy(() => import("@/pages/teacher-assignment-submissions"));
const Login = React.lazy(() => import("@/pages/login"));
const Register = React.lazy(() => import("@/pages/register"));
const ChangePassword = React.lazy(() => import("@/pages/change-password"));
const Activate = React.lazy(() => import("@/pages/activate"));
const ActivateFreeTrial = React.lazy(() => import("@/pages/activate-free-trial"));
const SubscriptionRequired = React.lazy(() => import("@/pages/subscription-required"));
const CheckoutSuccess = React.lazy(() => import("@/pages/checkout-success"));
const CheckoutFailed = React.lazy(() => import("@/pages/checkout-failed"));
const StudyGroupsChatPage = React.lazy(() => import("@/pages/study-groups-chat-enhanced"));
const ProfilePage = React.lazy(() => import("@/pages/student-profile"));
const StudentAttendanceScan = React.lazy(() => import("@/pages/student-attendance-scan"));
const StudentAttendance = React.lazy(() => import("@/pages/student-attendance"));
const Settings = React.lazy(() => import("@/pages/settings"));
const TeacherAssignmentDetail = React.lazy(() => import("@/pages/teacher-assignment-detail"));
const TeacherLessonView = React.lazy(() => import("@/pages/teacher-lesson-view"));
const TeacherMessages = React.lazy(() => import("@/pages/teacher-messages"));
const TeacherCalendar = React.lazy(() => import("@/pages/teacher-calendar"));
const TeacherExams = React.lazy(() => import("@/pages/teacher-exams"));
const TeacherExamCreate = React.lazy(() => import("@/pages/teacher-exam-create"));
const TeacherExamManage = React.lazy(() => import("@/pages/teacher-exam-manage"));
const TeacherAttemptReview = React.lazy(() => import("@/pages/teacher-attempt-review"));
const TeacherExamEdit = React.lazy(() => import("@/pages/teacher-exam-edit"));
const TeacherExamQuestions = React.lazy(() => import("@/pages/teacher-exam-questions"));
const StudentExamPreview = React.lazy(() => import("@/pages/student-exam-preview"));
const AdminUsers = React.lazy(() => import("@/pages/admin-users"));
const AdminStudentParentLink = React.lazy(() => import("@/pages/admin-student-parent-link"));
const AdminCalendar = React.lazy(() => import("@/pages/admin-calendar"));
const AdminAnnouncements = React.lazy(() => import("@/pages/admin-announcements"));
const ParentDashboard = React.lazy(() => import("@/pages/parent-dashboard"));
const ParentDashboardEnhanced = React.lazy(() => import("@/pages/parent-dashboard-enhanced"));
const ParentDashboardModern = React.lazy(() => import("@/pages/parent-dashboard-modern"));
const ParentChildren = React.lazy(() => import("@/pages/parent-children"));
const ParentGrades = React.lazy(() => import("@/pages/parent-grades"));
const ParentAttendance = React.lazy(() => import("@/pages/parent-attendance"));
const ParentAttendanceHistory = React.lazy(() => import("@/pages/parent-attendance-history"));
const ParentMessages = React.lazy(() => import("@/pages/parent-messages"));
const ParentCalendar = React.lazy(() => import("@/pages/parent-calendar"));
const ParentAssignments = React.lazy(() => import("@/pages/parent-assignments"));
const ParentAnalytics = React.lazy(() => import("@/pages/parent-analytics"));
const ParentCourses = React.lazy(() => import("@/pages/parent-courses"));
const ParentLessons = React.lazy(() => import("@/pages/parent-lessons"));
const ParentProgress = React.lazy(() => import("@/pages/parent-progress"));
const ParentReports = React.lazy(() => import("@/pages/parent-reports"));
const TeacherSearchResultsPage = React.lazy(() => import("@/pages/teacher-search-results"));
const AdminSearchResultsPage = React.lazy(() => import("@/pages/admin-search-results"));
const ParentSearchResultsPage = React.lazy(() => import("@/pages/parent-search-results"));
const TeacherSessionDetail = React.lazy(() => import("@/pages/teacher-session-live"));
const Pricing = React.lazy(() => import("@/pages/pricing"));
const Integrations = React.lazy(() => import("@/pages/integrations"));
const Blog = React.lazy(() => import("@/pages/blog"));
const BlogPostDetail = React.lazy(() => import("@/pages/blog-post"));
const Community = React.lazy(() => import("@/pages/community"));
const Docs = React.lazy(() => import("@/pages/docs"));
const HelpCenter = React.lazy(() => import("@/pages/help-center"));
const Privacy = React.lazy(() => import("@/pages/privacy"));
const Terms = React.lazy(() => import("@/pages/terms"));
const TeacherSessions = React.lazy(() => import("./pages/teacher-sessions"));
const StudentPortal = React.lazy(() => import("@/portals/StudentPortal").then((mod) => ({ default: mod.StudentPortal })));


function SyncLocaleFromPath({ locale, children }: { locale: string; children: React.ReactNode }) {
  const { i18n } = useTranslation();
  React.useEffect(() => {
    if (locale && locale !== i18n.language) i18n.changeLanguage(locale);
  }, [locale, i18n]);
  return <>{children}</>;
}

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center p-4">
      <StatePanel variant="loading" title="Loading page" description="Preparing content..." className="w-full max-w-sm" />
    </div>
  );
}

function Router() {
  const [location] = useLocation();
  
  // Check if current route is a dashboard route (hide navbar/footer on dashboards)
  const isDashboardRoute = location.startsWith('/student') || 
                          location.startsWith('/teacher') || 
                          location.startsWith('/admin') || 
                          location.startsWith('/parent') ||
                          location.startsWith('/dashboard') ||
                          location === '/settings';
  
  return (
    <div className="min-h-screen flex flex-col">
      <HreflangLinks />
      {!isDashboardRoute && <Navbar />}
      <main className="flex-1">
        <Suspense fallback={<RouteFallback />}>
          <Switch>
          {/* Authentication routes */}
          <Route path="/login">
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          </Route>

          {/* Register route - kept for future admin functionality, redirects to login */}
          <Route path="/register">
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          </Route>

          {/* Subscription / checkout - plan selection and payment for existing users */}
          <Route path="/activate">
            <Activate />
          </Route>
          <Route path="/activate-free-trial">
            <ActivateFreeTrial />
          </Route>
          <Route path="/subscription-required">
            <SubscriptionRequired />
          </Route>
          <Route path="/checkout-success">
            <CheckoutSuccess />
          </Route>
          <Route path="/checkout-failed">
            <CheckoutFailed />
          </Route>

          {/* Change password route - for first-time login */}
          <Route path="/change-password">
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          </Route>
          
          {/* Locale-prefixed public pages (SEO) */}
          <Route path="/en/home">
            <SyncLocaleFromPath locale="en"><Home /></SyncLocaleFromPath>
          </Route>
          <Route path="/ar/home">
            <SyncLocaleFromPath locale="ar"><Home /></SyncLocaleFromPath>
          </Route>
          <Route path="/en/about">
            <SyncLocaleFromPath locale="en"><About /></SyncLocaleFromPath>
          </Route>
          <Route path="/ar/about">
            <SyncLocaleFromPath locale="ar"><About /></SyncLocaleFromPath>
          </Route>
          <Route path="/en/contact">
            <SyncLocaleFromPath locale="en"><Contact /></SyncLocaleFromPath>
          </Route>
          <Route path="/ar/contact">
            <SyncLocaleFromPath locale="ar"><Contact /></SyncLocaleFromPath>
          </Route>

          {/* Public home page */}
          <Route path="/home">
            <Home />
          </Route>
          
          {/* Redirect root to home page - no login required */}
          <Route path="/" component={Home} />
          
          {/* Student portal: single prefix route. Layout and nav mount once. */}
          {/* wouter wildcard syntax is /student/* for nested student paths */}
          <Route path="/student/*">
            <StudentPortal />
          </Route>
          <Route path="/student">
            <StudentPortal />
          </Route>

          {/* Universal Settings - All authenticated users */}
          <Route path="/settings">
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          </Route>
          
          <Route path="/teacher">
            <TeacherRoute>
              <TeacherDashboard />
            </TeacherRoute>
          </Route>

          {/* Alias for /teacher/dashboard */}
          <Route path="/teacher/dashboard">
            <TeacherRoute>
              <TeacherDashboard />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/messages">
            <TeacherRoute>
              <TeacherMessages />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/profile">
            <TeacherRoute>
              <ProfilePage />
            </TeacherRoute>
          </Route>

          <Route path="/admin">
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </Route>

          {/* Alias for /admin/dashboard */}
          <Route path="/admin/dashboard">
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </Route>

          <Route path="/admin/search">
            <AdminRoute>
              <AdminSearchResultsPage />
            </AdminRoute>
          </Route>

          {/* Admin Analytics - Admin only */}
          <Route path="/admin/analytics">
            <AdminRoute>
              <AdminAnalytics />
            </AdminRoute>
          </Route>

          {/* Admin Attendance Analytics - Admin only */}
          <Route path="/admin/attendance">
            <AdminRoute>
              <AdminAttendance />
            </AdminRoute>
          </Route>

          {/* Admin Reports - Admin only */}
          <Route path="/admin/reports">
            <AdminRoute>
              <AdminReports />
            </AdminRoute>
          </Route>

          {/* Admin Settings - Admin only */}
          <Route path="/admin/settings">
            <AdminRoute>
              <AdminSettings />
            </AdminRoute>
          </Route>

          {/* Admin Courses Management - Admin only */}
          <Route path="/admin/courses">
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          </Route>

          <Route path="/admin/courses/create">
            <AdminRoute>
              <CreateCoursePage />
            </AdminRoute>
          </Route>

          {/* Admin Lessons Management - Admin only */}
          <Route path="/admin/lessons">
            <AdminRoute>
              <LessonManagement />
            </AdminRoute>
          </Route>

          {/* Admin Users - Admin only */}
          <Route path="/admin/users">
            <AdminRoute>
              <AdminUsers />
            </AdminRoute>
          </Route>

          {/* Admin Student-Parent Link - Admin only */}
          <Route path="/admin/student-parent-link">
            <AdminRoute>
              <AdminStudentParentLink />
            </AdminRoute>
          </Route>

          {/* Admin Calendar - Admin only */}
          <Route path="/admin/calendar">
            <AdminRoute>
              <AdminCalendar />
            </AdminRoute>
          </Route>

          {/* Admin Announcements - Admin only */}
          <Route path="/admin/announcements">
            <AdminRoute>
              <AdminAnnouncements />
            </AdminRoute>
          </Route>

          {/* Parent Routes */}
          <Route path="/parent">
            <ParentRoute>
              <ParentDashboardModern />
            </ParentRoute>
          </Route>

          <Route path="/parent/dashboard">
            <ParentRoute>
              <ParentDashboardModern />
            </ParentRoute>
          </Route>

          <Route path="/parent/search">
            <ParentRoute>
              <ParentSearchResultsPage />
            </ParentRoute>
          </Route>

          <Route path="/parent/children">
            <ParentRoute>
              <ParentChildren />
            </ParentRoute>
          </Route>

          <Route path="/parent/grades">
            <ParentRoute>
              <ParentGrades />
            </ParentRoute>
          </Route>

          <Route path="/parent/attendance/history">
            <ParentRoute>
              <ParentAttendanceHistory />
            </ParentRoute>
          </Route>
          <Route path="/parent/attendance">
            <ParentRoute>
              <ParentAttendance />
            </ParentRoute>
          </Route>

          <Route path="/parent/messages">
            <ParentRoute>
              <ParentMessages />
            </ParentRoute>
          </Route>

          <Route path="/parent/calendar">
            <ParentRoute>
              <ParentCalendar />
            </ParentRoute>
          </Route>

          <Route path="/parent/assignments/:childId">
            <ParentRoute>
              <ParentAssignments />
            </ParentRoute>
          </Route>

          <Route path="/parent/analytics/:childId">
            <ParentRoute>
              <ParentAnalytics />
            </ParentRoute>
          </Route>

          <Route path="/parent/courses">
            <ParentRoute>
              <ParentCourses />
            </ParentRoute>
          </Route>

          <Route path="/parent/courses/:courseId/lessons">
            <ParentRoute>
              <ParentLessons />
            </ParentRoute>
          </Route>

          <Route path="/parent/progress">
            <ParentRoute>
              <ParentProgress />
            </ParentRoute>
          </Route>

          <Route path="/parent/reports">
            <ParentRoute>
              <ParentReports />
            </ParentRoute>
          </Route>
          
          {/* Protected teacher sub-routes */}
          <Route path="/teacher/classes">
            <TeacherRoute>
              <TeacherClasses />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/students">
            <TeacherRoute>
              <TeacherStudents />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/students/:studentId">
            <TeacherRoute>
              <TeacherStudentProfile />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/assessments">
            <TeacherRoute>
              <TeacherAssessments />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/content">
            <TeacherRoute>
              <TeacherContent />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/analytics">
            <TeacherRoute>
              <TeacherAnalytics />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/mistakes">
            <TeacherRoute>
              <TeacherMistakeAnalytics />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams">
            <TeacherRoute>
              <TeacherExams />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams/create">
            <TeacherRoute>
              <TeacherExamCreate />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams/:id">
            <TeacherRoute>
              <TeacherExamManage />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams/:id/edit">
            <TeacherRoute>
              <TeacherExamEdit />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams/:id/questions">
            <TeacherRoute>
              <TeacherExamQuestions />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/exams/:examId/preview">
            <TeacherRoute>
              <StudentExamPreview />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/attempts/:attemptId/review">
            <TeacherRoute>
              <TeacherAttemptReview />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/calendar">
            <TeacherRoute>
              <TeacherCalendar />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/communication">
            <TeacherRoute>
              <TeacherCommunication />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/report-cards">
            <TeacherRoute>
              <TeacherReportCards />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/profile">
            <TeacherRoute>
              <TeacherProfile />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/search">
            <TeacherRoute>
              <TeacherSearchResultsPage />
            </TeacherRoute>
          </Route>

          {/* Teacher Courses - Teacher/Admin only */}
          {/* IMPORTANT: More specific routes must come before parameterized routes */}
          <Route path="/teacher/courses/create">
            <TeacherRoute>
              <CreateCoursePage />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/courses/:courseId/lessons/create">
            <TeacherRoute>
              <TeacherCourseLessonCreate />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/courses/:id">
            <TeacherRoute>
              <TeacherCourseManage />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/courses">
            <TeacherRoute>
              <TeacherCourses />
            </TeacherRoute>
          </Route>

          {/* Teacher Assignments - Teacher/Admin only */}
          <Route path="/teacher/create-assignment">
            <TeacherRoute>
              <TeacherCreateAssignment />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/assignments/:id">
            <TeacherRoute>
              <TeacherAssignmentDetail />
            </TeacherRoute>
          </Route>

          <Route path="/teacher/assignments">
            <TeacherRoute>
              <TeacherAssignments />
            </TeacherRoute>
          </Route>

          {/* Teacher Assignment Submissions - Teacher/Admin only */}
          <Route path="/teacher/assignments/:assignmentId/submissions">
            <TeacherRoute>
              <TeacherAssignmentSubmissions />
            </TeacherRoute>
          </Route>

          {/* Teacher Lesson View - Teacher/Admin only */}
          <Route path="/teacher/courses/:courseId/lessons/:lessonId">
            <TeacherRoute>
              <TeacherLessonView />
            </TeacherRoute>
          </Route>

          {/* Teacher Lessons Management - Teacher/Admin only */}
          <Route path="/teacher/lessons">
            <TeacherRoute>
              <LessonManagement />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/sessions">
            <TeacherRoute>
              <TeacherSessions />
            </TeacherRoute>
          </Route>
          <Route path="/teacher/sessions/:sessionId/live">
            <TeacherRoute>
              <TeacherSessionDetail />
            </TeacherRoute>
          </Route>


          {/* Teacher Announcements - Teacher/Admin only */}
          <Route path="/courses/:courseId/announcements">
            <MultiRoleRoute roles={['teacher', 'admin']}>
              <AnnouncementsPage />
            </MultiRoleRoute>
          </Route>

          {/* Lesson Management - Teacher/Admin only (legacy route) */}
          <Route path="/lessons">
            <MultiRoleRoute roles={['teacher', 'admin']}>
              <LessonManagement />
            </MultiRoleRoute>
          </Route>

          {/* Course Creation - Teacher/Admin only (legacy route) */}
          <Route path="/courses/create">
            <MultiRoleRoute roles={['teacher', 'admin']}>
              <CreateCoursePage />
            </MultiRoleRoute>
          </Route>

          {/* Now publicly accessible - no login required */}
          <Route path="/ai-chat" component={AiChat} />
          <Route path="/group-chat" component={GroupChat} />
          <Route path="/ar-learning" component={ARLearning} />
          <Route path="/emotional-learning" component={EmotionalLearning} />
          <Route path="/avatars" component={Avatars} />
          
          {/* Public accessible routes (but enhanced when authenticated) */}
          <Route path="/home" component={Home} />
          <Route path="/about" component={About} />
          <Route path="/programs" component={Programs} />
          <Route path="/subjects" component={Subjects} />
          <Route path="/admissions" component={Admissions} />
          <Route path="/contact" component={Contact} />
          <Route path="/lms-structure" component={LMSStructure} />
          <Route path="/portal" component={PortalLanding} />
          <Route path="/news" component={News} />
          <Route path="/events" component={Events} />
          <Route path="/staff" component={StaffDirectory} />
          
          {/* New landing pages */}
          <Route path="/pricing" component={Pricing} />
          <Route path="/integrations" component={Integrations} />
          <Route path="/blog/:slug" component={BlogPostDetail} />
          <Route path="/blog" component={Blog} />
          <Route path="/community" component={Community} />
          <Route path="/docs" component={Docs} />
          <Route path="/help-center" component={HelpCenter} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/terms" component={Terms} />
          
          {/* Admin Organizations - Admin only */}
          <Route path="/admin/organizations">
            <MultiRoleRoute roles={['admin']}>
              <AdminOrganizations />
            </MultiRoleRoute>
          </Route>

          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
        </Suspense>
      </main>
      {!isDashboardRoute && <Footer />}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <StudentNotificationProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </StudentNotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
