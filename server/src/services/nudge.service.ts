/**
 * nudge.service.ts — Sprint D: At-Risk Streak Nudge
 *
 * Finds students whose learning streak is about to break (last activity was
 * before today UTC) and sends a push + in-app notification.
 *
 * Design decisions:
 *  • "Today" is computed as UTC midnight — simple, consistent across all orgs.
 *  • Module-level throttle Map (userId → last nudge ms) prevents duplicate
 *    nudges within a 23-hour window. Resets on server restart, which is
 *    acceptable because nudges are best-effort and non-critical.
 *  • Both push (fire-and-forget) and in-app notification are sent;
 *    if push fails it is swallowed — students still get the bell notification.
 *  • No new tables required.
 */

import { db } from '../db/index.js';
import {
  studyStreaks,
  users,
} from '../db/schema.js';
import { eq, and, lt, gte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { sendPushNotification } from './push-notification.service.js';
import { createNotification } from './notifications.service.js';

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────

export interface AtRiskStudent {
  userId: string;
  fullName: string;
  currentStreak: number;
  organizationId: string;
}

// ─────────────────────────────────────────────────────────────
// Throttle — in-memory, 23-hour window per userId
// ─────────────────────────────────────────────────────────────

const THROTTLE_WINDOW_MS = 23 * 60 * 60 * 1000; // 23 hours
const nudgeThrottle = new Map<string, number>();   // userId → last nudge timestamp (ms)

function wasNudgedRecently(userId: string): boolean {
  const lastSent = nudgeThrottle.get(userId);
  if (!lastSent) return false;
  return Date.now() - lastSent < THROTTLE_WINDOW_MS;
}

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

/** Returns the start of today in UTC (midnight). */
function startOfTodayUTC(): Date {
  const now = new Date();
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
}

// ─────────────────────────────────────────────────────────────
// findAtRiskStudents
// ─────────────────────────────────────────────────────────────

/**
 * Returns students in the given org whose streak is ≥ 1 but whose
 * last activity date is before today UTC — meaning their streak will
 * break if they don't study today.
 *
 * Students who were already nudged within the last 23 hours are excluded.
 */
export async function findAtRiskStudents(
  organizationId: string,
): Promise<AtRiskStudent[]> {
  try {
    const todayUtc = startOfTodayUTC();

    const rows = await db
      .select({
        userId: studyStreaks.userId,
        fullName: users.fullName,
        currentStreak: studyStreaks.currentStreak,
        organizationId: users.organizationId,
      })
      .from(studyStreaks)
      .innerJoin(users, eq(studyStreaks.userId, users.id))
      .where(
        and(
          eq(users.organizationId, organizationId),
          // Streak exists
          gte(studyStreaks.currentStreak, 1),
          // Last activity was before today (streak about to break)
          lt(studyStreaks.lastActivityDate, todayUtc),
        ),
      );

    // Filter out recently-nudged students in JS (avoids complex SQL anti-join)
    return rows.filter((r) => !wasNudgedRecently(r.userId));
  } catch (err) {
    logger.error('[NudgeService] findAtRiskStudents failed', {
      organizationId,
      error: String(err),
    });
    return [];
  }
}

// ─────────────────────────────────────────────────────────────
// sendStreakNudge
// ─────────────────────────────────────────────────────────────

/**
 * Sends a push notification (if the student has a subscription) and an
 * in-app bell notification for the streak-at-risk warning.
 *
 * Records the nudge timestamp in the throttle map so the student won't
 * be nudged again within 23 hours.
 */
export async function sendStreakNudge(student: AtRiskStudent): Promise<void> {
  const { userId, fullName, currentStreak, organizationId } = student;
  const firstName = fullName.split(' ')[0]; // "Ahmed Hassan" → "Ahmed"

  const pushTitle = '⚡ Streak at risk!';
  const pushBody = `${firstName}, your ${currentStreak}-day streak ends at midnight! Do one quick lesson now 🔥`;

  // 1. Push notification (best-effort — silently ignored if user has no subscription)
  try {
    await sendPushNotification(userId, {
      title: pushTitle,
      body: pushBody,
      icon: '/logo.png',
      tag: 'streak_nudge',           // replaces any existing streak notification (dedup)
      data: {
        type: 'streak_nudge',
        currentStreak,
        url: '/student/courses',     // deep-link inside the PWA
      },
    });
  } catch (pushErr) {
    // Non-fatal — student still gets the in-app notification
    logger.warn('[NudgeService] Push send failed (non-fatal)', {
      userId,
      error: String(pushErr),
    });
  }

  // 2. In-app notification (always)
  try {
    await createNotification({
      userId,
      type: 'streak_nudge',
      title: pushTitle,
      message: pushBody,
    });
  } catch (notifErr) {
    logger.error('[NudgeService] createNotification failed', {
      userId,
      error: String(notifErr),
    });
  }

  // 3. Mark as nudged regardless of whether individual sends succeeded
  nudgeThrottle.set(userId, Date.now());

  logger.info('[NudgeService] Nudge sent', { userId, firstName, currentStreak, organizationId });
}
