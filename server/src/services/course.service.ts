// server/src/services/course.service.ts

import { db } from '../db/index.js';
// We use the relative path. It's more robust than an alias.
// Path from server/src/services/ -> server/ -> / -> shared/
import { courses, users } from '../db/schema.js';
import { and, eq } from 'drizzle-orm';

export interface CreateCourseDto {
    title: string;
    description?: string;
    imageUrl?: string | null;
    isPublished?: boolean;
    teacherId: string;
    organizationId?: string;
}

export const createCourse = async (courseData: CreateCourseDto) => {
    const { title, description, imageUrl, isPublished, teacherId, organizationId } = courseData;

    const teacher = await db
        .select()
        .from(users)
        .where(and(eq(users.id, teacherId), eq(users.role, 'teacher')));

    if (teacher.length === 0) {
        throw new Error("User does not exist or is not a teacher.");
    }

    // Use the teacher's organizationId if not explicitly provided
    const orgId = organizationId || teacher[0].organizationId;
    if (!orgId) {
        throw new Error("Organization ID is required to create a course.");
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

    return newCourse[0];
};

export const getCoursesByTeacher = async (teacherId: string) => {
    const teacherCourses = await db
        .select()
        .from(courses)
        .where(eq(courses.teacherId, teacherId));
    return teacherCourses;
};

export const getPublishedCourses = async (organizationId?: string) => {
    const conditions: any[] = [eq(courses.isPublished, true)];
    if (organizationId) {
        conditions.push(eq(courses.organizationId, organizationId));
    }
    const publishedCourses = await db
        .select()
        .from(courses)
        .where(and(...conditions)!);
    return publishedCourses;
};

export const getCourseById = async (courseId: string) => {
    const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);
    return course[0] || null;
};

export const updateCoursePublishStatus = async (courseId: string, isPublished: boolean) => {
    const updatedCourse = await db
        .update(courses)
        .set({ isPublished })
        .where(eq(courses.id, courseId))
        .returning();

    if (!updatedCourse[0]) {
        throw new Error("Failed to update course publish status.");
    }

    return updatedCourse[0];
};

export const deleteCourse = async (courseId: string) => {
    const deletedCourse = await db
        .delete(courses)
        .where(eq(courses.id, courseId))
        .returning();

    if (!deletedCourse[0]) {
        throw new Error("Failed to delete course.");
    }

    return deletedCourse[0];
};