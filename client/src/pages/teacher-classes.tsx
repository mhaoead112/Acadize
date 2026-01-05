import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { 
  BookOpen, 
  Users, 
  Plus, 
  Edit, 
  FileText, 
  Calendar,
  Clock,
  Settings,
  Upload,
  QrCode,
  MoreVertical
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Form schema for creating/editing classes
const classFormSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100, "Class name too long"),
  description: z.string().max(500, "Description too long").optional(),
  subject: z.string().min(1, "Subject is required"),
  gradeLevel: z.string().min(1, "Grade level is required"),
  maxStudents: z.number().min(1, "Must allow at least 1 student").max(100, "Too many students"),
  schedule: z.object({
    days: z.array(z.string()).optional(),
    time: z.string().optional(),
    room: z.string().optional(),
  }).optional(),
});

type ClassFormData = z.infer<typeof classFormSchema>;

interface Class {
  id: string;
  name: string;
  description?: string;
  subject: string;
  gradeLevel: string;
  teacherId: string;
  classCode: string;
  schedule: any;
  isActive: boolean;
  maxStudents: number;
  enrolledStudents: number;
  createdAt: string;
}

export default function TeacherClasses() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const { toast } = useToast();

  // Mock data for development - will be replaced with real API calls
  const mockClasses: Class[] = [
    {
      id: "1",
      name: "Algebra I",
      description: "Introduction to algebraic concepts and problem solving",
      subject: "Mathematics",
      gradeLevel: "Grade 9",
      teacherId: "teacher1",
      classCode: "ALG001",
      schedule: { days: ["Monday", "Wednesday", "Friday"], time: "9:00 AM", room: "Room 101" },
      isActive: true,
      maxStudents: 30,
      enrolledStudents: 28,
      createdAt: "2024-01-15T00:00:00Z"
    },
    {
      id: "2", 
      name: "Biology 101",
      description: "Basic principles of biology and life sciences",
      subject: "Science",
      gradeLevel: "Grade 10",
      teacherId: "teacher1",
      classCode: "BIO101",
      schedule: { days: ["Tuesday", "Thursday"], time: "11:30 AM", room: "Lab 203" },
      isActive: true,
      maxStudents: 25,
      enrolledStudents: 23,
      createdAt: "2024-01-20T00:00:00Z"
    }
  ];

  const form = useForm<ClassFormData>({
    resolver: zodResolver(classFormSchema),
    defaultValues: {
      name: "",
      description: "",
      subject: "",
      gradeLevel: "",
      maxStudents: 30,
      schedule: {
        days: [],
        time: "",
        room: "",
      },
    },
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (data: ClassFormData) => apiRequest('POST', '/api/classes', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Class created successfully!" });
      setIsCreateDialogOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ['/api/classes'] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create class", variant: "destructive" });
    },
  });

  const onSubmit = (data: ClassFormData) => {
    createClassMutation.mutate(data);
  };

  const generateClassCode = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    return code;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              My Classes
            </h1>
            <p className="text-gray-600">
              Manage your classes, students, and course materials
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-class">
                <Plus className="h-4 w-4 mr-2" />
                Create Class
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Class</DialogTitle>
                <DialogDescription>
                  Set up a new class for your students to join
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Class Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Algebra I" {...field} data-testid="input-class-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-subject">
                                <SelectValue placeholder="Select subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Mathematics">Mathematics</SelectItem>
                              <SelectItem value="Science">Science</SelectItem>
                              <SelectItem value="English">English</SelectItem>
                              <SelectItem value="History">History</SelectItem>
                              <SelectItem value="Art">Art</SelectItem>
                              <SelectItem value="Physical Education">Physical Education</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="gradeLevel"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Grade Level</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-grade-level">
                                <SelectValue placeholder="Select grade" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Elementary">Elementary</SelectItem>
                              <SelectItem value="Grade 6">Grade 6</SelectItem>
                              <SelectItem value="Grade 7">Grade 7</SelectItem>
                              <SelectItem value="Grade 8">Grade 8</SelectItem>
                              <SelectItem value="Grade 9">Grade 9</SelectItem>
                              <SelectItem value="Grade 10">Grade 10</SelectItem>
                              <SelectItem value="Grade 11">Grade 11</SelectItem>
                              <SelectItem value="Grade 12">Grade 12</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="maxStudents"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Max Students</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              {...field} 
                              onChange={(e) => field.onChange(parseInt(e.target.value))}
                              data-testid="input-max-students"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Brief description of the class" 
                            {...field} 
                            data-testid="textarea-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Schedule Time</Label>
                      <Input placeholder="e.g. 9:00 AM" data-testid="input-schedule-time" />
                    </div>
                    <div>
                      <Label>Room</Label>
                      <Input placeholder="e.g. Room 101" data-testid="input-room" />
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-create"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createClassMutation.isPending}
                      data-testid="button-submit-create"
                    >
                      {createClassMutation.isPending ? "Creating..." : "Create Class"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {mockClasses.map((classItem) => (
            <Card key={classItem.id} className="hover:shadow-lg transition-shadow" data-testid={`class-card-${classItem.id}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{classItem.name}</CardTitle>
                    <CardDescription>{classItem.subject} • {classItem.gradeLevel}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" data-testid={`menu-class-${classItem.id}`}>
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem data-testid={`menu-edit-${classItem.id}`}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Class
                      </DropdownMenuItem>
                      <DropdownMenuItem data-testid={`menu-settings-${classItem.id}`}>
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                
                <div className="flex items-center gap-2 mt-2">
                  <Badge variant="secondary" className="text-xs">
                    {classItem.classCode}
                  </Badge>
                  <Badge variant={classItem.isActive ? "default" : "secondary"} className="text-xs">
                    {classItem.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1 text-gray-600">
                      <Users className="h-4 w-4" />
                      Students
                    </span>
                    <span className="font-medium">
                      {classItem.enrolledStudents}/{classItem.maxStudents}
                    </span>
                  </div>
                  
                  {classItem.schedule?.time && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-4 w-4" />
                        Schedule
                      </span>
                      <span className="font-medium">{classItem.schedule.time}</span>
                    </div>
                  )}
                  
                  {classItem.schedule?.room && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1 text-gray-600">
                        <Calendar className="h-4 w-4" />
                        Room
                      </span>
                      <span className="font-medium">{classItem.schedule.room}</span>
                    </div>
                  )}
                  
                  {classItem.description && (
                    <p className="text-sm text-gray-600 mt-2">
                      {classItem.description}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
                  <Button variant="outline" size="sm" className="flex-1" data-testid={`button-view-${classItem.id}`}>
                    <BookOpen className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-share-code-${classItem.id}`}>
                    <QrCode className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {/* Empty State */}
        {mockClasses.length === 0 && (
          <Card className="text-center py-12" data-testid="empty-state">
            <CardContent>
              <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No classes yet
              </h3>
              <p className="text-gray-600 mb-4">
                Create your first class to start teaching and managing students
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-class">
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Class
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
