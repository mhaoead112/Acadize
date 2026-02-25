import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import AdminLayout from "@/components/AdminLayout";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
import {
  Users, Activity, BookOpen, AlertTriangle, Settings,
  UserCheck, Flag, BarChart3, ArrowUpRight, Target,
  RefreshCw, Monitor, TrendingUp, Zap, Bell, Award,
  FileText, Shield, CheckCircle, Loader2
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { UserGrowthChart } from "@/components/Charts";

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments?: number;
  recentSignups?: number;
  pendingReports?: number;
}

interface UserStats {
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  newUsersThisWeek: number;
  activeToday: number;
}

interface AnalyticsData {
  userGrowth: Array<{
    month: string;
    students: number;
    teachers: number;
    parents: number;
    total: number;
  }>;
  recentActivity: {
    assignments: number;
    submissions: number;
    announcements: number;
  };
  courseStats: {
    published: number;
    totalEnrollments: number;
  };
}

interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  context?: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: string;
  reporter?: {
    id: string;
    fullName: string;
    email: string;
  };
  reportedUser?: {
    id: string;
    fullName: string;
    email: string;
  };
}

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

const API_BASE = apiEndpoint('/api');

async function fetchWithAuth(url: string, token: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

export default function AdminDashboard() {
  const { t } = useTranslation('admin');
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch system stats
  const { data: systemStats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ['admin-stats'],
    queryFn: () => fetchWithAuth(`${API_BASE}/admin/stats`, token!),
    enabled: !!token,
  });

  // Fetch user stats
  const { data: userStats, isLoading: userStatsLoading } = useQuery<UserStats>({
    queryKey: ['admin-user-stats'],
    queryFn: () => fetchWithAuth(`${API_BASE}/admin/stats/users`, token!),
    enabled: !!token,
  });

  // Fetch analytics
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsData>({
    queryKey: ['admin-analytics'],
    queryFn: () => fetchWithAuth(`${API_BASE}/admin/analytics`, token!),
    enabled: !!token,
  });

  // Fetch reports
  const { data: reportsData, isLoading: reportsLoading, refetch: refetchReports } = useQuery({
    queryKey: ['admin-reports'],
    queryFn: () => fetchWithAuth(`${API_BASE}/admin/reports?status=pending&limit=6`, token!),
    enabled: !!token,
  });

  const isLoading = statsLoading || userStatsLoading;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-white/10 rounded-full animate-spin border-t-[#FFD700]" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading dashboard...</p>
        </div>
      </AdminLayout>
    );
  }

  const totalUsers = systemStats?.totalUsers || 0;
  const activePercentage = totalUsers > 0 ? Math.round(((systemStats?.activeUsers || 0) / totalUsers) * 100) : 0;

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 px-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
              {t('dashboardOverview')}
            </h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium">
              Welcome back, {user?.fullName?.split(' ')[0] || 'Admin'}! Monitor your platform metrics.
            </p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Users"
            value={systemStats?.totalUsers?.toLocaleString() || "0"}
            growth="+12%"
            icon="group"
            isPositive={true}
          />
          <StatCard
            label="Active Users"
            value={systemStats?.activeUsers?.toLocaleString() || "0"}
            growth="+5%"
            icon="check"  
            isPositive={true}
          />
          <StatCard
            label="Total Courses"
            value={systemStats?.totalCourses || "0"}
            growth="+3%"
            icon="school"
            isPositive={true}
          />
          <StatCard
            label="Pending Reports"
            value={systemStats?.pendingReports || "0"}
            growth="+2"
            icon="flag"
            isPositive={false}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recent Activity */}
            {analytics && (
              <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-[#FFD700]/20 p-3 rounded-xl text-[#FFD700]">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <CardTitle className="text-slate-900 dark:text-white">Recent Activity</CardTitle>
                        <CardDescription className="text-slate-600 dark:text-slate-400">Last 7 days</CardDescription>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" className="gap-2">
                      <RefreshCw className="h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-3 gap-4">
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-[#1e40af]/20 dark:to-[#1e40af]/10 border border-blue-200 dark:border-blue-500/30"
                    >
                      <FileText className="h-8 w-8 text-blue-600 dark:text-blue-400 mb-3" />
                      <p className="text-3xl font-black text-blue-900 dark:text-blue-200">{analytics.recentActivity.assignments}</p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 font-bold mt-1">New Assignments</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-[#15803d]/20 dark:to-[#15803d]/10 border border-green-200 dark:border-green-500/30"
                    >
                      <Award className="h-8 w-8 text-green-600 dark:text-green-400 mb-3" />
                      <p className="text-3xl font-black text-green-900 dark:text-green-200">{analytics.recentActivity.submissions}</p>
                      <p className="text-sm text-green-700 dark:text-green-300 font-bold mt-1">Submissions</p>
                    </motion.div>
                    <motion.div
                      whileHover={{ y: -2 }}
                      className="p-6 rounded-2xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-[#7c3aed]/20 dark:to-[#7c3aed]/10 border border-purple-200 dark:border-purple-500/30"
                    >
                      <Bell className="h-8 w-8 text-purple-600 dark:text-purple-400 mb-3" />
                      <p className="text-3xl font-black text-purple-900 dark:text-purple-200">{analytics.recentActivity.announcements}</p>
                      <p className="text-sm text-purple-700 dark:text-purple-300 font-bold mt-1">Announcements</p>
                    </motion.div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Engagement Chart */}
            <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
              <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFD700]/20 p-3 rounded-xl text-[#FFD700]">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-slate-900 dark:text-white">Engagement Trends</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">Weekly comparison</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {analytics && (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.userGrowth}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="month" stroke="#64748b" />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }} />
                        <Legend />
                        <Bar dataKey="students" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="teachers" fill="#10b981" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-6">
            {/* Popular Categories */}
            <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
              <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFD700]/20 p-3 rounded-xl text-[#FFD700]">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-slate-900 dark:text-white">User Distribution</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {userStats && (
                  <>
                    <div className="space-y-4">
                      {[
                        { label: 'Students', value: userStats.students, icon: '👨‍🎓', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                        { label: 'Teachers', icon: '👨‍🏫', value: userStats.teachers, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400' },
                        { label: 'Parents', icon: '👨‍👩‍👧', value: userStats.parents, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400' },
                        { label: 'Admins', icon: '👨‍💼', value: userStats.admins, color: 'bg-red-500/10 text-red-600 dark:text-red-400' },
                      ].map((item) => (
                        <motion.div
                          key={item.label}
                          whileHover={{ x: 4 }}
                          className={`p-3 rounded-xl ${item.color} border border-current/20 flex items-center justify-between`}
                        >
                          <span className="font-bold">{item.label}</span>
                          <span className="text-2xl font-black">{item.value}</span>
                        </motion.div>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200 dark:border-white/10">
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-xl bg-green-50 dark:bg-[#15803d]/20 border border-green-200 dark:border-green-500/30 text-center"
                      >
                        <p className="text-xl font-black text-green-900 dark:text-green-200">+{userStats.newUsersThisWeek}</p>
                        <p className="text-xs text-green-700 dark:text-green-300 font-bold">New this week</p>
                      </motion.div>
                      <motion.div
                        whileHover={{ y: -2 }}
                        className="p-3 rounded-xl bg-blue-50 dark:bg-[#1e40af]/20 border border-blue-200 dark:border-blue-500/30 text-center"
                      >
                        <p className="text-xl font-black text-blue-900 dark:text-blue-200">{userStats.activeToday}</p>
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-bold">Active today</p>
                      </motion.div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Infrastructure Health */}
            <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
              <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                <div className="flex items-center gap-3">
                  <div className="bg-[#FFD700]/20 p-3 rounded-xl text-[#FFD700]">
                    <Monitor className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-slate-900 dark:text-white">System Health</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-[#15803d]/20 border border-green-200 dark:border-green-500/30 rounded-xl">
                  <div>
                    <p className="font-black text-green-900 dark:text-green-200">All Systems</p>
                    <p className="text-xs text-green-700 dark:text-green-300 font-bold">Operational</p>
                  </div>
                  <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>

                <div className="space-y-3">
                  {[
                    { label: 'Uptime', value: 99.98, icon: '⬆️' },
                    { label: 'CPU Load', value: 14.2, icon: '⚙️' },
                    { label: 'Storage', value: 45, icon: '💾' },
                  ].map((item) => (
                    <motion.div
                      key={item.label}
                      className="space-y-1"
                    >
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-300 font-bold">{item.label}</span>
                        <span className="text-slate-900 dark:text-white font-black">{item.value}%</span>
                      </div>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: '100%' }}
                        transition={{ delay: 0.2, duration: 1 }}
                        className="h-2 bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden"
                      >
                        <div
                          className="h-full bg-gradient-to-r from-[#FFD700] to-yellow-500 rounded-full"
                          style={{ width: `${item.value}%` }}
                        />
                      </motion.div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs Section */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 p-1 rounded-2xl h-auto">
            <TabsTrigger value="overview" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#0a192f] rounded-xl py-2 font-black">
              Overview
            </TabsTrigger>
            <TabsTrigger value="analytics" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#0a192f] rounded-xl py-2 font-black">
              Analytics
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-[#FFD700] data-[state=active]:text-[#0a192f] rounded-xl py-2 font-black">
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            {/* Show main overview content above */}
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-300">Platform overview displayed above</p>
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {analyticsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
              </div>
            ) : analytics ? (
              <>
                <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                  <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                    <CardTitle className="text-slate-900 dark:text-white">User Growth Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <UserGrowthChart data={analytics.userGrowth} title="" />
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                    <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                      <CardTitle className="text-slate-900 dark:text-white text-sm">Published Courses</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-black text-[#FFD700]">{analytics.courseStats.published}</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                    <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                      <CardTitle className="text-slate-900 dark:text-white text-sm">Total Enrollments</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-black text-[#FFD700]">{analytics.courseStats.totalEnrollments}</p>
                    </CardContent>
                  </Card>
                  <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                    <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                      <CardTitle className="text-slate-900 dark:text-white text-sm">Growth Rate</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center">
                      <p className="text-4xl font-black text-[#FFD700]">+8.5%</p>
                    </CardContent>
                  </Card>
                </div>
              </>
            ) : null}
          </TabsContent>

          <TabsContent value="reports" className="space-y-6">
            {reportsLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" />
              </div>
            ) : (
              <Card className="border border-slate-200 dark:border-white/10 bg-white dark:bg-[#112240] rounded-[2rem] shadow-xl">
                <CardHeader className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0a192f]/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-slate-900 dark:text-white">
                      Pending Reports: {reportsData?.reports?.filter((r: Report) => r.status === 'pending').length || 0}
                    </CardTitle>
                    <Badge variant="outline">{reportsData?.reports?.length || 0} total</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  {reportsData?.reports?.length ? (
                    <div className="space-y-3">
                      {reportsData.reports.slice(0, 5).map((report: Report) => (
                        <motion.div
                          key={report.id}
                          whileHover={{ x: 4 }}
                          className="p-4 rounded-xl bg-slate-50 dark:bg-[#0a192f]/50 border border-slate-200 dark:border-white/10"
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-black text-slate-900 dark:text-white">{report.reason}</p>
                              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">{report.reportedUser?.fullName}</p>
                            </div>
                            <Badge variant={report.status === 'pending' ? 'destructive' : 'outline'}>
                              {report.status}
                            </Badge>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-slate-600 dark:text-slate-400">No reports</p>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function StatCard({
  label,
  value,
  growth,
  icon,
  isPositive,
}: {
  label: string;
  value: string | number;
  growth: string;
  icon: string;
  isPositive: boolean;
}) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 p-6 rounded-[2rem] flex flex-col justify-between group cursor-default transition-all hover:shadow-2xl hover:border-[#FFD700]/30"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="bg-[#FFD700]/10 p-3 rounded-2xl group-hover:bg-[#FFD700] group-hover:text-[#0a192f] transition-colors duration-300">
          <span className="material-symbols-outlined text-[#FFD700] group-hover:text-[#0a192f] text-xl">{icon}</span>
        </div>
        <span
          className={`text-[10px] font-black px-3 py-1 rounded-full border ${
            isPositive
              ? 'text-green-600 bg-green-100 dark:bg-green-950 dark:text-green-300 border-green-200 dark:border-green-800'
              : 'text-red-600 bg-red-100 dark:bg-red-950 dark:text-red-300 border-red-200 dark:border-red-800'
          }`}
        >
          {growth}
        </span>
      </div>
      <div>
        <p className="text-slate-600 dark:text-slate-400 text-sm font-bold uppercase tracking-wider">{label}</p>
        <h4 className="text-3xl font-black mt-1 text-slate-900 dark:text-white">{value}</h4>
      </div>
    </motion.div>
  );
}
