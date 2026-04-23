// server/src/services/assignment.service.ts

import { db } from "../db/index.js";
import { assignments, submissions, courses, grades, enrollments } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireTenantId } from "../utils/tenant-query.js";
import * as gamificationService from "./gamification.service.js";

export interface CreateAssignmentInput {
  courseId: string;
  title: string;
  description?: string;
  dueDate: Date;
  organizationId: string;
}

export async function createAssignment(data: CreateAssignmentInput) {
  const orgId = requireTenantId(data.organizationId);

  // Verify course exists AND belongs to organization
  const course = await db
    .select()
    .from(courses)
    .where(and(
      eq(courses.id, data.courseId),
      eq(courses.organizationId, orgId)
    ))
    .limit(1);

  if (!course[0]) {
    throw new Error("Course not found or access denied.");
  }

  const [created] = await db
    .insert(assignments)
    .values({
      courseId: data.courseId,
      title: data.title,
      description: data.description || "",
      dueDate: data.dueDate,
    })
    .returning();

  if (!created) throw new Error("Failed to create assignment");
  return created;
}

export async function getAssignmentsForCourse(
  courseId: string,
  organizationId: string,
  limit: number = 50,
  offset: number = 0
) {
  const orgId = requireTenantId(organizationId);

  const { count } = await import('drizzle-orm');
  const countResult = await db.select({ count: count() }).from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(
      eq(assignments.courseId, courseId),
      eq(courses.organizationId, orgId)
    ));
  const totalCount = countResult[0].count;

  // Verify course belongs to org via join
  const data = await db
    .select({
      id: assignments.id,
      courseId: assignments.courseId,
      lessonId: assignments.lessonId,
      title: assignments.title,
      description: assignments.description,
      dueDate: assignments.dueDate,
      createdAt: assignments.createdAt,
      updatedAt: assignments.updatedAt,
      maxScore: assignments.maxScore,
      isPublished: assignments.isPublished,
      type: assignments.type,
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(
      eq(assignments.courseId, courseId),
      eq(courses.organizationId, orgId)
    ))
    .orderBy(desc(assignments.createdAt))
    .limit(limit)
    .offset(offset);

  return { data, totalCount };
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  studentId: string;
  fileUrl: string;
  organizationId: string;
}

export async function submitAssignment(data: SubmitAssignmentInput) {
  const orgId = requireTenantId(data.organizationId);

  // Verify assignment belongs to a course in the organization
  const assignment = await db
    .select({ id: assignments.id })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(
      eq(assignments.id, data.assignmentId),
      eq(courses.organizationId, orgId)
    ))
    .limit(1);

  if (!assignment[0]) {
    throw new Error("Assignment not found or access denied.");
  }

  const existing = await db
    .select()
    .from(submissions)
    .where(
      and(
        eq(submissions.assignmentId, data.assignmentId),
        eq(submissions.studentId, data.studentId)
      )
    );

  if (existing.length > 0) {
    throw new Error("You have already submitted this assignment.");
  }

  const [created] = await db
    .insert(submissions)
    .values({
      assignmentId: data.assignmentId,
      studentId: data.studentId,
      filePath: data.fileUrl,
      submittedAt: new Date(),
    })
    .returning();

  if (!created) throw new Error("Failed to create submission");

  // -- Gamification: fire-and-forget (never throws) -------------------------
  try {
    await gamificationService.awardPoints({
      userId: data.studentId,
      organizationId: orgId,
      eventType: 'assignment_submission',
      entityId: data.assignmentId,
      entityType: 'assignment',
    });
    void gamificationService.evaluateBadges(data.studentId, orgId, 'assignment_submission');
  } catch (gamErr) {
    // Intentionally swallowed — gamification must never break submission flow
  }
  // -------------------------------------------------------------------------

  return created;
}

export interface GradeSubmissionInput {
  submissionId: string;
  grade: number;
  feedback?: string;
  gradedBy?: string;
  maxScore?: number;
  organizationId: string;
}

export async function gradeSubmission(data: GradeSubmissionInput) {
  const orgId = requireTenantId(data.organizationId);

  // Verify submission -> assignment -> course -> org
  const submission = await db
    .select({ id: submissions.id })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(
      eq(submissions.id, data.submissionId),
      eq(courses.organizationId, orgId)
    ))
    .limit(1);

  if (!submission[0]) {
    throw new Error("Submission not found or access denied.");
  }

  // Check if grade already exists
  const existingGrade = await db
    .select()
    .from(grades)
    .where(eq(grades.submissionId, data.submissionId))
    .limit(1);

  // Resolve studentId for gamification (needed in both branches)
  const [submissionRow] = await db
    .select({ studentId: submissions.studentId })
    .from(submissions)
    .where(eq(submissions.id, data.submissionId))
    .limit(1);
  const studentId = submissionRow?.studentId;

  let gradeResult: typeof grades.$inferSelect;

  if (existingGrade.length > 0) {
    // Update existing grade
    const [updated] = await db
      .update(grades)
      .set({
        score: data.grade,
        maxScore: data.maxScore ?? 100,
        feedback: data.feedback ?? null,
        gradedBy: data.gradedBy ?? null,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(grades.submissionId, data.submissionId))
      .returning();

    if (!updated) throw new Error("Failed to update grade.");
    gradeResult = updated;
  } else {
    // Create new grade
    const [created] = await db
      .insert(grades)
      .values({
        id: createId(),
        submissionId: data.submissionId,
        score: data.grade,
        maxScore: data.maxScore ?? 100,
        feedback: data.feedback ?? null,
        gradedBy: data.gradedBy ?? null,
      })
      .returning();

    if (!created) throw new Error("Failed to create grade.");
    gradeResult = created;
  }

  // -- Gamification: award points for a passing grade (fire-and-forget) -----
  try {
    if (studentId) {
      const maxScore = data.maxScore ?? 100;
      const passingThreshold = maxScore * 0.5; // 50% is passing
      if (data.grade >= passingThreshold) {
        await gamificationService.awardPoints({
          userId: studentId,
          organizationId: orgId,
          eventType: 'assignment_graded_pass',
          entityId: data.submissionId,
          entityType: 'submission',
          metadata: { score: data.grade, maxScore },
        });
        void gamificationService.evaluateBadges(studentId, orgId, 'assignment_graded_pass');
      }
    }
  } catch (gamErr) {
    // Intentionally swallowed — gamification must never break grading flow
  }
  // -------------------------------------------------------------------------

  return gradeResult;
}

export async function getStudentProgress(studentId: string, organizationId: string) {
  const orgId = requireTenantId(organizationId);

  // Verify student belongs to org? Or just scope queries to org.
  // We need to fetch assignments from courses in THIS org.

  const studentAssignments = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      courseTitle: courses.title,
      dueDate: assignments.dueDate,
    })
    .from(assignments)
    .innerJoin(courses, eq(assignments.courseId, courses.id)) // changed leftJoin to innerJoin to enforce course existence in org
    .innerJoin(enrollments, and(
      eq(enrollments.courseId, courses.id),
      eq(enrollments.studentId, studentId)
    ))
    .where(eq(courses.organizationId, orgId));

  const studentSubmissions = await db
    .select({
      id: submissions.id,
      assignmentId: submissions.assignmentId,
      studentId: submissions.studentId,
      fileUrl: submissions.filePath,
      content: submissions.content,
      submittedAt: submissions.submittedAt,
      status: submissions.status,
      grade: grades.score
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(grades, eq(submissions.id, grades.submissionId))
    .where(and(
      eq(submissions.studentId, studentId),
      eq(courses.organizationId, orgId)
    ))
    .orderBy(desc(submissions.submittedAt));

  const studentGrades = await db
    .select({
      id: submissions.id,
      courseTitle: courses.title,
      assignmentTitle: assignments.title,
      score: grades.score,
      maxScore: grades.maxScore,
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .leftJoin(grades, eq(submissions.id, grades.submissionId))
    .where(and(
      eq(submissions.studentId, studentId),
      eq(courses.organizationId, orgId)
    ));

  // Refined studentGrades query based on `gradeSubmission` writing to `grades` table
  const safeStudentGrades = await db
    .select({
      id: submissions.id,
      courseTitle: courses.title,
      assignmentTitle: assignments.title,
      score: grades.score,
      maxScore: grades.maxScore,
      feedback: grades.feedback
    })
    .from(submissions)
    .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .innerJoin(courses, eq(assignments.courseId, courses.id))
    .innerJoin(grades, eq(submissions.id, grades.submissionId)) // Only graded ones
    .where(and(
      eq(submissions.studentId, studentId),
      eq(courses.organizationId, orgId)
    ));

  return {
    assignments: studentAssignments,
    submissions: studentSubmissions,
    grades: safeStudentGrades,
  };
}
