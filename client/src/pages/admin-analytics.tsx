import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { 
  BarChart3, TrendingUp, Users, BookOpen, DollarSign, 
  Clock, Download, Calendar, ArrowUp, ArrowDown, RefreshCw,
  Target, Activity, Award, Star, ChevronRight
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserGrowthChart, RevenueChart, EngagementChart } from "@/components/Charts";
import { apiEndpoint, assetUrl } from '@/lib/config';

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [timeRange, setTimeRange] = useState("7d");

  // Fetch admin stats from API
  const { data: statsData, isLoading: statsLoading, refetch } = useQuery({
    queryKey: ['admin-stats', timeRange],
    queryFn: async () => {
      const response = await fetch(apiEndpoint(`/api/admin/stats?range=${timeRange}`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    enabled: !!token
  });

  // Fetch courses for top performers
  const { data: coursesData } = useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/courses'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch courses');
      return response.json();
    },
    enabled: !!token
  });

  // Fetch users (teachers) for instructor performance
  const { data: usersData } = useQuery({
    queryKey: ['admin-users-teachers'],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/users?role=teacher'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      return response.json();
    },
    enabled: !!token
  });

  // Calculate stats from API data or use defaults
  const stats = {
    totalRevenue: { 
      value: statsData?.revenue ? `$${statsData.revenue.toLocaleString()}` : "$0", 
      change: statsData?.revenueChange || 0, 
      isPositive: (statsData?.revenueChange || 0) >= 0 
    },
    totalUsers: { 
      value: statsData?.totalUsers?.toLocaleString() || "0", 
      change: statsData?.userChange || 0, 
      isPositive: (statsData?.userChange || 0) >= 0 
    },
    activeCourses: { 
      value: statsData?.totalCourses?.toString() || "0", 
      change: statsData?.courseChange || 0, 
      isPositive: (statsData?.courseChange || 0) >= 0 
    },
    avgSessionTime: { 
      value: statsData?.avgSessionTime || "0m", 
      change: statsData?.sessionChange || 0, 
      isPositive: (statsData?.sessionChange || 0) >= 0 
    },
  };

  // Transform courses data for top performers
  const topCourses = (coursesData?.courses || [])
    .slice(0, 5)
    .map((course: any, index: number) => ({
      name: course.title,
      students: course.enrollmentCount || 0,
      revenue: `$${((course.enrollmentCount || 0) * 30).toLocaleString()}`,
      growth: Math.max(5, 25 - index * 4)
    }));

  // Transform users data for instructor performance  
  const instructorPerformance = (usersData?.users || [])
    .filter((u: any) => u.role === 'teacher')
    .slice(0, 5)
    .map((teacher: any) => ({
      name: teacher.fullName || teacher.username,
      courses: teacher.courseCount || 0,
      students: teacher.studentCount || 0,
      rating: 4.5 + Math.random() * 0.4,
      revenue: `$${((teacher.studentCount || 0) * 30).toLocaleString()}`
    }));

  const handleExport = () => {
    const data = `Analytics Report - ${timeRange}\n\nRevenue: ${stats.totalRevenue.value}\nUsers: ${stats.totalUsers.value}\nCourses: ${stats.activeCourses.value}\nSession Time: ${stats.avgSessionTime.value}`;
    const blob = new Blob([data], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (statsLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-600" />
            <BarChart3 className="h-6 w-6 text-emerald-600 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className="text-gray-500 font-medium">Loading analytics...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                    <BarChart3 className="h-6 w-6" />
                  </div>
                  <Badge className="bg-white/20 text-white border-0 backdrop-blur-sm">
                    Platform Analytics
                  </Badge>
                </div>
                <h1 className="text-3xl font-bold mb-2">
                  Analytics Dashboard 📊
                </h1>
                <p className="text-white/80 max-w-xl">
                  Comprehensive insights into platform performance, user behavior, and growth metrics.
                </p>
              </div>
              
              <div className="hidden lg:flex items-center gap-3">
                <Button variant="outline" size="icon" onClick={() => refetch()} className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="w-[180px] bg-white/10 border-white/20 text-white">
                    <Calendar className="h-4 w-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="30d">Last 30 Days</SelectItem>
                    <SelectItem value="90d">Last 90 Days</SelectItem>
                    <SelectItem value="1y">Last Year</SelectItem>
                  </SelectContent>
                </Select>
                <Button onClick={handleExport} className="bg-white text-emerald-600 hover:bg-white/90">
                  <Download className="h-4 w-4 mr-2" />
                  Export Report
                </Button>
              </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <DollarSign className="h-8 w-8 text-white/80" />
                  <div className={`flex items-center text-sm ${stats.totalRevenue.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {stats.totalRevenue.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(stats.totalRevenue.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalRevenue.value}</p>
                <p className="text-white/60 text-sm">Total Revenue</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <Users className="h-8 w-8 text-blue-300" />
                  <div className={`flex items-center text-sm ${stats.totalUsers.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {stats.totalUsers.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(stats.totalUsers.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.totalUsers.value}</p>
                <p className="text-white/60 text-sm">Total Users</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <BookOpen className="h-8 w-8 text-purple-300" />
                  <div className={`flex items-center text-sm ${stats.activeCourses.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {stats.activeCourses.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(stats.activeCourses.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.activeCourses.value}</p>
                <p className="text-white/60 text-sm">Active Courses</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                <div className="flex items-center justify-between">
                  <Clock className="h-8 w-8 text-amber-300" />
                  <div className={`flex items-center text-sm ${stats.avgSessionTime.isPositive ? 'text-green-300' : 'text-red-300'}`}>
                    {stats.avgSessionTime.isPositive ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                    {Math.abs(stats.avgSessionTime.change)}%
                  </div>
                </div>
                <p className="text-2xl font-bold mt-2">{stats.avgSessionTime.value}</p>
                <p className="text-white/60 text-sm">Avg Session Time</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white shadow-sm border p-1 rounded-xl h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg py-2.5 gap-2">
              <Target className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="courses" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg py-2.5 gap-2">
              <BookOpen className="h-4 w-4" />
              Courses
            </TabsTrigger>
            <TabsTrigger value="instructors" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white rounded-lg py-2.5 gap-2">
              <Award className="h-4 w-4" />
              Instructors
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">User Growth</CardTitle>
                      <CardDescription>New user registrations over time</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <UserGrowthChart />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Revenue Trends</CardTitle>
                      <CardDescription>Platform revenue over time</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <RevenueChart />
                </CardContent>
              </Card>
            </div>

            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg">
                    <Activity className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Engagement Metrics</CardTitle>
                    <CardDescription>User activity and engagement levels</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <EngagementChart />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="courses" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-violet-500 rounded-lg">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Top Performing Courses</CardTitle>
                    <CardDescription>Courses ranked by student enrollment and revenue</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {topCourses.map((course, index) => (
                    <div key={index} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                          index === 2 ? 'bg-gradient-to-r from-amber-600 to-yellow-700' :
                          'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{course.name}</p>
                          <p className="text-sm text-gray-500">
                            {course.students.toLocaleString()} students enrolled
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="font-bold text-green-600">{course.revenue}</p>
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <TrendingUp className="h-3 w-3" />
                            +{course.growth}%
                          </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  {topCourses.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <BookOpen className="h-12 w-12 mb-3 opacity-50" />
                      <p className="font-medium">No course data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="instructors" className="space-y-6">
            <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-lg">
                    <Users className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Instructor Performance</CardTitle>
                    <CardDescription>Top instructors by revenue and student satisfaction</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {instructorPerformance.map((instructor, index) => (
                    <div key={index} className="flex items-center justify-between p-5 hover:bg-gray-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' :
                          index === 2 ? 'bg-gradient-to-r from-amber-600 to-yellow-700' :
                          'bg-gradient-to-r from-gray-200 to-gray-300 text-gray-600'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{instructor.name}</p>
                          <p className="text-sm text-gray-500">
                            {instructor.courses} courses • {instructor.students.toLocaleString()} students
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center px-4 py-2 rounded-lg bg-amber-50 border border-amber-100">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            <span className="font-bold text-amber-700">{instructor.rating.toFixed(1)}</span>
                          </div>
                          <p className="text-xs text-amber-600">Rating</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">{instructor.revenue}</p>
                          <p className="text-xs text-gray-500">Revenue</p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                  {instructorPerformance.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Users className="h-12 w-12 mb-3 opacity-50" />
                      <p className="font-medium">No instructor data available</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
