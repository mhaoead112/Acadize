import { db } from "../db/index.js";
import { studyStreaks } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * Record a login/activity and update streak (supports shields and comebacks)
 */
export async function recordLoginStreak(userId: string, orgId?: string): Promise<{ 
  extendedToday: boolean;
  shieldUsed: boolean;
  streakReset: boolean;
  comebackBonus: number;
}> {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  // Get or create streak record
  let [streak] = await db
    .select()
    .from(studyStreaks)
    .where(eq(studyStreaks.userId, userId))
    .limit(1);

  if (!streak) {
    // First login ever - create new streak record
    const [created] = await db.insert(studyStreaks).values({
      id: createId(),
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      totalActiveDays: 0,
      weeklyGoalHours: 10,
      currentWeekHours: 0,
    }).returning();
    streak = created;
  }

  const lastDate = streak.lastActivityDate
    ? new Date(Date.UTC(
        streak.lastActivityDate.getUTCFullYear(),
        streak.lastActivityDate.getUTCMonth(),
        streak.lastActivityDate.getUTCDate()
      ))
    : null;

  const gapDays = lastDate
    ? Math.floor((todayUTC.getTime() - lastDate.getTime()) / 86_400_000)
    : 999;

  let shieldUsed = false;
  let streakReset = false;
  let comebackBonus = 0;
  let newStreak = streak.currentStreak;
  let shields = streak.streakShields || 0;

  if (gapDays === 0) {
    // Already logged today — no-op
    return { extendedToday: false, shieldUsed: false, streakReset: false, comebackBonus: 0 };
  }

  if (gapDays === 1 || gapDays === 999) {
    // Consecutive day (or first time)
    newStreak = streak.currentStreak + 1;
  } else if (gapDays === 2 && shields > 0) {
    // Shield consumed
    shields = shields - 1;
    newStreak = streak.currentStreak + 1;
    shieldUsed = true;
  } else {
    // Streak broken
    streakReset = true;
    newStreak = 1;

    // Comeback bonus
    if (gapDays >= 15) comebackBonus = 300;
    else if (gapDays >= 8) comebackBonus = 200;
    else if (gapDays >= 4) comebackBonus = 100;
    else comebackBonus = 50;

    if (comebackBonus > 0 && orgId) {
      try {
        const { awardXp } = await import('./xp.service.js');
        await awardXp(userId, orgId, 'comeback_bonus', comebackBonus, `gap-${todayUTC.toISOString().slice(0,10)}`, 'streak');
      } catch (err) {
        console.error('Failed to award comeback XP:', err);
      }
    }
  }

  // Shield milestone: earn shield at multiples of 7
  let newShields = shields;
  if (newStreak % 7 === 0 && newStreak > 0) {
    const lastEarned = streak.lastShieldEarnedAt;
    const canEarn = !lastEarned || (todayUTC.getTime() - lastEarned.getTime() > 6 * 86_400_000);
    if (canEarn && newShields < 2) {
      newShields = newShields + 1;
      if (orgId) {
        try {
          const { awardXp } = await import('./xp.service.js');
          await awardXp(userId, orgId, 'streak_shield_earned', 0, `shield-${newStreak}`, 'streak');
        } catch (err) {}
      }
    }
  }

  // Streak milestone XP
  if (orgId) {
    try {
      const { awardXp } = await import('./xp.service.js');
      if (newStreak === 7)  await awardXp(userId, orgId, 'streak_milestone', 200, '7day', 'streak');
      if (newStreak === 30) await awardXp(userId, orgId, 'streak_milestone', 500, '30day', 'streak');
    } catch (err) {}
  }

  // Weekly streak update
  // Day of week: 0=Sun, 1=Mon. In JS getUTCDay() is same.
  const weeklyDays = (streak.weeklyActiveDays ?? 0) + 1;
  let weeklyStreak = streak.weeklyStreak ?? 0;
  
  // Reset weekly days on Monday?
  // Let's do a simple check: if last check was previous week.
  // Actually, PRD: "Reset weekly days on Monday" - a simple approach: if gap >= 7 or we crossed a Monday.
  const lastCheck = streak.lastWeeklyCheck;
  let weekChanged = false;
  if (!lastCheck) {
    weekChanged = true;
  } else {
    // If today's week number > last check's week number.
    // simpler: difference in days > 6 OR (today's day of week < last check's day of week AND today isn't Sunday unless last check was)
    // Actually, PRD uses:
    weekChanged = (todayUTC.getTime() - lastCheck.getTime() >= 7 * 86_400_000) || 
                  (todayUTC.getUTCDay() === 1 && lastCheck.getUTCDay() !== 1) || 
                  (todayUTC.getUTCDay() < lastCheck.getUTCDay() && lastCheck.getUTCDay() !== 0) ||
                  (todayUTC.getUTCDay() === 0 && lastCheck.getUTCDay() !== 0);
  }
  
  const weeklyActiveDays = weekChanged ? 1 : weeklyDays;
  if (weekChanged && (streak.weeklyActiveDays ?? 0) >= 3) {
    weeklyStreak = weeklyStreak + 1;
    if (orgId) {
      try {
        const { awardXp } = await import('./xp.service.js');
        await awardXp(userId, orgId, 'weekly_streak', 100, `week-${weeklyStreak}`, 'streak');
      } catch (err) {}
    }
  } else if (weekChanged && (streak.weeklyActiveDays ?? 0) < 3 && lastCheck) {
    // missed the weekly goal, reset weekly streak
    weeklyStreak = 0;
  }

  // Commit update
  await db.update(studyStreaks).set({
    currentStreak: newStreak,
    longestStreak: Math.max(streak.longestStreak, newStreak),
    lastActivityDate: todayUTC,
    totalActiveDays: (streak.totalActiveDays ?? 0) + 1,
    streakShields: newShields,
    weeklyStreak,
    weeklyActiveDays,
    lastWeeklyCheck: weekChanged ? todayUTC : streak.lastWeeklyCheck,
    lastShieldEarnedAt: newShields > shields ? todayUTC : streak.lastShieldEarnedAt,
    updatedAt: new Date(),
  }).where(eq(studyStreaks.userId, userId));

  return { 
    extendedToday: true,
    shieldUsed,
    streakReset,
    comebackBonus
  };
}



/**
 * Get user's streak information
 */
export async function getStreakInfo(userId: string) {
  const [streak] = await db
    .select()
    .from(studyStreaks)
    .where(eq(studyStreaks.userId, userId))
    .limit(1);

  if (!streak) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      totalActiveDays: 0,
      weeklyGoalHours: 10,
      currentWeekHours: 0,
      weeklyProgress: 0,
    };
  }

  const weeklyProgress = Math.min(
    100,
    streak.weeklyGoalHours > 0
      ? Math.round((streak.currentWeekHours / streak.weeklyGoalHours) * 100)
      : 0
  );

  return {
    currentStreak: streak.currentStreak,
    longestStreak: streak.longestStreak,
    lastActivityDate: streak.lastActivityDate,
    totalActiveDays: streak.totalActiveDays,
    weeklyGoalHours: streak.weeklyGoalHours,
    currentWeekHours: streak.currentWeekHours,
    weeklyProgress,
  };
}

/**
 * Update user's weekly goal
 */
export async function updateWeeklyGoal(userId: string, goalHours: number): Promise<void> {
  const [existing] = await db
    .select()
    .from(studyStreaks)
    .where(eq(studyStreaks.userId, userId))
    .limit(1);

  if (existing) {
    await db
      .update(studyStreaks)
      .set({
        weeklyGoalHours: goalHours,
        updatedAt: new Date(),
      })
      .where(eq(studyStreaks.userId, userId));
  } else {
    await db.insert(studyStreaks).values({
      id: createId(),
      userId,
      currentStreak: 0,
      longestStreak: 0,
      lastActivityDate: null,
      totalActiveDays: 0,
      weeklyGoalHours: goalHours,
      currentWeekHours: 0,
    });
  }
}
