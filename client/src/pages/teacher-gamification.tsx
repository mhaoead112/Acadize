import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiEndpoint } from "@/lib/config";
import TeacherLayout from "@/components/TeacherLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Medal, Trophy, Star, Users, Target, AlertCircle, BookOpen, CheckCircle2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import LeaderboardTable from "@/components/gamification/LeaderboardTable";
import { useTeacherGamificationOverview } from "@/hooks/useTeacherGamification";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// Reuse course type for the dropdown
interface Course {
  id: string;
  title: string;
}

export default function TeacherGamificationPage() {
  const { token, isAuthenticated, getAuthHeaders } = useAuth();

  // 1. Fetch courses
  const { data: courses, isLoading: loadingCourses } = useQuery<Course[]>({
    queryKey: ['teacher-courses-list'],
    queryFn: async () => {
      const res = await fetch(apiEndpoint("/api/courses/user"), {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to load courses");
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: isAuthenticated && !!token,
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Default to first course once loaded if not set
  if (courses && courses.length > 0 && !selectedCourseId) {
    setSelectedCourseId(courses[0].id);
  }

  // 2. Fetch overview data scoped to selected course
  const { data: overview, isLoading: loadingOverview, error: overviewError } = useTeacherGamificationOverview(
    selectedCourseId || null
  );

  // Gamification disabled check (informational)
  const isGamificationDisabled = overviewError?.message?.toLowerCase().includes("disabled") ||
    (overview && overview.leaderboard.length === 0 && overview.topAchievers.length === 0 && overview.badgeDistribution.length === 0);

  return (
    <TeacherLayout>
      <div className="max-w-6xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Trophy className="h-8 w-8 text-primary" />
              Gamification Overview
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-1">
              Monitor student engagement, achievements, and course leaderboard
            </p>
          </div>

          <div className="w-full sm:w-64">
            <Select
              value={selectedCourseId}
              onValueChange={setSelectedCourseId}
              disabled={loadingCourses || !courses || courses.length === 0}
            >
              <SelectTrigger className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white w-full">
                <SelectValue placeholder={loadingCourses ? "Loading courses..." : "Select a course"} />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-200">
                {courses?.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
                {courses?.length === 0 && (
                  <SelectItem value="empty" disabled>
                    No courses found
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Gamification Disabled Notice */}
        {isGamificationDisabled && !loadingOverview && (
          <Alert variant="default" className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-300">
            <Info className="h-4 w-4 text-blue-400" />
            <AlertTitle className="text-blue-400 font-semibold">Gamification is not enabled</AlertTitle>
            <AlertDescription>
              Gamification features are currently disabled for your organization. Contact your administrator to enable points, levels, and leaderboards.
            </AlertDescription>
          </Alert>
        )}

        {!selectedCourseId && !loadingCourses && courses?.length === 0 ? (
          <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <BookOpen className="h-12 w-12 text-slate-400 dark:text-slate-600 mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-300 mb-2">No Courses Found</h3>
              <p className="text-slate-600 dark:text-slate-500 max-w-md">
                You need to create a course and enroll students before you can view gamification analytics.
              </p>
            </CardContent>
          </Card>
        ) : loadingOverview || !overview ? (
          <OverviewSkeleton />
        ) : !isGamificationDisabled ? (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard 
                title="Top Earner" 
                value={overview.topAchievers[0] ? overview.topAchievers[0].fullName : "—"}
                subtitle={overview.topAchievers[0] ? `${overview.topAchievers[0].totalPoints} XP` : "No points yet"}
                icon={<Star className="h-4 w-4 text-amber-500" />}
              />
              <KpiCard 
                title="Most Badges" 
                value={
                  [...overview.topAchievers].sort((a, b) => b.badgeCount - a.badgeCount)[0]?.fullName || "—"
                }
                subtitle={
                  [...overview.topAchievers].sort((a, b) => b.badgeCount - a.badgeCount)[0]?.badgeCount 
                  ? `${[...overview.topAchievers].sort((a, b) => b.badgeCount - a.badgeCount)[0].badgeCount} Badges` 
                  : "No badges earned"
                }
                icon={<Medal className="h-4 w-4 text-blue-400" />}
              />
              <KpiCard 
                title="Total Points Earned" 
                value={
                  overview.leaderboard.reduce((sum, entry) => sum + entry.totalPoints, 0).toLocaleString()
                }
                subtitle="By all students"
                icon={<Trophy className="h-4 w-4 text-emerald-400" />}
              />
              <KpiCard 
                title="Participation Rate" 
                value={
                  overview.leaderboard.length > 0 
                    ? `${Math.round((overview.leaderboard.filter(e => e.totalPoints > 0).length / overview.leaderboard.length) * 100)}%`
                    : "0%"
                }
                subtitle="Students with > 0 XP"
                icon={<Users className="h-4 w-4 text-indigo-400" />}
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Leaderboard Table (2/3 width) */}
              <div className="lg:col-span-2 space-y-6">
                <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-800/60 pb-4 bg-slate-50 dark:bg-slate-900/80">
                    <CardTitle className="text-xl flex items-center gap-2 text-slate-900 dark:text-white">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      Class Leaderboard
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Top performers in this course
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <LeaderboardTable 
                      entries={overview.leaderboard}
                      currentUserId="" // Read-only teacher view
                      userRank={null}
                      enabled={!isGamificationDisabled}
                      isLoading={loadingOverview}
                    />
                  </CardContent>
                </Card>

                {/* Badge Distribution Chart */}
                <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800 shadow-xl">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-800/60 pb-4 bg-slate-50 dark:bg-slate-900/80">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                      <Target className="h-5 w-5 text-indigo-400" />
                      Badge Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-6 pb-2">
                    {overview.badgeDistribution.length > 0 ? (
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={overview.badgeDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis 
                              dataKey="badgeName" 
                              stroke="#94a3b8" 
                              fontSize={12} 
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
                            />
                            <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                            <RechartsTooltip 
                              cursor={{ fill: '#334155', opacity: 0.4 }}
                              contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px', color: '#f8fafc' }}
                            />
                            <Bar 
                              dataKey="count" 
                              name="Awards"
                              fill="#6366f1" 
                              radius={[4, 4, 0, 0]} 
                              maxBarSize={50}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                        <Medal className="h-8 w-8 mb-2 opacity-20" />
                        <p>No badges awarded yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Side Panels (1/3 width) */}
              <div className="space-y-6">
                
                {/* Top Achievers */}
                <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800 shadow-xl">
                  <CardHeader className="border-b border-slate-200 dark:border-slate-800/60 pb-4 bg-slate-50 dark:bg-slate-900/80">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                      <Star className="h-5 w-5 text-amber-400" />
                      Top Achievers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4">
                    {overview.topAchievers.length > 0 ? (
                      overview.topAchievers.slice(0, 5).map((student, i) => (
                        <div key={student.userId} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                                <AvatarImage src={student.avatarUrl || undefined} />
                                <AvatarFallback className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                                  {student.fullName.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {i < 3 && (
                                <div className="absolute -top-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-0.5">
                                  <Medal className={`h-4 w-4 ${
                                    i === 0 ? "text-amber-400" : 
                                    i === 1 ? "text-slate-400 dark:text-slate-300" : 
                                    "text-amber-700"
                                  }`} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-slate-200 text-sm leading-tight">{student.fullName}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-primary font-medium">{student.totalPoints} XP</span>
                                <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{student.badgeCount} Badges</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-sm text-slate-500 py-4">No top achievers yet</p>
                    )}
                  </CardContent>
                </Card>

                {/* Low Engagement Alerts */}
                <Card className="bg-white dark:bg-[#112240] border-rose-200 dark:border-rose-900/30 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500/50" />
                  <CardHeader className="border-b border-slate-200 dark:border-slate-800/60 pb-4 bg-slate-50 dark:bg-slate-900/80">
                    <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                      <AlertCircle className="h-5 w-5 text-rose-400" />
                      Low Engagement Alerts
                    </CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">
                      Students who may need intervention
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                      {overview.lowEngagement.length > 0 ? (
                        overview.lowEngagement.slice(0, 5).map((student) => (
                          <Link 
                            key={student.userId} 
                            href={`/teacher/students/${student.userId}`}
                          >
                            <div className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group">
                              <div>
                                <p className="font-medium text-slate-900 dark:text-slate-300 group-hover:text-primary transition-colors">{student.fullName}</p>
                                <p className="text-xs text-rose-600 dark:text-rose-400/80 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  {student.totalPoints === 0 ? "0 XP earned" : `Only ${student.totalPoints} XP earned`}
                                </p>
                              </div>
                              <Button variant="ghost" size="sm" className="h-8 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
                                View Profile
                              </Button>
                            </div>
                          </Link>
                        ))
                      ) : (
                        <div className="p-6 text-center text-slate-500 text-sm">
                          <CheckCircle2 className="h-8 w-8 text-emerald-500/50 mx-auto mb-2" />
                          No low engagement students found
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

              </div>
            </div>
          </>
        ) : null}
      </div>
    </TeacherLayout>
  );
}

function KpiCard({ title, value, subtitle, icon }: { title: string, value: string, subtitle: string, icon: React.ReactNode }) {
  return (
    <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800 shadow-md">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {title}
        </CardTitle>
        <div className="p-1.5 bg-slate-50 dark:bg-slate-800 rounded-md">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
        <p className="text-xs text-slate-500 mt-1">
          {subtitle}
        </p>
      </CardContent>
    </Card>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-28 rounded-xl bg-slate-100 dark:bg-slate-800" />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-96 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800" />
          <Skeleton className="h-80 rounded-xl bg-slate-100 dark:bg-slate-800" />
        </div>
      </div>
    </div>
  );
}
