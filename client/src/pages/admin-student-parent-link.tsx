import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Search, Link as LinkIcon, Unlink, UserCheck, UserX, 
  ChevronRight, AlertCircle, CheckCircle2, User
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Student {
  id: string;
  username: string;
  email: string;
  fullName: string;
  parentId?: string | null;
  parentName?: string;
}

interface Parent {
  id: string;
  username: string;
  email: string;
  fullName: string;
  linkedStudents?: number;
}

interface StudentParentLink {
  studentId: string;
  parentId: string;
}

export default function AdminStudentParentLink() {
  const { t } = useTranslation('admin');
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [students, setStudents] = useState<Student[]>([]);
  const [parents, setParents] = useState<Parent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<'all' | 'linked' | 'unlinked'>('all');
  
  // Link/Unlink modal states
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch students with parent info and parents in parallel
      const [studentsRes, parentsRes] = await Promise.all([
        fetch(apiEndpoint('/api/admin/students-with-parents'), { headers, credentials: 'include' }),
        fetch(apiEndpoint('/api/admin/users?role=parent'), { headers, credentials: 'include' })
      ]);

      if (studentsRes.ok) {
        const studentsData = await studentsRes.json();
        setStudents(studentsData);
      }

      if (parentsRes.ok) {
        const parentsData = await parentsRes.json();
        // Handle both direct array and {users: []} response formats
        const parentsList = Array.isArray(parentsData) ? parentsData : parentsData.users || [];
        setParents(parentsList);
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
      toast({
        title: t('common:toast.error'),
        description: t('toast.failedToLoadStudentsAndParents'),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkStudent = async () => {
    if (!selectedStudent || !selectedParentId) return;

    setIsLinking(true);
    try {
      const response = await fetch(apiEndpoint('/api/admin/link-student-parent'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          studentId: selectedStudent.id,
          parentId: selectedParentId
        })
      });

      if (response.ok) {
        toast({
          title: t('common:toast.success'),
          description: t('toast.linkSuccessWithName', { name: selectedStudent.fullName }),
        });
        setIsLinkModalOpen(false);
        setSelectedStudent(null);
        setSelectedParentId("");
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to link student');
      }
    } catch (error: any) {
      toast({
        title: t('common:toast.error'),
        description: error.message || t('toast.linkError'),
        variant: "destructive",
      });
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkStudent = async (studentId: number) => {
    setIsUnlinking(true);
    try {
      const response = await fetch(apiEndpoint('/api/admin/unlink-student-parent'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ studentId })
      });

      if (response.ok) {
        toast({
          title: t('common:toast.success'),
          description: t('toast.unlinkSuccess'),
        });
        fetchData(); // Refresh data
      } else {
        const error = await response.json();
        throw new Error(error.message || 'Failed to unlink student');
      }
    } catch (error: any) {
      toast({
        title: t('common:toast.error'),
        description: error.message || t('toast.unlinkError'),
        variant: "destructive",
      });
    } finally {
      setIsUnlinking(false);
    }
  };

  const openLinkModal = (student: Student) => {
    setSelectedStudent(student);
    setSelectedParentId(student.parentId?.toString() || "");
    setIsLinkModalOpen(true);
  };

  // Filter and search students
  const filteredStudents = useMemo(() => {
    let filtered = students;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(student => 
        student.fullName.toLowerCase().includes(query) ||
        student.email.toLowerCase().includes(query) ||
        student.username.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (filterStatus === 'linked') {
      filtered = filtered.filter(student => student.parentId);
    } else if (filterStatus === 'unlinked') {
      filtered = filtered.filter(student => !student.parentId);
    }

    return filtered;
  }, [students, searchQuery, filterStatus]);

  const stats = useMemo(() => ({
    total: students.length,
    linked: students.filter(s => s.parentId).length,
    unlinked: students.filter(s => !s.parentId).length,
    totalParents: parents.length
  }), [students, parents]);

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-background">
        <div className="max-w-[1400px] mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              {t('studentParentLinks')}
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Manage relationships between students and their parents
            </p>
          </motion.div>

          {/* Stats Cards */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          >
            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Users className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Students</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Linked</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.linked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-orange-500/10">
                    <AlertCircle className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Unlinked</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.unlinked}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-purple-500/10">
                    <User className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Parents</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white">{stats.totalParents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Search and Filter */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-6"
          >
            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* Search */}
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                    <Input
                      type="text"
                      placeholder="Search students by name, email, or username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 bg-slate-50 dark:bg-background border-slate-200 dark:border-white/10"
                    />
                  </div>

                  {/* Filter */}
                  <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                    <SelectTrigger className="w-full md:w-[200px] bg-slate-50 dark:bg-background border-slate-200 dark:border-white/10">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Students</SelectItem>
                      <SelectItem value="linked">Linked Only</SelectItem>
                      <SelectItem value="unlinked">Unlinked Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Students Table */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-slate-200 dark:border-white/10 bg-white dark:bg-card">
              <CardHeader>
                <CardTitle className="text-slate-900 dark:text-white">Students</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400">
                  Showing {filteredStudents.length} of {students.length} students
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                  </div>
                ) : filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                    <p className="text-slate-600 dark:text-slate-400">No students found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-slate-200 dark:border-white/10">
                          <TableHead className="text-slate-900 dark:text-white">Student</TableHead>
                          <TableHead className="text-slate-900 dark:text-white">Email</TableHead>
                          <TableHead className="text-slate-900 dark:text-white">Status</TableHead>
                          <TableHead className="text-slate-900 dark:text-white">Linked Parent</TableHead>
                          <TableHead className="text-slate-900 dark:text-white text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredStudents.map((student) => (
                          <TableRow 
                            key={student.id} 
                            className="border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
                                  {student.fullName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium text-slate-900 dark:text-white">
                                    {student.fullName}
                                  </p>
                                  <p className="text-xs text-slate-500 dark:text-slate-500">
                                    @{student.username}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-600 dark:text-slate-400">
                              {student.email}
                            </TableCell>
                            <TableCell>
                              {student.parentId ? (
                                <Badge className="bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/30">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Linked
                                </Badge>
                              ) : (
                                <Badge className="bg-orange-100 dark:bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-500/30">
                                  <AlertCircle className="h-3 w-3 mr-1" />
                                  Unlinked
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.parentName ? (
                                <div className="flex items-center gap-2 text-slate-900 dark:text-white">
                                  <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                  {student.parentName}
                                </div>
                              ) : (
                                <span className="text-slate-400 dark:text-slate-600 text-sm">
                                  No parent linked
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openLinkModal(student)}
                                  className="border-slate-200 dark:border-white/10"
                                >
                                  <LinkIcon className="h-4 w-4 mr-1" />
                                  {student.parentId ? 'Change' : 'Link'}
                                </Button>
                                {student.parentId && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleUnlinkStudent(student.id)}
                                    disabled={isUnlinking}
                                    className="border-slate-200 dark:border-white/10 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-500/10"
                                  >
                                    <Unlink className="h-4 w-4 mr-1" />
                                    Unlink
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Link Student Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="bg-white dark:bg-card border-slate-200 dark:border-white/10">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white">
              {selectedStudent?.parentId ? 'Change Parent Link' : 'Link Student to Parent'}
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {selectedStudent?.parentId 
                ? `Change the parent linked to ${selectedStudent?.fullName}`
                : `Select a parent to link with ${selectedStudent?.fullName}`
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900 dark:text-white">
                Select Parent
              </label>
              <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                <SelectTrigger className="bg-slate-50 dark:bg-background border-slate-200 dark:border-white/10">
                  <SelectValue placeholder="Choose a parent..." />
                </SelectTrigger>
                <SelectContent>
                  {parents.length === 0 ? (
                    <div className="p-4 text-center text-slate-500 dark:text-slate-400 text-sm">
                      No parents available
                    </div>
                  ) : (
                    parents.map((parent) => (
                      <SelectItem key={parent.id} value={parent.id.toString()}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                          <div>
                            <div className="font-medium">{parent.fullName}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-500">
                              {parent.email}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false);
                setSelectedStudent(null);
                setSelectedParentId("");
              }}
              className="border-slate-200 dark:border-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleLinkStudent}
              disabled={!selectedParentId || isLinking}
              className="bg-primary hover:bg-primary/90"
            >
              {isLinking ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Linking...
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Link Parent
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
