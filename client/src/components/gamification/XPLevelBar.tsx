import { useGamificationProfile } from '@/hooks/useGamification';

const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 1800, 3000, 6000, 11000, 18000, 30000];

export function XPLevelBar() {
  const { data: profile, isLoading } = useGamificationProfile();
  
  if (isLoading || !profile) return null;

  // Some responses include the current level as an object, while older code
  // expected a plain number. Normalize to a numeric level before rendering.
  const level =
    profile.currentLevel?.levelNumber ??
    profile.currentLevelNumber ??
    1;
  const xp = profile.totalXp ?? profile.totalPoints ?? 0;
  
  const currentFloor = LEVEL_THRESHOLDS[level - 1] ?? 0;
  // Handle max level case
  const nextCeiling = LEVEL_THRESHOLDS[level] ?? xp;
  
  const pct = level >= 10 ? 100 : Math.round(((xp - currentFloor) / Math.max(1, nextCeiling - currentFloor)) * 100);

  return (
    <div className="px-4 py-3 rounded-xl bg-white dark:bg-[#112240] border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 uppercase tracking-wider">
          Level {level}
        </span>
        <span className="text-xs text-slate-500 font-medium">{xp.toLocaleString()} XP</span>
      </div>
      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden relative">
        <div
          className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      {level < 10 && (
        <p className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">
          {(nextCeiling - xp).toLocaleString()} XP to Level {level + 1}
        </p>
      )}
    </div>
  );
}
