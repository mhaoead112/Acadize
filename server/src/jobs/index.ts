import { PgBoss } from 'pg-boss';
import { logger } from '../utils/logger.js';

let boss: PgBoss | null = null;

export async function initJobsQueue() {
    if (!process.env.DATABASE_URL) {
        throw new Error('DATABASE_URL is required for pg-boss');
    }

    boss = new PgBoss({
        connectionString: process.env.DATABASE_URL,
        // Since pg-boss creates its own tables, it uses the public schema
        // We ensure we don't interfere with drizzle
        application_name: 'eduverse_jobs',
    });

    boss.on('error', (error: any) => {
        logger.error('[pg-boss] Error:', { error: error.message });
    });

    try {
        await boss.start();
        logger.info('[pg-boss] Job queue started');
        
        // Start workers
        await registerWorkers();
    } catch (err: any) {
        logger.error('[pg-boss] Failed to start:', { error: err.message });
        throw err;
    }
}

export function getQueue(): PgBoss {
    if (!boss) {
        throw new Error('pg-boss not initialized');
    }
    return boss;
}

export async function enqueueJob(name: string, data: any, options?: any) {
    if (!boss) {
        logger.warn(`[JobQueue] Queue inactive. Attempting synchronous execution for: ${name}`);
        // Fallback or ignore
        return null;
    }
    return boss.send(name, data, options);
}

// ==================== WORKERS ====================

// We will implement these specific handlers
import { handleSendEmail } from './workers/email.worker.js';
import { handlePushNotification } from './workers/push.worker.js';
import { handleRetakeGeneration } from './workers/retake.worker.js';
import { handleAttendanceNotification } from './workers/attendance.worker.js';
import { handleWeeklyXpReset } from './workers/gamification.worker.js';
import { startStreakNudgeJob, JOB_STREAK_NUDGE } from './streak-nudge.job.js';

export const JOB_SEND_EMAIL = 'send_email';
export const JOB_PUSH_NOTIFICATION = 'push_notification';
export const JOB_RETAKE_GENERATION = 'retake_generation';
export const JOB_ATTENDANCE_NOTIFICATION = 'attendance_notification';
export const JOB_CLEANUP_TOKENS = 'cleanup_tokens';
export const JOB_WEEKLY_XP_RESET = 'weekly_xp_reset';
export { JOB_STREAK_NUDGE };

async function registerWorkers() {
    if (!boss) return;

    await Promise.all([
        boss.createQueue(JOB_SEND_EMAIL),
        boss.createQueue(JOB_PUSH_NOTIFICATION),
        boss.createQueue(JOB_RETAKE_GENERATION),
        boss.createQueue(JOB_ATTENDANCE_NOTIFICATION),
        boss.createQueue(JOB_CLEANUP_TOKENS),
        boss.createQueue(JOB_WEEKLY_XP_RESET),
        boss.createQueue(JOB_STREAK_NUDGE),
    ]);

    // ── pg-boss v12: handler receives Job[] (array), not a single Job ──────────

    await boss.work(JOB_SEND_EMAIL, async (jobs: any[]) => {
        await Promise.allSettled(jobs.map(async (job) => {
            if (!job?.data) return;
            try {
                await handleSendEmail(job.data);
            } catch (error: any) {
                logger.error(`[Job ${JOB_SEND_EMAIL}] Failed`, { error: error.message });
                throw error;
            }
        }));
    });

    await boss.work(JOB_PUSH_NOTIFICATION, async (jobs: any[]) => {
        await Promise.allSettled(jobs.map(async (job) => {
            if (!job?.data) return;
            try {
                await handlePushNotification(job.data);
            } catch (error: any) {
                logger.error(`[Job ${JOB_PUSH_NOTIFICATION}] Failed`, { error: error.message });
                throw error;
            }
        }));
    });

    await boss.work(JOB_RETAKE_GENERATION, async (jobs: any[]) => {
        await Promise.allSettled(jobs.map(async (job) => {
            if (!job?.data) return;
            try {
                await handleRetakeGeneration(job.data);
            } catch (error: any) {
                logger.error(`[Job ${JOB_RETAKE_GENERATION}] Failed`, { error: error.message });
                throw error;
            }
        }));
    });

    await boss.work(JOB_ATTENDANCE_NOTIFICATION, async (jobs: any[]) => {
        await Promise.allSettled(jobs.map(async (job) => {
            if (!job?.data) return;
            try {
                await handleAttendanceNotification(job.data);
            } catch (error: any) {
                logger.error(`[Job ${JOB_ATTENDANCE_NOTIFICATION}] Failed`, { error: error.message });
                throw error;
            }
        }));
    });

    // Register cleanup job (no per-job data needed)
    await boss.work(JOB_CLEANUP_TOKENS, async (_jobs: any[]) => {
        try {
            const { TokenService } = await import('../services/token.service.js');
            await TokenService.cleanupExpiredTokens();
        } catch (error: any) {
            logger.error(`[Job ${JOB_CLEANUP_TOKENS}] Failed`, { error: error.message });
            throw error;
        }
    });

    // Register gamification weekly reset job (no per-job data needed)
    await boss.work(JOB_WEEKLY_XP_RESET, async (_jobs: any[]) => {
        try {
            await handleWeeklyXpReset();
        } catch (error: any) {
            logger.error(`[Job ${JOB_WEEKLY_XP_RESET}] Failed`, { error: error.message });
            throw error;
        }
    });

    // Schedule the token cleanup job to run every night at midnight
    await boss.schedule(JOB_CLEANUP_TOKENS, '0 0 * * *');
    
    // Schedule the weekly XP reset to run at Sunday 23:59 (or Monday 00:00)
    await boss.schedule(JOB_WEEKLY_XP_RESET, '59 23 * * 0');

    // Sprint D: Streak Nudge Cron — every 30 minutes, all orgs
    await startStreakNudgeJob(boss);

    logger.info('[pg-boss] Registered workers and schedules');
}
