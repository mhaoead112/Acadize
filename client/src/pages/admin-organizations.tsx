import { useState, useEffect } from "react";
import AdminLayout from "@/components/AdminLayout";
import { apiEndpoint } from "@/lib/config";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface Organization {
  id: string;
  name: string;
  subdomain: string;
  customDomain?: string;
  plan: 'free' | 'pro' | 'enterprise';
  isActive: boolean;
  createdAt: string;
  logoUrl?: string;
  primaryColor?: string;
  userCount?: number;
  courseCount?: number;
}

export default function AdminOrganizations() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<'all' | Organization['plan']>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [sortOption, setSortOption] = useState<'recent' | 'oldest' | 'name-asc' | 'name-desc' | 'users'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  const [creating, setCreating] = useState(false);
  const [newOrg, setNewOrg] = useState({
    name: "",
    subdomain: "",
    plan: "free" as Organization['plan'],
    contactEmail: "",
    primaryColor: "#6366f1",
    maxUsers: "",
    maxCourses: "",
  });

  const pageSize = 8;

  useEffect(() => {
    fetchOrganizations();
  }, [token]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, planFilter, statusFilter, sortOption]);

  const fetchOrganizations = async () => {
    try {
      const response = await fetch(apiEndpoint('/api/admin/organizations'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOrganizations(data.organizations || []);
      } else {
        // Demo data fallback
        setOrganizations([
          { id: 'org_default_system', name: 'System Default', subdomain: 'default', plan: 'enterprise', isActive: true, createdAt: '2024-01-01', userCount: 150, courseCount: 25 },
          { id: 'org_acme_school', name: 'ACME School', subdomain: 'acme', plan: 'pro', isActive: true, createdAt: '2024-06-15', userCount: 85, courseCount: 12 },
          { id: 'org_demo', name: 'Demo Organization', subdomain: 'demo', plan: 'free', isActive: true, createdAt: '2024-09-01', userCount: 10, courseCount: 3 },
          { id: 'org_inactive', name: 'Inactive School', subdomain: 'inactive', plan: 'free', isActive: false, createdAt: '2024-03-20', userCount: 0, courseCount: 0 },
        ]);
      }
    } catch (error) {
      console.error('Error fetching organizations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrg.name || !newOrg.subdomain) {
      toast({ title: 'Missing info', description: 'Name and subdomain are required', variant: 'destructive' });
      return;
    }

    setCreating(true);
    try {
      const response = await fetch(apiEndpoint('/api/admin/organizations'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          name: newOrg.name,
          subdomain: newOrg.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
          plan: newOrg.plan,
          contactEmail: newOrg.contactEmail || null,
          primaryColor: newOrg.primaryColor,
          maxUsers: newOrg.maxUsers ? parseInt(newOrg.maxUsers) : null,
          maxCourses: newOrg.maxCourses ? parseInt(newOrg.maxCourses) : null,
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        throw new Error(error?.message || 'Failed to create organization');
      }

      const created = await response.json();
      setOrganizations(prev => [{ ...created, userCount: 0, courseCount: 0 }, ...prev]);
      setIsAddModalOpen(false);
      setNewOrg({ name: '', subdomain: '', plan: 'free', contactEmail: '', primaryColor: '#6366f1', maxUsers: '', maxCourses: '' });
      toast({ title: 'Success', description: 'Organization created successfully' });
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to create organization',
        variant: 'destructive'
      });
    } finally {
      setCreating(false);
    }
  };

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrg) return;

    try {
      const response = await fetch(apiEndpoint(`/api/admin/organizations/${editingOrg.id}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(editingOrg)
      });

      if (!response.ok) throw new Error('Failed to update');

      const updated = await response.json();
      setOrganizations(prev => prev.map(o => o.id === updated.id ? { ...o, ...updated } : o));
      setIsEditModalOpen(false);
      setEditingOrg(null);
      toast({ title: 'Success', description: 'Organization updated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update organization', variant: 'destructive' });
    }
  };

  const handleDeleteOrg = async (orgId: string) => {
    if (orgId === 'org_default_system') {
      toast({ title: 'Error', description: 'Cannot delete system organization', variant: 'destructive' });
      return;
    }
    if (!confirm("Are you sure you want to deactivate this organization?")) return;

    try {
      await fetch(apiEndpoint(`/api/admin/organizations/${orgId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });
      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, isActive: false } : o));
      toast({ title: 'Success', description: 'Organization deactivated' });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete organization', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async (orgId: string, currentActive: boolean) => {
    try {
      await fetch(apiEndpoint(`/api/admin/organizations/${orgId}`), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ isActive: !currentActive })
      });
      setOrganizations(prev => prev.map(o => o.id === orgId ? { ...o, isActive: !currentActive } : o));
      toast({ title: 'Success', description: `Organization ${!currentActive ? 'activated' : 'deactivated'}` });
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
    }
  };

  const filteredOrgs = organizations.filter(org => {
    const matchesSearch = org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      org.subdomain.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === 'all' || org.plan === planFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' ? org.isActive : !org.isActive);
    return matchesSearch && matchesPlan && matchesStatus;
  });

  const sortedOrgs = [...filteredOrgs].sort((a, b) => {
    switch (sortOption) {
      case 'name-asc': return a.name.localeCompare(b.name);
      case 'name-desc': return b.name.localeCompare(a.name);
      case 'users': return (b.userCount || 0) - (a.userCount || 0);
      case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      case 'recent':
      default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedOrgs.length / pageSize));
  const safePage = Math.max(1, Math.min(currentPage, totalPages));
  const startIdx = sortedOrgs.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(safePage * pageSize, sortedOrgs.length);
  const currentPageOrgs = sortedOrgs.slice((safePage - 1) * pageSize, safePage * pageSize);
  const pageNumbers = Array.from({ length: totalPages }, (_, idx) => idx + 1);
  const activeFilters = Number(planFilter !== 'all') + Number(statusFilter !== 'all');

  const getPlanBadgeStyle = (plan: string) => {
    switch (plan) {
      case 'enterprise': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'pro': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-slate-200 dark:border-white/10 rounded-full animate-spin border-t-[#FFD700]" />
          </div>
          <p className="text-slate-600 dark:text-slate-300 font-medium">Loading organizations...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8 pb-12 px-6 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">Organizations</h1>
            <p className="text-slate-600 dark:text-slate-300 mt-2 font-medium">Manage multi-tenant organizations and their settings.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-3 bg-[#FFD700] text-[#0a192f] h-12 md:h-14 px-6 md:px-8 rounded-2xl font-black shadow-[0_10px_30px_rgba(242,208,13,0.3)] hover:scale-105 transition-all active:scale-95 group"
          >
            <span className="material-symbols-outlined group-hover:rotate-90 transition-transform">add</span>
            New Organization
          </button>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white dark:bg-[#0f2342] border border-slate-200 dark:border-white/10 p-3 rounded-3xl">
          <div className="flex items-center h-12 bg-slate-50 dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 w-full lg:w-[400px] focus-within:ring-2 focus-within:ring-[#FFD700]/30 transition-all">
            <span className="material-symbols-outlined text-slate-500 dark:text-slate-400 mr-3">search</span>
            <input 
              type="text" 
              placeholder="Search organizations..." 
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
                <div className="px-3 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Plan</div>
                <DropdownMenuRadioGroup value={planFilter} onValueChange={(value) => setPlanFilter(value as any)}>
                  <DropdownMenuRadioItem value="all">All plans</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="enterprise">Enterprise</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="pro">Pro</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="free">Free</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <div className="px-3 pt-1 pb-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Status</div>
                <DropdownMenuRadioGroup value={statusFilter} onValueChange={(value) => setStatusFilter(value as any)}>
                  <DropdownMenuRadioItem value="all">All</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="active">Active</DropdownMenuRadioItem>
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
                  <DropdownMenuRadioItem value="users">Most users</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-[#112240] border border-slate-200 dark:border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="overflow-x-auto no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 dark:bg-[#0a192f]/30 border-b border-slate-200 dark:border-white/10">
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Organization</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Subdomain</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Plan</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Users</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest">Status</th>
                  <th className="p-6 text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/10">
                <AnimatePresence>
                  {currentPageOrgs.map((org) => (
                    <motion.tr 
                      key={org.id}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group hover:bg-slate-50 dark:hover:bg-[#0a192f]/20 transition-colors"
                    >
                      <td className="p-6">
                        <div className="flex items-center gap-4">
                          <div 
                            className="size-12 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-white/10 group-hover:border-[#FFD700]/50 transition-colors"
                            style={{ backgroundColor: org.primaryColor ? `${org.primaryColor}20` : '#6366f120' }}
                          >
                            {org.logoUrl ? (
                              <img src={org.logoUrl} alt={org.name} className="w-full h-full object-cover rounded-2xl" />
                            ) : (
                              <span className="text-lg font-black" style={{ color: org.primaryColor || '#6366f1' }}>
                                {org.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col">
                            <span className="text-slate-900 dark:text-white font-black text-base">{org.name}</span>
                            <span className="text-slate-600 dark:text-slate-300 text-xs">
                              {new Date(org.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-6">
                        <code className="bg-slate-100 dark:bg-[#0a192f] px-3 py-1 rounded-lg text-sm font-mono text-slate-700 dark:text-slate-300">
                          {org.subdomain}.eduverse.io
                        </code>
                      </td>
                      <td className="p-6">
                        <span className={`px-4 py-1.5 rounded-xl text-xs font-black border uppercase tracking-wider ${getPlanBadgeStyle(org.plan)}`}>
                          {org.plan}
                        </span>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <span className="material-symbols-outlined text-slate-400 text-sm">group</span>
                          <span className="text-slate-900 dark:text-white font-bold">{org.userCount || 0}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <div className="flex items-center gap-2">
                          <div className={`size-2 rounded-full ${org.isActive ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                          <span className="text-slate-900 dark:text-white text-sm font-black">
                            {org.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>
                      <td className="p-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => { setEditingOrg(org); setIsEditModalOpen(true); }}
                            className="size-10 rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-blue-500 hover:border-blue-400/40 transition-all"
                            title="Edit organization"
                          >
                            <span className="material-symbols-outlined">edit</span>
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(org.id, org.isActive)}
                            className="size-10 rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-emerald-500 hover:border-emerald-400/40 transition-all"
                            title={org.isActive ? 'Deactivate' : 'Activate'}
                          >
                            <span className="material-symbols-outlined">power_settings_new</span>
                          </button>
                          {org.id !== 'org_default_system' && (
                            <button 
                              onClick={() => handleDeleteOrg(org.id)}
                              className="size-10 rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:text-red-500 hover:border-red-400/30 transition-all"
                              title="Delete organization"
                            >
                              <span className="material-symbols-outlined">delete</span>
                            </button>
                          )}
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
              Showing <span className="text-slate-900 dark:text-white">{startIdx === 0 ? '0-0' : `${startIdx}-${endIdx}`}</span> of <span className="text-slate-900 dark:text-white">{sortedOrgs.length}</span>
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                disabled={safePage === 1}
                className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              {pageNumbers.slice(0, 5).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
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
                onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                disabled={safePage === totalPages || sortedOrgs.length === 0}
                className="size-10 flex items-center justify-center rounded-xl bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 disabled:opacity-30"
              >
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
        </div>

        {/* Add Organization Modal */}
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
                      <span className="material-symbols-outlined">domain_add</span>
                    </div>
                    <h3 className="text-slate-900 dark:text-white text-xl font-black">New Organization</h3>
                  </div>
                  <button onClick={() => setIsAddModalOpen(false)} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleCreateOrg} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Organization Name</label>
                    <input 
                      required
                      type="text" 
                      value={newOrg.name}
                      onChange={(e) => setNewOrg({...newOrg, name: e.target.value, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-')})}
                      placeholder="e.g. Acme School"
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Subdomain</label>
                    <div className="flex items-center">
                      <input 
                        required
                        type="text" 
                        value={newOrg.subdomain}
                        onChange={(e) => setNewOrg({...newOrg, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        placeholder="acme-school"
                        className="flex-1 h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-l-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                      <div className="h-12 px-4 bg-slate-100 dark:bg-[#0a192f] border-y border-r border-slate-200 dark:border-white/10 rounded-r-2xl flex items-center text-slate-500 dark:text-slate-400 font-mono text-sm">
                        .eduverse.io
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Plan</label>
                      <select 
                        value={newOrg.plan}
                        onChange={(e) => setNewOrg({...newOrg, plan: e.target.value as any})}
                        className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold appearance-none focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Brand Color</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={newOrg.primaryColor}
                          onChange={(e) => setNewOrg({...newOrg, primaryColor: e.target.value})}
                          className="w-12 h-12 rounded-xl border border-slate-200 dark:border-white/10 cursor-pointer"
                        />
                        <input 
                          type="text" 
                          value={newOrg.primaryColor}
                          onChange={(e) => setNewOrg({...newOrg, primaryColor: e.target.value})}
                          className="flex-1 h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-mono text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Contact Email</label>
                    <input 
                      type="email" 
                      value={newOrg.contactEmail}
                      onChange={(e) => setNewOrg({...newOrg, contactEmail: e.target.value})}
                      placeholder="admin@organization.com"
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                    />
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
                      disabled={creating}
                      className="flex-1 bg-[#FFD700] text-[#0a192f] h-12 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {creating ? 'Creating...' : 'Create Organization'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Edit Organization Modal */}
        <AnimatePresence>
          {isEditModalOpen && editingOrg && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => { setIsEditModalOpen(false); setEditingOrg(null); }}
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
                    <div className="bg-blue-500/20 p-2 rounded-xl text-blue-500">
                      <span className="material-symbols-outlined">edit</span>
                    </div>
                    <h3 className="text-slate-900 dark:text-white text-xl font-black">Edit Organization</h3>
                  </div>
                  <button onClick={() => { setIsEditModalOpen(false); setEditingOrg(null); }} className="text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <form onSubmit={handleUpdateOrg} className="p-6 space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Organization Name</label>
                    <input 
                      required
                      type="text" 
                      value={editingOrg.name}
                      onChange={(e) => setEditingOrg({...editingOrg, name: e.target.value})}
                      className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold focus:ring-[#FFD700]/20 focus:border-[#FFD700] transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Subdomain</label>
                    <div className="flex items-center">
                      <input 
                        required
                        type="text" 
                        value={editingOrg.subdomain}
                        onChange={(e) => setEditingOrg({...editingOrg, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')})}
                        className="flex-1 h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-l-2xl px-4 text-slate-900 dark:text-white font-bold"
                      />
                      <div className="h-12 px-4 bg-slate-100 dark:bg-[#0a192f] border-y border-r border-slate-200 dark:border-white/10 rounded-r-2xl flex items-center text-slate-500 dark:text-slate-400 font-mono text-sm">
                        .eduverse.io
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Plan</label>
                      <select 
                        value={editingOrg.plan}
                        onChange={(e) => setEditingOrg({...editingOrg, plan: e.target.value as any})}
                        className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold appearance-none"
                      >
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-600 dark:text-slate-300 uppercase tracking-widest ml-1">Status</label>
                      <select 
                        value={editingOrg.isActive ? 'active' : 'inactive'}
                        onChange={(e) => setEditingOrg({...editingOrg, isActive: e.target.value === 'active'})}
                        className="w-full h-12 bg-white dark:bg-[#0a192f] border border-slate-200 dark:border-white/10 rounded-2xl px-4 text-slate-900 dark:text-white font-bold appearance-none"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 flex gap-4">
                    <button 
                      type="button"
                      onClick={() => { setIsEditModalOpen(false); setEditingOrg(null); }}
                      className="flex-1 h-12 rounded-2xl font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#0a192f]/50 border border-transparent transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 bg-blue-500 text-white h-12 rounded-2xl font-black shadow-xl hover:scale-[1.02] transition-all active:scale-95"
                    >
                      Save Changes
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
