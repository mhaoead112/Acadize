import { useState, useMemo } from 'react';
import { Award, Lock, Medal, Trophy } from 'lucide-react';
import { format } from 'date-fns';

import StudentLayout from '@/components/StudentLayout';
import { useMyBadges } from '@/hooks/useGamification';
import {
  GamificationBadge,
  AwardedBadge,
  GamificationCriteriaType,
} from '@shared/gamification.types';

import BadgeGrid from '@/components/gamification/BadgeGrid';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';

const TAB_CATEGORIES: Record<string, GamificationCriteriaType[]> = {
  all: [],
  courses: ['lesson_count', 'course_completion'],
  exams: ['exam_score'],
  assignments: ['assignment_count'],
  milestones: ['streak', 'level_reached', 'first_action'],
};

export default function StudentAchievements() {
  const { data: badgesData, isLoading, error } = useMyBadges('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [selectedBadge, setSelectedBadge] = useState<GamificationBadge | AwardedBadge | null>(null);

  // Combine and deduplicate badges for display
  const { allBadges, earnedBadgeIds, earnedBadgesMap } = useMemo(() => {
    if (!badgesData) return { allBadges: [] as GamificationBadge[], earnedBadgeIds: [] as string[], earnedBadgesMap: new Map<string, AwardedBadge>() };

    const earnedMap = new Map<string, AwardedBadge>();
    badgesData.earned.forEach((b) => earnedMap.set(b.id, b));

    const combinedMap = new Map<string, GamificationBadge>();
    badgesData.earned.forEach((b) => combinedMap.set(b.id, b));
    badgesData.available.forEach((b) => {
      if (!combinedMap.has(b.id)) {
        combinedMap.set(b.id, b);
      }
    });

    return {
      allBadges: Array.from(combinedMap.values()),
      earnedBadgeIds: Array.from(earnedMap.keys()) as string[],
      earnedBadgesMap: earnedMap,
    };
  }, [badgesData]);

  // Filter badges based on the active tab grouping
  const displayedBadges = useMemo(() => {
    if (activeTab === 'all') return allBadges;
    const allowedTypes = TAB_CATEGORIES[activeTab];
    return allBadges.filter((b) => allowedTypes.includes(b.criteriaType));
  }, [allBadges, activeTab]);

  // In-progress badges (locked badges)
  const inProgressBadges = useMemo(() => {
    return allBadges.filter((b) => !earnedBadgeIds.includes(b.id)).slice(0, 4);
  }, [allBadges, earnedBadgeIds]);

  const handleBadgeClick = (badge: GamificationBadge) => {
    const awarded = earnedBadgesMap.get(badge.id);
    setSelectedBadge(awarded || badge);
  };

  const getCriteriaDescription = (criteriaType: string, value: number) => {
    switch (criteriaType) {
      case 'points': return `Earn ${value} points`;
      case 'lesson_count': return `Complete ${value} lessons`;
      case 'course_completion': return 'Complete a course';
      case 'exam_score': return `Score ${value}% or higher on an exam`;
      case 'assignment_count': return `Complete ${value} assignments`;
      case 'streak': return `Maintain a ${value} day streak`;
      case 'level_reached': return `Reach level ${value}`;
      case 'first_action': return 'Complete your first action';
      default: return `Complete criteria: ${criteriaType} (${value})`;
    }
  };

  if (error) {
    return (
      <StudentLayout>
        <div className="mx-auto max-w-[1200px] p-6 text-center">
          <p className="text-destructive">Failed to load badges. Please try again later.</p>
        </div>
      </StudentLayout>
    );
  }

  return (
    <StudentLayout>
      <div className="mx-auto max-w-[1200px] space-y-8 p-4 md:p-8">
        
        {/* 1. Page Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Medal className="h-8 w-8 text-primary" />
              Achievements & Badges
            </h1>
            <p className="mt-2 text-muted-foreground">
              Track your progress, earn badges, and showcase your milestones.
            </p>
          </div>
          
          {!isLoading && (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
              {badgesData?.earned.length || 0} Badges Earned
            </Badge>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-8">
            <Skeleton className="h-12 w-full md:w-[400px]" />
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          </div>
        )}

        {!isLoading && (
          <>
            {/* 4. "In Progress" Section */}
            {inProgressBadges.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-muted-foreground" />
                  In Progress
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inProgressBadges.map((badge) => (
                    <Card key={badge.id} className="bg-card/50">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30 text-2xl grayscale opacity-60">
                          {badge.emoji || '🎖️'}
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold line-clamp-1">{badge.name}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                            {getCriteriaDescription(badge.criteriaType, badge.criteriaValue)}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* 2. Category Filter Tabs */}
            <div className="space-y-6">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="w-full flex-wrap justify-start h-auto">
                  <TabsTrigger value="all">All Badges</TabsTrigger>
                  <TabsTrigger value="courses">Courses</TabsTrigger>
                  <TabsTrigger value="exams">Exams</TabsTrigger>
                  <TabsTrigger value="assignments">Assignments</TabsTrigger>
                  <TabsTrigger value="milestones">Milestones</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 3. BadgeGrid */}
              {displayedBadges.length === 0 ? (
                <EmptyState
                  icon={<Award className="h-12 w-12" />}
                  title="No badges found"
                  description={`There are no badges in the "${activeTab}" category.`}
                />
              ) : (
                <BadgeGrid
                  badges={displayedBadges}
                  earnedBadgeIds={earnedBadgeIds}
                  onBadgeClick={handleBadgeClick}
                  filter="all" // Handling filter locally to support groupings
                />
              )}
            </div>
          </>
        )}

        {/* 5. Achievement detail Sheet */}
        <Sheet open={!!selectedBadge} onOpenChange={(open) => !open && setSelectedBadge(null)}>
          <SheetContent className="sm:max-w-md">
            {selectedBadge && (() => {
              const isEarned = 'awardedAt' in selectedBadge;
              return (
                <>
                  <SheetHeader className="text-center sm:text-center mt-6">
                    <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-secondary/20 mb-6">
                      <span className={`text-6xl ${!isEarned ? 'grayscale opacity-60' : ''}`}>
                        {selectedBadge.emoji || '🎖️'}
                      </span>
                    </div>
                    <SheetTitle className="text-2xl font-bold">{selectedBadge.name}</SheetTitle>
                    <SheetDescription className="text-base mt-2">
                      {selectedBadge.description}
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-8 space-y-6">
                    <div className="rounded-lg bg-muted p-4">
                      <h4 className="text-sm font-medium mb-1">How to earn</h4>
                      <p className="text-sm text-muted-foreground">
                        {getCriteriaDescription(selectedBadge.criteriaType, selectedBadge.criteriaValue)}
                      </p>
                    </div>

                    {isEarned ? (
                      <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-center">
                        <Award className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          Badge Earned
                        </h4>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                          Earned on {format(new Date((selectedBadge as AwardedBadge).awardedAt), 'MMMM d, yyyy')}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-secondary/10 p-4 border border-border text-center">
                        <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-foreground">
                          Not Yet Earned
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Keep going! Complete the criteria to unlock this achievement.
                        </p>
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </SheetContent>
        </Sheet>
      </div>
    </StudentLayout>
  );
}
