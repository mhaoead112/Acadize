import { db } from "../db/index.js";
import { studyStreaks } from "../db/schema.js";
import { eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

/**
 * Record a login and update streak (login-only tracking)
 */
export async function recordLoginStreak(userId: string): Promise<void> {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // Normalize to start of day

  // Get or create streak record
  let [streak] = await db
    .select()
    .from(studyStreaks)
    .where(eq(studyStreaks.userId, userId))
    .limit(1);

  if (!streak) {
    // First login ever - create new streak record
    await db.insert(studyStreaks).values({
      id: createId(),
      userId,
      currentStreak: '1',
      longestStreak: '1',
      lastActivityDate: today,
      totalActiveDays: '1',
      weeklyGoalHours: '10',
      currentWeekHours: '0',
    });
    return;
  }

  // Check if already logged in today
  const lastDate = streak.lastActivityDate ? new Date(streak.lastActivityDate) : null;
  if (!lastDate) {
    // No last date, shouldn't happen but handle it
    await updateStreakRecord(userId, today, 1, 1, 1);
    return;
  }

  const lastDateNormalized = new Date(
    lastDate.getFullYear(),
    lastDate.getMonth(),
    lastDate.getDate()
  );

  // If already logged in today, don't update
  if (lastDateNormalized.getTime() === today.getTime()) {
    return;
  }

  // Calculate days since last login
  const daysSinceLastLogin = Math.floor(
    (today.getTime() - lastDateNormalized.getTime()) / (1000 * 60 * 60 * 24)
  );

  let newCurrentStreak = parseInt(streak.currentStreak);
  let newLongestStreak = parseInt(streak.longestStreak);
  let newTotalActiveDays = parseInt(streak.totalActiveDays) + 1;

  if (daysSinceLastLogin === 1) {
    // Consecutive day - increment streak
    newCurrentStreak += 1;
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
    }
  } else if (daysSinceLastLogin > 1) {
    // Streak broken - reset to 1
    newCurrentStreak = 1;
  }

  await updateStreakRecord(userId, today, newCurrentStreak, newLongestStreak, newTotalActiveDays);
}

/**
 * Update streak record in database
 */
async function updateStreakRecord(
  userId: string,
  activityDate: Date,
  currentStreak: number,
  longestStreak: number,
  totalActiveDays: number
): Promise<void> {
  await db
    .update(studyStreaks)
    .set({
      currentStreak: currentStreak.toString(),
      longestStreak: longestStreak.toString(),
      lastActivityDate: activityDate,
      totalActiveDays: totalActiveDays.toString(),
      updatedAt: new Date(),
    })
    .where(eq(studyStreaks.userId, userId));
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
    Math.round((parseFloat(streak.currentWeekHours) / parseFloat(streak.weeklyGoalHours)) * 100)
  );

  return {
    currentStreak: parseInt(streak.currentStreak),
    longestStreak: parseInt(streak.longestStreak),
    lastActivityDate: streak.lastActivityDate,
    totalActiveDays: parseInt(streak.totalActiveDays),
    weeklyGoalHours: parseFloat(streak.weeklyGoalHours),
    currentWeekHours: parseFloat(streak.currentWeekHours),
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
        weeklyGoalHours: goalHours.toString(),
        updatedAt: new Date(),
      })
      .where(eq(studyStreaks.userId, userId));
  } else {
    await db.insert(studyStreaks).values({
      id: createId(),
      userId,
      currentStreak: '0',
      longestStreak: '0',
      lastActivityDate: null,
      totalActiveDays: '0',
      weeklyGoalHours: goalHours.toString(),
      currentWeekHours: '0',
    });
  }
}
