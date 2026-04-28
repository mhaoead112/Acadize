import { CheckCircle2, Lock, Medal } from 'lucide-react';
import { GamificationBadge } from '@shared/gamification.types';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import GamificationIcon from './GamificationIcon';

interface BadgeGridProps {
  badges: GamificationBadge[];
  earnedBadgeIds: string[];
  onBadgeClick?: (badge: GamificationBadge) => void;
  filter?: 'all' | 'earned' | 'locked';
}

function getCriteriaDescription(criteriaType: string, value: number) {
  switch (criteriaType) {
    case 'points':
      return `Earn ${value} points`;
    case 'lessons_completed':
      return `Complete ${value} lessons`;
    case 'perfect_score':
      return `Get a perfect score on ${value} quizzes`;
    case 'streak':
      return `Maintain a ${value} day streak`;
    case 'level_reached':
      return `Reach level ${value}`;
    case 'first_action':
      return 'Complete your first action';
    default:
      return `Criteria: ${criteriaType} (${value})`;
  }
}

export default function BadgeGrid({
  badges,
  earnedBadgeIds,
  onBadgeClick,
  filter = 'all',
}: BadgeGridProps) {
  // Filter the badges based on the current filter selection
  const filteredBadges = badges.filter((badge) => {
    const isEarned = earnedBadgeIds.includes(badge.id);
    if (filter === 'earned') return isEarned;
    if (filter === 'locked') return !isEarned;
    return true; // 'all'
  });

  if (!filteredBadges || filteredBadges.length === 0) {
    return (
      <EmptyState
        icon={<Medal className="h-12 w-12" />}
        title="No badges found"
        description={
          filter === 'all'
            ? "There are no badges available yet. Start participating to earn your first badge!"
            : filter === 'earned'
            ? "You haven't earned any badges yet. Keep up the good work and they'll appear here."
            : "There are no locked badges to show."
        }
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
      {filteredBadges.map((badge) => {
        const isEarned = earnedBadgeIds.includes(badge.id);

        return (
          <Card
            key={badge.id}
            onClick={() => onBadgeClick?.(badge)}
            className={cn(
              'group relative flex flex-col items-center justify-center p-6 text-center transition-all duration-300',
              onBadgeClick && 'cursor-pointer hover:border-primary/50',
              isEarned
                ? 'bg-card hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5'
                : 'bg-card/50 opacity-70 hover:opacity-100',
              'dark:bg-[#112240] dark:border-white/10 overflow-hidden'
            )}
          >
            {/* Criteria Tooltip overlay on hover */}
            <div className="absolute inset-x-0 bottom-0 translate-y-full bg-primary/90 px-3 py-2 text-xs font-medium text-primary-foreground opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100 z-10">
              {getCriteriaDescription(badge.criteriaType, badge.criteriaValue)}
            </div>

            {/* Icon Container */}
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-secondary/30">
              {/* If not earned, apply a grayscale and lower opacity */}
              <div
                className={cn(
                  'transition-all duration-300 group-hover:scale-110',
                  !isEarned && 'grayscale opacity-60'
                )}
              >
                <GamificationIcon name={badge.emoji} size={40} className="text-amber-500" />
              </div>

              {/* Status Indicator Icon overlaying the main emoji circle */}
              <div
                className={cn(
                  'absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border-2 border-card',
                  isEarned ? 'bg-emerald-500' : 'bg-muted-foreground/30 backdrop-blur-md'
                )}
              >
                {isEarned ? (
                  <CheckCircle2 className="h-4 w-4 text-white" />
                ) : (
                  <Lock className="h-4 w-4 text-white/70" />
                )}
              </div>
            </div>

            {/* Badge Info */}
            <h4 className="mb-1 text-sm font-bold tracking-tight md:text-base">
              {badge.name}
            </h4>
            <p className="text-xs text-muted-foreground line-clamp-2">
              {badge.description}
            </p>

            {/* State text */}
            <div
              className={cn(
                'mt-3 text-[10px] font-semibold uppercase tracking-wider',
                isEarned ? 'text-emerald-500' : 'text-muted-foreground'
              )}
            >
              {isEarned ? 'Earned' : 'Locked'}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
