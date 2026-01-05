// server/src/api/grades.routes.ts

import { Router } from 'express';
import { db } from '../db/index.js';
import { assignments, submissions, grades, courses, users } from '../db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = Router();

/**
 * PROTECTED (TEACHER)
 * GET /api/grades/student/:studentId
 * Get all grades for a specific student (for teachers to view student progress)
 */
router.get('/student/:studentId', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden: Teachers only' });
    }

    const { studentId } = req.params;

    // Get all submissions for this student with grades
    const studentSubmissions = await db
      .select({
        submissionId: submissions.id,
        assignmentId: submissions.assignmentId,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
        gradeId: grades.id,
        score: grades.score,
        maxScore: grades.maxScore,
        feedback: grades.feedback,
        gradedAt: grades.gradedAt,
        assignmentTitle: assignments.title,
        assignmentDescription: assignments.description,
        courseId: assignments.courseId,
      })
      .from(submissions)
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .leftJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .where(eq(submissions.studentId, studentId))
      .orderBy(desc(grades.gradedAt));

    // Get course info for each grade
    const courseIds = [...new Set(studentSubmissions.map(s => s.courseId).filter(Boolean))];
    const coursesData = courseIds.length > 0 ? await db
      .select({
        id: courses.id,
        title: courses.title,
      })
      .from(courses)
      .where(inArray(courses.id, courseIds as string[])) : [];

    const courseMap = new Map(coursesData.map(c => [c.id, c.title]));

    // Format grades response
    const gradesData = studentSubmissions
      .filter(s => s.gradeId) // Only include graded submissions
      .map(s => ({
        id: s.gradeId,
        submissionId: s.submissionId,
        assignmentId: s.assignmentId,
        assignmentTitle: s.assignmentTitle,
        courseName: s.courseId ? courseMap.get(s.courseId) || 'Unknown Course' : 'Unknown Course',
        score: s.score,
        maxScore: s.maxScore,
        feedback: s.feedback,
        gradedAt: s.gradedAt,
        submittedAt: s.submittedAt,
      }));

    res.json({ grades: gradesData });
  } catch (error) {
    console.error('Error fetching student grades:', error);
    res.status(500).json({
      message: 'Failed to fetch student grades',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/grades/course/:courseId
 * Get all grades for a specific course
 */
router.get('/course/:courseId', isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden: Teachers only' });
    }

    const { courseId } = req.params;

    // Verify teacher owns the course
    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.teacherId, user.id)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: 'You do not have permission to view this course' });
    }

    // Get all assignments for this course
    const courseAssignments = await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId));

    const assignmentIds = courseAssignments.map(a => a.id);

    if (assignmentIds.length === 0) {
      return res.json({ grades: [] });
    }

    // Get all graded submissions for these assignments
    const gradedSubmissions = await db
      .select({
        submissionId: submissions.id,
        studentId: submissions.studentId,
        assignmentId: submissions.assignmentId,
        submittedAt: submissions.submittedAt,
        gradeId: grades.id,
        score: grades.score,
        maxScore: grades.maxScore,
        feedback: grades.feedback,
        gradedAt: grades.gradedAt,
        assignmentTitle: assignments.title,
        studentName: users.fullName,
        studentEmail: users.email,
      })
      .from(submissions)
      .innerJoin(grades, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(users, eq(users.id, submissions.studentId))
      .where(inArray(submissions.assignmentId, assignmentIds))
      .orderBy(desc(grades.gradedAt));

    const gradesData = gradedSubmissions.map(s => ({
      id: s.gradeId,
      submissionId: s.submissionId,
      studentId: s.studentId,
      studentName: s.studentName,
      studentEmail: s.studentEmail,
      assignmentId: s.assignmentId,
      assignmentTitle: s.assignmentTitle,
      score: s.score,
      maxScore: s.maxScore,
      feedback: s.feedback,
      gradedAt: s.gradedAt,
      submittedAt: s.submittedAt,
    }));

    res.json({ 
      course: {
        id: course.id,
        title: course.title,
      },
      grades: gradesData 
    });
  } catch (error) {
    console.error('Error fetching course grades:', error);
    res.status(500).json({
      message: 'Failed to fetch course grades',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
