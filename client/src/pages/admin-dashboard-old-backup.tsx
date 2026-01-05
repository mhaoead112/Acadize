import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Users, Settings, BarChart3, Shield, FileText, 
  AlertTriangle, DollarSign, TrendingUp, Eye,
  UserCheck, UserX, BookOpen, MessageSquare,
  Flag, Monitor, Database, Calendar, Zap,
  Crown, Lock, CheckCircle, XCircle, Clock,
  Plus, Search, Filter, MoreVertical, Loader2
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  StatsCard, 
  ProgressWidget, 
  QuickActionCard, 
  ActivityFeed,
  PerformanceOverview,
  QuickActionsPanel
} from "@/components/DashboardWidgets";
import { 
  UserGrowthChart, 
  RevenueChart, 
  EngagementChart,
  PerformanceGauge 
} from "@/components/Charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AddUserModal from "@/components/modals/AddUserModal";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  totalCourses: number;
  totalEnrollments?: number;
  recentSignups?: number;
  pendingReports: number;
}

interface UserStats {
  students: number;
  teachers: number;
  parents: number;
  admins: number;
  newUsersThisWeek: number;
  activeToday: number;
}

interface User {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
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
  status: string;
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

// Fallback mock data
const mockAdminData = {
  systemOverview: {
    totalUsers: 2847,
    activeUsers: 2134,
    totalCourses: 156,
    totalRevenue: 284750,
    pendingReports: 12,
    systemUptime: 99.8
  },
  userStats: {
    students: 2156,
    teachers: 127,
    parents: 523,
    admins: 41,
    newUsersThisWeek: 89,
    activeToday: 1876
  },
  recentUsers: [
    {
      id: '1',
      name: 'Sarah Johnson',
      email: 'sarah.j@email.com',
      role: 'student',
      status: 'active',
      joinedDate: '2025-10-20',
      lastActive: '2 hours ago'
    },
    {
      id: '2',
      name: 'Dr. Michael Chen',
      email: 'mchen@email.com',
      role: 'teacher',
      status: 'active',
      joinedDate: '2025-09-15',
      lastActive: '1 hour ago'
    },
    {
      id: '3',
      name: 'Emily Davis',
      email: 'emily.d@email.com',
      role: 'parent',
      status: 'pending',
      joinedDate: '2025-10-23',
      lastActive: 'Never'
    },
    {
      id: '4',
      name: 'Alex Rodriguez',
      email: 'alex.r@email.com',
      role: 'student',
      status: 'suspended',
      joinedDate: '2025-08-12',
      lastActive: '3 days ago'
    }
  ],
  systemReports: [
    {
      id: '1',
      title: 'Inappropriate Content Report',
      type: 'content',
      priority: 'high',
      reporter: 'Jane Smith',
      reportedUser: 'Mike Wilson',
      description: 'Inappropriate language in discussion forum',
      createdAt: '2 hours ago',
      status: 'pending'
    },
    {
      id: '2',
      title: 'Spam Messages',
      type: 'spam',
      priority: 'medium',
      reporter: 'Tom Johnson',
      reportedUser: 'Bot Account',
      description: 'Multiple spam messages in group chat',
      createdAt: '5 hours ago',
      status: 'investigating'
    },
    {
      id: '3',
      title: 'Academic Misconduct',
      type: 'academic',
      priority: 'high',
      reporter: 'Dr. Sarah Lee',
      reportedUser: 'Student123',
      description: 'Suspected plagiarism in submitted assignment',
      createdAt: '1 day ago',
      status: 'resolved'
    }
  ],
  contentOverview: [
    {
      id: '1',
      title: 'Advanced Mathematics Course',
      type: 'course',
      creator: 'Dr. Johnson',
      students: 156,
      status: 'published',
      lastUpdated: '2 days ago'
    },
    {
      id: '2',
      title: 'Physics Lab Materials',
      type: 'materials',
      creator: 'Prof. Chen',
      downloads: 89,
      status: 'pending_review',
      lastUpdated: '1 day ago'
    },
    {
      id: '3',
      title: 'Biology Study Guide',
      type: 'resource',
      creator: 'Ms. Davis',
      views: 234,
      status: 'published',
      lastUpdated: '3 hours ago'
    }
  ],
  platformMetrics: [
    { category: 'User Engagement', score: 87, trend: 'up' as const },
    { category: 'Course Completion', score: 74, trend: 'up' as const },
    { category: 'Teacher Satisfaction', score: 92, trend: 'stable' as const },
    { category: 'Platform Performance', score: 95, trend: 'up' as const }
  ],
  recentActivities: [
    {
      id: '1',
      type: 'user_registration' as const,
      title: 'New User Registration',
      description: '15 new students registered today',
      timestamp: '1 hour ago'
    },
    {
      id: '2',
      type: 'system_update' as const,
      title: 'System Maintenance',
      description: 'Platform updated to version 2.4.1',
      timestamp: '3 hours ago'
    },
    {
      id: '3',
      type: 'security_alert' as const,
      title: 'Security Alert',
      description: 'Unusual login attempt blocked from IP 192.168.1.1',
      timestamp: '6 hours ago'
    },
    {
      id: '4',
      type: 'content_approval' as const,
      title: 'Content Approved',
      description: 'Physics course materials approved by review team',
      timestamp: '1 day ago'
    }
  ],
  userGrowthData: [
    { month: 'Jan', students: 1200, teachers: 45, parents: 380, total: 1625 },
    { month: 'Feb', students: 1350, teachers: 52, parents: 420, total: 1822 },
    { month: 'Mar', students: 1480, teachers: 58, parents: 465, total: 2003 },
    { month: 'Apr', students: 1620, teachers: 65, parents: 510, total: 2195 },
    { month: 'May', students: 1780, teachers: 72, parents: 555, total: 2407 },
    { month: 'Jun', students: 1950, teachers: 89, parents: 598, total: 2637 },
    { month: 'Jul', students: 2100, teachers: 98, parents: 630, total: 2828 },
    { month: 'Aug', students: 2200, teachers: 108, parents: 665, total: 2973 },
    { month: 'Sep', students: 2350, teachers: 115, parents: 695, total: 3160 },
    { month: 'Oct', students: 2456, teachers: 127, parents: 723, total: 3306 }
  ],
  revenueData: [
    { month: 'Jan', revenue: 45000, target: 50000 },
    { month: 'Feb', revenue: 52000, target: 55000 },
    { month: 'Mar', revenue: 48000, target: 60000 },
    { month: 'Apr', revenue: 65000, target: 65000 },
    { month: 'May', revenue: 72000, target: 70000 },
    { month: 'Jun', revenue: 78000, target: 75000 },
    { month: 'Jul', revenue: 85000, target: 80000 },
    { month: 'Aug', revenue: 92000, target: 85000 },
    { month: 'Sep', revenue: 88000, target: 90000 },
    { month: 'Oct', revenue: 96000, target: 95000 }
  ],
  systemEngagement: [
    { day: 'Mon', messagesSent: 456, assignmentsSubmitted: 234, forumPosts: 89 },
    { day: 'Tue', messagesSent: 523, assignmentsSubmitted: 287, forumPosts: 102 },
    { day: 'Wed', messagesSent: 487, assignmentsSubmitted: 301, forumPosts: 95 },
    { day: 'Thu', messagesSent: 601, assignmentsSubmitted: 276, forumPosts: 118 },
    { day: 'Fri', messagesSent: 389, assignmentsSubmitted: 198, forumPosts: 67 },
    { day: 'Sat', messagesSent: 156, assignmentsSubmitted: 89, forumPosts: 23 },
    { day: 'Sun', messagesSent: 234, assignmentsSubmitted: 134, forumPosts: 45 }
  ]
};

function UserManagementTable({ users }: { users: typeof mockAdminData.recentUsers }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [, setLocation] = useLocation();

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-50 text-red-700';
      case 'teacher': return 'bg-blue-50 text-blue-700';
      case 'student': return 'bg-green-50 text-green-700';
      case 'parent': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-50 text-green-700';
      case 'pending': return 'bg-yellow-50 text-yellow-700';
      case 'suspended': return 'bg-red-50 text-red-700';
      default: return 'bg-gray-50 text-gray-700';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>User Management</CardTitle>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add User
          </Button>
        </div>
        <div className="flex space-x-4 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="student">Student</SelectItem>
              <SelectItem value="teacher">Teacher</SelectItem>
              <SelectItem value="parent">Parent</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge className={`text-xs ${getStatusColor(user.status)}`}>
                    {user.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{user.joinedDate}</TableCell>
                <TableCell className="text-sm">{user.lastActive}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setLocation(`/admin/users/${user.id}`)}>
                        View Profile
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/admin/users/${user.id}/permissions`)}>
                        Edit Permissions
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setLocation(`/messages?user=${user.id}`)}>
                        Send Message
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => {
                          if (confirm(`Are you sure you want to suspend ${user.name}?`)) {
                            // TODO: Implement suspend user API call
                            console.log('Suspend user:', user.id);
                          }
                        }}
                      >
                        Suspend User
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ReportCard({ report }: { report: typeof mockAdminData.systemReports[0] }) {
  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    low: 'bg-green-50 border-green-200 text-green-800'
  };

  const statusColors = {
    pending: 'bg-yellow-50 text-yellow-700',
    investigating: 'bg-blue-50 text-blue-700',
    resolved: 'bg-green-50 text-green-700'
  };

  return (
    <Card className={`hover:shadow-md transition-all duration-300 ${priorityColors[report.priority as keyof typeof priorityColors]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{report.title}</h3>
            <p className="text-xs opacity-80 mb-2">{report.description}</p>
            <div className="flex items-center space-x-2 text-xs">
              <span>Reported by: {report.reporter}</span>
              <span>•</span>
              <span>Target: {report.reportedUser}</span>
            </div>
          </div>
          <div className="flex flex-col items-end space-y-1">
            <Badge className={`text-xs ${statusColors[report.status as keyof typeof statusColors]}`}>
              {report.status}
            </Badge>
            <span className="text-xs text-gray-500">{report.createdAt}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Eye className="h-3 w-3 mr-1" />
            View
          </Button>
          <Button size="sm" className="flex-1">
            <Shield className="h-3 w-3 mr-1" />
            Take Action
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('overview');

  const [, setLocation] = useLocation();
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);

  const quickActions = [
    {
      title: 'Add New User',
      description: 'Create student, teacher, or admin accounts',
      icon: UserCheck,
      color: 'blue' as const,
      onClick: () => setIsAddUserModalOpen(true)
    },
    {
      title: 'Review Reports',
      description: 'Handle moderation reports',
      icon: Flag,
      color: 'red' as const,
      onClick: () => setLocation('/admin/reports'),
      badge: '12'
    },
    {
      title: 'System Settings',
      description: 'Configure platform settings',
      icon: Settings,
      color: 'purple' as const,
      onClick: () => setLocation('/admin/settings')
    },
    {
      title: 'View Analytics',
      description: 'Platform usage and performance',
      icon: BarChart3,
      color: 'green' as const,
      onClick: () => setLocation('/admin/analytics')
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Admin Dashboard 🛡️
          </h1>
          <p className="text-gray-600 mb-6">
            Monitor and manage the EduVerse platform with comprehensive administrative tools.
          </p>
        </div>

        {/* System Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatsCard
            title="Total Users"
            value={mockAdminData.systemOverview.totalUsers.toLocaleString()}
            icon={Users}
            color="blue"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Active Users"
            value={mockAdminData.systemOverview.activeUsers.toLocaleString()}
            icon={UserCheck}
            color="green"
            trend={{ value: 8, isPositive: true }}
          />
          <StatsCard
            title="Total Courses"
            value={mockAdminData.systemOverview.totalCourses}
            icon={BookOpen}
            color="purple"
            trend={{ value: 15, isPositive: true }}
          />
          <StatsCard
            title="Revenue"
            value={`$${mockAdminData.systemOverview.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="green"
            trend={{ value: 23, isPositive: true }}
          />
          <StatsCard
            title="Pending Reports"
            value={mockAdminData.systemOverview.pendingReports}
            icon={AlertTriangle}
            color="red"
            subtitle="Need attention"
          />
          <StatsCard
            title="System Uptime"
            value={`${mockAdminData.systemOverview.systemUptime}%`}
            icon={Monitor}
            color="green"
            trend={{ value: 0.2, isPositive: true }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <QuickActionsPanel 
                  title="Admin Quick Actions"
                  actions={quickActions}
                />

                {/* Recent Activity */}
                <ActivityFeed 
                  activities={mockAdminData.recentActivities}
                  maxItems={4}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* User Statistics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>User Breakdown</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Students</span>
                        <Badge variant="secondary">{mockAdminData.userStats.students}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Teachers</span>
                        <Badge variant="secondary">{mockAdminData.userStats.teachers}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Parents</span>
                        <Badge variant="secondary">{mockAdminData.userStats.parents}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Admins</span>
                        <Badge variant="secondary">{mockAdminData.userStats.admins}</Badge>
                      </div>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-green-600">New this week:</span>
                        <span className="font-medium">{mockAdminData.userStats.newUsersThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-blue-600">Active today:</span>
                        <span className="font-medium">{mockAdminData.userStats.activeToday}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Platform Performance */}
                <PerformanceOverview
                  title="Platform Metrics"
                  data={mockAdminData.platformMetrics}
                />
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <UserManagementTable users={mockAdminData.recentUsers} />
          </TabsContent>

          {/* Content Tab */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Content Management</CardTitle>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Content
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAdminData.contentOverview.map((content) => (
                    <div key={content.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-blue-100 rounded-lg">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium text-sm">{content.title}</h3>
                          <p className="text-xs text-gray-600">
                            by {content.creator} • {content.lastUpdated}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge className="text-xs">
                          {content.type}
                        </Badge>
                        <Badge 
                          className={`text-xs ${
                            content.status === 'published' 
                              ? 'bg-green-50 text-green-700'
                              : 'bg-yellow-50 text-yellow-700'
                          }`}
                        >
                          {content.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Moderation Reports
              </h2>
              <div className="flex space-x-2">
                <Badge variant="destructive">
                  {mockAdminData.systemReports.filter(r => r.priority === 'high').length} High Priority
                </Badge>
                <Badge variant="secondary">
                  {mockAdminData.systemReports.filter(r => r.status === 'pending').length} Pending
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockAdminData.systemReports.map(report => (
                <ReportCard key={report.id} report={report} />
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                System Analytics
              </h2>
              <Button variant="outline">
                <BarChart3 className="h-4 w-4 mr-2" />
                Export Report
              </Button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <UserGrowthChart 
                  data={mockAdminData.userGrowthData}
                  title="User Growth Over Time"
                />
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RevenueChart 
                    data={mockAdminData.revenueData}
                    title="Revenue vs Target"
                  />
                  
                  <EngagementChart 
                    data={mockAdminData.systemEngagement}
                    title="Daily Platform Engagement"
                  />
                </div>
              </div>
              
              <div className="space-y-6">
                <PerformanceGauge 
                  data={{ 
                    score: Math.round(mockAdminData.platformMetrics.reduce((acc, curr) => acc + curr.score, 0) / mockAdminData.platformMetrics.length), 
                    label: 'System Health' 
                  }}
                  title="Overall Platform Health"
                  color="#10b981"
                />
                
                <PerformanceOverview
                  title="Platform Metrics"
                  data={mockAdminData.platformMetrics}
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Usage Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <p className="text-2xl font-bold text-blue-600">
                          {mockAdminData.userStats.activeToday}
                        </p>
                        <p className="text-sm text-gray-600">Daily Active Users</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {mockAdminData.userStats.newUsersThisWeek}
                        </p>
                        <p className="text-sm text-gray-600">New Users This Week</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-lg">
                        <p className="text-2xl font-bold text-purple-600">
                          {mockAdminData.systemOverview.systemUptime}%
                        </p>
                        <p className="text-sm text-gray-600">System Uptime</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              System Settings
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5" />
                    <span>Security Settings</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Two-Factor Authentication</span>
                    <Badge className="bg-green-50 text-green-700">
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Password Policy</span>
                    <Badge className="bg-green-50 text-green-700">
                      Strong
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Session Timeout</span>
                    <span className="text-sm text-gray-600">24 hours</span>
                  </div>
                  <Button className="w-full mt-4">
                    <Settings className="h-4 w-4 mr-2" />
                    Configure Security
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Database className="h-5 w-5" />
                    <span>System Maintenance</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Database Status</span>
                    <Badge className="bg-green-50 text-green-700">
                      Healthy
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Last Backup</span>
                    <span className="text-sm text-gray-600">2 hours ago</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">System Version</span>
                    <span className="text-sm text-gray-600">v2.4.1</span>
                  </div>
                  <Button className="w-full mt-4" variant="outline">
                    <Monitor className="h-4 w-4 mr-2" />
                    System Diagnostics
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add User Modal */}
      <AddUserModal 
        isOpen={isAddUserModalOpen} 
        onClose={() => setIsAddUserModalOpen(false)} 
      />
    </DashboardLayout>
  );
}
