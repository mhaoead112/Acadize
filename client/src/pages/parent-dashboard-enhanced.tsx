import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import { 
  Users, BookOpen, Calendar, TrendingUp, Award, Clock,
  Bell, MessageCircle, FileText, CheckCircle, AlertCircle,
  Star, Target, GraduationCap, BarChart3, AlertTriangle,
  TrendingDown, Activity, ArrowRight, RefreshCw
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { usePortalI18n } from '@/hooks/usePortalI18n';


interface ChildData {
  id: string;
  name: string;
  username: string;
  email: string;
  stats: {
    currentGPA: number;
    attendanceRate: number;
    coursesEnrolled: number;
    assignmentsDue: number;
  };
  recentGrades: Array<{
    assignmentTitle: string;
    courseName: string;
    score: number;
    maxScore: number;
    percentage: number;
    gradedAt: Date;
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    courseName: string;
    dueDate: Date;
    status: string;
    type: string;
  }>;
  alerts: Array<{
    type: string;
    severity: string;
    message: string;
    childId: string;
  }>;
}

interface DashboardData {
  children: ChildData[];
  recentActivity: Array<{
    childId: string;
    childName: string;
    type: string;
    message: string;
    timestamp: Date;
    severity: string;
  }>;
  summary: {
    totalChildren: number;
    totalAlerts: number;
    averageGPA: number;
    averageAttendance: number;
  };
}

export default function ParentDashboardEnhanced() {
  const { t } = usePortalI18n("common");
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) {
      setRefreshing(false);
      return;
    }
    
    try {
      setRefreshing(true);
      const response = await fetch(apiEndpoint('/api/parent/dashboard/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
        if (data.children?.length > 0 && !selectedChild) {
          setSelectedChild(data.children[0].id);
        }
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getGradeColor = (gpa: number) => {
    if (gpa >= 90) return 'text-green-600 bg-green-50';
    if (gpa >= 80) return 'text-blue-600 bg-blue-50';
    if (gpa >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeLetter = (gpa: number) => {
    if (gpa >= 90) return 'A';
    if (gpa >= 80) return 'B';
    if (gpa >= 70) return 'C';
    if (gpa >= 60) return 'D';
    return 'F';
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'grade': return <Star className="h-4 w-4" />;
      case 'attendance': return <CheckCircle className="h-4 w-4" />;
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'achievement': return <Award className="h-4 w-4" />;
      default: return <Bell className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'success': return 'text-green-600 bg-green-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      case 'danger': return 'text-red-600 bg-red-50';
      default: return 'text-blue-600 bg-blue-50';
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'grade_drop': return <TrendingDown className="h-5 w-5 text-red-500" />;
      case 'attendance': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'assignment': return <Clock className="h-5 w-5 text-blue-500" />;
      default: return <Bell className="h-5 w-5 text-gray-500" />;
    }
  };

  const selectedChildData = dashboardData?.children.find(c => c.id === selectedChild);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
            <p className="text-gray-500">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!dashboardData || dashboardData.children.length === 0) {
    return (
      <DashboardLayout>
        <Card className="max-w-2xl mx-auto mt-8">
          <CardHeader>
            <CardTitle>No Children Linked</CardTitle>
            <CardDescription>You haven't linked any children to your account yet.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/parent/children')} className="bg-pink-600 hover:bg-pink-700">
              <Users className="h-4 w-4 mr-2" />
              Link a Child
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Parent Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your {dashboardData.summary.totalChildren === 1 ? "child's" : "children's"} academic progress</p>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={fetchDashboardData}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => setLocation('/parent/messages')}>
              <MessageCircle className="h-4 w-4 mr-2" />
              Messages
            </Button>
            <Button className="bg-pink-600 hover:bg-pink-700" onClick={() => setLocation('/parent/calendar')}>
              <Calendar className="h-4 w-4 mr-2" />
              Calendar
            </Button>
          </div>
        </div>

        {/* Summary Stats - All Children */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Children</p>
                  <h3 className="text-3xl font-bold text-gray-900">{dashboardData.summary.totalChildren}</h3>
                </div>
                <div className="h-12 w-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-pink-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg GPA</p>
                  <h3 className="text-3xl font-bold text-gray-900">{dashboardData.summary.averageGPA.toFixed(1)}</h3>
                  <p className="text-xs text-gray-500 mt-1">{getGradeLetter(dashboardData.summary.averageGPA)} Average</p>
                </div>
                <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <GraduationCap className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg Attendance</p>
                  <h3 className="text-3xl font-bold text-gray-900">{dashboardData.summary.averageAttendance.toFixed(1)}%</h3>
                </div>
                <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <Progress value={dashboardData.summary.averageAttendance} className="mt-3 h-2" />
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Alerts</p>
                  <h3 className="text-3xl font-bold text-gray-900">{dashboardData.summary.totalAlerts}</h3>
                </div>
                <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                  dashboardData.summary.totalAlerts > 0 ? 'bg-orange-100' : 'bg-gray-100'
                }`}>
                  <Bell className={`h-6 w-6 ${dashboardData.summary.totalAlerts > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Children Tabs */}
        <Tabs value={selectedChild || ''} onValueChange={setSelectedChild}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${dashboardData.children.length}, 1fr)` }}>
            {dashboardData.children.map((child) => (
              <TabsTrigger key={child.id} value={child.id} className="relative">
                {child.name}
                {child.alerts.length > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {child.alerts.length}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          {dashboardData.children.map((child) => (
            <TabsContent key={child.id} value={child.id} className="space-y-6">
              {/* Child Stats */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Current GPA</p>
                        <h3 className={`text-3xl font-bold ${getGradeColor(child.stats.currentGPA).split(' ')[0]}`}>
                          {child.stats.currentGPA.toFixed(1)}
                        </h3>
                        <p className="text-xs text-gray-500 mt-1">{getGradeLetter(child.stats.currentGPA)}</p>
                      </div>
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${getGradeColor(child.stats.currentGPA)}`}>
                        <GraduationCap className="h-6 w-6" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Attendance</p>
                        <h3 className="text-3xl font-bold text-gray-900">{child.stats.attendanceRate.toFixed(1)}%</h3>
                      </div>
                      <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>
                    <Progress value={child.stats.attendanceRate} className="mt-3 h-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500">Courses</p>
                        <h3 className="text-3xl font-bold text-gray-900">{child.stats.coursesEnrolled}</h3>
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
                        <p className="text-sm text-gray-500">Due Assignments</p>
                        <h3 className="text-3xl font-bold text-gray-900">{child.stats.assignmentsDue}</h3>
                      </div>
                      <div className="h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Clock className="h-6 w-6 text-orange-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Alerts */}
              {child.alerts.length > 0 && (
                <Card className="border-l-4 border-l-orange-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      Active Alerts
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {child.alerts.map((alert, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-orange-50">
                          {getAlertIcon(alert.type)}
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{alert.message}</p>
                            <p className="text-sm text-gray-500 mt-1">
                              {alert.type === 'grade_drop' && 'Academic Performance'}
                              {alert.type === 'attendance' && 'Attendance Concern'}
                              {alert.type === 'assignment' && 'Upcoming Deadline'}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Grades */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Recent Grades</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation('/parent/grades')}
                      >
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {child.recentGrades.length > 0 ? (
                      <div className="space-y-3">
                        {child.recentGrades.slice(0, 5).map((grade, idx) => (
                          <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{grade.assignmentTitle}</p>
                              <p className="text-sm text-gray-500">{grade.courseName}</p>
                            </div>
                            <div className="text-right">
                              <p className={`text-lg font-bold ${getGradeColor(grade.percentage).split(' ')[0]}`}>
                                {grade.percentage}%
                              </p>
                              <p className="text-xs text-gray-500">{grade.score}/{grade.maxScore}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No grades yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Upcoming Assignments */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Upcoming Assignments</CardTitle>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation(`/parent/assignments/${child.id}`)}
                      >
                        View All <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {child.upcomingAssignments.length > 0 ? (
                      <div className="space-y-3">
                        {child.upcomingAssignments.slice(0, 5).map((assignment) => (
                          <div key={assignment.id} className="flex items-start gap-3 p-3 rounded-lg border">
                            <div className={`mt-1 h-2 w-2 rounded-full ${
                              assignment.status === 'submitted' ? 'bg-green-500' : 'bg-orange-500'
                            }`} />
                            <div className="flex-1">
                              <p className="font-medium text-gray-900">{assignment.title}</p>
                              <p className="text-sm text-gray-500">{assignment.courseName}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium text-gray-700">
                                {new Date(assignment.dueDate).toLocaleDateString()}
                              </p>
                              <Badge variant={assignment.status === 'submitted' ? 'default' : 'secondary'} className="mt-1">
                                {assignment.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-8">No upcoming assignments</p>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col py-4 gap-2"
                      onClick={() => setLocation(`/parent/analytics/${child.id}`)}
                    >
                      <BarChart3 className="h-6 w-6 text-green-600" />
                      <span className="text-sm">Analytics</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col py-4 gap-2"
                      onClick={() => setLocation('/parent/grades')}
                    >
                      <Star className="h-6 w-6 text-yellow-600" />
                      <span className="text-sm">View Grades</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col py-4 gap-2"
                      onClick={() => setLocation('/parent/attendance')}
                    >
                      <Calendar className="h-6 w-6 text-blue-600" />
                      <span className="text-sm">Attendance</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="h-auto flex-col py-4 gap-2"
                      onClick={() => setLocation('/parent/messages')}
                    >
                      <MessageCircle className="h-6 w-6 text-purple-600" />
                      <span className="text-sm">Teachers</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>

        {/* Recent Activity - All Children */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across all your children</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboardData.recentActivity.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity, idx) => (
                  <div key={idx} className="flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${getSeverityColor(activity.severity)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        <span className="text-pink-600">{activity.childName}:</span> {activity.message}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(activity.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No recent activity</p>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
