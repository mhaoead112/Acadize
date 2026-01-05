import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { 
  Sparkles, 
  Users, 
  Brain, 
  MessageCircle, 
  Palette, 
  BarChart3, 
  GraduationCap, 
  UserCircle, 
  Shield, 
  Home 
} from "lucide-react";

interface DemoUser {
  username: string;
  email?: string;
  password: string;
  role: string;
  fullName: string;
  description: string;
  features: string[];
  icon: any;
  color: string;
}

const demoUsers: DemoUser[] = [
  {
    username: "student_demo",
    email: "student_demo@eduverse.com",
    password: "demo123",
    role: "student",
    fullName: "Alex Student",
    description: "Experience learning with AI assistance, group chats, and progress tracking",
    features: ["AI Study Buddy", "Group Chat", "Avatar Creator", "Progress Tracker"],
    icon: Brain,
    color: "from-blue-500 to-indigo-600"
  },
  {
    username: "teacher_demo", 
    email: "teacher_demo@eduverse.com",
    password: "demo123",
    role: "teacher",
    fullName: "Sarah Teacher",
    description: "Manage classes, view analytics, and engage with student groups",
    features: ["Class Management", "Student Analytics", "Group Moderation", "AI Teaching Assistant"],
    icon: Users,
    color: "from-green-500 to-emerald-600"
  },
  {
    username: "admin_demo",
    password: "demo123", 
    role: "admin",
    fullName: "Mike Administrator",
    description: "Full system access with advanced management capabilities",
    features: ["System Management", "User Administration", "Analytics Dashboard", "All Features"],
    icon: BarChart3,
    color: "from-purple-500 to-violet-600"
  },
  {
    username: "parent_demo",
    password: "demo123",
    role: "parent", 
    fullName: "Lisa Parent",
    description: "Monitor child's progress and communicate with teachers",
    features: ["Child Progress", "Teacher Communication", "Event Notifications", "Grade Reports"],
    icon: MessageCircle,
    color: "from-pink-500 to-rose-600"
  }
];

export default function DemoLogin() {
  const [loadingUsername, setLoadingUsername] = useState<string | null>(null);
  const { login, logout } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleDemoLogin = async (demoUser: DemoUser) => {
    setLoadingUsername(demoUser.username);
    try {
      // First logout any existing session
      logout();
      
      // Small delay to ensure logout is processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await login({
        username: demoUser.username,
        email: demoUser.email,
        password: demoUser.password
      });

      if (result.success) {
        toast({
          title: "Demo Login Successful! 🎉",
          description: `Welcome ${demoUser.fullName}! Explore all the amazing features.`,
        });
        
        // Navigate to appropriate dashboard
        const dashboards = {
          student: '/student',
          teacher: '/teacher', 
          admin: '/admin',
          parent: '/parent'
        };
        setLocation(dashboards[demoUser.role as keyof typeof dashboards]);
      } else {
        toast({
          title: "Login Failed",
          description: result.error || "Something went wrong",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Please check your connection and try again",
        variant: "destructive"
      });
    } finally {
      setLoadingUsername(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur-lg opacity-30 animate-pulse"></div>
              <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-4 rounded-2xl">
                <Sparkles className="text-white" size={40} />
              </div>
            </div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              EduVerse Demo
            </h1>
          </div>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
            Try out all features with our demo accounts! Each role has access to different capabilities.
          </p>
          
          {/* Feature highlights */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[
              { icon: Brain, label: "AI Study Assistant", color: "bg-blue-100 text-blue-700" },
              { icon: Users, label: "Group Chat", color: "bg-green-100 text-green-700" },
              { icon: Palette, label: "Avatar Creator", color: "bg-purple-100 text-purple-700" },
              { icon: BarChart3, label: "Progress Tracker", color: "bg-orange-100 text-orange-700" }
            ].map(({ icon: Icon, label, color }) => (
              <div key={label} className={`flex items-center gap-2 px-4 py-2 rounded-full ${color} font-medium`}>
                <Icon size={16} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Demo User Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {demoUsers.map((user) => {
            const Icon = user.icon;
            return (
              <Card 
                key={user.username} 
                className="relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 group"
                data-testid={`demo-card-${user.role}`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${user.color} opacity-5 group-hover:opacity-10 transition-opacity`}></div>
                <div className="relative z-10">
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto mb-4 relative">
                      <div className={`absolute inset-0 bg-gradient-to-br ${user.color} rounded-2xl blur-lg opacity-30`}></div>
                      <div className={`relative bg-gradient-to-br ${user.color} p-4 rounded-2xl`}>
                        <Icon className="text-white mx-auto" size={32} />
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-gray-800 mb-2">
                      {user.fullName}
                    </CardTitle>
                    <Badge variant="secondary" className="capitalize">
                      {user.role}
                    </Badge>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed">
                      {user.description}
                    </p>
                    
                    {/* Features list */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {user.features.map((feature) => (
                          <span 
                            key={feature}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <Button 
                      onClick={() => handleDemoLogin(user)}
                      disabled={loadingUsername === user.username}
                      className={`w-full bg-gradient-to-r ${user.color} hover:opacity-90 text-white font-medium py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl`}
                      data-testid={`button-login-${user.role}`}
                    >
                      {loadingUsername === user.username ? "Logging in..." : `Try as ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}`}
                    </Button>
                    
                    {/* Credentials display */}
                    <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Username:</span>
                        <span className="font-mono text-gray-700">{user.username}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Password:</span>
                        <span className="font-mono text-gray-700">{user.password}</span>
                      </div>
                    </div>
                  </CardContent>
                </div>
              </Card>
            );
          })}
        </div>
        
        {/* Quick Access Instructions */}
        <Card className="mt-12 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">Quick Demo Guide</h3>
            <p className="text-blue-700 mb-4">
              Click any card above to instantly log in and explore that role's features!
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-600">
              <div className="flex items-center gap-2">
                <GraduationCap size={16} className="text-blue-600" />
                <strong>Students:</strong> Chat with AI, join groups, create avatars, track progress
              </div>
              <div className="flex items-center gap-2">
                <UserCircle size={16} className="text-blue-600" />
                <strong>Teachers:</strong> Manage classes, view analytics, moderate groups
              </div>
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-blue-600" />
                <strong>Admins:</strong> Full system access and management capabilities
              </div>
              <div className="flex items-center gap-2">
                <Home size={16} className="text-blue-600" />
                <strong>Parents:</strong> Monitor progress and communicate with teachers
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
