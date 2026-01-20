import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { addTeacherNote, getNotesForStudent } from '../services/teacher-notes.service.js';
import { db } from '../db/index.js';
import { exams, examAttempts, antiCheatRiskScores, courses, users } from '../db/schema.js';
import { eq, and, desc, gte } from 'drizzle-orm';

const router = Router();

// POST /api/teacher/notes -> { studentId, content } => { id }
router.post('/notes', isAuthenticated, async (req, res) => {
  try {
    const teacherId = req.user?.id;
    const { studentId, content } = req.body || {};

    if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ message: 'studentId is required' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'content is required' });
    }

    const result = await addTeacherNote(studentId, teacherId, content.trim());
    return res.status(201).json(result);
  } catch (err) {
    console.error('Error creating teacher note:', err);
    return res.status(500).json({ message: 'Failed to create note' });
  }
});

// GET /api/teacher/students/:studentId/notes -> notes array
router.get('/students/:studentId/notes', isAuthenticated, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const notes = await getNotesForStudent(studentId);
    return res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

// GET /api/teacher/exams -> Get all exams created by the teacher
router.get('/exams', isAuthenticated, async (req, res) => {
  try {
    const teacherId = req.user?.id;
    
    if (!teacherId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only allow teachers and admins
    if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Teacher access required' });
    }

    // Fetch exams created by this teacher with course info
    const teacherExams = await db
      .select({
        id: exams.id,
        title: exams.title,
        description: exams.description,
        status: exams.status,
        courseId: exams.courseId,
        courseName: courses.title,
        scheduledStart: exams.scheduledStart,
        scheduledEnd: exams.scheduledEnd,
        duration: exams.duration,
        totalPoints: exams.totalPoints,
        passingScore: exams.passingScore,
        antiCheatEnabled: exams.antiCheatEnabled,
        createdAt: exams.createdAt,
        updatedAt: exams.updatedAt,
      })
      .from(exams)
      .innerJoin(courses, eq(exams.courseId, courses.id))
      .where(eq(exams.createdBy, teacherId))
      .orderBy(desc(exams.createdAt));

    // Get attempt counts for each exam
    const examsWithStats = await Promise.all(
      teacherExams.map(async (exam) => {
        const attempts = await db
          .select()
          .from(examAttempts)
          .where(eq(examAttempts.examId, exam.id));

        const totalAttempts = attempts.length;
        const completedAttempts = attempts.filter(a => a.status === 'submitted' || a.status === 'graded').length;
        const inProgressAttempts = attempts.filter(a => a.status === 'in_progress').length;
        const flaggedAttempts = attempts.filter(a => a.flaggedForReview).length;

        // Calculate average score for graded attempts
        const gradedAttempts = attempts.filter(a => a.status === 'graded' && a.percentage !== null);
        const averageScore = gradedAttempts.length > 0
          ? gradedAttempts.reduce((sum, a) => sum + (a.percentage || 0), 0) / gradedAttempts.length
          : null;

        return {
          ...exam,
          stats: {
            totalAttempts,
            completedAttempts,
            inProgressAttempts,
            flaggedAttempts,
            averageScore: averageScore !== null ? Math.round(averageScore) : null,
          }
        };
      })
    );

    return res.json(examsWithStats);
  } catch (err) {
    console.error('Error fetching teacher exams:', err);
    return res.status(500).json({ message: 'Failed to fetch exams' });
  }
});

// GET /api/teacher/attempts/flagged -> Get all flagged exam attempts for review
router.get('/attempts/flagged', isAuthenticated, async (req, res) => {
  try {
    const teacherId = req.user?.id;
    
    if (!teacherId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only allow teachers and admins
    if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Teacher access required' });
    }

    // Fetch flagged attempts for exams created by this teacher
    const flaggedAttempts = await db
      .select({
        attemptId: examAttempts.id,
        examId: examAttempts.examId,
        examTitle: exams.title,
        studentId: examAttempts.studentId,
        studentName: users.fullName,
        studentEmail: users.email,
        attemptNumber: examAttempts.attemptNumber,
        status: examAttempts.status,
        startedAt: examAttempts.startedAt,
        submittedAt: examAttempts.submittedAt,
        score: examAttempts.score,
        percentage: examAttempts.percentage,
        integrityScore: examAttempts.integrityScore,
        flaggedForReview: examAttempts.flaggedForReview,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .innerJoin(users, eq(examAttempts.studentId, users.id))
      .where(
        and(
          eq(exams.createdBy, teacherId),
          eq(examAttempts.flaggedForReview, true)
        )
      )
      .orderBy(desc(examAttempts.startedAt));

    // Get risk scores for flagged attempts
    const attemptsWithRiskScores = await Promise.all(
      flaggedAttempts.map(async (attempt) => {
        const [riskScore] = await db
          .select()
          .from(antiCheatRiskScores)
          .where(eq(antiCheatRiskScores.attemptId, attempt.attemptId))
          .limit(1);

        return {
          id: attempt.attemptId,
          examId: attempt.examId,
          examTitle: attempt.examTitle,
          studentId: attempt.studentId,
          studentName: attempt.studentName,
          studentEmail: attempt.studentEmail,
          attemptNumber: attempt.attemptNumber,
          status: attempt.status,
          startedAt: attempt.startedAt,
          submittedAt: attempt.submittedAt,
          score: attempt.score,
          percentage: attempt.percentage,
          integrityScore: attempt.integrityScore,
          riskScore: riskScore?.overallRiskScore || 0,
          riskLevel: riskScore?.riskLevel || 'unknown',
          requiresManualReview: riskScore?.requiresManualReview || false,
          reviewPriority: riskScore?.reviewPriority || 0,
        };
      })
    );

    return res.json(attemptsWithRiskScores);
  } catch (err) {
    console.error('Error fetching flagged attempts:', err);
    return res.status(500).json({ message: 'Failed to fetch flagged attempts' });
  }
});

export default router;