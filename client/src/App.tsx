import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import Home from "@/pages/home";
import About from "@/pages/about";
import Programs from "@/pages/programs";
import Subjects from "@/pages/subjects";
import Admissions from "@/pages/admissions";
import Contact from "@/pages/contact";
import AiChat from "@/pages/ai-chat";
import GroupChat from "@/pages/group-chat";
import ARLearning from "@/pages/ar-learning";
import EmotionalLearning from "@/pages/emotional-learning";
import Avatars from "@/pages/avatars";
import LMSStructure from "@/pages/lms-structure";
import TeacherDashboard from "@/pages/teacher-dashboard";
import TeacherClasses from "@/pages/teacher-classes";
import TeacherCourses from "@/pages/teacher-courses";
import TeacherStudents from "@/pages/teacher-students";
import TeacherStudentProfile from "@/pages/teacher-student-profile";
import TeacherAssessments from "@/pages/teacher-assessments";
import TeacherContent from "@/pages/teacher-content";
import TeacherAnalytics from "@/pages/teacher-analytics";
import TeacherCommunication from "@/pages/teacher-communication";
import TeacherProfile from "@/pages/teacher-profile";
import PortalLanding from "@/pages/portal-landing";
import News from "@/pages/news";
import Events from "@/pages/events";
import StaffDirectory from "@/pages/staff";
import NotFound from "@/pages/not-found";
import DemoLogin from "@/components/DemoLogin";
// Import new dashboard pages
import StudentDashboard from "@/pages/student-dashboard";
import StudentCoursesPage from "@/pages/student-courses";
import StudentSearchResultsPage from "@/pages/student-search-results";
import StudentCourseDetailPage from "@/pages/student-course-detail";
import StudentProgressPage from "@/pages/student-progress";
import StudentCalendar from "@/pages/student-calendar";
import TeacherDashboardEnhanced from "@/pages/teacher-dashboard-enhanced";
import AdminDashboard from "@/pages/admin-dashboard";
import AdminAnalytics from "@/pages/admin-analytics";
import AdminReports from "@/pages/admin-reports";
import AdminSettings from "@/pages/admin-settings";
import LessonManagement from "@/pages/lesson-management";
import CreateCoursePage from "@/pages/create-course";
import TeacherCourseManage from "@/pages/teacher-course-manage";
import TeacherCourseLessonCreate from "@/pages/teacher-course-lesson-create";
import StudentCourseLessons from "@/pages/student-course-lessons";
import StudentReportCards from "@/pages/student-report-cards";
import TeacherReportCards from "@/pages/teacher-report-cards";
import AIStudyBuddy from "@/pages/ai-study-buddy";
import StudentAssignments from "@/pages/student-assignments";
import StudentGrades from "@/pages/student-grades";
import StudentSchedule from "@/pages/student-schedule";
import AnnouncementsPage from "@/pages/announcements";
import StudentAnnouncementsPage from "@/pages/student-announcements";
import StudentAllAnnouncementsPage from "@/pages/student-all-announcements";
import TeacherAssignments from "@/pages/teacher-assignments";
import TeacherCreateAssignment from "@/pages/teacher-create-assignment";
import TeacherAssignmentSubmissions from "@/pages/teacher-assignment-submissions";
import Login from "@/pages/login";
import Register from "@/pages/register";
import StudyGroupsChatPage from "@/pages/study-groups-chat-enhanced";
import ProfilePage from "@/pages/student-profile";
import Settings from "@/pages/settings";
import TeacherAssignmentDetail from "@/pages/teacher-assignment-detail";
import TeacherLessonView from "@/pages/teacher-lesson-view";
// New pages for complete LMS
import TeacherMessages from "@/pages/teacher-messages";
import TeacherCalendar from "@/pages/teacher-calendar";
import AdminUsers from "@/pages/admin-users";
import AdminStudentParentLink from "@/pages/admin-student-parent-link";
import AdminCalendar from "@/pages/admin-calendar";
import AdminAnnouncements from "@/pages/admin-announcements";
import ParentDashboard from "@/pages/parent-dashboard";
import ParentDashboardEnhanced from "@/pages/parent-dashboard-enhanced";
import ParentDashboardModern from "@/pages/parent-dashboard-modern";
import ParentChildren from "@/pages/parent-children";
import ParentGrades from "@/pages/parent-grades";
import ParentAttendance from "@/pages/parent-attendance";
import ParentMessages from "@/pages/parent-messages";
import ParentCalendar from "@/pages/parent-calendar";
import ParentAssignments from "@/pages/parent-assignments";
import ParentAnalytics from "@/pages/parent-analytics";
import ParentCourses from "@/pages/parent-courses";
import ParentLessons from "@/pages/parent-lessons";
import ParentProgress from "@/pages/parent-progress";
import ParentReports from "@/pages/parent-reports";
// New landing pages
import Pricing from "@/pages/pricing";
import Integrations from "@/pages/integrations";
import Blog from "@/pages/blog";
import BlogPostDetail from "@/pages/blog-post";
import Community from "@/pages/community";
import Docs from "@/pages/docs";
import HelpCenter from "@/pages/help-center";
import Privacy from "@/pages/privacy";
import Terms from "@/pages/terms";

// Parent route protection component
function ParentRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
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
      {!isDashboardRoute && <Navbar />}
      <main className="flex-1">
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
              <Login />
            </PublicOnlyRoute>
          </Route>

          {/* Demo login route - high priority */}
          <Route path="/demo">
            <PublicOnlyRoute>
              <DemoLogin />
            </PublicOnlyRoute>
          </Route>
          
          {/* Public home page */}
          <Route path="/home">
            <Home />
          </Route>
          
          {/* Redirect root to home page - no login required */}
          <Route path="/" component={Home} />
          
          {/* Role-based dashboard routes */}
          <Route path="/student">
            <StudentRoute>
              <StudentDashboard />
            </StudentRoute>
          </Route>

          {/* Alias for /student/dashboard */}
          <Route path="/student/dashboard">
            <StudentRoute>
              <StudentDashboard />
            </StudentRoute>
          </Route>

          <Route path="/student/progress">
            <StudentRoute>
              <StudentProgressPage />
            </StudentRoute>
          </Route>

          <Route path="/student/search">
            <StudentRoute>
              <StudentSearchResultsPage />
            </StudentRoute>
          </Route>

          <Route path="/student/courses">
            <StudentRoute>
              <StudentCoursesPage />
            </StudentRoute>
          </Route>

          <Route path="/student/courses/:courseId">
            <StudentRoute>
              <StudentCourseDetailPage />
            </StudentRoute>
          </Route>

          <Route path="/student/courses/:courseId/lessons">
            <StudentRoute>
              <StudentCourseLessons />
            </StudentRoute>
          </Route>

          <Route path="/student/assignments">
            <StudentRoute>
              <StudentAssignments />
            </StudentRoute>
          </Route>

          <Route path="/student/grades">
            <StudentRoute>
              <StudentGrades />
            </StudentRoute>
          </Route>

          <Route path="/student/report-cards">
            <StudentRoute>
              <StudentReportCards />
            </StudentRoute>
          </Route>

          <Route path="/student/ai-buddy">
            <StudentRoute>
              <AIStudyBuddy />
            </StudentRoute>
          </Route>

          <Route path="/student/schedule">
            <StudentRoute>
              <StudentSchedule />
            </StudentRoute>
          </Route>

          <Route path="/student/courses/:courseId/announcements">
            <StudentRoute>
              <StudentAnnouncementsPage />
            </StudentRoute>
          </Route>

          <Route path="/student/announcements">
            <StudentRoute>
              <StudentAllAnnouncementsPage />
            </StudentRoute>
          </Route>

          <Route path="/student/messages">
            <StudentRoute>
              <StudyGroupsChatPage />
            </StudentRoute>
          </Route>

          <Route path="/student/calendar">
            <StudentRoute>
              <StudentCalendar />
            </StudentRoute>
          </Route>

          <Route path="/student/profile">
            <StudentRoute>
              <ProfilePage />
            </StudentRoute>
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

          {/* Admin Analytics - Admin only */}
          <Route path="/admin/analytics">
            <AdminRoute>
              <AdminAnalytics />
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
          
          {/* Fallback */}
          <Route component={NotFound} />
        </Switch>
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
