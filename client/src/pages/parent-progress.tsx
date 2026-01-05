import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from '@/lib/config';
import { 
  TrendingUp, Award, BookOpen, Target, 
  Calendar, Download, FileText, Activity
} from "lucide-react";

interface Child {
  id: string;
  fullName: string;
}

interface ProgressReport {
  student: {
    id: string;
    name: string;
    email: string;
  };
  overview: {
    averageScore: number;
    totalCourses: number;
    attendanceRate: number;
    averageProgress: number;
  };
  courses: Array<{
    title: string;
    teacher: string;
    score: number;
    progress: number;
    completedAssignments: number;
    totalAssignments: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    course: string;
    date: Date;
  }>;
}

export default function ParentProgress() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>("");
  const [report, setReport] = useState<ProgressReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchChildren();
  }, [token]);

  useEffect(() => {
    if (selectedChild) {
      fetchProgressReport();
    }
  }, [selectedChild, token]);

  const fetchChildren = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
        if (data.children?.length > 0 && !selectedChild) {
          setSelectedChild(data.children[0].id);
        }
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    }
  };

  const fetchProgressReport = async () => {
    if (!token || !selectedChild) return;

    try {
      setLoading(true);
      const response = await fetch(
        apiEndpoint(`/api/parent/children/${selectedChild}/progress`),
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }
      );

      if (response.ok) {
        const data = await response.json();
        setReport(data);
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching progress report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 80) return 'bg-blue-100 text-blue-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    if (score >= 60) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-pink-500 to-purple-700 p-6 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-3">
                  <TrendingUp className="h-7 w-7" />
                  Progress Report
                </h1>
                <p className="text-purple-100 mt-1">Comprehensive academic performance overview</p>
              </div>
              {children.length > 0 && (
                <Select value={selectedChild} onValueChange={setSelectedChild}>
                  <SelectTrigger className="w-64 bg-white/20 border-white/30 text-white hover:bg-white/30">
                    <SelectValue placeholder="Select child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem key={child.id} value={child.id}>
                        {child.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-8 text-gray-500">Loading progress report...</div>
        )}

        {/* Overview Stats */}
        {!loading && report && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-full"></div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Award className="h-8 w-8 text-purple-600" />
                    <span className="text-sm text-purple-600 font-medium">Avg Score</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{report.overview.averageScore?.toFixed(0) || 0}%</p>
                  <p className="text-sm text-gray-600 mt-1">across all classes</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full"></div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <BookOpen className="h-8 w-8 text-blue-600" />
                    <span className="text-sm text-blue-600 font-medium">Courses</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{report.overview.totalCourses}</p>
                  <p className="text-sm text-gray-600 mt-1">enrolled</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400/20 to-transparent rounded-bl-full"></div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Target className="h-8 w-8 text-green-600" />
                    <span className="text-sm text-green-600 font-medium">Attendance</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{report.overview.attendanceRate}%</p>
                  <p className="text-sm text-gray-600 mt-1">attendance rate</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-transparent rounded-bl-full"></div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <Activity className="h-8 w-8 text-amber-600" />
                    <span className="text-sm text-amber-600 font-medium">Progress</span>
                  </div>
                  <p className="text-3xl font-bold text-gray-900">{report.overview.averageProgress}%</p>
                  <p className="text-sm text-gray-600 mt-1">avg completion</p>
                </CardContent>
              </Card>
            </div>

            {/* Course Performance */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-purple-600" />
                  Course Performance
                </CardTitle>
                <CardDescription>Detailed breakdown of scores and progress</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {report.courses.map((course, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-4 p-4 border-2 rounded-xl hover:bg-purple-50/50 hover:border-purple-200 transition-all"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">{course.title}</h4>
                        <p className="text-sm text-gray-600">{course.teacher}</p>
                      </div>

                      <div className="text-center min-w-[80px]">
                        <Badge className={`${getScoreColor(course.score)} text-lg font-bold px-3 py-1 shadow-sm`}>
                          {course.score}%
                        </Badge>
                      </div>

                      <div className="w-48">
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-600">Progress</span>
                          <span className="font-semibold">{course.progress}%</span>
                        </div>
                        <Progress value={course.progress} className="h-2" />
                      </div>

                      <div className="text-right min-w-[100px]">
                        <p className="text-sm font-semibold text-gray-900">
                          {course.completedAssignments}/{course.totalAssignments}
                        </p>
                        <p className="text-xs text-gray-600">Assignments</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {report.recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {report.recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-4 p-3 border-l-4 border-purple-500 bg-gray-50 rounded"
                      >
                        <FileText className="h-5 w-5 text-purple-600" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{activity.title}</p>
                          <p className="text-sm text-gray-600">{activity.course}</p>
                        </div>
                        <span className="text-sm text-gray-500">{formatDate(activity.date)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No recent activity</p>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-4">
              <Button variant="outline" className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download Report (PDF)
              </Button>
              <Button onClick={() => setLocation(`/parent/courses`)}>
                <BookOpen className="h-4 w-4 mr-2" />
                View All Classes
              </Button>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
