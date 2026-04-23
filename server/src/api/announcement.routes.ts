// server/src/api/announcement.routes.ts

import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const requireAuth = [isAuthenticated, requireSubscription];
import {
    createAnnouncement,
    getAnnouncementsByCourse,
    getAnnouncementById,
    updateAnnouncement,
    deleteAnnouncement
} from '../services/announcement.service.js';
import { getCourseById } from '../services/course.service.js';
import pushNotificationService from '../services/push-notification.service.js';

const router = express.Router();

/**
 * PROTECTED (ADMIN ONLY)
 * GET /api/announcements
 * Get all announcements for admin management
 */
router.get('/', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden: Admins only.' });
        }

        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const { db } = await import('../db/index.js');
        const { announcements, courses, users } = await import('../db/schema.js');
        const { desc, eq, and, count } = await import('drizzle-orm');
        const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');

        const { limit, offset, page } = getPaginationParams(req);

        const countResult = await db.select({ count: count() }).from(announcements)
            .leftJoin(courses, eq(announcements.courseId, courses.id))
            .where(eq(courses.organizationId, orgId));
        const totalCount = countResult[0].count;

        // Get all announcements with course and teacher info
        // Filter by organizationId via course
        const allAnnouncements = await db
            .select({
                id: announcements.id,
                title: announcements.title,
                content: announcements.content,
                isPinned: announcements.isPinned,
                courseId: announcements.courseId,
                teacherId: announcements.teacherId,
                createdAt: announcements.createdAt,
                updatedAt: announcements.updatedAt,
                courseName: courses.title,
                teacherName: users.fullName
            })
            .from(announcements)
            .leftJoin(courses, eq(announcements.courseId, courses.id))
            .leftJoin(users, eq(announcements.teacherId, users.id))
            .where(eq(courses.organizationId, orgId)) // Enforce tenant isolation
            .orderBy(desc(announcements.createdAt))
            .limit(limit)
            .offset(offset);

        // Transform to match frontend expectations
        const formattedAnnouncements = allAnnouncements.map(ann => ({
            ...ann,
            isGlobal: false // All current announcements are course-specific
        }));

        res.status(200).json(buildPaginatedResponse(formattedAnnouncements, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching all announcements:', error);
        res.status(500).json({
            message: 'Failed to fetch announcements',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PUBLIC/PROTECTED
 * GET /api/announcements/course/:courseId
 * Get all announcements for a course
 */
router.get('/course/:courseId', async (req, res) => {
    try {
        const { courseId } = req.params;
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
        const { limit, offset, page } = getPaginationParams(req);
        const locale = (req.query.locale as string) || 'en';

        const { announcements: announcementsTable, courses: coursesTable } = await import('../db/schema.js');
        const { eq, and, count } = await import('drizzle-orm');
        const { db } = await import('../db/index.js');

        // Get total count for this course
        const countResult = await db.select({ count: count() })
            .from(announcementsTable)
            .innerJoin(coursesTable, eq(announcementsTable.courseId, coursesTable.id))
            .where(and(
                eq(announcementsTable.courseId, courseId),
                eq(coursesTable.organizationId, orgId)
            ));
        const totalCount = countResult[0].count;

        const list = await getAnnouncementsByCourse(courseId, orgId, locale, limit, offset);
        res.status(200).json(buildPaginatedResponse(list, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching announcements:', error);
        res.status(500).json({
            message: 'Failed to fetch announcements',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (STUDENT)
 * GET /api/announcements/student
 * Get all announcements for student's enrolled courses
 */
router.get('/student', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        // Get student's enrolled courses
        const { db } = await import('../db/index.js');
        const { enrollments, courses } = await import('../db/schema.js');
        const { eq, and } = await import('drizzle-orm');

        // Verify student belongs to org (implicit in auth usually, but good to be safe)
        // Actually, we should filter enrollments by course->org interaction.
        // But simpler: just get enrollments, then filter announcements by getAnnouncementsByCourse(..., orgId)

        const studentEnrollments = await db
            .select({ courseId: enrollments.courseId })
            .from(enrollments)
            .where(eq(enrollments.studentId, user.id));

        const courseIds = studentEnrollments.map(e => e.courseId);

        const locale = (req as any).locale;
        // Fetch all announcements for these courses
        const allAnnouncements: any[] = [];
        for (const courseId of courseIds) {
            // This function enforces orgId
            const courseAnns = await getAnnouncementsByCourse(courseId, orgId, locale);

            // Get course name (also enforce orgId)
            const courseData = await getCourseById(courseId, orgId, locale);

            if (courseData) {
                courseAnns.forEach((ann: any) => {
                    allAnnouncements.push({
                        ...ann,
                        courseName: courseData.title
                    });
                });
            }
        }

        // Sort by pinned first, then by date
        allAnnouncements.sort((a: any, b: any) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });

        res.status(200).json({
            announcements: allAnnouncements
        });
    } catch (error) {
        console.error('Error fetching student announcements:', error);
        res.status(500).json({
            message: 'Failed to fetch announcements',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (STUDENT)
 * PATCH /api/announcements/:id/read
 * Mark announcement as read
 */
router.patch('/:id/read', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const announcementId = req.params.id;

        // For now, just return success (in a full implementation, you'd track this in a separate table)
        res.status(200).json({
            id: announcementId,
            isRead: true,
            readAt: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error marking announcement as read:', error);
        res.status(500).json({
            message: 'Failed to mark announcement as read',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * POST /api/announcements
 * Create a new announcement
 */
router.post('/', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const { courseId, title, content, isPinned, isGlobal } = req.body;

        if (!title || !content) {
            return res.status(400).json({ message: 'Title and content are required.' });
        }

        // For global announcements from admin, use a default course or skip course validation
        if (isGlobal && user.role === 'admin') {
            // For global announcements, we'll use a special system course or create without course
            // Since courseId is required in schema, we'll get the first available course or create one
            const { db } = await import('../db/index.js');
            const { announcements, courses } = await import('../db/schema.js');
            const { createId } = await import('@paralleldrive/cuid2');
            const { eq } = await import('drizzle-orm');

            // Get any course to use as placeholder belonging to THIS ORG
            const [firstCourse] = await db
                .select({ id: courses.id })
                .from(courses)
                .where(eq(courses.organizationId, orgId))
                .limit(1);

            if (!firstCourse) {
                return res.status(400).json({ message: 'No courses available in this organization. Please create a course first.' });
            }

            const [newAnn] = await db.insert(announcements).values({
                id: createId(),
                courseId: firstCourse.id,
                teacherId: user.id,
                title,
                content,
                isPinned: isPinned || false
            }).returning();

            return res.status(201).json({
                message: 'Global announcement created successfully',
                announcement: { ...newAnn, isGlobal: true }
            });
        }

        if (!courseId) {
            return res.status(400).json({ message: 'Course ID is required for non-global announcements.' });
        }

        // Verify course exists and user owns it (enforces orgId)
        const course = await getCourseById(courseId, orgId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to post announcements to this course." });
        }

        const newAnnouncement = await createAnnouncement({
            courseId,
            teacherId: user.id,
            title,
            content,
            isPinned: isPinned || false,
            organizationId: orgId
        });

        // Send push notification to all enrolled students
        try {
            const { db } = await import('../db/index.js');
            const { enrollments } = await import('../db/schema.js');
            const { eq } = await import('drizzle-orm');

            const enrolledStudents = await db
                .select({ studentId: enrollments.studentId })
                .from(enrollments)
                .where(eq(enrollments.courseId, courseId));

            const studentIds = enrolledStudents.map(e => e.studentId);
            if (studentIds.length > 0) {
                const payload = pushNotificationService.createNotificationPayload('ANNOUNCEMENT', {
                    title,
                    courseName: course.title,
                    announcementId: newAnnouncement.id,
                    courseId
                });
                await pushNotificationService.sendPushNotificationToUsers(studentIds, payload);
            }
        } catch (notifError) {
            console.error('Error sending push notification for announcement:', notifError);
        }

        res.status(201).json({
            message: 'Announcement created successfully',
            announcement: newAnnouncement
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        res.status(500).json({
            message: 'Failed to create announcement',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PATCH /api/announcements/:id
 * Update an announcement
 */
router.patch('/:id', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const announcementId = req.params.id;
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const { title, content, isPinned } = req.body;

        // Get announcement to verify ownership (enforces orgId)
        const announcement = await getAnnouncementById(announcementId, orgId);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }

        if (announcement.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this announcement." });
        }

        const updatedAnnouncement = await updateAnnouncement(announcementId, {
            title,
            content,
            isPinned
        }, orgId);

        res.status(200).json({
            message: 'Announcement updated successfully',
            announcement: updatedAnnouncement
        });
    } catch (error) {
        console.error('Error updating announcement:', error);
        res.status(500).json({
            message: 'Failed to update announcement',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * DELETE /api/announcements/:id
 * Delete an announcement
 */
router.delete('/:id', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const announcementId = req.params.id;
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        // Get announcement to verify ownership
        const announcement = await getAnnouncementById(announcementId, orgId);
        if (!announcement) {
            return res.status(404).json({ message: 'Announcement not found.' });
        }

        if (announcement.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to delete this announcement." });
        }

        await deleteAnnouncement(announcementId, orgId);

        res.status(200).json({
            message: 'Announcement deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting announcement:', error);
        res.status(500).json({
            message: 'Failed to delete announcement',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;
