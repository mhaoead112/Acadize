import { db } from "../db/index.js";
import { assignments, submissions, courses, grades } from "../db/schema.js";
import { and, desc, eq } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

export interface CreateAssignmentInput {
  courseId: string;
  title: string;
  instructions?: string;
  dueDate: Date;
}

export async function createAssignment(data: CreateAssignmentInput) {
  const [created] = await db
    .insert(assignments)
    .values({
      courseId: data.courseId,
      title: data.title,
      instructions: data.instructions || "",
      dueDate: data.dueDate,
    })
    .returning();

  if (!created) throw new Error("Failed to create assignment");
  return created;
}

export async function getAssignmentsForCourse(courseId: string) {
  return db
    .select()
    .from(assignments)
    .where(eq(assignments.courseId, courseId))
    .orderBy(desc(assignments.createdAt));
}

export interface SubmitAssignmentInput {
  assignmentId: string;
  studentId: string;
  fileUrl: string;
}

export async function submitAssignment(data: SubmitAssignmentInput) {
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
}

export async function gradeSubmission(data: GradeSubmissionInput) {
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

export async function getStudentProgress(studentId: string) {
  const studentAssignments = await db
    .select({
      id: assignments.id,
      title: assignments.title,
      courseTitle: courses.title,
      dueDate: assignments.dueDate,
    })
    .from(assignments)
    .leftJoin(courses, eq(assignments.courseId, courses.id));

  const studentSubmissions = await db
    .select()
    .from(submissions)
    .where(eq(submissions.studentId, studentId))
    .orderBy(desc(submissions.submittedAt));

  const studentGrades = await db
    .select({
      id: submissions.id,
      courseTitle: courses.title,
      assignmentTitle: assignments.title,
      score: submissions.grade,
      maxScore: submissions.maxScore,
      letterGrade: submissions.letterGrade,
    })
    .from(submissions)
    .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
    .leftJoin(courses, eq(assignments.courseId, courses.id))
    .where(and(eq(submissions.studentId, studentId)));

  return {
    assignments: studentAssignments,
    submissions: studentSubmissions,
    grades: studentGrades,
  };
}
