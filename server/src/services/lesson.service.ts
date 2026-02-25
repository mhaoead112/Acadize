// server/src/services/lesson.service.ts

import { db } from '../db/index.js';
import { lessons, lessonTranslations, courses } from '../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { requireTenantId } from '../utils/tenant-query.js';

async function resolveLessonTranslations<T extends { id: string; title: string }>(
  items: T[],
  locale: string
): Promise<T[]> {
  if (items.length === 0 || locale === 'en') return items;
  const ids = items.map((l) => l.id);
  const rows = await db
    .select()
    .from(lessonTranslations)
    .where(and(inArray(lessonTranslations.lessonId, ids), inArray(lessonTranslations.locale, [locale, 'en'])));
  const byLesson: Record<string, { locale: string; title: string }[]> = {};
  for (const r of rows) {
    if (!byLesson[r.lessonId]) byLesson[r.lessonId] = [];
    byLesson[r.lessonId].push({ locale: r.locale, title: r.title });
  }
  return items.map((l) => {
    const tr = byLesson[l.id];
    if (!tr) return l;
    const forLocale = tr.find((t) => t.locale === locale);
    const forEn = tr.find((t) => t.locale === 'en');
    return { ...l, title: forLocale?.title ?? forEn?.title ?? l.title };
  });
}

export interface CreateLessonDto {
    courseId: string;
    title: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: string;
    organizationId: string;
}

export const createLesson = async (lessonData: CreateLessonDto) => {
    const orgId = requireTenantId(lessonData.organizationId);
    const { courseId, title, fileName, filePath, fileType, fileSize } = lessonData;

    // Verify course exists AND belongs to organization
    const course = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    if (!course[0]) {
        throw new Error("Course not found or access denied.");
    }

    // Get max order to append to end
    const result = await db
        .select({ maxOrder: sql<number>`max(${lessons.order})` })
        .from(lessons)
        .where(eq(lessons.courseId, courseId));

    const nextOrder = (result[0]?.maxOrder || 0) + 1;

    const newLesson = await db.insert(lessons).values({
        courseId,
        title,
        fileName,
        filePath,
        fileType,
        fileSize,
        order: nextOrder
    }).returning();

    if (!newLesson[0]) {
        throw new Error("Failed to create lesson.");
    }

    await db.insert(lessonTranslations).values({
        lessonId: newLesson[0].id,
        locale: 'en',
        title,
    });
    return newLesson[0];
};

export const getLessonsByCourse = async (courseId: string, organizationId: string, locale?: string) => {
    const orgId = requireTenantId(organizationId);

    // Join with courses to verify org
    const courseLessons = await db
        .select({
            id: lessons.id,
            courseId: lessons.courseId,
            title: lessons.title,
            fileName: lessons.fileName,
            filePath: lessons.filePath,
            fileType: lessons.fileType,
            fileSize: lessons.fileSize,
            order: lessons.order,
            createdAt: lessons.createdAt,
            updatedAt: lessons.updatedAt,
        })
        .from(lessons)
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(and(
            eq(lessons.courseId, courseId),
            eq(courses.organizationId, orgId)
        ))
        .orderBy(lessons.order);

    if (locale) return resolveLessonTranslations(courseLessons, locale);
    return courseLessons;
};

export const getLessonById = async (lessonId: string, organizationId: string, locale?: string) => {
    const orgId = requireTenantId(organizationId);

    const lesson = await db
        .select({
            id: lessons.id,
            courseId: lessons.courseId,
            title: lessons.title,
            fileName: lessons.fileName,
            filePath: lessons.filePath,
            fileType: lessons.fileType,
            fileSize: lessons.fileSize,
            order: lessons.order,
            createdAt: lessons.createdAt,
            updatedAt: lessons.updatedAt,
        })
        .from(lessons)
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(and(
            eq(lessons.id, lessonId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    const row = lesson[0] || null;
    if (!row || !locale || locale === 'en') return row;
    const [resolved] = await resolveLessonTranslations([row], locale);
    return resolved ?? row;
};

export const getLessonWithCourseInfo = async (
    lessonId: string,
    courseId: string,
    organizationId: string
) => {
    const orgId = requireTenantId(organizationId);

    const [lesson] = await db
        .select({
            id: lessons.id,
            courseId: lessons.courseId,
            title: lessons.title,
            fileName: lessons.fileName,
            filePath: lessons.filePath,
            fileType: lessons.fileType,
            fileSize: lessons.fileSize,
            order: lessons.order,
            createdAt: lessons.createdAt,
            updatedAt: lessons.updatedAt,
            courseName: courses.title,
        })
        .from(lessons)
        .leftJoin(courses, eq(lessons.courseId, courses.id))
        .where(and(
            eq(lessons.id, lessonId),
            eq(lessons.courseId, courseId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);

    return lesson || null;
};

export const deleteLesson = async (lessonId: string, organizationId: string) => {
    const orgId = requireTenantId(organizationId);

    // Verify ownership via join before delete
    // OR use a WHERE clause with exists/subquery. 
    // Drizzle delete with join is not always straightforward in all SQL dialects, 
    // but we can verify existence first or use a CTE.
    // Simplest is to verify existence first, then delete by ID.
    // Since this is critical security, let's verify first.

    const lesson = await getLessonById(lessonId, orgId);
    if (!lesson) {
        throw new Error("Lesson not found or access denied.");
    }

    const deletedLesson = await db
        .delete(lessons)
        .where(eq(lessons.id, lessonId))
        .returning();

    if (!deletedLesson[0]) {
        throw new Error("Failed to delete lesson.");
    }

    return deletedLesson[0];
};

export const updateLesson = async (lessonId: string, updates: Partial<CreateLessonDto>, organizationId: string) => {
    const orgId = requireTenantId(organizationId);

    // Verify ownership first
    const existingLesson = await getLessonById(lessonId, orgId);
    if (!existingLesson) {
        throw new Error("Lesson not found or access denied.");
    }

    const { organizationId: _, ...safeUpdates } = updates; // exclude orgId from updates if present

    const updatedLesson = await db
        .update(lessons)
        .set(safeUpdates)
        .where(eq(lessons.id, lessonId))
        .returning();

    if (!updatedLesson[0]) {
        throw new Error("Failed to update lesson.");
    }

    return updatedLesson[0];
};

export const reorderLessons = async (lessonOrders: { id: string; order: number }[], organizationId: string) => {
    const orgId = requireTenantId(organizationId);

    if (lessonOrders.length === 0) return [];

    // Verify ALL lessons belong to the organization
    // Efficient way: count matching lessons
    const ids = lessonOrders.map(l => l.id);
    const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(lessons)
        .innerJoin(courses, eq(lessons.courseId, courses.id))
        .where(and(
            sql`${lessons.id} IN ${ids}`,
            eq(courses.organizationId, orgId)
        ));

    if (Number(count[0].count) !== ids.length) {
        throw new Error("One or more lessons not found or access denied.");
    }

    // Update each lesson's order
    // Use a transaction for safety? Drizzle doesn't support transactions easily across all drivers without 'db.transaction', 
    // assuming 'db' supports it.

    return await db.transaction(async (tx) => {
        const results = [];
        for (const { id, order } of lessonOrders) {
            const [updated] = await tx
                .update(lessons)
                .set({ order })
                .where(eq(lessons.id, id))
                .returning();
            if (updated) results.push(updated);
        }
        return results;
    });
};
