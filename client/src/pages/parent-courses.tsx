import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import ParentLayout from "@/components/ParentLayout";
import { apiEndpoint } from "@/lib/config";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

interface Child {
  id: string;
  fullName: string;
}

interface Course {
  id: string;
  title: string;
  description: string;
  teacher: {
    id: string;
    name: string;
    email: string;
    profilePicture?: string;
  };
  enrolledAt: Date;
  progress: {
    percentage: number;
    completedAssignments: number;
    totalAssignments: number;
    totalLessons: number;
  };
  currentGrade: string; // Letter grade from API (A, B+, etc)
  currentScore?: number; // Derived percentage for display
  isPublished: boolean;
  studentId?: string; // Added client-side
  studentName?: string; // Added client-side
  period?: string;
  room?: string;
  color?: string;
  icon?: string;
}

export default function ParentCourses() {
  const { token } = useAuth();
  const [, setLocation] = useLocation();
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChildId, setSelectedChildId] = useState<string | 'all'>('all');
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  const filteredCourses = selectedChildId === 'all'
    ? courses
    : courses.filter(c => c.studentId === selectedChildId);

  useEffect(() => {
    fetchChildren();
  }, [token]);

  useEffect(() => {
    if (children.length > 0) {
      fetchCourses();
    }
  }, [selectedChildId, children, token]);

  const fetchChildren = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(apiEndpoint('/api/parent/children'), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setChildren(data.children || []);
        // Don't auto-select on initial load, let the default 'all' state handle it
        if (data.children?.length > 0) {
          setSelectedChildId('all');
        }
      } else if (response.status === 401) {
        setLocation('/login');
      }
    } catch (error) {
      console.error('Error fetching children:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    if (!token || !children.length) return;

    try {
      setLoading(true);
      
      if (selectedChildId === 'all') {
        // Fetch courses from all children and merge
        const allCoursesPromises = children.map(async (child) => {
          const response = await fetch(apiEndpoint(`/api/parent/children/${child.id}/courses`), {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include'
          });
          
          if (!response.ok) {
            console.error(`Failed to fetch courses for child ${child.id}`);
            return [];
          }
          
          const data = await response.json();
          const coursesWithStudentInfo = (data.courses || []).map((course: any) => ({
            ...course,
            studentId: child.id,
            studentName: child.name,
            currentScore: convertGradeToScore(course.currentGrade),
          }));
          
          return coursesWithStudentInfo;
        });
        
        const allCoursesArrays = await Promise.all(allCoursesPromises);
        const mergedCourses = allCoursesArrays.flat();
        setCourses(mergedCourses);
      } else {
        // Fetch courses for specific child
        const response = await fetch(apiEndpoint(`/api/parent/children/${selectedChildId}/courses`), {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        });

        if (response.ok) {
          const data = await response.json();
          const child = children.find(c => c.id === selectedChildId);
          const coursesWithStudentInfo = (data.courses || []).map((course: any) => ({
            ...course,
            studentId: selectedChildId,
            studentName: child?.name,
            currentScore: convertGradeToScore(course.currentGrade),
          }));
          setCourses(coursesWithStudentInfo);
        } else if (response.status === 401) {
          setLocation('/login');
        }
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  // Convert letter grade to percentage score for display
  const convertGradeToScore = (grade: string | undefined): number => {
    if (!grade) return 0;
    const gradeMap: Record<string, number> = {
      'A+': 98, 'A': 95, 'A-': 92,
      'B+': 88, 'B': 85, 'B-': 82,
      'C+': 78, 'C': 75, 'C-': 72,
      'D+': 68, 'D': 65, 'D-': 62,
      'F': 50
    };
    return gradeMap[grade] || 0;
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 80) return 'bg-blue-100 text-blue-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    if (score >= 60) return 'bg-orange-100 text-orange-700';
    return 'bg-red-100 text-red-700';
  };

  const courseIcons = ['school', 'science', 'calculate', 'language', 'history', 'palette'];
  const courseColors = ['text-amber-400', 'text-blue-400', 'text-green-400', 'text-purple-400', 'text-pink-400', 'text-indigo-400'];

  const enrichedCourses = filteredCourses.map((course, idx) => ({
    ...course,
    icon: course.icon || courseIcons[idx % courseIcons.length],
    color: course.color || courseColors[idx % courseColors.length],
    period: course.period || `Period ${idx + 1}`,
    room: course.room || `Room ${100 + idx}`
  }));

  return (
    <ParentLayout>
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-white text-4xl font-black tracking-tight font-display">My Children's Classes</h1>
            <p className="text-slate-400 text-base">Fall Semester 2023 • Overview of academic progress across all enrolled courses.</p>
          </div>
          <button className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-sm font-black transition-all border border-white/5 shadow-2xl backdrop-blur-md">
            <span className="material-symbols-outlined text-primary">download</span>
            <span>Full Transcript</span>
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-white/[0.02] backdrop-blur-md p-1.5 rounded-2xl border border-white/5 w-fit shadow-xl overflow-x-auto">
          <button
            onClick={() => {
              setSelectedChildId('all');
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 relative whitespace-nowrap ${
              selectedChildId === 'all' ? 'text-black' : 'text-slate-400 hover:text-white'
            }`}
          >
            {selectedChildId === 'all' && (
              <div className="absolute inset-0 bg-primary rounded-xl z-0" />
            )}
            <span className="material-symbols-outlined text-lg relative z-10">groups</span>
            <span className="relative z-10">All</span>
          </button>
          {children.map((child) => (
            <button
              key={child.id}
              onClick={() => {
                setSelectedChildId(child.id);
              }}
              className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 relative whitespace-nowrap ${
                selectedChildId === child.id ? 'text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {selectedChildId === child.id && (
                <div className="absolute inset-0 bg-primary rounded-xl z-0" />
              )}
              <div className="size-6 rounded-full bg-cover bg-center border border-white/20 relative z-10" style={{ backgroundImage: `url(https://picsum.photos/seed/${encodeURIComponent(child.fullName)}/100)` }} />
              <span className="relative z-10">{child.fullName.split(' ')[0]}</span>
            </button>
          ))}
        </div>

        {/* Loading State with Skeleton */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-navy-card/40 backdrop-blur-xl rounded-[2rem] border border-white/5 p-8 h-96 animate-pulse">
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center flex-1">
                      <div className="size-14 rounded-2xl bg-slate-800/50" />
                      <div className="flex-1">
                        <div className="h-5 bg-slate-700 rounded w-32 mb-2" />
                        <div className="h-3 bg-slate-700 rounded w-24" />
                      </div>
                    </div>
                  </div>
                  <div className="h-3 bg-slate-700 rounded w-20" />
                  <div className="py-5 border-y border-dashed border-white/10 h-12 bg-slate-700/30 rounded" />
                  <div className="h-20 bg-slate-700/30 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-7xl text-slate-600 mb-4 block">school</span>
            <h3 className="text-lg font-semibold text-white mb-2">No Courses Enrolled</h3>
            <p className="text-slate-400">This child is not enrolled in any courses yet.</p>
          </div>
        )}

        {/* Courses Grid */}
        {!loading && filteredCourses.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {enrichedCourses.map((course) => (
              <div
                key={course.id}
                className="bg-navy-card/40 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/5 hover:border-primary/40 transition-all duration-500 shadow-2xl group relative hover:-translate-y-2"
              >
                <div className="p-8 flex flex-col gap-6 h-full relative">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-4 items-center">
                      <div className={`size-14 rounded-2xl bg-slate-800/80 flex items-center justify-center ${course.color} border border-white/5 shadow-inner transition-transform group-hover:scale-110`}>
                        <span className="material-symbols-outlined text-3xl">{course.icon}</span>
                      </div>
                      <div>
                        <h3 className="text-white font-black text-xl leading-tight font-display group-hover:text-primary transition-colors">{course.title}</h3>
                        <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">{course.period} • Room {course.room}</p>
                      </div>
                    </div>
                    <button className="text-slate-600 hover:text-white transition-colors p-2 rounded-xl hover:bg-white/5">
                      <span className="material-symbols-outlined">more_horiz</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {selectedChildId === 'all' && course.studentName && (
                      <span className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border bg-slate-500/10 text-slate-400 border-slate-500/20">
                        {course.studentName}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-4 py-5 border-y border-dashed border-white/10">
                    <div className="size-10 rounded-full bg-slate-700/50 border border-white/10 bg-cover bg-center overflow-hidden" style={{ backgroundImage: `url(${course.teacher.profilePicture || 'https://picsum.photos/seed/instr/100'})` }} />
                    <div className="flex flex-col">
                      <span className="text-sm text-slate-200 font-bold leading-tight">{course.teacher.name}</span>
                      <button className="text-[10px] text-primary hover:text-white font-black uppercase tracking-widest mt-0.5 transition-colors">
                        Message Teacher
                      </button>
                    </div>
                  </div>

                  <div className="bg-white/[0.03] rounded-3xl p-5 flex justify-between items-center border border-white/5 shadow-inner">
                    <div>
                      <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Grade Average</p>
                      <p className="text-3xl font-black text-primary tabular-nums">
                        {course.currentGrade || 'N/A'} <span className="text-sm font-bold text-slate-500 ml-1">({Math.round(course.currentScore || 0)}%)</span>
                      </p>
                    </div>
                    <button className="size-12 rounded-2xl bg-primary text-black flex items-center justify-center hover:bg-yellow-400 transition-all hover:scale-110 active:scale-95 shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined font-black">arrow_outward</span>
                    </button>
                  </div>
                </div>
                
                {/* Animated Progress Bar at bottom */}
                <div className="h-2 w-full bg-white/[0.05] relative overflow-hidden">
                  <div 
                    className={`h-full relative overflow-hidden transition-all duration-1500 ease-out ${
                      course.progress.percentage > 90 ? 'bg-primary' : 'bg-blue-500'
                    }`}
                    style={{ width: `${course.progress.percentage}%` }}
                  >
                    <div 
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                      style={{
                        animation: 'shimmer 2s infinite',
                        backgroundPosition: '0% 0%'
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </ParentLayout>
  );
}
