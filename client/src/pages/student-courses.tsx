import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import StudentLayout from "@/components/StudentLayout";
import NotificationBell from "@/components/NotificationBell";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, BookOpen, ArrowRight, Search, X, GraduationCap } from "lucide-react";
import { Link } from "wouter";

interface Course {
  id: string;
  title: string;
  description?: string | null;
  teacherId: string;
  isPublished: boolean;
  imageUrl?: string | null;
}

interface Enrollment {
  id: string;
  courseId: string;
  enrolledAt: string;
  course: Course;
}

export default function StudentCoursesPage() {
  const { user, token } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active Courses");
  const [sortBy, setSortBy] = useState("Sort by: Name");

  useEffect(() => {
    // Read search query from URL on component mount
    const params = new URLSearchParams(window.location.search);
    const searchFromUrl = params.get('search');
    if (searchFromUrl) {
      setSearchQuery(searchFromUrl);
    }
  }, []);

  useEffect(() => {
    const fetchEnrolledCourses = async () => {
      if (!token) return;
      
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch(apiEndpoint("/api/enrollments/student"), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        if (!res.ok) throw new Error("Failed to load enrolled courses");
        const data = await res.json();
        setEnrollments(Array.isArray(data) ? data : []);
      } catch (err: any) {
        setError(err?.message || "Unknown error");
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnrolledCourses();
  }, [token]);

  // Filter and sort enrollments
  const filteredEnrollments = useMemo(() => {
    let filtered = enrollments;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(enrollment => 
        enrollment.course.title.toLowerCase().includes(query) ||
        enrollment.course.description?.toLowerCase().includes(query)
      );
    }

    // Apply status filter (for now all courses are active)
    // In the future, you could filter by enrollment status
    // if (filterStatus === "Completed") { ... }
    // if (filterStatus === "Archived") { ... }

    // Apply sorting
    const sorted = [...filtered];
    if (sortBy === "Sort by: Name") {
      sorted.sort((a, b) => a.course.title.localeCompare(b.course.title));
    } else if (sortBy === "Sort by: Grade") {
      // When grade data is available, sort by grade
      // For now, no sorting change
    } else if (sortBy === "Sort by: Progress") {
      // When progress data is available, sort by progress
      // For now, no sorting change
    }

    return sorted;
  }, [enrollments, searchQuery, filterStatus, sortBy]);

  // Get course icon based on title - memoized
  const getCourseStyle = useCallback((title: string) => {
    const lowerTitle = title.toLowerCase();
    if (lowerTitle.includes('math') || lowerTitle.includes('algebra') || lowerTitle.includes('geometry')) {
      return { bg: 'bg-gradient-to-br from-amber-200 to-amber-300', icon: '📐' };
    }
    if (lowerTitle.includes('science') || lowerTitle.includes('physics') || lowerTitle.includes('chemistry') || lowerTitle.includes('biology')) {
      return { bg: 'bg-gradient-to-br from-green-200 to-green-300', icon: '🔬' };
    }
    if (lowerTitle.includes('english') || lowerTitle.includes('writing') || lowerTitle.includes('literature')) {
      return { bg: 'bg-gradient-to-br from-blue-200 to-blue-300', icon: '📚' };
    }
    if (lowerTitle.includes('history') || lowerTitle.includes('social')) {
      return { bg: 'bg-gradient-to-br from-orange-200 to-orange-300', icon: '🏛️' };
    }
    if (lowerTitle.includes('art') || lowerTitle.includes('music') || lowerTitle.includes('drama')) {
      return { bg: 'bg-gradient-to-br from-purple-200 to-purple-300', icon: '🎨' };
    }
    if (lowerTitle.includes('computer') || lowerTitle.includes('programming') || lowerTitle.includes('coding')) {
      return { bg: 'bg-gradient-to-br from-cyan-200 to-cyan-300', icon: '💻' };
    }
    return { bg: 'bg-gradient-to-br from-indigo-200 to-indigo-300', icon: '📖' };
  }, []);

  return (
    <StudentLayout>
      {/* Header */}
      {/* <header className="flex items-center justify-between px-8 py-5 border-b border-border bg-card backdrop-blur-sm z-20">
        <div className="flex-1 max-w-lg">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-400 group-focus-within:text-primary">search</span>
            </div>
            <input 
              className="block w-full pl-12 pr-4 py-3 bg-white/5 dark:bg-white/5 border-none rounded-full text-sm text-white dark:text-white placeholder-slate-400 dark:placeholder-slate-400 focus:ring-2 focus:ring-primary focus:bg-card transition-all" 
              placeholder="Search for classes..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex items-center gap-6 ml-6">
          <NotificationBell />
          <div className="flex items-center gap-3 pl-6 border-l border-white/10 dark:border-white/10">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-white dark:text-white">{user?.fullName || user?.username || "Student"}</p>
              <p className="text-xs text-slate-400 dark:text-slate-400">Student</p>
            </div>
            <div className="size-10 rounded-full bg-cover bg-center border-2 border-border shadow-sm" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCf1iqHflnpDeclYDPkMp8yz3x-MZ61u6MFlNkLSpfXC_08wun7HETwwy7WOYJIejYgXOZthfTKeO6GVEVP9VleXVth3b1FzDsfwpU8GGsnRxfjDrLEVhvY6p-686b0b-kQP6WmIeLxWbd5BX9lYClHGyU9MQS0fNwan1c05gSuzfGBFiGn_2RBNa6CAL9RfdzODFj8x9Yd7hXndcNXIyRrVSse3alXVVfYcxlNG0GLOwddkdgUc00XhSIFaCI6PelYKSJuNfjRPG8")' }}></div>
          </div>
        </div>
      </header> */}

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar bg-slate-50 dark:bg-background">
        <div className="max-w-[1200px] mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold text-slate-900 dark:text-white">My Classes</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Manage your active courses and track your progress</p>
            </div>
          </div>

          {/* Search and Filters Row */}
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-card border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 dark:text-slate-400 text-[18px]">filter_list</span>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="pl-10 pr-8 py-2.5 bg-white dark:bg-card border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                >
                  <option value="Active Courses">Active Courses</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-400 dark:text-slate-400 text-[18px]">sort</span>
                <select 
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="pl-10 pr-8 py-2.5 bg-white dark:bg-card border border-slate-300 dark:border-white/10 rounded-lg text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-primary focus:border-primary outline-none appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-white/5 transition-colors shadow-sm"
                >
                  <option>Sort by: Name</option>
                  <option>Sort by: Grade</option>
                  <option>Sort by: Progress</option>
                </select>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 rounded-xl p-8 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrollments.map((enrollment) => {
                const courseStyle = getCourseStyle(enrollment.course.title);
                // Mock progress and grade (replace with real data when available)
                const progress = 0;
                const grade = '-';
                const gradePercent = 0;
                
                return (
                  <div key={enrollment.id} className="bg-white dark:bg-slate-800 rounded-xl overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-200 dark:border-white/10 flex flex-col h-full group">
                    <div className="h-44 bg-cover bg-center relative" style={{ 
                      backgroundImage: enrollment.course.imageUrl 
                        ? `url("${enrollment.course.imageUrl}")` 
                        : 'linear-gradient(135deg, #94a3b8 0%, #cbd5e1 100%)'
                    }}>
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent"></div>
                      {!enrollment.course.imageUrl && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 bg-white/40 dark:bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                            <span className="text-5xl">{courseStyle.icon}</span>
                          </div>
                        </div>
                      )}
                      <div className="absolute top-0 left-0 right-0 h-44 pointer-events-none">
                        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-md border border-white/10 text-white text-xs font-bold px-3 py-1.5 rounded-full shadow-lg pointer-events-auto">{enrollment.course.title.split(' ')[0]}</div>
                        <div className="absolute bottom-4 left-4 pointer-events-auto">
                          <div className="size-10 rounded-full border-2 border-white bg-gray-700 overflow-hidden" title="Instructor">
                            <div className="w-full h-full bg-slate-400 dark:bg-slate-600"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="p-6 flex flex-col flex-1 pt-2">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors">{enrollment.course.title}</h3>
                        <button className="text-slate-400 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"><span className="material-symbols-outlined">more_vert</span></button>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        {enrollment.course.description || 'No description available'}
                      </p>
                      <div className="mt-auto space-y-5">
                        <div>
                          <div className="flex justify-between text-xs mb-2">
                            <span className="text-slate-600 dark:text-slate-400 font-medium">Progress</span>
                            <span className="text-slate-900 dark:text-white font-bold">{progress}%</span>
                          </div>
                          <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full shadow-sm" style={{ width: `${progress}%` }}></div>
                          </div>
                        </div>
                        <div className="pt-5 border-t border-slate-200 dark:border-white/10 flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Grade</span>
                            <span className="text-lg font-bold text-slate-900 dark:text-white">{grade} <span className="text-sm font-normal text-slate-600 dark:text-slate-400">/ {gradePercent > 0 ? `${gradePercent}%` : '--'}</span></span>
                          </div>
                          <Link href={`/student/courses/${enrollment.courseId}`}>
                            <button className="px-4 py-2 rounded-full bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-white text-sm font-bold hover:bg-primary hover:text-black dark:hover:text-black transition-colors shadow-sm">
                              View Class
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              <button className="bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-white/10 rounded-xl flex flex-col items-center justify-center p-8 text-center hover:bg-slate-50 dark:hover:bg-white/5 hover:border-primary transition-all group h-full min-h-[360px]">
                <div className="size-16 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-slate-400 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-black transition-colors">
                  <span className="material-symbols-outlined text-3xl">add</span>
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Enroll in a new Class</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm max-w-[200px]">Browse the catalog to find your next course.</p>
              </button>
            </div>
          )}
        </div>
      </div>
    </StudentLayout>
  );
}
