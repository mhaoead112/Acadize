// server/src/api/enrollment.routes.ts

import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import { db } from '../db/index.js';
import { enrollments, courses, users, assignments, submissions, grades } from '../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

const router = express.Router();

/**
 * PROTECTED (STUDENT)
 * GET /api/enrollments/my-courses
 * Get all courses the authenticated student is enrolled in (simplified)
 */
router.get('/my-courses', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get total count for pagination
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.studentId, user.id));
        
        const totalCount = Number(totalCountResult?.count || 0);

        const studentEnrollments = await db
            .select({
                id: courses.id,
                title: courses.title,
                description: courses.description,
                teacherId: courses.teacherId,
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.studentId, user.id))
            .limit(limit)
            .offset(offset);

        res.status(200).json(buildPaginatedResponse(studentEnrollments, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching student courses:', error);
        res.status(500).json({
            message: 'Failed to fetch courses',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (STUDENT)
 * GET /api/enrollments/student
 * Get all enrollments for the authenticated student
 */
router.get('/student', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get total count for pagination
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.studentId, user.id));
        
        const totalCount = Number(totalCountResult?.count || 0);

        const studentEnrollments = await db
            .select({
                id: enrollments.id,
                courseId: enrollments.courseId,
                enrolledAt: enrollments.enrolledAt,
                course: {
                    id: courses.id,
                    title: courses.title,
                    description: courses.description,
                    teacherId: courses.teacherId,
                    isPublished: courses.isPublished,
                    imageUrl: courses.imageUrl,
                }
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.studentId, user.id))
            .limit(limit)
            .offset(offset);

        res.status(200).json(buildPaginatedResponse(studentEnrollments, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching student enrollments:', error);
        res.status(500).json({
            message: 'Failed to fetch enrollments',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/enrollments/student/:studentId
 * Get all enrollments for a specific student (for teachers to view student progress)
 */
router.get('/student/:studentId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get total count for pagination
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.studentId, req.params.studentId));
        
        const totalCount = Number(totalCountResult?.count || 0);

        // Get all enrollments for this student with course details
        const studentEnrollments = await db
            .select({
                id: enrollments.id,
                courseId: enrollments.courseId,
                enrolledAt: enrollments.enrolledAt,
                course: {
                    id: courses.id,
                    title: courses.title,
                    description: courses.description,
                    teacherId: courses.teacherId,
                    isPublished: courses.isPublished,
                    imageUrl: courses.imageUrl,
                }
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.studentId, req.params.studentId))
            .limit(limit)
            .offset(offset);

        res.status(200).json(buildPaginatedResponse(studentEnrollments, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching student enrollments:', error);
        res.status(500).json({
            message: 'Failed to fetch enrollments',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/enrollments/course/:courseId
 * Get all students enrolled in a specific course with their progress
 */
router.get('/course/:courseId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { courseId } = req.params;

        // Verify teacher owns the course
        const [course] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.id, courseId),
                eq(courses.teacherId, user.id)
            ))
            .limit(1);

        if (!course) {
            return res.status(403).json({ message: 'You do not have permission to view this course' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get total count for pagination
        const [totalCountResult] = await db
            .select({ count: sql<number>`count(*)` })
            .from(enrollments)
            .where(eq(enrollments.courseId, courseId));
        
        const totalCount = Number(totalCountResult?.count || 0);

        // Get all enrolled students
        const enrolledStudents = await db
            .select({
                enrollmentId: enrollments.id,
                enrolledAt: enrollments.enrolledAt,
                studentId: users.id,
                studentName: users.fullName,
                studentEmail: users.email,
                studentRole: users.role,
            })
            .from(enrollments)
            .leftJoin(users, eq(enrollments.studentId, users.id))
            .where(eq(enrollments.courseId, courseId))
            .limit(limit)
            .offset(offset);

        // Get all assignments for this course
        const courseAssignments = await db
            .select()
            .from(assignments)
            .where(eq(assignments.courseId, courseId));

        // Calculate progress for each student
        const studentsWithProgress = await Promise.all(
            enrolledStudents.map(async (student) => {
                if (!student.studentId || courseAssignments.length === 0) {
                    return {
                        ...student,
                        progress: 0,
                        completedAssignments: 0,
                        totalAssignments: courseAssignments.length,
                        averageScore: 0
                    };
                }

                // Get submissions for this student for course assignments
                const assignmentIds = courseAssignments.map(a => a.id);
                const studentSubmissions = await db
                    .select({
                        submissionId: submissions.id,
                        assignmentId: submissions.assignmentId,
                        score: grades.score,
                        maxScore: grades.maxScore,
                    })
                    .from(submissions)
                    .leftJoin(grades, eq(grades.submissionId, submissions.id))
                    .where(and(
                        eq(submissions.studentId, student.studentId),
                        inArray(submissions.assignmentId, assignmentIds)
                    ));

                const completedAssignments = studentSubmissions.length;
                const totalAssignments = courseAssignments.length;
                const progress = totalAssignments > 0 ? Math.round((completedAssignments / totalAssignments) * 100) : 0;

                // Calculate average score
                let totalScore = 0;
                let totalMaxScore = 0;
                studentSubmissions.forEach(sub => {
                    if (sub.score && sub.maxScore) {
                        totalScore += Number(sub.score);
                        totalMaxScore += Number(sub.maxScore);
                    }
                });
                const averageScore = totalMaxScore > 0 ? Math.round((totalScore / totalMaxScore) * 100) : 0;

                return {
                    ...student,
                    progress,
                    completedAssignments,
                    totalAssignments,
                    averageScore
                };
            })
        );

        res.status(200).json(buildPaginatedResponse(studentsWithProgress, totalCount, page, limit));
    } catch (error) {
        console.error('Error fetching course enrollments:', error);
        res.status(500).json({
            message: 'Failed to fetch course enrollments',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/enrollments/students/available/:courseId
 * Get all students NOT enrolled in a specific course
 */
router.get('/students/available/:courseId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { courseId } = req.params;

        // Verify teacher owns the course
        const [course] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.id, courseId),
                eq(courses.teacherId, user.id)
            ))
            .limit(1);

        if (!course) {
            return res.status(403).json({ message: 'You do not have permission to view this course' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get all students
        const allStudents = await db
            .select({
                id: users.id,
                username: users.username,
                email: users.email,
            })
            .from(users)
            .where(and(
                eq(users.role, 'student'),
                eq(users.organizationId, user.organizationId)
            ));

        // Get already enrolled student IDs
        const enrolled = await db
            .select({ studentId: enrollments.studentId })
            .from(enrollments)
            .where(eq(enrollments.courseId, courseId));

        const enrolledIds = new Set(enrolled.map(e => e.studentId));

        // Filter out enrolled students
        const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));
        
        // Manual pagination for filtered result
        const paginatedData = availableStudents.slice(offset, offset + limit);

        res.status(200).json(buildPaginatedResponse(paginatedData, availableStudents.length, page, limit));
    } catch (error) {
        console.error('Error fetching available students:', error);
        res.status(500).json({
            message: 'Failed to fetch available students',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/enrollments/students/all
 * Get all students with their enrollment status for teacher's courses
 */
router.get('/students/all', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { limit, offset, page } = getPaginationParams(req);

        // Get all students
        const allStudents = await db
            .select({
                id: users.id,
                username: users.username,
                email: users.email,
            })
            .from(users)
            .where(and(
                eq(users.role, 'student'),
                eq(users.organizationId, user.organizationId)
            ));

        // Get teacher's courses
        const teacherCourses = await db
            .select()
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        // Get all enrollments for these courses
        const courseIds = teacherCourses.map(c => c.id);

        // Only query enrollments if teacher has courses
        const allEnrollments = courseIds.length > 0
            ? await db
                .select()
                .from(enrollments)
                .where(inArray(enrollments.courseId, courseIds))
            : [];

        // Map students with their enrollment counts
        const studentsWithEnrollments = allStudents.map(student => {
            const studentEnrollments = allEnrollments.filter(e => e.studentId === student.id);
            const enrolledCourses = studentEnrollments.map(e => {
                const course = teacherCourses.find(c => c.id === e.courseId);
                return {
                    enrollmentId: e.id,
                    courseId: e.courseId,
                    courseTitle: course?.title || 'Unknown',
                    enrolledAt: e.enrolledAt
                };
            });

            return {
                ...student,
                enrollmentCount: studentEnrollments.length,
                enrolledCourses
            };
        });

        // Manual pagination for mapped results
        const paginatedData = studentsWithEnrollments.slice(offset, offset + limit);

        res.status(200).json(buildPaginatedResponse(paginatedData, studentsWithEnrollments.length, page, limit));
    } catch (error) {
        console.error('Error fetching all students:', error);
        res.status(500).json({
            message: 'Failed to fetch students',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * POST /api/enrollments/enroll
 * Enroll a student in a course
 */
router.post('/enroll', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { studentId, courseId } = req.body;

        if (!studentId || !courseId) {
            return res.status(400).json({ message: 'studentId and courseId are required' });
        }

        // Verify teacher owns the course
        const [course] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.id, courseId),
                eq(courses.teacherId, user.id)
            ))
            .limit(1);

        if (!course) {
            return res.status(403).json({ message: 'You do not have permission to enroll students in this course' });
        }

        // Verify student belongs to same organization
        const [studentUser] = await db
            .select()
            .from(users)
            .where(eq(users.id, studentId))
            .limit(1);

        if (!studentUser || studentUser.organizationId !== user.organizationId) {
            return res.status(404).json({ message: 'Student not found' });
        }

        // Check if already enrolled
        const [existing] = await db
            .select()
            .from(enrollments)
            .where(and(
                eq(enrollments.studentId, studentId),
                eq(enrollments.courseId, courseId)
            ))
            .limit(1);

        if (existing) {
            return res.status(400).json({ message: 'Student is already enrolled in this course' });
        }

        // Create enrollment
        const [enrollment] = await db
            .insert(enrollments)
            .values({
                studentId,
                courseId
            })
            .returning();

        res.status(201).json({ message: 'Student enrolled successfully', enrollment });
    } catch (error) {
        console.error('Error enrolling student:', error);
        res.status(500).json({
            message: 'Failed to enroll student',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});

/**
 * PROTECTED (STUDENT)
 * GET /api/enrollments/join/preview?courseId=... or &joinCode=...
 * Returns minimal course info for join confirmation. 404 if not found or not published in org.
 */
router.get('/join/preview', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can join courses' });
        }
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required' });
        }
        const courseId = req.query.courseId as string | undefined;
        const joinCode = req.query.joinCode as string | undefined;
        if (!courseId && !joinCode) {
            return res.status(400).json({ message: 'courseId or joinCode is required' });
        }

        const course = await resolveCourseForJoin(orgId, courseId || undefined, joinCode || undefined);
        if (!course || course.organizationId !== orgId) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!course.isPublished) {
            return res.status(404).json({ message: 'Course is not available to join' });
        }
        const [teacher] = await db
            .select({ fullName: users.fullName })
            .from(users)
            .where(eq(users.id, course.teacherId))
            .limit(1);
        res.status(200).json({
            id: course.id,
            title: course.title,
            description: course.description ?? null,
            teacherName: teacher?.fullName ?? null,
        });
    } catch (error) {
        console.error('Error fetching join preview:', error);
        res.status(500).json({
            message: 'Failed to fetch course preview',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/** Resolve course by courseId or joinCode for current org. */
async function resolveCourseForJoin(orgId: string, courseId?: string, joinCode?: string): Promise<typeof courses.$inferSelect | null> {
    if (courseId) {
        const [c] = await db
            .select()
            .from(courses)
            .where(and(eq(courses.id, courseId), eq(courses.organizationId, orgId)))
            .limit(1);
        return c ?? null;
    }
    if (joinCode) {
        const [c] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.joinCode, joinCode),
                eq(courses.organizationId, orgId)
            ))
            .limit(1);
        return c ?? null;
    }
    return null;
}

/**
 * PROTECTED (STUDENT)
 * POST /api/enrollments/join
 * Self-enroll in a course by courseId or joinCode.
 */
router.post('/join', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Only students can join courses' });
        }
        const orgId = (req as any).tenant?.organizationId;
        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required' });
        }
        const { courseId, joinCode } = req.body as { courseId?: string; joinCode?: string };
        if (!courseId && !joinCode) {
            return res.status(400).json({ message: 'courseId or joinCode is required' });
        }

        const course = await resolveCourseForJoin(orgId, courseId, joinCode);
        if (!course) {
            return res.status(404).json({ message: 'Course not found' });
        }
        if (!course.isPublished) {
            return res.status(400).json({ message: 'Course is not available to join' });
        }
        if (course.organizationId !== orgId || (user as any).organizationId !== orgId) {
            return res.status(403).json({ message: 'You do not have access to this course' });
        }

        const [existing] = await db
            .select()
            .from(enrollments)
            .where(and(
                eq(enrollments.studentId, user.id),
                eq(enrollments.courseId, course.id)
            ))
            .limit(1);
        if (existing) {
            return res.status(400).json({ message: 'You are already enrolled in this course' });
        }

        const [enrollment] = await db
            .insert(enrollments)
            .values({ studentId: user.id, courseId: course.id })
            .returning();
        res.status(201).json({
            message: 'Enrolled successfully',
            enrollment: { id: enrollment!.id, courseId: course.id, enrolledAt: enrollment!.enrolledAt },
            course: { id: course.id, title: course.title },
        });
    } catch (error) {
        console.error('Error joining course:', error);
        res.status(500).json({
            message: 'Failed to join course',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

/**
 * PROTECTED (TEACHER)
 * DELETE /api/enrollments/:enrollmentId
 * Remove a student from a course
 */
router.delete('/:enrollmentId', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { enrollmentId } = req.params;

        // Get enrollment details
        const [enrollment] = await db
            .select()
            .from(enrollments)
            .where(eq(enrollments.id, enrollmentId))
            .limit(1);

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found' });
        }

        // Verify teacher owns the course
        const [course] = await db
            .select()
            .from(courses)
            .where(and(
                eq(courses.id, enrollment.courseId),
                eq(courses.teacherId, user.id)
            ))
            .limit(1);

        if (!course) {
            return res.status(403).json({ message: 'You do not have permission to manage this enrollment' });
        }

        // Delete enrollment
        await db
            .delete(enrollments)
            .where(eq(enrollments.id, enrollmentId));

        res.status(200).json({ message: 'Student unenrolled successfully' });
    } catch (error) {
        console.error('Error unenrolling student:', error);
        res.status(500).json({
            message: 'Failed to unenroll student',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
});
/**
 * PROTECTED (STUDENT)
 * POST /api/enrollments/:courseId/complete
 * Mark a course as completed by the authenticated student and award gamification points.
 * Idempotent: duplicate calls are silently ignored by the gamification engine.
 *
 * Requirements: student must be enrolled in the course and it must belong to their org.
 */
router.post('/:courseId/complete', ...requireAuth, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'student') {
            return res.status(403).json({ message: 'Forbidden: Students only.' });
        }

        const { courseId } = req.params;
        const orgId: string | undefined = (req as any).tenant?.organizationId ?? user.organizationId;
        if (!orgId) {
            return res.status(400).json({ message: 'Organization context required.' });
        }

        // Verify student is enrolled in this course (scoped to org via course join)
        const [enrollment] = await db
            .select({ id: enrollments.id })
            .from(enrollments)
            .innerJoin(courses, eq(enrollments.courseId, courses.id))
            .where(and(
                eq(enrollments.studentId, user.id),
                eq(enrollments.courseId, courseId),
                eq(courses.organizationId, orgId),
            ))
            .limit(1);

        if (!enrollment) {
            return res.status(404).json({ message: 'Enrollment not found or course does not belong to your organization.' });
        }

        // -- Gamification: fire-and-forget (never throws) --------------------
        let gamResult: { awarded: boolean; pointsAwarded: number; newTotal: number; levelUp: boolean } = {
            awarded: false, pointsAwarded: 0, newTotal: 0, levelUp: false,
        };
        try {
            const { awardPoints, evaluateBadges } = await import('../services/gamification.service.js');
            gamResult = await awardPoints({
                userId: user.id,
                organizationId: orgId,
                eventType: 'course_complete',
                entityId: courseId,
                entityType: 'course',
            });
            void evaluateBadges(user.id, orgId, 'course_complete');
        } catch (gamErr) {
            // Intentionally swallowed — gamification must never break the course flow
            console.warn('[Gamification] course_completion hook failed silently:', gamErr);
        }
        // --------------------------------------------------------------------

        return res.status(200).json({
            message: 'Course marked as complete.',
            courseId,
            gamification: gamResult,
        });
    } catch (error) {
        console.error('Error marking course as complete:', error);
        res.status(500).json({
            message: 'Failed to mark course as complete.',
            error: error instanceof Error ? error.message : 'Unknown error',
        });
    }
});

export default router;
