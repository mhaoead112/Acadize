/**
 * Gamification Core Service
 *
 * Central business logic for the Acadize gamification system.
 * Handles point awarding, level computation, badge evaluation,
 * leaderboard queries, and org settings.
 *
 * SAFETY CONTRACT:
 *   Every exported function is safe to call from existing service flows.
 *   Internal errors are caught, logged, and never re-thrown — the parent
 *   request will always complete successfully even if gamification fails.
 */

import { db, pool } from '../db/index.js';
import {
  gamificationSettings,
  gamificationPointRules,
  gamificationLevels,
  gamificationBadges,
  gamificationEvents,
  userGamificationProfiles,
  userBadges,
  userFeaturedBadges,
  users,
  enrollments,
  studyStreaks,
  dailyChallenges,
  userChallengeCompletions,
  userBuffs,
} from '../db/schema.js';
import {
  eq,
  and,
  desc,
  sql,
  count,
  inArray,
  gte,
  lte,
} from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Local type aliases (mirrors shared/gamification.types.ts for server use)
// ---------------------------------------------------------------------------

type GamificationSettings = {
  organizationId: string;
  enabled: boolean;
  pointsEnabled: boolean;
  levelsEnabled: boolean;
  badgesEnabled: boolean;
  leaderboardEnabled: boolean;
  levelNaming: string;
  pointNaming: string;
  createdAt: string;
  updatedAt: string | null;
};

type GamificationLevel = {
  id: string;
  organizationId: string;
  levelNumber: number;
  name: string;
  minPoints: number;
  maxPoints: number | null;
  badgeEmoji: string | null;
  createdAt: string;
};

type PointAwardResult = {
  awarded: boolean;
  pointsAwarded: number;
  newTotal: number;
  levelUp: boolean;
  newLevel: GamificationLevel | null;
};

type GamificationLeaderboardEntry = {
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
};

type UserBuff = {
  id: string;
  userId: string;
  buffType: 'xp_multiplier';
  buffValue: string;
  startsAt: string;
  expiresAt: string;
  sourceId: string | null;
};

type DailyChallengeProgress = {
  challenge: any | null;
  completed: boolean;
  completedAt: string | null;
  progress: number;
  remainingSeconds: number;
};

type GamificationMeResponse = {
  userId: string;
  organizationId: string;
  totalPoints: number;
  currentLevelNumber: number;
  currentLevel: GamificationLevel | null;
  nextLevel: GamificationLevel | null;
  nextLevelProgress: number;
  createdAt: string;
  updatedAt: string | null;
  recentBadges: any[];
  recentEvents: any[];
  activeBuffs: UserBuff[];
  dailyChallenge: DailyChallengeProgress | null;
};

// ---------------------------------------------------------------------------
// Default point values used when seeding a fresh org
// ---------------------------------------------------------------------------
const DEFAULT_POINT_RULES = [
  { eventType: 'lesson_complete',        points: 10  },
  { eventType: 'quiz_complete',          points: 25  },
  { eventType: 'exam_complete',          points: 50  },
  { eventType: 'assignment_submit',      points: 15  },
  { eventType: 'assignment_graded_pass', points: 20  },
  { eventType: 'course_complete',        points: 100 },
] as const;

let userGamificationProfileColumnsPromise: Promise<Set<string>> | null = null;

async function getUserGamificationProfileColumns(): Promise<Set<string>> {
  if (!userGamificationProfileColumnsPromise) {
    userGamificationProfileColumnsPromise = pool
      .query(
        `SELECT column_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'user_gamification_profiles'`,
      )
      .then((result) => new Set(result.rows.map((row) => String(row.column_name))));
  }

  return userGamificationProfileColumnsPromise;
}

function mapProfileRow(
  row: Record<string, unknown>,
  userId: string,
  organizationId: string,
): typeof userGamificationProfiles.$inferSelect {
  return {
    id: String(row.id ?? ''),
    userId,
    organizationId,
    totalPoints: Number(row.total_points ?? 0),
    totalXp: Number(row.total_xp ?? row.total_points ?? 0),
    currentLevel: Number(row.current_level ?? 1),
    xpThisWeek: Number(row.xp_this_week ?? 0),
    xpWeekResetAt: (row.xp_week_reset_at as Date | null) ?? null,
    currentLevelId: (row.current_level_id as string | null) ?? null,
    currentLevelNumber: Number(row.current_level_number ?? row.current_level ?? 0),
    createdAt: (row.created_at as Date) ?? new Date(),
    updatedAt: (row.updated_at as Date | null) ?? null,
  };
}

// ---------------------------------------------------------------------------
// 1. ensureProfile
// ---------------------------------------------------------------------------

/**
 * Gets or creates the gamification profile row for a (userId, organizationId) pair.
 * Will never throw — returns a safe default object on unexpected error.
 */
export async function ensureProfile(
  userId: string,
  organizationId: string,
): Promise<typeof userGamificationProfiles.$inferSelect> {
  try {
    const columns = await getUserGamificationProfileColumns();
    const selectColumns = [
      'id',
      'user_id',
      'organization_id',
      'total_points',
      'created_at',
      'updated_at',
      columns.has('total_xp') ? 'total_xp' : null,
      columns.has('current_level') ? 'current_level' : null,
      columns.has('xp_this_week') ? 'xp_this_week' : null,
      columns.has('xp_week_reset_at') ? 'xp_week_reset_at' : null,
      columns.has('current_level_id') ? 'current_level_id' : null,
      columns.has('current_level_number') ? 'current_level_number' : null,
    ].filter(Boolean).join(', ');

    const existingResult = await pool.query(
      `SELECT ${selectColumns}
         FROM user_gamification_profiles
        WHERE user_id = $1 AND organization_id = $2
        LIMIT 1`,
      [userId, organizationId],
    );

    if (existingResult.rows[0]) {
      return mapProfileRow(existingResult.rows[0], userId, organizationId);
    }

    await pool.query(
      `INSERT INTO user_gamification_profiles (id, user_id, organization_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id, organization_id) DO NOTHING`,
      [createId(), userId, organizationId],
    );

    const insertedResult = await pool.query(
      `SELECT ${selectColumns}
         FROM user_gamification_profiles
        WHERE user_id = $1 AND organization_id = $2
        LIMIT 1`,
      [userId, organizationId],
    );

    if (insertedResult.rows[0]) {
      return mapProfileRow(insertedResult.rows[0], userId, organizationId);
    }

    throw new Error('Profile row could not be fetched after insert attempt.');

    // Legacy Drizzle path retained below for reference; compatibility mode
    // should always return before reaching this branch.
    const [existing] = await db
      .select()
      .from(userGamificationProfiles)
      .where(
        and(
          eq(userGamificationProfiles.userId, userId),
          eq(userGamificationProfiles.organizationId, organizationId),
        ),
      )
      .limit(1);

    if (existing) return existing;

    // Create new profile
    const [created] = await db
      .insert(userGamificationProfiles)
      .values({
        userId,
        organizationId,
      })
      .onConflictDoNothing()
      .returning();

    if (created) return created;

    // Race condition: another request inserted first — fetch again
    const [raceResult] = await db
      .select()
      .from(userGamificationProfiles)
      .where(
        and(
          eq(userGamificationProfiles.userId, userId),
          eq(userGamificationProfiles.organizationId, organizationId),
        ),
      )
      .limit(1);

    return raceResult!;
  } catch (err) {
    logger.error('[Gamification] ensureProfile failed', {
      userId,
      organizationId,
      error: String(err),
    });
    // Return a safe in-memory stub so callers don't throw
    return {
      id: '',
      userId,
      organizationId,
      totalPoints: 0,
      totalXp: 0,
      currentLevel: 1,
      xpThisWeek: 0,
      xpWeekResetAt: null,
      currentLevelNumber: 0,
      currentLevelId: null,
      createdAt: new Date(),
      updatedAt: null,
    };
  }
}

// ---------------------------------------------------------------------------
// 2. awardPoints
// ---------------------------------------------------------------------------

/**
 * Awards points to a learner for a qualifying milestone event.
 *
 * Idempotency: a UNIQUE constraint on (userId, eventType, entityId) in
 * gamification_events guarantees that duplicate completions (retries, page
 * refreshes, queue re-delivery) are silently ignored.
 *
 * This function is fire-and-forget safe — callers in completion flows should
 * wrap it in try/catch but errors won't propagate upward regardless.
 */
export async function awardPoints(params: {
  userId: string;
  organizationId: string;
  eventType: string;
  entityId: string;
  entityType: string;
  metadata?: Record<string, unknown>;
}): Promise<PointAwardResult> {
  const { userId, organizationId, eventType, entityId, entityType, metadata } = params;

  const noOp: PointAwardResult = {
    awarded: false,
    pointsAwarded: 0,
    newTotal: 0,
    levelUp: false,
    newLevel: null,
  };

  try {
    // -- 1. Resolve current settings / points policy ----------------------
    const settings = await getOrgSettings(organizationId);

    // -- 2. Look up the point rule for this event type --------------------
    const [rule] = await db
      .select({ points: gamificationPointRules.points, isActive: gamificationPointRules.isActive })
      .from(gamificationPointRules)
      .where(
        and(
          eq(gamificationPointRules.organizationId, organizationId),
          eq(gamificationPointRules.eventType, eventType),
        ),
      )
      .limit(1);

    let pointsToAward =
      settings.enabled && settings.pointsEnabled && rule?.isActive
        ? (rule.points ?? 0)
        : 0;

    // Apply active multipliers (Sprint B)
    if (pointsToAward > 0) {
      try {
        const activeBuffs = await getActiveBuffs(userId, 'xp_multiplier');
        for (const buff of activeBuffs) {
          const multiplier = parseFloat(buff.buffValue);
          if (!isNaN(multiplier)) {
            pointsToAward = Math.round(pointsToAward * multiplier);
            logger.debug(`[Gamification] Applied multiplier ${multiplier} to award. New points: ${pointsToAward}`);
          }
        }
      } catch (buffErr) {
        logger.error('[Gamification] Failed to apply multipliers', { userId, error: String(buffErr) });
      }
    }

    // -- 3. Insert event (idempotent — ON CONFLICT DO NOTHING) ------------
    // Persist the milestone even when gamification is disabled so lesson
    // completion can survive refreshes and revisit sessions.
    // Using pool.query to work around Drizzle v0.39 strict insert type narrowing
    const eventId = createId();
    const insertResult = await pool.query(
      `INSERT INTO gamification_events
         (id, organization_id, user_id, event_type, entity_id, entity_type, points_awarded, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, event_type, entity_id) DO NOTHING
       RETURNING id`,
      [eventId, organizationId, userId, eventType, entityId, entityType, pointsToAward,
       metadata ? JSON.stringify(metadata) : null],
    );
    const inserted = insertResult.rows;

    // Conflict → duplicate event, nothing to do
    if (!inserted.length) {
      const profile = await ensureProfile(userId, organizationId);
      return { ...noOp, newTotal: profile.totalPoints };
    }

    if (pointsToAward <= 0) {
      const profile = await ensureProfile(userId, organizationId);
      logger.info('[Gamification] Event recorded without point award', {
        userId,
        organizationId,
        eventType,
        entityId,
        gamificationEnabled: settings.enabled,
        pointsEnabled: settings.pointsEnabled,
      });
      return {
        awarded: false,
        pointsAwarded: 0,
        newTotal: profile.totalPoints,
        levelUp: false,
        newLevel: null,
      };
    }

    // -- 4. Update the learner's running total (raw SQL for atomic increment) --
    const profile = await ensureProfile(userId, organizationId);

    const updateResult = await pool.query(
      `UPDATE user_gamification_profiles
         SET total_points = total_points + $1, updated_at = NOW()
       WHERE user_id = $2 AND organization_id = $3
       RETURNING total_points`,
      [pointsToAward, userId, organizationId],
    );

    const newTotal: number = updateResult.rows[0]?.total_points ?? profile.totalPoints + pointsToAward;

    // -- 5. Recompute level -----------------------------------------------
    const prevLevelNumber = profile.currentLevelNumber;
    const newLevel = await computeLevel(organizationId, newTotal);
    let levelUp = false;

    if (newLevel && newLevel.levelNumber !== prevLevelNumber) {
      levelUp = true;
      await pool.query(
        `UPDATE user_gamification_profiles
           SET current_level_id = $1, current_level_number = $2, updated_at = NOW()
         WHERE user_id = $3 AND organization_id = $4`,
        [newLevel.id, newLevel.levelNumber, userId, organizationId],
      );
      logger.info('[Gamification] Level up!', {
        userId,
        organizationId,
        newLevel: newLevel.levelNumber,
        levelName: newLevel.name,
      });
    }

    // -- 6. Check Daily Challenge Progress (Sprint B) ----------------------
    // We trigger this after the event is recorded so progress is calculated correctly.
    // Skip if the event itself was a challenge completion to avoid recursion.
    if (eventType !== 'challenge_completion') {
      try {
        await checkDailyChallengeProgress(userId, organizationId);
      } catch (chalErr) {
        logger.error('[Gamification] checkDailyChallengeProgress failed during awardPoints', { userId, error: String(chalErr) });
      }
    }

    logger.info('[Gamification] Points awarded', {
      userId,
      organizationId,
      eventType,
      entityId,
      pointsToAward,
      newTotal,
      levelUp,
    });

    return {
      awarded: true,
      pointsAwarded: pointsToAward,
      newTotal,
      levelUp,
      newLevel: levelUp && newLevel ? newLevel : null,
    };
  } catch (err) {
    logger.error('[Gamification] awardPoints failed', {
      ...params,
      error: String(err),
    });
    return noOp;
  }
}

// ---------------------------------------------------------------------------
// 3. computeLevel
// ---------------------------------------------------------------------------

/**
 * Returns the highest GamificationLevel whose minPoints threshold the learner
 * has reached. Returns null if no levels are configured or totalPoints is below
 * the first threshold.
 */
export async function computeLevel(
  organizationId: string,
  totalPoints: number,
): Promise<GamificationLevel | null> {
  try {
    const levels = await db
      .select()
      .from(gamificationLevels)
      .where(eq(gamificationLevels.organizationId, organizationId))
      .orderBy(desc(gamificationLevels.minPoints));

    for (const level of levels) {
      if (totalPoints >= level.minPoints) {
        return {
          id: level.id,
          organizationId: level.organizationId,
          levelNumber: level.levelNumber,
          name: level.name,
          minPoints: level.minPoints,
          maxPoints: level.maxPoints ?? null,
          badgeEmoji: level.badgeEmoji ?? null,
          createdAt: level.createdAt.toISOString(),
        };
      }
    }
    return null;
  } catch (err) {
    logger.error('[Gamification] computeLevel failed', {
      organizationId,
      totalPoints,
      error: String(err),
    });
    return null;
  }
}

// ---------------------------------------------------------------------------
// 4. evaluateBadges
// ---------------------------------------------------------------------------

/**
 * Checks all active badges for the org that are triggered by the given
 * eventType. For each badge whose criteria is now met and not yet awarded,
 * inserts a userBadges row and returns the newly awarded badges.
 *
 * Only badge criteriaType values that map to an event count are evaluated here
 * ('lesson_count', 'assignment_count', 'course_completion', 'first_action').
 * Other criteria types (e.g. 'exam_score', 'level_reached', 'streak') require
 * richer context and are evaluated separately in V1.
 */
export async function evaluateBadges(
  userId: string,
  organizationId: string,
  eventType: string,
): Promise<typeof gamificationBadges.$inferSelect[]> {
  try {
    // Check badges are enabled
    const settings = await getOrgSettings(organizationId);
    if (!settings.enabled || !settings.badgesEnabled) return [];

    // Map event types to relevant badge criteria types
    const criteriaTypesByEvent: Record<string, string[]> = {
      lesson_complete:      ['lesson_count', 'first_action'],
      assignment_submit:  ['assignment_count', 'first_action'],
      assignment_graded_pass: ['assignment_count'],
      exam_complete:        ['first_action'],
      course_complete:      ['course_completion', 'first_action'],
      quiz_complete:        ['first_action'],
    };

    const relevantCriteriaTypes = criteriaTypesByEvent[eventType] ?? ['first_action'];

    // Fetch active, non-archived badges for this org with relevant criteria
    const badges = await db
      .select()
      .from(gamificationBadges)
      .where(
        and(
          eq(gamificationBadges.organizationId, organizationId),
          eq(gamificationBadges.isActive, true),
          sql`${gamificationBadges.archivedAt} IS NULL`,
          inArray(gamificationBadges.criteriaType, relevantCriteriaTypes),
        ),
      );

    if (!badges.length) return [];

    // Fetch already-awarded badge IDs for this user to avoid double-awarding
    const existingAwards = await db
      .select({ badgeId: userBadges.badgeId })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.organizationId, organizationId),
        ),
      );

    const awardedBadgeIds = new Set(existingAwards.map((r) => r.badgeId));

    const newlyAwarded: typeof gamificationBadges.$inferSelect[] = [];

    for (const badge of badges) {
      // Skip already earned
      if (awardedBadgeIds.has(badge.id)) continue;

      // Evaluate criteria
      const metCriteria = await checkBadgeCriteria(userId, organizationId, badge, eventType);

      if (metCriteria) {
        try {
          await db
            .insert(userBadges)
            .values({
              organizationId,
              userId,
              badgeId: badge.id,
            })
            .onConflictDoNothing();

          newlyAwarded.push(badge);
          logger.info('[Gamification] Badge awarded', {
            userId,
            organizationId,
            badgeId: badge.id,
            badgeName: badge.name,
          });
        } catch (insertErr) {
          logger.error('[Gamification] Failed to insert badge award', {
            userId,
            badgeId: badge.id,
            error: String(insertErr),
          });
        }
      }
    }

    return newlyAwarded;
  } catch (err) {
    logger.error('[Gamification] evaluateBadges failed', {
      userId,
      organizationId,
      eventType,
      error: String(err),
    });
    return [];
  }
}

/**
 * Internal: checks whether a single badge's criteria has been met by the user.
 */
async function checkBadgeCriteria(
  userId: string,
  organizationId: string,
  badge: typeof gamificationBadges.$inferSelect,
  triggeringEventType: string,
): Promise<boolean> {
  const { criteriaType, criteriaValue } = badge;

  switch (criteriaType) {
    case 'first_action': {
      // Award on first occurrence of this event type ever
      const total = await countUserEvents(userId, organizationId, triggeringEventType);
      return total >= 1;
    }
    case 'lesson_count': {
      const total = await countUserEvents(userId, organizationId, 'lesson_complete');
      return total >= criteriaValue;
    }
    case 'assignment_count': {
      const total = await countUserEvents(userId, organizationId, 'assignment_submit');
      return total >= criteriaValue;
    }
    case 'course_completion': {
      const total = await countUserEvents(userId, organizationId, 'course_completion');
      return total >= criteriaValue;
    }
    // 'exam_score', 'level_reached', 'streak' — defer to V2 or context-specific callers
    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// 5. countUserEvents
// ---------------------------------------------------------------------------

/**
 * Returns the total number of gamification events of a given type recorded for
 * a user in an organization. Used by badge criteria evaluation.
 */
export async function countUserEvents(
  userId: string,
  organizationId: string,
  eventType: string,
): Promise<number> {
  try {
    const [result] = await db
      .select({ total: count() })
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.organizationId, organizationId),
          eq(gamificationEvents.eventType, eventType),
        ),
      );
    return Number(result?.total ?? 0);
  } catch (err) {
    logger.error('[Gamification] countUserEvents failed', {
      userId,
      organizationId,
      eventType,
      error: String(err),
    });
    return 0;
  }
}

// ---------------------------------------------------------------------------
// 6. getLearnerProfile
// ---------------------------------------------------------------------------

/**
 * Returns the full enriched gamification profile for a learner:
 * their profile row plus the 10 most recent events and 5 most recent badges.
 * Used by GET /api/gamification/me.
 */
export async function getLearnerProfile(
  userId: string,
  organizationId: string,
): Promise<GamificationMeResponse> {
  const fallback: GamificationMeResponse = {
    userId,
    organizationId,
    totalPoints: 0,
    currentLevelNumber: 0,
    currentLevel: null,
    nextLevel: null,
    nextLevelProgress: 0,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    recentBadges: [],
    recentEvents: [],
  };

  try {
    const profile = await ensureProfile(userId, organizationId);

    // Fetch current and next levels in one query
    const allLevels = await db
      .select()
      .from(gamificationLevels)
      .where(eq(gamificationLevels.organizationId, organizationId))
      .orderBy(gamificationLevels.minPoints);

    const currentLevel = allLevels
      .filter((l) => l.minPoints <= profile.totalPoints)
      .at(-1) ?? null;

    const nextLevel = currentLevel
      ? allLevels.find((l) => l.levelNumber === currentLevel.levelNumber + 1) ?? null
      : allLevels[0] ?? null;

    // Progress percentage toward next level
    let nextLevelProgress = 0;
    if (nextLevel) {
      const base = currentLevel?.minPoints ?? 0;
      const cap  = nextLevel.minPoints;
      const span = cap - base;
      if (span > 0) {
        nextLevelProgress = Math.min(
          100,
          Math.round(((profile.totalPoints - base) / span) * 100),
        );
      }
    } else {
      // At max level
      nextLevelProgress = 100;
    }

    // Recent events (last 10)
    const recentEventRows = await db
      .select()
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.organizationId, organizationId),
        ),
      )
      .orderBy(desc(gamificationEvents.occurredAt))
      .limit(10);

    // Recent earned badges (last 5) with badge details
    const recentBadgeRows = await db
      .select({
        id: gamificationBadges.id,
        organizationId: gamificationBadges.organizationId,
        name: gamificationBadges.name,
        description: gamificationBadges.description,
        emoji: gamificationBadges.emoji,
        criteriaType: gamificationBadges.criteriaType,
        criteriaValue: gamificationBadges.criteriaValue,
        courseId: gamificationBadges.courseId,
        isActive: gamificationBadges.isActive,
        archivedAt: gamificationBadges.archivedAt,
        createdAt: gamificationBadges.createdAt,
        updatedAt: gamificationBadges.updatedAt,
        awardedAt: userBadges.awardedAt,
        rarity: gamificationBadges.rarity,
        storyText: gamificationBadges.storyText,
      })
      .from(userBadges)
      .innerJoin(gamificationBadges, eq(userBadges.badgeId, gamificationBadges.id))
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.organizationId, organizationId),
        ),
      )
      .orderBy(desc(userBadges.awardedAt))
      .limit(5);

    // Featured badges (max 3)
    const featuredBadgeRows = await db
      .select({
        id: gamificationBadges.id,
        name: gamificationBadges.name,
        description: gamificationBadges.description,
        storyText: gamificationBadges.storyText,
        emoji: gamificationBadges.emoji,
        rarity: gamificationBadges.rarity,
        awardedAt: userBadges.awardedAt,
        displayOrder: userFeaturedBadges.displayOrder,
      })
      .from(userFeaturedBadges)
      .innerJoin(gamificationBadges, eq(userFeaturedBadges.badgeId, gamificationBadges.id))
      .innerJoin(userBadges, and(
        eq(userBadges.userId, userFeaturedBadges.userId),
        eq(userBadges.badgeId, userFeaturedBadges.badgeId)
      ))
      .where(
        and(
          eq(userFeaturedBadges.userId, userId),
        )
      )
      .orderBy(userFeaturedBadges.displayOrder)
      .limit(3);

    // Serialize dates to ISO strings for the API response
    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    return {
      userId: profile.userId,
      organizationId: profile.organizationId,
      totalPoints: profile.totalPoints,
      currentLevelNumber: profile.currentLevelNumber,
      currentLevel: currentLevel
        ? {
            ...currentLevel,
            createdAt: toISO(currentLevel.createdAt)!,
          }
        : null,
      nextLevel: nextLevel
        ? {
            ...nextLevel,
            createdAt: toISO(nextLevel.createdAt)!,
          }
        : null,
      nextLevelProgress,
      createdAt: toISO(profile.createdAt)!,
      updatedAt: toISO(profile.updatedAt),
      recentEvents: recentEventRows.map((e) => ({
        id: e.id,
        organizationId: e.organizationId,
        userId: e.userId,
        eventType: e.eventType as any,
        entityId: e.entityId,
        entityType: e.entityType,
        pointsAwarded: e.pointsAwarded,
        metadata: (e.metadata as Record<string, unknown>) ?? null,
        occurredAt: toISO(e.occurredAt)!,
      })),
      recentBadges: recentBadgeRows.map((b) => ({
        ...b,
        criteriaType: b.criteriaType as any,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
        awardedAt: toISO(b.awardedAt)!,
      })),
      featuredBadges: featuredBadgeRows.map((b) => ({
        ...b,
        awardedAt: toISO(b.awardedAt)!,
      })),
      activeBuffs: await getActiveBuffs(userId, 'xp_multiplier'),
      dailyChallenge: await checkDailyChallengeProgress(userId, organizationId),
    };
  } catch (err) {
    logger.error('[Gamification] getLearnerProfile failed', {
      userId,
      organizationId,
      error: String(err),
    });
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Tier helper
// ---------------------------------------------------------------------------
function getTier(xp: number): string {
  if (xp >= 30000) return 'diamond';
  if (xp >= 11000) return 'platinum';
  if (xp >= 3000)  return 'gold';
  if (xp >= 500)   return 'silver';
  return 'bronze';
}

/**
 * Returns a ranked list of learners for a specific course.
 * Supports mode: 'all_time' | 'weekly' | 'streak'
 * Returns an empty array if leaderboards are disabled for the org.
 */
export async function getLeaderboard(
  organizationId: string,
  courseId: string,
  limit = 200,
  mode: 'all_time' | 'weekly' | 'streak' = 'all_time',
): Promise<GamificationLeaderboardEntry[]> {
  try {
    const settings = await getOrgSettings(organizationId);
    if (!settings.enabled || !settings.leaderboardEnabled) return [];

    // Get enrolled student IDs for this course, scoped to org users
    const enrolledRows = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(users.organizationId, organizationId),
        ),
      );

    if (!enrolledRows.length) return [];

    const enrolledIds = enrolledRows.map((r) => r.studentId);

    // Determine ORDER BY column based on mode
    const orderCol = mode === 'weekly'
      ? userGamificationProfiles.xpThisWeek
      : mode === 'streak'
      ? studyStreaks.currentStreak
      : userGamificationProfiles.totalXp;

    // Fetch profiles with streak data
    const rows = await db
      .select({
        userId: userGamificationProfiles.userId,
        totalPoints: userGamificationProfiles.totalPoints,
        totalXp: userGamificationProfiles.totalXp,
        xpThisWeek: userGamificationProfiles.xpThisWeek,
        currentLevelNumber: userGamificationProfiles.currentLevelNumber,
        fullName: users.fullName,
        avatarUrl: users.profilePicture,
        currentStreak: studyStreaks.currentStreak,
      })
      .from(userGamificationProfiles)
      .innerJoin(users, eq(userGamificationProfiles.userId, users.id))
      .leftJoin(studyStreaks, eq(studyStreaks.userId, userGamificationProfiles.userId))
      .where(
        and(
          eq(userGamificationProfiles.organizationId, organizationId),
          enrolledIds.length > 0
            ? inArray(userGamificationProfiles.userId, enrolledIds)
            : sql`false`,
        ),
      )
      .orderBy(desc(orderCol))
      .limit(limit);

    // Count badges per user in a single query
    const badgeCounts = await db
      .select({
        userId: userBadges.userId,
        badgeCount: count(),
      })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.organizationId, organizationId),
          enrolledIds.length > 0
            ? inArray(userBadges.userId, enrolledIds)
            : sql`false`,
        ),
      )
      .groupBy(userBadges.userId);

    const badgeCountMap = new Map(badgeCounts.map((r) => [r.userId, Number(r.badgeCount)]));

    return rows.map((row, idx) => ({
      rank: idx + 1,
      userId: row.userId,
      fullName: row.fullName,
      avatarUrl: row.avatarUrl ?? null,
      totalPoints: row.totalPoints,
      totalXp: row.totalXp ?? 0,
      xpThisWeek: row.xpThisWeek ?? 0,
      currentStreak: row.currentStreak ?? 0,
      currentLevelNumber: row.currentLevelNumber,
      badgeCount: badgeCountMap.get(row.userId) ?? 0,
      tier: getTier(row.totalXp ?? 0),
    }));
  } catch (err) {
    logger.error('[Gamification] getLeaderboard failed', {
      organizationId,
      courseId,
      error: String(err),
    });
    return [];
  }
}


// ---------------------------------------------------------------------------
// 8. getOrgSettings
// ---------------------------------------------------------------------------

/** Default settings returned when the org hasn't configured gamification yet. */
const DEFAULT_SETTINGS: GamificationSettings = {
  organizationId: '',
  enabled: false,
  pointsEnabled: true,
  levelsEnabled: true,
  badgesEnabled: true,
  leaderboardEnabled: false,
  levelNaming: 'Level',
  pointNaming: 'XP',
  createdAt: new Date().toISOString(),
  updatedAt: null,
};

/**
 * Returns gamification settings for an organization.
 * Falls back to sensible defaults if no row exists yet, so callers never get null.
 */
export async function getOrgSettings(organizationId: string): Promise<GamificationSettings> {
  try {
    const [row] = await db
      .select()
      .from(gamificationSettings)
      .where(eq(gamificationSettings.organizationId, organizationId))
      .limit(1);

    if (!row) return { ...DEFAULT_SETTINGS, organizationId };

    return {
      organizationId: row.organizationId,
      enabled: row.enabled,
      pointsEnabled: row.pointsEnabled,
      levelsEnabled: row.levelsEnabled,
      badgesEnabled: row.badgesEnabled,
      leaderboardEnabled: row.leaderboardEnabled,
      levelNaming: row.levelNaming,
      pointNaming: row.pointNaming,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString() ?? null,
    };
  } catch (err) {
    logger.error('[Gamification] getOrgSettings failed', {
      organizationId,
      error: String(err),
    });
    return { ...DEFAULT_SETTINGS, organizationId };
  }
}

// ---------------------------------------------------------------------------
// 9. ensureDefaultRules
// ---------------------------------------------------------------------------

/**
 * Seeds the 6 default milestone point rules for an organization, but only if
 * no rules have been configured yet. Called when an admin first enables
 * gamification for their org via PUT /api/admin/gamification/settings.
 */
export async function ensureDefaultRules(organizationId: string): Promise<void> {
  try {
    const [existing] = await db
      .select({ count: count() })
      .from(gamificationPointRules)
      .where(eq(gamificationPointRules.organizationId, organizationId));

    if (Number(existing?.count ?? 0) > 0) {
      logger.debug('[Gamification] ensureDefaultRules: rules already exist, skipping', {
        organizationId,
      });
      return;
    }

    await db
      .insert(gamificationPointRules)
      .values(
        DEFAULT_POINT_RULES.map((rule) => ({
          id: createId(),
          organizationId,
          eventType: rule.eventType,
          points: rule.points,
          isActive: true,
        })),
      )
      .onConflictDoNothing();

    logger.info('[Gamification] ensureDefaultRules: seeded default rules', { organizationId });
  } catch (err) {
    logger.error('[Gamification] ensureDefaultRules failed', {
      organizationId,
      error: String(err),
    });
  }
}

/**
 * Toggles a badge's featured status on the user's profile.
 * Limit of 3 featured badges per user.
 */
export async function toggleBadgeFeatured(userId: string, badgeId: string): Promise<{ featured: boolean }> {
  try {
    // 1. Check if badge is earned
    const [earned] = await db
      .select()
      .from(userBadges)
      .where(and(eq(userBadges.userId, userId), eq(userBadges.badgeId, badgeId)));

    if (!earned) {
      throw new Error("Cannot feature a badge you haven't earned yet.");
    }

    // 2. Check if already featured
    const [existing] = await db
      .select()
      .from(userFeaturedBadges)
      .where(and(eq(userFeaturedBadges.userId, userId), eq(userFeaturedBadges.badgeId, badgeId)));

    if (existing) {
      // Remove it
      await db
        .delete(userFeaturedBadges)
        .where(and(eq(userFeaturedBadges.userId, userId), eq(userFeaturedBadges.badgeId, badgeId)));
      return { featured: false };
    } else {
      // Add it - check limit first
      const featured = await db
        .select()
        .from(userFeaturedBadges)
        .where(eq(userFeaturedBadges.userId, userId));

      if (featured.length >= 3) {
        throw new Error("You can only feature up to 3 badges on your profile.");
      }

      await db.insert(userFeaturedBadges).values({
        userId,
        badgeId,
        displayOrder: featured.length,
      });
      return { featured: true };
    }
  } catch (err) {
    console.error('[toggleBadgeFeatured]', err);
    throw err;
  }
}

/**
 * Returns all active buffs of a specific type for a user.
 * (Sprint B: Used for XP multipliers)
 */
export async function getActiveBuffs(userId: string, buffType: string): Promise<UserBuff[]> {
  try {
    const rows = await db
      .select()
      .from(userBuffs)
      .where(
        and(
          eq(userBuffs.userId, userId),
          eq(userBuffs.buffType, buffType),
          gte(userBuffs.expiresAt, new Date())
        )
      );

    return rows.map(r => ({
      id: r.id,
      userId: r.userId,
      buffType: r.buffType as 'xp_multiplier',
      buffValue: r.buffValue,
      startsAt: r.startsAt.toISOString(),
      expiresAt: r.expiresAt.toISOString(),
      sourceId: r.sourceId
    }));
  } catch (err) {
    logger.error('[Gamification] getActiveBuffs failed', { userId, buffType, error: String(err) });
    return [];
  }
}

/**
 * Ensures a daily challenge exists for the given organization and date.
 * If not, creates one from a random selection of templates or defaults.
 */
export async function ensureDailyChallengeExists(organizationId: string, dateStr: string): Promise<any> {
  try {
    const [existing] = await db
      .select()
      .from(dailyChallenges)
      .where(
        and(
          eq(dailyChallenges.organizationId, organizationId),
          eq(dailyChallenges.date, dateStr)
        )
      )
      .limit(1);

    if (existing) return existing;

    // Create a new one
    // In a real app, you'd pick from templates. Here we'll generate one.
    const challenges = [
      { title: 'Morning Sprint', description: 'Complete 3 lessons today', type: 'lesson_completion', val: 3 },
      { title: 'Quiz Master', description: 'Complete 2 quizzes today', type: 'quiz_completion', val: 2 },
      { title: 'Active Learner', description: 'Submit 2 assignments today', type: 'assignment_submission', val: 2 },
    ];
    
    const template = challenges[Math.floor(Math.random() * challenges.length)];
    
    const [created] = await db
      .insert(dailyChallenges)
      .values({
        id: createId(),
        organizationId,
        date: dateStr,
        title: template.title,
        description: template.description,
        conditionType: template.type,
        conditionValue: template.val,
        xpReward: 50,
        buffType: 'xp_multiplier',
        buffValue: '2',
        buffDurationMinutes: 60
      })
      .returning();

    return created;
  } catch (err) {
    logger.error('[Gamification] ensureDailyChallengeExists failed', { organizationId, dateStr, error: String(err) });
    return null;
  }
}

/**
 * Checks progress for the daily challenge and grants rewards if completed.
 * (Sprint B)
 */
export async function checkDailyChallengeProgress(userId: string, organizationId: string): Promise<DailyChallengeProgress | null> {
  try {
    const today = new Date().toISOString().split('T')[0];
    const challenge = await ensureDailyChallengeExists(organizationId, today);
    if (!challenge) return null;

    // Check completion
    const [completion] = await db
      .select()
      .from(userChallengeCompletions)
      .where(
        and(
          eq(userChallengeCompletions.userId, userId),
          eq(userChallengeCompletions.challengeId, challenge.id)
        )
      )
      .limit(1);

    // Get progress (count events of specific type today)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [progressResult] = await db
      .select({ count: count() })
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.eventType, challenge.conditionType),
          gte(gamificationEvents.occurredAt, todayStart)
        )
      );

    const progressCount = Number(progressResult?.count ?? 0);
    const isJustCompleted = !completion && progressCount >= challenge.conditionValue;

    // If just completed, record it and award buff
    if (isJustCompleted) {
      await db
        .insert(userChallengeCompletions)
        .values({
          id: createId(),
          userId,
          challengeId: challenge.id
        })
        .onConflictDoNothing();

      // Award XP Reward (the XP itself doesn't get multiplied as it's a completion reward)
      await awardPoints({
        userId,
        organizationId,
        eventType: 'challenge_completion',
        entityId: challenge.id,
        entityType: 'daily_challenge',
        metadata: { challengeTitle: challenge.title }
      });

      // Award Buff (Multiplier)
      if (challenge.buffType === 'xp_multiplier') {
        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + (challenge.buffDurationMinutes ?? 60));
        
        await db
          .insert(userBuffs)
          .values({
            id: createId(),
            userId,
            buffType: 'xp_multiplier',
            buffValue: challenge.buffValue,
            expiresAt,
            sourceId: challenge.id
          });
        
        logger.info('[Gamification] Awarded XP multiplier buff', { userId, multiplier: challenge.buffValue });
      }
    }

    // Seconds until end of day
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const remainingSeconds = Math.max(0, Math.floor((endOfDay.getTime() - Date.now()) / 1000));

    return {
      challenge: {
        id: challenge.id,
        organizationId: challenge.organizationId,
        date: challenge.date,
        title: challenge.title,
        description: challenge.description,
        conditionType: challenge.conditionType,
        conditionValue: challenge.conditionValue,
        xpReward: challenge.xpReward,
        buffType: challenge.buffType,
        buffValue: challenge.buffValue,
        buffDurationMinutes: challenge.buffDurationMinutes,
        createdAt: challenge.createdAt.toISOString()
      },
      completed: !!(completion || isJustCompleted),
      completedAt: completion?.completedAt?.toISOString() ?? (isJustCompleted ? new Date().toISOString() : null),
      progress: progressCount,
      remainingSeconds
    };
  } catch (err) {
    logger.error('[Gamification] checkDailyChallengeProgress failed', { userId, organizationId, error: String(err) });
    return null;
  }
}

