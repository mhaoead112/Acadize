/**
 * Quest Service
 *
 * Handles:
 *  - assignDailyQuests  — idempotently assign 3 daily quests per user per day
 *  - assignWeeklyQuest  — idempotently assign 1 weekly quest per user per week
 *  - checkAndUpdateQuests — called after any student action; increments progress
 *                           and awards XP when a quest is completed
 */

import { db } from '../db/index.js';
import { questTemplates, userQuestProgress } from '../db/schema.js';
import { eq, and, gt } from 'drizzle-orm';
import { awardXp } from './xp.service.js';
import { createId } from '@paralleldrive/cuid2';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CompletedQuestInfo {
  questId: string;
  title: string;
  xpAwarded: number;
}

// ---------------------------------------------------------------------------
// Seeded shuffle — deterministic for (userId + date) so every student gets the
// same quests if they refresh, but a different set from other students.
// ---------------------------------------------------------------------------

function seededShuffle<T>(arr: T[], seed: string): T[] {
  const s = [...arr];
  let h = seed.split('').reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  for (let i = s.length - 1; i > 0; i--) {
    h = (Math.imul(h ^ (h >>> 16), 0x45d9f3b)) | 0;
    const j = Math.abs(h) % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  return s;
}

// ---------------------------------------------------------------------------
// Seed default templates for an organization if they don't exist.
// ---------------------------------------------------------------------------

async function seedDefaultTemplates(orgId: string): Promise<void> {
  const existing = await db
    .select({ id: questTemplates.id })
    .from(questTemplates)
    .where(eq(questTemplates.organizationId, orgId))
    .limit(1);

  if (existing.length > 0) return;

  console.log(`[Quest] Seeding default templates for organization ${orgId}`);

  const defaults = [
    { 
      title: 'First Steps', 
      description: 'Complete your first lesson today.', 
      questType: 'daily', 
      conditionType: 'lesson_complete', 
      conditionValue: 1, 
      xpReward: 50 
    },
    { 
      title: 'Knowledge Hunter', 
      description: 'Complete 3 lessons today.', 
      questType: 'daily', 
      conditionType: 'lesson_complete', 
      conditionValue: 3, 
      xpReward: 150 
    },
    { 
      title: 'Dedicated Learner', 
      description: 'Complete 5 lessons this week.', 
      questType: 'weekly', 
      conditionType: 'lesson_complete', 
      conditionValue: 5, 
      xpReward: 500 
    },
    { 
      title: 'Quiz Master', 
      description: 'Pass 2 quizzes with 80% or higher.', 
      questType: 'weekly', 
      conditionType: 'quiz_above_pct', 
      conditionValue: 2, 
      conditionMeta: { minScore: 80 },
      xpReward: 600 
    }
  ];

  for (const d of defaults) {
    await db.insert(questTemplates).values({
      id: createId(),
      organizationId: orgId,
      ...d,
      isActive: true,
    });
  }
}

// ---------------------------------------------------------------------------
// assignDailyQuests
// Assigns up to 3 daily quests to the user for today (UTC midnight → midnight).
// Idempotent — exits immediately if quests have already been assigned today.
// ---------------------------------------------------------------------------

export async function assignDailyQuests(userId: string, orgId: string): Promise<void> {
  // Ensure we have templates first
  await seedDefaultTemplates(orgId);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  // Idempotency check — bail if already assigned today
  const existing = await db
    .select({ id: userQuestProgress.id })
    .from(userQuestProgress)
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.organizationId, orgId),
        eq(userQuestProgress.questType, 'daily'),
        gt(userQuestProgress.expiresAt, today),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  // Pull all active daily templates for the org
  const templates = await db
    .select()
    .from(questTemplates)
    .where(
      and(
        eq(questTemplates.organizationId, orgId),
        eq(questTemplates.isActive, true),
        eq(questTemplates.questType, 'daily'),
      ),
    );

  if (templates.length === 0) return;

  // Pick 3 deterministically seeded by date + userId
  const seed = `${userId}-${today.toISOString().slice(0, 10)}`;
  const picked = seededShuffle(templates, seed).slice(0, 3);

  await db.insert(userQuestProgress).values(
    picked.map((t) => ({
      id: createId(),
      userId,
      organizationId: orgId,
      questTemplateId: t.id,
      questType: 'daily' as const,
      progress: 0,
      conditionValue: t.conditionValue,
      completed: false,
      expiresAt: tomorrow,
    })),
  );
}

// ---------------------------------------------------------------------------
// assignWeeklyQuest
// Assigns 1 weekly quest per user (resets each Monday 00:00 UTC).
// ---------------------------------------------------------------------------

export async function assignWeeklyQuest(userId: string, orgId: string): Promise<void> {
  const now = new Date();

  // Compute start of current week (Monday 00:00 UTC)
  const weekStart = new Date(now);
  const day = weekStart.getUTCDay(); // 0=Sun…6=Sat
  const daysToMonday = (day === 0 ? -6 : 1 - day);
  weekStart.setUTCDate(weekStart.getUTCDate() + daysToMonday);
  weekStart.setUTCHours(0, 0, 0, 0);

  // Expires next Monday
  const weekEnd = new Date(weekStart);
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);

  // Idempotency check
  const existing = await db
    .select({ id: userQuestProgress.id })
    .from(userQuestProgress)
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.organizationId, orgId),
        eq(userQuestProgress.questType, 'weekly'),
        gt(userQuestProgress.expiresAt, weekStart),
      ),
    )
    .limit(1);

  if (existing.length > 0) return;

  const templates = await db
    .select()
    .from(questTemplates)
    .where(
      and(
        eq(questTemplates.organizationId, orgId),
        eq(questTemplates.isActive, true),
        eq(questTemplates.questType, 'weekly'),
      ),
    );

  if (templates.length === 0) return;

  const seed = `${userId}-week-${weekStart.toISOString().slice(0, 10)}`;
  const picked = seededShuffle(templates, seed).slice(0, 1);

  await db.insert(userQuestProgress).values(
    picked.map((t) => ({
      id: createId(),
      userId,
      organizationId: orgId,
      questTemplateId: t.id,
      questType: 'weekly' as const,
      progress: 0,
      conditionValue: t.conditionValue,
      completed: false,
      expiresAt: weekEnd,
    })),
  );
}

// ---------------------------------------------------------------------------
// checkAndUpdateQuests
// Called after any student action. Finds matching active quests, increments
// progress, and awards XP when a quest completes.
//
// Returns a list of quests that were completed by this action (for UI toasts).
// ---------------------------------------------------------------------------

export async function checkAndUpdateQuests(
  userId: string,
  orgId: string,
  eventType: string,
  meta: Record<string, any> = {},
): Promise<CompletedQuestInfo[]> {
  const now = new Date();

  // All active (non-expired, non-completed) quests for this user
  const activeQuests = await db
    .select({
      uqp: userQuestProgress,
      template: questTemplates,
    })
    .from(userQuestProgress)
    .innerJoin(questTemplates, eq(userQuestProgress.questTemplateId, questTemplates.id))
    .where(
      and(
        eq(userQuestProgress.userId, userId),
        eq(userQuestProgress.organizationId, orgId),
        eq(userQuestProgress.completed, false),
        gt(userQuestProgress.expiresAt, now),
      ),
    );

  const completed: CompletedQuestInfo[] = [];

  for (const { uqp, template } of activeQuests) {
    console.log(`[Quest] Checking quest template ${template.id} (condition: ${template.conditionType}) against event ${eventType}`);
    if (template.conditionType !== eventType) continue;

    // Optional meta check (e.g. minScore for quiz_above_pct)
    const condMeta = (template.conditionMeta as Record<string, any>) ?? {};
    if (condMeta.minScore !== undefined && (meta.score ?? 0) < condMeta.minScore) {
      console.log(`[Quest] Meta check failed for quest ${template.id}: score ${meta.score} < minScore ${condMeta.minScore}`);
      continue;
    }

    const newProgress = Math.min(uqp.progress + 1, template.conditionValue);
    console.log(`[Quest] Incrementing progress for user ${userId} on quest ${uqp.id}: ${uqp.progress} -> ${newProgress} (target: ${template.conditionValue})`);
    const isComplete = newProgress >= template.conditionValue;

    await db
      .update(userQuestProgress)
      .set({
        progress: newProgress,
        completed: isComplete,
        completedAt: isComplete ? now : null,
        xpAwarded: isComplete ? template.xpReward : null,
      })
      .where(eq(userQuestProgress.id, uqp.id));

    if (isComplete) {
      // Fire-and-forget XP — errors are intentionally swallowed here since
      // the calling route already handles its own gamification try/catch.
      try {
        await awardXp(userId, orgId, 'quest_complete', template.xpReward, uqp.id, 'quest');
      } catch (err) {
        console.warn('[Quest] XP award failed for quest', uqp.id, err);
      }
      completed.push({
        questId: uqp.id,
        title: template.title,
        xpAwarded: template.xpReward,
      });
    }
  }

  return completed;
}
