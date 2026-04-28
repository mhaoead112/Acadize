import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import AdminLayout from '@/components/AdminLayout';
import { useGamificationReport } from '@/hooks/useAdminGamification';
import { useQuery } from '@tanstack/react-query';
import { apiEndpoint } from '@/lib/config';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from '@/components/ui/card';
import { 
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue 
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Trophy, Star, Users, Award, TrendingUp, Calendar as CalendarIcon, Filter } from 'lucide-react';
import { subDays, format, parseISO } from 'date-fns';

function useAdminCourses() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ['admin-courses'],
    queryFn: async () => {
      const res = await fetch(apiEndpoint('/api/admin/courses'), {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch courses');
      const data = await res.json();
      return data.courses || [];
    },
    enabled: !!token
  });
}

export default function AdminGamificationReports() {
  const [courseId, setCourseId] = useState<string>('all');
  const [dateRangePreset, setDateRangePreset] = useState<string>('30days');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const { data: courses } = useAdminCourses();

  // Calculate actual dates based on preset
  const filters = useMemo(() => {
    const f: any = {};
    if (courseId && courseId !== 'all') f.courseId = courseId;

    if (dateRangePreset === 'custom') {
      if (customStart) f.startDate = new Date(customStart);
      if (customEnd) f.endDate = new Date(customEnd);
    } else if (dateRangePreset !== 'all') {
      const days = parseInt(dateRangePreset.replace('days', ''));
      f.startDate = subDays(new Date(), days);
    }
    return f;
  }, [courseId, dateRangePreset, customStart, customEnd]);

  const { data: report, isLoading, error } = useGamificationReport(filters);

  // Fallback calculations
  const topLevelReached = report?.levelDistribution?.length 
    ? Math.max(...report.levelDistribution.map(l => l.levelNumber)) 
    : 0;

  // We use the real course comparison data from the API report
  const courseComparisonData = report?.courseComparison || [];

  return (
    <AdminLayout>
      <div className="max-w-7xl mx-auto p-4 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* Header & Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 bg-white dark:bg-[#112240] p-6 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-primary" />
              Gamification Reports
            </h1>
            <p className="text-muted-foreground mt-1">
              Analyze student engagement and gamification metrics across the platform.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All Courses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses?.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRangePreset} onValueChange={setDateRangePreset}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7days">Last 7 Days</SelectItem>
                  <SelectItem value="30days">Last 30 Days</SelectItem>
                  <SelectItem value="90days">Last 90 Days</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="custom">Custom Range...</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Custom Date Picker (shows only if 'custom' is selected) */}
        {dateRangePreset === 'custom' && (
          <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-lg border">
            <div className="space-y-1">
              <span className="text-xs font-medium">Start Date</span>
              <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-medium">End Date</span>
              <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        {error ? (
          <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="font-medium text-destructive">Failed to load gamification reports</p>
            <p className="text-sm mt-1">{error.message}</p>
          </div>
        ) : (
          <>
            {/* KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total XP Awarded</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold">{report?.totalPointsAwarded?.toLocaleString() || 0}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <Award className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Badges Issued</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold">{report?.totalBadgesIssued?.toLocaleString() || 0}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Users className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Learners</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold">{report?.activeLearnersCount?.toLocaleString() || 0}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <Trophy className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Top Level Reached</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-24 mt-1" />
                    ) : (
                      <p className="text-3xl font-bold">Lvl {topLevelReached}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Badge Issuance Trend */}
              <Card className="col-span-1 bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Badge Issuance Trend</CardTitle>
                  <CardDescription>Number of badges issued over time</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : !report?.badgeIssuanceTrend?.length ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                      No data available for this period
                    </div>
                  ) : (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={report.badgeIssuanceTrend} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis 
                            dataKey="date" 
                            tickFormatter={(val) => format(parseISO(val), 'MMM d')}
                            tick={{ fontSize: 12 }} 
                          />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <RechartsTooltip 
                            labelFormatter={(val) => format(parseISO(val as string), 'MMM d, yyyy')}
                          />
                          <Line type="monotone" dataKey="count" name="Badges" stroke="hsl(var(--primary))" strokeWidth={3} activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Level Distribution */}
              <Card className="col-span-1 bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Level Distribution</CardTitle>
                  <CardDescription>Number of learners currently at each level</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : !report?.levelDistribution?.length ? (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground border-2 border-dashed rounded-lg">
                      No data available for this period
                    </div>
                  ) : (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={report.levelDistribution} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="levelName" tick={{ fontSize: 12 }} />
                          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                          <RechartsTooltip />
                          <Bar dataKey="count" name="Learners" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Top Earners Table */}
              <Card className="col-span-1 bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Top Earners</CardTitle>
                  <CardDescription>Top 10 students by total XP</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : !report?.topEarners?.length ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No points awarded yet
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Rank</th>
                            <th className="px-4 py-3">Learner</th>
                            <th className="px-4 py-3 text-right">Total XP</th>
                            <th className="px-4 py-3 text-center rounded-tr-lg">Level</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.topEarners.slice(0, 10).map((earner: any, index: number) => (
                            <tr key={earner.userId} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${index + 1}`}
                              </td>
                              <td className="px-4 py-3 font-medium">{earner.fullName}</td>
                              <td className="px-4 py-3 text-right text-primary font-semibold">{earner.totalPoints.toLocaleString()}</td>
                              <td className="px-4 py-3 text-center text-muted-foreground">{Math.floor(earner.totalPoints / 100) + 1}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Course Comparison Table */}
              <Card className="col-span-1 bg-white dark:bg-[#112240] border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle>Course Comparison</CardTitle>
                  <CardDescription>Points earned vs enrollment across courses</CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="space-y-4">
                      {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                    </div>
                  ) : courseComparisonData.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                       No course data available
                     </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                          <tr>
                            <th className="px-4 py-3 rounded-tl-lg">Course Name</th>
                            <th className="px-4 py-3 text-right">Enrollments</th>
                            <th className="px-4 py-3 text-right">Total XP</th>
                            <th className="px-4 py-3 text-right rounded-tr-lg">Avg XP/Learner</th>
                          </tr>
                        </thead>
                        <tbody>
                          {courseComparisonData.map((course: any, index: number) => (
                            <tr key={index} className="border-b last:border-0 hover:bg-muted/50">
                              <td className="px-4 py-3 font-medium truncate max-w-[150px]" title={course.courseTitle}>{course.courseTitle}</td>
                              <td className="px-4 py-3 text-right">{course.enrolledCount}</td>
                              <td className="px-4 py-3 text-right text-primary font-semibold">{course.totalPointsEarned.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right text-muted-foreground">{course.enrolledCount > 0 ? Math.round(course.totalPointsEarned / course.enrolledCount) : 0}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
