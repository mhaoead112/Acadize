/**
 * Gamification Report Service
 *
 * Analytics queries for the admin reporting dashboard.
 * Kept separate from gamification.service.ts to maintain a clear single-
 * responsibility boundary: the core service mutates state; this service
 * is read-only.
 *
 * SAFETY CONTRACT:
 *   Every exported function is safe to call from route handlers.
 *   Errors are caught, logged, and return empty/default values — they never
 *   propagate to the caller.
 *
 * NOTE on query strategy:
 *   Aggregate queries (SUM, COUNT with GROUP BY, DATE_TRUNC) use pool.query
 *   raw SQL to avoid Drizzle v0.39 strict-type limitations with sql`` templates.
 *   Simple selects use the Drizzle ORM fluent API.
 */

import { db, pool } from '../db/index.js';
import {
  gamificationEvents,
  userGamificationProfiles,
  userBadges,
  gamificationLevels,
  enrollments,
  courses,
  users,
} from '../db/schema.js';
import { eq, and, desc, sql, count, sum } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// ---------------------------------------------------------------------------
// Local type aliases (mirrors shared/gamification.types.ts)
// ---------------------------------------------------------------------------

type GamificationReportSummary = {
  totalPointsAwarded: number;
  totalBadgesIssued: number;
  activeLearnersCount: number;
  levelDistribution: { levelNumber: number; levelName: string; count: number }[];
  topEarners: { userId: string; fullName: string; totalPoints: number }[];
  badgeIssuanceTrend: { date: string; count: number }[];
  courseComparison: {
    courseId: string;
    courseTitle: string;
    totalPointsEarned: number;
    enrolledCount: number;
  }[];
};

type ReportFilters = {
  courseId?: string;
  startDate?: Date;
  endDate?: Date;
};

// ---------------------------------------------------------------------------
// 1. getReportSummary
// ---------------------------------------------------------------------------

/**
 * Returns a full analytics summary for the admin dashboard.
 * Accepts optional filters for course scope and date range.
 * All sub-queries are independently caught so a partial failure still
 * returns the successfully computed metrics.
 */
export async function getReportSummary(
  organizationId: string,
  filters: ReportFilters = {},
): Promise<GamificationReportSummary> {
  const { courseId, startDate, endDate } = filters;

  const [
    totalPointsAwarded,
    totalBadgesIssued,
    activeLearnersCount,
    levelDistribution,
    topEarners,
    badgeIssuanceTrend,
    courseComparison,
  ] = await Promise.all([
    safeQuery(() => queryTotalPointsAwarded(organizationId, courseId, startDate, endDate), 0),
    safeQuery(() => queryTotalBadgesIssued(organizationId, startDate, endDate), 0),
    safeQuery(() => queryActiveLearnersCount(organizationId, courseId, startDate, endDate), 0),
    safeQuery(() => getLevelDistribution(organizationId), []),
    safeQuery(() => getTopEarners(organizationId, 5), []),
    safeQuery(() => getBadgeIssuanceTrend(organizationId, 30), []),
    safeQuery(() => getCourseComparisonStats(organizationId), []),
  ]);

  return {
    totalPointsAwarded,
    totalBadgesIssued,
    activeLearnersCount,
    levelDistribution,
    topEarners,
    badgeIssuanceTrend,
    courseComparison,
  };
}

// ---------------------------------------------------------------------------
// 2. getTopEarners
// ---------------------------------------------------------------------------

/**
 * Returns the top N learners by total XP within the organization.
 * Joins userGamificationProfiles with users for display names.
 */
export async function getTopEarners(
  organizationId: string,
  limit = 10,
): Promise<{ userId: string; fullName: string; totalPoints: number }[]> {
  try {
    const rows = await db
      .select({
        userId: userGamificationProfiles.userId,
        fullName: users.fullName,
        totalPoints: userGamificationProfiles.totalPoints,
      })
      .from(userGamificationProfiles)
      .innerJoin(users, eq(userGamificationProfiles.userId, users.id))
      .where(eq(userGamificationProfiles.organizationId, organizationId))
      .orderBy(desc(userGamificationProfiles.totalPoints))
      .limit(limit);

    return rows.map((r) => ({
      userId: r.userId,
      fullName: r.fullName,
      totalPoints: r.totalPoints,
    }));
  } catch (err) {
    logger.error('[GamificationReport] getTopEarners failed', {
      organizationId,
      error: String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// 3. getBadgeIssuanceTrend
// ---------------------------------------------------------------------------

/**
 * Returns daily badge award counts for the last N days, ordered oldest-first.
 * Dates with zero awards are included for a consistent time-series.
 * Uses DATE_TRUNC for database-level grouping.
 */
export async function getBadgeIssuanceTrend(
  organizationId: string,
  days = 30,
): Promise<{ date: string; count: number }[]> {
  try {
    // Generate a complete date series and LEFT JOIN against actual badge data
    // so zero-count days appear explicitly in the result.
    const result = await pool.query<{ date: string; count: string }>(
      `SELECT
         gs.day::date::text AS date,
         COALESCE(b.cnt, 0)::int AS count
       FROM generate_series(
         (NOW() - ($1::int || ' days')::interval)::date,
         NOW()::date,
         '1 day'::interval
       ) AS gs(day)
       LEFT JOIN (
         SELECT
           DATE_TRUNC('day', awarded_at)::date AS award_day,
           COUNT(*)::int AS cnt
         FROM user_badges
         WHERE organization_id = $2
           AND awarded_at >= NOW() - ($1::int || ' days')::interval
         GROUP BY award_day
       ) b ON b.award_day = gs.day::date
       ORDER BY gs.day ASC`,
      [days, organizationId],
    );

    return result.rows.map((r) => ({
      date: r.date,
      count: Number(r.count),
    }));
  } catch (err) {
    logger.error('[GamificationReport] getBadgeIssuanceTrend failed', {
      organizationId,
      days,
      error: String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// 4. getLevelDistribution
// ---------------------------------------------------------------------------

/**
 * Returns how many learners are currently at each level in the organization.
 * Levels with zero learners are included (LEFT JOIN) for completeness.
 */
export async function getLevelDistribution(
  organizationId: string,
): Promise<{ levelNumber: number; levelName: string; count: number }[]> {
  try {
    const result = await pool.query<{
      level_number: string;
      level_name: string;
      count: string;
    }>(
      `SELECT
         gl.level_number,
         gl.name AS level_name,
         COUNT(ugp.user_id)::int AS count
       FROM gamification_levels gl
       LEFT JOIN user_gamification_profiles ugp
         ON ugp.current_level_number = gl.level_number
        AND ugp.organization_id     = gl.organization_id
       WHERE gl.organization_id = $1
       GROUP BY gl.level_number, gl.name
       ORDER BY gl.level_number ASC`,
      [organizationId],
    );

    return result.rows.map((r) => ({
      levelNumber: Number(r.level_number),
      levelName: r.level_name,
      count: Number(r.count),
    }));
  } catch (err) {
    logger.error('[GamificationReport] getLevelDistribution failed', {
      organizationId,
      error: String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// 5. getCourseComparisonStats
// ---------------------------------------------------------------------------

/**
 * Compares engagement across all published courses in the organization:
 * total XP earned via events in each course, and the number of enrolled students.
 * Uses gamification_events.entity_id = course ID for course_completion events,
 * plus counts all events whose entity is an entity within that course.
 *
 * Implementation strategy:
 *   - Enrolled count: simple COUNT from enrollments per course.
 *   - Points earned: SUM of gamification_events.points_awarded WHERE
 *     entity_type IS relevant AND entity_id maps to the course.
 *     Since events only store entity_id (lesson/assignment/exam/course ID),
 *     we join through a CASE approach: course_completion events carry the
 *     courseId directly as entity_id. For a broader total we also count all
 *     events where the user is enrolled in that course.
 */
export async function getCourseComparisonStats(
  organizationId: string,
): Promise<{
  courseId: string;
  courseTitle: string;
  totalPointsEarned: number;
  enrolledCount: number;
}[]> {
  try {
    const result = await pool.query<{
      course_id: string;
      course_title: string;
      total_points_earned: string;
      enrolled_count: string;
    }>(
      `SELECT
         c.id              AS course_id,
         c.title           AS course_title,
         -- Total points earned by enrolled students within this org
         COALESCE(SUM(ge.points_awarded), 0)::bigint AS total_points_earned,
         -- Number of students enrolled
         COUNT(DISTINCT e.student_id)::int           AS enrolled_count
       FROM courses c
       -- Enrolled students
       LEFT JOIN enrollments e
         ON e.course_id = c.id
       -- Gamification events for enrolled students in this org
       LEFT JOIN gamification_events ge
         ON ge.user_id         = e.student_id
        AND ge.organization_id = $1
       WHERE c.organization_id = $1
         AND c.is_published    = TRUE
       GROUP BY c.id, c.title
       ORDER BY total_points_earned DESC`,
      [organizationId],
    );

    return result.rows.map((r) => ({
      courseId: r.course_id,
      courseTitle: r.course_title,
      totalPointsEarned: Number(r.total_points_earned),
      enrolledCount: Number(r.enrolled_count),
    }));
  } catch (err) {
    logger.error('[GamificationReport] getCourseComparisonStats failed', {
      organizationId,
      error: String(err),
    });
    return [];
  }
}

// ---------------------------------------------------------------------------
// Internal sub-query helpers (used by getReportSummary)
// ---------------------------------------------------------------------------

/**
 * Total XP points awarded across all events for the org.
 * Optionally scoped to a specific course (events for enrolled students)
 * and/or a date range.
 */
async function queryTotalPointsAwarded(
  organizationId: string,
  courseId?: string,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  // Build parameterized query dynamically
  const params: unknown[] = [organizationId];
  const clauses: string[] = ['ge.organization_id = $1'];

  if (courseId) {
    params.push(courseId);
    clauses.push(`ge.user_id IN (
      SELECT student_id FROM enrollments WHERE course_id = $${params.length}
    )`);
  }
  if (startDate) {
    params.push(startDate.toISOString());
    clauses.push(`ge.occurred_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    clauses.push(`ge.occurred_at <= $${params.length}`);
  }

  const where = clauses.join(' AND ');
  const result = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(points_awarded), 0)::bigint AS total
     FROM gamification_events ge
     WHERE ${where}`,
    params,
  );
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Total unique badge awards for the org, optionally filtered by date range.
 */
async function queryTotalBadgesIssued(
  organizationId: string,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const params: unknown[] = [organizationId];
  const clauses: string[] = ['organization_id = $1'];

  if (startDate) {
    params.push(startDate.toISOString());
    clauses.push(`awarded_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    clauses.push(`awarded_at <= $${params.length}`);
  }

  const where = clauses.join(' AND ');
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(*)::int AS total FROM user_badges WHERE ${where}`,
    params,
  );
  return Number(result.rows[0]?.total ?? 0);
}

/**
 * Count of distinct learners who have at least one gamification event in the
 * period. Optionally scoped to a course.
 */
async function queryActiveLearnersCount(
  organizationId: string,
  courseId?: string,
  startDate?: Date,
  endDate?: Date,
): Promise<number> {
  const params: unknown[] = [organizationId];
  const clauses: string[] = ['ge.organization_id = $1'];

  if (courseId) {
    params.push(courseId);
    clauses.push(`ge.user_id IN (
      SELECT student_id FROM enrollments WHERE course_id = $${params.length}
    )`);
  }
  if (startDate) {
    params.push(startDate.toISOString());
    clauses.push(`ge.occurred_at >= $${params.length}`);
  }
  if (endDate) {
    params.push(endDate.toISOString());
    clauses.push(`ge.occurred_at <= $${params.length}`);
  }

  const where = clauses.join(' AND ');
  const result = await pool.query<{ total: string }>(
    `SELECT COUNT(DISTINCT ge.user_id)::int AS total
     FROM gamification_events ge
     WHERE ${where}`,
    params,
  );
  return Number(result.rows[0]?.total ?? 0);
}

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

/**
 * Executes an async query function and returns its value.
 * On error, logs the failure and returns the provided fallback value so
 * partial report failures don't break the whole summary response.
 */
async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    logger.error('[GamificationReport] Sub-query failed', { error: String(err) });
    return fallback;
  }
}
