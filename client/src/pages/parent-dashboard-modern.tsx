import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Inline animation helper since framer-motion is not installed
const useStaggerAnimation = () => {
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);
  return isVisible;
};

interface ChildData {
  id: string;
  name: string;
  email: string;
  profilePicture?: string;
  stats: {
    progressPercentage: number;
    currentStreak: number;
    weeklyGoalHours: number;
    currentWeekHours: number;
    courses: number;
    assignments: number;
    totalScore: number;
    totalMaxScore: number;
    attendanceRate?: number;
  };
  recentGrades: Array<{
    course: string;
    grade: string;
    date: string;
  }>;
  upcomingAssignments: Array<{
    id: string;
    title: string;
    course: string;
    dueDate: string;
    status: string;
    isPlaceholder?: boolean;
  }>;
  alerts: Array<{
    type: 'warning' | 'success' | 'info';
    message: string;
  }>;
}

interface DashboardData {
  children: ChildData[];
  summary: {
    totalChildren: number;
    totalCourses: number;
    upcomingAssignments: number;
    averageProgress: number;
  };
  recentActivity: Array<{
    childName: string;
    action: string;
    timestamp: string;
  }>;
}

const parseGradeToPercent = (grade: string): number => {
  if (!grade) return 0;
  const numeric = parseFloat(grade.replace(/[^\d.]/g, ""));
  if (!Number.isNaN(numeric)) {
    return Math.min(Math.max(numeric, 0), 100);
  }

  const normalized = grade.trim().toUpperCase();
  const mapping: Record<string, number> = {
    "A+": 98,
    A: 95,
    "A-": 91,
    "B+": 88,
    B: 85,
    "B-": 82,
    "C+": 78,
    C: 75,
    "C-": 71,
    "D+": 68,
    D: 65,
    "D-": 61,
    F: 50
  };

  return mapping[normalized] ?? 0;
};

// GPA is not provided by the system; use assignment score percentages only

const buildCourseRows = (child?: ChildData) => {
  const palette = ["text-amber-400", "text-blue-400", "text-green-400", "text-purple-400"];
  const rows = (child?.recentGrades || []).map((grade, idx) => ({
    id: `${grade.course || "course"}-${idx}`,
    name: grade.course || "Course",
    instructor: grade.course ? `${grade.course} Instructor` : "Instructor",
    grade: grade.grade || "N/A",
    percentage: Math.round(parseGradeToPercent(grade.grade || "0")),
    color: palette[idx % palette.length],
    icon: "menu_book"
  }));

  if (rows.length) return rows;

  return [
    {
      id: "placeholder-course",
      name: "No courses yet",
      instructor: "—",
      grade: "N/A",
      percentage: 0,
      color: "text-slate-400",
      icon: "hourglass_empty",
      isPlaceholder: true
    }
  ];
};

const buildAssignmentTimeline = (child?: ChildData) => {
  const assignments = [...(child?.upcomingAssignments || [])]
    .map((assignment) => ({
      ...assignment,
      dueDate: assignment.dueDate || "No due date",
      subject: assignment.course || assignment.title,
      status: assignment.status || "pending"
    }))
    .sort((a, b) => {
      const timeA = new Date(a.dueDate).getTime();
      const timeB = new Date(b.dueDate).getTime();
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      return timeA - timeB;
    });

  if (assignments.length) return assignments;

  return [
    {
      id: "placeholder-assignment",
      title: "No assignments scheduled",
      course: "",
      subject: "",
      dueDate: "Pending updates",
      status: "none",
      isPlaceholder: true
    }
  ];
};

const buildActivityFeed = (activity?: DashboardData["recentActivity"]) => {
  const feed = (activity || []).map((item, idx) => ({
    id: `${item.childName || "activity"}-${idx}`,
    user: item.childName || "Student",
    description: item.action || "Activity update",
    time: item.timestamp || "",
    avatar: `https://picsum.photos/seed/${encodeURIComponent(item.childName || "school")}/100`
  }));

  if (feed.length) return feed;

  return [
    {
      id: "placeholder-activity",
      user: "Activity",
      description: "No recent activity",
      time: "",
      avatar: "https://picsum.photos/seed/school/100",
      isPlaceholder: true
    }
  ];
};

export default function ParentDashboardModern() {
  const { t } = useTranslation('parent');
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedTab, setSelectedTab] = useState<string>("0");
  const [loading, setLoading] = useState(true);
  const isVisible = useStaggerAnimation();

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  const fetchDashboardData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(apiEndpoint('/api/parent/dashboard/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const dashboardData = await response.json();
        
        // Normalize data to match student dashboard fields
        // Backend returns progress/streak data, we map to consistent naming
        const normalizedData = {
          children: (dashboardData.children || []).map((child: any) => ({
            ...child,
            stats: {
              progressPercentage: child.stats?.progressPercentage || 0,
              currentStreak: child.stats?.currentStreak || 0,
              weeklyGoalHours: child.stats?.weeklyGoalHours || 10,
              currentWeekHours: child.stats?.currentWeekHours || 0,
              courses: child.stats?.coursesEnrolled || child.stats?.courses || 0,
              assignments: child.stats?.assignmentsDue || child.stats?.assignments || 0,
              totalScore: child.stats?.totalScore || 0,
              totalMaxScore: child.stats?.totalMaxScore || 100
            },
            recentGrades: (child.recentGrades || []).map((g: any) => ({
              course: g.courseName || g.course || 'Unknown',
              grade: g.percentage ? `${g.percentage}%` : g.grade || 'N/A',
              date: g.gradedAt ? new Date(g.gradedAt).toLocaleDateString() : g.date || ''
            })),
            upcomingAssignments: (child.upcomingAssignments || []).map((a: any) => ({
              id: a.id,
              title: a.title,
              course: a.courseName || a.course || 'Unknown',
              dueDate: a.dueDate ? new Date(a.dueDate).toLocaleDateString() : '',
              status: a.status || 'pending'
            })),
            alerts: (child.alerts || []).map((alert: any) => ({
              type: alert.severity === 'warning' ? 'warning' : alert.severity === 'info' ? 'info' : 'success',
              message: alert.message
            }))
          })),
          summary: {
            totalChildren: dashboardData.summary?.totalChildren || 0,
            averageProgress: dashboardData.summary?.averageProgress || dashboardData.children?.reduce((sum: number, c: any) => sum + (c.stats?.progressPercentage || 0), 0) / (dashboardData.children?.length || 1) || 0,
            totalCourses: dashboardData.summary?.totalCourses || dashboardData.children?.reduce((sum: number, c: any) => sum + (c.stats?.coursesEnrolled || 0), 0) || 0,
            upcomingAssignments: dashboardData.summary?.upcomingAssignments || dashboardData.children?.reduce((sum: number, c: any) => sum + (c.stats?.assignmentsDue || 0), 0) || 0
          },
          recentActivity: (dashboardData.recentActivity || []).map((a: any) => ({
            childName: a.childName,
            action: a.message || a.action || '',
            timestamp: a.timestamp ? new Date(a.timestamp).toLocaleDateString() : ''
          }))
        };
        
        setData(normalizedData);
        if (normalizedData.children?.length > 0 && !selectedTab) {
          setSelectedTab("0");
        }
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!data?.children?.length) return;
    const index = Number(selectedTab) || 0;
    if (index >= data.children.length) {
      setSelectedTab("0");
    }
  }, [data, selectedTab]);

  const currentChildIndex = data?.children?.length ? Math.min(Number(selectedTab) || 0, data.children.length - 1) : 0;
  const currentChild = data?.children?.[currentChildIndex] || null;

  const handleCycleChild = () => {
    if (!data?.children?.length) return;
    const nextIndex = (currentChildIndex + 1) % data.children.length;
    setSelectedTab(nextIndex.toString());
  };

  // Average assignment score percentage based on totalScore/totalMaxScore
  const averageScore = currentChild
    ? Math.round(
        ((currentChild.stats?.totalScore || 0) /
          Math.max(currentChild.stats?.totalMaxScore || 100, 1)) * 100
      )
    : 0;
  const missingAssignments = (currentChild?.upcomingAssignments || []).filter((a) => (a.status || "pending") === "pending").length;

  const statsCards = [
    { label: "Average Score", value: `${averageScore}%`, sub: "Across assignments", icon: "trending_up", color: "text-primary" },
    { label: "Missing Assignments", value: missingAssignments.toString(), sub: missingAssignments > 0 ? "Action Required" : "All caught up", icon: "assignment_late", color: missingAssignments > 0 ? "text-red-500" : "text-slate-400" }
  ];

  const courseRows = buildCourseRows(currentChild || undefined);
  const assignmentTimeline = buildAssignmentTimeline(currentChild || undefined);
  const activityFeed = buildActivityFeed(data?.recentActivity);

  // Loading skeleton component
  const DashboardSkeleton = () => (
    <div className="space-y-6">
      {/* Header Skeleton */}
      <div className="rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 p-8">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-9 w-64 bg-white/20 mb-2" />
            <Skeleton className="h-5 w-48 bg-white/20" />
          </div>
          <Skeleton className="h-10 w-24 bg-white/20" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 bg-white/20 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-16 bg-white/20 mb-1" />
                  <Skeleton className="h-8 w-12 bg-white/20" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs Skeleton */}
      <Skeleton className="h-12 w-full bg-gradient-to-r from-purple-50 to-pink-50" />

      {/* Stats Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="border-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-5 w-5 rounded" />
              </div>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-20 mb-2" />
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Two Column Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i} className="border-2">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-3">
              {[...Array(3)].map((_, j) => (
                <div key={j} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-1" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions Skeleton */}
      <Card className="border-2 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <ParentLayout>
        <DashboardSkeleton />
      </ParentLayout>
    );
  }

  if (!data || data.children.length === 0) {
    return (
      <ParentLayout>
        <Card className="mt-8">
          <CardContent className="py-16 text-center">
            <Users className="h-20 w-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Children Linked</h3>
            <p className="text-gray-600 mb-6">
              Link your child's account to start monitoring their academic progress
            </p>
            <Button onClick={() => setLocation('/parent/children')} size="lg">
              <Users className="h-4 w-4 mr-2" />
              Link a Child
            </Button>
          </CardContent>
        </Card>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
      <div 
        className={`flex flex-col gap-8 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      >
        {/* Header */}
        <div className="flex flex-col gap-1 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h2
            className={`text-white text-4xl font-black tracking-tight font-display ${data.children.length > 1 ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
            onClick={data.children.length > 1 ? handleCycleChild : undefined}
            title={data.children.length > 1 ? "Click to view another child" : undefined}
          >
            Welcome back, {(currentChild?.name || "Parent").split(" ")[0]}
          </h2>
          <p className="text-slate-400 text-base">
            Here is an overview of {currentChild?.name || "your student"}'s academic progress for Fall 2023.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {statsCards.map((stat, i) => (
            <div
              key={stat.label}
              className="bg-navy-card/40 backdrop-blur-xl rounded-3xl p-6 border border-white/5 shadow-2xl group hover:border-primary/40 hover:-translate-y-1 hover:scale-[1.02] transition-all duration-300 cursor-default animate-in fade-in slide-in-from-bottom-4"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-2xl bg-slate-800/50 ${stat.color} shadow-inner`}>
                  <span className="material-symbols-outlined text-2xl">{stat.icon}</span>
                </div>
                {stat.label === "Missing Assignments" && missingAssignments > 0 && (
                  <span 
                    className="text-[10px] font-bold text-red-500 bg-red-500/10 px-2 py-1 rounded-full uppercase tracking-wider border border-red-500/20 animate-pulse"
                  >
                    Urgent
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm font-medium">{stat.label}</p>
              <h3 className="text-white text-5xl font-black mt-1 tabular-nums">{stat.value}</h3>
              <p className="text-slate-500 text-xs mt-2 font-medium">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: Courses & Activity */}
          <div className="lg:col-span-2 flex flex-col gap-6 animate-in fade-in slide-in-from-left-4 duration-700" style={{ animationDelay: '300ms' }}>
            <div className="bg-navy-card/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/5 p-6 bg-white/[0.02]">
                <h3 className="text-white text-xl font-bold font-display">Current Courses</h3>
                <button
                  className="text-sm font-bold text-primary hover:text-white transition-colors flex items-center gap-2"
                  onClick={() => setLocation('/parent/reports')}
                >
                  View Report Card
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.01] text-slate-500 text-[10px] uppercase font-bold tracking-widest">
                    <tr>
                      <th className="px-6 py-4">Subject</th>
                      <th className="px-6 py-4">Teacher</th>
                      <th className="px-6 py-4">Grade</th>
                      <th className="px-6 py-4 text-right">Trend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {courseRows.map((course) => (
                      <tr key={course.id} className="group hover:bg-white/[0.03] transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl bg-slate-800/50 ${course.color} border border-white/5`}>
                              <span className="material-symbols-outlined text-lg">{course.icon}</span>
                            </div>
                            <span className="font-bold text-white group-hover:text-primary transition-colors">{course.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-slate-400">{course.instructor}</td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${
                            course.percentage >= 90 ? 'bg-green-500/10 text-green-400 border border-green-500/10' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/10'
                          }`}>
                            {course.grade} ({course.percentage}%)
                          </span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <span className="material-symbols-outlined text-green-500/70">trending_up</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-navy-card/40 backdrop-blur-xl rounded-3xl border border-white/5 p-6 shadow-2xl">
              <h3 className="text-white text-xl font-bold mb-6 font-display">Recent Activity</h3>
              <div className="flex flex-col gap-4">
                {activityFeed.map((activity) => (
                  <div 
                    key={activity.id}
                    className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] hover:translate-x-1 transition-all cursor-pointer border border-white/5"
                  >
                    <div className="size-10 rounded-full bg-slate-700/50 overflow-hidden shrink-0 border border-white/10">
                      <img src={activity.avatar || 'https://picsum.photos/seed/school/100'} className="size-full object-cover" alt={activity.user} />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <p className="text-white font-bold text-sm">{activity.user}</p>
                        <p className="text-slate-500 text-[10px] font-medium">{activity.time}</p>
                      </div>
                      <p className="text-slate-400 text-sm mt-1 line-clamp-2 leading-relaxed">{activity.isPlaceholder ? t('toast.noRecentActivity') : activity.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Assignments */}
          <div className="bg-navy-card/40 backdrop-blur-xl rounded-3xl border border-white/5 shadow-2xl p-6 h-fit relative animate-in fade-in slide-in-from-right-4 duration-700" style={{ animationDelay: '400ms' }}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-white text-xl font-bold font-display">Assignments</h3>
              <div className="p-2 rounded-xl bg-white/[0.02] hover:bg-white/[0.08] cursor-pointer transition-colors">
                <span className="material-symbols-outlined text-slate-500 hover:text-white">calendar_month</span>
              </div>
            </div>
            <div className="relative pl-2 space-y-8">
              <div className="absolute left-[21px] top-2 bottom-4 w-[1px] bg-white/10"></div>
              {assignmentTimeline.map((item, idx) => (
                <div 
                  key={item.id} 
                  className="flex gap-5 relative group animate-in fade-in slide-in-from-left-2"
                  style={{ animationDelay: `${500 + idx * 100}ms` }}
                >
                  <div className={`z-10 size-10 rounded-2xl border border-white/5 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform ${
                    idx === 0 && !item.isPlaceholder ? 'bg-red-500/10 text-red-500' : 'bg-slate-800/80 text-slate-400'
                  }`}>
                    <span className="material-symbols-outlined text-lg">{idx === 0 && !item.isPlaceholder ? 'priority_high' : 'assignment'}</span>
                  </div>
                  <div className="flex flex-col">
                    {idx === 0 && !item.isPlaceholder && <span className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Due Tomorrow</span>}
                    <h4 className="text-white font-bold text-sm leading-tight group-hover:text-primary transition-colors">{item.isPlaceholder ? t('toast.noAssignmentsScheduled') : item.title}</h4>
                    <p className="text-slate-500 text-xs mt-1">{item.dueDate} • {item.subject || item.course || 'General'}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              className="mt-10 w-full rounded-2xl bg-primary py-4 text-sm font-black text-black transition-all hover:bg-yellow-400 hover:shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98]"
              onClick={() => setLocation(`/parent/assignments/${currentChild?.id || ''}`)}
            >
              View All Assignments
            </button>
          </div>
        </div>
      </div>
    </ParentLayout>
  );
}
