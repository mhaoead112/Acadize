import { db } from '../db/index.js';
import { xpTransactions, userGamificationProfiles } from '../db/schema.js';
import { eq, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const LEVEL_THRESHOLDS = [0, 200, 500, 1000, 1800, 3000, 6000, 11000, 18000, 30000];

export function getLevelFromXp(xp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getXpToNextLevel(level: number): number {
  if (level >= 10) return 0; // max level
  return LEVEL_THRESHOLDS[level]; // next threshold
}

export async function awardXp(
  userId: string,
  orgId: string,
  reason: string,
  amount: number,
  sourceId?: string,
  sourceType?: string,
): Promise<{ xpGained: number; newTotal: number; leveledUp: boolean; newLevel: number }> {
  // 1. Deduplicate — skip if same (user, reason, sourceId) already recorded
  if (sourceId) {
    const existing = await db
      .select({ id: xpTransactions.id })
      .from(xpTransactions)
      .where(and(
        eq(xpTransactions.userId, userId),
        eq(xpTransactions.reason, reason),
        eq(xpTransactions.sourceId, sourceId),
      ))
      .limit(1);
    if (existing.length > 0) {
      // Already awarded — fetch current state and return
      const profile = await getOrCreateProfile(userId, orgId);
      return { xpGained: 0, newTotal: profile.totalXp, leveledUp: false, newLevel: profile.currentLevel };
    }
  }

  // 2. Insert transaction
  await db.insert(xpTransactions).values({
    id: createId(),
    userId,
    organizationId: orgId,
    amount,
    reason,
    sourceId: sourceId ?? null,
    sourceType: sourceType ?? null,
  });

  // 3. Atomic increment on profile
  const [updated] = await db
    .update(userGamificationProfiles)
    .set({
      totalXp: sql`${userGamificationProfiles.totalXp} + ${amount}`,
      xpThisWeek: sql`${userGamificationProfiles.xpThisWeek} + ${amount}`,
      totalPoints: sql`${userGamificationProfiles.totalPoints} + ${amount}`,
      updatedAt: new Date(),
    })
    .where(and(
      eq(userGamificationProfiles.userId, userId),
      eq(userGamificationProfiles.organizationId, orgId),
    ))
    .returning({ totalXp: userGamificationProfiles.totalXp, currentLevel: userGamificationProfiles.currentLevel });

  if (!updated) {
    // Profile doesn't exist yet — create it
    await db.insert(userGamificationProfiles).values({
      userId,
      organizationId: orgId,
      totalXp: amount,
      totalPoints: amount,
      currentLevel: 1,
    });
    return { xpGained: amount, newTotal: amount, leveledUp: false, newLevel: 1 };
  }

  // 4. Check level up
  const oldLevel = updated.currentLevel;
  const newLevel = getLevelFromXp(updated.totalXp);
  const leveledUp = newLevel > oldLevel;

  if (leveledUp) {
    await db
      .update(userGamificationProfiles)
      .set({ currentLevel: newLevel })
      .where(eq(userGamificationProfiles.userId, userId));
  }

  return { xpGained: amount, newTotal: updated.totalXp, leveledUp, newLevel };
}

async function getOrCreateProfile(userId: string, orgId: string) {
  const [existing] = await db
    .select()
    .from(userGamificationProfiles)
    .where(and(eq(userGamificationProfiles.userId, userId), eq(userGamificationProfiles.organizationId, orgId)));
  if (existing) return existing;
  await db.insert(userGamificationProfiles).values({ userId, organizationId: orgId });
  return { totalXp: 0, currentLevel: 1 };
}

export async function resetWeeklyXp() {
  await db
    .update(userGamificationProfiles)
    .set({
      xpThisWeek: 0,
      updatedAt: new Date(),
    });
}

