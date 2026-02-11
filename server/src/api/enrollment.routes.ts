// server/src/api/enrollment.routes.ts

import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { enrollments, courses, users, assignments, submissions, grades } from '../db/schema.js';
import { eq, and, sql, inArray } from 'drizzle-orm';

const router = express.Router();

/**
 * PROTECTED (STUDENT)
 * GET /api/enrollments/my-courses
 * Get all courses the authenticated student is enrolled in (simplified)
 */
router.get('/my-courses', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const studentEnrollments = await db
            .select({
                id: courses.id,
                title: courses.title,
                description: courses.description,
                teacherId: courses.teacherId,
            })
            .from(enrollments)
            .leftJoin(courses, eq(enrollments.courseId, courses.id))
            .where(eq(enrollments.studentId, user.id));

        res.status(200).json(studentEnrollments);
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
router.get('/student', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

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
            .where(eq(enrollments.studentId, user.id));

        res.status(200).json(studentEnrollments);
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
router.get('/student/:studentId', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

        const { studentId } = req.params;

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
            .where(eq(enrollments.studentId, studentId));

        res.status(200).json({ enrollments: studentEnrollments });
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
router.get('/course/:courseId', isAuthenticated, async (req, res) => {
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
            .where(eq(enrollments.courseId, courseId));

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
                        totalScore += parseFloat(sub.score);
                        totalMaxScore += parseFloat(sub.maxScore);
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

        res.status(200).json(studentsWithProgress);
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
router.get('/students/available/:courseId', isAuthenticated, async (req, res) => {
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

        res.status(200).json(availableStudents);
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
router.get('/students/all', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only' });
        }

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
        const allEnrollments = await db
            .select()
            .from(enrollments)
            .where(sql`${enrollments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`);

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

        res.status(200).json(studentsWithEnrollments);
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
router.post('/enroll', isAuthenticated, async (req, res) => {
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
 * PROTECTED (TEACHER)
 * DELETE /api/enrollments/:enrollmentId
 * Remove a student from a course
 */
router.delete('/:enrollmentId', isAuthenticated, async (req, res) => {
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

export default router;
