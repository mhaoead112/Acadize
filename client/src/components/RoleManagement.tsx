import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Shield, 
  Settings, 
  Search,
  Filter,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Crown,
  User,
  GraduationCap
} from "lucide-react";
import { 
  TEACHER_ROLES, 
  TEACHER_PERMISSIONS, 
  PERMISSION_GROUPS,
  type Role, 
  type Permission 
} from "@shared/permissions";
import { PermissionGuard, RoleGuard } from "./PermissionGuard";

interface Teacher {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
  joinedDate: string;
  lastLogin?: string;
  avatar?: string;
}

interface RoleAssignment {
  teacherId: string;
  roleId: string;
  assignedBy: string;
  assignedAt: string;
  expiresAt?: string;
}

export default function RoleManagement() {
  const [activeTab, setActiveTab] = useState("teachers");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [isAssignRoleDialogOpen, setIsAssignRoleDialogOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const { toast } = useToast();

  // Mock data - in real app this would come from API
  const mockTeachers: Teacher[] = [
    {
      id: "1",
      firstName: "Sarah",
      lastName: "Johnson",
      email: "sarah.johnson@eduverse.edu",
      role: "standard_teacher",
      department: "Mathematics",
      isActive: true,
      joinedDate: "2020-08-15T00:00:00Z",
      lastLogin: "2024-01-23T10:30:00Z"
    },
    {
      id: "2",
      firstName: "Michael",
      lastName: "Chen",
      email: "michael.chen@eduverse.edu",
      role: "senior_teacher",
      department: "Science",
      isActive: true,
      joinedDate: "2018-01-10T00:00:00Z",
      lastLogin: "2024-01-23T09:15:00Z"
    },
    {
      id: "3",
      firstName: "Emily",
      lastName: "Davis",
      email: "emily.davis@eduverse.edu",
      role: "department_head",
      department: "English",
      isActive: true,
      joinedDate: "2015-09-01T00:00:00Z",
      lastLogin: "2024-01-23T08:45:00Z"
    },
    {
      id: "4",
      firstName: "David",
      lastName: "Wilson",
      email: "david.wilson@eduverse.edu",
      role: "new_teacher",
      department: "History",
      isActive: true,
      joinedDate: "2024-01-08T00:00:00Z",
      lastLogin: "2024-01-22T16:30:00Z"
    },
    {
      id: "5",
      firstName: "Lisa",
      lastName: "Brown",
      email: "lisa.brown@eduverse.edu",
      role: "substitute_teacher",
      department: "Multiple",
      isActive: false,
      joinedDate: "2023-11-15T00:00:00Z",
      lastLogin: "2024-01-20T14:20:00Z"
    }
  ];

  const departments = ["Mathematics", "Science", "English", "History", "Arts", "Physical Education", "Multiple"];

  // Mutations
  const assignRoleMutation = useMutation({
    mutationFn: (data: { teacherId: string; roleId: string }) => 
      apiRequest('POST', '/api/admin/assign-role', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Role assigned successfully!" });
      setIsAssignRoleDialogOpen(false);
      setSelectedTeacher(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to assign role", variant: "destructive" });
    },
  });

  const updateTeacherStatusMutation = useMutation({
    mutationFn: (data: { teacherId: string; isActive: boolean }) => 
      apiRequest('PUT', '/api/admin/teacher-status', data),
    onSuccess: () => {
      toast({ title: "Success", description: "Teacher status updated!" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update status", variant: "destructive" });
    },
  });

  const getRoleIcon = (roleId: string) => {
    switch (roleId) {
      case 'department_head': return <Crown className="h-4 w-4 text-yellow-600" />;
      case 'senior_teacher': return <GraduationCap className="h-4 w-4 text-blue-600" />;
      case 'standard_teacher': return <User className="h-4 w-4 text-green-600" />;
      case 'new_teacher': return <User className="h-4 w-4 text-purple-600" />;
      case 'substitute_teacher': return <User className="h-4 w-4 text-gray-600" />;
      default: return <User className="h-4 w-4" />;
    }
  };

  const getRoleColor = (roleId: string) => {
    switch (roleId) {
      case 'department_head': return 'bg-yellow-100 text-yellow-800';
      case 'senior_teacher': return 'bg-blue-100 text-blue-800';
      case 'standard_teacher': return 'bg-green-100 text-green-800';
      case 'new_teacher': return 'bg-purple-100 text-purple-800';
      case 'substitute_teacher': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredTeachers = mockTeachers.filter(teacher => {
    const matchesSearch = searchQuery === "" || 
      teacher.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      teacher.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDepartment = selectedDepartment === "all" || teacher.department === selectedDepartment;
    const matchesRole = selectedRole === "all" || teacher.role === selectedRole;
    
    return matchesSearch && matchesDepartment && matchesRole;
  });

  const handleAssignRole = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsAssignRoleDialogOpen(true);
  };

  const handleToggleStatus = (teacherId: string, currentStatus: boolean) => {
    updateTeacherStatusMutation.mutate({ teacherId, isActive: !currentStatus });
  };

  return (
    <PermissionGuard resource="admin" action="manage_teachers">
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Role Management
            </h1>
            <p className="text-gray-600">
              Manage teacher roles and permissions
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="teachers" data-testid="tab-teachers">Teachers</TabsTrigger>
            <TabsTrigger value="roles" data-testid="tab-roles">Roles & Permissions</TabsTrigger>
            <TabsTrigger value="audit" data-testid="tab-audit">Audit Log</TabsTrigger>
          </TabsList>

          <TabsContent value="teachers" className="space-y-6">
            {/* Filters */}
            <Card data-testid="card-teacher-filters">
              <CardContent className="p-6">
                <div className="flex gap-4 flex-wrap">
                  <div className="relative flex-1 min-w-[300px]">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search teachers..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-teachers"
                    />
                  </div>
                  
                  <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                    <SelectTrigger className="w-48" data-testid="select-department-filter">
                      <SelectValue placeholder="Filter by department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  <Select value={selectedRole} onValueChange={setSelectedRole}>
                    <SelectTrigger className="w-48" data-testid="select-role-filter">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      {TEACHER_ROLES.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Teachers List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredTeachers.map((teacher) => (
                <Card key={teacher.id} className="hover:shadow-md transition-shadow" data-testid={`teacher-card-${teacher.id}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={teacher.avatar} />
                          <AvatarFallback>
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-gray-900">
                            {teacher.firstName} {teacher.lastName}
                          </h3>
                          <p className="text-sm text-gray-600">
                            {teacher.email}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {teacher.isActive ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Role:</span>
                        <Badge className={getRoleColor(teacher.role)}>
                          <div className="flex items-center gap-1">
                            {getRoleIcon(teacher.role)}
                            {TEACHER_ROLES.find(r => r.id === teacher.role)?.name}
                          </div>
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Department:</span>
                        <span className="text-sm font-medium">{teacher.department}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Joined:</span>
                        <span className="text-sm">{new Date(teacher.joinedDate).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <Switch
                          checked={teacher.isActive}
                          onCheckedChange={() => handleToggleStatus(teacher.id, teacher.isActive)}
                          data-testid={`switch-teacher-status-${teacher.id}`}
                        />
                      </div>
                    </div>
                    
                    <Separator className="my-4" />
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleAssignRole(teacher)}
                        data-testid={`button-assign-role-${teacher.id}`}
                      >
                        <Edit className="h-4 w-4 mr-1" />
                        Change Role
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        data-testid={`button-view-teacher-${teacher.id}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTeachers.length === 0 && (
              <div className="text-center py-8" data-testid="empty-teachers-list">
                <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No teachers found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search filters.
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="roles" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {TEACHER_ROLES.map((role) => (
                <Card key={role.id} data-testid={`role-card-${role.id}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRoleIcon(role.id)}
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                      </div>
                      <Badge className={getRoleColor(role.id)}>
                        {role.permissions.length} permissions
                      </Badge>
                    </div>
                    <CardDescription>{role.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-48">
                      <div className="space-y-3">
                        {Object.entries(PERMISSION_GROUPS).map(([groupName, resources]) => {
                          const groupPermissions = role.permissions.filter(p => 
                            (resources as readonly string[]).includes(p.resource)
                          );
                          
                          if (groupPermissions.length === 0) return null;
                          
                          return (
                            <div key={groupName}>
                              <h5 className="text-sm font-semibold text-gray-900 mb-2">
                                {groupName}
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {groupPermissions.map((permission, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="secondary" 
                                    className="text-xs"
                                  >
                                    {permission.action}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="audit" className="space-y-6">
            <Card data-testid="card-audit-log">
              <CardHeader>
                <CardTitle>Role Assignment Audit Log</CardTitle>
                <CardDescription>Track all role changes and assignments</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Audit Log
                  </h3>
                  <p className="text-gray-600">
                    Audit trail for role assignments and changes would be displayed here.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Assign Role Dialog */}
        <Dialog open={isAssignRoleDialogOpen} onOpenChange={setIsAssignRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Assign Role</DialogTitle>
              <DialogDescription>
                Change the role for {selectedTeacher?.firstName} {selectedTeacher?.lastName}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Current Role</Label>
                <div className="mt-1">
                  <Badge className={getRoleColor(selectedTeacher?.role || '')}>
                    {TEACHER_ROLES.find(r => r.id === selectedTeacher?.role)?.name}
                  </Badge>
                </div>
              </div>
              
              <div>
                <Label>New Role</Label>
                <Select data-testid="select-new-role">
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select new role" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEACHER_ROLES.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        <div className="flex items-center gap-2">
                          {getRoleIcon(role.id)}
                          {role.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setIsAssignRoleDialogOpen(false)}
                  data-testid="button-cancel-role-assignment"
                >
                  Cancel
                </Button>
                <Button 
                  disabled={assignRoleMutation.isPending}
                  data-testid="button-confirm-role-assignment"
                >
                  {assignRoleMutation.isPending ? "Assigning..." : "Assign Role"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </PermissionGuard>
  );
}
