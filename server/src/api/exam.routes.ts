// server/src/api/exam.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { exams, examQuestions, courses, enrollments } from '../db/schema.js';
import { eq, and, asc, desc, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';

const router = express.Router();

// =====================================================
// MIDDLEWARE: Role Validation
// =====================================================

/**
 * Middleware to ensure the authenticated user is a teacher
 */
const isTeacher = (req: Request, res: Response, next: express.NextFunction) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized: Authentication required.' });
  }

  if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Forbidden: Teacher access required.' });
  }

  next();
};

/**
 * Middleware to verify teacher owns the course associated with the exam
 */
const verifyCourseOwnership = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const { courseId } = req.body;
    const userId = req.user!.id;

    // Allow admins to bypass ownership check
    if (req.user!.role === 'admin') {
      return next();
    }

    if (!courseId) {
      return res.status(400).json({ message: 'courseId is required.' });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    if (course.teacherId !== userId) {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to manage exams for this course.'
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying course ownership:', error);
    res.status(500).json({ message: 'Failed to verify course ownership.' });
  }
};

/**
 * Middleware to verify teacher owns the exam
 */
const verifyExamOwnership = async (req: Request, res: Response, next: express.NextFunction) => {
  try {
    const examId = req.params.id || req.params.examId;
    const userId = req.user!.id;

    // Allow admins to bypass ownership check
    if (req.user!.role === 'admin') {
      return next();
    }

    const [exam] = await db
      .select({
        examId: exams.id,
        courseId: exams.courseId,
        teacherId: courses.teacherId
      })
      .from(exams)
      .innerJoin(courses, eq(exams.courseId, courses.id))
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.teacherId !== userId) {
      return res.status(403).json({
        message: 'Forbidden: You do not have permission to manage this exam.'
      });
    }

    next();
  } catch (error) {
    console.error('Error verifying exam ownership:', error);
    res.status(500).json({ message: 'Failed to verify exam ownership.' });
  }
};

// =====================================================
// VALIDATION SCHEMAS (Conceptual)
// =====================================================

/**
 * Validates exam creation payload
 */
const validateCreateExam = (body: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Required fields
  if (!body.courseId || typeof body.courseId !== 'string') {
    errors.push('courseId is required and must be a string.');
  }
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    errors.push('title is required and must be a non-empty string.');
  }
  if (!body.duration || typeof body.duration !== 'number' || body.duration <= 0) {
    errors.push('duration is required and must be a positive number (in minutes).');
  }
  if (!body.timeLimit || typeof body.timeLimit !== 'number' || body.timeLimit <= 0) {
    errors.push('timeLimit is required and must be a positive number (in minutes).');
  }

  // Scoring validation
  if (body.totalPoints !== undefined) {
    if (typeof body.totalPoints !== 'number' || body.totalPoints < 0) {
      errors.push('totalPoints must be a non-negative number.');
    }
  }
  if (body.passingScore !== undefined) {
    if (typeof body.passingScore !== 'number' || body.passingScore < 0) {
      errors.push('passingScore must be a non-negative number.');
    }
    if (body.totalPoints && body.passingScore > body.totalPoints) {
      errors.push('passingScore cannot exceed totalPoints.');
    }
  }

  // Attempt validation
  if (body.attemptsAllowed !== undefined) {
    if (typeof body.attemptsAllowed !== 'number' || body.attemptsAllowed < 1) {
      errors.push('attemptsAllowed must be a positive number.');
    }
  }

  // Scheduling validation
  if (!body.scheduledStartAt || !body.scheduledEndAt) {
    errors.push('scheduledStartAt and scheduledEndAt are required.');
  } else {
    const start = new Date(body.scheduledStartAt);
    const end = new Date(body.scheduledEndAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('scheduledStartAt and scheduledEndAt must be valid dates.');
    } else if (start >= end) {
      errors.push('scheduledEndAt must be after scheduledStartAt.');
    }
  }
  // Question/feedback display
  const booleanFields = [
    'shuffleQuestions', 'shuffleOptions', 'showResults', 'showResultsImmediately',
    'showCorrectAnswers', 'allowReview', 'allowBacktracking', 'lateSubmissionAllowed'
  ];
  for (const field of booleanFields) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      errors.push(`${field} must be a boolean.`);
    }
  }
  if (body.lateSubmissionPenalty !== undefined) {
    if (typeof body.lateSubmissionPenalty !== 'number' || body.lateSubmissionPenalty < 0 || body.lateSubmissionPenalty > 100) {
      errors.push('lateSubmissionPenalty must be between 0 and 100.');
    }
  }
  if (body.timeLimit !== undefined && typeof body.timeLimit !== 'number') {
    errors.push('timeLimit must be a number.');
  }

  // Anti-cheat validation
  const antiCheatBooleanFields = [
    'antiCheatEnabled', 'requireWebcam', 'requireScreenShare', 'requireFullscreen',
    'requireLockdownBrowser', 'copyPasteAllowed', 'rightClickAllowed'
  ];
  for (const field of antiCheatBooleanFields) {
    if (body[field] !== undefined && typeof body[field] !== 'boolean') {
      errors.push(`${field} must be a boolean.`);
    }
  }
  if (body.tabSwitchLimit !== undefined && body.tabSwitchLimit !== null) {
    if (typeof body.tabSwitchLimit !== 'number' || body.tabSwitchLimit < 0) {
      errors.push('tabSwitchLimit must be a non-negative number or null.');
    }
  }
  if (body.recordingDisclosure !== undefined && typeof body.recordingDisclosure !== 'string') {
    errors.push('recordingDisclosure must be a string.');
  }
  if (body.dataRetentionDays !== undefined) {
    if (typeof body.dataRetentionDays !== 'number' || body.dataRetentionDays < 1) {
      errors.push('dataRetentionDays must be a positive number.');
    }
  }

  // Retake validation
  if (body.retakeEnabled !== undefined && typeof body.retakeEnabled !== 'boolean') {
    errors.push('retakeEnabled must be a boolean.');
  }
  if (body.retakeDelay !== undefined) {
    if (typeof body.retakeDelay !== 'number' || body.retakeDelay < 0) {
      errors.push('retakeDelay must be a non-negative number.');
    }
  }
  if (body.adaptiveRetake !== undefined && typeof body.adaptiveRetake !== 'boolean') {
    errors.push('adaptiveRetake must be a boolean.');
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates exam update payload
 */
const validateUpdateExam = (body: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Optional fields validation (if provided)
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      errors.push('title must be a non-empty string.');
    }
  }

  if (body.duration !== undefined) {
    if (typeof body.duration !== 'number' || body.duration <= 0) {
      errors.push('duration must be a positive number.');
    }
  }

  if (body.totalPoints !== undefined) {
    if (typeof body.totalPoints !== 'number' || body.totalPoints < 0) {
      errors.push('totalPoints must be a non-negative number.');
    }
  }

  if (body.passingScore !== undefined) {
    if (typeof body.passingScore !== 'number' || body.passingScore < 0) {
      errors.push('passingScore must be a non-negative number.');
    }
  }

  if (body.scheduledStartAt && body.scheduledEndAt) {
    const start = new Date(body.scheduledStartAt);
    const end = new Date(body.scheduledEndAt);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      errors.push('scheduledStartAt and scheduledEndAt must be valid dates.');
    } else if (start >= end) {
      errors.push('scheduledEndAt must be after scheduledStartAt.');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates anti-cheat configuration
 */
const validateAntiCheatConfig = (config: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.antiCheatEnabled !== undefined && typeof config.antiCheatEnabled !== 'boolean') {
    errors.push('antiCheatEnabled must be a boolean.');
  }

  if (config.requireWebcam !== undefined && typeof config.requireWebcam !== 'boolean') {
    errors.push('requireWebcam must be a boolean.');
  }

  if (config.requireScreenShare !== undefined && typeof config.requireScreenShare !== 'boolean') {
    errors.push('requireScreenShare must be a boolean.');
  }

  if (config.requireFullscreen !== undefined && typeof config.requireFullscreen !== 'boolean') {
    errors.push('requireFullscreen must be a boolean.');
  }

  if (config.requireLockdownBrowser !== undefined && typeof config.requireLockdownBrowser !== 'boolean') {
    errors.push('requireLockdownBrowser must be a boolean.');
  }

  if (config.tabSwitchLimit !== undefined && config.tabSwitchLimit !== null) {
    if (typeof config.tabSwitchLimit !== 'number' || config.tabSwitchLimit < 0) {
      errors.push('tabSwitchLimit must be a non-negative number or null.');
    }
  }

  if (config.copyPasteAllowed !== undefined && typeof config.copyPasteAllowed !== 'boolean') {
    errors.push('copyPasteAllowed must be a boolean.');
  }

  if (config.rightClickAllowed !== undefined && typeof config.rightClickAllowed !== 'boolean') {
    errors.push('rightClickAllowed must be a boolean.');
  }

  if (config.recordingDisclosure !== undefined && typeof config.recordingDisclosure !== 'string') {
    errors.push('recordingDisclosure must be a string.');
  }

  if (config.dataRetentionDays !== undefined) {
    if (typeof config.dataRetentionDays !== 'number' || config.dataRetentionDays < 1) {
      errors.push('dataRetentionDays must be a positive number.');
    }
  }

  return { valid: errors.length === 0, errors };
};

/**
 * Validates retake configuration
 */
const validateRetakeConfig = (config: any): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (config.retakeEnabled !== undefined && typeof config.retakeEnabled !== 'boolean') {
    errors.push('retakeEnabled must be a boolean.');
  }

  if (config.retakeDelay !== undefined) {
    if (typeof config.retakeDelay !== 'number' || config.retakeDelay < 0) {
      errors.push('retakeDelay must be a non-negative number (hours).');
    }
  }

  if (config.adaptiveRetake !== undefined && typeof config.adaptiveRetake !== 'boolean') {
    errors.push('adaptiveRetake must be a boolean.');
  }

  return { valid: errors.length === 0, errors };
};

// =====================================================
// EXAM CRUD ENDPOINTS
// =====================================================

/**
 * POST /api/exams
 * Create a new exam
 * 
 * Request Body:
 * {
 *   courseId: string (required)
 *   title: string (required)
 *   description?: string
 *   instructions?: string
 *   duration: number (required, minutes)
 *   timeLimit: number (required, minutes per attempt)
 *   totalPoints?: number (default: 100)
 *   passingScore?: number (default: 70)
 *   attemptsAllowed?: number (default: 1)
 *   scheduledStartAt?: string (ISO date)
 *   scheduledEndAt?: string (ISO date)
 *   shuffleQuestions?: boolean (default: false)
 *   shuffleOptions?: boolean (default: false)
 *   showResults?: boolean (default: true)
 *   showCorrectAnswers?: boolean (default: false)
 *   lateSubmissionAllowed?: boolean (default: false)
 *   lateSubmissionPenalty?: number (default: 0)
 * }
 * 
 * Response: 201 Created
 * {
 *   id: string
 *   courseId: string
 *   title: string
 *   status: 'draft'
 *   ...all exam fields
 *   createdAt: string
 * }
 */
router.post('/', isAuthenticated, isTeacher, verifyCourseOwnership, async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validation = validateCreateExam(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    const {
      courseId,
      title,
      description,
      instructions,
      duration,
      timeLimit,
      totalPoints = 100,
      passingScore = 70,
      attemptsAllowed = 1,
      scheduledStartAt,
      scheduledEndAt,
      shuffleQuestions = false,
      shuffleOptions = false,
      showResults = true,
      showResultsImmediately = false,
      showCorrectAnswers = false,
      allowReview = true,
      allowBacktracking = false,
      lateSubmissionAllowed = false,
      lateSubmissionPenalty = 0,
      antiCheatEnabled = true,
      requireWebcam = false,
      requireScreenShare = false,
      requireFullscreen = true,
      requireLockdownBrowser = false,
      tabSwitchLimit = 3,
      copyPasteAllowed = false,
      rightClickAllowed = false,
      recordingDisclosure,
      dataRetentionDays = 365,
      retakeEnabled = true,
      retakeDelay = 24,
      adaptiveRetake = true,
    } = req.body;

    const normalizedTimeLimit = timeLimit !== undefined ? Number(timeLimit) : undefined;
    const normalizedAttempts = Number(attemptsAllowed);

    // Create exam with default anti-cheat settings
    const [newExam] = await db.insert(exams).values({
      courseId,
      createdBy: req.user!.id,
      title,
      description: description || null,
      instructions: instructions || null,
      status: 'draft' as const,
      scheduledStartAt: scheduledStartAt ? new Date(scheduledStartAt) : null,
      scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : null,
      duration,
      totalPoints,
      passingScore,
      attemptsAllowed: normalizedAttempts.toString(),
      maxAttempts: normalizedAttempts,
      timeLimit: normalizedTimeLimit !== undefined ? normalizedTimeLimit.toString() : null,
      lateSubmissionAllowed,
      lateSubmissionPenalty,
      shuffleQuestions,
      shuffleOptions,
      showResults,
      showResultsImmediately,
      showCorrectAnswers,
      allowReview,
      allowBacktracking,
      antiCheatEnabled,
      requireWebcam,
      requireScreenShare,
      requireFullscreen,
      requireLockdownBrowser,
      tabSwitchLimit,
      copyPasteAllowed,
      rightClickAllowed,
      retakeEnabled,
      retakeDelay,
      adaptiveRetake,
      recordingDisclosure: recordingDisclosure || null,
      dataRetentionDays,
    } as any).returning();

    // Audit log
    console.log(`[AUDIT] Exam created: ${newExam.id} by user: ${req.user!.id} (${req.user!.role})`);

    res.status(201).json({
      message: 'Exam created successfully.',
      exam: newExam
    });
  } catch (error) {
    console.error('Error creating exam:', error);
    res.status(500).json({ message: 'Failed to create exam.' });
  }
});

/**
 * GET /api/exams/:id
 * Get exam details by ID
 * 
 * Response: 200 OK
 * {
 *   id: string
 *   courseId: string
 *   title: string
 *   ...all exam fields
 * }
 */
router.get('/:id', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Check if user has access (teacher of course, enrolled student, or admin)
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, exam.courseId))
      .limit(1);

    if (!course) {
      return res.status(404).json({ message: 'Associated course not found.' });
    }

    const isOwner = course.teacherId === req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const isStudent = req.user!.role === 'student';

    if (!isOwner && !isAdmin && !isStudent) {
      return res.status(403).json({ message: 'Forbidden: Access denied.' });
    }

    // Verify student enrollment
    if (isStudent) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(and(
          eq(enrollments.studentId, req.user!.id),
          eq(enrollments.courseId, exam.courseId)
        ))
        .limit(1);

      if (!enrollment) {
        return res.status(403).json({ message: 'Forbidden: You are not enrolled in this course.' });
      }
    }

    // Fetch exam questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId))
      .orderBy(asc(examQuestions.order));

    // Map question types back to frontend format
    const formattedQuestions = questions.map(q => ({
      id: q.id,
      text: q.questionText,
      type: q.questionType === 'multiple_choice' ? 'MC'
        : q.questionType === 'true_false' ? 'TF'
          : q.questionType === 'short_answer' ? 'Short'
            : q.questionType === 'essay' ? 'Essay'
              : q.questionType,
      points: q.points,
      options: q.options as any,
      correctAnswer: q.correctAnswer as any,
      rubric: q.rubric,
    }));

    res.status(200).json({
      ...exam,
      questions: formattedQuestions
    });
  } catch (error) {
    console.error('Error fetching exam:', error);
    res.status(500).json({ message: 'Failed to fetch exam.' });
  }
});

/**
 * GET /api/exams/:id/attempts
 * Get all attempts for a specific exam (teacher only)
 * 
 * Response: 200 OK
 * [
 *   {
 *     id, studentId, studentName, studentEmail,
 *     startedAt, submittedAt, score, percentage, passed,
 *     flaggedForReview, reviewStatus
 *   }
 * ]
 */
router.get('/:id/attempts', isAuthenticated, isTeacher, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const teacherId = req.user!.id;

    if (!examId) {
      return res.status(400).json({ message: 'Invalid exam ID' });
    }

    // Verify the teacher owns the course for this exam
    const { exams, courses, examAttempts, users } = await import('../db/schema.js');

    const exam = await db
      .select({
        examId: exams.id,
        courseId: exams.courseId,
        teacherId: courses.teacherId,
      })
      .from(exams)
      .innerJoin(courses, eq(courses.id, exams.courseId))
      .where(eq(exams.id, examId))
      .limit(1);

    if (exam.length === 0) {
      return res.status(404).json({ message: 'Exam not found' });
    }

    // Check if user is admin or owns the course
    const isAdmin = req.user!.role === 'admin';
    if (!isAdmin && exam[0].teacherId !== teacherId) {
      return res.status(403).json({ message: 'You do not have permission to view attempts for this exam' });
    }

    // Fetch all attempts for this exam with student info
    const rawAttempts = await db
      .select()
      .from(examAttempts)
      .innerJoin(users, eq(users.id, examAttempts.studentId))
      .where(eq(examAttempts.examId, examId))
      .orderBy(desc(examAttempts.startedAt));

    // Format attempts
    const attempts = rawAttempts.map((row: any) => ({
      id: row.exam_attempts.id,
      studentId: row.exam_attempts.studentId,
      studentName: `${row.users.firstName} ${row.users.lastName}`,
      studentEmail: row.users.email,
      startedAt: row.exam_attempts.startedAt,
      submittedAt: row.exam_attempts.submittedAt,
      score: row.exam_attempts.score,
      percentage: row.exam_attempts.percentage,
      passed: row.exam_attempts.passed,
      flaggedForReview: row.exam_attempts.flaggedForReview,
      reviewStatus: row.exam_attempts.reviewStatus,
    }));

    res.json(attempts);
  } catch (error) {
    console.error('Error fetching exam attempts:', error);
    res.status(500).json({ message: 'Failed to fetch exam attempts.' });
  }
});

/**
 * GET /api/exams/student/available
 * Get all available exams for the authenticated student
 * 
 * Response: 200 OK
 * [
 *   { id, title, description, courseId, status, scheduledStartAt, duration, totalPoints, ... }
 * ]
 */
router.get('/student/available', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const studentId = req.user!.id;

    // Get student's enrollments
    const { enrollments } = await import('../db/schema.js');
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    if (studentEnrollments.length === 0) {
      return res.status(200).json([]);
    }

    const courseIds = studentEnrollments.map(e => e.courseId);

    // Get available exams from enrolled courses
    const { inArray } = await import('drizzle-orm');
    const availableExams = await db
      .select()
      .from(exams)
      .where(
        and(
          inArray(exams.courseId, courseIds),
          inArray(exams.status, ['scheduled', 'active'])
        )
      );

    res.status(200).json(availableExams);
  } catch (error) {
    console.error('Error fetching available exams:', error);
    res.status(500).json({ message: 'Failed to fetch available exams.' });
  }
});

/**
 * GET /api/exams/course/:courseId
 * Get all exams for a specific course
 * 
 * Response: 200 OK
 * [
 *   { id, title, status, scheduledStartAt, totalPoints, ... }
 * ]
 */
router.get('/course/:courseId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { courseId } = req.params;

    // Verify access to course
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const isOwner = course.teacherId === req.user!.id;
    const isAdmin = req.user!.role === 'admin';

    const isStudent = req.user!.role === 'student';

    if (!isOwner && !isAdmin && !isStudent) {
      return res.status(403).json({ message: 'Forbidden: Access denied.' });
    }

    // Verify student enrollment
    if (isStudent) {
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .where(and(
          eq(enrollments.studentId, req.user!.id),
          eq(enrollments.courseId, courseId)
        ))
        .limit(1);

      if (!enrollment) {
        return res.status(403).json({ message: 'Forbidden: You are not enrolled in this course.' });
      }
    }

    const courseExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        description: exams.description,
        status: exams.status,
        scheduledStartAt: exams.scheduledStartAt,
        scheduledEndAt: exams.scheduledEndAt,
        duration: exams.duration,
        totalPoints: exams.totalPoints,
        passingScore: exams.passingScore,
        attemptsAllowed: exams.attemptsAllowed,
        antiCheatEnabled: exams.antiCheatEnabled,
        createdAt: exams.createdAt,
      })
      .from(exams)
      .where(eq(exams.courseId, courseId));

    res.status(200).json(courseExams);
  } catch (error) {
    console.error('Error fetching course exams:', error);
    res.status(500).json({ message: 'Failed to fetch exams.' });
  }
});

/**
 * PATCH /api/exams/:id
 * Update exam settings
 * 
 * Request Body: (all fields optional)
 * {
 *   title?: string
 *   description?: string
 *   instructions?: string
 *   duration?: number
 *   timeLimit?: number
 *   totalPoints?: number
 *   passingScore?: number
 *   attemptsAllowed?: number
 *   scheduledStartAt?: string
 *   scheduledEndAt?: string
 *   shuffleQuestions?: boolean
 *   shuffleOptions?: boolean
 *   showResults?: boolean
 *   showCorrectAnswers?: boolean
 *   lateSubmissionAllowed?: boolean
 *   lateSubmissionPenalty?: number
 * }
 * 
 * Response: 200 OK
 * {
 *   message: 'Exam updated successfully.'
 *   exam: { ...updated exam }
 * }
 */
router.patch('/:id', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    // Validate update payload
    const validation = validateUpdateExam(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    // Check if exam is in a state that allows updates
    const [existingExam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!existingExam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Prevent updates to active or completed exams (except status changes)
    if (existingExam.status === 'active' || existingExam.status === 'completed') {
      // Only allow certain fields to be updated
      const allowedFields = ['lateSubmissionAllowed', 'lateSubmissionPenalty', 'scheduledEndAt'];
      const requestedFields = Object.keys(req.body);
      const restrictedFields = requestedFields.filter(f => !allowedFields.includes(f));

      if (restrictedFields.length > 0) {
        return res.status(400).json({
          message: 'Cannot update exam settings while exam is active or completed.',
          restrictedFields
        });
      }
    }

    // Build update object
    const updateData: any = {};
    const allowedFields = [
      'title', 'description', 'instructions', 'duration', 'timeLimit',
      'totalPoints', 'passingScore', 'attemptsAllowed', 'shuffleQuestions',
      'shuffleOptions', 'showResults', 'showCorrectAnswers', 'lateSubmissionAllowed',
      'lateSubmissionPenalty', 'scheduledStartAt', 'scheduledEndAt'
    ];

    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        if (field === 'scheduledStartAt' || field === 'scheduledEndAt') {
          updateData[field] = new Date(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    // Update exam
    const [updatedExam] = await db
      .update(exams)
      .set(updateData)
      .where(eq(exams.id, examId))
      .returning();

    // Audit log
    console.log(`[AUDIT] Exam updated: ${examId} by user: ${req.user!.id} (${req.user!.role}), fields: ${Object.keys(updateData).join(', ')}`);

    res.status(200).json({
      message: 'Exam updated successfully.',
      exam: updatedExam
    });
  } catch (error) {
    console.error('Error updating exam:', error);
    res.status(500).json({ message: 'Failed to update exam.' });
  }
});

/**
 * DELETE /api/exams/:id
 * Delete an exam (only if no attempts exist)
 * 
 * Response: 200 OK
 * {
 *   message: 'Exam deleted successfully.'
 * }
 */
router.delete('/:id', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    // Check if exam has any attempts
    // TODO: Add this check when exam_attempts table is available
    // const attempts = await db.select().from(examAttempts).where(eq(examAttempts.examId, examId));
    // if (attempts.length > 0) {
    //   return res.status(400).json({ 
    //     message: 'Cannot delete exam with existing attempts. Archive it instead.' 
    //   });
    // }

    await db.delete(exams).where(eq(exams.id, examId));

    // Audit log
    console.log(`[AUDIT] Exam deleted: ${examId} by user: ${req.user!.id} (${req.user!.role})`);

    res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: 'Failed to delete exam.' });
  }
});

// =====================================================
// EXAM STATUS MANAGEMENT
// =====================================================

/**
 * PATCH /api/exams/:id/publish
 * Publish an exam (change status from draft to scheduled/active)
 * 
 * Request Body:
 * {
 *   scheduledStartAt?: string (ISO date, required if not already set)
 *   scheduledEndAt?: string (ISO date, required if not already set)
 * }
 * 
 * Response: 200 OK
 * {
 *   message: 'Exam published successfully.'
 *   exam: { ...updated exam }
 * }
 */
router.patch('/:id/publish', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.status !== 'draft') {
      return res.status(400).json({
        message: `Cannot publish exam with status: ${exam.status}`
      });
    }

    // Validate exam has questions
    const questions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    if (questions.length === 0) {
      return res.status(400).json({
        message: 'Cannot publish exam without questions.'
      });
    }

    // Determine new status based on schedule
    const now = new Date();
    let scheduledStartAt = exam.scheduledStartAt;
    let scheduledEndAt = exam.scheduledEndAt;

    if (req.body.scheduledStartAt) {
      scheduledStartAt = new Date(req.body.scheduledStartAt);
    }
    if (req.body.scheduledEndAt) {
      scheduledEndAt = new Date(req.body.scheduledEndAt);
    }

    if (!scheduledStartAt || !scheduledEndAt) {
      return res.status(400).json({
        message: 'scheduledStartAt and scheduledEndAt are required to publish exam.'
      });
    }

    const newStatus = scheduledStartAt > now ? 'scheduled' : 'active';

    // Update exam
    const [publishedExam] = await db
      .update(exams)
      .set({
        status: newStatus,
        scheduledStartAt,
        scheduledEndAt,
      } as any)
      .where(eq(exams.id, examId))
      .returning();

    // Audit log
    console.log(`[AUDIT] Exam published: ${examId} (status: ${newStatus}) by user: ${req.user!.id} (${req.user!.role})`);

    res.status(200).json({
      message: 'Exam published successfully.',
      exam: publishedExam
    });
  } catch (error) {
    console.error('Error publishing exam:', error);
    res.status(500).json({ message: 'Failed to publish exam.' });
  }
});

/**
 * PATCH /api/exams/:id/unpublish
 * Unpublish an exam (change status back to draft)
 * 
 * Response: 200 OK
 * {
 *   message: 'Exam unpublished successfully.'
 *   exam: { ...updated exam }
 * }
 */
router.patch('/:id/unpublish', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.status === 'completed' || exam.status === 'archived') {
      return res.status(400).json({
        message: `Cannot unpublish exam with status: ${exam.status}`
      });
    }

    // Check if any attempts exist
    // TODO: Add this check when exam_attempts table is available
    // const attempts = await db.select().from(examAttempts).where(eq(examAttempts.examId, examId));
    // if (attempts.length > 0) {
    //   return res.status(400).json({ 
    //     message: 'Cannot unpublish exam with existing attempts.' 
    //   });
    // }

    const [unpublishedExam] = await db
      .update(exams)
      .set({ status: 'draft' } as any)
      .where(eq(exams.id, examId))
      .returning();

    // Audit log
    console.log(`[AUDIT] Exam unpublished: ${examId} by user: ${req.user!.id} (${req.user!.role})`);

    res.status(200).json({
      message: 'Exam unpublished successfully.',
      exam: unpublishedExam
    });
  } catch (error) {
    console.error('Error unpublishing exam:', error);
    res.status(500).json({ message: 'Failed to unpublish exam.' });
  }
});

/**
 * PATCH /api/exams/:id/archive
 * Archive a completed exam
 * 
 * Response: 200 OK
 * {
 *   message: 'Exam archived successfully.'
 * }
 */
router.patch('/:id/archive', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    if (exam.status !== 'completed') {
      return res.status(400).json({
        message: 'Only completed exams can be archived.'
      });
    }

    await db
      .update(exams)
      .set({ status: 'archived' } as any)
      .where(eq(exams.id, examId));

    // Audit log
    console.log(`[AUDIT] Exam archived: ${examId} by user: ${req.user!.id} (${req.user!.role})`);

    res.status(200).json({ message: 'Exam archived successfully.' });
  } catch (error) {
    console.error('Error archiving exam:', error);
    res.status(500).json({ message: 'Failed to archive exam.' });
  }
});

// =====================================================
// ANTI-CHEAT CONFIGURATION
// =====================================================

/**
 * PATCH /api/exams/:id/anti-cheat
 * Configure anti-cheat rules for an exam
 * 
 * Request Body:
 * {
 *   antiCheatEnabled?: boolean
 *   requireWebcam?: boolean
 *   requireScreenShare?: boolean
 *   requireFullscreen?: boolean
 *   requireLockdownBrowser?: boolean
 *   tabSwitchLimit?: number | null
 *   copyPasteAllowed?: boolean
 *   rightClickAllowed?: boolean
 *   recordingDisclosure?: string
 *   dataRetentionDays?: number
 * }
 * 
 * Response: 200 OK
 * {
 *   message: 'Anti-cheat settings updated successfully.'
 *   settings: { ...updated settings }
 * }
 */
router.patch('/:id/anti-cheat', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    // Validate anti-cheat configuration
    const validation = validateAntiCheatConfig(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Build update object for anti-cheat fields
    const updateData: any = {};
    const antiCheatFields = [
      'antiCheatEnabled', 'requireWebcam', 'requireScreenShare', 'requireFullscreen',
      'requireLockdownBrowser', 'tabSwitchLimit', 'copyPasteAllowed',
      'rightClickAllowed', 'recordingDisclosure', 'dataRetentionDays'
    ];

    for (const field of antiCheatFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid anti-cheat settings to update.' });
    }

    // Update exam with new anti-cheat settings
    const [updatedExam] = await db
      .update(exams)
      .set(updateData)
      .where(eq(exams.id, examId))
      .returning();

    // Extract only anti-cheat settings for response
    const antiCheatSettings = {
      antiCheatEnabled: updatedExam.antiCheatEnabled,
      requireWebcam: updatedExam.requireWebcam,
      requireScreenShare: updatedExam.requireScreenShare,
      requireFullscreen: updatedExam.requireFullscreen,
      requireLockdownBrowser: updatedExam.requireLockdownBrowser,
      tabSwitchLimit: updatedExam.tabSwitchLimit,
      copyPasteAllowed: updatedExam.copyPasteAllowed,
      rightClickAllowed: updatedExam.rightClickAllowed,
      recordingDisclosure: updatedExam.recordingDisclosure,
      dataRetentionDays: updatedExam.dataRetentionDays,
    };

    // Audit log with details
    console.log(`[AUDIT] Anti-cheat settings updated for exam: ${examId} by user: ${req.user!.id} (${req.user!.role}), changes: ${JSON.stringify(updateData)}`);

    res.status(200).json({
      message: 'Anti-cheat settings updated successfully.',
      settings: antiCheatSettings
    });
  } catch (error) {
    console.error('Error updating anti-cheat settings:', error);
    res.status(500).json({ message: 'Failed to update anti-cheat settings.' });
  }
});

/**
 * GET /api/exams/:id/anti-cheat
 * Get current anti-cheat configuration for an exam
 * 
 * Response: 200 OK
 * {
 *   antiCheatEnabled: boolean
 *   requireWebcam: boolean
 *   requireFullscreen: boolean
 *   ...all anti-cheat settings
 * }
 */
router.get('/:id/anti-cheat', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select({
        antiCheatEnabled: exams.antiCheatEnabled,
        requireWebcam: exams.requireWebcam,
        requireScreenShare: exams.requireScreenShare,
        requireFullscreen: exams.requireFullscreen,
        requireLockdownBrowser: exams.requireLockdownBrowser,
        tabSwitchLimit: exams.tabSwitchLimit,
        copyPasteAllowed: exams.copyPasteAllowed,
        rightClickAllowed: exams.rightClickAllowed,
        recordingDisclosure: exams.recordingDisclosure,
        dataRetentionDays: exams.dataRetentionDays,
      })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    res.status(200).json(exam);
  } catch (error) {
    console.error('Error fetching anti-cheat settings:', error);
    res.status(500).json({ message: 'Failed to fetch anti-cheat settings.' });
  }
});

// =====================================================
// RETAKE CONFIGURATION
// =====================================================

/**
 * PATCH /api/exams/:id/retake-settings
 * Configure mistake-based retake settings for an exam
 * 
 * Request Body:
 * {
 *   retakeEnabled?: boolean
 *   retakeDelay?: number (hours)
 *   adaptiveRetake?: boolean (mistake-based question selection)
 * }
 * 
 * Response: 200 OK
 * {
 *   message: 'Retake settings updated successfully.'
 *   settings: { ...updated settings }
 * }
 */
router.patch('/:id/retake-settings', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    // Validate retake configuration
    const validation = validateRetakeConfig(req.body);
    if (!validation.valid) {
      return res.status(400).json({
        message: 'Validation failed.',
        errors: validation.errors
      });
    }

    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    // Build update object for retake fields
    const updateData: any = {};
    const retakeFields = ['retakeEnabled', 'retakeDelay', 'adaptiveRetake'];

    for (const field of retakeFields) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid retake settings to update.' });
    }

    // Update exam with new retake settings
    const [updatedExam] = await db
      .update(exams)
      .set(updateData)
      .where(eq(exams.id, examId))
      .returning();

    // Extract only retake settings for response
    const retakeSettings = {
      retakeEnabled: updatedExam.retakeEnabled,
      retakeDelay: updatedExam.retakeDelay,
      adaptiveRetake: updatedExam.adaptiveRetake,
    };

    // Audit log
    console.log(`[AUDIT] Retake settings updated for exam: ${examId} by user: ${req.user!.id} (${req.user!.role}), changes: ${JSON.stringify(updateData)}`);

    res.status(200).json({
      message: 'Retake settings updated successfully.',
      settings: retakeSettings
    });
  } catch (error) {
    console.error('Error updating retake settings:', error);
    res.status(500).json({ message: 'Failed to update retake settings.' });
  }
});

/**
 * GET /api/exams/:id/retake-settings
 * Get current retake configuration for an exam
 * 
 * Response: 200 OK
 * {
 *   retakeEnabled: boolean
 *   retakeDelay: number
 *   adaptiveRetake: boolean
 * }
 */
router.get('/:id/retake-settings', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;

    const [exam] = await db
      .select({
        retakeEnabled: exams.retakeEnabled,
        retakeDelay: exams.retakeDelay,
        adaptiveRetake: exams.adaptiveRetake,
      })
      .from(exams)
      .where(eq(exams.id, examId))
      .limit(1);

    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    res.status(200).json(exam);
  } catch (error) {
    console.error('Error fetching retake settings:', error);
    res.status(500).json({ message: 'Failed to fetch retake settings.' });
  }
});

/**
 * POST /api/exams/:id/questions
 * Add a new question to an exam
 * 
 * Request Body:
 * {
 *   text: string (required) - The question text
 *   type: 'MC' | 'TF' | 'Short' | 'Essay' (required) - Question type
 *   points: number (required) - Points for the question
 *   options?: Array<{text: string, isCorrect: boolean}> - Options for MC questions
 *   topic?: string - Topic tag
 *   subtopic?: string - Subtopic tag
 *   skillTag?: string - Skill tag
 *   difficultyLevel?: string - Difficulty level (easy, medium, hard)
 * }
 * 
 * Response: 201 Created
 * {
 *   message: 'Question added successfully.'
 *   question: { ...created question }
 * }
 */
router.post('/:id/questions', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.id;
    const { text, type, points, options, correctAnswer: incomingCorrect, rubric, topic, subtopic, skillTag, difficultyLevel } = req.body;

    // Validation
    if (!text || !type || !points) {
      return res.status(400).json({
        message: 'Missing required fields: text, type, and points are required.'
      });
    }

    if (!['MC', 'TF', 'Short', 'Essay'].includes(type)) {
      return res.status(400).json({
        message: 'Invalid question type. Must be MC, TF, Short, or Essay.'
      });
    }

    // Map frontend types to database enum values
    const typeMapping: Record<string, string> = {
      'MC': 'multiple_choice',
      'TF': 'true_false',
      'Short': 'short_answer',
      'Essay': 'essay'
    };

    const dbQuestionType = typeMapping[type];

    if (points <= 0) {
      return res.status(400).json({
        message: 'Points must be greater than 0.'
      });
    }

    // Validate options/correct answer
    if (type === 'MC') {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return res.status(400).json({
          message: 'Multiple choice questions must have at least one option.'
        });
      }
      const hasCorrectAnswer = options.some(opt => opt.isCorrect);
      if (!hasCorrectAnswer) {
        return res.status(400).json({
          message: 'Multiple choice questions must have at least one correct answer.'
        });
      }
    }
    if (type === 'TF') {
      if (incomingCorrect === undefined || incomingCorrect === null) {
        return res.status(400).json({ message: 'True/False questions require a correct answer.' });
      }
    }

    // Get current question count to determine order
    const existingQuestions = await db
      .select()
      .from(examQuestions)
      .where(eq(examQuestions.examId, examId));

    const nextOrder = existingQuestions.length + 1;

    // Prepare correct answer based on question type
    let correctAnswer: any;
    let questionOptions: any = null;

    if (type === 'MC') {
      // Store options with IDs
      questionOptions = options.map((opt: any, idx: number) => ({
        id: `opt_${idx + 1}`,
        text: opt.text,
        isCorrect: opt.isCorrect || false
      }));

      // Correct answer is array of correct option IDs
      correctAnswer = questionOptions
        .filter((opt: any) => opt.isCorrect)
        .map((opt: any) => opt.id);
    } else if (type === 'TF') {
      // For True/False, set up options
      questionOptions = [
        { id: 'opt_true', text: 'True', isCorrect: false },
        { id: 'opt_false', text: 'False', isCorrect: false }
      ];
      const isTrueCorrect = incomingCorrect === true || incomingCorrect === 'true';
      questionOptions = questionOptions.map(opt => ({
        ...opt,
        isCorrect: opt.id === (isTrueCorrect ? 'opt_true' : 'opt_false')
      }));
      correctAnswer = isTrueCorrect ? ['opt_true'] : ['opt_false'];
    } else {
      // For Short/Essay, store teacher-provided mark scheme or empty string
      correctAnswer = typeof incomingCorrect === 'string' ? incomingCorrect : '';
    }

    // Create question
    const [newQuestion] = await db
      .insert(examQuestions)
      .values({
        id: createId(),
        examId,
        questionType: dbQuestionType,
        questionText: text,
        options: questionOptions,
        correctAnswer,
        points,
        order: nextOrder,
        topic: topic || null,
        subtopic: subtopic || null,
        skillTag: skillTag || null,
        difficultyLevel: difficultyLevel || null,
        partialCreditEnabled: false,
        requiresManualGrading: type !== 'MC' && type !== 'TF',
        rubric: rubric || null,
      } as any)
      .returning();

    // Audit log
    console.log(`[AUDIT] Question added to exam: ${examId} by user: ${req.user!.id} (${req.user!.role})`);

    res.status(201).json({
      message: 'Question added successfully.',
      question: newQuestion
    });
  } catch (error) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: 'Failed to add question.' });
  }
});

// Update a question
router.patch('/:examId/questions/:questionId', isAuthenticated, isTeacher, verifyExamOwnership, async (req: Request, res: Response) => {
  try {
    const examId = req.params.examId;
    const questionId = req.params.questionId;
    const { text, type, points, options, correctAnswer: incomingCorrect, rubric, topic, subtopic, skillTag, difficultyLevel } = req.body;

    if (!text || !type || !points) {
      return res.status(400).json({ message: 'Missing required fields: text, type, and points are required.' });
    }
    if (!['MC', 'TF', 'Short', 'Essay'].includes(type)) {
      return res.status(400).json({ message: 'Invalid question type.' });
    }

    const typeMapping: Record<string, string> = {
      MC: 'multiple_choice',
      TF: 'true_false',
      Short: 'short_answer',
      Essay: 'essay',
    };
    const dbQuestionType = typeMapping[type];

    if (points <= 0) {
      return res.status(400).json({ message: 'Points must be greater than 0.' });
    }

    if (type === 'MC') {
      if (!options || !Array.isArray(options) || options.length === 0) {
        return res.status(400).json({ message: 'Multiple choice questions must have at least one option.' });
      }
      const hasCorrectAnswer = options.some((opt: any) => opt.isCorrect);
      if (!hasCorrectAnswer) {
        return res.status(400).json({ message: 'Multiple choice questions must have at least one correct answer.' });
      }
    }
    if (type === 'TF') {
      if (incomingCorrect === undefined || incomingCorrect === null) {
        return res.status(400).json({ message: 'True/False questions require a correct answer.' });
      }
    }

    let correctAnswer: any;
    let questionOptions: any = null;

    if (type === 'MC') {
      questionOptions = options.map((opt: any, idx: number) => ({
        id: opt.id || `opt_${idx + 1}`,
        text: opt.text,
        isCorrect: !!opt.isCorrect,
      }));
      correctAnswer = questionOptions.filter((opt: any) => opt.isCorrect).map((opt: any) => opt.id);
    } else if (type === 'TF') {
      const isTrueCorrect = incomingCorrect === true || incomingCorrect === 'true';
      questionOptions = [
        { id: 'opt_true', text: 'True', isCorrect: isTrueCorrect },
        { id: 'opt_false', text: 'False', isCorrect: !isTrueCorrect },
      ];
      correctAnswer = isTrueCorrect ? ['opt_true'] : ['opt_false'];
    } else {
      correctAnswer = typeof incomingCorrect === 'string' ? incomingCorrect : '';
    }

    const [updated] = await db
      .update(examQuestions)
      .set({
        questionType: dbQuestionType as any,
        questionText: text,
        options: questionOptions,
        correctAnswer,
        points,
        topic: topic || null,
        subtopic: subtopic || null,
        skillTag: skillTag || null,
        difficultyLevel: difficultyLevel || null,
        requiresManualGrading: type !== 'MC' && type !== 'TF',
        rubric: rubric || null,
      })
      .where(and(eq(examQuestions.id, questionId), eq(examQuestions.examId, examId)))
      .returning();

    if (!updated) {
      return res.status(404).json({ message: 'Question not found.' });
    }

    res.json({ message: 'Question updated successfully.', question: updated });
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: 'Failed to update question.' });
  }
});

export default router;
