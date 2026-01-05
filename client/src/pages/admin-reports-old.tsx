import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Flag, AlertTriangle, CheckCircle, Clock, Eye, 
  MessageSquare, User, Ban, Trash2, XCircle
} from "lucide-react";

interface Report {
  id: number;
  title: string;
  description: string;
  type: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "investigating" | "resolved" | "dismissed";
  reporter: string;
  reportedUser: string;
  reportedContent?: string;
  createdAt: string;
  updatedAt: string;
}

const mockReports: Report[] = [
  {
    id: 1,
    title: "Inappropriate Course Content",
    description: "Course contains offensive material in lesson 3",
    type: "content",
    priority: "high",
    status: "pending",
    reporter: "student@example.com",
    reportedUser: "teacher@example.com",
    reportedContent: "Python Basics - Lesson 3",
    createdAt: "2024-01-15 10:30 AM",
    updatedAt: "2024-01-15 10:30 AM"
  },
  {
    id: 2,
    title: "Harassment in Discussion",
    description: "User posting harassing comments in course forum",
    type: "harassment",
    priority: "high",
    status: "investigating",
    reporter: "student2@example.com",
    reportedUser: "student3@example.com",
    reportedContent: "Discussion: React Hooks",
    createdAt: "2024-01-15 09:15 AM",
    updatedAt: "2024-01-15 11:00 AM"
  },
  {
    id: 3,
    title: "Spam Messages",
    description: "User sending spam messages to multiple students",
    type: "spam",
    priority: "medium",
    status: "pending",
    reporter: "student4@example.com",
    reportedUser: "spammer@example.com",
    createdAt: "2024-01-15 08:45 AM",
    updatedAt: "2024-01-15 08:45 AM"
  },
  {
    id: 4,
    title: "Plagiarized Course Material",
    description: "Course content appears to be copied from another platform",
    type: "plagiarism",
    priority: "high",
    status: "investigating",
    reporter: "admin@example.com",
    reportedUser: "teacher2@example.com",
    reportedContent: "Web Development Bootcamp",
    createdAt: "2024-01-14 04:20 PM",
    updatedAt: "2024-01-15 09:00 AM"
  },
  {
    id: 5,
    title: "Technical Issue",
    description: "Video player not working in multiple lessons",
    type: "technical",
    priority: "medium",
    status: "resolved",
    reporter: "student5@example.com",
    reportedUser: "system",
    reportedContent: "Data Science Course",
    createdAt: "2024-01-14 02:10 PM",
    updatedAt: "2024-01-14 05:30 PM"
  }
];

export default function AdminReports() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filter, setFilter] = useState({ status: "all", priority: "all", type: "all" });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800";
      case "medium": return "bg-orange-100 text-orange-800";
      case "low": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "investigating": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      case "dismissed": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "investigating": return <Eye className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      case "dismissed": return <XCircle className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: number; status: string }) => {
      // TODO: Implement API call
      await new Promise(resolve => setTimeout(resolve, 500));
      return { reportId, status };
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Report status updated" });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
      setIsViewModalOpen(false);
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update report", variant: "destructive" });
    }
  });

  const filteredReports = mockReports.filter(report => {
    if (filter.status !== "all" && report.status !== filter.status) return false;
    if (filter.priority !== "all" && report.priority !== filter.priority) return false;
    if (filter.type !== "all" && report.type !== filter.type) return false;
    return true;
  });

  const stats = {
    total: mockReports.length,
    pending: mockReports.filter(r => r.status === "pending").length,
    investigating: mockReports.filter(r => r.status === "investigating").length,
    resolved: mockReports.filter(r => r.status === "resolved").length,
  };

  return (
    <DashboardLayout role="admin">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Moderation Reports 🚩
          </h1>
          <p className="text-gray-600">
            Review and manage user reports and content moderation
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Reports</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <Flag className="h-8 w-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Investigating</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.investigating}</p>
                </div>
                <Eye className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Resolved</p>
                  <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <Select value={filter.status} onValueChange={(value) => setFilter({ ...filter, status: value })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="investigating">Investigating</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.priority} onValueChange={(value) => setFilter({ ...filter, priority: value })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filter.type} onValueChange={(value) => setFilter({ ...filter, type: value })}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="harassment">Harassment</SelectItem>
                  <SelectItem value="spam">Spam</SelectItem>
                  <SelectItem value="plagiarism">Plagiarism</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle>Reports ({filteredReports.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div 
                  key={report.id} 
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedReport(report);
                    setIsViewModalOpen(true);
                  }}
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <Badge className={getPriorityColor(report.priority)}>
                        {report.priority}
                      </Badge>
                      <Badge className={getStatusColor(report.status)}>
                        <span className="mr-1">{getStatusIcon(report.status)}</span>
                        {report.status}
                      </Badge>
                      <Badge variant="outline">{report.type}</Badge>
                    </div>
                    <h3 className="font-semibold mb-1">{report.title}</h3>
                    <p className="text-sm text-gray-600 mb-2">{report.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Reporter: {report.reporter}</span>
                      <span>•</span>
                      <span>Reported: {report.reportedUser}</span>
                      <span>•</span>
                      <span>{report.createdAt}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Report Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Report Details</DialogTitle>
            <DialogDescription>Review and take action on this report</DialogDescription>
          </DialogHeader>

          {selectedReport && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Badge className={getPriorityColor(selectedReport.priority)}>
                  {selectedReport.priority} priority
                </Badge>
                <Badge className={getStatusColor(selectedReport.status)}>
                  {selectedReport.status}
                </Badge>
                <Badge variant="outline">{selectedReport.type}</Badge>
              </div>

              <div>
                <h3 className="font-semibold text-lg mb-2">{selectedReport.title}</h3>
                <p className="text-gray-600">{selectedReport.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium">Reporter</p>
                  <p className="text-gray-600">{selectedReport.reporter}</p>
                </div>
                <div>
                  <p className="font-medium">Reported User</p>
                  <p className="text-gray-600">{selectedReport.reportedUser}</p>
                </div>
                {selectedReport.reportedContent && (
                  <>
                    <div>
                      <p className="font-medium">Reported Content</p>
                      <p className="text-gray-600">{selectedReport.reportedContent}</p>
                    </div>
                  </>
                )}
                <div>
                  <p className="font-medium">Created At</p>
                  <p className="text-gray-600">{selectedReport.createdAt}</p>
                </div>
                <div>
                  <p className="font-medium">Last Updated</p>
                  <p className="text-gray-600">{selectedReport.updatedAt}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="font-medium mb-2">Actions</p>
                <div className="flex flex-wrap gap-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ reportId: selectedReport.id, status: "investigating" })}
                    disabled={selectedReport.status === "investigating"}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Investigate
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="text-green-600"
                    onClick={() => updateStatusMutation.mutate({ reportId: selectedReport.id, status: "resolved" })}
                    disabled={selectedReport.status === "resolved"}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Resolve
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => updateStatusMutation.mutate({ reportId: selectedReport.id, status: "dismissed" })}
                    disabled={selectedReport.status === "dismissed"}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Dismiss
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => {
                      if (confirm(`Are you sure you want to suspend ${selectedReport.reportedUser}?`)) {
                        toast({ title: "User suspended", description: "The reported user has been suspended" });
                        setIsViewModalOpen(false);
                      }
                    }}
                  >
                    <Ban className="h-4 w-4 mr-2" />
                    Suspend User
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
