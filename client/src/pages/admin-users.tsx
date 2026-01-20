import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AdminLayout from "@/components/AdminLayout";
import { apiEndpoint } from "@/lib/config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, Plus, Search as SearchIcon, Filter as FilterIcon, Edit, Trash2,
  Mail, Shield, GraduationCap, UserCog, Download, Upload, CheckCircle, XCircle,
  RefreshCw, UserPlus
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface User {
  id: number;
  username: string;
  email: string;
  fullName: string;
  role: 'student' | 'teacher' | 'admin' | 'parent';
  status: 'active' | 'inactive' | 'pending';
  createdAt: string;
  lastLogin?: string;
  profilePicture?: string;
}

export default function AdminUsers() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<'all' | User['role']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | User['status']>('all');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'role' | 'status'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [creatingUser, setCreatingUser] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    role: "student" as 'student' | 'teacher' | 'admin' | 'parent',
    status: "active" as 'active' | 'inactive' | 'pending',
    temporaryPassword: "",
  });

  const pageSize = 8;

  useEffect(() => {
    fetchUsers();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, roleFilter, statusFilter, sortOption]);

  const fetchUsers = async () => {
    try {
      const response = await fetch(apiEndpoint('/api/admin/users'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        const mappedUsers = (data.users || []).map((u: any) => ({
          id: u.id,
          username: u.username,
          email: u.email,
          fullName: u.fullName || u.username || 'Unknown User',
          role: (u.role as any) || 'student',
          status: u.status || (u.isActive ? 'active' : 'inactive'),
          createdAt: u.createdAt || new Date().toISOString(),
          lastLogin: u.lastLogin,
          profilePicture: u.profilePicture,
        }));
        setUsers(mappedUsers);
      } else {
        // Demo data
        setUsers([
          { id: 1, username: "jsmith", email: "john.smith@school.edu", fullName: "John Smith", role: "student", status: "active", createdAt: "2024-09-01", lastLogin: "2024-12-02" },
          { id: 2, username: "ejohnson", email: "emma.johnson@school.edu", fullName: "Emma Johnson", role: "student", status: "active", createdAt: "2024-09-01", lastLogin: "2024-12-03" },
          { id: 3, username: "mwilliams", email: "michael.williams@school.edu", fullName: "Michael Williams", role: "student", status: "inactive", createdAt: "2024-09-01" },
          { id: 4, username: "sanderson", email: "sarah.anderson@school.edu", fullName: "Sarah Anderson", role: "teacher", status: "active", createdAt: "2024-08-15", lastLogin: "2024-12-03" },
          { id: 5, username: "droberts", email: "david.roberts@school.edu", fullName: "David Roberts", role: "teacher", status: "active", createdAt: "2024-08-15", lastLogin: "2024-12-02" },
          { id: 6, username: "admin1", email: "admin@eduverse.com", fullName: "System Admin", role: "admin", status: "active", createdAt: "2024-01-01", lastLogin: "2024-12-03" },
          { id: 7, username: "pjohnson", email: "parent.johnson@email.com", fullName: "Patricia Johnson", role: "parent", status: "active", createdAt: "2024-09-05", lastLogin: "2024-12-01" },
          { id: 8, username: "rthomas", email: "robert.thomas@school.edu", fullName: "Robert Thomas", role: "student", status: "pending", createdAt: "2024-12-01" },
        ]);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email || !newUser.temporaryPassword) {
      toast({ title: 'Missing info', description: 'Name, email, and temporaryPassword are required', variant: 'destructive' });
      return;
    }

    const username = newUser.email.split('@')[0] || newUser.name.replace(/\s+/g, '').toLowerCase();
    setCreatingUser(true);

    try {
      const response = await fetch(apiEndpoint('/api/admin/users'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          username,
          fullName: newUser.name,
          email: newUser.email,
          temporaryPassword: newUser.temporaryPassword,
          role: newUser.role,
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to create user');
      }

      const payload = await response.json();
      const created = payload.user || payload;
      const mappedUser: User = {
        id: created.id ?? Math.floor(Math.random() * 1_000_000),
        username: created.username ?? username,
        email: created.email ?? newUser.email,
        fullName: created.fullName ?? newUser.name,
        role: created.role ?? newUser.role,
        status: created.status ?? newUser.status,
        createdAt: created.createdAt ?? new Date().toISOString(),
        lastLogin: created.lastLogin,
        profilePicture: created.profilePicture,
      };

      setUsers(prev => [mappedUser, ...prev]);
      setIsAddModalOpen(false);
      setNewUser({ name: '', email: '', role: 'student', status: 'active', temporaryPassword: '' });
      setCurrentPage(1);
      toast({ title: 'Success', description: 'User created successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to create user',
        variant: 'destructive'
      });
    } finally {
      setCreatingUser(false);
    }
  };

  const filteredUsers = users.filter(u => {
    const matchesSearch =
      (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (u.username || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc':
        return (a.fullName || '').localeCompare(b.fullName || '');
      case 'name-desc':
        return (b.fullName || '').localeCompare(a.fullName || '');
      case 'role':
        return (a.role || '').localeCompare(b.role || '');
      case 'status':
        return (a.status || '').localeCompare(b.status || '');
      case 'oldest':
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'recent':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIdx = sortedUsers.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, sortedUsers.length);
  const currentPageUsers = sortedUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  const activeFilters = Number(roleFilter !== 'all') + Number(statusFilter !== 'all');

  const handlePageChange = (page: number) => {
    const next = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(next);
  };

  const handleExportUsers = () => {
    const dataToExport = sortedUsers;
    
    if (dataToExport.length === 0) {
      toast({
        title: "No Data",
        description: "There are no users to export.",
        variant: "destructive"
      });
      return;
    }

    const headers = ["ID", "Username", "Full Name", "Email", "Role", "Status", "Created At", "Last Login"];
    const csvContent = [
      headers.join(","),
      ...dataToExport.map(user => [
        user.id,
        `"${user.username || ''}"`,
        `"${user.fullName || ''}"`,
        `"${user.email || ''}"`,
        user.role || '',
        user.status || '',
        user.createdAt || '',
        user.lastLogin || ''
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `eduverse_users_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: `Exported ${dataToExport.length} users to CSV file.`,
    });
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const response = await fetch(apiEndpoint(`/api/admin/users/${userId}`), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.error || 'Failed to delete user');
      }

      toast({ title: "Success", description: "User deleted successfully" });
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete user",
        variant: "destructive"
      });
    }
  };

  const handleToggleStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    
    try {
      const response = await fetch(apiEndpoint(`/api/admin/users/${userId}/status`), {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      // Update locally
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus as any } : u));
      toast({ title: "Success", description: `User ${newStatus === 'active' ? 'activated' : 'deactivated'}` });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update user status",
        variant: "destructive"
      });
    }
  };

  // old role badge helpers and filtered counts removed as layout changed to reference design

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-white/10 rounded-full animate-spin border-t-[#FFD700]" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading users...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 px-6 md:px-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">User Management</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium">Control platform access, roles, and security permissions.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-3 bg-[#FFD700] text-[#0a192f] h-12 md:h-14 px-6 md:px-8 rounded-2xl font-black shadow-[0_10px_30px_rgba(242,208,13,0.3)] hover:scale-105 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
            Onboard New User
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-[#0f2342] border border-slate-200 dark:border-white/10 p-3 rounded-3xl">
          <div className="flex items-center h-12 bg-slate-50 dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 w-full lg:w-[400px] focus-within:ring-2 focus-within:ring-[#FFD700]/30 transition-all">
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 mr-3">search</span>
            <input 
              type="text" 
              placeholder="Search by name, email or ID..." 
              className="bg-transparent border-none text-slate-900 dark:text-white text-sm placeholder-slate-500 dark:placeholder-slate-400 focus:ring-0 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-3 w-full lg:w-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-black hover:border-[#FFD700]/50 transition-colors">
                  <span className="material-symbols-outlined text-sm">filter_alt</span>
                  Filters{activeFilters ? ` • ${activeFilters}` : ''}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Role</div>
                <DropdownMenuRadioGroup value={roleFilter} onValueChange={(value) => setRoleFilter(value as any)}>
                  <DropdownMenuRadioItem value="all">All roles</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="admin">Admin</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="teacher">Teacher</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="student">Student</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="parent">Parent</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <div className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Status</div>
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <DropdownMenuRadioItem value="all">All statuses</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pending">Pending</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="inactive">Inactive</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm font-black hover:border-[#FFD700]/50 transition-colors">
                  <span className="material-symbols-outlined text-sm">swap_vert</span>
                  Sort
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuRadioGroup value={sortOption} onValueChange={(value) => setSortOption(value as any)}>
                  <DropdownMenuRadioItem value="recent">Newest first</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">Oldest first</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name-asc">Name A→Z</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="name-desc">Name Z→A</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="role">Role</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="status">Status</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              onClick={handleExportUsers}
              className="flex-1 lg:flex-none flex items-center justify-center gap-2 h-12 px-6 rounded-2xl bg-[#FFD700]/10 text-[#0a192f] dark:text-[#FFD700] border border-[#FFD700]/30 text-sm font-black hover:bg-[#FFD700]/20 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">download</span>
              Export
            </button>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0a192f]/30 border-b border-slate-200 dark:border-white/10">
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">User Details</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Role</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Join Date</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                <AnimatePresence>
                  {currentPageUsers.map((user) => (
                    <motion.tr 
                      key={user.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-slate-50 dark:hover:bg-[#0a192f]/20 transition-colors"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div className="size-12 rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 group-hover:border-[#FFD700]/50 transition-colors">
                            {user.profilePicture ? (
                              <img src={user.profilePicture} alt={user.fullName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-100 dark:bg-[#0a192f] text-slate-600 dark:text-slate-300 font-bold">
                                {(user.fullName || 'U').split(' ').map(n => n[0] || '').join('').toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-black text-base">{user.fullName}</span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs">{user.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black border uppercase tracking-wider ${
                          user.role === 'admin' ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/20' : 
                          user.role === 'teacher' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 
                          user.role === 'student' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                          'bg-pink-500/10 text-pink-500 border-pink-500/20'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="p-6">
                        <span className="text-slate-600 dark:text-slate-300 text-sm font-bold">
                          {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${
                            (user.status || 'inactive') === 'active' ? 'bg-green-500' :
                            (user.status || 'inactive') === 'pending' ? 'bg-[#FFD700] animate-pulse' :
                            (user.status || 'inactive') === 'inactive' ? 'bg-gray-500' : 'bg-red-400'
                          }`}></div>
                          <span className="text-slate-900 dark:text-white text-sm font-black">
                            {user.status}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => handleToggleStatus(user.id, user.status)}
                            className="size-10 rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-400/40 transition-all"
                            title={user.status === 'active' ? 'Deactivate user' : 'Activate user'}
                          >
                            <span className="material-symbols-outlined">power_settings_new</span>
                          </button>
                          <button 
                            onClick={() => handleDeleteUser(user.id)}
                            className="size-10 rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-400/30 transition-all"
                          >
                            <span className="material-symbols-outlined">delete</span>
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-6 bg-slate-50 dark:bg-[#0a192f]/30 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
            <p className="text-slate-600 dark:text-slate-300 text-sm font-bold">
              Showing <span className="text-slate-900 dark:text-white">{startIdx === 0 ? '0-0' : `${startIdx}-${endIdx}`}</span> of <span className="text-slate-900 dark:text-white">{sortedUsers.length}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(safePage - 1)}
                disabled={safePage === 1}
                className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {pageNumbers.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`size-10 flex items-center justify-center rounded-xl border text-sm font-black transition-colors ${
                    page === safePage
                      ? 'bg-[#FFD700] text-[#0a192f] border-[#FFD700]'
                      : 'bg-white dark:bg-[#0a192f] border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(safePage + 1)}
                disabled={safePage === totalPages || sortedUsers.length === 0}
                className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add User Modal */}
        <AnimatePresence>
          {isAddModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsAddModalOpen(false)}
                className="absolute inset-0 bg-slate-900/70 dark:bg-slate-900/90 backdrop-blur-md"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 w-full max-w-lg rounded-[2rem] shadow-2xl relative z-10 overflow-hidden"
              >
                <div className="p-6 border-b border-slate-200 dark:border-white/10 flex justify-between items-center bg-slate-50 dark:bg-[#0a192f]/30">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#FFD700]/20 p-2 rounded-xl text-[#FFD700]">
                      <span className="material-symbols-outlined">person_add</span>
                    </div>
                    <h3 className="text-slate-900 dark:text-white text-xl font-black">Onboard User</h3>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Full Name</label>
                    <input 
                      required
                      type="text" 
                      value={newUser.name}
                      onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                      placeholder="e.g. John Doe"
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Email Address</label>
                    <input 
                      required
                      type="email" 
                      value={newUser.email}
                      onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                      placeholder="name@example.com"
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Temporary Password</label>
                    <input 
                      required
                      type="password" 
                      value={newUser.temporaryPassword}
                      onChange={(e) => setNewUser({...newUser, temporaryPassword: e.target.value})}
                      placeholder="Minimum 8 characters"
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Role</label>
                      <select 
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value as any})}
                        className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold appearance-none focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all"
                      >
                        <option value="student">Student</option>
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="parent">Parent</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        value={newUser.status}
                        onChange={(e) => setNewUser({...newUser, status: e.target.value as any})}
                        className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold appearance-none focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all"
                      >
                        <option value="active">Active</option>
                        <option value="pending">Pending</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="flex-1 h-12 rounded-2xl font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0a192f]/50 border border-transparent transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      disabled={creatingUser}
                      className="flex-1 bg-[#FFD700] text-[#0a192f] h-12 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {creatingUser ? 'Creating...' : 'Create Account'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AdminLayout>
  );
}
