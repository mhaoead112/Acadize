import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiEndpoint, assetUrl } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Loader2,
  BookOpen,
  Mail,
  TrendingUp,
  Award,
  Download,
  Loader,
  MessageSquare,
  Eye,
  MoreVertical
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";

interface Student {
  id: string;
  username: string;
  fullName?: string;
  email: string;
  profilePicture?: string;
  grade?: string;
  enrollmentCount: number;
  enrolledCourses: {
    enrollmentId: string;
    courseId: string;
    courseTitle: string;
    enrolledAt: string;
  }[];
  status?: 'Present' | 'Absent' | 'Late';
  letterGrade?: string;
}

export default function TeacherStudents() {
  const { toast } = useToast();
  const { getAuthHeaders, isAuthenticated, token } = useAuth();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterStatus, setFilterStatus] = useState<'All' | 'Active' | 'At Risk' | 'Honors'>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    if (token && isAuthenticated) {
      fetchStudents();
    }
  }, [token, isAuthenticated]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await fetch(apiEndpoint('/api/enrollments/students/all'), {
        headers: getAuthHeaders(),
      });

      if (response.ok) {
        const data = await response.json();
        setStudents(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch students:", error);
      toast({
        title: "Error",
        description: "Failed to load students",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = (
        student.username?.toLowerCase().includes(query) ||
        student.fullName?.toLowerCase().includes(query) ||
        student.email?.toLowerCase().includes(query)
      );

      let matchesStatus = true;
      if (filterStatus === 'Active') {
        matchesStatus = student.enrollmentCount > 0;
      } else if (filterStatus === 'At Risk') {
        matchesStatus = student.grade ? parseInt(student.grade) < 70 : false;
      } else if (filterStatus === 'Honors') {
        matchesStatus = student.grade ? parseInt(student.grade) >= 90 : false;
      }

      return matchesSearch && matchesStatus;
    }).sort((a, b) => (a.fullName || a.username).localeCompare(b.fullName || b.username));
  }, [students, searchQuery, filterStatus]);

  const paginatedStudents = useMemo(() => {
    const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredStudents.slice(startIdx, startIdx + ITEMS_PER_PAGE);
  }, [filteredStudents, currentPage]);

  const totalPages = Math.ceil(filteredStudents.length / ITEMS_PER_PAGE);

  // Derived stats
  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.enrollmentCount > 0).length;
  const avgGrade = students.length > 0
    ? Math.round(
        students.reduce((sum, s) => {
          const grade = s.grade ? parseInt(s.grade) : 0;
          return sum + grade;
        }, 0) / students.length
      )
    : 0;
  const atRiskCount = students.filter(s => s.grade ? parseInt(s.grade) < 70 : false).length;

  if (loading) {
    return (
      <TeacherLayout>
      <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-4 bg-slate-50 dark:bg-navy-dark">
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
      </TeacherLayout>
    );
  }

  return (
    <TeacherLayout>
    <div className="flex-1 overflow-y-auto px-6 md:px-10 pb-10 pt-4 bg-slate-50 dark:bg-navy-dark">
      {/* Sticky Header */}
      <header className="sticky top-0 z-10 py-6 bg-slate-50 dark:bg-navy-dark transition-colors duration-300">
        <div className="flex flex-wrap justify-between items-end gap-4">
          <div className="flex flex-col gap-1">
            <h1 className="text-navy dark:text-white text-3xl font-black leading-tight tracking-tight">Student Roster</h1>
            <p className="text-slate-500 dark:text-gray-400 text-base font-normal">Manage profiles, track progress, and communicate with your students.</p>
          </div>
          <button className="flex items-center gap-2 bg-gold hover:bg-yellow-500 text-navy px-5 py-2.5 rounded-lg font-bold shadow-md shadow-gold/20 transition-all hover:scale-105 active:scale-95">
            <span className="material-symbols-outlined text-[20px]">person_add</span>
            <span>Add New Student</span>
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Students</p>
            <span className="material-symbols-outlined text-gold opacity-50">groups</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-navy dark:text-white text-2xl font-bold">{totalStudents}</p>
            <span className="text-emerald-500 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span> 2%
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Average Grade</p>
            <span className="material-symbols-outlined text-gold opacity-50">grade</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-navy dark:text-white text-2xl font-bold">{avgGrade}%</p>
            <span className="text-emerald-500 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span> 1.5%
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Assignments Due</p>
            <span className="material-symbols-outlined text-gold opacity-50">assignment_late</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-navy dark:text-white text-2xl font-bold">3</p>
            <span className="text-red-500 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">trending_down</span> 10%
            </span>
          </div>
        </div>
        <div className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-1 ring-1 ring-red-500/20">
          <div className="flex justify-between items-start">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">At Risk</p>
            <span className="material-symbols-outlined text-red-500 opacity-50">warning</span>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-navy dark:text-white text-2xl font-bold">{atRiskCount}</p>
            <span className="text-emerald-500 text-xs font-bold flex items-center">
              <span className="material-symbols-outlined text-[12px] mr-0.5">trending_up</span> 4%
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4  dark:bg-surface-dark p-5 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full relative group">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-gold transition-colors">search</span>
            <input 
              className="w-full h-12 pl-12 pr-4 bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-gold/50 text-navy dark:text-white placeholder:text-slate-400 transition-shadow outline-none" 
              placeholder="Search by name, ID, or email..." 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="w-full md:w-64 relative group">
            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">expand_more</span>
            <select 
              className="w-full h-12 pl-4 pr-10 bg-slate-50 dark:bg-navy-dark border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-gold/50 text-navy dark:text-white appearance-none cursor-pointer outline-none"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="All">All Classes</option>
              <option value="Class A">Class A</option>
              <option value="Class B">Class B</option>
              <option value="Class C">Class C</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar items-center">
          <button 
            onClick={() => setFilterStatus('All')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === 'All' ? 'bg-gold text-navy font-bold' : 'bg-slate-100 dark:bg-navy-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            All Students
          </button>
          <button 
            onClick={() => setFilterStatus('Active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === 'Active' ? 'bg-gold text-navy font-bold' : 'bg-slate-100 dark:bg-navy-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            Active ({activeStudents})
          </button>
          <button 
            onClick={() => setFilterStatus('At Risk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === 'At Risk' ? 'bg-red-500 text-white font-bold' : 'bg-slate-100 dark:bg-navy-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span> At Risk ({atRiskCount})
          </button>
          <button 
            onClick={() => setFilterStatus('Honors')}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${filterStatus === 'Honors' ? 'bg-blue-600 text-white font-bold' : 'bg-slate-100 dark:bg-navy-dark text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800'}`}
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span> Honors (45)
          </button>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white dark:bg-surface-dark rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 text-navy dark:text-gold uppercase text-xs font-bold tracking-wider">
                <th className="p-5 pl-6">Student Name</th>
                <th className="p-5">Grade</th>
                <th className="p-5">Attendance</th>
                <th className="p-5">Courses</th>
                <th className="p-5 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {paginatedStudents.length > 0 ? paginatedStudents.map((student) => {
                const gradeNum = student.grade ? parseInt(student.grade) : 0;
                const letterGrade = gradeNum >= 90 ? 'A' : gradeNum >= 80 ? 'B' : gradeNum >= 70 ? 'C' : gradeNum >= 60 ? 'D' : 'F';
                return (
                  <tr 
                    key={student.id} 
                    onClick={() => setLocation(`/teacher/students/${student.id}`)}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all cursor-pointer"
                  >
                    <td className="p-5 pl-6">
                      <div className="flex items-center gap-3">
                        <div className="size-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold shrink-0">
                          {(student.fullName || student.username)?.substring(0, 1).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <p className="text-navy dark:text-white font-bold text-sm group-hover:text-gold transition-colors">{student.fullName || student.username}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs font-mono">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-5">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        gradeNum >= 90 ? 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-700' :
                        gradeNum >= 70 ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700' :
                        'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-700'
                      }`}>
                        {student.grade || 'N/A'}% ({letterGrade})
                      </span>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-1.5">
                        <div className={`size-2 rounded-full ${student.status === 'Present' ? 'bg-emerald-500' : student.status === 'Late' ? 'bg-gold' : 'bg-slate-400'}`}></div>
                        <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">{student.status || 'Present'}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      <Badge variant="secondary" className="text-xs">{student.enrollmentCount} {student.enrollmentCount === 1 ? 'Class' : 'Classes'}</Badge>
                    </td>
                    <td className="p-5 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); /* TODO: handle chat */ }}
                          className="p-2 rounded-lg text-slate-400 hover:text-gold hover:bg-gold/10 transition-colors" 
                          title="Message"
                        >
                          <span className="material-symbols-outlined text-[20px]">chat</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setLocation(`/teacher/students/${student.id}`); }}
                          className="p-2 rounded-lg text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" 
                          title="View Profile"
                        >
                          <span className="material-symbols-outlined text-[20px]">visibility</span>
                        </button>
                        <button 
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 rounded-lg text-slate-400 hover:text-navy dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                          title="More options"
                        >
                          <span className="material-symbols-outlined text-[20px]">more_vert</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={5} className="p-20 text-center text-slate-500 italic">No students found matching your criteria.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 dark:border-slate-800 gap-4 bg-slate-50/50 dark:bg-slate-900/10">
          <p className="text-sm text-slate-500 dark:text-slate-400">Showing <span className="font-bold text-navy dark:text-white">{paginatedStudents.length}</span> students</p>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => i + 1).map((page) => (
              <button 
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-colors ${
                  currentPage === page 
                    ? 'bg-gold text-navy shadow-sm' 
                    : 'border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {page}
              </button>
            ))}
            <button 
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
    </TeacherLayout>
  );
}