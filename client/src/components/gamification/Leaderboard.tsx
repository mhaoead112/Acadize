import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { apiEndpoint } from '@/lib/config';
import { cn } from '@/lib/utils';
import { Flame } from 'lucide-react';
import { m, LazyMotion, domAnimation } from 'framer-motion';

// ---------------------------------------------------------------------------
// Tier config
// ---------------------------------------------------------------------------
const TIER_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  diamond:  { label: 'Diamond',  color: 'text-cyan-400',   emoji: '💎' },
  platinum: { label: 'Platinum', color: 'text-purple-400', emoji: '🏆' },
  gold:     { label: 'Gold',     color: 'text-yellow-500', emoji: '🥇' },
  silver:   { label: 'Silver',   color: 'text-slate-400',  emoji: '🥈' },
  bronze:   { label: 'Bronze',   color: 'text-orange-600', emoji: '🥉' },
};

// ---------------------------------------------------------------------------
// Row component
// ---------------------------------------------------------------------------
interface LeaderboardEntry {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  totalPoints: number;
  totalXp: number;
  xpThisWeek: number;
  currentStreak: number;
  currentLevelNumber: number;
  badgeCount: number;
  tier: string;
}

function LeaderboardRow({ entry, isMe, mode }: { entry: LeaderboardEntry; isMe: boolean; mode: string }) {
  const tier = TIER_CONFIG[entry.tier] ?? TIER_CONFIG.bronze;
  const displayValue = mode === 'streak'
    ? (
      <span className="flex items-center gap-1">
        {entry.currentStreak}d
        <m.span
          animate={{ 
            scale: [1, 1.15, 1],
            rotate: [-8, 8, -8],
            filter: ["drop-shadow(0 0 2px #f97316)", "drop-shadow(0 0 5px #ef4444)", "drop-shadow(0 0 2px #f97316)"]
          }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        >
          <Flame className="h-4 w-4 text-orange-500 fill-orange-500" />
        </m.span>
      </span>
    )
    : mode === 'weekly'
    ? `${(entry.xpThisWeek ?? 0).toLocaleString()} XP`
    : `${(entry.totalXp ?? entry.totalPoints ?? 0).toLocaleString()} XP`;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
      isMe
        ? 'bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 scale-[1.02] shadow-md'
        : 'bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700 hover:shadow-sm'
    )}>
      {/* Rank */}
      <span className="w-8 text-center font-black text-slate-500 dark:text-slate-400 text-sm">
        {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
      </span>

      {/* Avatar */}
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-sm font-bold flex-shrink-0 overflow-hidden">
        {entry.avatarUrl
          ? <img src={entry.avatarUrl} className="w-full h-full object-cover" alt={entry.fullName} />
          : entry.fullName.charAt(0).toUpperCase()}
      </div>

      {/* Name + tier */}
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-semibold truncate',
          isMe ? 'text-yellow-700 dark:text-yellow-300' : 'text-slate-800 dark:text-white'
        )}>
          {entry.fullName} {isMe && <span className="text-[10px] font-normal opacity-70">(You)</span>}
        </p>
        <p className={cn('text-xs', tier.color)}>{tier.emoji} {tier.label}</p>
      </div>

      {/* Value */}
      <div className="text-right">
        <p className="text-sm font-black text-slate-800 dark:text-white">{displayValue}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Separator dot
// ---------------------------------------------------------------------------
function Dots() {
  return <div className="text-center text-slate-400 text-xs py-0.5">• • •</div>;
}

// ---------------------------------------------------------------------------
// Main Leaderboard component
// ---------------------------------------------------------------------------
interface LeaderboardProps {
  courseId: string;
  currentUserId: string;
  className?: string;
}

export function Leaderboard({ courseId, currentUserId, className }: LeaderboardProps) {
  const { token } = useAuth();
  const [mode, setMode] = useState<'all_time' | 'weekly' | 'streak'>('weekly');

  const { data, isLoading } = useQuery<{
    entries: LeaderboardEntry[];
    nearMe: LeaderboardEntry[];
    userRank: number | null;
    mode: string;
    enabled: boolean;
  }>({
    queryKey: ['gamification', 'leaderboard', courseId, mode],
    queryFn: async () => {
      const res = await fetch(
        apiEndpoint(`/api/gamification/leaderboard?courseId=${courseId}&mode=${mode}`),
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, credentials: 'include' }
      );
      return res.json();
    },
    staleTime: 120_000,
    enabled: !!courseId,
  });

  const tabs = [
    { key: 'weekly' as const,   label: 'This Week' },
    { key: 'all_time' as const, label: 'All Time'  },
    { key: 'streak' as const,   label: 'Streaks'   },
  ];

  if (!data?.enabled) {
    return (
      <div className={cn('text-center py-8 text-slate-400 text-sm', className)}>
        Leaderboard is not enabled for this course.
      </div>
    );
  }

  const nearMe: LeaderboardEntry[] = data?.nearMe ?? [];

  return (
    <LazyMotion features={domAnimation}>
      <div className={cn('space-y-3', className)}>
        {/* Tab selector */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setMode(t.key)}
              className={cn(
                'flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all',
                mode === t.key
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Rank context */}
        {data?.userRank && (
          <p className="text-xs text-center text-slate-500 dark:text-slate-400">
            Your rank: <span className="font-bold text-slate-700 dark:text-slate-200">#{data.userRank}</span>
          </p>
        )}

        {/* Near-me entries */}
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-1.5">
            {nearMe.map((entry, i) => (
              <React.Fragment key={entry.userId}>
                {i > 0 && nearMe[i].rank > nearMe[i - 1].rank + 1 && <Dots />}
                <LeaderboardRow
                  entry={entry}
                  isMe={entry.userId === currentUserId}
                  mode={mode}
                />
              </React.Fragment>
            ))}
            {nearMe.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-4">No leaderboard data yet.</p>
            )}
          </div>
        )}
      </div>
    </LazyMotion>
  );
}
