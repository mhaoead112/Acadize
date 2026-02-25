import express, { Request, Response, Router } from 'express';
import { isAuthenticated, isStudent, isTeacher } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import AnswerEvaluationService from '../services/answer-evaluation.service.js';

const router: Router = express.Router();

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

// ============================================================================
// STUDENT ENDPOINTS (No correct answers exposed)
// ============================================================================

/**
 * GET /api/mistakes/my-summary
 * Get student's overall mistake summary
 * 
 * Returns aggregated statistics WITHOUT correct answers
 */
router.get(
  '/my-summary',
  ...requireAuth,
  isStudent,
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;

      const summary = await AnswerEvaluationService.getStudentMistakesSummary(studentId);

      res.json({
        summary,
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error fetching summary:', error);

      res.status(500).json({
        error: 'Failed to fetch mistake summary',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/mistakes/by-topic/:topic
 * Get student's mistakes for a specific topic
 * 
 * Returns mistake details WITHOUT correct answers
 */
router.get(
  '/by-topic/:topic',
  ...requireAuth,
  isStudent,
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;
      const { topic } = req.params;

      const mistakes = await AnswerEvaluationService.getStudentMistakesByTopic(
        studentId,
        decodeURIComponent(topic)
      );

      res.json({
        mistakes,
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error fetching topic mistakes:', error);

      res.status(500).json({
        error: 'Failed to fetch mistakes by topic',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/mistakes/persistent
 * Get student's persistent mistakes (repeated 3+ times)
 * 
 * Used for targeted remediation recommendations
 */
router.get(
  '/persistent',
  ...requireAuth,
  isStudent,
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;

      const persistentMistakes = await AnswerEvaluationService.getPersistentMistakes(studentId);

      res.json({
        persistentMistakes,
        total: persistentMistakes.length,
        recommendation: persistentMistakes.length > 0
          ? 'Consider taking a retake exam to address these recurring mistakes.'
          : 'No persistent mistakes found. Keep up the good work!',
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error fetching persistent mistakes:', error);

      res.status(500).json({
        error: 'Failed to fetch persistent mistakes',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

// ============================================================================
// TEACHER/ADMIN ENDPOINTS (Grading & Mistake Management)
// ============================================================================

/**
 * POST /api/mistakes/grade-attempt/:attemptId
 * Grade an exam attempt and extract mistakes
 * 
 * Teacher/Admin only
 */
router.post(
  '/grade-attempt/:attemptId',
  ...requireAuth,
  isTeacher,
  async (req: Request, res: Response) => {
    try {
      const { attemptId } = req.params;

      // Step 1: Grade the attempt
      const gradingResult = await AnswerEvaluationService.gradeAttempt(attemptId);

      // Step 2: Extract mistakes
      const mistakeResult = await AnswerEvaluationService.extractMistakes(attemptId);

      res.json({
        grading: {
          attemptId: gradingResult.attemptId,
          totalScore: gradingResult.totalScore,
          maxScore: gradingResult.maxScore,
          percentage: gradingResult.percentage,
          passed: gradingResult.passed,
          requiresManualGrading: gradingResult.requiresManualGrading,
          gradedAnswersCount: gradingResult.gradedAnswers.length,
        },
        mistakes: {
          totalMistakes: mistakeResult.totalMistakes,
          newMistakes: mistakeResult.newMistakes,
          repeatedMistakes: mistakeResult.repeatedMistakes,
        },
        message: gradingResult.requiresManualGrading
          ? 'Grading complete. Some answers require manual grading.'
          : 'Grading complete. All answers auto-graded.',
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error grading attempt:', error);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          error: 'Exam attempt not found',
        });
      }

      res.status(500).json({
        error: 'Failed to grade exam attempt',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/mistakes/mark-for-retake
 * Mark specific mistakes for inclusion in retake exam
 * 
 * Student can mark their own mistakes for remediation
 */
router.post(
  '/mark-for-retake',
  ...requireAuth,
  isStudent,
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;
      const { questionIds } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          error: 'questionIds must be a non-empty array',
        });
      }

      const updatedCount = await AnswerEvaluationService.markMistakesForRetake(
        studentId,
        questionIds
      );

      res.json({
        message: 'Mistakes marked for retake',
        updatedCount,
        questionIds,
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error marking mistakes for retake:', error);

      res.status(500).json({
        error: 'Failed to mark mistakes for retake',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/mistakes/mark-remediated
 * Mark mistakes as remediated (student passed retake)
 * 
 * Called automatically after successful retake
 */
router.post(
  '/mark-remediated',
  ...requireAuth,
  isStudent,
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;
      const { questionIds } = req.body;

      if (!Array.isArray(questionIds) || questionIds.length === 0) {
        return res.status(400).json({
          error: 'questionIds must be a non-empty array',
        });
      }

      const updatedCount = await AnswerEvaluationService.markMistakesAsRemediated(
        studentId,
        questionIds
      );

      res.json({
        message: 'Mistakes marked as remediated',
        updatedCount,
        questionIds,
      });

    } catch (error: any) {
      console.error('[MISTAKES API] Error marking mistakes as remediated:', error);

      res.status(500).json({
        error: 'Failed to mark mistakes as remediated',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

export default router;
