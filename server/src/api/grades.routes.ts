import { Router } from 'express';
import { db } from '../db/index.js';
import { assignments, submissions, grades, courses, users } from '../db/schema.js';
import { eq, and, inArray, desc } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const router = Router();

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

// Helper: prefer subdomain tenant org, fall back to JWT org (dev/single-domain)
const getOrgId = (req: any): string | undefined =>
  req.tenant?.organizationId ?? req.user?.organizationId;

/**
 * PROTECTED (STUDENT / SELF)
 * GET /api/grades/me
 * Returns the authenticated student's own graded submissions with score + feedback.
 */
router.get('/me', ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });

    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required' });

    const myGrades = await db
      .select({
        gradeId: grades.id,
        submissionId: submissions.id,
        assignmentId: assignments.id,
        assignmentTitle: assignments.title,
        assignmentDueDate: assignments.dueDate,
        courseId: courses.id,
        courseName: courses.title,
        score: grades.score,
        maxScore: grades.maxScore,
        feedback: grades.feedback,
        gradedAt: grades.gradedAt,
        submittedAt: submissions.submittedAt,
        gradedByName: users.fullName,
      })
      .from(submissions)
      .innerJoin(grades, eq(grades.submissionId, submissions.id))
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .leftJoin(users, eq(users.id, grades.gradedBy))
      .where(and(
        eq(submissions.studentId, user.id),
        eq(courses.organizationId, orgId),
      ))
      .orderBy(desc(grades.gradedAt));

    const result = myGrades.map(g => ({
      id: g.gradeId,
      submissionId: g.submissionId,
      assignmentId: g.assignmentId,
      assignmentTitle: g.assignmentTitle,
      assignmentDueDate: g.assignmentDueDate,
      courseName: g.courseName,
      score: g.score,
      maxScore: g.maxScore,
      percentage: g.maxScore ? Math.round((Number(g.score) / g.maxScore) * 100) : null,
      feedback: g.feedback,
      gradedAt: g.gradedAt,
      submittedAt: g.submittedAt,
      gradedByName: g.gradedByName,
    }));

    res.json({ grades: result });
  } catch (error) {
    console.error('Error fetching own grades:', error);
    res.status(500).json({
      message: 'Failed to fetch grades',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/grades/student/:studentId
 * Get all grades for a specific student (for teachers to view student progress)
 */
router.get('/student/:studentId', ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden: Teachers only' });
    }

    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required' });

    const { studentId } = req.params;

    // Get all submissions for this student with grades,
    // joined through assignments → courses to enforce org boundary.
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
      .innerJoin(assignments, eq(assignments.id, submissions.assignmentId))
      .innerJoin(courses, eq(courses.id, assignments.courseId))
      .where(and(
        eq(submissions.studentId, studentId),
        eq(courses.organizationId, orgId)
      ))
      .orderBy(desc(grades.gradedAt));

    // Get course info for each grade
    const courseIds = Array.from(new Set(studentSubmissions.map(s => s.courseId).filter(Boolean)));
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
router.get('/course/:courseId', ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== 'teacher') {
      return res.status(403).json({ message: 'Forbidden: Teachers only' });
    }

    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: 'Organization context required' });

    const { courseId } = req.params;

    // Verify teacher owns the course AND it belongs to this org
    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
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
