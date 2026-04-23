// server/src/services/exam.service.ts

import { db } from "../db/index.js";
import { exams, examTranslations, examQuestions, courses, enrollments, examAttempts, users } from "../db/schema.js";
import { eq, and, desc, asc, inArray, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { requireTenantId } from "../utils/tenant-query.js";

async function resolveExamTranslations<T extends { id: string; title: string; instructions?: string | null }>(
  items: T[],
  locale: string
): Promise<T[]> {
  if (items.length === 0 || locale === 'en') return items;
  const ids = items.map((e) => e.id);
  const rows = await db
    .select()
    .from(examTranslations)
    .where(and(
      inArray(examTranslations.examId, ids),
      inArray(examTranslations.locale, [locale, 'en'])
    ));
  const byExam: Record<string, { locale: string; title: string; instructions?: string | null }[]> = {};
  for (const r of rows) {
    if (!byExam[r.examId]) byExam[r.examId] = [];
    byExam[r.examId].push({ locale: r.locale, title: r.title, instructions: r.instructions ?? undefined });
  }
  return items.map((e) => {
    const tr = byExam[e.id];
    if (!tr) return e;
    const forLocale = tr.find((t) => t.locale === locale);
    const forEn = tr.find((t) => t.locale === 'en');
    return {
      ...e,
      title: forLocale?.title ?? forEn?.title ?? e.title,
      instructions: forLocale?.instructions ?? forEn?.instructions ?? e.instructions,
    };
  });
}

// Type definitions for Exam creation/update
export interface CreateExamInput {
    organizationId: string;
    userId: string; // Teacher creating the exam
    courseId: string;
    title: string;
    description?: string;
    instructions?: string;
    duration: number; // minutes
    timeLimit?: number; // minutes
    totalPoints?: number;
    passingScore?: number;
    attemptsAllowed?: number;
    scheduledStartAt?: Date;
    scheduledEndAt?: Date;
    shuffleQuestions?: boolean;
    shuffleOptions?: boolean;
    showResults?: boolean;
    showResultsImmediately?: boolean;
    showCorrectAnswers?: boolean;
    allowReview?: boolean;
    allowBacktracking?: boolean;
    lateSubmissionAllowed?: boolean;
    lateSubmissionPenalty?: number;
    antiCheatEnabled?: boolean;
    requireWebcam?: boolean;
    requireScreenShare?: boolean;
    requireFullscreen?: boolean;
    requireLockdownBrowser?: boolean;
    tabSwitchLimit?: number;
    copyPasteAllowed?: boolean;
    rightClickAllowed?: boolean;
    recordingDisclosure?: string;
    dataRetentionDays?: number;
    retakeEnabled?: boolean;
    retakeDelay?: number;
    adaptiveRetake?: boolean;
}

export interface UpdateExamInput extends Partial<Omit<CreateExamInput, 'organizationId' | 'userId' | 'courseId'>> {
    organizationId: string;
    userId: string; // User requesting update
    status?: string;
}

export async function createExam(data: CreateExamInput) {
    const orgId = requireTenantId(data.organizationId);

    // Verify course belongs to organization and user is teacher
    const course = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.id, data.courseId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, data.userId)
        ))
        .limit(1);

    if (!course[0]) {
        throw new Error("Course not found or access denied.");
    }

    const [newExam] = await db.insert(exams).values({
        organizationId: orgId,
        courseId: data.courseId,
        createdBy: data.userId,
        title: data.title,
        description: data.description || null,
        instructions: data.instructions || null,
        status: 'draft',
        scheduledStartAt: data.scheduledStartAt || null,
        scheduledEndAt: data.scheduledEndAt || null,
        duration: data.duration,
        totalPoints: data.totalPoints || 100,
        passingScore: data.passingScore || 70,
        attemptsAllowed: (data.attemptsAllowed || 1).toString(),
        maxAttempts: data.attemptsAllowed || 1,
        timeLimit: data.timeLimit ? data.timeLimit.toString() : null,
        lateSubmissionAllowed: data.lateSubmissionAllowed,
        lateSubmissionPenalty: data.lateSubmissionPenalty || 0,
        shuffleQuestions: data.shuffleQuestions,
        shuffleOptions: data.shuffleOptions,
        showResults: data.showResults,
        showResultsImmediately: data.showResultsImmediately,
        showCorrectAnswers: data.showCorrectAnswers,
        allowReview: data.allowReview,
        allowBacktracking: data.allowBacktracking,
        antiCheatEnabled: data.antiCheatEnabled,
        requireWebcam: data.requireWebcam,
        requireScreenShare: data.requireScreenShare,
        requireFullscreen: data.requireFullscreen,
        requireLockdownBrowser: data.requireLockdownBrowser,
        tabSwitchLimit: data.tabSwitchLimit,
        copyPasteAllowed: data.copyPasteAllowed,
        rightClickAllowed: data.rightClickAllowed,
        retakeEnabled: data.retakeEnabled,
        retakeDelay: data.retakeDelay,
        adaptiveRetake: data.adaptiveRetake,
        recordingDisclosure: data.recordingDisclosure || null,
        dataRetentionDays: data.dataRetentionDays || 365,
    } as any).returning();

    if (newExam) {
        await db.insert(examTranslations).values({
            examId: newExam.id,
            locale: 'en',
            title: data.title,
            instructions: data.instructions ?? null,
        });
    }
    return newExam;
}

export async function updateExam(examId: string, data: UpdateExamInput) {
    const orgId = requireTenantId(data.organizationId);

    // Verify exam exists and user has permission (owns course in org)
    const existingExam = await db
        .select({
            id: exams.id,
            courseId: exams.courseId,
        })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, data.userId)
        ))
        .limit(1);

    if (!existingExam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    // Filter out undefined values from data
    const updateData: any = { ...data, organizationId: undefined, userId: undefined };
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    if (updateData.attemptsAllowed) {
        updateData.maxAttempts = updateData.attemptsAllowed;
        updateData.attemptsAllowed = updateData.attemptsAllowed.toString();
    }
    if (updateData.timeLimit) {
        updateData.timeLimit = updateData.timeLimit.toString();
    }
    updateData.updatedAt = new Date();

    const [updatedExam] = await db
        .update(exams)
        .set(updateData)
        .where(eq(exams.id, examId))
        .returning();

    return updatedExam;
}

export async function deleteExam(examId: string, userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify permission
    const existingExam = await db
        .select({
            id: exams.id,
        })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, userId)
        ))
        .limit(1);

    if (!existingExam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    await db.delete(exams).where(eq(exams.id, examId));
    return true;
}

export async function getExamById(
    examId: string,
    userId: string,
    role: string,
    organizationId: string,
    locale?: string
) {
    const orgId = requireTenantId(organizationId);

    const [exam] = await db
        .select()
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    if (!exam) {
        return null;
    }

    let { exams: examData, courses: courseData } = exam;
    if (locale && locale !== 'en') {
        const [resolved] = await resolveExamTranslations([examData], locale);
        if (resolved) examData = resolved;
    }

    // Access Control
    const isOwner = courseData.teacherId === userId;
    const isAdmin = role === 'admin';
    const isStudent = role === 'student';

    if (!isOwner && !isAdmin && !isStudent) {
        throw new Error("Forbidden: Access denied.");
    }

    if (isStudent) {
        // Verify enrollment
        const [enrollment] = await db
            .select()
            .from(enrollments)
            .where(and(
                eq(enrollments.studentId, userId),
                eq(enrollments.courseId, examData.courseId)
            ))
            .limit(1);

        if (!enrollment) {
            throw new Error("Forbidden: You are not enrolled in this course.");
        }
    }

    // Fetch questions
    const questions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, examId))
        .orderBy(asc(examQuestions.order));

    return {
        ...examData,
        questions: questions.map(q => ({
            ...q,
            options: q.options as any,
            correctAnswer: q.correctAnswer as any,
        }))
    };
}

export async function getExamsByCourse(
    courseId: string,
    userId: string,
    role: string,
    organizationId: string,
    locale?: string,
    limit: number = 50,
    offset: number = 0
) {
    const orgId = requireTenantId(organizationId);

    // Verify course and access
    const [course] = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    if (!course) {
        throw new Error("Course not found.");
    }

    const isOwner = course.teacherId === userId;
    const isAdmin = role === 'admin';
    const isStudent = role === 'student';

    if (!isOwner && !isAdmin && !isStudent) {
        throw new Error("Forbidden: Access denied.");
    }

    if (isStudent) {
        const [enrollment] = await db
            .select()
            .from(enrollments)
            .where(and(
                eq(enrollments.studentId, userId),
                eq(enrollments.courseId, courseId)
            ))
            .limit(1);

        if (!enrollment) {
            throw new Error("Forbidden: You are not enrolled in this course.");
        }
    }

    const { count } = await import('drizzle-orm');
    const countResult = await db.select({ count: count() }).from(exams).where(eq(exams.courseId, courseId));
    const totalCount = countResult[0].count;

    const courseExams = await db
        .select({
            id: exams.id,
            title: exams.title,
            description: exams.description,
            instructions: exams.instructions,
            status: exams.status,
            scheduledStartAt: exams.scheduledStartAt,
            scheduledEndAt: exams.scheduledEndAt,
            duration: exams.duration,
            totalPoints: exams.totalPoints,
            passingScore: exams.passingScore,
            attemptsAllowed: exams.attemptsAllowed,
            antiCheatEnabled: exams.antiCheatEnabled,
            createdAt: exams.createdAt,
        })
        .from(exams)
        .where(eq(exams.courseId, courseId))
        .orderBy(desc(exams.createdAt))
        .limit(limit)
        .offset(offset);

    const data = locale ? await resolveExamTranslations(courseExams, locale) : courseExams;

    return { data, totalCount };
}

export async function getAvailableExamsForStudent(
    studentId: string, 
    organizationId: string,
    limit: number = 50,
    offset: number = 0
) {
    const orgId = requireTenantId(organizationId);

    // Get student's enrollments in this org
    const studentEnrollments = await db
        .select({ courseId: enrollments.courseId })
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(
            eq(enrollments.studentId, studentId),
            eq(courses.organizationId, orgId)
        ));

    if (studentEnrollments.length === 0) {
        return { data: [], totalCount: 0 };
    }

    const courseIds = studentEnrollments.map(e => e.courseId);

    const whereConditions = and(
        sql`${exams.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`,
        inArray(exams.status, ['scheduled', 'active']),
        eq(courses.organizationId, orgId) // Redundant but safe
    );

    const { count } = await import('drizzle-orm');
    const countResult = await db.select({ count: count() }).from(exams).innerJoin(courses, eq(exams.courseId, courses.id)).where(whereConditions);
    const totalCount = countResult[0].count;

    const availableExams = await db
        .select()
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(whereConditions)
        .limit(limit)
        .offset(offset);

    const data = availableExams.map(result => result.exams);
    return { data, totalCount };
}

// ==========================================================
// QUESTION MANAGEMENT
// ==========================================================

export interface CreateQuestionInput {
    examId: string;
    text: string;
    type: string;
    points: number;
    options?: any[]; // for MC
    correctAnswer?: any;
    rubric?: any;
    topic?: string;
    subtopic?: string;
    skillTag?: string;
    difficultyLevel?: string;

    // Auth vars
    userId: string;
    organizationId: string;
}

export async function addQuestion(data: CreateQuestionInput) {
    const orgId = requireTenantId(data.organizationId);

    // Verify exam and permission
    const exam = await db
        .select({ id: exams.id })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, data.examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, data.userId)
        ))
        .limit(1);

    if (!exam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    // Get current question count to determine order
    const existingQuestions = await db
        .select()
        .from(examQuestions)
        .where(eq(examQuestions.examId, data.examId));

    const nextOrder = existingQuestions.length + 1;

    // Map input types to DB enum/types if needed (assuming service caller handles validation logic like route did)
    // But let's assume raw data is passed and we might need mapping if logic was complex.
    // The route had logic to format options/correctAnswer. We should move that logic here or expect mapped data.
    // For simplicity, let's assume the controller/route prepares the `options` and `correctAnswer` in the correct JSON format.

    const [newQuestion] = await db
        .insert(examQuestions)
        .values({
            id: createId(),
            examId: data.examId,
            questionType: data.type as any, // Expecting valid DB enum value: 'multiple_choice', etc.
            questionText: data.text,
            options: data.options || null,
            correctAnswer: data.correctAnswer || null,
            points: data.points,
            order: nextOrder,
            topic: data.topic || null,
            subtopic: data.subtopic || null,
            skillTag: data.skillTag || null,
            difficultyLevel: data.difficultyLevel || null,
            partialCreditEnabled: false,
            requiresManualGrading: data.type !== 'multiple_choice' && data.type !== 'true_false',
            rubric: data.rubric || null,
        } as any)
        .returning();

    return newQuestion;
}

export interface UpdateQuestionInput extends Partial<Omit<CreateQuestionInput, 'examId' | 'organizationId' | 'userId'>> {
    questionId: string;
    examId: string; // Passed for verification context
    organizationId: string;
    userId: string;
}

export async function updateQuestion(data: UpdateQuestionInput) {
    const orgId = requireTenantId(data.organizationId);

    // Verify exam and permission
    const exam = await db
        .select({ id: exams.id })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, data.examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, data.userId)
        ))
        .limit(1);

    if (!exam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    // Prepare update object
    const updateData: any = { ...data, questionId: undefined, examId: undefined, organizationId: undefined, userId: undefined };
    // Remove undefined
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    // Rename 'text' to 'questionText' if present (service input uses 'text' to match frontend commonly, or we align naming)
    if (updateData.text) {
        updateData.questionText = updateData.text;
        delete updateData.text;
    }
    if (updateData.type) {
        updateData.questionType = updateData.type;
        delete updateData.type;
        updateData.requiresManualGrading = updateData.questionType !== 'multiple_choice' && updateData.questionType !== 'true_false';
    }

    const [updated] = await db
        .update(examQuestions)
        .set(updateData)
        .where(and(
            eq(examQuestions.id, data.questionId),
            eq(examQuestions.examId, data.examId)
        ))
        .returning();

    if (!updated) {
        throw new Error("Question not found.");
    }

    return updated;
}

export async function deleteQuestion(questionId: string, examId: string, userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify exam and permission
    const exam = await db
        .select({ id: exams.id })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, userId)
        ))
        .limit(1);

    if (!exam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    await db.delete(examQuestions).where(and(
        eq(examQuestions.id, questionId),
        eq(examQuestions.examId, examId)
    ));

    return true;
}

export async function reorderQuestions(examId: string, questionIds: string[], userId: string, organizationId: string) {
    const orgId = requireTenantId(organizationId);

    // Verify exam and permission
    const exam = await db
        .select({ id: exams.id })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, userId)
        ))
        .limit(1);

    if (!exam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    // Reorder transaction
    await db.transaction(async (tx) => {
        for (let i = 0; i < questionIds.length; i++) {
            await tx
                .update(examQuestions)
                .set({ order: i + 1 } as any)
                .where(and(
                    eq(examQuestions.id, questionIds[i]),
                    eq(examQuestions.examId, examId)
                ));
        }
    });

    return true;
}

export async function getExamAttempts(examId: string, userId: string, organizationId: string, limit: number = 50, offset: number = 0) {
    const orgId = requireTenantId(organizationId);

    // Verify exam and permission (teacher owns course in org)
    const exam = await db
        .select({ id: exams.id })
        .from(exams)
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .where(and(
            eq(exams.id, examId),
            eq(courses.organizationId, orgId),
            eq(courses.teacherId, userId)
        ))
        .limit(1);

    if (!exam[0]) {
        throw new Error("Exam not found or access denied.");
    }

    const { count } = await import('drizzle-orm');
    const countResult = await db.select({ count: count() }).from(examAttempts).where(eq(examAttempts.examId, examId));
    const totalCount = countResult[0].count;

    // Fetch attempts
    const attempts = await db
        .select({
            id: examAttempts.id,
            studentId: examAttempts.studentId,
            studentName: users.fullName,
            studentEmail: users.email,
            startedAt: examAttempts.startedAt,
            submittedAt: examAttempts.submittedAt,
            score: examAttempts.score,
            percentage: examAttempts.percentage,
            passed: examAttempts.passed,
            flaggedForReview: examAttempts.flaggedForReview,
            // reviewStatus doesn't exist on examAttempts in current schema
        })
        .from(examAttempts)
        .innerJoin(users, eq(examAttempts.studentId, users.id))
        .where(eq(examAttempts.examId, examId))
        .orderBy(desc(examAttempts.startedAt))
        .limit(limit)
        .offset(offset);

    return { data: attempts, totalCount };
}
