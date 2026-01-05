import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { 
  ClipboardList, Clock, CheckCircle, AlertCircle, Calendar,
  Filter, Download, Upload, FileText, Play, Search,
  ArrowUpDown, ChevronDown, Loader2, X, Send, Eye,
  PaperclipIcon, Trash2, CheckCircle2, XCircle, AlertTriangle
} from "lucide-react";
import StudentLayout from "@/components/StudentLayout";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { apiEndpoint, assetUrl } from '@/lib/config';

interface APIAssignment {
  id: number;
  courseId: number;
  lessonId: number | null;
  title: string;
  description: string;
  type: string;
  dueDate: string;
  maxScore: number;
  isPublished: boolean;
  createdAt: string;
  courseTitle: string;
  courseDescription: string | null;
  submission: {
    id: number;
    content: string | null;
    filePath: string | null;
    fileName: string | null;
    submittedAt: string;
    status: string;
    score: number | null;
    feedback: string | null;
  } | null;
  status: 'pending' | 'submitted' | 'graded' | 'overdue';
  grade: number | null;
  feedback: string | null;
  submittedAt: string | null;
}

interface Assignment {
  id: string;
  title: string;
  course: string;
  courseColor: string;
  dueDate: string;
  dueTime: string;
  status: 'pending' | 'in-progress' | 'completed' | 'late';
  priority: 'high' | 'medium' | 'low';
  points: number;
  earnedPoints?: number;
  description: string;
  type: 'essay' | 'quiz' | 'project' | 'homework' | 'exam' | 'presentation';
  submissions: number;
  maxSubmissions: number;
  submissionId?: string;
  submissionContent?: string;
  submissionFile?: string;
  feedback?: string;
}

interface SubmissionFormData {
  assignmentId: string;
  content: string;
  file: File | null;
}

// Fetch assignments from API
const fetchAssignments = async (token: string): Promise<APIAssignment[]> => {
  const response = await fetch(apiEndpoint('/api/assignments/student'), {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    credentials: "include",
  });
  
  if (!response.ok) {
    throw new Error('Failed to fetch assignments');
  }
  
  return response.json();
};

// Helper functions
const calculatePriority = (dueDate: string): 'high' | 'medium' | 'low' => {
  const due = new Date(dueDate);
  const now = new Date();
  const hoursUntilDue = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  
  if (hoursUntilDue < 24) return 'high';
  if (hoursUntilDue < 72) return 'medium';
  return 'low';
};

const formatDueDate = (dueDate: string): string => {
  const due = new Date(dueDate);
  const now = new Date();
  const diffTime = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
  if (diffDays < 7) return `In ${diffDays} days`;
  
  return due.toLocaleDateString();
};

const mockAssignments: Assignment[] = [
  {
    id: '1',
    title: 'Calculus Problem Set #5',
    course: 'Advanced Mathematics',
    courseColor: 'blue',
    dueDate: 'Today',
    dueTime: '11:59 PM',
    status: 'pending',
    priority: 'high',
    points: 100,
    description: 'Complete problems 1-20 from Chapter 5. Show all work and explain your reasoning.',
    type: 'homework',
    submissions: 0,
    maxSubmissions: 3
  },
  {
    id: '2',
    title: 'Lab Report: Electromagnetic Waves',
    course: 'Physics Laboratory',
    courseColor: 'green',
    dueDate: 'Tomorrow',
    dueTime: '5:00 PM',
    status: 'in-progress',
    priority: 'medium',
    points: 150,
    description: 'Write a comprehensive lab report including hypothesis, methodology, results, and conclusion.',
    type: 'project',
    submissions: 1,
    maxSubmissions: 2
  },
  {
    id: '3',
    title: 'Essay: Modern Poetry Analysis',
    course: 'English Literature',
    courseColor: 'purple',
    dueDate: 'Friday',
    dueTime: '2:00 PM',
    status: 'pending',
    priority: 'medium',
    points: 100,
    description: 'Analyze three modern poems and discuss their themes, literary devices, and cultural context.',
    type: 'essay',
    submissions: 0,
    maxSubmissions: 1
  },
  {
    id: '4',
    title: 'Programming Project: Web Application',
    course: 'Computer Science',
    courseColor: 'orange',
    dueDate: 'Next Monday',
    dueTime: '11:59 PM',
    status: 'completed',
    priority: 'low',
    points: 200,
    earnedPoints: 195,
    description: 'Build a full-stack web application using React and Node.js with user authentication.',
    type: 'project',
    submissions: 1,
    maxSubmissions: 1
  },
  {
    id: '5',
    title: 'Chemistry Quiz: Organic Compounds',
    course: 'Chemistry',
    courseColor: 'red',
    dueDate: 'Yesterday',
    dueTime: '10:00 AM',
    status: 'late',
    priority: 'high',
    points: 50,
    description: 'Online quiz covering organic chemistry fundamentals and nomenclature.',
    type: 'quiz',
    submissions: 0,
    maxSubmissions: 1
  },
  {
    id: '6',
    title: 'History Essay: Industrial Revolution',
    course: 'World History',
    courseColor: 'yellow',
    dueDate: 'Next Week',
    dueTime: '11:59 PM',
    status: 'pending',
    priority: 'low',
    points: 100,
    description: 'Discuss the social and economic impacts of the Industrial Revolution on modern society.',
    type: 'essay',
    submissions: 0,
    maxSubmissions: 2
  }
];

const statusConfig = {
  pending: { label: 'To Do', icon: AlertCircle, color: 'text-orange-600 bg-orange-50 border-orange-200' },
  'in-progress': { label: 'In Progress', icon: Clock, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  completed: { label: 'Completed', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
  late: { label: 'Late', icon: AlertCircle, color: 'text-red-600 bg-red-50 border-red-200' }
};

const priorityConfig = {
  high: { color: 'bg-red-500', label: 'High Priority' },
  medium: { color: 'bg-yellow-500', label: 'Medium Priority' },
  low: { color: 'bg-green-500', label: 'Low Priority' }
};

const typeConfig = {
  essay: { label: 'Essay', icon: FileText },
  quiz: { label: 'Quiz', icon: ClipboardList },
  project: { label: 'Project', icon: Upload },
  homework: { label: 'Homework', icon: FileText },
  exam: { label: 'Exam', icon: AlertCircle },
  presentation: { label: 'Presentation', icon: Upload }
};

function AssignmentCard({ assignment, onSubmit, onViewDetails, onViewSubmission }: { 
  assignment: Assignment;
  onSubmit: (assignment: Assignment) => void;
  onViewDetails: (assignment: Assignment) => void;
  onViewSubmission: (assignment: Assignment) => void;
}) {
  const statusInfo = statusConfig[assignment.status];
  const StatusIcon = statusInfo.icon;
  const typeInfo = typeConfig[assignment.type] || typeConfig.homework;
  const TypeIcon = typeInfo.icon;

  return (
    <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-2xl transition-all border-l-4 border-l-primary rounded-2xl">
      <CardHeader className="pb-3 p-6">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="outline" className="text-xs font-medium border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300">
                {assignment.course}
              </Badge>
              <Badge 
                variant="secondary" 
                className={`text-xs font-medium ${priorityConfig[assignment.priority].color} text-white`}
              >
                {priorityConfig[assignment.priority].label}
              </Badge>
              <Badge variant="outline" className="text-xs border-slate-300 dark:border-white/20 text-slate-700 dark:text-slate-300">
                <TypeIcon className="h-3 w-3 mr-1" />
                {typeInfo.label}
              </Badge>
            </div>
            <CardTitle className="text-lg mb-2 text-slate-900 dark:text-white group-hover:text-primary transition-colors">
              {assignment.title}
            </CardTitle>
            <p className="text-sm text-slate-600 dark:text-text-secondary line-clamp-2">
              {assignment.description}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className={`flex items-center gap-1 text-sm ${statusInfo.color.split(' ')[0]} px-3 py-1.5 rounded-full font-medium shadow-sm`}>
              <StatusIcon className="h-4 w-4" />
              <span className="hidden sm:inline">{statusInfo.label}</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6 pt-0">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 dark:bg-surface-highlight p-3 rounded-lg border border-slate-200 dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Due Date</p>
            <p className="font-semibold text-sm flex items-center gap-1 text-slate-900 dark:text-white">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="truncate">{assignment.dueDate}</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-text-secondary mt-1">{assignment.dueTime}</p>
          </div>
          <div className="bg-slate-50 dark:bg-surface-highlight p-3 rounded-lg border border-slate-200 dark:border-white/10">
            <p className="text-xs text-slate-500 dark:text-text-secondary mb-1">Points</p>
            <p className="font-semibold text-lg text-slate-900 dark:text-white">
              {assignment.status === 'completed' && assignment.earnedPoints !== undefined
                ? <span className="text-primary">{assignment.earnedPoints}/{assignment.points}</span>
                : assignment.points
              }
            </p>
            {assignment.status === 'completed' && assignment.earnedPoints !== undefined && (
              <Progress 
                value={(assignment.earnedPoints / assignment.points) * 100} 
                className="h-1.5 mt-2" 
              />
            )}
          </div>
        </div>

        {assignment.status === 'completed' && assignment.feedback && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 p-3 rounded-lg">
            <p className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">Feedback</p>
            <p className="text-sm text-green-800 dark:text-green-300">{assignment.feedback}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 border-slate-300 dark:border-white/20 hover:bg-slate-100 dark:hover:bg-surface-highlight text-sm h-9"
            onClick={() => onViewDetails(assignment)}
          >
            <Eye className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">View Details</span>
            <span className="sm:hidden">Details</span>
          </Button>
          {assignment.status === 'completed' || assignment.status === 'in-progress' ? (
            <>
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 bg-primary/10 hover:bg-primary/20 text-primary border-primary/30 text-sm h-9"
                onClick={() => onViewSubmission(assignment)}
              >
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">View Submission</span>
                <span className="sm:hidden">Submission</span>
              </Button>
              <Button 
                size="sm" 
                className="flex-1 bg-gradient-to-r from-eduverse-blue to-blue-600 hover:from-blue-600 hover:to-eduverse-blue text-white shadow-md hover:shadow-lg transition-all text-xs sm:text-sm h-8 sm:h-9"
                onClick={() => onSubmit(assignment)}
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                Resubmit
              </Button>
            </>
          ) : (
            <Button 
              size="sm" 
              className="flex-1 bg-gradient-to-r from-eduverse-blue to-blue-600 hover:from-blue-600 hover:to-eduverse-blue text-white shadow-md hover:shadow-lg transition-all text-xs sm:text-sm h-8 sm:h-9"
              onClick={() => onSubmit(assignment)}
            >
              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
              Submit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function StudentAssignments() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("dueDate");
  
  // Submission dialog state
  const [isSubmitDialogOpen, setIsSubmitDialogOpen] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [submissionContent, setSubmissionContent] = useState("");
  const [submissionFile, setSubmissionFile] = useState<File | null>(null);
  
  // Details dialog state
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [detailsAssignment, setDetailsAssignment] = useState<Assignment | null>(null);
  
  // View submission dialog state
  const [isViewSubmissionOpen, setIsViewSubmissionOpen] = useState(false);
  const [viewSubmissionAssignment, setViewSubmissionAssignment] = useState<Assignment | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [loadingSubmission, setLoadingSubmission] = useState(false);

  // Fetch assignments from API
  const { data: apiAssignments = [], isLoading, error } = useQuery<APIAssignment[]>({
    queryKey: ['studentAssignments'],
    queryFn: () => fetchAssignments(token || ''),
    enabled: !!token,
    refetchInterval: 30000,
  });

  // Submit assignment mutation
  const submitMutation = useMutation({
    mutationFn: async ({ assignmentId, content, file }: { assignmentId: string; content: string; file: File | null }) => {
      const formData = new FormData();
      formData.append('content', content);
      if (file) {
        formData.append('file', file);
      }

      const response = await fetch(apiEndpoint(`/api/assignments/${assignmentId}/submit`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: "include",
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to submit assignment');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['studentAssignments'] });
      toast({
        title: "Success!",
        description: "Assignment submitted successfully",
      });
      setIsSubmitDialogOpen(false);
      setSubmissionContent("");
      setSubmissionFile(null);
      setSelectedAssignment(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const handleSubmitAssignment = () => {
    if (!selectedAssignment) return;
    
    if (!submissionContent.trim() && !submissionFile) {
      toast({
        title: "Missing content",
        description: "Please provide submission content or upload a file",
        variant: "destructive"
      });
      return;
    }

    submitMutation.mutate({
      assignmentId: selectedAssignment.id,
      content: submissionContent,
      file: submissionFile
    });
  };

  const handleOpenSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionContent(assignment.submissionContent || "");
    setIsSubmitDialogOpen(true);
  };

  const handleViewDetails = (assignment: Assignment) => {
    setDetailsAssignment(assignment);
    setIsDetailsDialogOpen(true);
  };

  const handleViewSubmission = async (assignment: Assignment) => {
    setViewSubmissionAssignment(assignment);
    setIsViewSubmissionOpen(true);
    setLoadingSubmission(true);
    
    try {
      const response = await fetch(apiEndpoint(`/api/assignments/${assignment.id}/my-submission`), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setSubmissionData(data);
      } else {
        toast({
          title: "Error",
          description: "Failed to load submission",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load submission",
        variant: "destructive",
      });
    } finally {
      setLoadingSubmission(false);
    }
  };

  const handleDownloadSubmission = async (submissionId: number) => {
    try {
      const response = await fetch(apiEndpoint(`/api/assignments/submissions/${submissionId}/download`), {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const filename = response.headers.get('content-disposition')?.split('filename=')[1]?.replace(/"/g, '') || 'download';
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download file",
        variant: "destructive",
      });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSubmissionFile(e.target.files[0]);
    }
  };

  // Transform API data to match UI expectations
  const mockAssignments: Assignment[] = apiAssignments.map(assignment => {
    const priority = calculatePriority(assignment.dueDate);
    const formattedDueDate = formatDueDate(assignment.dueDate);
    const dueTime = new Date(assignment.dueDate).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit' 
    });

    let displayStatus: 'pending' | 'in-progress' | 'completed' | 'late' = 'pending';
    if (assignment.status === 'graded') {
      displayStatus = 'completed';
    } else if (assignment.status === 'submitted') {
      displayStatus = 'in-progress';
    } else if (assignment.status === 'overdue') {
      displayStatus = 'late';
    }

    return {
      id: assignment.id.toString(),
      title: assignment.title,
      course: assignment.courseTitle,
      courseColor: 'blue',
      dueDate: formattedDueDate,
      dueTime: dueTime,
      status: displayStatus,
      priority: priority,
      points: assignment.maxScore,
      earnedPoints: assignment.grade || undefined,
      description: assignment.description,
      type: (assignment.type || 'homework') as 'essay' | 'quiz' | 'project' | 'homework' | 'exam' | 'presentation',
      submissions: assignment.submission ? 1 : 0,
      maxSubmissions: 3,
    };
  });

  // Filter and sort assignments
  const filteredAssignments = mockAssignments
    .filter(assignment => {
      const matchesSearch = assignment.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           assignment.course.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || assignment.status === filterStatus;
      const matchesCourse = filterCourse === "all" || assignment.course === filterCourse;
      return matchesSearch && matchesStatus && matchesCourse;
    })
    .sort((a, b) => {
      if (sortBy === "dueDate") {
        // Simple sort by due date string
        return a.dueDate.localeCompare(b.dueDate);
      } else if (sortBy === "priority") {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      }
      return 0;
    });

  const stats = {
    total: mockAssignments.length,
    pending: mockAssignments.filter(a => a.status === 'pending').length,
    inProgress: mockAssignments.filter(a => a.status === 'in-progress').length,
    completed: mockAssignments.filter(a => a.status === 'completed').length,
    late: mockAssignments.filter(a => a.status === 'late').length
  };

  const uniqueCourses = Array.from(new Set(mockAssignments.map(a => a.course)));

  // Loading state
  if (isLoading) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-background-dark">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-slate-600 dark:text-text-secondary mt-4">Loading assignments...</p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  // Error state
  if (error) {
    return (
      <StudentLayout>
        <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-background-dark">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 dark:text-red-400 mx-auto mb-4" />
            <p className="text-slate-900 dark:text-white font-semibold">Failed to load assignments</p>
            <p className="text-slate-600 dark:text-text-secondary mt-2">
              {error instanceof Error ? error.message : 'An error occurred'}
            </p>
          </div>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-white/10 bg-white/95 dark:bg-background-dark/95 backdrop-blur-sm z-20">
        <div className="flex-1 max-w-md">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-text-secondary pointer-events-none" />
            <Input
              placeholder="Search assignments, courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-12 pr-10 py-3 bg-slate-100 dark:bg-surface-highlight border-none rounded-full text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-text-secondary focus:ring-2 focus:ring-secondary dark:focus:ring-primary focus:bg-white dark:focus:bg-surface-dark transition-all shadow-inner"
            />
          </div>
        </div>
        <div className="flex items-center gap-4 ml-6">
          <NotificationBell />
          <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10 border-2 border-slate-200 dark:border-slate-700 shadow-sm" 
               style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDYNwQXmyG2cmcatoIpuxCXAUKYCkLbWmRVeIGDWXjeCjESv3EokpknZEHjczDP4AdgN3rMICWR_zdgzwjtA_69iQJV8c5jILUWhbB9P4gD0X6kfDo-LB0d1vSbbSTVCIqUF37hfDVWsHw4GpG27-q_56SRmL9dR8T4pYRMv9q9t206j7AQvKp1b7U0URKhDT08_ycy5iw2NiXi0vntQjt-DuXa8_10jrWNwJ8p9vwTEEI6vgrioFM-oohZvAqqcfDDrEuOkGYG-So")' }}>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10 scroll-smooth bg-slate-50 dark:bg-background-dark">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Page Title */}
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              My Assignments
            </h1>
            <p className="text-slate-600 dark:text-text-secondary mt-2 text-sm">
              Track, submit, and manage all your course assignments
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-xl transition-all rounded-2xl">
              <CardContent className="p-5">
                <div className="text-center">
                  <ClipboardList className="h-8 w-8 mx-auto mb-2 text-slate-500 dark:text-text-secondary" />
                  <p className="text-sm text-slate-600 dark:text-text-secondary">Total</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-xl transition-all rounded-2xl border-t-4 border-t-orange-500">
              <CardContent className="p-5">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 text-orange-500" />
                  <p className="text-sm text-slate-600 dark:text-text-secondary">To Do</p>
                  <p className="text-3xl font-bold text-orange-500">{stats.pending}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-xl transition-all rounded-2xl border-t-4 border-t-primary">
              <CardContent className="p-5">
                <div className="text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                  <p className="text-sm text-slate-600 dark:text-text-secondary">In Progress</p>
                  <p className="text-3xl font-bold text-primary">{stats.inProgress}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-xl transition-all rounded-2xl border-t-4 border-t-green-500">
              <CardContent className="p-5">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  <p className="text-sm text-slate-600 dark:text-text-secondary">Completed</p>
                  <p className="text-3xl font-bold text-green-500">{stats.completed}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 hover:shadow-xl transition-all rounded-2xl border-t-4 border-t-red-500">
              <CardContent className="p-5">
                <div className="text-center">
                  <XCircle className="h-8 w-8 mx-auto mb-2 text-red-500" />
                  <p className="text-sm text-slate-600 dark:text-text-secondary">Late</p>
                  <p className="text-3xl font-bold text-red-500">{stats.late}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          <Card className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10 shadow-lg">
            <CardContent className="p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 bg-slate-100 dark:bg-surface-highlight border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10">
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterCourse} onValueChange={setFilterCourse}>
                  <SelectTrigger className="w-full sm:w-[200px] h-11 bg-slate-100 dark:bg-surface-highlight border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Filter by course" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10">
                    <SelectItem value="all">All Classes</SelectItem>
                    {uniqueCourses.map(course => (
                      <SelectItem key={course} value={course}>{course}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-full sm:w-[180px] h-11 bg-slate-100 dark:bg-surface-highlight border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10">
                    <SelectItem value="dueDate">Due Date</SelectItem>
                    <SelectItem value="priority">Priority</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Assignments List */}
          <Tabs defaultValue="all" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 h-12 bg-white dark:bg-surface-dark border-slate-200 dark:border-white/10">
              <TabsTrigger value="all" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                All <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-surface-highlight">{filteredAssignments.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="upcoming" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                Upcoming <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-surface-highlight">{filteredAssignments.filter(a => a.status === 'pending').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="in-progress" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                In Progress <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-surface-highlight">{filteredAssignments.filter(a => a.status === 'in-progress').length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-black">
                Completed <Badge variant="secondary" className="ml-2 bg-slate-200 dark:bg-surface-highlight">{filteredAssignments.filter(a => a.status === 'completed').length}</Badge>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="all" className="space-y-3 sm:space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5 md:gap-6">
              {filteredAssignments.map(assignment => (
                <AssignmentCard 
                  key={assignment.id} 
                  assignment={assignment}
                  onSubmit={handleOpenSubmitDialog}
                  onViewDetails={handleViewDetails}
                  onViewSubmission={handleViewSubmission}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upcoming" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAssignments.filter(a => a.status === 'pending').map(assignment => (
                <AssignmentCard 
                  key={assignment.id} 
                  assignment={assignment}
                  onSubmit={handleOpenSubmitDialog}
                  onViewDetails={handleViewDetails}
                  onViewSubmission={handleViewSubmission}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in-progress" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAssignments.filter(a => a.status === 'in-progress').map(assignment => (
                <AssignmentCard 
                  key={assignment.id} 
                  assignment={assignment}
                  onSubmit={handleOpenSubmitDialog}
                  onViewDetails={handleViewDetails}
                  onViewSubmission={handleViewSubmission}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredAssignments.filter(a => a.status === 'completed').map(assignment => (
                <AssignmentCard 
                  key={assignment.id} 
                  assignment={assignment}
                  onSubmit={handleOpenSubmitDialog}
                  onViewDetails={handleViewDetails}
                  onViewSubmission={handleViewSubmission}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {filteredAssignments.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="p-16 text-center">
              <ClipboardList className="h-20 w-20 mx-auto text-gray-300 mb-6" />
              <h3 className="text-2xl font-semibold mb-2 text-gray-700">No assignments found</h3>
              <p className="text-gray-500 text-lg">
                Try adjusting your filters or search query
              </p>
            </CardContent>
          </Card>
        )}

        {/* Submit Assignment Dialog */}
        <Dialog open={isSubmitDialogOpen} onOpenChange={setIsSubmitDialogOpen}>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle className="text-2xl">Submit Assignment</DialogTitle>
              <DialogDescription className="text-base">
                Submit your work for "{selectedAssignment?.title}"
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6 py-4">
              {/* Assignment Info */}
              <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-lg text-blue-900">
                      {selectedAssignment?.title}
                    </p>
                    <p className="text-sm text-blue-700">
                      {selectedAssignment?.course}
                    </p>
                  </div>
                  <Badge className="bg-blue-600 text-white">
                    {selectedAssignment?.points} pts
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-blue-700">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Due: {selectedAssignment?.dueDate} at {selectedAssignment?.dueTime}
                  </span>
                </div>
              </div>

              {/* Text Content */}
              <div className="space-y-2">
                <Label htmlFor="content" className="text-base font-medium">
                  Submission Content
                </Label>
                <Textarea
                  id="content"
                  placeholder="Write your submission here... (optional if uploading a file)"
                  value={submissionContent}
                  onChange={(e) => setSubmissionContent(e.target.value)}
                  rows={8}
                  className="resize-none border-2 focus:border-eduverse-blue transition-colors"
                />
                <p className="text-xs text-gray-500">
                  You can type your submission directly or upload a file below
                </p>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file" className="text-base font-medium">
                  Attach File (Optional)
                </Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-eduverse-blue transition-colors">
                  <input
                    id="file"
                    type="file"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {submissionFile ? (
                    <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <PaperclipIcon className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-green-800">
                          {submissionFile.name}
                        </span>
                        <span className="text-xs text-green-600">
                          ({(submissionFile.size / 1024).toFixed(2)} KB)
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSubmissionFile(null)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <label htmlFor="file" className="cursor-pointer">
                      <Upload className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700 mb-1">
                        Click to upload or drag and drop
                      </p>
                      <p className="text-xs text-gray-500">
                        PDF, DOC, DOCX, TXT, or ZIP (max 10MB)
                      </p>
                    </label>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsSubmitDialogOpen(false);
                  setSubmissionContent("");
                  setSubmissionFile(null);
                }}
                className="border-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitAssignment}
                disabled={submitMutation.isPending || (!submissionContent.trim() && !submissionFile)}
                className="bg-gradient-to-r from-eduverse-blue to-blue-600 hover:from-blue-600 hover:to-eduverse-blue text-white shadow-md"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assignment
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assignment Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{detailsAssignment?.title}</DialogTitle>
              <DialogDescription>
                {detailsAssignment?.course}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Status and Priority */}
              <div className="flex gap-3 flex-wrap">
                <Badge 
                  variant="outline" 
                  className={`px-4 py-2 text-sm font-medium ${
                    statusConfig[detailsAssignment?.status || 'pending'].color
                  }`}
                >
                  {statusConfig[detailsAssignment?.status || 'pending'].label}
                </Badge>
                <Badge 
                  variant="secondary"
                  className={`px-4 py-2 text-sm font-medium ${
                    priorityConfig[detailsAssignment?.priority || 'low'].color
                  } text-white`}
                >
                  {priorityConfig[detailsAssignment?.priority || 'low'].label}
                </Badge>
                <Badge variant="outline" className="px-4 py-2 text-sm">
                  {typeConfig[detailsAssignment?.type || 'homework'].label}
                </Badge>
              </div>

              {/* Description */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2 text-lg">Description</h3>
                <p className="text-gray-700 leading-relaxed">
                  {detailsAssignment?.description}
                </p>
              </div>

              {/* Due Date and Points */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-700 mb-1">Due Date</p>
                  <p className="font-semibold text-lg text-blue-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {detailsAssignment?.dueDate}
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    {detailsAssignment?.dueTime}
                  </p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm text-green-700 mb-1">Points</p>
                  <p className="font-semibold text-2xl text-green-900">
                    {detailsAssignment?.earnedPoints !== undefined 
                      ? `${detailsAssignment.earnedPoints}/${detailsAssignment.points}`
                      : detailsAssignment?.points
                    }
                  </p>
                  {detailsAssignment?.earnedPoints !== undefined && (
                    <Progress 
                      value={(detailsAssignment.earnedPoints / detailsAssignment.points) * 100}
                      className="h-2 mt-2"
                    />
                  )}
                </div>
              </div>

              {/* Feedback (if completed) */}
              {detailsAssignment?.status === 'completed' && detailsAssignment?.feedback && (
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <h3 className="font-semibold mb-2 text-lg text-yellow-900 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Teacher Feedback
                  </h3>
                  <p className="text-yellow-800 leading-relaxed">
                    {detailsAssignment.feedback}
                  </p>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDetailsDialogOpen(false)}
              >
                Close
              </Button>
              {detailsAssignment?.status !== 'completed' && (
                <Button
                  onClick={() => {
                    setIsDetailsDialogOpen(false);
                    if (detailsAssignment) {
                      handleOpenSubmitDialog(detailsAssignment);
                    }
                  }}
                  className="bg-gradient-to-r from-eduverse-blue to-blue-600 hover:from-blue-600 hover:to-eduverse-blue text-white"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Submit Assignment
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View My Submission Dialog */}
        <Dialog open={isViewSubmissionOpen} onOpenChange={setIsViewSubmissionOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">My Submission</DialogTitle>
              <DialogDescription>
                View your submission for {viewSubmissionAssignment?.title}
              </DialogDescription>
            </DialogHeader>

            {loadingSubmission ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-eduverse-blue" />
              </div>
            ) : submissionData ? (
              <div className="space-y-6">
                {/* Assignment Info */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-lg mb-2 text-blue-900">
                    {submissionData.assignment?.title}
                  </h3>
                  <p className="text-blue-700 text-sm">
                    {submissionData.assignment?.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-blue-600">
                    <span>Max Score: {submissionData.assignment?.maxScore}</span>
                    <span>•</span>
                    <span>Due: {new Date(submissionData.assignment?.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>

                {/* Submission Status */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-medium">Submitted</span>
                  </div>
                  <span className="text-sm text-gray-600">
                    {new Date(submissionData.submission.submittedAt).toLocaleString()}
                  </span>
                </div>

                {/* Submission Content */}
                {submissionData.submission.content && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Submission Text</Label>
                    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed">
                        {submissionData.submission.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submitted File */}
                {submissionData.submission.fileName && (
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Attached File</Label>
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <PaperclipIcon className="h-5 w-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-sm">{submissionData.submission.fileName}</p>
                          <p className="text-xs text-gray-500">
                            {(submissionData.submission.fileSize / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDownloadSubmission(submissionData.submission.id)}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}

                {/* Grade and Feedback */}
                {submissionData.grade ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-base font-semibold text-green-900">
                          Grade
                        </Label>
                        <span className="text-2xl font-bold text-green-700">
                          {submissionData.grade.score}/{submissionData.grade.maxScore}
                        </span>
                      </div>
                      <Progress 
                        value={(submissionData.grade.score / submissionData.grade.maxScore) * 100}
                        className="h-2"
                      />
                    </div>

                    {submissionData.grade.feedback && (
                      <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <Label className="text-base font-semibold text-yellow-900 flex items-center gap-2 mb-2">
                          <FileText className="h-5 w-5" />
                          Teacher Feedback
                        </Label>
                        <p className="text-yellow-800 text-sm leading-relaxed whitespace-pre-wrap">
                          {submissionData.grade.feedback}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm text-gray-600 text-center">
                      This submission has not been graded yet.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No submission data available
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewSubmissionOpen(false);
                  setSubmissionData(null);
                }}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsViewSubmissionOpen(false);
                  setSubmissionData(null);
                  if (viewSubmissionAssignment) {
                    handleOpenSubmitDialog(viewSubmissionAssignment);
                  }
                }}
                className="bg-gradient-to-r from-eduverse-blue to-blue-600 hover:from-blue-600 hover:to-eduverse-blue text-white"
              >
                <Upload className="h-4 w-4 mr-2" />
                Resubmit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </StudentLayout>
  );
}
