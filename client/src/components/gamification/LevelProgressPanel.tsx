import { useRef } from 'react';
import * as LucideIcons from 'lucide-react';
import { LazyMotion, domAnimation, m, useReducedMotion, useInView } from 'framer-motion';

import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
    premiumCardVariants,
    premiumEnterVariants,
    premiumMotionEase,
    premiumMotionDurations,
    springConfigs,
} from '@/lib/animations';

import type { UserGamificationProfile, GamificationLevel } from '@shared/gamification.types';
import GamificationIcon from './GamificationIcon';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface LevelProgressPanelProps {
    profile: UserGamificationProfile;
    /**
     * The full ordered list of levels for the org, used to build the
     * milestone dot row. Should include at minimum the current level.
     */
    levels: GamificationLevel[];
    className?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number between 0 and 100 for safe use with the progress bar. */
const clamp = (v: number) => Math.min(100, Math.max(0, v));

/** Picks levels to display as milestones: 1 before current, current, 1 after. */
function getMilestones(
    levels: GamificationLevel[],
    currentLevelNumber: number,
): GamificationLevel[] {
    const sorted = [...levels].sort((a, b) => a.levelNumber - b.levelNumber);
    const idx = sorted.findIndex((l) => l.levelNumber === currentLevelNumber);
    if (idx === -1) return sorted.slice(0, 3);
    const start = Math.max(0, idx - 1);
    return sorted.slice(start, start + 3);
}

// ---------------------------------------------------------------------------
// Sub-component: MilestoneDot
// ---------------------------------------------------------------------------

interface MilestoneDotProps {
    level: GamificationLevel;
    state: 'past' | 'current' | 'future';
    reduceMotion: boolean | null;
    delay: number;
}

function MilestoneDot({ level, state, reduceMotion, delay }: MilestoneDotProps) {
    const isPast = state === 'past';
    const isCurrent = state === 'current';

    return (
        <m.div
            className="flex flex-col items-center gap-1.5"
            initial={reduceMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={
                reduceMotion
                    ? undefined
                    : { delay, duration: premiumMotionDurations.standard, ease: premiumMotionEase }
            }
        >
            {/* Circle */}
            <div
                className={cn(
                    'flex items-center justify-center rounded-full text-sm font-bold transition-transform',
                    isCurrent
                        ? 'h-8 w-8 bg-amber-500 text-white shadow-lg shadow-amber-500/30 dark:bg-[#FFD700] dark:text-slate-900'
                        : isPast
                          ? 'h-7 w-7 bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                          : 'h-7 w-7 bg-slate-100 text-slate-400 dark:bg-[#1E293B]',
                )}
            >
                {isPast ? <LucideIcons.Check size={14} /> : isCurrent ? <GamificationIcon name={level.badgeEmoji} size={14} /> : <LucideIcons.Lock size={14} />}
            </div>
            {/* Label */}
            <span
                className={cn(
                    'text-[10px] font-medium',
                    isCurrent
                        ? 'text-amber-500 dark:text-[#FFD700]'
                        : isPast
                          ? 'text-emerald-400'
                          : 'text-slate-500',
                )}
            >
                Lv {level.levelNumber}
            </span>
        </m.div>
    );
}

// ---------------------------------------------------------------------------
// Animated progress bar (drives from 0 → value on first in-view)
// ---------------------------------------------------------------------------

interface AnimatedBarProps {
    value: number; // 0-100
    color: string; // Tailwind class
    reduceMotion: boolean | null;
}

function AnimatedBar({ value, color, reduceMotion }: AnimatedBarProps) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true });

    return (
        <div
            ref={ref}
            className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#0B1E2D]"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
        >
            <m.div
                className={cn('absolute inset-y-0 left-0 rounded-full', color)}
                initial={{ width: '0%' }}
                animate={inView ? { width: `${value}%` } : { width: '0%' }}
                transition={
                    reduceMotion
                        ? { duration: 0 }
                        : {
                              ...springConfigs.gentle,
                              delay: 0.25,
                              duration: 1.1,
                              type: 'tween',
                              ease: premiumMotionEase,
                          }
                }
            />
        </div>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

/**
 * LevelProgressPanel
 *
 * Full-width card showing the student's current level hero, XP progress bar
 * (animated on mount / first scroll-into-view), milestone dots, and a
 * motivational line. Handles the max-level state gracefully.
 */
export default function LevelProgressPanel({
    profile,
    levels,
    className,
}: LevelProgressPanelProps) {
    const prefersReducedMotion = useReducedMotion();
    const isMaxLevel = profile.nextLevel === null;
    const progress = clamp(profile.nextLevelProgress);

    const levelEmoji = profile.currentLevel?.badgeEmoji ?? 'medal';
    const levelName = profile.currentLevel?.name ?? `Level ${profile.currentLevelNumber}`;

    // Points display
    const current = profile.totalPoints;
    const next = profile.nextLevel?.minPoints ?? current;
    const prev = profile.currentLevel?.minPoints ?? 0;
    const pointsInLevel = current - prev;
    const levelSpan = next - prev;
    const xpToNext = Math.max(0, next - current);

    // Milestone dots
    const milestones = getMilestones(levels, profile.currentLevelNumber);

    return (
        <LazyMotion features={domAnimation}>
            <m.div
                variants={premiumEnterVariants}
                initial={prefersReducedMotion ? false : 'hidden'}
                animate="visible"
            >
                <Card
                    className={cn(
                        'border border-slate-200 bg-white dark:border-slate-700 dark:bg-[#112240]',
                        className,
                    )}
                >
                    <CardContent className="flex flex-col gap-5 p-5 sm:p-6">

                        {/* ── Hero row ── */}
                        <m.div
                            className="flex items-center gap-4"
                            variants={premiumCardVariants}
                        >
                            {/* Emoji bubble */}
                            <m.div
                                className={cn(
                                    'flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-3xl',
                                    isMaxLevel
                                        ? 'bg-violet-600/15 ring-1 ring-violet-500/40'
                                        : 'bg-slate-100 dark:bg-[#0B1E2D]',
                                )}
                                animate={
                                    prefersReducedMotion
                                        ? undefined
                                        : { scale: [1, 1.04, 1] }
                                }
                                transition={
                                    prefersReducedMotion
                                        ? undefined
                                        : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
                                }
                                aria-hidden="true"
                            >
                                {isMaxLevel ? <GamificationIcon name="crown" size={32} className="text-amber-500" /> : <GamificationIcon name={levelEmoji} size={32} className="text-amber-500" />}
                            </m.div>

                            {/* Level text */}
                            <div className="flex flex-col gap-0.5">
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Level {profile.currentLevelNumber}
                                    {isMaxLevel && (
                                        <span className="ml-1.5 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-semibold text-violet-400">
                                            Max Level
                                        </span>
                                    )}
                                </p>
                                <p className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                                    {levelName}
                                </p>
                            </div>
                        </m.div>

                        <div className="h-px w-full bg-slate-100 dark:bg-[#1E293B]" />

                        {/* ── Max-level banner ── */}
                        {isMaxLevel ? (
                            <m.div
                                className="flex items-start gap-3 rounded-xl bg-violet-500/10 p-4 ring-1 ring-violet-500/20"
                                initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.97 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={
                                    prefersReducedMotion
                                        ? undefined
                                        : { delay: 0.15, duration: premiumMotionDurations.standard }
                                }
                            >
                                <GamificationIcon name="trophy" size={24} className="text-amber-500" />
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        You have reached the highest level!
                                    </p>
                                    <LucideIcons.Medal className="h-4 w-4 text-emerald-500" />
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        You are among the top learners in this organization.
                                    </p>
                                </div>
                            </m.div>
                        ) : null}

                        {/* ── Progress section ── */}
                        <div className="flex flex-col gap-3">
                            {/* Label row */}
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-medium text-slate-700 dark:text-slate-200">
                                    {isMaxLevel
                                        ? `${current.toLocaleString()} XP earned`
                                        : `${pointsInLevel.toLocaleString()} / ${levelSpan.toLocaleString()} XP to next level`}
                                </span>
                                <span
                                    className={cn(
                                        'font-bold',
                                        isMaxLevel
                                            ? 'text-emerald-500'
                                            : 'text-amber-500 dark:text-[#FFD700]',
                                    )}
                                >
                                    {isMaxLevel ? '100%' : `${progress}%`}
                                </span>
                            </div>

                            {/* Animated progress bar */}
                            <AnimatedBar
                                value={isMaxLevel ? 100 : progress}
                                color={
                                    isMaxLevel
                                        ? 'bg-emerald-500'
                                        : 'bg-amber-500 dark:bg-[#FFD700]'
                                }
                                reduceMotion={prefersReducedMotion}
                            />

                            {/* Motivational copy */}
                            {!isMaxLevel && profile.nextLevel && (
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    <LucideIcons.Sparkles className="h-3 w-3 text-amber-500 inline" />{' '}
                                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                                        {xpToNext.toLocaleString()} more XP
                                    </span>{' '}
                                    to reach{' '}
                                    <span className="font-semibold text-amber-500 dark:text-[#FFD700]">
                                        {profile.nextLevel.name}
                                    </span>
                                </p>
                            )}
                        </div>

                        {/* ── Milestone dots ── */}
                        {milestones.length > 0 && (
                            <>
                                <div className="h-px w-full bg-slate-100 dark:bg-[#1E293B]" />

                                <div className="flex items-center justify-between">
                                    {milestones.map((level, i) => {
                                        const state =
                                            level.levelNumber < profile.currentLevelNumber
                                                ? 'past'
                                                : level.levelNumber === profile.currentLevelNumber
                                                  ? 'current'
                                                  : 'future';

                                        const isLast = i === milestones.length - 1;

                                        return (
                                            <div
                                                key={level.id}
                                                className={cn(
                                                    'flex flex-1 items-center',
                                                    isLast && 'justify-end',
                                                )}
                                            >
                                                <MilestoneDot
                                                    level={level}
                                                    state={state}
                                                    reduceMotion={prefersReducedMotion}
                                                    delay={i * 0.08}
                                                />
                                                {/* Connector line between dots */}
                                                {!isLast && (
                                                    <div
                                                        className={cn(
                                                            'mx-2 h-0.5 flex-1',
                                                            state === 'past'
                                                                ? 'bg-emerald-500/40'
                                                                : 'bg-slate-200 dark:bg-[#1E293B]',
                                                        )}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </m.div>
        </LazyMotion>
    );
}
