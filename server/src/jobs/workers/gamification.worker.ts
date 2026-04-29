import { logger } from '../../utils/logger.js';
import { resetWeeklyXp } from '../../services/xp.service.js';

export async function handleWeeklyXpReset() {
    try {
        logger.info('[Gamification Worker] Starting weekly XP reset...');
        await resetWeeklyXp();
        logger.info('[Gamification Worker] Successfully reset weekly XP for all users.');
    } catch (error: any) {
        logger.error('[Gamification Worker] Failed to reset weekly XP', { error: error.message });
        throw error;
    }
}
