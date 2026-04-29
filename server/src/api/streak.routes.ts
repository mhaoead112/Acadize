import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import { recordLoginStreak, getStreakInfo, updateWeeklyGoal } from '../services/streak.service.js';
import { db } from '../db/index.js';
import { studyActivities, studyStreaks } from '../db/schema.js';
import { createId } from '@paralleldrive/cuid2';
import { eq, sql } from 'drizzle-orm';

const router = Router();

// GET /api/streaks/me - Get current user's streak info
router.get('/me', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const streakInfo = await getStreakInfo(userId);
    res.json(streakInfo);
  } catch (error) {
    console.error('Error fetching streak info:', error);
    res.status(500).json({ message: 'Failed to fetch streak information' });
  }
});

// POST /api/streaks/login - Record a login (called automatically on login)
router.post('/login', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.tenant?.organizationId || req.user?.organizationId;
    const { extendedToday, shieldUsed, streakReset, comebackBonus } = await recordLoginStreak(userId, orgId) as any;
    const updatedStreak = await getStreakInfo(userId);

    let xpResult = undefined;
    let completedQuests: any[] = [];
    
    if (extendedToday && orgId) {
      try {
        const streakBonus = Math.min(updatedStreak.currentStreak, 15);
        const { awardXp } = await import('../services/xp.service.js');
        const { checkAndUpdateQuests } = await import('../services/quest.service.js');
        
        xpResult = await awardXp(
          userId, 
          orgId, 
          'daily_login', 
          5 + streakBonus, 
          'streak-' + new Date().toISOString().split('T')[0], 
          'streak'
        );

        // Check for login streak quests
        completedQuests = await checkAndUpdateQuests(userId, orgId, 'login_streak', { streak: updatedStreak.currentStreak });
        
        // Check for daily login quests
        const dailyQuests = await checkAndUpdateQuests(userId, orgId, 'daily_login');
        completedQuests = [...completedQuests, ...dailyQuests];
      } catch (gamError) {
        console.error('Failed to process gamification for login:', gamError);
      }
    }

    res.json({
      message: 'Login streak recorded successfully',
      streak: updatedStreak,
      xp: xpResult,
      shieldUsed,
      streakReset,
      comebackBonus,
      completedQuests: completedQuests.length > 0 ? completedQuests : undefined,
    });
  } catch (error) {
    console.error('Error recording login streak:', error);
    res.status(500).json({ message: 'Failed to record login streak' });
  }
});

// POST /api/streaks/activity - Record a study activity (called by useActivityTracker)
router.post('/activity', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = req.tenant?.organizationId || req.user?.organizationId;
    const { activityType, durationMinutes } = req.body;

    if (!activityType) {
      return res.status(400).json({ message: 'activityType is required' });
    }

    const now = new Date();

    // 1. Record the activity in study_activities table
    await db.insert(studyActivities).values({
      id: createId(),
      userId,
      activityDate: now,
      activityType,
      durationMinutes: durationMinutes != null ? String(durationMinutes) : null,
    });

    // 2. Update currentWeekHours on the streak record if duration was provided
    if (durationMinutes && durationMinutes > 0) {
      const hours = durationMinutes / 60;
      await db
        .update(studyStreaks)
        .set({
          currentWeekHours: sql`${studyStreaks.currentWeekHours} + ${hours}`,
        })
        .where(eq(studyStreaks.userId, userId));
    }

    // 3. Also record a login streak (so activity counts toward streak)
    const { shieldUsed, streakReset, comebackBonus } = await recordLoginStreak(userId, orgId) as any;

    res.json({ 
      message: 'Activity recorded',
      shieldUsed,
      streakReset,
      comebackBonus
    });
  } catch (error) {
    console.error('Error recording activity:', error);
    res.status(500).json({ message: 'Failed to record activity' });
  }
});

// PUT /api/streaks/weekly-goal - Update weekly study goal
router.put('/weekly-goal', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { goalHours } = req.body;

    if (!goalHours || goalHours <= 0) {
      return res.status(400).json({ message: 'Valid goalHours is required' });
    }

    await updateWeeklyGoal(userId, goalHours);
    const updatedStreak = await getStreakInfo(userId);

    res.json({
      message: 'Weekly goal updated successfully',
      streak: updatedStreak,
    });
  } catch (error) {
    console.error('Error updating weekly goal:', error);
    res.status(500).json({ message: 'Failed to update weekly goal' });
  }
});

export default router;
