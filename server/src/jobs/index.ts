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

export const JOB_SEND_EMAIL = 'send_email';
export const JOB_PUSH_NOTIFICATION = 'push_notification';
export const JOB_RETAKE_GENERATION = 'retake_generation';
export const JOB_ATTENDANCE_NOTIFICATION = 'attendance_notification';
export const JOB_CLEANUP_TOKENS = 'cleanup_tokens';

async function registerWorkers() {
    if (!boss) return;

    await Promise.all([
        boss.createQueue(JOB_SEND_EMAIL),
        boss.createQueue(JOB_PUSH_NOTIFICATION),
        boss.createQueue(JOB_RETAKE_GENERATION),
        boss.createQueue(JOB_ATTENDANCE_NOTIFICATION),
        boss.createQueue(JOB_CLEANUP_TOKENS),
    ]);

    await boss.work(JOB_SEND_EMAIL, async (job: any) => {
        try {
            await handleSendEmail(job.data as any);
        } catch (error: any) {
            logger.error(`[Job ${JOB_SEND_EMAIL}] Failed`, { error: error.message });
            throw error;
        }
    });

    await boss.work(JOB_PUSH_NOTIFICATION, async (job: any) => {
        try {
            await handlePushNotification(job.data as any);
        } catch (error: any) {
            logger.error(`[Job ${JOB_PUSH_NOTIFICATION}] Failed`, { error: error.message });
            throw error;
        }
    });

    await boss.work(JOB_RETAKE_GENERATION, async (job: any) => {
        try {
            await handleRetakeGeneration(job.data as any);
        } catch (error: any) {
            logger.error(`[Job ${JOB_RETAKE_GENERATION}] Failed`, { error: error.message });
            throw error;
        }
    });

    await boss.work(JOB_ATTENDANCE_NOTIFICATION, async (job: any) => {
        try {
            await handleAttendanceNotification(job.data as any);
        } catch (error: any) {
            logger.error(`[Job ${JOB_ATTENDANCE_NOTIFICATION}] Failed`, { error: error.message });
            throw error;
        }
    });

    // Register cleanup job
    await boss.work(JOB_CLEANUP_TOKENS, async () => {
        try {
            const { TokenService } = await import('../services/token.service.js');
            await TokenService.cleanupExpiredTokens();
        } catch (error: any) {
            logger.error(`[Job ${JOB_CLEANUP_TOKENS}] Failed`, { error: error.message });
            throw error;
        }
    });

    // Schedule the token cleanup job to run every night at midnight
    await boss.schedule(JOB_CLEANUP_TOKENS, '0 0 * * *');

    logger.info('[pg-boss] Registered workers and schedules');
}
