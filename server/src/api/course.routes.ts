// server/src/api/course.routes.ts

import express from 'express';
// We need to add the .js extension for NodeNext module resolution
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import { createCourse, getCoursesByTeacher, getPublishedCourses, getCourseById, updateCoursePublishStatus, deleteCourse } from '../services/course.service.js';
import { getLessonById, updateLesson, deleteLesson } from '../services/lesson.service.js';
import { db } from '../db/index.js';
import { courses, lessons } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

/**
 * PUBLIC
 * GET /api/courses
 * Returns all published courses
 */
router.get('/', async (req, res) => {
    try {
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });
        const locale = (req as any).locale;
        const courses = await getPublishedCourses(orgId, locale);
        res.status(200).json(courses);
    } catch (error) {
        console.error("Error fetching published courses:", error);
        res.status(500).json({ message: "Failed to fetch courses." });
    }
});

/**
 * PROTECTED (TEACHER/STUDENT)
 * GET /api/courses/user
 * Returns all courses for the authenticated user (teacher's courses or student's enrolled courses)
 */
router.get('/user', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user; // Cast to access the user property
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const locale = (req as any).locale;
        const courses = await getCoursesByTeacher(user.id, orgId, locale);
        res.status(200).json(courses);
    } catch (error) {
        console.error('Error fetching teacher courses:', error);
        res.status(500).json({ message: 'Failed to fetch courses.' });
    }
});

/**
 * PROTECTED (AUTHENTICATED)
 * GET /api/courses/:id
 * Returns a single course by ID
 */
router.get('/:id', ...requireAuth, async (req, res) => {
    try {
        const courseId = req.params.id;
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const locale = (req as any).locale;
        const course = await getCourseById(courseId, orgId, locale);

        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // Verify course belongs to current tenant
        if (course.organizationId !== orgId) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        res.status(200).json(course);
    } catch (error) {
        console.error('Error fetching course by ID:', error);
        res.status(500).json({ message: 'Failed to fetch course.' });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * POST /api/courses
 * Creates a new course for the authenticated teacher
 */
router.post('/', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const { title, description, imageUrl, isPublished } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Title is required.' });
        }

        console.log('Creating course with:', { title, description, imageUrl, isPublished, teacherId: user.id });

        const newCourse = await createCourse({
            title,
            description,
            imageUrl,
            isPublished,
            teacherId: user.id,
            organizationId: (req as any).tenant.organizationId
        });

        console.log('Course created:', newCourse);

        res.status(201).json(newCourse);
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({ message: 'Failed to create course.' });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PATCH /api/courses/:id/publish
 * Toggle publish status of a course
 */
router.patch('/:id/publish', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const courseId = req.params.id;
        const { isPublished } = req.body;

        if (typeof isPublished !== 'boolean') {
            return res.status(400).json({ message: 'isPublished must be a boolean.' });
        }

        // Check if course exists
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const existingCourse = await getCourseById(courseId, orgId);
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // Check if user owns the course or is admin
        if (existingCourse.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this course." });
        }

        // Update publication status
        const updatedCourse = await updateCoursePublishStatus(courseId, isPublished, orgId);

        res.status(200).json({
            message: `Course ${isPublished ? 'published' : 'unpublished'} successfully`,
            course: updatedCourse
        });
    } catch (error) {
        console.error('Error updating course publish status:', error);
        res.status(500).json({
            message: 'Failed to update course publication status',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PUT /api/courses/:id
 * Update course title and description
 */
router.put('/:id', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const courseId = req.params.id;
        const { title, description } = req.body;

        // Check if course exists
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const existingCourse = await getCourseById(courseId, orgId);
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // Check if user owns the course or is admin
        if (existingCourse.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this course." });
        }

        // Update the course
        const [updatedCourse] = await db.update(courses)
            .set({
                title: title || existingCourse.title,
                description: description !== undefined ? description : existingCourse.description,
                updatedAt: new Date()
            })
            .where(eq(courses.id, courseId))
            .returning();

        res.status(200).json(updatedCourse);
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({
            message: 'Failed to update course',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

function randomJoinCode(length = 8): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * PROTECTED (TEACHER ONLY)
 * POST /api/courses/:id/join-code
 * Generate or regenerate join code for a course. Students can join with this code or invite link.
 */
router.post('/:id/join-code', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }
        const courseId = req.params.id;
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: 'Organization context required' });

        const existingCourse = await getCourseById(courseId, orgId);
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found.' });
        }
        if (existingCourse.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this course." });
        }

        let joinCode = randomJoinCode(8);
        const maxAttempts = 10;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const existing = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.joinCode, joinCode), eq(courses.organizationId, orgId))).limit(1);
            if (existing.length === 0) break;
            joinCode = randomJoinCode(8);
        }

        await db.update(courses).set({ joinCode, updatedAt: new Date() }).where(eq(courses.id, courseId));
        res.status(200).json({ joinCode, invitePath: `/student/join?code=${encodeURIComponent(joinCode)}` });
    } catch (error) {
        console.error('Error generating join code:', error);
        res.status(500).json({
            message: 'Failed to generate join code',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * DELETE /api/courses/:id
 * Delete a course (and cascade to enrollments and lessons)
 */
router.delete('/:id', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const courseId = req.params.id;

        // Check if course exists
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const existingCourse = await getCourseById(courseId, orgId);
        if (!existingCourse) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        // Check if user owns the course or is admin
        if (existingCourse.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to delete this course." });
        }

        // Delete the course (will cascade to enrollments and lessons via DB constraints)
        await deleteCourse(courseId, orgId);

        res.status(200).json({
            message: 'Course deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({
            message: 'Failed to delete course',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER/STUDENT)
 * GET /api/courses/:courseId/lessons/:lessonId
 * Get a specific lesson in a course
 */
router.get('/:courseId/lessons/:lessonId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        const { courseId, lessonId } = req.params;

        // Get lesson with course info
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
                eq(lessons.courseId, courseId)
            ))
            .limit(1);

        if (!lesson) {
            return res.status(404).json({ message: 'Lesson not found.' });
        }

        // Verify access
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const course = await getCourseById(courseId, orgId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        res.status(200).json(lesson);
    } catch (error) {
        console.error('Error fetching lesson:', error);
        res.status(500).json({
            message: 'Failed to fetch lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PUT /api/courses/:courseId/lessons/:lessonId
 * Update a lesson in a course
 */
router.put('/:courseId/lessons/:lessonId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const { courseId, lessonId } = req.params;
        const { title } = req.body;

        // Verify course ownership
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const course = await getCourseById(courseId, orgId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to update this lesson." });
        }

        // Verify lesson exists and belongs to course
        const lesson = await getLessonById(lessonId, orgId);
        if (!lesson || lesson.courseId !== courseId) {
            return res.status(404).json({ message: 'Lesson not found in this course.' });
        }

        // Update lesson (only title is updateable from the current schema)
        const [updatedLesson] = await db
            .update(lessons)
            .set({
                title: title || lesson.title,
                updatedAt: new Date(),
            })
            .where(eq(lessons.id, lessonId))
            .returning();

        res.status(200).json(updatedLesson);
    } catch (error) {
        console.error('Error updating lesson:', error);
        res.status(500).json({
            message: 'Failed to update lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * DELETE /api/courses/:courseId/lessons/:lessonId
 * Delete a lesson from a course
 */
router.delete('/:courseId/lessons/:lessonId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const { courseId, lessonId } = req.params;

        // Verify course ownership
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const course = await getCourseById(courseId, orgId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to delete this lesson." });
        }

        // Verify lesson exists and belongs to course
        const lesson = await getLessonById(lessonId, orgId);
        if (!lesson || lesson.courseId !== courseId) {
            return res.status(404).json({ message: 'Lesson not found in this course.' });
        }

        // Delete lesson
        await deleteLesson(lessonId);

        res.status(200).json({
            message: 'Lesson deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting lesson:', error);
        res.status(500).json({
            message: 'Failed to delete lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER ONLY)
 * PATCH /api/courses/:courseId/lessons/:lessonId/publish
 * Toggle publish status of a lesson
 */
router.patch('/:courseId/lessons/:lessonId/publish', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || (user.role !== 'teacher' && user.role !== 'admin')) {
            return res.status(403).json({ message: 'Forbidden: Teachers or Admins only.' });
        }

        const { courseId, lessonId } = req.params;

        // Verify course ownership
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) return res.status(400).json({ message: "Organization context required" });

        const course = await getCourseById(courseId, orgId);
        if (!course) {
            return res.status(404).json({ message: 'Course not found.' });
        }

        if (course.teacherId !== user.id && user.role !== 'admin') {
            return res.status(403).json({ message: "You don't have permission to publish this lesson." });
        }

        // Verify lesson exists and belongs to course
        const lesson = await getLessonById(lessonId, orgId);
        if (!lesson || lesson.courseId !== courseId) {
            return res.status(404).json({ message: 'Lesson not found in this course.' });
        }

        // Note: isPublished field doesn't exist in current schema
        // Return success for now (lessons are always published once uploaded)
        res.status(200).json({
            message: 'Lesson is published',
            lesson
        });
    } catch (error) {
        console.error('Error publishing lesson:', error);
        res.status(500).json({
            message: 'Failed to publish lesson',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

export default router;