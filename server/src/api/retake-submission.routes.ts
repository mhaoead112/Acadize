import { Router } from 'express';
import { RetakeSubmissionService } from '../services/retake-submission.service.js';
import { isAuthenticated, isStudent, isTeacher } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/retake-submissions/submit
 * Submit a retake exam (practice or graded mode)
 * Student or Teacher can submit
 */
router.post('/submit', isAuthenticated, async (req, res) => {
  try {
    const {
      attemptId,
      studentId,
      examId,
      mode, // 'practice' or 'graded'
      preventInfiniteLoops,
      updateMastery,
    } = req.body;

    // Validation
    if (!attemptId || !studentId || !examId || !mode) {
      return res.status(400).json({
        success: false,
        message: 'attemptId, studentId, examId, and mode are required',
      });
    }

    if (!['practice', 'graded'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'mode must be either "practice" or "graded"',
      });
    }

    // Authorization: students can only submit for themselves
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only submit their own retakes',
      });
    }

    // Teachers can force graded mode; students can only use graded if teacher allows
    if (mode === 'graded' && requesterRole === 'student') {
      // Check if exam allows graded retakes
      const { db } = await import('../db/index.js');
      const { exams } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');

      const exam = await db.query.exams.findFirst({
        where: eq(exams.id, examId),
      });

      if (exam && !(exam as any).allowGradedRetakes) {
        return res.status(403).json({
          success: false,
          message: 'Graded retakes are not allowed for this exam. Use practice mode instead.',
        });
      }
    }

    // Submit retake
    const result = await RetakeSubmissionService.submitRetakeExam({
      attemptId,
      studentId,
      examId,
      mode,
      preventInfiniteLoops: preventInfiniteLoops !== false,
      updateMastery: updateMastery !== false,
    });

    res.json({
      success: true,
      data: result,
      message: `Retake submitted successfully in ${mode} mode`,
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error submitting retake:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit retake',
    });
  }
});

/**
 * POST /api/retake-submissions/submit-practice
 * Quick endpoint for practice mode submission
 */
router.post('/submit-practice', isAuthenticated, isStudent, async (req, res) => {
  try {
    const { attemptId, examId } = req.body;
    const studentId = (req as any).user.id;

    if (!attemptId || !examId) {
      return res.status(400).json({
        success: false,
        message: 'attemptId and examId are required',
      });
    }

    const result = await RetakeSubmissionService.submitRetakeExam({
      attemptId,
      studentId,
      examId,
      mode: 'practice',
      preventInfiniteLoops: true,
      updateMastery: true,
    });

    res.json({
      success: true,
      data: result,
      message: 'Practice retake submitted successfully',
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error submitting practice retake:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit practice retake',
    });
  }
});

/**
 * POST /api/retake-submissions/submit-graded
 * Quick endpoint for graded mode submission (teacher controlled)
 */
router.post('/submit-graded', isAuthenticated, async (req, res) => {
  try {
    const { attemptId, studentId, examId } = req.body;
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (!attemptId || !studentId || !examId) {
      return res.status(400).json({
        success: false,
        message: 'attemptId, studentId, and examId are required',
      });
    }

    // Check authorization
    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only submit their own retakes',
      });
    }

    const result = await RetakeSubmissionService.submitRetakeExam({
      attemptId,
      studentId,
      examId,
      mode: 'graded',
      preventInfiniteLoops: true,
      updateMastery: true,
    });

    res.json({
      success: true,
      data: result,
      message: 'Graded retake submitted successfully',
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error submitting graded retake:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit graded retake',
    });
  }
});

/**
 * GET /api/retake-submissions/history/:studentId
 * Get retake submission history for a student
 */
router.get('/history/:studentId', isAuthenticated, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { examId } = req.query;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own history',
      });
    }

    const history = await RetakeSubmissionService.getRetakeHistory(
      studentId,
      examId as string | undefined
    );

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retake history',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-submissions/mastery/:studentId
 * Get mastery progress for a student
 */
router.get('/mastery/:studentId', isAuthenticated, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own mastery progress',
      });
    }

    const mastery = await RetakeSubmissionService.getMasteryProgress(studentId);

    res.json({
      success: true,
      data: mastery,
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error fetching mastery:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch mastery progress',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-submissions/check-loop-protection/:studentId/:examId
 * Check if student can take another retake (infinite loop protection)
 */
router.get('/check-loop-protection/:studentId/:examId', isAuthenticated, async (req, res) => {
  try {
    const { studentId, examId } = req.params;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only check their own retake eligibility',
      });
    }

    // Get recent attempts to check current percentage
    const { db } = await import('../db/index.js');
    const { examAttempts } = await import('../db/schema.js');
    const { eq, and, desc } = await import('drizzle-orm');

    const recentAttempts = await db.query.examAttempts.findMany({
      where: and(
        eq(examAttempts.studentId, studentId),
        eq(examAttempts.examId, examId),
        eq(examAttempts.isRetake, true)
      ),
      orderBy: [desc(examAttempts.createdAt)],
      limit: 1,
    });

    const currentPercentage = recentAttempts[0]?.percentage || 0;

    // Import the service method dynamically
    const checkResult = await (RetakeSubmissionService as any).checkInfiniteLoopProtection(
      studentId,
      examId,
      currentPercentage
    );

    res.json({
      success: true,
      data: {
        canRetake: checkResult.allowed,
        reason: checkResult.reason,
        currentPercentage,
        attemptsCount: recentAttempts.length,
      },
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error checking loop protection:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check retake eligibility',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-submissions/stats/:examId
 * Get retake statistics for an exam (teacher view)
 */
router.get('/stats/:examId', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { examId } = req.params;

    const { db } = await import('../db/index.js');
    const { examAttempts } = await import('../db/schema.js');
    const { eq, and, sql } = await import('drizzle-orm');

    // Get all retake attempts for this exam
    const retakes = await db.query.examAttempts.findMany({
      where: and(
        eq(examAttempts.examId, examId),
        eq(examAttempts.isRetake, true)
      ),
    });

    const practiceRetakes = retakes.filter(r => (r as any).isPracticeMode).length;
    const gradedRetakes = retakes.filter(r => (r as any).gradedForRecord).length;

    const averageScore = retakes.length > 0
      ? retakes.reduce((sum, r) => sum + (r.percentage || 0), 0) / retakes.length
      : 0;

    const passRate = retakes.length > 0
      ? (retakes.filter(r => r.passed).length / retakes.length) * 100
      : 0;

    res.json({
      success: true,
      data: {
        examId,
        totalRetakes: retakes.length,
        practiceRetakes,
        gradedRetakes,
        averageScore: Math.round(averageScore * 100) / 100,
        passRate: Math.round(passRate * 100) / 100,
      },
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retake statistics',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-submissions/config
 * Get retake submission configuration
 */
router.get('/config', isAuthenticated, async (req, res) => {
  try {
    const config = {
      modes: {
        practice: {
          description: 'For learning and improvement - does not affect grade',
          features: [
            'Immediate feedback on mistakes',
            'Mastery tracking updates',
            'No grade impact',
            'Unlimited attempts (with cooldown)',
          ],
        },
        graded: {
          description: 'Counts toward final grade - teacher must enable',
          features: [
            'Replaces or averages with original score',
            'Limited attempts',
            'Mastery tracking updates',
            'Recorded in gradebook',
          ],
        },
      },
      infiniteLoopProtection: {
        enabled: true,
        maxConsecutiveRetakes: 5,
        cooldownHours: 24,
        requireImprovement: true,
        minImprovementPercentage: 5,
      },
      masteryLevels: {
        beginner: '0-49% correct',
        developing: '50-74% correct',
        proficient: '75-89% correct',
        mastered: '90-100% correct',
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[RETAKE SUBMISSION API] Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
      error: error.message,
    });
  }
});

export default router;
