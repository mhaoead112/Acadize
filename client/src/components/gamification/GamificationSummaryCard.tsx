import { LazyMotion, domAnimation, m, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import {
    premiumCardVariants,
    premiumEnterVariants,
    premiumMotionEase,
    premiumMotionDurations,
} from '@/lib/animations';

import type { UserGamificationProfile, AwardedBadge } from '@shared/gamification.types';
import GamificationIcon from './GamificationIcon';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface GamificationSummaryCardProps {
    /** The learner's full gamification profile (from GET /api/gamification/me). */
    profile: UserGamificationProfile;
    /**
     * Up to 3 recently earned badges to display as emoji pills.
     * Pass an empty array when none are available.
     */
    recentBadges?: AwardedBadge[];
    /**
     * When true, renders a narrower, more compact card without the CTA button.
     * Suitable for sidebars, navigation drawers, or mobile layouts.
     * @default false
     */
    compact?: boolean;
    /**
     * Optional callback for the "View your hub" CTA button.
     * Only rendered when `compact` is false.
     */
    onNavigate?: () => void;
    /** Additional className applied to the root Card element. */
    className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * GamificationSummaryCard
 *
 * Displays a student's current level, total XP, level-progress bar, and a
 * row of up to 3 recent badge emojis. Designed to match the premium dark card
 * aesthetic of student-dashboard.tsx (dark:bg-[#112240]).
 *
 * Returns null when gamification is disabled for the org.
 */
export default function GamificationSummaryCard({
    profile,
    recentBadges = [],
    compact = false,
    onNavigate,
    className,
}: GamificationSummaryCardProps) {
    const { t } = useTranslation('gamification');
    const prefersReducedMotion = useReducedMotion();

    // --- Derived display values ---
    const pointLabel = t('xp');
    const levelIconName = profile.currentLevel?.badgeEmoji ?? 'star';
    const levelName = profile.currentLevel?.name ?? `${t('level')} ${profile.currentLevelNumber}`;
    const progress = Math.min(100, Math.max(0, profile.nextLevelProgress));
    const nextLevelName = profile.nextLevel?.name ?? null;
    const badgesToShow = recentBadges.slice(0, 3);

    const formattedPoints = profile.totalPoints.toLocaleString();

    // ---------------------------------------------------------------------------
    // Render: Compact variant
    // ---------------------------------------------------------------------------
    if (compact) {
        return (
            <LazyMotion features={domAnimation}>
                <m.div
                    variants={premiumCardVariants}
                    initial={prefersReducedMotion ? false : 'hidden'}
                    animate="visible"
                    whileHover={prefersReducedMotion ? undefined : 'hover'}
                >
                    <Card
                        className={cn(
                            'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60',
                            className,
                        )}
                    >
                        <CardContent className="flex flex-col gap-3 p-4">
                            {/* Header row: level badge + recent badges */}
                            <div className="flex items-center justify-between">
                                <Badge
                                    variant="secondary"
                                    className="gap-1.5 bg-slate-100 text-slate-700 dark:bg-[#1E293B] dark:text-slate-200"
                                >
                                    <GamificationIcon name={levelIconName} size={14} className="text-amber-500" />
                                    <span className="text-xs font-semibold">{levelName}</span>
                                </Badge>

                                {badgesToShow.length > 0 && (
                                    <div className="flex items-center gap-1">
                                        {badgesToShow.map((badge) => (
                                            <GamificationIcon
                                                key={badge.id}
                                                name={badge.emoji}
                                                size={16}
                                                className="text-amber-500"
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Total points */}
                            <p className="text-2xl font-bold tracking-tight text-amber-500 dark:text-[#FFD700]">
                                {formattedPoints}{' '}
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    {pointLabel}
                                </span>
                            </p>

                            {/* Progress bar */}
                            <div className="space-y-1.5">
                                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                    <span>
                                        {nextLevelName 
                                          ? t('summaryCard.next', { level: nextLevelName }) 
                                          : t('summaryCard.maxLevelReached')}
                                    </span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                                        {progress}%
                                    </span>
                                </div>
                                <Progress
                                    value={progress}
                                    className="h-1.5 bg-slate-200 dark:bg-[#233554]"
                                    indicatorClassName="bg-amber-500 dark:bg-[#FFD700] transition-all duration-700"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </m.div>
            </LazyMotion>
        );
    }

    // ---------------------------------------------------------------------------
    // Render: Default (full-width) variant
    // ---------------------------------------------------------------------------
    return (
        <LazyMotion features={domAnimation}>
            <m.div
                variants={premiumEnterVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
            >
                <Card
                    className={cn(
                        'border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900/60',
                        className,
                    )}
                >
                    <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:gap-6">

                        {/* ── Left: level + total points ── */}
                        <div className="flex shrink-0 flex-col gap-2">
                            <Badge
                                variant="secondary"
                                className="w-fit gap-1.5 bg-slate-100 text-slate-700 dark:bg-[#1E293B] dark:text-slate-200"
                            >
                                <GamificationIcon name={levelIconName} size={14} className="text-amber-500" />
                                <span className="text-xs font-semibold">{levelName}</span>
                            </Badge>
                            <p className="text-3xl font-bold tracking-tight text-amber-500 dark:text-[#FFD700]">
                                {formattedPoints}{' '}
                                <span className="text-base font-semibold text-slate-500 dark:text-slate-400">
                                    {pointLabel}
                                </span>
                            </p>
                        </div>

                        {/* ── Centre: progress bar ── */}
                        <div className="flex flex-1 flex-col gap-2">
                            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                <span>
                                    {nextLevelName
                                        ? t('summaryCard.progressTo', { level: nextLevelName })
                                        : t('summaryCard.maxLevelReached')}
                                </span>
                                <span className="font-semibold text-slate-700 dark:text-slate-200">
                                    {progress}%
                                </span>
                            </div>
                            <Progress
                                value={progress}
                                className="h-2 bg-slate-200 dark:bg-[#233554]"
                                indicatorClassName="bg-amber-500 dark:bg-[#FFD700] transition-all duration-700"
                            />
                        </div>

                        {/* ── Right: badge emojis + CTA ── */}
                        <div className="flex shrink-0 items-center gap-4">
                            {badgesToShow.length > 0 && (
                                <div className="flex items-center gap-1.5" aria-label="Recent badges">
                                    {badgesToShow.map((badge, i) => (
                                        <m.div
                                            key={badge.id}
                                            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.6 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={
                                                prefersReducedMotion
                                                    ? undefined
                                                    : {
                                                          delay: i * 0.08,
                                                          duration: premiumMotionDurations.standard,
                                                          ease: premiumMotionEase,
                                                      }
                                            }
                                            title={badge.name}
                                            className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-[#0B1E2D]"
                                            aria-label={badge.name}
                                        >
                                            <GamificationIcon name={badge.emoji} size={18} className="text-amber-500" />
                                        </m.div>
                                    ))}
                                </div>
                            )}

                            {onNavigate && (
                                <Button
                                    onClick={onNavigate}
                                    size="sm"
                                    className="h-9 gap-1.5 bg-slate-900 px-4 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
                                >
                                    {t('summaryCard.viewYourHub')}
                                    <m.span
                                        className="inline-flex"
                                        animate={prefersReducedMotion ? undefined : { x: [0, 2, 0] }}
                                        transition={
                                            prefersReducedMotion
                                                ? undefined
                                                : { duration: 1.8, repeat: Infinity, ease: premiumMotionEase }
                                        }
                                    >
                                        <ArrowRight className="h-3.5 w-3.5" />
                                    </m.span>
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </m.div>
        </LazyMotion>
    );
}
