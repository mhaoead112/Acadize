import { Router } from 'express';
import { RetakeExamGeneratorService } from '../services/retake-exam-generator.service.js';
import { AnswerEvaluationService } from '../services/answer-evaluation.service.js';
import { isAuthenticated, isTeacher } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { db } from '../db/index.js';
import { exams, examAttempts } from '../db/schema.js';
import { eq } from 'drizzle-orm';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

const router = Router();

/**
 * POST /api/retake-exams/generate
 * Generate a mistake-based retake exam for a student
 * Student can request for themselves, or teacher can generate for student
 */
router.post('/generate', ...requireAuth, async (req, res) => {
  try {
    const {
      studentId,
      examId,
      topic,
      minRepetitions,
      includePartialCredit,
      useIsomorphicVariants,
      maxQuestions,
      difficultyBalance,
      timeLimit,
      shuffleQuestions,
      constraints,
    } = req.body;

    // Authorization: students can only generate for themselves
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;
    const requesterOrgId: string = (req as any).user.organizationId;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only generate retakes for themselves',
      });
    }

    // ── Tenant isolation: verify the exam belongs to the requester's org ──
    if (examId) {
      const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId) });
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      if (exam.organizationId !== requesterOrgId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: exam does not belong to your organization',
        });
      }
    }

    // Generate retake via Queue
    const { enqueueJob } = await import('../jobs/index.js');
    const jobId = await enqueueJob('retake_generation', {
      type: 'generator',
      generatorOptions: {
        studentId,
        examId,
        topic,
        minRepetitions,
        includePartialCredit,
        useIsomorphicVariants: useIsomorphicVariants !== false, // Default true
        maxQuestions,
        difficultyBalance,
        timeLimit,
        shuffleQuestions,
      },
      generatorConstraints: constraints
    });

    res.status(202).json({
      success: true,
      jobId, // Client should either poll or wait for push notifications
      message: 'Retake exam generation queued',
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error generating retake:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate retake exam',
    });
  }
});

/**
 * GET /api/retake-exams/preview
 * Preview retake eligibility and mistake statistics
 * Does not create an exam instance
 */
router.get('/preview', ...requireAuth, async (req, res) => {
  try {
    const { studentId, examId, topic } = req.query;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;
    const requesterOrgId: string = (req as any).user.organizationId;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only preview their own retakes',
      });
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    // ── Tenant isolation ─────────────────────────────────────────────────────
    if (examId) {
      const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId as string) });
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      if (exam.organizationId !== requesterOrgId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: exam does not belong to your organization',
        });
      }
    }

    const preview = await RetakeExamGeneratorService.getRetakePreview(
      studentId as string,
      examId as string | undefined,
      topic as string | undefined
    );

    res.json({
      success: true,
      data: preview,
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error generating preview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate retake preview',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-exams/eligibility
 * Check if student is eligible for retake
 */
router.get('/eligibility', ...requireAuth, async (req, res) => {
  try {
    const { studentId, examId } = req.query;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;
    const requesterOrgId: string = (req as any).user.organizationId;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only check their own eligibility',
      });
    }

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'studentId is required',
      });
    }

    // ── Tenant isolation ─────────────────────────────────────────────────────
    if (examId) {
      const exam = await db.query.exams.findFirst({ where: eq(exams.id, examId as string) });
      if (!exam) {
        return res.status(404).json({ success: false, message: 'Exam not found' });
      }
      if (exam.organizationId !== requesterOrgId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: exam does not belong to your organization',
        });
      }
    }

    const eligibility = await RetakeExamGeneratorService.checkRetakeEligibility(
      studentId as string,
      examId as string | undefined
    );

    res.json({
      success: true,
      data: eligibility,
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error checking eligibility:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check eligibility',
      error: error.message,
    });
  }
});

/**
 * POST /api/retake-exams/track-resolution
 * Track mistake resolution after retake attempt is graded
 * Teacher/System use only
 */
router.post('/track-resolution', ...requireAuth, isTeacher, async (req, res) => {
  try {
    const { studentId, retakeAttemptId, gradedAnswers } = req.body;

    if (!studentId || !retakeAttemptId || !gradedAnswers) {
      return res.status(400).json({
        success: false,
        message: 'studentId, retakeAttemptId, and gradedAnswers are required',
      });
    }

    const resolutions = await RetakeExamGeneratorService.trackMistakeResolution(
      studentId,
      retakeAttemptId,
      gradedAnswers
    );

    res.json({
      success: true,
      data: {
        totalMistakes: resolutions.length,
        resolved: resolutions.filter(r => r.resolved).length,
        unresolved: resolutions.filter(r => !r.resolved).length,
        resolutions,
      },
      message: 'Mistake resolution tracked successfully',
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error tracking resolution:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to track mistake resolution',
      error: error.message,
    });
  }
});

/**
 * POST /api/retake-exams/grade-and-track
 * Combined endpoint: Grade retake attempt and track mistake resolution
 * Teacher/System use only
 */
router.post('/grade-and-track/:attemptId', ...requireAuth, isTeacher, async (req, res) => {
  try {
    const { attemptId } = req.params;
    const requesterOrgId: string = (req as any).user.organizationId;

    // ── Tenant isolation: verify attempt belongs to requester's org ───────────
    const attempt = await db.query.examAttempts.findFirst({
      where: eq(examAttempts.id, attemptId),
      with: { exam: { columns: { organizationId: true } } } as any,
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Exam attempt not found' });
    }

    // Resolve organizationId via exam FK join
    const examRecord = await db.query.exams.findFirst({
      where: eq(exams.id, (attempt as any).examId),
      columns: { organizationId: true },
    });

    if (!examRecord || examRecord.organizationId !== requesterOrgId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: attempt does not belong to your organization',
      });
    }

    // Step 1: Grade the attempt
    const gradingResult = await AnswerEvaluationService.gradeAttempt(attemptId);

    // Step 2: Extract graded answers
    const gradedAnswers = gradingResult.gradedAnswers.map(answer => ({
      questionId: answer.answerId, // Map to question ID
      isCorrect: answer.isCorrect,
    }));

    // Step 3: Track mistake resolution
    const resolutions = await RetakeExamGeneratorService.trackMistakeResolution(
      attempt.studentId,
      attemptId,
      gradedAnswers
    );

    res.json({
      success: true,
      data: {
        gradingResult,
        mistakeResolution: {
          totalMistakes: resolutions.length,
          resolved: resolutions.filter(r => r.resolved).length,
          unresolved: resolutions.filter(r => !r.resolved).length,
          resolutions,
        },
      },
      message: 'Retake attempt graded and mistakes tracked successfully',
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error grading and tracking:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to grade and track retake attempt',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-exams/student/:studentId/history
 * Get retake attempt history for a student
 * Teacher or student (self) only
 */
router.get('/student/:studentId/history', ...requireAuth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only view their own history',
      });
    }

    // Fetch retake attempts (placeholder - would need to query exam attempts)
    // This is a simplified version
    const history = {
      studentId,
      totalRetakes: 0,
      completedRetakes: 0,
      mistakesResolved: 0,
      mistakesUnresolved: 0,
      message: 'Retake history feature coming soon',
    };

    res.json({
      success: true,
      data: history,
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error fetching history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retake history',
      error: error.message,
    });
  }
});

/**
 * GET /api/retake-exams/config
 * Get default retake generation configuration
 * Teacher only
 */
router.get('/config', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const config = {
      generatorOptions: {
        minRepetitions: 1,
        includePartialCredit: true,
        useIsomorphicVariants: true,
        maxQuestions: 50,
        difficultyBalance: 'adaptive',
        timeLimit: null, // Auto-calculated
        shuffleQuestions: true,
      },
      teacherConstraints: {
        maxRetakeAttempts: 3,
        cooldownPeriodHours: 24,
        mustPassOriginalFirst: false,
        minQuestionsRequired: 5,
        maxQuestionsAllowed: 50,
        passingScoreOverride: 70,
        enableAntiCheat: false, // Always disabled for retakes
      },
      difficultyModes: {
        easy: 'All questions set to easy difficulty',
        medium: 'All questions set to medium difficulty',
        hard: 'All questions set to hard difficulty',
        adaptive: 'Questions one level easier than original (recommended)',
      },
      learningMode: {
        enabled: true,
        description: 'Retakes are always in learning mode',
        features: [
          'No anti-cheat escalation',
          'No access to original answers',
          'Progress tracking enabled',
          'Immediate feedback available',
        ],
      },
    };

    res.json({
      success: true,
      data: config,
    });
  } catch (error: any) {
    console.error('[RETAKE API] Error fetching config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch configuration',
      error: error.message,
    });
  }
});

export default router;
