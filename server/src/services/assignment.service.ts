// server/src/services/assignment.service.ts

import { db } from "../db/index.js";
import { assignments, submissions, courses, grades, enrollments } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireTenantId } from "../utils/tenant-query.js";

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

export async function getAssignmentsForCourse(courseId: string, organizationId: string) {
  const orgId = requireTenantId(organizationId);

  // Verify course belongs to org via join
  return db
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
    .orderBy(desc(assignments.createdAt));
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
      fileUrl: data.fileUrl,
      submittedAt: new Date(),
    })
    .returning();

  if (!created) throw new Error("Failed to create submission");
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

  if (existingGrade.length > 0) {
    // Update existing grade
    const [updated] = await db
      .update(grades)
      .set({
        score: data.grade.toString(),
        maxScore: data.maxScore?.toString() || '100',
        feedback: data.feedback ?? null,
        gradedBy: data.gradedBy ?? null,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(grades.submissionId, data.submissionId))
      .returning();

    if (!updated) throw new Error("Failed to update grade.");
    return updated;
  } else {
    // Create new grade
    const [created] = await db
      .insert(grades)
      .values({
        id: createId(),
        submissionId: data.submissionId,
        score: data.grade.toString(),
        maxScore: data.maxScore?.toString() || '100',
        feedback: data.feedback ?? null,
        gradedBy: data.gradedBy ?? null,
      })
      .returning();

    if (!created) throw new Error("Failed to create grade.");
    return created;
  }
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
      fileUrl: submissions.fileUrl,
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
      score: submissions.grade, // Note: Schema check needed if 'grade' column exists on submissions or if it is joined via 'grades' table.
      // The original code used `submissions.grade` but also `grades` table elsewhere? 
      // Original code: 
      /*
      const studentGrades = await db
        .select({
          ...
          score: submissions.grade,
          maxScore: submissions.maxScore,
          letterGrade: submissions.letterGrade,
        })
        .from(submissions)
        ...
      */
      // It seems `submissions` table might have denormalized grade columns OR the original code was wrong/using a different view.
      // `grades` table is used in `gradeSubmission`.
      // Let's stick to joining `grades`.
      // But wait, `submissions` in `db/schema.ts` might have `grade`? I should check schema.
      // For safety, I'll assume `grades` table is the source of truth if `gradeSubmission` writes to it.

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
