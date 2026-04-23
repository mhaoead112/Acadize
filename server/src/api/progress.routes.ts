import { Router } from 'express';
import { db } from '../db/index.js';
import { assignments, submissions, grades, enrollments, courses } from '../db/schema.js';
import { eq, and, sql, desc, inArray } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];

const router = Router();

// Helper function to calculate bonus points
function calculateBonusPoints(dueDate: Date, submittedAt: Date, maxScore: number): number {
  const hoursBeforeDue = (dueDate.getTime() - submittedAt.getTime()) / (1000 * 60 * 60);

  // Early submission bonus tiers
  if (hoursBeforeDue >= 72) { // 3+ days early
    return maxScore * 0.10; // 10% bonus
  } else if (hoursBeforeDue >= 48) { // 2+ days early
    return maxScore * 0.07; // 7% bonus
  } else if (hoursBeforeDue >= 24) { // 1+ day early
    return maxScore * 0.05; // 5% bonus
  } else if (hoursBeforeDue >= 12) { // 12+ hours early
    return maxScore * 0.03; // 3% bonus
  }

  return 0; // No bonus for submissions within 12 hours of deadline
}

// GET /api/progress/overall - Get overall student progress
router.get('/overall', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all assignments for courses the student is enrolled in
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, userId));

    const courseIds = studentEnrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return res.json({
        totalScore: 0,
        totalMaxScore: 0,
        progressPercentage: 0,
        totalBonusPoints: 0,
        assignmentsCompleted: 0,
        totalAssignments: 0,
      });
    }

    // Get all assignments for enrolled courses
    const allAssignments = await db
      .select()
      .from(assignments)
      .where(inArray(assignments.courseId, courseIds));

    // Get all submissions with grades
    const studentSubmissions = await db
      .select({
        submissionId: submissions.id,
        assignmentId: submissions.assignmentId,
        submittedAt: submissions.submittedAt,
        score: grades.score,
        maxScore: grades.maxScore,
      })
      .from(submissions)
      .leftJoin(grades, eq(grades.submissionId, submissions.id))
      .where(eq(submissions.studentId, userId));

    let totalScore = 0;
    let totalMaxScore = 0;
    let totalBonusPoints = 0;
    let gradedCount = 0;

    // Calculate totals with bonus
    for (const assignment of allAssignments) {
      const submission = studentSubmissions.find(s => s.assignmentId === assignment.id);
      const maxScore = Number(assignment.maxScore || 100);
      totalMaxScore += maxScore;

      if (submission && submission.score) {
        const score = Number(submission.score);
        totalScore += score;
        gradedCount++;

        // Calculate bonus if submitted early
        if (assignment.dueDate && submission.submittedAt) {
          const dueDate = new Date(assignment.dueDate);
          const submittedAt = new Date(submission.submittedAt);

          if (submittedAt < dueDate) {
            const bonus = calculateBonusPoints(dueDate, submittedAt, maxScore);
            totalBonusPoints += bonus;
            totalScore += bonus;
          }
        }
      }
    }

    const progressPercentage = totalMaxScore > 0
      ? Math.round((totalScore / totalMaxScore) * 100)
      : 0;

    res.json({
      totalScore: Math.round(totalScore * 100) / 100,
      totalMaxScore,
      progressPercentage,
      totalBonusPoints: Math.round(totalBonusPoints * 100) / 100,
      assignmentsCompleted: gradedCount,
      totalAssignments: allAssignments.length,
    });
  } catch (error) {
    console.error('Error fetching overall progress:', error);
    res.status(500).json({ error: 'Failed to fetch progress' });
  }
});

// GET /api/progress/courses - Get progress for all enrolled courses
router.get('/courses', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;

    // Get all enrollments with course details
    const studentEnrollments = await db
      .select({
        courseId: enrollments.courseId,
        courseName: courses.title,
        courseDescription: courses.description,
      })
      .from(enrollments)
      .innerJoin(courses, eq(courses.id, enrollments.courseId))
      .where(eq(enrollments.studentId, userId));

    const courseProgress = await Promise.all(
      studentEnrollments.map(async (enrollment) => {
        // Get all assignments for this course
        const courseAssignments = await db
          .select()
          .from(assignments)
          .where(eq(assignments.courseId, enrollment.courseId));

        // Get assignment IDs for this course
        const assignmentIds = courseAssignments.map(a => a.id);

        // Get submissions for this course
        const courseSubmissions = assignmentIds.length > 0 ? await db
          .select({
            submissionId: submissions.id,
            assignmentId: submissions.assignmentId,
            submittedAt: submissions.submittedAt,
            score: grades.score,
            maxScore: grades.maxScore,
          })
          .from(submissions)
          .leftJoin(grades, eq(grades.submissionId, submissions.id))
          .where(
            and(
              eq(submissions.studentId, userId),
              inArray(submissions.assignmentId, assignmentIds)
            )
          ) : [];

        let totalScore = 0;
        let totalMaxScore = 0;
        let totalBonusPoints = 0;
        let gradedCount = 0;

        for (const assignment of courseAssignments) {
          const submission = courseSubmissions.find(s => s.assignmentId === assignment.id);
          const maxScore = Number(assignment.maxScore || 100);
          totalMaxScore += maxScore;

          if (submission && submission.score) {
            const score = Number(submission.score);
            totalScore += score;
            gradedCount++;

            // Calculate bonus
            if (assignment.dueDate && submission.submittedAt) {
              const dueDate = new Date(assignment.dueDate);
              const submittedAt = new Date(submission.submittedAt);

              if (submittedAt < dueDate) {
                const bonus = calculateBonusPoints(dueDate, submittedAt, maxScore);
                totalBonusPoints += bonus;
                totalScore += bonus;
              }
            }
          }
        }

        const progressPercentage = totalMaxScore > 0
          ? Math.round((totalScore / totalMaxScore) * 100)
          : 0;

        return {
          courseId: enrollment.courseId,
          courseName: enrollment.courseName,
          courseDescription: enrollment.courseDescription,
          totalScore: Math.round(totalScore * 100) / 100,
          totalMaxScore,
          progressPercentage,
          bonusPoints: Math.round(totalBonusPoints * 100) / 100,
          assignmentsCompleted: gradedCount,
          totalAssignments: courseAssignments.length,
        };
      })
    );

    res.json(courseProgress);
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// GET /api/progress/course/:courseId - Get progress for a specific course
router.get('/course/:courseId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { courseId } = req.params;

    // Verify enrollment
    const enrollment = await db
      .select()
      .from(enrollments)
      .where(
        and(
          eq(enrollments.studentId, userId),
          eq(enrollments.courseId, courseId)
        )
      )
      .limit(1);

    if (enrollment.length === 0) {
      return res.status(403).json({ error: 'Not enrolled in this course' });
    }

    // Get course details
    const [course] = await db
      .select()
      .from(courses)
      .where(eq(courses.id, courseId))
      .limit(1);

    // Get all assignments
    const courseAssignments = await db
      .select()
      .from(assignments)
      .where(eq(assignments.courseId, courseId))
      .orderBy(desc(assignments.dueDate));

    // Get submissions with details
    const assignmentDetails = await Promise.all(
      courseAssignments.map(async (assignment) => {
        const [submission] = await db
          .select({
            id: submissions.id,
            submittedAt: submissions.submittedAt,
            status: submissions.status,
            score: grades.score,
            maxScore: grades.maxScore,
            feedback: grades.feedback,
          })
          .from(submissions)
          .leftJoin(grades, eq(grades.submissionId, submissions.id))
          .where(
            and(
              eq(submissions.assignmentId, assignment.id),
              eq(submissions.studentId, userId)
            )
          )
          .limit(1);

        let bonusPoints = 0;
        let bonusPercentage = 0;

        if (submission && assignment.dueDate && submission.submittedAt) {
          const dueDate = new Date(assignment.dueDate);
          const submittedAt = new Date(submission.submittedAt);

          if (submittedAt < dueDate) {
            const maxScore = Number(assignment.maxScore || 100);
            bonusPoints = calculateBonusPoints(dueDate, submittedAt, maxScore);
            bonusPercentage = Math.round((bonusPoints / maxScore) * 100);
          }
        }

        return {
          assignmentId: assignment.id,
          assignmentTitle: assignment.title,
          dueDate: assignment.dueDate,
          maxScore: assignment.maxScore,
          score: submission?.score || null,
          bonusPoints: Math.round(bonusPoints * 100) / 100,
          bonusPercentage,
          submittedAt: submission?.submittedAt || null,
          status: submission?.status || 'not_submitted',
          feedback: submission?.feedback || null,
        };
      })
    );

    // Calculate totals
    let totalScore = 0;
    let totalMaxScore = 0;
    let totalBonusPoints = 0;
    let gradedCount = 0;

    assignmentDetails.forEach(detail => {
      const maxScore = Number(detail.maxScore || 100);
      totalMaxScore += maxScore;

      if (detail.score) {
        totalScore += Number(detail.score);
        totalBonusPoints += detail.bonusPoints;
        gradedCount++;
      }
    });

    const progressPercentage = totalMaxScore > 0
      ? Math.round(((totalScore + totalBonusPoints) / totalMaxScore) * 100)
      : 0;

    res.json({
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
      },
      progress: {
        totalScore: Math.round(totalScore * 100) / 100,
        totalBonusPoints: Math.round(totalBonusPoints * 100) / 100,
        totalMaxScore,
        progressPercentage,
        assignmentsCompleted: gradedCount,
        totalAssignments: courseAssignments.length,
      },
      assignments: assignmentDetails,
    });
  } catch (error) {
    console.error('Error fetching course progress:', error);
    res.status(500).json({ error: 'Failed to fetch course progress' });
  }
});

// GET /api/progress/bonus-info - Get bonus system information
router.get('/bonus-info', ...requireAuth, async (req, res) => {
  res.json({
    bonusTiers: [
      { hoursEarly: 72, percentage: 10, label: '3+ days early' },
      { hoursEarly: 48, percentage: 7, label: '2+ days early' },
      { hoursEarly: 24, percentage: 5, label: '1+ day early' },
      { hoursEarly: 12, percentage: 3, label: '12+ hours early' },
    ],
    description: 'Submit assignments early to earn bonus points! The earlier you submit, the more bonus you get.',
  });
});

export default router;
