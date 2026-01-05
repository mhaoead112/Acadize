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
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { 
  Flag, AlertTriangle, CheckCircle, Clock, Eye, 
  MessageSquare, User, Ban, Trash2, XCircle, Loader2
} from "lucide-react";

interface Report {
  id: string;
  reportedUserId: string;
  reportedUser?: {
    id: string;
    fullName: string;
    email: string;
  };
  reporterId: string;
  reporter?: {
    id: string;
    fullName: string;
    email: string;
  };
  reason: string;
  description?: string;
  status: "pending" | "reviewed" | "resolved";
  createdAt: string;
  updatedAt?: string;
}

export default function AdminReports() {
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [filter, setFilter] = useState({ status: "all", priority: "all", type: "all" });

  // Fetch reports from API
  const { data: reportsData, isLoading } = useQuery({
    queryKey: ['admin-reports', filter],
    queryFn: async () => {
      const response = await fetch(apiEndpoint('/api/admin/reports'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }
      
      const data = await response.json();
      return data.reports || [];
    },
    enabled: !!token
  });

  // Update report status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ reportId, status }: { reportId: string; status: string }) => {
      const response = await fetch(apiEndpoint(`/api/admin/reports/${reportId}`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update report status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-reports'] });
      toast({
        title: "Success",
        description: "Report status updated successfully"
      });
      setIsViewModalOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

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
      case "reviewed": return "bg-blue-100 text-blue-800";
      case "resolved": return "bg-green-100 text-green-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4" />;
      case "reviewed": return <Eye className="h-4 w-4" />;
      case "resolved": return <CheckCircle className="h-4 w-4" />;
      default: return <Flag className="h-4 w-4" />;
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsViewModalOpen(true);
  };

  const handleUpdateStatus = (status: string) => {
    if (selectedReport) {
      updateStatusMutation.mutate({ reportId: selectedReport.id, status });
    }
  };

  const reports = reportsData || [];
  
  const filteredReports = reports.filter((report: Report) => {
    if (filter.status !== "all" && report.status !== filter.status) return false;
    return true;
  });

  const stats = {
    total: reports.length,
    pending: reports.filter((r: Report) => r.status === "pending").length,
    reviewed: reports.filter((r: Report) => r.status === "reviewed").length,
    resolved: reports.filter((r: Report) => r.status === "resolved").length,
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-purple-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderation Reports</h1>
          <p className="text-gray-600">Review and manage user-reported content</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
              <Flag className="h-4 w-4 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Under Review</CardTitle>
              <Eye className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.reviewed}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.resolved}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={filter.status} onValueChange={(v) => setFilter({ ...filter, status: v })}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Under Review</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Reports Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12">
                  <Flag className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports</h3>
                  <p className="text-gray-500">There are no reports matching your filters</p>
                </div>
              ) : (
                filteredReports.map((report: Report) => (
                  <div key={report.id} className="flex items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-gray-900">{report.reason}</h3>
                        <Badge className={getStatusColor(report.status)}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(report.status)}
                            <span className="capitalize">{report.status}</span>
                          </div>
                        </Badge>
                      </div>
                      
                      {report.description && (
                        <p className="text-gray-600 text-sm">{report.description}</p>
                      )}
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span>Reporter: {report.reporter?.fullName || report.reporter?.email || 'Unknown'}</span>
                        <span>•</span>
                        <span>Reported: {report.reportedUser?.fullName || report.reportedUser?.email || 'Unknown'}</span>
                        <span>•</span>
                        <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* View Report Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Report Details</DialogTitle>
              <DialogDescription>Review and take action on this report</DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Reason</label>
                  <p className="mt-1 text-gray-900">{selectedReport.reason}</p>
                </div>

                {selectedReport.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Description</label>
                    <p className="mt-1 text-gray-900">{selectedReport.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reporter</label>
                    <p className="mt-1 text-gray-900">
                      {selectedReport.reporter?.fullName || selectedReport.reporter?.email || 'Unknown'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Reported User</label>
                    <p className="mt-1 text-gray-900">
                      {selectedReport.reportedUser?.fullName || selectedReport.reportedUser?.email || 'Unknown'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Status</label>
                    <Badge className={`mt-1 ${getStatusColor(selectedReport.status)}`}>
                      {selectedReport.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Created</label>
                    <p className="mt-1 text-gray-900">
                      {new Date(selectedReport.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Update Status
                  </label>
                  <div className="flex gap-2">
                    <Button
                      variant={selectedReport.status === 'pending' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateStatus('pending')}
                      disabled={updateStatusMutation.isPending || selectedReport.status === 'pending'}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Pending
                    </Button>
                    <Button
                      variant={selectedReport.status === 'reviewed' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateStatus('reviewed')}
                      disabled={updateStatusMutation.isPending || selectedReport.status === 'reviewed'}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Under Review
                    </Button>
                    <Button
                      variant={selectedReport.status === 'resolved' ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleUpdateStatus('resolved')}
                      disabled={updateStatusMutation.isPending || selectedReport.status === 'resolved'}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Resolved
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsViewModalOpen(false)}
                disabled={updateStatusMutation.isPending}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
