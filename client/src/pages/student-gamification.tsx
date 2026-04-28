import { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { LazyMotion, domAnimation, m } from 'framer-motion';
import { format } from 'date-fns';
import { Medal, ArrowRight, Sparkles } from 'lucide-react';

import { 
  useGamificationProfile, 
  useLeaderboard, 
  useGamificationActivity, 
  useMyBadges 
} from '@/hooks/useGamification';
import { useStudentDashboard } from '@/hooks/useStudentDashboard';
import { useAuth } from '@/hooks/useAuth';

import GamificationSummaryCard from '@/components/gamification/GamificationSummaryCard';
import LevelProgressPanel from '@/components/gamification/LevelProgressPanel';
import BadgeGrid from '@/components/gamification/BadgeGrid';
import LeaderboardTable from '@/components/gamification/LeaderboardTable';
import AchievementTimeline from '@/components/gamification/AchievementTimeline';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function StudentGamificationPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  // Data fetching
  const { 
    data: profileData, 
    isLoading: isLoadingProfile, 
    isError: isProfileError 
  } = useGamificationProfile();

  const { 
    data: badgesData, 
    isLoading: isLoadingBadges 
  } = useMyBadges('earned');

  const { 
    data: leaderboardData, 
    isLoading: isLoadingLeaderboard 
  } = useLeaderboard(selectedCourseId);

  const {
    data: activityData,
    isLoading: isLoadingActivity
  } = useGamificationActivity(1, 10);

  // We use the dashboard hook to get the list of enrolled courses for the leaderboard dropdown
  const {
    courseProgress,
    isLoading: isLoadingStats,
    isError: isDashboardError,
  } = useStudentDashboard();

  useEffect(() => {
    if (!selectedCourseId && courseProgress.length > 0) {
      setSelectedCourseId(courseProgress[0].courseId);
    }
  }, [selectedCourseId, courseProgress]);

  useEffect(() => {
    if (!isProfileError && !isDashboardError) return;

    toast({
      title: "Error",
      description: "Failed to load your gamification data.",
      variant: "destructive"
    });
  }, [isProfileError, isDashboardError, toast]);

  const isLoading = isLoadingProfile || isLoadingStats;

  // Render Full-page skeleton while initial loading
  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-[1200px] p-4 md:p-8 space-y-8">
        <Skeleton className="h-20 w-full max-w-md rounded-lg" />
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
      </main>
    );
  }

  // First-time empty state
  if (profileData && profileData.totalPoints === 0 && (!activityData || activityData.events.length === 0)) {
    return (
      <main className="mx-auto w-full max-w-[1200px] p-4 md:p-8 flex items-center justify-center min-h-[60vh]">
        <EmptyState
          icon={<Medal className="h-16 w-16 text-[#FFD700]" />}
          title="Welcome to your Gamification Hub!"
          description="Open one of your course lessons and click Mark as Complete to start earning XP and unlock your first level."
          actionLabel="Open My Courses"
          onAction={() => setLocation("/student/courses")}
        />
      </main>
    );
  }

  const profile = profileData!;
  const courses = courseProgress;
  const earnedBadges = badgesData?.earned || [];
  const recentEvents = activityData?.events || [];

  return (
    <LazyMotion features={domAnimation}>
      <m.main 
        className="mx-auto w-full max-w-[1200px] p-4 md:p-8 space-y-12 pb-24"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* 1. Hero header */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Your Learning Journey
          </h1>
          <p className="text-muted-foreground flex items-center gap-2">
            Keep going, you're making excellent progress! 
            <span className="text-xs font-medium px-2 py-1 bg-slate-100 dark:bg-[#1A2D4F] text-slate-700 dark:text-slate-200 rounded-full ml-auto hidden sm:inline-block">
              {format(new Date(), 'EEEE, MMMM do, yyyy')}
            </span>
          </p>
        </header>

        {/* 2. Gamification Summary Card */}
        <section>
          <GamificationSummaryCard
            profile={profile}
            recentBadges={earnedBadges.slice(0, 3)}
            compact={false}
          />
        </section>

        {/* 3. Level Progress Panel */}
        <section>
          <LevelProgressPanel profile={profile} levels={[]} /> {/* Empty levels for now as API may not return all levels */}
        </section>

        {/* 4. Badge Grid */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
              Recent Achievements
            </h2>
            <Button asChild variant="ghost" className="text-primary hover:text-primary/80 group">
              <Link to="/student/achievements">
                View all 
                <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </div>
          <BadgeGrid 
            badges={earnedBadges.slice(0, 8)} 
            earnedBadgeIds={earnedBadges.map(b => b.id)} 
            filter="earned"
          />
        </section>

        {/* 5. Leaderboard Table */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold tracking-tight">
              Class Leaderboard
            </h2>
            {courses.length > 0 && (
              <Select 
                value={selectedCourseId || ''} 
                onValueChange={setSelectedCourseId}
              >
                <SelectTrigger className="w-full sm:w-[250px] bg-background border-input dark:border-white/10">
                  <SelectValue placeholder="Select a course" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Map(courses.map(c => [c.courseId, c])).values()).map(course => (
                    <SelectItem key={course.courseId} value={course.courseId}>
                      {course.courseName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          <LeaderboardTable 
            entries={leaderboardData?.entries || []}
            currentUserId={user?.id || ''}
            userRank={leaderboardData?.userRank ?? null}
            enabled={leaderboardData?.enabled ?? true}
            isLoading={isLoadingLeaderboard && !!selectedCourseId}
          />
        </section>

        {/* 6. Achievement Timeline */}
        <section className="space-y-6 max-w-3xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Recent Activity
          </h2>
          <AchievementTimeline 
            events={recentEvents} 
            isLoading={isLoadingActivity} 
          />
        </section>

      </m.main>
    </LazyMotion>
  );
}
