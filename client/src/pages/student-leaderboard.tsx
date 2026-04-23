import { useState, useEffect } from 'react';
import { Trophy, Info, ShieldAlert, Award, Star } from 'lucide-react';

import StudentLayout from '@/components/StudentLayout';
import { useStudentEnrollments } from '@/hooks/useStudentDashboard';
import { useLeaderboard } from '@/hooks/useGamification';
import { useAuth } from '@/hooks/useAuth';

import LeaderboardTable from '@/components/gamification/LeaderboardTable';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';

export default function StudentLeaderboard() {
  const { user } = useAuth();
  const { data: enrollments, isLoading: enrollmentsLoading } = useStudentEnrollments();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Auto-select the first course when enrollments load
  useEffect(() => {
    if (enrollments && enrollments.length > 0 && !selectedCourseId) {
      setSelectedCourseId(enrollments[0].courseId);
    }
  }, [enrollments, selectedCourseId]);

  const { data: leaderboardData, isLoading: leaderboardLoading } = useLeaderboard(
    selectedCourseId || null
  );

  const currentCourse = enrollments?.find((e) => e.courseId === selectedCourseId)?.course;

  return (
    <StudentLayout>
      <div className="mx-auto max-w-[1000px] space-y-8 p-4 md:p-8">
        
        {/* 1. Page Header & Course Selector */}
        <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Trophy className="h-8 w-8 text-yellow-500" />
              Course Leaderboard
            </h1>
            <p className="mt-2 text-muted-foreground">
              See how you rank against your peers in your enrolled courses.
            </p>
          </div>

          <div className="w-full md:w-[300px]">
            {enrollmentsLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : enrollments && enrollments.length > 0 ? (
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                  {enrollments.map((enrollment) => (
                    <SelectItem key={enrollment.courseId} value={enrollment.courseId}>
                      {enrollment.course.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Alert>
                <AlertDescription>You are not enrolled in any courses yet.</AlertDescription>
              </Alert>
            )}
          </div>
        </div>

        {/* State: No courses at all */}
        {enrollments && enrollments.length === 0 && (
          <EmptyState
            icon={<Award className="h-12 w-12" />}
            title="No Courses Found"
            description="Enroll in a course to start earning XP and competing on the leaderboard."
          />
        )}

        {selectedCourseId && (
          <div className="grid gap-8 lg:grid-cols-[1fr_300px]">
            {/* Main Content Area */}
            <div className="space-y-8">
              
              {/* 2. User's Own Rank Card */}
              {leaderboardLoading ? (
                <Skeleton className="h-[120px] w-full rounded-xl" />
              ) : leaderboardData?.enabled ? (
                <Card className="overflow-hidden border-2 border-yellow-500/20 bg-gradient-to-br from-yellow-500/10 via-background to-background dark:from-yellow-500/5">
                  <CardContent className="p-6 md:p-8">
                    <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 text-4xl shadow-inner">
                        {leaderboardData.userRank === 1 ? '🥇' : 
                         leaderboardData.userRank === 2 ? '🥈' : 
                         leaderboardData.userRank === 3 ? '🥉' : '🎖️'}
                      </div>
                      <div className="space-y-1">
                        <h2 className="text-2xl font-bold">
                          {leaderboardData.userRank ? (
                            <>Your Rank: <span className="text-yellow-600 dark:text-yellow-500">#{leaderboardData.userRank}</span></>
                          ) : (
                            'Not Ranked Yet'
                          )}
                        </h2>
                        <p className="text-muted-foreground">
                          in <span className="font-medium text-foreground">{currentCourse?.title}</span>
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* 3. LeaderboardTable */}
              <div className="space-y-4">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Top Performers
                </h3>
                <LeaderboardTable
                  entries={leaderboardData?.entries || []}
                  currentUserId={user?.id || ''}
                  userRank={leaderboardData?.userRank || null}
                  enabled={leaderboardData?.enabled ?? true}
                  isLoading={leaderboardLoading}
                />
              </div>
            </div>

            {/* Sidebar Area */}
            <div className="space-y-6">
              {/* 5. Privacy Messaging */}
              <Alert className="bg-secondary/20">
                <ShieldAlert className="h-4 w-4 text-primary" />
                <AlertDescription className="text-sm">
                  Only active students enrolled in {currentCourse?.title || 'this course'} can view this leaderboard.
                </AlertDescription>
              </Alert>

              {/* 4. Explanation Panel */}
              <Card>
                <CardContent className="p-0">
                  <Accordion type="single" collapsible className="w-full px-4" defaultValue="how-it-works">
                    <AccordionItem value="how-it-works" className="border-b-0">
                      <AccordionTrigger className="text-sm font-semibold hover:no-underline">
                        <span className="flex items-center gap-2">
                          <Info className="h-4 w-4" />
                          How rankings work
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground space-y-4 pt-2">
                        <p>
                          Rankings are based on the total <strong>XP (Experience Points)</strong> you earn within this specific course.
                        </p>
                        <ul className="space-y-2 list-disc pl-4">
                          <li>Complete lessons to earn XP</li>
                          <li>Score well on assignments and exams for bonus points</li>
                          <li>Maintain your learning streak for multipliers</li>
                        </ul>
                        <p>
                          The leaderboard updates in real-time as you and your peers hit new milestones. Keep learning to climb the ranks!
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  );
}
