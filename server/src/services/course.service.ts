// server/src/services/course.service.ts

import { db } from '../db/index.js';
import { courses, courseTranslations, users } from '../db/schema.js';
import { and, eq, inArray } from 'drizzle-orm';
import { requireTenantId } from '../utils/tenant-query.js';

async function resolveCourseTranslations<T extends { id: string; title: string; description?: string | null }>(
  items: T[],
  locale: string
): Promise<T[]> {
  if (items.length === 0 || locale === 'en') return items;
  const ids = items.map((c) => c.id);
  const rows = await db
    .select()
    .from(courseTranslations)
    .where(and(inArray(courseTranslations.courseId, ids), inArray(courseTranslations.locale, [locale, 'en'])));
  const byCourse: Record<string, { locale: string; title: string; description?: string | null }[]> = {};
  for (const r of rows) {
    if (!byCourse[r.courseId]) byCourse[r.courseId] = [];
    byCourse[r.courseId].push({
      locale: r.locale,
      title: r.title,
      description: r.description ?? undefined,
    });
  }
  return items.map((c) => {
    const tr = byCourse[c.id];
    if (!tr) return c;
    const forLocale = tr.find((t) => t.locale === locale);
    const forEn = tr.find((t) => t.locale === 'en');
    return {
      ...c,
      title: forLocale?.title ?? forEn?.title ?? c.title,
      description: forLocale?.description ?? forEn?.description ?? c.description,
    };
  });
}

export interface CreateCourseDto {
    title: string;
    description?: string;
    imageUrl?: string | null;
    isPublished?: boolean;
    teacherId: string;
    organizationId: string; // REQUIRED — no longer optional
}

export const createCourse = async (courseData: CreateCourseDto) => {
    const orgId = requireTenantId(courseData.organizationId);
    const { title, description, imageUrl, teacherId } = courseData;

    const teacher = await db
        .select()
        .from(users)
        .where(and(
            eq(users.id, teacherId),
            eq(users.role, 'teacher'),
            eq(users.organizationId, orgId) // Verify teacher belongs to same org
        ));

    if (teacher.length === 0) {
        throw new Error("User does not exist, is not a teacher, or does not belong to this organization.");
    }

    const newCourse = await db.insert(courses).values({
        title,
        description,
        imageUrl,
        organizationId: orgId,
        teacherId,
        isPublished: false,
    }).returning();

    if (!newCourse[0]) {
        throw new Error("Failed to create the course.");
    }

    await db.insert(courseTranslations).values({
        courseId: newCourse[0].id,
        locale: 'en',
        title,
        description: description ?? null,
    });
    return newCourse[0];
};

export const getCoursesByTeacher = async (
    teacherId: string,
    organizationId: string,
    locale?: string,
    limit: number = 50,
    offset: number = 0
) => {
    const orgId = requireTenantId(organizationId);

    const countResult = await db
        .select({ count: count() })
        .from(courses)
        .where(and(
            eq(courses.teacherId, teacherId),
            eq(courses.organizationId, orgId)
        ));
    const totalCount = countResult[0].count;

    const teacherCourses = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.teacherId, teacherId),
            eq(courses.organizationId, orgId)
        ))
        .limit(limit)
        .offset(offset);
        
    const data = locale ? await resolveCourseTranslations(teacherCourses, locale) : teacherCourses;
    return { data, totalCount };
};

import { count } from 'drizzle-orm';

export const getPublishedCourses = async (
    organizationId: string, 
    locale?: string,
    limit: number = 50,
    offset: number = 0
) => {
    const orgId = requireTenantId(organizationId);
    
    const countResult = await db
        .select({ count: count() })
        .from(courses)
        .where(and(
            eq(courses.isPublished, true),
            eq(courses.organizationId, orgId)
        ));
    const totalCount = countResult[0].count;

    const publishedCourses = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.isPublished, true),
            eq(courses.organizationId, orgId)
        ))
        .limit(limit)
        .offset(offset);
        
    const data = locale ? await resolveCourseTranslations(publishedCourses, locale) : publishedCourses;
    return { data, totalCount };
};

export const getCourseById = async (
    courseId: string,
    organizationId: string,
    locale?: string
) => {
    const orgId = requireTenantId(organizationId);
    const course = await db
        .select()
        .from(courses)
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .limit(1);
    const row = course[0] || null;
    if (!row || !locale || locale === 'en') return row;
    const [resolved] = await resolveCourseTranslations([row], locale);
    return resolved ?? row;
};

export const updateCoursePublishStatus = async (courseId: string, isPublished: boolean, organizationId: string) => {
    const orgId = requireTenantId(organizationId);
    const updatedCourse = await db
        .update(courses)
        .set({ isPublished })
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .returning();

    if (!updatedCourse[0]) {
        throw new Error("Failed to update course publish status.");
    }

    return updatedCourse[0];
};

export const deleteCourse = async (courseId: string, organizationId: string) => {
    const orgId = requireTenantId(organizationId);
    const deletedCourse = await db
        .delete(courses)
        .where(and(
            eq(courses.id, courseId),
            eq(courses.organizationId, orgId)
        ))
        .returning();

    if (!deletedCourse[0]) {
        throw new Error("Failed to delete course.");
    }

    return deletedCourse[0];
};