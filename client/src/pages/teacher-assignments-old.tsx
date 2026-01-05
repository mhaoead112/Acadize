import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint } from "@/lib/config";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Loader2, Plus, Eye, EyeOff, Edit, Trash2, CheckCircle2,
  Clock, FileText, Presentation, BookOpen, GraduationCap, Users, ListChecks
} from "lucide-react";

interface Assignment {
  id: string;
  courseId: string;
  lessonId: string | null;
  title: string;
  description: string | null;
  type: string;
  dueDate: string;
  maxScore: string;
  isPublished: boolean;
  createdAt: string;
  courseTitle: string;
  submissionCount: number;
  gradedCount: number;
}

interface Course {
  id: string;
  title: string;
}

const assignmentTypes = [
  { value: 'homework', label: 'Homework', icon: BookOpen },
  { value: 'quiz', label: 'Quiz', icon: FileText },
  { value: 'exam', label: 'Exam', icon: GraduationCap },
  { value: 'project', label: 'Project', icon: Presentation },
  { value: 'presentation', label: 'Presentation', icon: Presentation },
  { value: 'essay', label: 'Essay', icon: FileText },
];

export default function TeacherAssignmentsPage() {
  const { user, token, isAuthenticated, getAuthHeaders } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [publishingId, setPublishingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<Assignment | null>(null);

  // Create assignment dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    courseId: '',
    title: '',
    description: '',
    type: 'homework',
    dueDate: '',
    maxScore: '100',
  });

  // Edit assignment dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(null);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    type: 'homework',
    dueDate: '',
    maxScore: '100',
  });

  // Fetch courses
  const fetchCourses = async () => {
    if (!token) return;

    try {
      const res = await fetch(apiEndpoint("/api/courses/user"), {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error("Failed to load courses");
      }

      const data = await res.json();
      setCourses(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch courses:", err);
    }
  };

  // Fetch assignments
  const fetchAssignments = async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(apiEndpoint("/api/assignments/teacher"), {
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to load assignments");
      }

      const data = await res.json();
      setAssignments(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch assignments:", err);
      setError(err?.message || "Unknown error");
      toast({
        title: "Error",
        description: "Failed to load assignments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchCourses();
      fetchAssignments();
    } else {
      setIsLoading(false);
    }
  }, [token, isAuthenticated]);

  // Create assignment
  const handleCreateAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const res = await fetch(apiEndpoint(`/api/assignments/courses/${newAssignment.courseId}/assignments`), {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: newAssignment.title,
          description: newAssignment.description,
          type: newAssignment.type,
          dueDate: newAssignment.dueDate,
          maxScore: parseInt(newAssignment.maxScore),
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to create assignment");
      }

      toast({
        title: "Success",
        description: "Assignment created successfully",
        variant: "default"
      });

      setIsCreateDialogOpen(false);
      setNewAssignment({
        courseId: '',
        title: '',
        description: '',
        type: 'homework',
        dueDate: '',
        maxScore: '100',
      });
      fetchAssignments();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to create assignment",
        variant: "destructive"
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Toggle publish
  const handleTogglePublish = async (assignmentId: string, currentStatus: boolean) => {
    setPublishingId(assignmentId);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${assignmentId}/publish`), {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isPublished: !currentStatus })
      });

      if (!res.ok) {
        throw new Error("Failed to update assignment status");
      }

      const { assignment } = await res.json();

      setAssignments(assignments.map(a => a.id === assignmentId ? { ...a, ...assignment } : a));

      toast({
        title: "Success",
        description: `Assignment ${assignment.isPublished ? 'published' : 'unpublished'} successfully`,
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update assignment status",
        variant: "destructive"
      });
    } finally {
      setPublishingId(null);
    }
  };

  // Delete assignment
  const handleDeleteAssignment = async () => {
    if (!assignmentToDelete) return;

    setDeletingId(assignmentToDelete.id);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${assignmentToDelete.id}`), {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      if (!res.ok) {
        throw new Error("Failed to delete assignment");
      }

      setAssignments(assignments.filter(a => a.id !== assignmentToDelete.id));

      toast({
        title: "Success",
        description: "Assignment deleted successfully",
        variant: "default"
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to delete assignment",
        variant: "destructive"
      });
    } finally {
      setDeletingId(null);
      setAssignmentToDelete(null);
    }
  };

  // Open edit dialog
  const openEditDialog = (assignment: Assignment) => {
    setEditingAssignment(assignment);
    setEditFormData({
      title: assignment.title,
      description: assignment.description || '',
      type: assignment.type,
      dueDate: new Date(assignment.dueDate).toISOString().slice(0, 16),
      maxScore: assignment.maxScore,
    });
    setIsEditDialogOpen(true);
  };

  // Edit assignment
  const handleEditAssignment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;

    setIsEditing(true);
    try {
      const res = await fetch(apiEndpoint(`/api/assignments/${editingAssignment.id}`), {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: editFormData.title,
          description: editFormData.description,
          type: editFormData.type,
          dueDate: editFormData.dueDate,
          maxScore: parseInt(editFormData.maxScore),
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update assignment");
      }

      const updatedAssignment = await res.json();

      setAssignments(assignments.map(a => 
        a.id === editingAssignment.id 
          ? { ...a, ...updatedAssignment }
          : a
      ));

      toast({
        title: "Success",
        description: "Assignment updated successfully",
        variant: "default"
      });

      setIsEditDialogOpen(false);
      setEditingAssignment(null);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err?.message || "Failed to update assignment",
        variant: "destructive"
      });
    } finally {
      setIsEditing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    const typeConfig = assignmentTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.icon : BookOpen;
  };

  const getTypeLabel = (type: string) => {
    const typeConfig = assignmentTypes.find(t => t.value === type);
    return typeConfig ? typeConfig.label : type;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Assignments
            </h1>
            <p className="text-gray-600 mt-2">
              Create and manage assignments for your classes
            </p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>
                  Add a new assignment to one of your classes
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateAssignment} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Course *</Label>
                  <Select
                    value={newAssignment.courseId}
                    onValueChange={(value) => setNewAssignment({ ...newAssignment, courseId: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map(course => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    placeholder="e.g., Week 1 Homework"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Assignment Type *</Label>
                  <Select
                    value={newAssignment.type}
                    onValueChange={(value) => setNewAssignment({ ...newAssignment, type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {assignmentTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="h-4 w-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    placeholder="Provide details about the assignment..."
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date *</Label>
                    <Input
                      id="dueDate"
                      type="datetime-local"
                      value={newAssignment.dueDate}
                      onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxScore">Max Score *</Label>
                    <Input
                      id="maxScore"
                      type="number"
                      min="1"
                      value={newAssignment.maxScore}
                      onChange={(e) => setNewAssignment({ ...newAssignment, maxScore: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={isCreating}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Assignment'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Assignments
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {assignments.length}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Published
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    {assignments.filter(a => a.isPublished).length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Drafts
                  </p>
                  <p className="text-2xl font-bold text-orange-600">
                    {assignments.filter(a => !a.isPublished).length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Submissions
                  </p>
                  <p className="text-2xl font-bold text-purple-600">
                    {assignments.reduce((sum, a) => sum + a.submissionCount, 0)}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assignments List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-gray-500">
            <Loader2 className="mr-2 h-6 w-6 animate-spin" />
            Loading assignments...
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="flex items-center gap-2 text-red-700">
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        ) : assignments.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No assignments yet
              </h3>
              <p className="text-gray-600 mb-6">
                Create your first assignment to get started
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {assignments.map((assignment) => {
              const TypeIcon = getTypeIcon(assignment.type);
              return (
                <Card key={assignment.id} className="flex flex-col">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <TypeIcon className="h-4 w-4 text-gray-500 shrink-0" />
                          <Badge variant="outline" className="text-xs">
                            {getTypeLabel(assignment.type)}
                          </Badge>
                          <Badge
                            variant={assignment.isPublished ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {assignment.isPublished ? "Published" : "Draft"}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg line-clamp-2">
                          {assignment.title}
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs">
                          {assignment.courseTitle}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="flex-1 flex flex-col justify-between space-y-4">
                    {assignment.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {assignment.description}
                      </p>
                    )}

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Due Date:</span>
                        <span className="font-medium">{formatDate(assignment.dueDate)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Max Score:</span>
                        <span className="font-medium">{assignment.maxScore} points</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">Submissions:</span>
                        <span className="font-medium">
                          {assignment.submissionCount}
                          {assignment.gradedCount > 0 && (
                            <span className="text-green-600 ml-1">
                              ({assignment.gradedCount} graded)
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setLocation(`/teacher/assignments/${assignment.id}/submissions`)}
                        className="flex-1"
                      >
                        <ListChecks className="h-4 w-4 mr-1" />
                        View Submissions ({assignment.submissionCount})
                      </Button>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <Button
                        size="sm"
                        variant={assignment.isPublished ? "outline" : "default"}
                        onClick={() => handleTogglePublish(assignment.id, assignment.isPublished)}
                        disabled={publishingId === assignment.id}
                        className="flex-1"
                      >
                        {publishingId === assignment.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                            {assignment.isPublished ? 'Hiding...' : 'Publishing...'}
                          </>
                        ) : assignment.isPublished ? (
                          <>
                            <EyeOff className="h-4 w-4 mr-1" />
                            Hide
                          </>
                        ) : (
                          <>
                            <Eye className="h-4 w-4 mr-1" />
                            Publish
                          </>
                        )}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(assignment)}
                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        title="Edit assignment"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setAssignmentToDelete(assignment)}
                        disabled={deletingId === assignment.id}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Delete assignment"
                      >
                        {deletingId === assignment.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!assignmentToDelete} onOpenChange={(open) => !open && setAssignmentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the assignment "{assignmentToDelete?.title}" and all associated submissions and grades. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAssignment}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete Assignment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>
              Update the assignment details
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditAssignment} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title *</Label>
              <Input
                id="edit-title"
                value={editFormData.title}
                onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
                placeholder="Assignment title"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                placeholder="Add instructions or details"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-type">Type *</Label>
                <Select
                  value={editFormData.type}
                  onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {assignmentTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-maxScore">Max Score *</Label>
                <Input
                  id="edit-maxScore"
                  type="number"
                  value={editFormData.maxScore}
                  onChange={(e) => setEditFormData({ ...editFormData, maxScore: e.target.value })}
                  min="1"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">Due Date *</Label>
              <Input
                id="edit-dueDate"
                type="datetime-local"
                value={editFormData.dueDate}
                onChange={(e) => setEditFormData({ ...editFormData, dueDate: e.target.value })}
                required
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isEditing}>
                {isEditing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
