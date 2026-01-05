import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { recordLoginStreak, getStreakInfo, updateWeeklyGoal } from '../services/streak.service.js';

const router = Router();

// GET /api/streaks/me - Get current user's streak info
router.get('/me', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const streakInfo = await getStreakInfo(userId);
    res.json(streakInfo);
  } catch (error) {
    console.error('Error fetching streak info:', error);
    res.status(500).json({ error: 'Failed to fetch streak information' });
  }
});

// POST /api/streaks/login - Record a login (called automatically on login)
router.post('/login', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    await recordLoginStreak(userId);
    const updatedStreak = await getStreakInfo(userId);
    
    res.json({
      message: 'Login streak recorded successfully',
      streak: updatedStreak,
    });
  } catch (error) {
    console.error('Error recording login streak:', error);
    res.status(500).json({ error: 'Failed to record login streak' });
  }
});

// PUT /api/streaks/weekly-goal - Update weekly study goal
router.put('/weekly-goal', isAuthenticated, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { goalHours } = req.body;

    if (!goalHours || goalHours <= 0) {
      return res.status(400).json({ error: 'Valid goalHours is required' });
    }

    await updateWeeklyGoal(userId, goalHours);
    const updatedStreak = await getStreakInfo(userId);
    
    res.json({
      message: 'Weekly goal updated successfully',
      streak: updatedStreak,
    });
  } catch (error) {
    console.error('Error updating weekly goal:', error);
    res.status(500).json({ error: 'Failed to update weekly goal' });
  }
});

export default router;
