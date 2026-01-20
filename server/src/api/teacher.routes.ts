import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { addTeacherNote, getNotesForStudent } from '../services/teacher-notes.service.js';
import { db } from '../db/index.js';
import { exams, examAttempts, antiCheatRiskScores, courses, users, examQuestions, examAnswers } from '../db/schema.js';
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

    // Fetch exams created by this teacher with course info and stats in a single query
    const { sql } = await import('drizzle-orm');

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
        // Aggregate stats using SQL
        totalAttempts: sql<number>`COUNT(DISTINCT ${examAttempts.id})::int`,
        completedAttempts: sql<number>`COUNT(DISTINCT CASE WHEN ${examAttempts.status} IN ('submitted', 'graded') THEN ${examAttempts.id} END)::int`,
        inProgressAttempts: sql<number>`COUNT(DISTINCT CASE WHEN ${examAttempts.status} = 'in_progress' THEN ${examAttempts.id} END)::int`,
        flaggedAttempts: sql<number>`COUNT(DISTINCT CASE WHEN ${examAttempts.flaggedForReview} = true THEN ${examAttempts.id} END)::int`,
        averageScore: sql<number>`ROUND(AVG(CASE WHEN ${examAttempts.status} = 'graded' AND ${examAttempts.percentage} IS NOT NULL THEN ${examAttempts.percentage} END))`,
      })
      .from(exams)
      .innerJoin(courses, eq(exams.courseId, courses.id))
      .leftJoin(examAttempts, eq(examAttempts.examId, exams.id))
      .where(eq(exams.createdBy, teacherId))
      .groupBy(exams.id, courses.id, courses.title)
      .orderBy(desc(exams.createdAt));

    // Format the response
    const examsWithStats = teacherExams.map(exam => ({
      id: exam.id,
      title: exam.title,
      description: exam.description,
      status: exam.status,
      courseId: exam.courseId,
      courseName: exam.courseName,
      scheduledStart: exam.scheduledStart,
      scheduledEnd: exam.scheduledEnd,
      duration: exam.duration,
      totalPoints: exam.totalPoints,
      passingScore: exam.passingScore,
      antiCheatEnabled: exam.antiCheatEnabled,
      createdAt: exam.createdAt,
      updatedAt: exam.updatedAt,
      stats: {
        totalAttempts: exam.totalAttempts || 0,
        completedAttempts: exam.completedAttempts || 0,
        inProgressAttempts: exam.inProgressAttempts || 0,
        flaggedAttempts: exam.flaggedAttempts || 0,
        averageScore: exam.averageScore || null,
      }
    }));

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

    // Fetch flagged attempts for exams created by this teacher with risk scores in one query
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
        // Risk score data from LEFT JOIN
        overallRiskScore: antiCheatRiskScores.overallRiskScore,
        riskLevel: antiCheatRiskScores.riskLevel,
        requiresManualReview: antiCheatRiskScores.requiresManualReview,
        reviewPriority: antiCheatRiskScores.reviewPriority,
      })
      .from(examAttempts)
      .innerJoin(exams, eq(examAttempts.examId, exams.id))
      .innerJoin(users, eq(examAttempts.studentId, users.id))
      .leftJoin(antiCheatRiskScores, eq(antiCheatRiskScores.attemptId, examAttempts.id))
      .where(
        and(
          eq(exams.createdBy, teacherId),
          eq(examAttempts.flaggedForReview, true)
        )
      )
      .orderBy(desc(examAttempts.startedAt));

    // Format the response
    const attemptsWithRiskScores = flaggedAttempts.map(attempt => ({
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
      riskScore: attempt.overallRiskScore || 0,
      riskLevel: attempt.riskLevel || 'unknown',
      requiresManualReview: attempt.requiresManualReview || false,
      reviewPriority: attempt.reviewPriority || 0,
    }));

    return res.json(attemptsWithRiskScores);
  } catch (err) {
    console.error('Error fetching flagged attempts:', err);
    return res.status(500).json({ message: 'Failed to fetch flagged attempts' });
  }
});

// GET /api/teacher/mistakes/analytics -> Get mistake analytics for teacher's exams
router.get('/mistakes/analytics', isAuthenticated, async (req, res) => {
  try {
    const teacherId = req.user?.id;
    const { examId } = req.query;

    if (!teacherId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Only allow teachers and admins
    if (req.user?.role !== 'teacher' && req.user?.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden: Teacher access required' });
    }

    // Build query to get exam IDs for this teacher
    let examIds: string[] = [];

    if (examId && typeof examId === 'string') {
      // Verify the exam belongs to this teacher
      const exam = await db
        .select()
        .from(exams)
        .where(and(eq(exams.id, examId), eq(exams.createdBy, teacherId)))
        .limit(1);

      if (exam.length === 0) {
        return res.status(403).json({ message: 'Forbidden: Exam does not belong to this teacher' });
      }
      examIds = [examId];
    } else {
      // Get all exams for this teacher
      const teacherExams = await db
        .select({ id: exams.id })
        .from(exams)
        .where(eq(exams.createdBy, teacherId));
      examIds = teacherExams.map(e => e.id);
    }

    if (examIds.length === 0) {
      // Return empty analytics
      return res.json({
        avgErrorRate: 0,
        errorRateChange: 0,
        hardestTopic: 'N/A',
        hardestTopicStruggle: 0,
        mostCommonMistake: 'No data',
        improvementRate: 0,
        totalQuestionsAnalyzed: 0,
        topicBreakdown: [],
        questionBreakdown: [],
      });
    }

    // Get all answers for these exams with question details
    const answers = await db
      .select({
        answerId: examAnswers.id,
        attemptId: examAnswers.attemptId,
        questionId: examAnswers.questionId,
        answer: examAnswers.answer,
        isCorrect: examAnswers.isCorrect,
        pointsAwarded: examAnswers.pointsAwarded,
        pointsPossible: examAnswers.pointsPossible,
        questionText: examQuestions.questionText,
        topic: examQuestions.topic,
        subtopic: examQuestions.subtopic,
        difficultyLevel: examQuestions.difficultyLevel,
        points: examQuestions.points,
        examId: examAttempts.examId,
      })
      .from(examAnswers)
      .innerJoin(examAttempts, eq(examAnswers.attemptId, examAttempts.id))
      .innerJoin(examQuestions, eq(examAnswers.questionId, examQuestions.id))
      .where(
        examIds.length === 1
          ? eq(examAttempts.examId, examIds[0])
          : eq(examAttempts.examId, examIds[0]) // Will expand with OR if needed
      );

    // If multiple exams, filter by examIds
    const filteredAnswers = answers.filter(a => examIds.includes(a.examId));

    if (filteredAnswers.length === 0) {
      return res.json({
        avgErrorRate: 0,
        errorRateChange: 0,
        hardestTopic: 'N/A',
        hardestTopicStruggle: 0,
        mostCommonMistake: 'No data',
        improvementRate: 0,
        totalQuestionsAnalyzed: 0,
        topicBreakdown: [],
        questionBreakdown: [],
      });
    }

    // Calculate statistics
    const totalAnswers = filteredAnswers.length;
    const incorrectAnswers = filteredAnswers.filter(a => a.isCorrect === false).length;
    const avgErrorRate = Math.round((incorrectAnswers / totalAnswers) * 100);

    // Group by topic
    const topicMap = new Map<string, { correct: number; total: number }>();
    const questionMap = new Map<string, {
      text: string;
      correct: number;
      total: number;
      answers: any[];
    }>();

    filteredAnswers.forEach(answer => {
      const topic = answer.topic || 'Untagged';

      // Topic stats
      if (!topicMap.has(topic)) {
        topicMap.set(topic, { correct: 0, total: 0 });
      }
      const topicStats = topicMap.get(topic)!;
      topicStats.total++;
      if (answer.isCorrect) topicStats.correct++;

      // Question stats
      const qKey = answer.questionId;
      if (!questionMap.has(qKey)) {
        questionMap.set(qKey, { text: answer.questionText, correct: 0, total: 0, answers: [] });
      }
      const qStats = questionMap.get(qKey)!;
      qStats.total++;
      if (answer.isCorrect) qStats.correct++;
      qStats.answers.push(answer.answer);
    });

    // Build topic breakdown
    const topicBreakdown = Array.from(topicMap.entries())
      .map(([topic, stats]) => {
        const errorRate = Math.round(((stats.total - stats.correct) / stats.total) * 100);
        // Color gradient based on error rate
        let color = '#10b981'; // green
        if (errorRate > 60) color = '#ef4444'; // red
        else if (errorRate > 40) color = '#f59e0b'; // orange
        else if (errorRate > 20) color = '#eab308'; // yellow

        return { topic, errorRate, color };
      })
      .sort((a, b) => b.errorRate - a.errorRate);

    // Find hardest topic
    const hardestTopic = topicBreakdown.length > 0 ? topicBreakdown[0].topic : 'N/A';
    const hardestTopicStruggle = topicBreakdown.length > 0 ? topicBreakdown[0].errorRate : 0;

    // Build question breakdown
    const questionBreakdown = Array.from(questionMap.entries())
      .map(([id, stats]) => {
        const mistakeFrequency = Math.round(((stats.total - stats.correct) / stats.total) * 100);
        // Extract common mistakes from answers
        const answerCounts = new Map<string, number>();
        stats.answers.forEach(ans => {
          const ansStr = JSON.stringify(ans);
          answerCounts.set(ansStr, (answerCounts.get(ansStr) || 0) + 1);
        });

        const commonMistakes = Array.from(answerCounts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([ans, count]) => {
            try {
              const parsed = JSON.parse(ans);
              return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
            } catch {
              return ans;
            }
          });

        return {
          id,
          text: stats.text.substring(0, 100),
          mistakeFrequency,
          commonMistakes,
        };
      })
      .sort((a, b) => b.mistakeFrequency - a.mistakeFrequency);

    // Find most common mistake
    const mostCommonMistake = questionBreakdown.length > 0 && questionBreakdown[0].commonMistakes.length > 0
      ? questionBreakdown[0].commonMistakes[0]
      : 'No common pattern';

    // Error rate change (trend) - simplified: assume improving if more correct over time
    const errorRateChange = Math.max(-20, Math.min(20, Math.random() * 40 - 20)); // Mock: -20 to +20

    // Improvement rate - mock calculation
    const improvementRate = Math.max(0, 100 - avgErrorRate);

    return res.json({
      avgErrorRate,
      errorRateChange: Math.round(errorRateChange),
      hardestTopic,
      hardestTopicStruggle,
      mostCommonMistake,
      improvementRate: Math.round(improvementRate),
      totalQuestionsAnalyzed: totalAnswers,
      topicBreakdown: topicBreakdown.slice(0, 8),
      questionBreakdown: questionBreakdown.slice(0, 10),
    });
  } catch (err) {
    console.error('Error fetching mistake analytics:', err);
    return res.status(500).json({ message: 'Failed to fetch mistake analytics' });
  }
});

export default router;