import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { 
  Users, BookOpen, Calendar, TrendingUp, Award, Clock,
  Bell, MessageCircle, FileText, CheckCircle, AlertCircle,
  Star, Target, GraduationCap, BarChart3
} from "lucide-react";

interface Child {
  id: number;
  name: string;
  grade: string;
  profilePicture?: string;
  overallGrade: string;
  attendance: number;
  coursesEnrolled: number;
  assignmentsDue: number;
  upcomingEvents: number;
  progressPercentage?: number;
  stats?: {
    progressPercentage: number;
    currentStreak: number;
    coursesEnrolled: number;
    assignmentsDue: number;
  };
  recentGrades?: any[];
  upcomingAssignments?: any[];
  alerts?: any[];
}

interface RecentActivity {
  id: number;
  childName: string;
  type: 'grade' | 'attendance' | 'assignment' | 'achievement';
  message: string;
  timestamp: string;
}

export default function ParentDashboard() {
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [children, setChildren] = useState<Child[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<number | null>(null);

  useEffect(() => {
    fetchParentData();
  }, [token]);

  const fetchParentData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch comprehensive dashboard overview
      const response = await fetch(apiEndpoint('/api/parent/dashboard/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        // Map children data to expected format
        const mappedChildren = (data.children || []).map((child: any) => ({
          id: child.id,
          name: child.name || child.fullName,
          grade: 'N/A', // Grade level - not tracked
          overallGrade: child.stats?.progressPercentage >= 90 ? 'A' :
                        child.stats?.progressPercentage >= 80 ? 'B+' :
                        child.stats?.progressPercentage >= 70 ? 'B' :
                        child.stats?.progressPercentage >= 60 ? 'C' : 'D',
          attendance: 95, // Default - would need attendance API
          coursesEnrolled: child.stats?.coursesEnrolled || 0,
          assignmentsDue: child.stats?.assignmentsDue || 0,
          upcomingEvents: 0,
          progressPercentage: child.stats?.progressPercentage || 0,
          stats: child.stats,
          recentGrades: child.recentGrades || [],
          upcomingAssignments: child.upcomingAssignments || [],
          alerts: child.alerts || []
        }));
        setChildren(mappedChildren);
        
        // Map recent activity
        const mappedActivity = (data.recentActivity || []).map((activity: any, index: number) => ({
          id: index + 1,
          childName: activity.childName,
          type: activity.type || 'grade',
          message: activity.message,
          timestamp: activity.timestamp ? formatTimeAgo(new Date(activity.timestamp)) : 'Recently'
        }));
        setRecentActivity(mappedActivity);
        
        if (mappedChildren.length > 0) {
          setSelectedChild(mappedChildren[0].id);
        }
      } else {
        console.error('Failed to fetch dashboard data:', response.status);
        setChildren([]);
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching parent data:', error);
      setChildren([]);
      setRecentActivity([]);
    } finally {
      setLoading(false);
    }
  };

  // Helper to format timestamps
  const formatTimeAgo = (date: Date): string => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'grade': return <Star className="h-4 w-4 text-yellow-500" />;
      case 'attendance': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'assignment': return <FileText className="h-4 w-4 text-blue-500" />;
      case 'achievement': return <Award className="h-4 w-4 text-purple-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const selectedChildData = children.find(c => c.id === selectedChild);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-600">Monitor your children's academic progress</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setLocation('/parent/messages')}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Teachers
            </Button>
            <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => setLocation('/parent/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              School Calendar
            </Button>
          </div>
        </div>

        {/* Children Selection */}
        {children.length > 1 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">My Children</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 overflow-x-auto pb-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChild(child.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all min-w-[200px] ${
                      selectedChild === child.id 
                        ? 'border-pink-500 bg-pink-50' 
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={child.profilePicture} />
                      <AvatarFallback className="bg-pink-100 text-pink-600">
                        {child.name?.split(' ').map(n => n[0]).filter(Boolean).join('') || child.name?.[0] || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{child.name}</p>
                      <p className="text-sm text-gray-500">{child.progressPercentage || 0}% Progress</p>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        {selectedChildData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Overall Progress</p>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedChildData.progressPercentage || 0}%</h3>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <Progress value={selectedChildData.progressPercentage || 0} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Attendance</p>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedChildData.attendance}%</h3>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <Progress value={selectedChildData.attendance} className="mt-3 h-2" />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Courses Enrolled</p>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedChildData.coursesEnrolled}</h3>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <BookOpen className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Assignments Due</p>
                    <h3 className="text-3xl font-bold text-gray-900">{selectedChildData.assignmentsDue}</h3>
                  </div>
                  <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Clock className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Latest updates from your children's academics</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
                    <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        <span className="text-pink-600">{activity.childName}:</span> {activity.message}
                      </p>
                      <p className="text-sm text-gray-500">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation('/parent/grades')}
              >
                <BarChart3 className="h-5 w-5 text-green-600" />
                View Grade Reports
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation('/parent/attendance')}
              >
                <Calendar className="h-5 w-5 text-blue-600" />
                Check Attendance
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation('/parent/messages')}
              >
                <MessageCircle className="h-5 w-5 text-purple-600" />
                Message Teachers
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start gap-3"
                onClick={() => setLocation('/parent/children')}
              >
                <Users className="h-5 w-5 text-pink-600" />
                Manage Children
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Events */}
        <Card>
          <CardHeader>
            <CardTitle>Upcoming School Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-pink-100 rounded-lg flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <p className="font-medium">Parent-Teacher Conference</p>
                    <p className="text-sm text-gray-500">Dec 15, 2025</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Award className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Science Fair</p>
                    <p className="text-sm text-gray-500">Dec 20, 2025</p>
                  </div>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <GraduationCap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Winter Break Begins</p>
                    <p className="text-sm text-gray-500">Dec 23, 2025</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
