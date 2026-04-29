import { CheckCircle2, Lock, Medal, Star, StarOff } from 'lucide-react';
import { GamificationBadge, AwardedBadge } from '@shared/gamification.types';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import GamificationIcon from './GamificationIcon';

interface BadgeGridProps {
  badges: GamificationBadge[];
  earnedBadgeIds: string[];
  featuredBadgeIds?: string[];
  onBadgeClick?: (badge: GamificationBadge) => void;
  onToggleFeature?: (badgeId: string) => void;
  filter?: 'all' | 'earned' | 'locked';
}

const rarityStyles = {
  common: {
    bg: 'bg-slate-500/10 dark:bg-slate-500/20',
    border: 'border-slate-500/30',
    text: 'text-slate-500',
    glow: '',
    label: 'Common'
  },
  uncommon: {
    bg: 'bg-blue-500/10 dark:bg-blue-500/20',
    border: 'border-blue-500/30',
    text: 'text-blue-500',
    glow: 'shadow-[0_0_10px_rgba(59,130,246,0.2)]',
    label: 'Uncommon'
  },
  rare: {
    bg: 'bg-purple-500/10 dark:bg-purple-500/20',
    border: 'border-purple-500/30',
    text: 'text-purple-500',
    glow: 'shadow-[0_0_15px_rgba(168,85,247,0.3)]',
    label: 'Rare'
  },
  epic: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/20',
    border: 'border-amber-500/30',
    text: 'text-amber-500',
    glow: 'shadow-[0_0_20px_rgba(245,158,11,0.4)]',
    label: 'Epic'
  },
  legendary: {
    bg: 'bg-orange-600/10 dark:bg-orange-600/20',
    border: 'border-orange-600/40',
    text: 'text-orange-600',
    glow: 'shadow-[0_0_25px_rgba(234,88,12,0.5)] animate-pulse',
    label: 'Legendary'
  }
};

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
  featuredBadgeIds = [],
  onBadgeClick,
  onToggleFeature,
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
    <TooltipProvider>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {filteredBadges.map((badge) => {
          const isEarned = earnedBadgeIds.includes(badge.id);
          const isFeatured = featuredBadgeIds.includes(badge.id);
          const style = rarityStyles[badge.rarity || 'common'];

          return (
            <Card
              key={badge.id}
              className={cn(
                'group relative flex flex-col items-center justify-center p-6 text-center transition-all duration-300 border overflow-hidden',
                onBadgeClick && 'cursor-pointer hover:border-primary/50 dark:hover:border-primary/50',
                isEarned
                  ? 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5'
                  : 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/50 opacity-70 hover:opacity-100',
                isEarned && style.border
              )}
              onClick={() => onBadgeClick?.(badge)}
            >
              {/* Feature Toggle */}
              {isEarned && onToggleFeature && (
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute right-2 top-2 z-20 h-8 w-8 rounded-full transition-all",
                    isFeatured 
                      ? "text-amber-500 hover:text-amber-600 bg-amber-500/10" 
                      : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFeature(badge.id);
                  }}
                >
                  <Star className={cn("h-4 w-4", isFeatured && "fill-current")} />
                </Button>
              )}

              {/* Rarity Tag */}
              <div className={cn(
                "absolute left-3 top-3 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-full border",
                style.bg,
                style.text,
                style.border
              )}>
                {style.label}
              </div>

              {/* Icon Container */}
              <div className={cn(
                "relative mb-4 flex h-24 w-24 items-center justify-center rounded-full border-4 transition-all duration-500",
                isEarned ? style.bg : "bg-secondary/30",
                isEarned ? style.border : "border-transparent",
                isEarned && style.glow,
                "group-hover:scale-105"
              )}>
                <div
                  className={cn(
                    'transition-all duration-300',
                    !isEarned && 'grayscale opacity-60'
                  )}
                >
                  <GamificationIcon name={badge.emoji} size={48} className={isEarned ? style.text : "text-amber-500"} />
                </div>

                {/* Status Indicator */}
                <div
                  className={cn(
                    'absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card',
                    isEarned ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-muted-foreground/30 backdrop-blur-md'
                  )}
                >
                  {isEarned ? (
                    <CheckCircle2 className="h-5 w-5 text-white" />
                  ) : (
                    <Lock className="h-4 w-4 text-white/70" />
                  )}
                </div>
              </div>

              {/* Badge Info */}
              <div className="space-y-1">
                <h4 className="text-base font-bold tracking-tight">
                  {badge.name}
                </h4>
                
                {badge.storyText && isEarned ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <p className="text-xs text-muted-foreground line-clamp-1 italic cursor-help hover:text-primary transition-colors">
                        "{badge.storyText}"
                      </p>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center p-3">
                      <p className="text-xs leading-relaxed italic">"{badge.storyText}"</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {badge.description}
                  </p>
                )}
              </div>

              {/* Criteria overlay on hover */}
              {!isEarned && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[10px] font-medium text-slate-500">
                  <Lock className="h-3 w-3" />
                  {getCriteriaDescription(badge.criteriaType, badge.criteriaValue)}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
