import React from 'react';
import { Flame, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StreakCardProps {
  currentStreak: number;
  shields: number;
  longestStreak: number;
  weeklyStreak: number;
  shieldUsed?: boolean;
}

export function StreakCard({ currentStreak, shields, longestStreak, weeklyStreak, shieldUsed }: StreakCardProps) {
  return (
    <div className="p-4 rounded-xl bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 border border-orange-200 dark:border-orange-800">
      <div className="flex items-center justify-between mb-3">
        {/* Flame + streak count */}
        <div className="flex items-center gap-3">
          {/* Animated flame icon */}
          <div className="relative flex items-center justify-center">
            {/* Outer glow */}
            <span className="absolute inset-0 rounded-full bg-orange-400/20 dark:bg-orange-500/20 animate-ping" style={{ animationDuration: '2s' }} />
            {/* Inner core */}
            <span
              className={cn(
                "relative flex items-center justify-center w-10 h-10 rounded-full",
                "bg-gradient-to-b from-yellow-300 via-orange-400 to-red-500",
                "shadow-[0_0_14px_4px_rgba(251,146,60,0.5)]",
                "dark:shadow-[0_0_18px_6px_rgba(251,146,60,0.4)]"
              )}
              style={{ animation: 'flicker 1.5s ease-in-out infinite alternate' }}
            >
              <Flame
                className="h-5 w-5 text-white drop-shadow"
                strokeWidth={2.5}
                style={{ animation: 'flickerIcon 1.8s ease-in-out infinite alternate' }}
              />
            </span>
          </div>

          <div>
            <p className="text-2xl font-black text-orange-600 dark:text-orange-400 leading-none tabular-nums">
              {currentStreak}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">day streak</p>
          </div>
        </div>

        {/* Shield indicators */}
        <div className="flex gap-1.5">
          {[0, 1].map(i => (
            <div
              key={i}
              className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-300",
                i < shields
                  ? [
                      "bg-blue-100 dark:bg-blue-900/60",
                      "border-2 border-blue-400 dark:border-blue-500",
                      "shadow-[0_0_8px_2px_rgba(96,165,250,0.3)]",
                    ].join(' ')
                  : "bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 opacity-35"
              )}
            >
              <Shield
                className={cn(
                  "h-4 w-4",
                  i < shields ? "text-blue-500 dark:text-blue-400" : "text-slate-400"
                )}
                strokeWidth={2.5}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400 mt-1">
        <span>Best: <span className="font-bold text-slate-700 dark:text-slate-200">{longestStreak}d</span></span>
        <span>·</span>
        <span>Weekly: <span className="font-bold text-slate-700 dark:text-slate-200">{weeklyStreak}w</span></span>
        <span>·</span>
        <span>Shields: <span className="font-bold text-blue-500">{shields}/2</span></span>
      </div>

      {/* Shield used banner */}
      {shieldUsed && (
        <div className="mt-2.5 flex items-center gap-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-blue-700">
          <Shield className="h-3.5 w-3.5 shrink-0" />
          Shield protected your streak!
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes flicker {
          0%   { transform: scale(1) rotate(-1deg); box-shadow: 0 0 14px 4px rgba(251,146,60,0.5); }
          33%  { transform: scale(1.04) rotate(1deg); box-shadow: 0 0 20px 6px rgba(239,68,68,0.4); }
          66%  { transform: scale(0.98) rotate(0deg); box-shadow: 0 0 10px 3px rgba(251,146,60,0.6); }
          100% { transform: scale(1.02) rotate(-0.5deg); box-shadow: 0 0 16px 5px rgba(234,88,12,0.45); }
        }
        @keyframes flickerIcon {
          0%   { transform: scaleY(1) scaleX(1); }
          40%  { transform: scaleY(1.06) scaleX(0.97); }
          70%  { transform: scaleY(0.97) scaleX(1.02); }
          100% { transform: scaleY(1.03) scaleX(0.98); }
        }
      `}</style>
    </div>
  );
}
