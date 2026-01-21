import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import TeacherLayout from "@/components/TeacherLayout";
import { Card } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { Search, BookOpen, FileText, Calendar, MessageSquare, Award, Users } from "lucide-react";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  imageUrl?: string | null;
}

interface Assignment {
  id: string;
  title: string;
  description?: string | null;
  dueDate?: string;
  courseId: string;
  courseTitle?: string;
}

interface SearchResults {
  courses: Course[];
  assignments: Assignment[];
  students: any[]; // Placeholder
}

export default function TeacherSearchResultsPage() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({
    courses: [],
    assignments: [],
    students: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'courses' | 'assignments' | 'students'>('all');

  useEffect(() => {
    // Read search query from URL
    const params = new URLSearchParams(window.location.search);
    const query = params.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, []);

  // Debounced search when user types (search bar is also in layout)
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const timer = setTimeout(() => {
      window.history.replaceState({}, '', `/teacher/search?q=${encodeURIComponent(searchQuery.trim())}`);
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
      const [coursesRes, assignmentsRes] = await Promise.all([
        fetch(apiEndpoint("/api/courses/user"), { headers }).catch(() => null),
        fetch(apiEndpoint("/api/assignments/teacher"), { headers }).catch(() => null)
      ]);

      const coursesData = coursesRes?.ok ? await coursesRes.json() : [];
      const assignmentsData = assignmentsRes?.ok ? await assignmentsRes.json() : [];

      // Filter results based on search query
      const lowerQuery = query.toLowerCase();

      const filteredCourses = (Array.isArray(coursesData) ? coursesData : [])
        .filter((course: Course) => 
          course.title.toLowerCase().includes(lowerQuery) ||
          course.description?.toLowerCase().includes(lowerQuery)
        );

      const filteredAssignments = (Array.isArray(assignmentsData) ? assignmentsData : [])
        .filter((assignment: Assignment) => 
          assignment.title.toLowerCase().includes(lowerQuery) ||
          assignment.description?.toLowerCase().includes(lowerQuery)
        );

      setResults({
        courses: filteredCourses,
        assignments: filteredAssignments,
        students: [] // Users API might be heavy, skipping for now unless needed
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
      window.history.pushState({}, '', `/teacher/search?q=${encodeURIComponent(searchQuery.trim())}`);
      performSearch(searchQuery.trim());
    }
  };

  const totalResults = useMemo(() => {
    return results.courses.length + results.assignments.length + results.students.length;
  }, [results]);

  const filteredResults = useMemo(() => {
    if (activeFilter === 'all') return results;
    return {
      courses: activeFilter === 'courses' ? results.courses : [],
      assignments: activeFilter === 'assignments' ? results.assignments : [],
      students: activeFilter === 'students' ? results.students : []
    };
  }, [results, activeFilter]);

  const getResultCount = (type: string) => {
    switch(type) {
      case 'courses': return results.courses.length;
      case 'assignments': return results.assignments.length;
      case 'students': return results.students.length;
      default: return totalResults;
    }
  };

  return (
    <TeacherLayout>
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

          {/* Search Bar (internal) */}
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
                placeholder="Search courses, assignments..."
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
              {/* Courses */}
              {filteredResults.courses.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
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

              {/* Assignments */}
              {filteredResults.assignments.length > 0 && (
                <motion.section
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Assignments ({filteredResults.assignments.length})
                  </h2>
                  <div className="space-y-3">
                    {filteredResults.assignments.map((assignment) => (
                      <Link key={assignment.id} href={`/teacher/assignments/${assignment.id}`}>
                        <Card className="p-4 hover:shadow-lg transition-all cursor-pointer group border border-slate-200 dark:border-white/10 bg-white dark:bg-card">
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/10 flex items-center justify-center flex-shrink-0">
                              <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-primary transition-colors">
                                {assignment.title}
                              </h3>
                              {assignment.courseTitle && (
                                <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">
                                  {assignment.courseTitle}
                                </p>
                              )}
                              {assignment.description && (
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                  {assignment.description}
                                </p>
                              )}
                              {assignment.dueDate && (
                                <p className="text-xs text-orange-600 dark:text-orange-400 mt-2 flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  Due: {new Date(assignment.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </Card>
                      </Link>
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
    </TeacherLayout>
  );
}
