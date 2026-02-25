import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import ParentLayout from "@/components/ParentLayout";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, BookOpen, FileText, User, School, AlertCircle } from "lucide-react";

interface SearchResults {
  children: any[];
  courses: any[];
  assignments: any[];
}

export default function ParentSearchResultsPage() {
  const { t } = useTranslation('parent');
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    children: [],
    courses: [],
    assignments: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'children' | 'courses' | 'assignments'>('all');

  useEffect(() => {
    // Read search query from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const timer = setTimeout(() => {
      window.history.replaceState({}, '', `/parent/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async (query: string) => {
    if (!query.trim() || !token) return;

    setIsLoading(true);
    try {
      // For parent, we'll fetch the overview which contains most relevant data
      // In a real app with large data, this should be a dedicated search endpoint
      const response = await fetch(apiEndpoint('/api/parent/dashboard/overview'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      if (response.ok) {
        const data = await response.json();
        const lowerQuery = query.toLowerCase();
        
        const children = data.children || [];
        
        // Filter Children
        const filteredChildren = children.filter((child: any) => 
          child.name.toLowerCase().includes(lowerQuery) ||
          child.email?.toLowerCase().includes(lowerQuery)
        );

        // Extract and Filter Courses
        const allCourses = children.flatMap((child: any) => 
          (child.recentGrades || []).map((grade: any) => ({
            ...grade,
            childName: child.name,
            childId: child.id,
            title: grade.course || grade.courseName
          }))
        );
        
        const filteredCourses = allCourses.filter((course: any) => 
          course.title?.toLowerCase().includes(lowerQuery)
        );

        // Extract and Filter Assignments
        const allAssignments = children.flatMap((child: any) => 
          (child.upcomingAssignments || []).map((assignment: any) => ({
            ...assignment,
            childName: child.name,
            childId: child.id,
            title: assignment.title || assignment.description
          }))
        );

        const filteredAssignments = allAssignments.filter((assignment: any) => 
          assignment.title?.toLowerCase().includes(lowerQuery) ||
          assignment.course?.toLowerCase().includes(lowerQuery)
        );

        setResults({
          children: filteredChildren,
          courses: filteredCourses,
          assignments: filteredAssignments
        });
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.history.pushState({}, '', `/parent/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const totalResults = useMemo(() => {
    return results.children.length + results.courses.length + results.assignments.length;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return {
      children: activeFilter === 'children' ? results.children : [],
      courses: activeFilter === 'courses' ? results.courses : [],
      assignments: activeFilter === 'assignments' ? results.assignments : []
    };
  }, [results, activeFilter]);

  const getResultCount = (type: string) => {
    switch(type) {
      case 'children': return results.children.length;
      case 'courses': return results.courses.length;
      case 'assignments': return results.assignments.length;
      default: return totalResults;
    }
  };

  return (
    <ParentLayout>
      <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 dark:bg-background">
        <div className="max-w-[1400px] mx-auto">
          {/* Search Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{t('searchResults')}</h1>
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
                placeholder="Search children, courses, assignments..."
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
              { id: 'children' as const, label: 'Children', icon: User },
              { id: 'courses' as const, label: 'Courses', icon: BookOpen },
              { id: 'assignments' as const, label: 'Assignments', icon: FileText },
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
              {/* Children */}
              {filteredResults.children.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <User className="h-5 w-5 text-primary" />
                    Children ({filteredResults.children.length})
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredResults.children.map((child: any) => (
                      <Link key={child.id} href={`/parent/children`}>
                        <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/10 flex items-center justify-center flex-shrink-0">
                              <User className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-1">
                                {child.name}
                              </h3>
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-1">
                                <School className="h-3 w-3" />
                                Student
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
                  <div className="space-y-3">
                    {filteredResults.courses.map((course: any, idx: number) => (
                      <Card key={`${course.childId}-${idx}`} className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center flex-shrink-0">
                            <BookOpen className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {course.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Student: {course.childName} • Grade: {course.grade || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </motion.section>
              )}

              {/* Assignments */}
              {filteredResults.assignments.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Assignments ({filteredResults.assignments.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredResults.assignments.map((assignment: any, idx: number) => (
                      <Card key={`${assignment.id}-${idx}`} className="p-4 border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="h-5 w-5 text-red-600 dark:text-red-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-slate-900 dark:text-white">
                              {assignment.title}
                            </h3>
                            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                              Student: {assignment.childName} • Course: {assignment.course}
                            </p>
                            {assignment.dueDate && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                                <AlertCircle className="h-3 w-3" />
                                Due: {new Date(assignment.dueDate).toLocaleDateString()}
                              </p>
                            )}
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
    </ParentLayout>
  );
}
