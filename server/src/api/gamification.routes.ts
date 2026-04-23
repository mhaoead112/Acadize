/**
 * Gamification Routes
 *
 * Student endpoints (prefix: /api/gamification):
 *   GET /me                — full enriched profile for the authenticated student
 *   GET /me/badges         — earned + available badges, filterable by ?earned=
 *   GET /leaderboard       — course leaderboard (student and teacher)
 *   GET /activity          — paginated event log for the student
 *
 * Teacher endpoints (prefix: /api/teacher/gamification):
 *   GET /overview          — course engagement overview with segments
 *
 * Both router prefixes point at separate Router instances exported from this file.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/protected.middleware.js';
import { db } from '../db/index.js';
import {
  gamificationEvents,
  gamificationBadges,
  userBadges,
  userGamificationProfiles,
  enrollments,
  users,
} from '../db/schema.js';
import { eq, and, desc, count, sql, inArray } from 'drizzle-orm';
import * as gamificationService from '../services/gamification.service.js';

// ---------------------------------------------------------------------------
// Org helper — mirrors the pattern used across existing route files
// ---------------------------------------------------------------------------
const getOrgId = (req: any): string | undefined =>
  req.tenant?.organizationId ?? req.user?.organizationId;

// ===========================================================================
// Student router  →  mounted at /api/gamification
// ===========================================================================
export const gamificationRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/gamification/me
// Returns the full enriched gamification profile for the authenticated student.
// ---------------------------------------------------------------------------
gamificationRouter.get('/me', ...requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const orgId  = getOrgId(req);

    if (!userId || !orgId) {
      return res.status(400).json({ message: 'User and organization context required.' });
    }

    const profile = await gamificationService.getLearnerProfile(userId, orgId);
    return res.status(200).json(profile);
  } catch (err) {
    console.error('[GET /gamification/me]', err);
    return res.status(500).json({ message: 'Failed to fetch gamification profile.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gamification/me/badges
// Returns earned badges and available (not yet earned) badges.
// Query: ?earned=true|false|all  (default: all)
// ---------------------------------------------------------------------------
gamificationRouter.get('/me/badges', ...requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const orgId  = getOrgId(req);

    if (!userId || !orgId) {
      return res.status(400).json({ message: 'User and organization context required.' });
    }

    const earnedFilter = (req.query.earned ?? 'all') as string;

    // All active badges for the org
    const allBadges = await db
      .select()
      .from(gamificationBadges)
      .where(
        and(
          eq(gamificationBadges.organizationId, orgId),
          eq(gamificationBadges.isActive, true),
          sql`${gamificationBadges.archivedAt} IS NULL`,
        ),
      )
      .orderBy(gamificationBadges.createdAt);

    // User's earned badge records
    const earnedRows = await db
      .select({ badgeId: userBadges.badgeId, awardedAt: userBadges.awardedAt })
      .from(userBadges)
      .where(
        and(
          eq(userBadges.userId, userId),
          eq(userBadges.organizationId, orgId),
        ),
      );

    const earnedMap = new Map(earnedRows.map(r => [r.badgeId, r.awardedAt]));

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    const earned = allBadges
      .filter(b => earnedMap.has(b.id))
      .map(b => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
        courseId: b.courseId,
        isActive: b.isActive,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
        awardedAt: toISO(earnedMap.get(b.id)!)!,
      }));

    const available = allBadges
      .filter(b => !earnedMap.has(b.id))
      .map(b => ({
        id: b.id,
        organizationId: b.organizationId,
        name: b.name,
        description: b.description,
        emoji: b.emoji,
        criteriaType: b.criteriaType,
        criteriaValue: b.criteriaValue,
        courseId: b.courseId,
        isActive: b.isActive,
        archivedAt: toISO(b.archivedAt),
        createdAt: toISO(b.createdAt)!,
        updatedAt: toISO(b.updatedAt),
      }));

    // Apply ?earned filter
    if (earnedFilter === 'true') {
      return res.status(200).json({ earned, available: [] });
    }
    if (earnedFilter === 'false') {
      return res.status(200).json({ earned: [], available });
    }
    return res.status(200).json({ earned, available });
  } catch (err) {
    console.error('[GET /gamification/me/badges]', err);
    return res.status(500).json({ message: 'Failed to fetch badges.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gamification/leaderboard
// Returns ranked leaderboard for a course. Accessible by students and teachers.
// Query: ?courseId (required)
// ---------------------------------------------------------------------------
gamificationRouter.get('/leaderboard', ...requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const orgId  = getOrgId(req);
    const courseId = req.query.courseId as string | undefined;

    if (!userId || !orgId) {
      return res.status(400).json({ message: 'User and organization context required.' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'courseId query parameter is required.' });
    }

    const settings = await gamificationService.getOrgSettings(orgId);
    if (!settings.enabled || !settings.leaderboardEnabled) {
      return res.status(200).json({ entries: [], userRank: null, enabled: false });
    }

    const entries = await gamificationService.getLeaderboard(orgId, courseId, 50);

    // Find the requesting user's rank in this leaderboard
    const userRank = entries.find(e => e.userId === userId)?.rank ?? null;

    return res.status(200).json({ entries, userRank, enabled: true });
  } catch (err) {
    console.error('[GET /gamification/leaderboard]', err);
    return res.status(500).json({ message: 'Failed to fetch leaderboard.' });
  }
});

// ---------------------------------------------------------------------------
// GET /api/gamification/activity
// Returns a paginated log of gamification events for the student.
// Query: ?limit=20&offset=0
// ---------------------------------------------------------------------------
gamificationRouter.get('/activity', ...requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const orgId  = getOrgId(req);

    if (!userId || !orgId) {
      return res.status(400).json({ message: 'User and organization context required.' });
    }

    const limit  = Math.min(parseInt(String(req.query.limit  ?? '20'), 10) || 20, 100);
    const offset = Math.max(parseInt(String(req.query.offset ?? '0'),  10) || 0,  0);

    // Total count
    const [countResult] = await db
      .select({ total: count() })
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.organizationId, orgId),
        ),
      );

    const total = Number(countResult?.total ?? 0);

    // Paged events
    const rows = await db
      .select()
      .from(gamificationEvents)
      .where(
        and(
          eq(gamificationEvents.userId, userId),
          eq(gamificationEvents.organizationId, orgId),
        ),
      )
      .orderBy(desc(gamificationEvents.occurredAt))
      .limit(limit)
      .offset(offset);

    const toISO = (d: Date | null | undefined) => d?.toISOString() ?? null;

    const events = rows.map(e => ({
      id:           e.id,
      organizationId: e.organizationId,
      userId:       e.userId,
      eventType:    e.eventType,
      entityId:     e.entityId,
      entityType:   e.entityType,
      pointsAwarded: e.pointsAwarded,
      metadata:     (e.metadata as Record<string, unknown>) ?? null,
      occurredAt:   toISO(e.occurredAt)!,
    }));

    return res.status(200).json({ events, total, limit, offset });
  } catch (err) {
    console.error('[GET /gamification/activity]', err);
    return res.status(500).json({ message: 'Failed to fetch activity.' });
  }
});

// ===========================================================================
// Teacher router  →  mounted at /api/teacher/gamification
// ===========================================================================
export const teacherGamificationRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/teacher/gamification/overview
// Course engagement overview: leaderboard, top achievers, low engagement,
// badge distribution. All data scoped to enrolled students in the given course.
// Query: ?courseId (required)
// ---------------------------------------------------------------------------
teacherGamificationRouter.get('/overview', ...requireAuth, async (req: any, res) => {
  try {
    const userId = req.user?.id;
    const orgId  = getOrgId(req);
    const courseId = req.query.courseId as string | undefined;

    if (!userId || !orgId) {
      return res.status(400).json({ message: 'User and organization context required.' });
    }
    if (!orgId || (req.user?.role !== 'teacher' && req.user?.role !== 'admin')) {
      return res.status(403).json({ message: 'Forbidden: Teachers and admins only.' });
    }
    if (!courseId) {
      return res.status(400).json({ message: 'courseId query parameter is required.' });
    }

    // 1. Full leaderboard (up to 50 — returns [] if leaderboards disabled)
    const leaderboard = await gamificationService.getLeaderboard(orgId, courseId, 50);

    // 2. Top achievers — top 5 by points, with badge counts
    const topAchievers = leaderboard.slice(0, 5).map(e => ({
      userId:       e.userId,
      fullName:     e.fullName,
      totalPoints:  e.totalPoints,
      badgeCount:   e.badgeCount,
    }));

    // 3. Low engagement — bottom 20% of enrolled students (by totalPoints)
    //    Use a direct DB query scoped to course enrollments so that students
    //    with 0 gamification points (no profile row yet) are included.
    const enrolledRows = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .innerJoin(users, eq(enrollments.studentId, users.id))
      .where(
        and(
          eq(enrollments.courseId, courseId),
          eq(users.organizationId, orgId),
        ),
      );

    const enrolledIds = enrolledRows.map(r => r.studentId);

    const lowEngagement: { userId: string; fullName: string; totalPoints: number }[] = [];

    if (enrolledIds.length > 0) {
      const threshold = Math.max(1, Math.ceil(enrolledIds.length * 0.2)); // bottom 20%

      // Fetch all enrolled student profiles (those with a profile row)
      const profileRows = await db
        .select({
          userId:      userGamificationProfiles.userId,
          fullName:    users.fullName,
          totalPoints: userGamificationProfiles.totalPoints,
        })
        .from(userGamificationProfiles)
        .innerJoin(users, eq(userGamificationProfiles.userId, users.id))
        .where(
          and(
            eq(userGamificationProfiles.organizationId, orgId),
            inArray(userGamificationProfiles.userId, enrolledIds),
          ),
        )
        .orderBy(userGamificationProfiles.totalPoints); // ascending — lowest first

      // Students with no profile yet have 0 points — include them first
      const profiledIds = new Set(profileRows.map(r => r.userId));
      const unprofiledIds = enrolledIds.filter(id => !profiledIds.has(id));

      // Fetch display names for unprofiled students
      const unprofiledUsers = unprofiledIds.length > 0
        ? await db
            .select({ id: users.id, fullName: users.fullName })
            .from(users)
            .where(inArray(users.id, unprofiledIds))
        : [];

      const zeroPts = unprofiledUsers.map(u => ({
        userId: u.id,
        fullName: u.fullName,
        totalPoints: 0,
      }));

      // Combined sorted list (zeroPts first, then ascending profileRows)
      const combined = [...zeroPts, ...profileRows];
      lowEngagement.push(...combined.slice(0, threshold));
    }

    // 4. Badge distribution — how many times each badge has been awarded to
    //    enrolled students in this course
    const badgeDistribution: { badgeName: string; count: number }[] = [];

    if (enrolledIds.length > 0) {
      const badgeRows = await db
        .select({
          badgeName: gamificationBadges.name,
          total:     count(),
        })
        .from(userBadges)
        .innerJoin(gamificationBadges, eq(userBadges.badgeId, gamificationBadges.id))
        .where(
          and(
            eq(userBadges.organizationId, orgId),
            inArray(userBadges.userId, enrolledIds),
          ),
        )
        .groupBy(gamificationBadges.name)
        .orderBy(desc(count()));

      badgeDistribution.push(
        ...badgeRows.map(r => ({ badgeName: r.badgeName, count: Number(r.total) })),
      );
    }

    return res.status(200).json({
      leaderboard,
      topAchievers,
      lowEngagement,
      badgeDistribution,
    });
  } catch (err) {
    console.error('[GET /teacher/gamification/overview]', err);
    return res.status(500).json({ message: 'Failed to fetch gamification overview.' });
  }
});
