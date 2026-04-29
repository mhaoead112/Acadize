/**
 * streak-nudge.job.ts — Sprint D: At-Risk Streak Nudge Cron
 *
 * Registers a pg-boss worker that fires every 30 minutes.
 * For each organization in the database it:
 *   1. Finds students whose streak is about to break today (UTC)
 *   2. Sends a push + in-app notification to each one
 *   3. Logs the result
 *
 * Why pg-boss instead of node-cron / setInterval?
 *   • pg-boss is already installed and used for all other scheduled jobs
 *     (email, push, weekly-XP-reset) — this keeps the scheduling layer
 *     consistent and avoids adding a new dependency.
 *   • pg-boss deduplicates concurrent workers across multiple server
 *     instances (important on Render's auto-scaling).
 *   • Schedules survive server restarts — pg-boss persists them in Postgres.
 */

import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { logger } from '../utils/logger.js';
import { findAtRiskStudents, sendStreakNudge } from '../services/nudge.service.js';

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────

export const JOB_STREAK_NUDGE = 'streak_nudge_check';

// ─────────────────────────────────────────────────────────────
// Worker handler (called by pg-boss for each job execution)
// ─────────────────────────────────────────────────────────────

export async function handleStreakNudge(): Promise<void> {
  logger.info('[StreakNudgeJob] Starting at-risk streak check');

  try {
    // 1. Get all distinct organizationIds from the users table
    const orgRows = await db
      .selectDistinct({ orgId: users.organizationId })
      .from(users);

    let totalNudged = 0;
    let totalSkipped = 0;

    // 2. Process each org independently so one failure doesn't block others
    for (const { orgId } of orgRows) {
      if (!orgId) continue;

      try {
        const atRisk = await findAtRiskStudents(orgId);

        if (atRisk.length === 0) {
          totalSkipped++;
          continue;
        }

        // 3. Send nudge to each at-risk student in parallel (capped batches)
        // We use Promise.allSettled so individual failures don't abort the batch
        const results = await Promise.allSettled(
          atRisk.map((student) => sendStreakNudge(student)),
        );

        const succeeded = results.filter((r) => r.status === 'fulfilled').length;
        const failed = results.filter((r) => r.status === 'rejected').length;

        totalNudged += succeeded;

        if (failed > 0) {
          logger.warn('[StreakNudgeJob] Some nudges failed in org', {
            orgId,
            succeeded,
            failed,
          });
        } else {
          logger.info('[StreakNudgeJob] Org processed', {
            orgId,
            nudged: succeeded,
          });
        }
      } catch (orgErr) {
        logger.error('[StreakNudgeJob] Org processing failed', {
          orgId,
          error: String(orgErr),
        });
      }
    }

    logger.info('[StreakNudgeJob] Completed', {
      orgsProcessed: orgRows.length,
      totalNudged,
      totalSkipped,
    });
  } catch (err) {
    logger.error('[StreakNudgeJob] Fatal error in handler', { error: String(err) });
    // Re-throw so pg-boss marks the job as failed and retries
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────
// startStreakNudgeJob
// ─────────────────────────────────────────────────────────────

/**
 * Registers the streak-nudge worker with an existing pg-boss instance
 * and schedules it to run every 30 minutes.
 *
 * Called from server/src/jobs/index.ts inside registerWorkers().
 * Exported so index.ts can call it after boss.start().
 */
export async function startStreakNudgeJob(boss: any): Promise<void> {
  try {
    await boss.createQueue(JOB_STREAK_NUDGE);

    await boss.work(JOB_STREAK_NUDGE, async (_jobs: any[]) => {
      try {
        await handleStreakNudge();
      } catch (error: any) {
        logger.error(`[Job ${JOB_STREAK_NUDGE}] Failed`, { error: error.message });
        throw error;
      }
    });

    // Runs every 30 minutes (cron: minute 0 and 30 of every hour)
    await boss.schedule(JOB_STREAK_NUDGE, '0,30 * * * *');

    logger.info('[StreakNudgeJob] Worker registered — runs every 30 minutes');
  } catch (err) {
    logger.error('[StreakNudgeJob] Failed to register worker', { error: String(err) });
    // Non-fatal — server continues without this job rather than crashing
  }
}
