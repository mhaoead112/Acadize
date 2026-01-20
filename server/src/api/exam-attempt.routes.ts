// server/src/api/exam-attempt.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { ExamAttemptService } from '../services/exam-attempt.service.js';
import { eq } from 'drizzle-orm';

const router = express.Router();

// =====================================================
// MIDDLEWARE
// =====================================================

/**
 * Middleware to ensure the authenticated user is a student
 */
const isStudent = (req: Request, res: Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
  }

  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Forbidden: Student access required.' });
  }

  next();
};

// =====================================================
// EXAM ATTEMPT LIFECYCLE ENDPOINTS
// =====================================================

/**
 * GET /api/exam-attempts/my-attempts
 * Get all exam attempts for the authenticated student
 * 
 * Response: 200 OK
 * [
 *   { id, examId, status, startedAt, submittedAt, score, ... }
 * ]
 */
router.get('/my-attempts', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;
    const { desc } = await import('drizzle-orm');
    const { db } = await import('../db/index.js');
    const { examAttempts } = await import('../db/schema.js');

    const attempts = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.studentId, studentId))
      .orderBy(desc(examAttempts.startedAt));

    res.status(200).json(attempts);
  } catch (error) {
    console.error('Error fetching student attempts:', error);
    res.status(500).json({ message: 'Failed to fetch exam attempts.' });
  }
});

/**
 * POST /api/exam-attempts/start
 * Start a new exam attempt
 * 
 * State Transition: NULL → IN_PROGRESS
 * 
 * Request Body:
 * {
 *   examId: string (required)
 *   consent: boolean (required)
 *   deviceInfo: {
 *     userAgent: string
 *     screenResolution: string
 *     browser: string
 *     os: string
 *   }
 * }
 * 
 * Response: 201 Created
 * {
 *   attempt: {
 *     id: string
 *     examId: string
 *     studentId: string
 *     attemptNumber: number
 *     status: 'in_progress'
 *     startedAt: string
 *     expiresAt: string
 *   }
 *   examSnapshot: {
 *     title: string
 *     duration: number
 *     timeLimit: number
 *     totalPoints: number
 *     questions: []
 *     antiCheatSettings: {}
 *   }
 *   expiresAt: string
 * }
 */
router.post('/start', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { examId, consent, deviceInfo } = req.body;

    if (!examId) {
      return res.status(400).json({ message: 'examId is required.' });
    }

    if (consent !== true) {
      return res.status(400).json({
        message: 'You must consent to exam monitoring and recording to proceed.'
      });
    }

    // Get IP address
    const ipAddress = req.ip ||
      req.headers['x-forwarded-for'] as string ||
      req.socket.remoteAddress;

    // Start attempt
    const result = await ExamAttemptService.startExamAttempt({
      examId,
      studentId: req.user!.id,
      ipAddress,
      userAgent: req.headers['user-agent'],
      deviceFingerprint: deviceInfo?.fingerprint,
      browserInfo: deviceInfo ? {
        name: deviceInfo.browser || 'unknown',
        version: deviceInfo.browserVersion || 'unknown',
        os: deviceInfo.os || 'unknown',
        screenResolution: deviceInfo.screenResolution || 'unknown',
      } : undefined
    });

    res.status(201).json({
      message: 'Exam attempt started successfully.',
      attempt: {
        id: result.attempt.id,
        examId: result.attempt.examId,
        studentId: result.attempt.studentId,
        attemptNumber: result.attempt.attemptNumber,
        status: result.attempt.status,
        startedAt: result.attempt.startedAt,
        timeRemaining: result.attempt.timeRemaining,
      },
      examSnapshot: result.examSnapshot,
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    console.error('Error starting exam attempt:', error);
    res.status(400).json({ message: error.message || 'Failed to start exam attempt.' });
  }
});

/**
 * POST /api/exam-attempts/:attemptId/save-answer
 * Auto-save a single answer
 * 
 * State: IN_PROGRESS (no state change)
 * 
 * Request Body:
 * {
 *   questionId: string (required)
 *   answer: any (required)
 *   timeSpent: number (optional, seconds)
 * }
 * 
 * Response: 200 OK
 * {
 *   success: true
 *   savedAt: string
 * }
 */
router.post('/:attemptId/save-answer', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { questionId, answer, timeSpent } = req.body;

    if (!questionId) {
      return res.status(400).json({ message: 'questionId is required.' });
    }

    const result = await ExamAttemptService.saveAnswer({
      attemptId,
      questionId,
      answer,
      timeSpent,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error saving answer:', error);
    res.status(400).json({ message: error.message || 'Failed to save answer.' });
  }
});

/**
 * POST /api/exam-attempts/:attemptId/submit
 * Submit the exam
 * 
 * State Transition: IN_PROGRESS → SUBMITTED
 * 
 * Request Body:
 * {
 *   timeRemaining: number (optional)
 *   finalAnswers: Array<{ questionId: string, answer: any }> (optional)
 * }
 * 
 * Response: 200 OK
 * {
 *   attemptId: string
 *   submittedAt: string
 *   status: 'submitted'
 *   processingJobId: string
 *   message: string
 * }
 */
router.post('/:attemptId/submit', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { timeRemaining, finalAnswers } = req.body;

    const result = await ExamAttemptService.submitExam({
      attemptId,
      studentId: req.user!.id,
      timeRemaining,
      finalAnswers,
    });

    res.status(200).json({
      ...result,
      message: 'Exam submitted successfully. Your answers are being processed.',
    });
  } catch (error: any) {
    console.error('Error submitting exam:', error);
    res.status(400).json({ message: error.message || 'Failed to submit exam.' });
  }
});

/**
 * GET /api/exam-attempts/:attemptId/reconnect
 * Reconnect to an ongoing exam attempt
 * 
 * State: IN_PROGRESS (resume)
 * 
 * Response: 200 OK
 * {
 *   attempt: {}
 *   examSnapshot: {}
 *   answers: []
 *   timeRemaining: number
 *   expiresAt: string
 * }
 */
router.get('/:attemptId/reconnect', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;

    const ipAddress = req.ip ||
      req.headers['x-forwarded-for'] as string ||
      req.socket.remoteAddress;

    const result = await ExamAttemptService.handleReconnect({
      attemptId,
      studentId: req.user!.id,
      ipAddress,
    });

    res.status(200).json(result);
  } catch (error: any) {
    console.error('Error reconnecting to exam:', error);
    res.status(400).json({ message: error.message || 'Failed to reconnect to exam.' });
  }
});

/**
 * GET /api/exam-attempts/:attemptId
 * Get attempt details (for review after submission)
 * 
 * Response: 200 OK
 * {
 *   id: string
 *   status: string
 *   score: number
 *   percentage: number
 *   passed: boolean
 *   submittedAt: string
 *   flaggedForReview: boolean
 * }
 */
router.get('/:attemptId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const studentId = req.user?.id;

    if (!attemptId || !studentId) {
      return res.status(400).json({ message: 'Missing required parameters.' });
    }

    // Fetch attempt details with exam info and questions
    const { db } = await import('../db/index.js');
    const { examAttempts, exams, examQuestions } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    // Get attempt
    const attempt = await db
      .select()
      .from(examAttempts)
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attempt || attempt.length === 0) {
      return res.status(404).json({ message: 'Exam attempt not found.' });
    }

    const attemptRecord = attempt[0];

    // Verify ownership
    if (attemptRecord.studentId !== studentId) {
      return res.status(403).json({ message: 'Forbidden: Cannot access this attempt.' });
    }

    // Get exam details
    const examList = await db
      .select()
      .from(exams)
      .where(eq(exams.id, attemptRecord.examId))
      .limit(1);

    if (!examList || examList.length === 0) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    const exam = examList[0];

    // Get questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, exam.id))
      .orderBy(examQuestions.order);

    res.status(200).json({
      attempt: attemptRecord,
      exam: {
        id: exam.id,
        title: exam.title,
        duration: exam.duration,
        totalPoints: exam.totalPoints,
        passingScore: exam.passingScore,
        antiCheatEnabled: exam.antiCheatEnabled,
      },
      questions: questions.map(q => ({
        id: q.id,
        questionType: q.questionType,
        questionText: q.questionText,
        options: q.options || [],
        points: q.points,
        order: q.order,
      })),
      answers: {}, // Initialize empty answers
    });
  } catch (error: any) {
    console.error('Error fetching attempt:', error);
    res.status(400).json({ message: error.message || 'Failed to fetch attempt.' });
  }
});

/**
 * PATCH /api/exam-attempts/:attemptId/answers
 * Alias for save-answer (PATCH instead of POST)
 */
router.patch('/:attemptId/answers', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ message: 'answers object is required.' });
    }

    // Save all answers from the dictionary
    const { db } = await import('../db/index.js');
    const { examAnswers } = await import('../db/schema.js');
    const { eq, and } = await import('drizzle-orm');

    for (const [questionId, answer] of Object.entries(answers)) {
      await db
        .update(examAnswers)
        .set({
          answer: answer as any,
          updatedAt: new Date(),
        } as any)
        .where(
          and(
            eq(examAnswers.attemptId, attemptId),
            eq(examAnswers.questionId, questionId)
          )
        );
    }

    res.status(200).json({ message: 'Answers saved successfully.' });
  } catch (error: any) {
    console.error('Error saving answers:', error);
    res.status(400).json({ message: error.message || 'Failed to save answers.' });
  }
});

/**
 * POST /api/exam-attempts/:attemptId/events
 * Log anti-cheat events during exam
 */
router.post('/:attemptId/events', isAuthenticated, isStudent, async (req: Request, res: Response) => {
  try {
    const { attemptId } = req.params;
    const { eventType, severity, description, metadata } = req.body;

    if (!eventType || !severity) {
      return res.status(400).json({ message: 'eventType and severity are required.' });
    }

    const { db } = await import('../db/index.js');
    const { antiCheatEvents } = await import('../db/schema.js');
    const { createId } = await import('@paralleldrive/cuid2');

    await db.insert(antiCheatEvents).values({
      id: createId(),
      attemptId,
      eventType,
      severity,
      description,
      metadata: metadata || {},
      createdAt: new Date(),
    } as any);

    res.status(201).json({ message: 'Event logged successfully.' });
  } catch (error: any) {
    console.error('Error logging event:', error);
    res.status(400).json({ message: error.message || 'Failed to log event.' });
  }
});

/**
 * GET /api/exam-attempts/:attemptId/review
 * Get attempt data with anti-cheat events and risk analysis for teacher review
 * 
 * Response: 200 OK
 * {
 *   attempt: { id, examId, studentId, status, score, ... },
 *   student: { id, fullName, email },
 *   exam: { id, title, duration, ... },
 *   riskScore: { overall: 0-100, level: 'low'|'medium'|'high', ... },
 *   events: [{ id, eventType, severity, description, timestamp, ... }],
 *   statistics: { focusLossCount, tabSwitchCount, totalEvents, ... }
 * }
 */
router.get('/:attemptId/review', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const userId = req.user!.id;
    const userRole = req.user!.role;

    const { db } = await import('../db/index.js');
    const { examAttempts, exams, users, courses, antiCheatEvents, antiCheatRiskScores, examQuestions, examAnswers } = await import('../db/schema.js');
    const { desc, eq } = await import('drizzle-orm');

    // Fetch attempt with related data
    const [attemptData] = await db
      .select({
        attempt: examAttempts,
        student: {
          id: users.id,
          fullName: users.fullName,
          email: users.email,
        },
        exam: {
          id: exams.id,
          title: exams.title,
          duration: exams.duration,
          totalPoints: exams.totalPoints,
          courseId: exams.courseId,
        },
      })
      .from(examAttempts)
      .innerJoin(users, eq(examAttempts.studentId, users.id))
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attemptData) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    // Verify teacher owns the course (or is admin)
    if (userRole !== 'admin') {
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, attemptData.exam.courseId))
        .limit(1);

      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: 'Forbidden: Access denied.' });
      }
    }

    // Fetch anti-cheat events
    const events = await db
      .select()
      .from(antiCheatEvents)
      .where(eq(antiCheatEvents.attemptId, attemptId))
      .orderBy(desc(antiCheatEvents.timestamp));

    // Fetch risk score
    const [riskData] = await db
      .select()
      .from(antiCheatRiskScores)
      .where(eq(antiCheatRiskScores.attemptId, attemptId))
      .limit(1);

    // Calculate statistics (align with defined event types)
    const statistics = {
      totalEvents: events.length,
      focusLossCount: events.filter(e => e.eventType === 'window_blur').length,
      tabSwitchCount: events.filter(e => e.eventType === 'tab_switch').length,
      copyAttemptCount: events.filter(e => e.eventType === 'copy_paste').length,
      fullscreenExitCount: events.filter(e => e.eventType === 'fullscreen_exit').length,
      highSeverityCount: events.filter(e => e.severity === 'high').length,
      mediumSeverityCount: events.filter(e => e.severity === 'medium').length,
      lowSeverityCount: events.filter(e => e.severity === 'low').length,
    };

    // Determine risk level based on score
    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    const overallRisk = riskData?.overallRiskScore || 0;
    if (overallRisk >= 70) riskLevel = 'high';
    else if (overallRisk >= 40) riskLevel = 'medium';

    const riskScore = {
      overall: overallRisk,
      level: riskLevel,
      // Core breakdown from schema
      behaviorScore: riskData?.behaviorScore || 0,
      timingScore: riskData?.timingScore || 0,
      deviceScore: riskData?.deviceScore || 0,
      biometricScore: riskData?.biometricScore || 0,
      patternScore: riskData?.patternScore || 0,
      // Compatibility fields expected by client UI
      environmentScore: riskData?.deviceScore || 0,
      performanceScore: riskData?.timingScore || 0,
    };

    // Fetch student answers joined with question details
    const rawAnswers = await db
      .select({
        answerId: examAnswers.id,
        questionId: examAnswers.questionId,
        response: examAnswers.answer,
        isCorrect: examAnswers.isCorrect,
        pointsAwarded: examAnswers.pointsAwarded,
        pointsPossible: examAnswers.pointsPossible,
        feedback: examAnswers.feedback,
        questionText: examQuestions.questionText,
        questionType: examQuestions.questionType,
        maxPoints: examQuestions.points,
        options: examQuestions.options,
        correctAnswer: examQuestions.correctAnswer,
        difficulty: examQuestions.difficultyLevel,
      })
      .from(examAnswers)
      .innerJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
      .where(eq(examAnswers.attemptId, attemptId));

    const studentAnswers = rawAnswers.map(a => {
      let displayResponse: any = a.response;
      if ((a.questionType === 'multiple_choice' || a.questionType === 'true_false') && Array.isArray(a.options)) {
        // Map numeric index or id to option text for readability
        if (typeof a.response === 'number' && a.options[a.response] !== undefined) {
          const opt = a.options[a.response] as any;
          displayResponse = opt?.text ?? opt?.label ?? opt?.value ?? opt?.id ?? a.response;
        } else if (typeof a.response === 'string') {
          const low = String(a.response).trim().toLowerCase();
          const found = (a.options as any[]).find(o => {
            const id = String(o.id ?? '').trim().toLowerCase();
            const txt = String(o.text ?? o.label ?? o.value ?? '').trim().toLowerCase();
            return id === low || txt === low;
          });
          displayResponse = found ? (found.text ?? found.label ?? found.value ?? found.id) : a.response;
        }
      } else if (a.questionType === 'short_answer' || a.questionType === 'fill_blank') {
        if (a.response && typeof a.response === 'object') {
          displayResponse = (a.response as any).text ?? (a.response as any).value ?? (a.response as any).answer ?? a.response;
        }
      }

      return {
        answerId: a.answerId,
        questionId: a.questionId,
        questionText: a.questionText,
        questionType: a.questionType,
        studentResponse: displayResponse,
        isCorrect: a.isCorrect,
        pointsAwarded: a.pointsAwarded ?? 0,
        maxPoints: a.pointsPossible ?? a.maxPoints ?? 0,
        feedback: a.feedback || null,
        modelAnswer: a.correctAnswer,
        difficulty: a.difficulty || 'medium',
      };
    });

    res.status(200).json({
      attempt: attemptData.attempt,
      student: attemptData.student,
      exam: attemptData.exam,
      riskScore,
      events,
      statistics,
      answers: studentAnswers,
    });
  } catch (error) {
    console.error('Error fetching attempt review:', error);
    res.status(500).json({ message: 'Failed to fetch attempt review.' });
  }
});

/**
 * POST /api/exam-attempts/:attemptId/decision
 * Teacher decision on attempt validity
 * 
 * Request Body:
 * {
 *   decision: 'valid' | 'invalid' | 'allow_retake',
 *   notes?: string
 * }
 * 
 * Response: 200 OK
 * {
 *   message: string,
 *   attempt: { ...updated attempt }
 * }
 */
router.post('/:attemptId/decision', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { decision, notes } = req.body;

    if (!['valid', 'invalid', 'allow_retake'].includes(decision)) {
      return res.status(400).json({ message: 'Invalid decision type.' });
    }

    const { db } = await import('../db/index.js');
    const { examAttempts, exams, courses } = await import('../db/schema.js');

    // Fetch attempt
    const [attemptData] = await db
      .select({
        attempt: examAttempts,
        exam: {
          id: exams.id,
          courseId: exams.courseId,
        },
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attemptData) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    // Verify teacher owns the course (or is admin)
    if (userRole !== 'admin') {
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, attemptData.exam.courseId))
        .limit(1);

      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: 'Forbidden: Access denied.' });
      }
    }

    // Update attempt based on decision
    let updateData: any = {
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNotes: notes || null,
    };

    if (decision === 'valid') {
      updateData.flaggedForReview = false;
      updateData.reviewStatus = 'approved';
    } else if (decision === 'invalid') {
      updateData.flaggedForReview = true;
      updateData.reviewStatus = 'rejected';
      updateData.score = null;
      updateData.percentage = null;
      updateData.passed = null;
    } else if (decision === 'allow_retake') {
      updateData.flaggedForReview = false;
      updateData.reviewStatus = 'retake_granted';
      // Note: Actual retake logic would need to create a new attempt
    }

    const [updatedAttempt] = await db
      .update(examAttempts)
      .set(updateData)
      .where(eq(examAttempts.id, attemptId))
      .returning();

    // Audit log
    console.log(`[AUDIT] Attempt ${attemptId} decision: ${decision} by user: ${userId} (${userRole})`);

    res.status(200).json({
      message: `Attempt marked as ${decision}.`,
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Error processing attempt decision:', error);
    res.status(500).json({ message: 'Failed to process decision.' });
  }
});

/**
 * PATCH /api/exam-attempts/:attemptId/adjust-score
 * Adjust individual question score
 * 
 * Request Body:
 * {
 *   questionId: string,
 *   newScore: number,
 *   feedback?: string
 * }
 * 
 * Response: 200 OK
 * {
 *   message: string,
 *   answer: { ...updated answer }
 * }
 */
router.patch('/:attemptId/adjust-score', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { questionId, newScore, feedback } = req.body;

    if (!questionId || newScore === undefined) {
      return res.status(400).json({ message: 'questionId and newScore are required.' });
    }

    const { db } = await import('../db/index.js');
    const { examAttempts, exams, courses, examAnswers } = await import('../db/schema.js');
    const { and } = await import('drizzle-orm');

    // Fetch attempt and verify permissions
    const [attemptData] = await db
      .select({
        attempt: examAttempts,
        exam: {
          id: exams.id,
          courseId: exams.courseId,
        },
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attemptData) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    // Verify teacher owns the course (or is admin)
    if (userRole !== 'admin') {
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, attemptData.exam.courseId))
        .limit(1);

      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: 'Forbidden: Access denied.' });
      }
    }

    // Update the answer score
    const [updatedAnswer] = await db
      .update(examAnswers)
      .set({
        pointsAwarded: newScore,
        feedback: feedback || null,
        gradedAt: new Date(),
        gradedBy: userId,
      })
      .where(
        and(
          eq(examAnswers.attemptId, attemptId),
          eq(examAnswers.questionId, questionId)
        )
      )
      .returning();

    if (!updatedAnswer) {
      return res.status(404).json({ message: 'Answer not found.' });
    }

    // Recalculate total score for the attempt
    const allAnswers = await db
      .select()
      .from(examAnswers)
      .where(eq(examAnswers.attemptId, attemptId));

    const totalScore = allAnswers.reduce((sum, ans) => sum + (ans.pointsAwarded || 0), 0);
    const totalPossible = allAnswers.reduce((sum, ans) => sum + (ans.pointsPossible || 0), 0);
    const percentage = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

    // Update attempt with new totals
    await db
      .update(examAttempts)
      .set({
        score: totalScore,
        percentage: percentage,
      })
      .where(eq(examAttempts.id, attemptId));

    console.log(`[AUDIT] Score adjusted for attempt ${attemptId}, question ${questionId}: ${newScore} by user: ${userId}`);

    res.status(200).json({
      message: 'Score adjusted successfully.',
      answer: updatedAnswer,
      totalScore,
      percentage,
    });
  } catch (error) {
    console.error('Error adjusting score:', error);
    res.status(500).json({ message: 'Failed to adjust score.' });
  }
});

/**
 * POST /api/exam-attempts/:attemptId/feedback
 * Submit general feedback for an attempt
 * 
 * Request Body:
 * {
 *   feedback: string
 * }
 * 
 * Response: 200 OK
 * {
 *   message: string,
 *   attempt: { ...updated attempt }
 * }
 */
router.post('/:attemptId/feedback', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const attemptId = req.params.attemptId;
    const userId = req.user!.id;
    const userRole = req.user!.role;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({ message: 'Feedback is required.' });
    }

    const { db } = await import('../db/index.js');
    const { examAttempts, exams, courses } = await import('../db/schema.js');

    // Fetch attempt and verify permissions
    const [attemptData] = await db
      .select({
        attempt: examAttempts,
        exam: {
          id: exams.id,
          courseId: exams.courseId,
        },
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .where(eq(examAttempts.id, attemptId))
      .limit(1);

    if (!attemptData) {
      return res.status(404).json({ message: 'Attempt not found.' });
    }

    // Verify teacher owns the course (or is admin)
    if (userRole !== 'admin') {
      const [course] = await db
        .select()
        .from(courses)
        .where(eq(courses.id, attemptData.exam.courseId))
        .limit(1);

      if (!course || course.teacherId !== userId) {
        return res.status(403).json({ message: 'Forbidden: Access denied.' });
      }
    }

    // Update attempt with feedback
    const [updatedAttempt] = await db
      .update(examAttempts)
      .set({
        reviewNotes: feedback,
        reviewedBy: userId,
        reviewedAt: new Date(),
      })
      .where(eq(examAttempts.id, attemptId))
      .returning();

    console.log(`[AUDIT] Feedback submitted for attempt ${attemptId} by user: ${userId}`);

    res.status(200).json({
      message: 'Feedback submitted successfully.',
      attempt: updatedAttempt,
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ message: 'Failed to submit feedback.' });
  }
});

export default router;
