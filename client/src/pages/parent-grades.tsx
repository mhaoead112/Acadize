import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useSearch } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { 
  TrendingUp, TrendingDown, BookOpen, Award, 
  Star, BarChart3, Calendar, Download, Filter
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface Child {
  id: number;
  name: string;
  profilePicture?: string;
}

interface CourseGrade {
  id: number;
  courseName: string;
  instructor: string;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
  assignments: {
    name: string;
    score: number; // Percentage score
    date: string;
    weight: number;
  }[];
}

export default function ParentGrades() {
  const { t } = useTranslation('parent');
  const { user, token } = useAuth();
  const [, setLocation] = useLocation();
  const searchParams = new URLSearchParams(window.location.search);
  const childIdParam = searchParams.get('child');
  
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<string>(childIdParam || "");
  const [grades, setGrades] = useState<CourseGrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("current");

  useEffect(() => {
    fetchData();
  }, [token, selectedChild]);

  const fetchData = async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    
    try {
      // Fetch children
      const childrenResponse = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (childrenResponse.ok) {
        const childrenData = await childrenResponse.json();
        const mappedChildren = (childrenData.children || []).map((child: any) => ({
          id: child.id,
          name: child.fullName || child.name || 'Unknown',
          profilePicture: child.profilePicture
        }));
        setChildren(mappedChildren);
        if (!selectedChild && mappedChildren.length > 0) {
          setSelectedChild(mappedChildren[0].id.toString());
        }
      } else if (childrenResponse.status === 401) {
        console.error('Authentication failed - redirecting to login');
        setLocation('/login');
        return;
      } else {
        // Demo children
        setChildren([
          { id: 1, name: "Emma Johnson" },
          { id: 2, name: "Liam Johnson" }
        ]);
        if (!selectedChild) setSelectedChild("1");
      }

      // Fetch grades for selected child
      if (selectedChild) {
        const gradesResponse = await fetch(apiEndpoint(`/api/parent/children/${selectedChild}/grades`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (gradesResponse.ok) {
          const gradesData = await gradesResponse.json();
          // Handle various response formats
          const gradesArray = Array.isArray(gradesData) 
            ? gradesData 
            : Array.isArray(gradesData.grades) 
              ? gradesData.grades 
              : [];
          setGrades(gradesArray);
        } else if (gradesResponse.status === 401) {
          console.error('Authentication failed - redirecting to login');
          setLocation('/login');
          return;
        } else {
          // Demo grades with percentage scores
          setGrades([
            {
              id: 1,
              courseName: "Mathematics",
              instructor: "Mr. Anderson",
              percentage: 92,
              trend: 'up',
              lastUpdated: "2 days ago",
              assignments: [
                { name: "Quiz 5: Algebra", score: 95, date: "Nov 28", weight: 10 },
                { name: "Homework 12", score: 90, date: "Nov 25", weight: 5 },
                { name: "Midterm Exam", score: 88, date: "Nov 15", weight: 25 }
              ]
            },
            {
              id: 2,
              courseName: "English Literature",
              instructor: "Ms. Roberts",
              percentage: 95,
              trend: 'stable',
              lastUpdated: "1 day ago",
              assignments: [
                { name: "Essay: Shakespeare Analysis", score: 96, date: "Nov 29", weight: 20 },
                { name: "Reading Quiz 8", score: 98, date: "Nov 22", weight: 5 }
              ]
            },
            {
              id: 3,
              courseName: "Science",
              instructor: "Dr. Smith",
              percentage: 87,
              trend: 'up',
              lastUpdated: "3 days ago",
              assignments: [
                { name: "Lab Report 4", score: 91, date: "Nov 27", weight: 15 },
                { name: "Quiz: Chemistry", score: 82, date: "Nov 20", weight: 10 }
              ]
            },
            {
              id: 4,
              courseName: "History",
              instructor: "Mr. Brown",
              percentage: 91,
              trend: 'down',
              lastUpdated: "1 week ago",
              assignments: [
                { name: "Research Paper", score: 90, date: "Nov 24", weight: 25 },
                { name: "Quiz: World War II", score: 85, date: "Nov 18", weight: 10 }
              ]
            }
          ]);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 60) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <div className="h-4 w-4 rounded-full bg-gray-300" />;
  };

  const calculateAverageScore = () => {
    if (!Array.isArray(grades) || grades.length === 0) return null;
    const validGrades = grades.filter(g => typeof g.percentage === 'number');
    if (validGrades.length === 0) return null;
    return Math.round(validGrades.reduce((acc, g) => acc + g.percentage, 0) / validGrades.length);
  };

  const selectedChildName = children.find(c => c.id.toString() === selectedChild)?.name || "Child";

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <div className="flex gap-3">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-36" />
            </div>
          </div>

          {/* Stats Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-16 mb-2" />
                      <Skeleton className="h-9 w-12" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Courses Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-8 w-12" />
                  </div>
                  <Skeleton className="h-2 w-full mb-2" />
                  <Skeleton className="h-3 w-24" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

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
                  <Award className="h-7 w-7" />
                  {t('gradeReports')}
                </h1>
                <p className="text-purple-100 mt-1">View {selectedChildName}'s detailed academic performance</p>
              </div>
              <div className="flex gap-3">
                {children.length > 1 && (
                  <Select value={selectedChild} onValueChange={setSelectedChild}>
                    <SelectTrigger className="w-48 bg-white/20 border-white/30 text-white hover:bg-white/30">
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.id.toString()}>
                          {child.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Button variant="secondary" className="bg-white/20 hover:bg-white/30 border-white/30 text-white">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-green-400/20 to-transparent rounded-bl-full"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Average Score</p>
                  <h3 className="text-3xl font-bold text-green-600">{calculateAverageScore() !== null ? `${calculateAverageScore()}%` : 'N/A'}</h3>
                </div>
                <Award className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-400/20 to-transparent rounded-bl-full"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Courses</p>
                  <h3 className="text-3xl font-bold text-blue-600">{Array.isArray(grades) ? grades.length : 0}</h3>
                </div>
                <BookOpen className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-transparent rounded-bl-full"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Highest Score</p>
                  <h3 className="text-3xl font-bold text-purple-600">
                    {Array.isArray(grades) && grades.length > 0 ? `${Math.round(grades.reduce((max, g) => g.percentage > max.percentage ? g : max).percentage)}%` : "N/A"}
                  </h3>
                </div>
                <Star className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:shadow-lg transition-all hover:scale-105">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/20 to-transparent rounded-bl-full"></div>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Improving</p>
                  <h3 className="text-3xl font-bold text-orange-600">
                    {Array.isArray(grades) ? grades.filter(g => g.trend === 'up').length : 0}
                  </h3>
                </div>
                <TrendingUp className="h-10 w-10 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Course Grades */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="details">Detailed View</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {grades.map((course) => (
                <Card key={course.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{course.courseName}</h3>
                        <p className="text-sm text-gray-500">{course.instructor}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getScoreColor(course.percentage)} border-0 text-lg font-bold px-3 py-1`}>
                          {course.percentage}%
                        </Badge>
                        {getTrendIcon(course.trend)}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Progress</span>
                        <span className="font-medium">{course.percentage}%</span>
                      </div>
                      <Progress value={course.percentage} className="h-2" />
                    </div>
                    <p className="text-xs text-gray-400 mt-3">Last updated: {course.lastUpdated}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-4">
            {grades.map((course) => (
              <Card key={course.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{course.courseName}</CardTitle>
                      <CardDescription>{course.instructor}</CardDescription>
                    </div>
                    <Badge className={`${getScoreColor(course.percentage)} border-0 text-xl font-bold px-4 py-2`}>
                      {course.percentage}%
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <h4 className="font-medium text-gray-700 mb-3">Recent Assignments</h4>
                  <div className="space-y-3">
                    {course.assignments.map((assignment, idx) => (
                      <div key={`${assignment.name}-${assignment.date}-${idx}`} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{assignment.name}</p>
                          <p className="text-sm text-gray-500">{assignment.date} • Weight: {assignment.weight}%</p>
                        </div>
                        <Badge className={`${getScoreColor(assignment.score || 0)} border-0`}>
                          {assignment.score ? `${assignment.score}%` : 'N/A'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
