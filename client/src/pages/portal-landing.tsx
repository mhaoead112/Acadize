import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, Users, Calendar, MessageSquare, BarChart3, 
  GraduationCap, Bell, FileText, Star, TrendingUp,
  User, Settings, LogOut, Home, Mail, Award
} from "lucide-react";

export default function PortalLanding() {
  const { user, logout, isAuthenticated } = useAuth();
  const [_, setLocation] = useLocation();

  useEffect(() => {
    // Give time for auth state to load from localStorage
    const timer = setTimeout(() => {
      if (!isAuthenticated && !user) {
        setLocation('/');
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [user, isAuthenticated, setLocation]);

  // Show loading state while auth is being determined
  if (!user && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-eduverse-light via-white to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 flex items-center justify-center transition-colors duration-300">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eduverse-blue mx-auto mb-4"></div>
          <p className="text-eduverse-gray dark:text-slate-400 transition-colors duration-300">Loading your portal...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const handleLogout = () => {
    logout();
    setLocation('/');
  };

  const getRoleBasedContent = () => {
    switch (user.role) {
      case 'student':
        return <StudentPortalContent user={user} setLocation={setLocation} />;
      case 'teacher':
        return <TeacherPortalContent user={user} setLocation={setLocation} />;
      case 'parent':
        return <ParentPortalContent user={user} setLocation={setLocation} />;
      case 'admin':
        return <AdminPortalContent user={user} setLocation={setLocation} />;
      default:
        return <StudentPortalContent user={user} setLocation={setLocation} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-eduverse-light via-white to-gray-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-colors duration-300">
      {/* Header */}
      <header className="bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700 relative z-10 transition-colors duration-300">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <GraduationCap className="h-8 w-8 text-eduverse-blue" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white transition-colors duration-300">EduVerse Portal</h1>
                <p className="text-eduverse-gray dark:text-slate-400 capitalize transition-colors duration-300">{user.role} Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-eduverse-blue text-white whitespace-nowrap">
                {user.fullName}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLocation('/home')}
                className="text-eduverse-blue border-eduverse-blue hover:bg-eduverse-light whitespace-nowrap"
                data-testid="button-home"
              >
                <Home className="h-4 w-4 mr-2" />
                Public Site
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-300 hover:bg-red-50 whitespace-nowrap relative z-20"
                data-testid="button-logout"
                style={{ pointerEvents: 'auto' }}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Portal Content */}
      <main className="container mx-auto px-6 py-8">
        {getRoleBasedContent()}
      </main>
    </div>
  );
}

function StudentPortalContent({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const quickActions = [
    {
      title: "📊 Progress Tracker",
      description: "View grades, assignments, and academic progress",
      href: "/lms-structure",
      icon: BarChart3,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "Group Chat",
      description: "Join study groups and class discussions",
      href: "/group-chat",
      icon: MessageSquare,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "AR Learning",
      description: "Interactive augmented reality lessons",
      href: "/ar-learning",
      icon: Star,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "AI Assistant",
      description: "Get help with homework and questions",
      href: "/ai-chat",
      icon: BookOpen,
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome back, {user.fullName}!
        </h2>
        <p className="text-xl text-eduverse-gray">
          Ready to continue your learning journey? Let's make today amazing!
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickActions.map((action) => (
          <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setLocation(action.href)}>
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                <action.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-eduverse-blue">
              <TrendingUp className="h-5 w-5" />
              Recent Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium">Mathematics Quiz</div>
                  <div className="text-sm text-gray-600">Completed today</div>
                </div>
                <Badge className="bg-green-500">92%</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">Science Project</div>
                  <div className="text-sm text-gray-600">Due in 3 days</div>
                </div>
                <Badge variant="outline">In Progress</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <div>
                  <div className="font-medium">History Essay</div>
                  <div className="text-sm text-gray-600">Due tomorrow</div>
                </div>
                <Badge className="bg-yellow-500">Review</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-eduverse-blue">
              <Bell className="h-5 w-5" />
              Announcements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium">New Science Lab Equipment</div>
                <div className="text-sm text-gray-600 mt-1">
                  Visit the upgraded physics lab this week!
                </div>
                <div className="text-xs text-gray-500 mt-2">2 hours ago</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-medium">🏆 Math Competition Winners</div>
                <div className="text-sm text-gray-600 mt-1">
                  Congratulations to all participants!
                </div>
                <div className="text-xs text-gray-500 mt-2">1 day ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function TeacherPortalContent({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const teacherActions = [
    {
      title: "👥 My Classes",
      description: "Manage classes and student groups",
      href: "/teacher/classes",
      icon: Users,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "📝 Assessments",
      description: "Create and grade assignments",
      href: "/teacher/assessments",
      icon: FileText,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "📊 Analytics",
      description: "Student performance insights",
      href: "/teacher/analytics",
      icon: BarChart3,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "Communication",
      description: "Message students and parents",
      href: "/teacher/communication",
      icon: MessageSquare,
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome back, {user.fullName}! 👨‍🏫
        </h2>
        <p className="text-xl text-eduverse-gray">
          Ready to inspire and educate? Let's make learning extraordinary!
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {teacherActions.map((action) => (
          <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setLocation(action.href)}>
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                <action.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Teacher Dashboard Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-eduverse-blue mb-2">127</div>
            <div className="text-gray-600">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">8</div>
            <div className="text-gray-600">Active Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">23</div>
            <div className="text-gray-600">Pending Reviews</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ParentPortalContent({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const parentActions = [
    {
      title: "👨‍👩‍👧‍👦 My Children",
      description: "View your children's progress and grades",
      href: "/lms-structure",
      icon: Users,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "📊 Academic Reports",
      description: "Detailed performance analytics",
      href: "/teacher/analytics",
      icon: BarChart3,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Teacher Communication",
      description: "Message teachers and staff",
      href: "/teacher/communication",
      icon: MessageSquare,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "📅 School Calendar",
      description: "Events, meetings, and schedules",
      href: "/group-chat",
      icon: Calendar,
      color: "bg-orange-500 hover:bg-orange-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Welcome, {user.fullName}! 👨‍👩‍👧‍👦
        </h2>
        <p className="text-xl text-eduverse-gray">
          Stay connected with your children's educational journey at EduVerse!
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {parentActions.map((action) => (
          <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setLocation(action.href)}>
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                <action.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Children's Overview */}
      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-eduverse-blue">
              <Award className="h-5 w-5" />
              Children's Recent Achievements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <div className="font-medium">Sarah - Mathematics Test</div>
                  <div className="text-sm text-gray-600">Grade 9 - Completed today</div>
                </div>
                <Badge className="bg-green-500">A+</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <div className="font-medium">Alex - Science Fair Project</div>
                  <div className="text-sm text-gray-600">Grade 7 - Submitted</div>
                </div>
                <Badge className="bg-blue-500">Excellent</Badge>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div>
                  <div className="font-medium">Sarah - Art Competition</div>
                  <div className="text-sm text-gray-600">Won 2nd place!</div>
                </div>
                <Badge className="bg-purple-500">🏆 Winner</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-eduverse-blue">
              <Bell className="h-5 w-5" />
              School Updates
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="font-medium">📅 Parent-Teacher Conference</div>
                <div className="text-sm text-gray-600 mt-1">
                  Schedule: Next Tuesday, 3:00 PM
                </div>
                <div className="text-xs text-gray-500 mt-2">2 hours ago</div>
              </div>
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="font-medium">🏫 School Holiday Notice</div>
                <div className="text-sm text-gray-600 mt-1">
                  No classes this Friday - Teacher training day
                </div>
                <div className="text-xs text-gray-500 mt-2">1 day ago</div>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <div className="font-medium">💰 Fee Payment Reminder</div>
                <div className="text-sm text-gray-600 mt-1">
                  Next semester fees due by month end
                </div>
                <div className="text-xs text-gray-500 mt-2">3 days ago</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function AdminPortalContent({ user, setLocation }: { user: any; setLocation: (path: string) => void }) {
  const adminActions = [
    {
      title: "👥 User Management",
      description: "Manage students, teachers, and staff",
      href: "/teacher/students",
      icon: Users,
      color: "bg-blue-500 hover:bg-blue-600"
    },
    {
      title: "📊 System Analytics",
      description: "School-wide performance metrics",
      href: "/teacher/analytics",
      icon: BarChart3,
      color: "bg-green-500 hover:bg-green-600"
    },
    {
      title: "Content Management",
      description: "Manage curriculum and resources",
      href: "/teacher/content",
      icon: BookOpen,
      color: "bg-purple-500 hover:bg-purple-600"
    },
    {
      title: "⚙️ Settings",
      description: "System configuration and policies",
      href: "/teacher/profile",
      icon: Settings,
      color: "bg-gray-500 hover:bg-gray-600"
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-800 mb-4">
          Administrator Dashboard 🏛️
        </h2>
        <p className="text-xl text-eduverse-gray">
          Managing EduVerse with excellence. Welcome back, {user.fullName}!
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {adminActions.map((action) => (
          <Card key={action.title} className="hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => setLocation(action.href)}>
            <CardContent className="p-6 text-center">
              <div className={`w-16 h-16 ${action.color} rounded-full flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110`}>
                <action.icon className="h-8 w-8 text-white" />
              </div>
              <h3 className="font-semibold text-gray-800 mb-2">{action.title}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Admin Dashboard Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-eduverse-blue mb-2">1,247</div>
            <div className="text-gray-600">Total Students</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">89</div>
            <div className="text-gray-600">Teachers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-orange-600 mb-2">45</div>
            <div className="text-gray-600">Classes</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">98%</div>
            <div className="text-gray-600">System Health</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
