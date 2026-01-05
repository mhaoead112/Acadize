// server/src/services/lesson.service.ts

import { db } from '../db/index.js';
import { lessons, courses } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

export interface CreateLessonDto {
    courseId: string;
    title: string;
    fileName: string;
    filePath: string;
    fileType: string;
    fileSize: string;
}

export const createLesson = async (lessonData: CreateLessonDto) => {
    const { courseId, title, fileName, filePath, fileType, fileSize } = lessonData;

    // Verify course exists
    const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);

    if (!course[0]) {
        throw new Error("Course not found.");
    }

    const newLesson = await db.insert(lessons).values({
        courseId,
        title,
        fileName,
        filePath,
        fileType,
        fileSize,
    }).returning();

    if (!newLesson[0]) {
        throw new Error("Failed to create lesson.");
    }

    return newLesson[0];
};

export const getLessonsByCourse = async (courseId: string) => {
    const courseLessons = await db
        .select()
        .from(lessons)
        .where(eq(lessons.courseId, courseId))
        .orderBy(lessons.createdAt);
    
    return courseLessons;
};

export const getLessonById = async (lessonId: string) => {
    const lesson = await db
        .select()
        .from(lessons)
        .where(eq(lessons.id, lessonId))
        .limit(1);
    
    return lesson[0] || null;
};

export const deleteLesson = async (lessonId: string) => {
    const deletedLesson = await db
        .delete(lessons)
        .where(eq(lessons.id, lessonId))
        .returning();
    
    if (!deletedLesson[0]) {
        throw new Error("Failed to delete lesson.");
    }
    
    return deletedLesson[0];
};

export const updateLesson = async (lessonId: string, updates: Partial<CreateLessonDto>) => {
    const updatedLesson = await db
        .update(lessons)
        .set(updates)
        .where(eq(lessons.id, lessonId))
        .returning();
    
    if (!updatedLesson[0]) {
        throw new Error("Failed to update lesson.");
    }
    
    return updatedLesson[0];
};

export const reorderLessons = async (lessonOrders: { id: string; order: string }[]) => {
    // Update each lesson's order
    const updatePromises = lessonOrders.map(({ id, order }) =>
        db.update(lessons)
            .set({ order })
            .where(eq(lessons.id, id))
            .returning()
    );
    
    const results = await Promise.all(updatePromises);
    return results.map(r => r[0]).filter(Boolean);
};
