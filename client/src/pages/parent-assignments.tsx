import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useParams } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import { 
  Calendar, Clock, CheckCircle, AlertCircle, 
  FileText, ArrowLeft, Filter, TrendingUp
} from "lucide-react";

interface Assignment {
  id: string;
  title: string;
  description: string;
  courseName: string;
  courseId: string;
  dueDate: Date;
  type: string;
  maxScore: number;
  status: string;
  submittedAt?: Date;
  score?: number;
  feedback?: string;
  isLate: boolean;
}

interface AssignmentData {
  assignments: Assignment[];
  summary: {
    total: number;
    pending: number;
    submitted: number;
    graded: number;
    late: number;
  };
}

export default function ParentAssignments() {
  const { t } = useTranslation('parent');
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const params = useParams();
  const childId = params.childId;

  const [assignmentData, setAssignmentData] = useState<AssignmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [daysFilter, setDaysFilter] = useState<string>('30');

  useEffect(() => {
    if (childId) {
      fetchAssignments();
    }
  }, [childId, statusFilter, daysFilter, token]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (daysFilter !== 'all') params.append('days', daysFilter);

      const response = await fetch(
        apiEndpoint(`/api/parent/children/${childId}/assignments?${params}`),
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
        setAssignmentData(data);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'graded': return 'bg-green-100 text-green-800';
      case 'submitted': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'late': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'graded': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <FileText className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'late': return <AlertCircle className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffTime = due.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Overdue';
    if (diffDays === 0) return 'Due today';
    if (diffDays === 1) return 'Due tomorrow';
    return `Due in ${diffDays} days`;
  };

  if (loading) {
    return (
      <ParentLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div>
        </div>
      </ParentLayout>
    );
  }

  return (
    <ParentLayout>
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
            <h1 className="text-3xl font-bold text-gray-900">{t('assignmentTracking')}</h1>
            <p className="text-gray-600 mt-1">Monitor upcoming and past assignments</p>
          </div>
        </div>

        {/* Summary Stats */}
        {assignmentData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Total</p>
                  <h3 className="text-3xl font-bold text-gray-900">{assignmentData.summary.total}</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Pending</p>
                  <h3 className="text-3xl font-bold text-yellow-600">{assignmentData.summary.pending}</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Submitted</p>
                  <h3 className="text-3xl font-bold text-blue-600">{assignmentData.summary.submitted}</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Graded</p>
                  <h3 className="text-3xl font-bold text-green-600">{assignmentData.summary.graded}</h3>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500">Late</p>
                  <h3 className="text-3xl font-bold text-red-600">{assignmentData.summary.late}</h3>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filters
              </CardTitle>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setDaysFilter('30');
                }}
              >
                Reset Filters
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="graded">Graded</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
                <Select value={daysFilter} onValueChange={setDaysFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select time range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Next 7 days</SelectItem>
                    <SelectItem value="14">Next 14 days</SelectItem>
                    <SelectItem value="30">Next 30 days</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Assignments List */}
        <Card>
          <CardHeader>
            <CardTitle>Assignments</CardTitle>
            <CardDescription>
              {assignmentData?.assignments.length || 0} assignment(s) found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assignmentData && assignmentData.assignments.length > 0 ? (
              <div className="space-y-3">
                {assignmentData.assignments.map((assignment) => (
                  <div 
                    key={assignment.id} 
                    className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-gray-900">{assignment.title}</h3>
                          <Badge className={getStatusColor(assignment.status)}>
                            <span className="flex items-center gap-1">
                              {getStatusIcon(assignment.status)}
                              {assignment.status}
                            </span>
                          </Badge>
                          {assignment.isLate && (
                            <Badge variant="destructive">Late</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{assignment.description}</p>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {assignment.courseName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(assignment.dueDate).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {getDaysUntilDue(assignment.dueDate)}
                          </span>
                          {assignment.type && (
                            <Badge variant="outline">{assignment.type}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        {assignment.score !== null && assignment.score !== undefined ? (
                          <div>
                            <p className="text-2xl font-bold text-green-600">
                              {Math.round((assignment.score / assignment.maxScore) * 100)}%
                            </p>
                            <p className="text-sm text-gray-500">
                              {assignment.score}/{assignment.maxScore}
                            </p>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm text-gray-500">Max Score</p>
                            <p className="text-2xl font-bold text-gray-900">{assignment.maxScore}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {assignment.feedback && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">Teacher Feedback:</p>
                        <p className="text-sm text-blue-700 mt-1">{assignment.feedback}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-500">No assignments found with the current filters</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ParentLayout>
  );
}
