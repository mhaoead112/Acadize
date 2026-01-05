import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import { 
  ArrowLeft, TrendingUp, TrendingDown, Minus, 
  Award, AlertCircle, CheckCircle, BarChart3
} from "lucide-react";
import { LineChart, Line, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface AnalyticsData {
  gradesTrend: Array<{
    date: Date;
    percentage: number;
    courseName: string;
    assignmentTitle: string;
  }>;
  subjectPerformance: Array<{
    subject: string;
    avgGrade: number;
    assignments: number;
    trend: string;
  }>;
  attendanceTrend: Array<{
    month: string;
    percentage: number;
  }>;
  insights: Array<{
    type: string;
    message: string;
    severity: string;
  }>;
  summary: {
    averageGrade: number;
    totalAssignments: number;
    attendanceRate: number;
    period: string;
  };
}

export default function ParentAnalytics() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const childId = params.childId;

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<string>('month');

  useEffect(() => {
    if (childId) {
      fetchAnalytics();
    }
  }, [childId, period, token]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        apiEndpoint(`/api/parent/children/${childId}/analytics?period=${period}`),
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
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-blue-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'declining': return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getInsightIcon = (severity: string) => {
    switch (severity) {
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'info': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      default: return <Award className="h-5 w-5 text-green-500" />;
    }
  };

  const getInsightColor = (severity: string) => {
    switch (severity) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-green-50 border-green-200';
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!analyticsData) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-500">No analytics data available</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Prepare chart data
  const gradesTrendChart = analyticsData.gradesTrend.map(item => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    percentage: item.percentage,
    course: item.courseName
  }));

  const subjectRadarData = analyticsData.subjectPerformance.map(item => ({
    subject: item.subject.length > 15 ? item.subject.substring(0, 12) + '...' : item.subject,
    grade: item.avgGrade,
    fullMark: 100
  }));

  const attendanceBarData = analyticsData.attendanceTrend.map(item => ({
    month: item.month,
    attendance: item.percentage
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/parent/dashboard')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">Performance Analytics</h1>
            <p className="text-gray-600 mt-1">Detailed insights and trends</p>
          </div>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Last Week</SelectItem>
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="semester">Last Semester</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Average Score</p>
                <h3 className={`text-4xl font-bold ${getScoreColor(analyticsData.summary.averageGrade)}`}>
                  {analyticsData.summary.averageGrade.toFixed(1)}%
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  across {analyticsData.summary.totalAssignments} assignments
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Attendance Rate</p>
                <h3 className="text-4xl font-bold text-blue-600">
                  {analyticsData.summary.attendanceRate.toFixed(1)}%
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  for selected period
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total Assignments</p>
                <h3 className="text-4xl font-bold text-purple-600">
                  {analyticsData.summary.totalAssignments}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  graded assignments
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Insights */}
        {analyticsData.insights.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>Automated analysis of performance patterns</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analyticsData.insights.map((insight, idx) => (
                  <div 
                    key={idx} 
                    className={`flex items-start gap-3 p-4 rounded-lg border ${getInsightColor(insight.severity)}`}
                  >
                    {getInsightIcon(insight.severity)}
                    <p className="flex-1 text-gray-900">{insight.message}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Grades Trend Chart */}
        {gradesTrendChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Grade Trends Over Time</CardTitle>
              <CardDescription>Track performance changes across assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={gradesTrendChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="percentage" 
                    stroke="#ec4899" 
                    strokeWidth={2}
                    name="Grade %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Subject Performance Radar */}
          {subjectRadarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Subject Performance Comparison</CardTitle>
                <CardDescription>Performance across different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={subjectRadarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" />
                    <PolarRadiusAxis domain={[0, 100]} />
                    <Radar 
                      name="Performance" 
                      dataKey="grade" 
                      stroke="#ec4899" 
                      fill="#ec4899" 
                      fillOpacity={0.6} 
                    />
                    <Tooltip />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Attendance Trend */}
          {attendanceBarData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>Monthly attendance percentage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={attendanceBarData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="attendance" fill="#3b82f6" name="Attendance %" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Subject Performance Details */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance Details</CardTitle>
            <CardDescription>Detailed breakdown by subject</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.subjectPerformance.map((subject, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-gray-900">{subject.subject}</h3>
                      {getTrendIcon(subject.trend)}
                      <Badge variant="outline">{subject.trend}</Badge>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {subject.assignments} assignment{subject.assignments !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${getScoreColor(subject.avgGrade)}`}>
                      {subject.avgGrade.toFixed(1)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
