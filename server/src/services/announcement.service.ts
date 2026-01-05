// server/src/services/announcement.service.ts

import { db } from '../db/index.js';
import { announcements, courses } from '../db/schema.js';
import { eq, desc, and } from 'drizzle-orm';

export interface CreateAnnouncementDto {
    courseId: string;
    teacherId: string;
    title: string;
    content: string;
    isPinned?: boolean;
}

export const createAnnouncement = async (announcementData: CreateAnnouncementDto) => {
    const { courseId, teacherId, title, content, isPinned = false } = announcementData;

    // Verify course exists
    const course = await db
        .select()
        .from(courses)
        .where(eq(courses.id, courseId))
        .limit(1);

    if (!course[0]) {
        throw new Error("Course not found.");
    }

    const newAnnouncement = await db.insert(announcements).values({
        courseId,
        teacherId,
        title,
        content,
        isPinned,
    }).returning();

    if (!newAnnouncement[0]) {
        throw new Error("Failed to create announcement.");
    }

    return newAnnouncement[0];
};

export const getAnnouncementsByCourse = async (courseId: string) => {
    const courseAnnouncements = await db
        .select()
        .from(announcements)
        .where(eq(announcements.courseId, courseId))
        .orderBy(desc(announcements.isPinned), desc(announcements.createdAt));
    
    return courseAnnouncements;
};

export const getAnnouncementById = async (announcementId: string) => {
    const announcement = await db
        .select()
        .from(announcements)
        .where(eq(announcements.id, announcementId))
        .limit(1);
    
    return announcement[0] || null;
};

export const updateAnnouncement = async (announcementId: string, updates: Partial<CreateAnnouncementDto>) => {
    const updatedAnnouncement = await db
        .update(announcements)
        .set(updates)
        .where(eq(announcements.id, announcementId))
        .returning();
    
    if (!updatedAnnouncement[0]) {
        throw new Error("Failed to update announcement.");
    }
    
    return updatedAnnouncement[0];
};

export const deleteAnnouncement = async (announcementId: string) => {
    const deletedAnnouncement = await db
        .delete(announcements)
        .where(eq(announcements.id, announcementId))
        .returning();
    
    if (!deletedAnnouncement[0]) {
        throw new Error("Failed to delete announcement.");
    }
    
    return deletedAnnouncement[0];
};
