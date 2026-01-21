import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import AdminLayout from "@/components/AdminLayout";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, BookOpen, MessageSquare, Users, Shield, User } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description?: string | null;
}

interface User {
  id: string;
  username: string;
  fullName?: string;
  role: string;
  email?: string;
}

interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

interface SearchResults {
  courses: Course[];
  users: User[];
  announcements: Announcement[];
}

export default function AdminSearchResultsPage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    courses: [],
    users: [],
    announcements: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'courses' | 'users' | 'announcements'>('all');

  useEffect(() => {
    // Read search query from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  // Debounced search when user types (internal logic)
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const timer = setTimeout(() => {
      window.history.replaceState({}, '', `/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim() || !token) return;

    setIsLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Fetch from endpoints in parallel
      const [coursesRes, usersRes, announcementsRes] = await Promise.all([
        fetch(apiEndpoint("/api/courses"), { headers }).catch(() => null),
        fetch(apiEndpoint("/api/users"), { headers }).catch(() => null),
        fetch(apiEndpoint("/api/announcements"), { headers }).catch(() => null)
      ]);

      const coursesData = coursesRes?.ok ? await coursesRes.json() : [];
      const usersData = usersRes?.ok ? await usersRes.json() : [];
      const announcementsData = announcementsRes?.ok ? await announcementsRes.json() : [];

      // Filter results based on search query (client-side simple filtering)
      const lowerQuery = query.toLowerCase();

      const filteredCourses = (Array.isArray(coursesData) ? coursesData : [])
        .filter((course: Course) => 
          course.title.toLowerCase().includes(lowerQuery) ||
          (course.description && course.description.toLowerCase().includes(lowerQuery))
        );

      const filteredUsers = (Array.isArray(usersData) ? usersData : [])
        .filter((user: User) => 
          user.username.toLowerCase().includes(lowerQuery) ||
          (user.fullName && user.fullName.toLowerCase().includes(lowerQuery)) ||
          (user.email && user.email.toLowerCase().includes(lowerQuery))
        );

      const filteredAnnouncements = (Array.isArray(announcementsData) ? announcementsData : [])
        .filter((announcement: Announcement) => 
          announcement.title.toLowerCase().includes(lowerQuery) ||
          announcement.content.toLowerCase().includes(lowerQuery)
        );

      setResults({
        courses: filteredCourses,
        users: filteredUsers,
        announcements: filteredAnnouncements
      });
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/admin/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const totalResults = useMemo(() => {
    return results.courses.length + results.users.length + results.announcements.length;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return {
      courses: activeFilter === 'courses' ? results.courses : [],
      users: activeFilter === 'users' ? results.users : [],
      announcements: activeFilter === 'announcements' ? results.announcements : []
    };
  }, [results, activeFilter]);

  const getResultCount = (type: string) => {
    switch(type) {
      case 'courses': return results.courses.length;
      case 'users': return results.users.length;
      case 'announcements': return results.announcements.length;
      default: return totalResults;
    }
  };

  return (
    <AdminLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-background">
        <div className="max-w-[1400px] mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Search Results</h1>
            <p className="text-slate-600 dark:text-slate-400">
              {totalResults > 0 ? `Found ${totalResults} result${totalResults !== 1 ? 's' : ''}` : 'No results found'}
              {searchQuery && ` for "${searchQuery}"`}
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.form
            onSubmit={handleSearch}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6"
          >
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search users, courses, announcements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-white dark:bg-card border border-slate-300 dark:border-white/10 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all shadow-sm"
              />
            </div>
          </motion.form>

          {/* Filter Tabs */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-2 mb-8"
          >
            {[
              { id: 'all' as const, label: 'All', icon: Search },
              { id: 'users' as const, label: 'Users', icon: Users },
              { id: 'courses' as const, label: 'Courses', icon: BookOpen },
              { id: 'announcements' as const, label: 'Announcements', icon: MessageSquare },
            ].map((filter) => {
              const Icon = filter.icon;
              const count = getResultCount(filter.id);
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all ${
                    activeFilter === filter.id
                      ? 'bg-primary text-black shadow-lg shadow-primary/30'
                      : 'bg-white dark:bg-card text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 border border-slate-200 dark:border-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {filter.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    activeFilter === filter.id
                      ? 'bg-black/20 text-black'
                      : 'bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-slate-400'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </motion.div>

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          )}

          {/* Results */}
          {!isLoading && (
            <div className="space-y-8">
              {/* Users */}
              {filteredResults.users.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Users ({filteredResults.users.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResults.users.map((user) => (
                      <Link key={user.id} href={`/admin/users?q=${user.username}`}>
                        <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                {user.fullName || user.username}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 capitalize flex items-center gap-1">
                                <Shield className="h-3 w-3" />
                                {user.role}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Courses */}
              {filteredResults.courses.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Courses ({filteredResults.courses.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResults.courses.map((course) => (
                      <Link key={course.id} href={`/teacher/courses/${course.id}`}>
                        <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                          <div className="flex items-start gap-4">
                            <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-8 w-8 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                {course.title}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {course.description || 'No description available'}
                              </p>
                            </div>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Announcements */}
              {filteredResults.announcements.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    Announcements ({filteredResults.announcements.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredResults.announcements.map((announcement) => (
                      <Card key={announcement.id} className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                        <div className="flex items-start gap-4">
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {announcement.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 line-clamp-3">
                              {announcement.content}
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                              {new Date(announcement.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* No Results */}
              {!isLoading && totalResults === 0 && searchQuery && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-20"
                >
                  <div className="w-20 h-20 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
                    <Search className="h-10 w-10 text-slate-400 dark:text-slate-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                    No results found
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                    We couldn't find anything matching "{searchQuery}". Try adjusting your search terms.
                  </p>
                </motion.div>
              )}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
