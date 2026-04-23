import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { 
  Users, FileText, BarChart3, Calendar, MessageCircle, 
  Plus, BookOpen, ClipboardList, TrendingUp, Award,
  Clock, CheckCircle, AlertCircle, Star, Target,
  GraduationCap, Bell, Settings, Zap, Brain
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { 
  StatsCard, 
  ProgressWidget, 
  QuickActionCard, 
  AchievementBadge,
  ActivityFeed,
  ScheduleWidget,
  PerformanceOverview,
  QuickActionsPanel
} from "@/components/DashboardWidgets";
import { 
  ClassPerformanceChart, 
  StudentDistributionChart, 
  EngagementChart,
  PerformanceGauge 
} from "@/components/Charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { usePortalI18n } from '@/hooks/usePortalI18n';


// Mock data for demonstration - in real app this would come from API
const mockTeacherData = {
  overview: {
    totalClasses: 5,
    totalStudents: 147,
    pendingSubmissions: 23,
    unreadMessages: 8,
    averageClassGrade: 84.2,
    attendanceRate: 92.1
  },
  classes: [
    {
      id: '1',
      name: 'Algebra I',
      students: 28,
      nextClass: 'Today 9:00 AM',
      recentActivity: '3 new submissions',
      averageGrade: 84.2,
      attendanceRate: 92.5,
      color: 'blue' as const,
      room: 'Room 101'
    },
    {
      id: '2',
      name: 'Biology 101',
      students: 35,
      nextClass: 'Today 11:30 AM',
      recentActivity: '5 messages',
      averageGrade: 87.8,
      attendanceRate: 88.4,
      color: 'green' as const,
      room: 'Lab 203'
    },
    {
      id: '3',
      name: 'Chemistry',
      students: 22,
      nextClass: 'Tomorrow 2:00 PM',
      recentActivity: '2 pending grades',
      averageGrade: 79.3,
      attendanceRate: 85.2,
      color: 'purple' as const,
      room: 'Lab 105'
    },
    {
      id: '4',
      name: 'Physics Advanced',
      students: 19,
      nextClass: 'Wednesday 1:00 PM',
      recentActivity: '1 assignment due',
      averageGrade: 91.5,
      attendanceRate: 96.8,
      color: 'orange' as const,
      room: 'Room 301'
    }
  ],
  pendingTasks: [
    {
      id: '1',
      title: 'Grade Biology Lab Reports',
      description: '15 lab reports need grading',
      priority: 'high' as const,
      dueDate: 'Today, 5:00 PM',
      estimatedTime: '2 hours',
      type: 'grading' as const
    },
    {
      id: '2',
      title: 'Prepare Chemistry Quiz',
      description: 'Create quiz for next week',
      priority: 'medium' as const,
      dueDate: 'Tomorrow, 12:00 PM',
      estimatedTime: '1 hour',
      type: 'content' as const
    },
    {
      id: '3',
      title: 'Parent Conference - Sarah Johnson',
      description: 'Discuss student progress',
      priority: 'medium' as const,
      dueDate: 'Friday, 3:00 PM',
      estimatedTime: '30 minutes',
      type: 'meeting' as const
    },
    {
      id: '4',
      title: 'Update Course Materials',
      description: 'Upload new handouts to Physics',
      priority: 'low' as const,
      dueDate: 'Next Monday',
      estimatedTime: '45 minutes',
      type: 'content' as const
    }
  ],
  schedule: [
    {
      id: '1',
      title: 'Algebra I',
      time: '9:00 AM - 10:30 AM',
      type: 'class' as const,
      location: 'Room 101',
      color: 'blue' as const
    },
    {
      id: '2',
      title: 'Biology 101',
      time: '11:30 AM - 1:00 PM',
      type: 'class' as const,
      location: 'Lab 203',
      color: 'green' as const
    },
    {
      id: '3',
      title: 'Faculty Meeting',
      time: '3:00 PM - 4:00 PM',
      type: 'meeting' as const,
      location: 'Conference Room',
      color: 'purple' as const
    },
    {
      id: '4',
      title: 'Office Hours',
      time: '4:30 PM - 5:30 PM',
      type: 'office' as const,
      location: 'Office 205',
      color: 'orange' as const
    }
  ],
  recentStudents: [
    {
      id: '1',
      name: 'Sarah Johnson',
      class: 'Algebra I',
      status: 'excellent' as const,
      lastActivity: '2 hours ago',
      currentGrade: 92,
      avatar: ''
    },
    {
      id: '2',
      name: 'Mike Chen',
      class: 'Biology 101',
      status: 'good' as const,
      lastActivity: '1 day ago',
      currentGrade: 85,
      avatar: ''
    },
    {
      id: '3',
      name: 'Emma Davis',
      class: 'Chemistry',
      status: 'struggling' as const,
      lastActivity: '3 days ago',
      currentGrade: 72,
      avatar: ''
    },
    {
      id: '4',
      name: 'Alex Rodriguez',
      class: 'Physics Advanced',
      status: 'excellent' as const,
      lastActivity: '5 hours ago',
      currentGrade: 96,
      avatar: ''
    }
  ],
  performance: [
    { subject: 'Physics Advanced', score: 91.5, trend: 'up' as const, color: 'green' as const },
    { subject: 'Biology 101', score: 87.8, trend: 'up' as const, color: 'blue' as const },
    { subject: 'Algebra I', score: 84.2, trend: 'stable' as const, color: 'purple' as const },
    { subject: 'Chemistry', score: 79.3, trend: 'down' as const, color: 'orange' as const }
  ],
  achievements: [
    {
      title: 'Top Performer',
      description: 'Class average above 85%',
      icon: Award,
      earned: true,
      earnedDate: 'May 20, 2023',
      color: 'blue' as const
    },
    {
      title: 'Engagement Master',
      description: '95% student participation',
      icon: Users,
      earned: true,
      earnedDate: 'Oct 15, 2025',
      color: 'blue' as const
    },
    {
      title: 'Content Creator',
      description: 'Upload 50 teaching materials',
      icon: BookOpen,
      earned: false,
      color: 'green' as const
    },
    {
      title: 'Mentor',
      description: 'Help 10 struggling students',
      icon: GraduationCap,
      earned: false,
      color: 'blue' as const
    }
  ],
  activities: [
    {
      id: '1',
      type: 'submission' as const,
      title: 'New Assignment Submission',
      description: 'Sarah Johnson submitted Algebra homework',
      timestamp: '10 minutes ago',
      user: { name: 'Sarah Johnson' }
    },
    {
      id: '2',
      type: 'message' as const,
      title: 'New Message',
      description: 'Parent inquiry about Biology lab safety',
      timestamp: '25 minutes ago',
      user: { name: 'Mrs. Chen' }
    },
    {
      id: '3',
      type: 'grade' as const,
      title: 'Grade Posted',
      description: 'Chemistry quiz grades published',
      timestamp: '1 hour ago'
    },
    {
      id: '4',
      type: 'announcement' as const,
      title: 'Class Announcement',
      description: 'Physics lab schedule changed for next week',
      timestamp: '2 hours ago'
    }
  ],
  classPerformanceData: [
    { subject: 'Algebra I', averageGrade: 84, attendance: 92, engagement: 88 },
    { subject: 'Biology 101', averageGrade: 88, attendance: 89, engagement: 91 },
    { subject: 'Chemistry', averageGrade: 79, attendance: 85, engagement: 82 },
    { subject: 'Physics Advanced', averageGrade: 92, attendance: 97, engagement: 95 }
  ],
  gradeDistribution: [
    { grade: 'A (90-100)', count: 45, color: '#10b981' },
    { grade: 'B (80-89)', count: 62, color: '#3b82f6' },
    { grade: 'C (70-79)', count: 28, color: '#f59e0b' },
    { grade: 'D (60-69)', count: 12, color: '#ef4444' },
    { grade: 'F (0-59)', count: 3, color: '#6b7280' }
  ],
  weeklyEngagement: [
    { day: 'Mon', messagesSent: 23, assignmentsSubmitted: 45, forumPosts: 12 },
    { day: 'Tue', messagesSent: 28, assignmentsSubmitted: 52, forumPosts: 18 },
    { day: 'Wed', messagesSent: 31, assignmentsSubmitted: 48, forumPosts: 15 },
    { day: 'Thu', messagesSent: 26, assignmentsSubmitted: 41, forumPosts: 22 },
    { day: 'Fri', messagesSent: 19, assignmentsSubmitted: 38, forumPosts: 8 },
    { day: 'Sat', messagesSent: 8, assignmentsSubmitted: 15, forumPosts: 3 },
    { day: 'Sun', messagesSent: 12, assignmentsSubmitted: 22, forumPosts: 5 }
  ]
};

function ClassCard({ classItem }: { classItem: typeof mockTeacherData.classes[0] }) {
  return (
    <Card className="hover:shadow-lg transition-all duration-300 animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{classItem.name}</CardTitle>
            <p className="text-sm text-gray-600">
              {classItem.students} students • {classItem.room}
            </p>
          </div>
          <div className="text-right">
            <Badge variant="secondary" className="mb-1">
              Avg: {classItem.averageGrade}%
            </Badge>
            <p className="text-xs text-gray-500">
              {classItem.attendanceRate}% attendance
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              Next: {classItem.nextClass}
            </span>
          </div>
          <span className="text-green-600 font-medium">
            {classItem.recentActivity}
          </span>
        </div>
        
        <ProgressWidget
          title="Class Performance"
          current={classItem.averageGrade}
          total={100}
          color={classItem.color}
          showPercentage={true}
        />
        
        <div className="flex space-x-2">
          <Button size="sm" variant="outline" className="flex-1">
            <Users className="h-4 w-4 mr-1" />
            Students
          </Button>
          <Button size="sm" className="flex-1">
            <BarChart3 className="h-4 w-4 mr-1" />
            Analytics
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function TaskCard({ task }: { task: typeof mockTeacherData.pendingTasks[0] }) {
  const priorityColors = {
    high: 'bg-red-50 border-red-200 text-red-800',
    medium: 'bg-orange-50 border-orange-200 text-orange-800',
    low: 'bg-green-50 border-green-200 text-green-800'
  };

  const typeIcons = {
    grading: FileText,
    content: BookOpen,
    meeting: Users,
    admin: Settings
  };

  const TypeIcon = typeIcons[task.type] || FileText;

  return (
    <Card className={`hover:shadow-md transition-all duration-300 animate-slide-up ${priorityColors[task.priority]}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">{task.title}</h3>
            <p className="text-xs opacity-80">{task.description}</p>
          </div>
          <div className="flex items-center space-x-2">
            <TypeIcon className="h-4 w-4" />
            <Badge 
              variant={task.priority === 'high' ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {task.priority}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="opacity-75">Due:</span>
            <span className="font-medium">{task.dueDate}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="opacity-75">Est. Time:</span>
            <span className="font-medium">{task.estimatedTime}</span>
          </div>
        </div>
        
        <div className="flex space-x-2 mt-3">
          <Button size="sm" variant="outline" className="flex-1">
            <Clock className="h-3 w-3 mr-1" />
            Start
          </Button>
          <Button size="sm" className="flex-1">
            <CheckCircle className="h-3 w-3 mr-1" />
            Complete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StudentProgressCard({ student }: { student: typeof mockTeacherData.recentStudents[0] }) {
  const statusColors = {
    excellent: 'text-green-600 bg-green-50',
    good: 'text-blue-600 bg-blue-50',
    struggling: 'text-orange-600 bg-orange-50',
    'at-risk': 'text-red-600 bg-red-50'
  };

  return (
    <Card className="hover:shadow-md transition-all duration-300">
      <CardContent className="p-4">
        <div className="flex items-center space-x-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={student.avatar} alt={student.name} />
            <AvatarFallback className="bg-eduverse-blue text-white">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm text-gray-900 truncate">
              {student.name}
            </h3>
            <p className="text-xs text-gray-600">
              {student.class} • Grade: {student.currentGrade}%
            </p>
            <p className="text-xs text-gray-500">
              Last active: {student.lastActivity}
            </p>
          </div>
          <Badge className={`text-xs ${statusColors[student.status]}`}>
            {student.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnhancedTeacherDashboard() {
  const { t } = usePortalI18n("common");
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString());

  const [, setLocation] = useLocation();

  const quickActions = [
    {
      title: 'Grade Assignments',
      description: 'Review and grade submissions',
      icon: FileText,
      color: 'blue' as const,
      onClick: () => setLocation('/teacher/assignments'),
      badge: '23'
    },
    {
      title: 'Create Assignment',
      description: 'Create new homework or quiz',
      icon: Plus,
      color: 'green' as const,
      onClick: () => setLocation('/teacher/courses')
    },
    {
      title: 'Message Students',
      description: 'Send announcements or messages',
      icon: MessageCircle,
      color: 'purple' as const,
      onClick: () => setLocation('/teacher/communication'),
      badge: '5'
    },
    {
      title: 'View Analytics',
      description: 'Check class performance data',
      icon: BarChart3,
      color: 'orange' as const,
      onClick: () => setLocation('/teacher/analytics')
    }
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Header */}
        <div className="animate-fade-in">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.fullName?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600 mb-6">
            Here's what's happening with your classes today.
          </p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <StatsCard
            title="Total Classes"
            value={mockTeacherData.overview.totalClasses}
            icon={BookOpen}
            color="blue"
            trend={{ value: 5, isPositive: true }}
          />
          <StatsCard
            title="Total Students"
            value={mockTeacherData.overview.totalStudents}
            icon={Users}
            color="green"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Pending Tasks"
            value={mockTeacherData.overview.pendingSubmissions}
            icon={ClipboardList}
            color="orange"
            subtitle="Need attention"
          />
          <StatsCard
            title="Messages"
            value={mockTeacherData.overview.unreadMessages}
            icon={MessageCircle}
            color="purple"
            subtitle="Unread"
          />
          <StatsCard
            title="Class Average"
            value={`${mockTeacherData.overview.averageClassGrade}%`}
            icon={TrendingUp}
            color="green"
            trend={{ value: 3, isPositive: true }}
          />
          <StatsCard
            title="Attendance"
            value={`${mockTeacherData.overview.attendanceRate}%`}
            icon={Calendar}
            color="blue"
            trend={{ value: 2, isPositive: true }}
          />
        </div>

        {/* Main Content Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">My Classes</TabsTrigger>
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="tasks">Pending Tasks</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Quick Actions */}
                <QuickActionsPanel 
                  title="Quick Actions"
                  actions={quickActions}
                />

                {/* Recent Activity */}
                <ActivityFeed 
                  activities={mockTeacherData.activities}
                  maxItems={4}
                />
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Today's Schedule */}
                <ScheduleWidget
                  title="Today's Schedule"
                  items={mockTeacherData.schedule}
                  date={selectedDate}
                />

                {/* Class Performance */}
                <PerformanceOverview
                  title="Class Performance"
                  data={mockTeacherData.performance}
                />

                {/* Achievements */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Award className="h-5 w-5" />
                      <span>Teaching Achievements</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-3">
                      {mockTeacherData.achievements.map((achievement, index) => (
                        <AchievementBadge
                          key={achievement.title}
                          {...achievement}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Classes Tab */}
          <TabsContent value="classes" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                My Classes
              </h2>
              <Link href="/teacher/classes">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Class
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {mockTeacherData.classes.map(classItem => (
                <ClassCard key={classItem.id} classItem={classItem} />
              ))}
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Recent Student Activity
              </h2>
              <Link href="/teacher/students">
                <Button variant="outline">
                  <Users className="h-4 w-4 mr-2" />
                  View All Students
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {mockTeacherData.recentStudents.map(student => (
                <StudentProgressCard key={student.id} student={student} />
              ))}
            </div>
          </TabsContent>

          {/* Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Pending Tasks
              </h2>
              <div className="flex space-x-2">
                <Badge variant="destructive">
                  {mockTeacherData.pendingTasks.filter(t => t.priority === 'high').length} High Priority
                </Badge>
                <Badge variant="secondary">
                  {mockTeacherData.pendingTasks.length} Total
                </Badge>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockTeacherData.pendingTasks.map(task => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-gray-900">
                Class Analytics
              </h2>
              <Link href="/teacher/analytics">
                <Button variant="outline">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Detailed Analytics
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <ClassPerformanceChart 
                  data={mockTeacherData.classPerformanceData}
                  title="Class Performance Overview"
                />
                
                <EngagementChart 
                  data={mockTeacherData.weeklyEngagement}
                  title="Weekly Student Engagement"
                />
              </div>
              
              <div className="space-y-6">
                <PerformanceGauge 
                  data={{ 
                    score: Math.round(mockTeacherData.classPerformanceData.reduce((acc, curr) => acc + curr.averageGrade, 0) / mockTeacherData.classPerformanceData.length), 
                    label: 'Overall Performance' 
                  }}
                  title="Overall Class Performance"
                  color="#10b981"
                />
                
                <StudentDistributionChart 
                  data={mockTeacherData.gradeDistribution}
                  title="Grade Distribution"
                />
                
                <Card>
                  <CardHeader>
                    <CardTitle>Class Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {mockTeacherData.classes.map((classItem) => (
                      <div key={classItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-sm">{classItem.name}</p>
                          <p className="text-xs text-gray-600">
                            {classItem.students} students
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{classItem.averageGrade}%</p>
                          <p className="text-xs text-gray-500">average grade</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
