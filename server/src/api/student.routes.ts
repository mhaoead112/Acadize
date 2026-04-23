import express from "express";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireAuth } from "../middleware/protected.middleware.js";
import { getStudentProgress } from "../services/assignment.service.js";
import { db } from "../db/index.js";
import { exams, enrollments } from "../db/schema.js";
import { eq, and, inArray, desc, sql } from "drizzle-orm";

const router = express.Router();

// Middleware to ensure user is a student
const isStudent = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role !== "student") {
    return res.status(403).json({ message: "Forbidden: Students only." });
  }
  next();
};

// GET /api/student/my-progress
router.get("/my-progress", ...requireAuth, isStudent, async (req, res) => {
  try {
    const user = (req as any).user;
    const organizationId = user.organizationId || (req as any).tenant?.organizationId;
    const progress = await getStudentProgress(user.id, organizationId);
    res.json(progress);
  } catch (error: any) {
    console.error("Error fetching student progress:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch progress" });
  }
});

// GET /api/student/exams - Get all available exams for student
router.get("/exams", ...requireAuth, isStudent, async (req, res) => {
  try {
    const studentId = (req as any).user.id;

    // Get student's enrollments
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, studentId));

    if (studentEnrollments.length === 0) {
      return res.status(200).json([]);
    }

    const courseIds = studentEnrollments.map(e => e.courseId);

    // Get available exams from enrolled courses
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

// GET /api/student/attempts/active - Get student's exam attempts
router.get("/attempts/active", ...requireAuth, isStudent, async (req, res) => {
  try {
    const studentId = (req as any).user.id;

    // Use a raw query to avoid column name mismatches with schema
    const execResult = await db.execute(sql`
      SELECT 
        id,
        exam_id,
        student_id,
        attempt_number,
        status,
        started_at,
        submitted_at,
        score,
        percentage,
        passed,
        is_retake,
        flagged_for_review
      FROM exam_attempts
      WHERE student_id = ${studentId}
      ORDER BY started_at DESC
    `);

    // Normalize rows from driver-specific result shape
    const rows = (execResult as any)?.rows ?? execResult;

    // Map to camelCase keys expected by the client
    const attempts = (rows as any[]).map((row) => ({
      id: row.id,
      examId: row.exam_id,
      studentId: row.student_id,
      attemptNumber: row.attempt_number,
      status: row.status,
      startedAt: row.started_at,
      submittedAt: row.submitted_at,
      score: row.score,
      percentage: row.percentage,
      passed: row.passed,
      isRetake: row.is_retake,
      flaggedForReview: row.flagged_for_review,
    }));

    res.status(200).json(attempts);
  } catch (error) {
    console.error('Error fetching student attempts:', error);
    res.status(500).json({ message: 'Failed to fetch exam attempts.' });
  }
});

// GET /api/student/retakes - Get retake eligibility (placeholder)
router.get("/retakes", ...requireAuth, isStudent, async (req, res) => {
  try {
    // For now, return empty array - full implementation would check mistake pool
    res.status(200).json([]);
  } catch (error) {
    console.error('Error fetching retakes:', error);
    res.status(500).json({ message: 'Failed to fetch retakes.' });
  }
});

// GET /api/student/mistakes - Get student's mistake pool
router.get("/mistakes", ...requireAuth, isStudent, async (req, res) => {
  try {
    const studentId = (req as any).user.id;
    const { mistakePool, examQuestions, exams, examAttempts } = await import('../db/schema.js');
    const { eq, and, desc } = await import('drizzle-orm');

    // Fetch all mistakes for the student with question and exam details
    const mistakes = await db
      .select({
        mistakeId: mistakePool.id,
        examId: mistakePool.examId,
        examTitle: exams.title,
        questionId: mistakePool.questionId,
        questionText: examQuestions.questionText,
        questionType: examQuestions.questionType,
        topic: mistakePool.topic,
        subtopic: mistakePool.subtopic,
        skillTag: mistakePool.skillTag,
        difficultyLevel: mistakePool.difficultyLevel,
        studentAnswer: mistakePool.studentAnswer,
        pointsLost: mistakePool.pointsLost,
        pointsPossible: mistakePool.pointsPossible,
        occurredAt: mistakePool.occurredAt,
        mistakeType: mistakePool.mistakeType,
        isRepeatedMistake: mistakePool.isRepeatedMistake,
        repetitionCount: mistakePool.repetitionCount,
        remediationStatus: mistakePool.remediationStatus,
        correctedInRetake: mistakePool.correctedInRetake,
        attemptId: mistakePool.attemptId,
      })
      .from(mistakePool)
      .innerJoin(examQuestions, eq(mistakePool.questionId, examQuestions.id))
      .innerJoin(exams, eq(mistakePool.examId, exams.id))
      .where(eq(mistakePool.studentId, studentId))
      .orderBy(desc(mistakePool.occurredAt));

    // Group by exam
    const byExam = mistakes.reduce((acc: any, m: any) => {
      if (!acc[m.examId]) {
        acc[m.examId] = {
          examId: m.examId,
          examTitle: m.examTitle,
          mistakes: []
        };
      }
      acc[m.examId].mistakes.push(m);
      return acc;
    }, {});

    // Group by topic
    const byTopic = mistakes.reduce((acc: any, m: any) => {
      const topic = m.topic || 'Uncategorized';
      if (!acc[topic]) {
        acc[topic] = {
          topic,
          count: 0,
          mistakes: []
        };
      }
      acc[topic].count++;
      acc[topic].mistakes.push(m);
      return acc;
    }, {});

    // Group by difficulty
    const byDifficulty = mistakes.reduce((acc: any, m: any) => {
      const difficulty = m.difficultyLevel || 'medium';
      if (!acc[difficulty]) acc[difficulty] = 0;
      acc[difficulty]++;
      return acc;
    }, {});

    // Calculate stats
    const activeMistakes = mistakes.filter((m: any) => !m.correctedInRetake);
    const resolvedMistakes = mistakes.filter((m: any) => m.correctedInRetake);

    res.status(200).json({
      mistakes,
      activeMistakes,
      resolvedMistakes,
      byExam: Object.values(byExam),
      byTopic: Object.values(byTopic),
      byDifficulty,
      stats: {
        total: mistakes.length,
        active: activeMistakes.length,
        resolved: resolvedMistakes.length,
        repeated: mistakes.filter((m: any) => m.isRepeatedMistake).length
      }
    });
  } catch (error) {
    console.error('Error fetching student mistakes:', error);
    res.status(500).json({ message: 'Failed to fetch mistakes.' });
  }
});

export default router;
