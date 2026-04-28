import { useState, useMemo } from 'react';
import { Award, Lock, Medal, Trophy } from 'lucide-react';
import { format } from 'date-fns';

import StudentLayout from '@/components/StudentLayout';
import { useTranslation } from 'react-i18next';
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
import GamificationIcon from '@/components/gamification/GamificationIcon';

const TAB_CATEGORIES: Record<string, GamificationCriteriaType[]> = {
  all: [],
  courses: ['lesson_count', 'course_completion'],
  exams: ['exam_score'],
  assignments: ['assignment_count'],
  milestones: ['streak', 'level_reached', 'first_action'],
};

export default function StudentAchievements() {
  const { t } = useTranslation('gamification');
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
      case 'points': return t('achievementsPage.criteriaEarnPoints', { value });
      case 'lesson_count': return t('achievementsPage.criteriaCompleteLessons', { value });
      case 'course_completion': return t('achievementsPage.criteriaCompleteCourse');
      case 'exam_score': return t('achievementsPage.criteriaExamScore', { value });
      case 'assignment_count': return t('achievementsPage.criteriaCompleteAssignments', { value });
      case 'streak': return t('achievementsPage.criteriaStreak', { value });
      case 'level_reached': return t('achievementsPage.criteriaLevelReached', { value });
      case 'first_action': return t('achievementsPage.criteriaFirstAction');
      default: return t('achievementsPage.criteriaDefault', { type: criteriaType, value });
    }
  };

  if (error) {
    return (
      
        <div className="mx-auto max-w-[1200px] p-6 text-center">
          <p className="text-destructive">{t('failedToLoadBadges')}</p>
        </div>
      
    );
  }

  return (
    
      <div className="mx-auto max-w-[1200px] space-y-8 p-4 md:p-8">
        
        {/* 1. Page Header */}
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Medal className="h-8 w-8 text-primary" />
              {t('achievementsPage.title')}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {t('achievementsPage.subtitle')}
            </p>
          </div>
          
          {!isLoading && (
            <Badge variant="secondary" className="px-4 py-2 text-sm">
              <Trophy className="mr-2 h-4 w-4 text-yellow-500" />
              {t('achievementsPage.badgesEarned', { count: badgesData?.earned.length || 0 })}
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
                  {t('achievementsPage.inProgress')}
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {inProgressBadges.map((badge) => (
                    <Card key={badge.id} className="bg-white/50 dark:bg-[#112240]/50 border-slate-200 dark:border-slate-800">
                      <CardContent className="p-4 flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/30 grayscale opacity-60">
                          <GamificationIcon name={badge.emoji} size={24} className="text-amber-500" />
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
                  <TabsTrigger value="all">{t('achievementsPage.allBadges')}</TabsTrigger>
                  <TabsTrigger value="courses">{t('courses')}</TabsTrigger>
                  <TabsTrigger value="exams">{t('exams')}</TabsTrigger>
                  <TabsTrigger value="assignments">{t('assignments')}</TabsTrigger>
                  <TabsTrigger value="milestones">{t('milestones')}</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* 3. BadgeGrid */}
              {displayedBadges.length === 0 ? (
                <EmptyState
                  icon={<Award className="h-12 w-12" />}
                  title={t('achievementsPage.noBadgesFound')}
                  description={t('achievementsPage.noBadgesCategory', { category: activeTab })}
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
                      <div className={!isEarned ? 'grayscale opacity-60' : ''}>
                        <GamificationIcon name={selectedBadge.emoji} size={64} className="text-amber-500" />
                      </div>
                    </div>
                    <SheetTitle className="text-2xl font-bold">{selectedBadge.name}</SheetTitle>
                    <SheetDescription className="text-base mt-2">
                      {selectedBadge.description}
                    </SheetDescription>
                  </SheetHeader>
                  
                  <div className="mt-8 space-y-6">
                    <div className="rounded-lg bg-slate-100 dark:bg-[#1A2D4F] p-4">
                      <h4 className="text-sm font-medium mb-1">{t('achievementsPage.howToEarn')}</h4>
                      <p className="text-sm text-muted-foreground">
                        {getCriteriaDescription(selectedBadge.criteriaType, selectedBadge.criteriaValue)}
                      </p>
                    </div>

                    {isEarned ? (
                      <div className="rounded-lg bg-emerald-500/10 p-4 border border-emerald-500/20 text-center">
                        <Award className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                          {t('achievementsPage.badgeEarned')}
                        </h4>
                        <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                          {t('achievementsPage.earnedOn', { date: format(new Date((selectedBadge as AwardedBadge).awardedAt), 'MMMM d, yyyy') })}
                        </p>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-slate-50 dark:bg-[#1A2D4F] p-4 border border-slate-200 dark:border-slate-700 text-center">
                        <Lock className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-foreground">
                          {t('notYetEarned')}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t('keepGoing')}
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
    
  );
}
