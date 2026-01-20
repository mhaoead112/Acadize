import { Router } from 'express';
import { RetakeExamGeneratorService } from '../services/retake-exam-generator.service.js';
import { AnswerEvaluationService } from '../services/answer-evaluation.service.js';
import { isAuthenticated, isStudent, isTeacher } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * POST /api/retake-exams/generate
 * Generate a mistake-based retake exam for a student
 * Student can request for themselves, or teacher can generate for student
 */
router.post('/generate', isAuthenticated, async (req, res) => {
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

    if (requesterRole === 'student' && requesterId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Students can only generate retakes for themselves',
      });
    }

    // Generate retake
    const retakeExam = await RetakeExamGeneratorService.generateRetakeExam(
      {
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
      constraints
    );

    res.json({
      success: true,
      data: retakeExam,
      message: 'Retake exam generated successfully',
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
router.get('/preview', isAuthenticated, async (req, res) => {
  try {
    const { studentId, examId, topic } = req.query;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

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
router.get('/eligibility', isAuthenticated, async (req, res) => {
  try {
    const { studentId, examId } = req.query;

    // Authorization check
    const requesterId = (req as any).user.id;
    const requesterRole = (req as any).user.role;

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
router.post('/track-resolution', isAuthenticated, isTeacher, async (req, res) => {
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
router.post('/grade-and-track/:attemptId', isAuthenticated, isTeacher, async (req, res) => {
  try {
    const { attemptId } = req.params;

    // Step 1: Grade the attempt
    const gradingResult = await AnswerEvaluationService.gradeAttempt(attemptId);

    // Step 2: Fetch attempt to get student ID
    const { db } = await import('../db/index.js');
    const { examAttempts } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');
    
    const attempt = await db.query.examAttempts.findFirst({
      where: eq(examAttempts.id, attemptId),
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    // Step 3: Extract graded answers
    const gradedAnswers = gradingResult.gradedAnswers.map(answer => ({
      questionId: answer.answerId, // Map to question ID
      isCorrect: answer.isCorrect,
    }));

    // Step 4: Track mistake resolution
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
router.get('/student/:studentId/history', isAuthenticated, async (req, res) => {
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
