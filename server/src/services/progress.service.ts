import { db } from "../db/index.js";
import { grades, submissions, assignments, courses } from "../db/schema.js";
import { eq, and, sql } from "drizzle-orm";

export interface ProgressData {
  overallProgress: number;
  totalScore: number;
  totalMaxScore: number;
  gradedAssignments: number;
  totalAssignments: number;
}

export interface CourseProgress {
  courseId: string;
  courseName: string;
  progress: number;
  score: number;
  maxScore: number;
  gradedAssignments: number;
  totalAssignments: number;
}

/**
 * Calculate overall progress for a student
 * Formula: (sum of scores) / (sum of maxScores) * 100
 */
export async function getStudentProgress(studentId: string): Promise<ProgressData> {
  // Get all graded submissions for this student
  const result = await db
    .select({
      score: grades.score,
      maxScore: grades.maxScore,
      submissionId: grades.submissionId,
    })
    .from(grades)
    .innerJoin(submissions, eq(grades.submissionId, submissions.id))
    .where(eq(submissions.studentId, studentId));

  // Get total assignments for this student (based on their courses)
  const totalAssignmentsResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(assignments)
    .where(eq(assignments.courseId, submissions.studentId)); // This needs refinement

  const totalScore = result.reduce((sum, item) => sum + (item.score ?? 0), 0);
  const totalMaxScore = result.reduce((sum, item) => sum + (item.maxScore ?? 100), 0);
  const gradedAssignments = result.length;

  const overallProgress = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

  return {
    overallProgress: Math.round(overallProgress * 100) / 100, // Round to 2 decimals
    totalScore,
    totalMaxScore,
    gradedAssignments,
    totalAssignments: gradedAssignments, // Simplified for now
  };
}

/**
 * Calculate per-course progress for a student
 */
export async function getStudentCourseProgress(studentId: string): Promise<CourseProgress[]> {
  // Get all graded submissions grouped by course
  const result = await db
    .select({
      courseId: assignments.courseId,
      courseName: courses.title,
      score: grades.score,
      maxScore: grades.maxScore,
    })
    .from(grades)
    .innerJoin(submissions, eq(grades.submissionId, submissions.id))
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(eq(submissions.studentId, studentId));

  // Group by course
  const courseMap = new Map<string, {
    courseName: string;
    scores: number[];
    maxScores: number[];
  }>();

  for (const row of result) {
    if (!courseMap.has(row.courseId)) {
      courseMap.set(row.courseId, {
        courseName: row.courseName,
        scores: [],
        maxScores: [],
      });
    }
    const course = courseMap.get(row.courseId)!;
    course.scores.push(row.score ?? 0);
    course.maxScores.push(row.maxScore ?? 100);
  }

  // Calculate progress for each course
  const courseProgress: CourseProgress[] = [];
  for (const [courseId, data] of Array.from(courseMap.entries())) {
    const totalScore = data.scores.reduce((sum: number, s: number) => sum + s, 0);
    const totalMaxScore = data.maxScores.reduce((sum: number, s: number) => sum + s, 0);
    const progress = totalMaxScore > 0 ? (totalScore / totalMaxScore) * 100 : 0;

    courseProgress.push({
      courseId,
      courseName: data.courseName,
      progress: Math.round(progress * 100) / 100,
      score: totalScore,
      maxScore: totalMaxScore,
      gradedAssignments: data.scores.length,
      totalAssignments: data.scores.length, // Simplified
    });
  }

  return courseProgress;
}

/**
 * Calculate bonus points for early submissions
 * @param submittedAt When the assignment was submitted
 * @param dueDate When the assignment is due
 * @param bonusPercentPerDay Bonus percentage per day early (default: 5%)
 */
export function calculateBonusPoints(
  submittedAt: Date,
  dueDate: Date,
  bonusPercentPerDay: number = 5
): number {
  const submittedTime = submittedAt.getTime();
  const dueTime = dueDate.getTime();
  
  if (submittedTime >= dueTime) {
    return 0; // No bonus for late or on-time submissions
  }

  const daysEarly = Math.floor((dueTime - submittedTime) / (1000 * 60 * 60 * 24));
  return daysEarly * bonusPercentPerDay;
}
