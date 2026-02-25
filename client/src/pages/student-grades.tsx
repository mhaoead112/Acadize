import { useState } from "react";
import { useTranslation } from "react-i18next";
import StudentLayout from "@/components/StudentLayout";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Trophy, TrendingUp, TrendingDown, Award, BookOpen,
  Calendar, ChevronDown, ChevronUp, Download, Eye
} from "lucide-react";

interface CourseGrade {
  id: string;
  course: string;
  teacher: string;
  currentGrade: number;
  letterGrade: string;
  credits: number;
  trend: 'up' | 'down' | 'stable';
  assignments: {
    total: number;
    completed: number;
    pending: number;
  };
  breakdown: {
    homework: { weight: number; score: number };
    quizzes: { weight: number; score: number };
    exams: { weight: number; score: number };
    projects: { weight: number; score: number };
  };
}

interface GradeHistory {
  date: string;
  assignment: string;
  course: string;
  points: number;
  maxPoints: number;
  percentage: number;
  letterGrade: string;
}

const mockCourseGrades: CourseGrade[] = [
  {
    id: '1',
    course: 'Advanced Mathematics',
    teacher: 'Dr. Johnson',
    currentGrade: 95,
    letterGrade: 'A',
    credits: 4,
    trend: 'up',
    assignments: { total: 25, completed: 22, pending: 3 },
    breakdown: {
      homework: { weight: 30, score: 96 },
      quizzes: { weight: 20, score: 94 },
      exams: { weight: 40, score: 95 },
      projects: { weight: 10, score: 98 }
    }
  },
  {
    id: '2',
    course: 'Physics Laboratory',
    teacher: 'Prof. Anderson',
    currentGrade: 88,
    letterGrade: 'B+',
    credits: 3,
    trend: 'stable',
    assignments: { total: 18, completed: 15, pending: 3 },
    breakdown: {
      homework: { weight: 25, score: 85 },
      quizzes: { weight: 25, score: 90 },
      exams: { weight: 35, score: 87 },
      projects: { weight: 15, score: 92 }
    }
  },
  {
    id: '3',
    course: 'English Literature',
    teacher: 'Ms. Williams',
    currentGrade: 92,
    letterGrade: 'A-',
    credits: 3,
    trend: 'up',
    assignments: { total: 20, completed: 18, pending: 2 },
    breakdown: {
      homework: { weight: 20, score: 90 },
      quizzes: { weight: 15, score: 91 },
      exams: { weight: 50, score: 93 },
      projects: { weight: 15, score: 94 }
    }
  },
  {
    id: '4',
    course: 'Computer Science',
    teacher: 'Dr. Chen',
    currentGrade: 97,
    letterGrade: 'A+',
    credits: 4,
    trend: 'up',
    assignments: { total: 22, completed: 20, pending: 2 },
    breakdown: {
      homework: { weight: 20, score: 98 },
      quizzes: { weight: 20, score: 95 },
      exams: { weight: 30, score: 97 },
      projects: { weight: 30, score: 99 }
    }
  },
  {
    id: '5',
    course: 'Chemistry',
    teacher: 'Prof. Martinez',
    currentGrade: 84,
    letterGrade: 'B',
    credits: 4,
    trend: 'down',
    assignments: { total: 24, completed: 21, pending: 3 },
    breakdown: {
      homework: { weight: 25, score: 82 },
      quizzes: { weight: 30, score: 85 },
      exams: { weight: 40, score: 83 },
      projects: { weight: 5, score: 90 }
    }
  },
  {
    id: '6',
    course: 'World History',
    teacher: 'Mr. Thompson',
    currentGrade: 90,
    letterGrade: 'A-',
    credits: 3,
    trend: 'stable',
    assignments: { total: 16, completed: 14, pending: 2 },
    breakdown: {
      homework: { weight: 30, score: 88 },
      quizzes: { weight: 25, score: 91 },
      exams: { weight: 35, score: 90 },
      projects: { weight: 10, score: 95 }
    }
  }
];

const mockGradeHistory: GradeHistory[] = [
  {
    date: '2024-01-15',
    assignment: 'Calculus Problem Set #5',
    course: 'Advanced Mathematics',
    points: 95,
    maxPoints: 100,
    percentage: 95,
    letterGrade: 'A'
  },
  {
    date: '2024-01-14',
    assignment: 'Lab Report: Electromagnetic Waves',
    course: 'Physics Laboratory',
    points: 140,
    maxPoints: 150,
    percentage: 93,
    letterGrade: 'A'
  },
  {
    date: '2024-01-12',
    assignment: 'Programming Project',
    course: 'Computer Science',
    points: 195,
    maxPoints: 200,
    percentage: 97.5,
    letterGrade: 'A+'
  }
];

function getGradeColor(percentage: number) {
  if (percentage >= 90) return 'text-green-600 bg-green-50 border-green-200';
  if (percentage >= 80) return 'text-blue-600 bg-blue-50 border-blue-200';
  if (percentage >= 70) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
  return 'text-red-600 bg-red-50 border-red-200';
}

function CourseGradeCard({ course, expanded, onToggle }: { 
  course: CourseGrade; 
  expanded: boolean;
  onToggle: () => void;
}) {
  const TrendIcon = course.trend === 'up' ? TrendingUp : course.trend === 'down' ? TrendingDown : TrendingUp;
  
  return (
    <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1">{course.course}</CardTitle>
            <p className="text-sm text-gray-600">{course.teacher}</p>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline">{course.credits} Credits</Badge>
              <Badge variant="secondary" className={`${getGradeColor(course.currentGrade)}`}>
                {course.letterGrade} - {course.currentGrade}%
              </Badge>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`text-3xl font-bold ${getGradeColor(course.currentGrade).split(' ')[0]}`}>
              {course.currentGrade}%
            </div>
            <TrendIcon className={`h-5 w-5 ${
              course.trend === 'up' ? 'text-green-600' :
              course.trend === 'down' ? 'text-red-600' :
              'text-gray-400'
            }`} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Assignments Progress</span>
            <span className="font-medium">
              {course.assignments.completed}/{course.assignments.total}
            </span>
          </div>
          <Progress 
            value={(course.assignments.completed / course.assignments.total) * 100} 
            className="h-2"
          />
        </div>

        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            <h4 className="font-semibold text-sm">Grade Breakdown</h4>
            {Object.entries(course.breakdown).map(([category, data]) => (
              <div key={category}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize text-gray-600">
                    {category} ({data.weight}%)
                  </span>
                  <span className="font-medium">{data.score}%</span>
                </div>
                <Progress value={data.score} className="h-1.5" />
              </div>
            ))}
          </div>
        )}

        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          onClick={onToggle}
        >
          {expanded ? <ChevronUp className="h-4 w-4 mr-1" /> : <ChevronDown className="h-4 w-4 mr-1" />}
          {expanded ? 'Hide Details' : 'Show Details'}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function StudentGrades() {
  const { t } = useTranslation('dashboard');
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null);

  const overallStats = {
    gpa: 3.72,
    totalCredits: 21,
    completedAssignments: mockCourseGrades.reduce((sum, c) => sum + c.assignments.completed, 0),
    totalAssignments: mockCourseGrades.reduce((sum, c) => sum + c.assignments.total, 0),
    averageGrade: Math.round(mockCourseGrades.reduce((sum, c) => sum + c.currentGrade, 0) / mockCourseGrades.length)
  };

  return (
    <StudentLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm z-20">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{t('myGrades')}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-text-secondary">
            Track your academic performance across all courses
          </p>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Grades</h1>
            <p className="text-gray-600 mt-2">
              Track your academic performance and progress
            </p>
          </div>
          <Button className="bg-gray-900 text-white hover:bg-gray-800">
            <Download className="h-4 w-4 mr-2" />
            Download Report
          </Button>
        </div>

        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          <Card className="shadow-[0_2px_8px_rgba(0,0,0,0.08)] bg-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Overall GPA</p>
                  <p className="text-3xl font-bold text-blue-600">{overallStats.gpa}</p>
                </div>
                <Trophy className="h-12 w-12 text-blue-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Average Grade</p>
                  <p className="text-3xl font-bold text-green-600">{overallStats.averageGrade}%</p>
                </div>
                <Award className="h-12 w-12 text-green-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Credits</p>
                  <p className="text-3xl font-bold text-purple-600">{overallStats.totalCredits}</p>
                </div>
                <BookOpen className="h-12 w-12 text-purple-600 opacity-20" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Completed</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {overallStats.completedAssignments}/{overallStats.totalAssignments}
                  </p>
                </div>
                <Calendar className="h-12 w-12 text-orange-600 opacity-20" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="courses" className="space-y-4">
          <TabsList>
            <TabsTrigger value="courses">Current Classes</TabsTrigger>
            <TabsTrigger value="history">Grade History</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {mockCourseGrades.map(course => (
                <CourseGradeCard
                  key={course.id}
                  course={course}
                  expanded={expandedCourse === course.id}
                  onToggle={() => setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Grades</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockGradeHistory.map((grade, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold">{grade.assignment}</h4>
                        <p className="text-sm text-gray-600">{grade.course}</p>
                        <p className="text-xs text-gray-500 mt-1">{grade.date}</p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getGradeColor(grade.percentage).split(' ')[0]}`}>
                          {grade.letterGrade}
                        </div>
                        <p className="text-sm text-gray-600">
                          {grade.points}/{grade.maxPoints} ({grade.percentage}%)
                        </p>
                        <Button variant="ghost" size="sm" className="mt-2">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Performance by Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Homework</span>
                      <span className="font-medium">91%</span>
                    </div>
                    <Progress value={91} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Quizzes</span>
                      <span className="font-medium">92%</span>
                    </div>
                    <Progress value={92} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Exams</span>
                      <span className="font-medium">90%</span>
                    </div>
                    <Progress value={90} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Projects</span>
                      <span className="font-medium">95%</span>
                    </div>
                    <Progress value={95} className="h-2" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Strengths & Areas for Improvement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-green-600 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Strengths
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Projects & Practical Work (95%)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Computer Science (97%)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full" />
                        Mathematics (95%)
                      </li>
                    </ul>
                  </div>
                  <div className="border-t pt-4">
                    <h4 className="font-semibold text-orange-600 mb-2 flex items-center gap-2">
                      <TrendingDown className="h-4 w-4" />
                      Areas to Focus
                    </h4>
                    <ul className="space-y-1 text-sm">
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        Chemistry Exams (83%)
                      </li>
                      <li className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full" />
                        Physics Homework (85%)
                      </li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
        </div>
      </div>
    </StudentLayout>
  );
}
