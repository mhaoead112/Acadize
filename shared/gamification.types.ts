/**
 * Gamification – Shared TypeScript Types
 *
 * Keep this file completely standalone: no Drizzle imports, no server imports.
 * Both the client and the server import from here using their respective conventions:
 *
 *   Client (Vite @shared alias):
 *     import type { GamificationSettings } from '@shared/gamification.types';
 *
 *   Server (NodeNext relative path, .js extension required):
 *     import type { GamificationSettings } from '../../../shared/gamification.types.js';
 *     (adjust relative depth depending on the importing file's location)
 *
 * All date fields that cross the API boundary use ISO-8601 strings, not Date
 * objects, so they survive JSON serialization safely.
 */

// ---------------------------------------------------------------------------
// Core configuration types
// ---------------------------------------------------------------------------

/** Per-organization gamification feature flags and naming. */
export type GamificationSettings = {
  organizationId: string;
  enabled: boolean;
  pointsEnabled: boolean;
  levelsEnabled: boolean;
  badgesEnabled: boolean;
  leaderboardEnabled: boolean;
  /** Display label for the point unit, e.g. "XP" or "Points" */
  levelNaming: string;
  /** Display label for level prefix, e.g. "Level" or "Rank" */
  pointNaming: string;
  createdAt: string;
  updatedAt: string | null;
};

/** One configurable rule controlling how many points a milestone event awards. */
export type GamificationPointRule = {
  id: string;
  organizationId: string;
  /**
   * One of:
   *   'lesson_completion' | 'quiz_completion' | 'exam_completion'
   *   'assignment_submission' | 'assignment_graded_pass' | 'course_completion'
   */
  eventType: GamificationEventType;
  points: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string | null;
};

/** The 6 milestone event types that can award points in V1. */
export type GamificationEventType =
  | 'lesson_completion'
  | 'quiz_completion'
  | 'exam_completion'
  | 'assignment_submission'
  | 'assignment_graded_pass'
  | 'course_completion';

// ---------------------------------------------------------------------------
// Levels
// ---------------------------------------------------------------------------

/** One XP threshold tier defined by the admin.  */
export type GamificationLevel = {
  id: string;
  organizationId: string;
  levelNumber: number;
  name: string;
  minPoints: number;
  /** null means "no upper cap" (the highest level) */
  maxPoints: number | null;
  badgeEmoji: string | null;
  createdAt: string;
};

// ---------------------------------------------------------------------------
// Badges
// ---------------------------------------------------------------------------

/** The criteria type that governs when a badge is automatically awarded. */
export type GamificationCriteriaType =
  | 'lesson_count'
  | 'course_completion'
  | 'exam_score'
  | 'assignment_count'
  | 'streak'
  | 'level_reached'
  | 'first_action';

/** An org-scoped badge definition. */
export type GamificationBadge = {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  emoji: string | null;
  criteriaType: GamificationCriteriaType;
  /** Meaning depends on criteriaType: lesson count, level number reached, etc. */
  criteriaValue: number;
  /** When set, the badge is only awarded within this specific course. */
  courseId: string | null;
  isActive: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
};

/** A badge with the timestamp it was awarded to a specific user. */
export type AwardedBadge = GamificationBadge & {
  awardedAt: string;
};

// ---------------------------------------------------------------------------
// Learner profile
// ---------------------------------------------------------------------------

/**
 * The enriched profile object returned by GET /api/gamification/me.
 * Combines the DB profile row with computed display data.
 */
export type UserGamificationProfile = {
  userId: string;
  organizationId: string;
  totalPoints: number;
  currentLevelNumber: number;
  /** null when the user hasn't earned any level yet (e.g. 0 points, no levels seeded) */
  currentLevel: GamificationLevel | null;
  /** null when the user is at the maximum level */
  nextLevel: GamificationLevel | null;
  /**
   * Percentage progress toward the next level threshold.
   * Range: 0–100 (integer). 100 means the user is at or past the next threshold.
   */
  nextLevelProgress: number;
  createdAt: string;
  updatedAt: string | null;
};

// ---------------------------------------------------------------------------
// Events / activity ledger
// ---------------------------------------------------------------------------

/** A single immutable point-award event from the gamification ledger. */
export type GamificationEvent = {
  id: string;
  organizationId: string;
  userId: string;
  eventType: GamificationEventType;
  /** ID of the lesson / assignment / exam / course that triggered this event. */
  entityId: string;
  /** Human-readable entity category: 'lesson' | 'assignment' | 'exam' | 'course' */
  entityType: string;
  pointsAwarded: number;
  metadata: Record<string, unknown> | null;
  occurredAt: string;
};

// ---------------------------------------------------------------------------
// Leaderboard
// ---------------------------------------------------------------------------

/** One row in a course-scoped leaderboard response. */
export type GamificationLeaderboardEntry = {
  rank: number;
  userId: string;
  fullName: string;
  avatarUrl: string | null;
  totalPoints: number;
  currentLevelNumber: number;
  badgeCount: number;
};

// ---------------------------------------------------------------------------
// Admin reporting
// ---------------------------------------------------------------------------

/** Summary returned by GET /api/admin/gamification/reports. */
export type GamificationReportSummary = {
  totalPointsAwarded: number;
  totalBadgesIssued: number;
  activeLearnersCount: number;
  levelDistribution: {
    levelNumber: number;
    levelName: string;
    count: number;
  }[];
  topEarners: {
    userId: string;
    fullName: string;
    totalPoints: number;
  }[];
  /** Daily badge issuance counts for trend charts. */
  badgeIssuanceTrend: {
    /** ISO date string, e.g. "2026-04-21" */
    date: string;
    count: number;
  }[];
};

// ---------------------------------------------------------------------------
// API response wrappers
// ---------------------------------------------------------------------------

/** Response shape for GET /api/gamification/me */
export type GamificationMeResponse = UserGamificationProfile & {
  recentBadges: AwardedBadge[];
  recentEvents: GamificationEvent[];
};

/** Response shape for GET /api/gamification/me/badges */
export type GamificationBadgesResponse = {
  earned: AwardedBadge[];
  available: GamificationBadge[];
};

/** Response shape for GET /api/gamification/leaderboard */
export type GamificationLeaderboardResponse = {
  enabled: boolean;
  userRank: number | null;
  entries: GamificationLeaderboardEntry[];
};

/** Response shape for GET /api/gamification/activity */
export type GamificationActivityResponse = {
  events: GamificationEvent[];
  total: number;
};

/** Response shape for GET /api/teacher/gamification/overview */
export type TeacherGamificationOverviewResponse = {
  leaderboard: GamificationLeaderboardEntry[];
  topAchievers: {
    userId: string;
    fullName: string;
    avatarUrl: string | null;
    badgeCount: number;
    totalPoints: number;
  }[];
  lowEngagement: {
    userId: string;
    fullName: string;
    totalPoints: number;
  }[];
  badgeDistribution: {
    badgeName: string;
    badgeEmoji: string | null;
    count: number;
  }[];
};

/** Result returned from the internal awardPoints() service call. */
export type PointAwardResult = {
  /** false when the event was a duplicate (idempotency) or gamification is disabled. */
  awarded: boolean;
  pointsAwarded: number;
  newTotal: number;
  levelUp: boolean;
  newLevel: GamificationLevel | null;
};
