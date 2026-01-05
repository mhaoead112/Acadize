import express from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { db } from '../db/index.js';
import { users, enrollments, assignments, submissions, courses, grades } from '../db/schema.js';
import { eq, and, sql, avg, count, inArray, gte } from 'drizzle-orm';

const router = express.Router();

/**
 * GET /api/analytics/overview
 * Get overview statistics for all students or filtered by course
 */
router.get('/overview', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const { courseId } = req.query;
        
        // Get teacher's courses
        const teacherCourses = await db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        const courseIds = teacherCourses.map(c => c.id);

        if (courseIds.length === 0) {
            return res.status(200).json({
                totalStudents: 0,
                averageClassScore: 0,
                totalAssignments: 0,
                averageCompletionRate: 0,
                studentsAtRisk: 0,
                topPerformers: 0,
            });
        }

        // Filter by specific course if provided
        const targetCourseIds = courseId && typeof courseId === 'string' 
            ? [courseId] 
            : courseIds;

        // Get total students enrolled in teacher's courses
        const studentsEnrolled = await db
            .select({ studentId: enrollments.studentId })
            .from(enrollments)
            .where(inArray(enrollments.courseId, targetCourseIds))
            .groupBy(enrollments.studentId);

        const totalStudents = studentsEnrolled.length;

        // Get all assignments for these courses
        const allAssignments = await db
            .select({ id: assignments.id })
            .from(assignments)
            .where(inArray(assignments.courseId, targetCourseIds));

        const totalAssignments = allAssignments.length;

        // Get submission statistics
        const assignmentIds = allAssignments.map(a => a.id);
        let averageScore = 0;
        let completionRate = 0;

        if (assignmentIds.length > 0) {
            // Join submissions with grades to get scores
            const submissionStats = await db
                .select({
                    avgScore: sql<number>`CAST(AVG(CAST(${grades.score} AS DECIMAL)) AS DECIMAL)`,
                    totalSubmissions: count(submissions.id)
                })
                .from(submissions)
                .leftJoin(grades, eq(submissions.id, grades.submissionId))
                .where(inArray(submissions.assignmentId, assignmentIds));

            averageScore = Number(submissionStats[0]?.avgScore || 0);
            const totalSubmissions = submissionStats[0]?.totalSubmissions || 0;
            completionRate = totalAssignments > 0 
                ? Math.round((totalSubmissions / (totalAssignments * totalStudents)) * 100) 
                : 0;
        }

        // Calculate students at risk (average score < 60) and top performers (>= 85)
        let studentsAtRisk = 0;
        let topPerformers = 0;

        for (const student of studentsEnrolled) {
            const studentSubmissions = await db
                .select({ score: grades.score })
                .from(submissions)
                .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
                .leftJoin(grades, eq(submissions.id, grades.submissionId))
                .where(
                    and(
                        eq(submissions.studentId, student.studentId),
                        inArray(assignments.courseId, targetCourseIds)
                    )
                );

            if (studentSubmissions.length > 0) {
                const validGrades = studentSubmissions
                    .map(s => s.score ? Number(s.score) : null)
                    .filter((g): g is number => g !== null && !isNaN(g));
                
                if (validGrades.length > 0) {
                    const studentAvg = validGrades.reduce((a, b) => a + b, 0) / validGrades.length;
                    if (studentAvg < 60) studentsAtRisk++;
                    if (studentAvg >= 85) topPerformers++;
                }
            }
        }

        res.status(200).json({
            totalStudents,
            averageClassScore: Math.round(averageScore),
            totalAssignments,
            averageCompletionRate: completionRate,
            studentsAtRisk,
            topPerformers,
        });
    } catch (error) {
        console.error('Error fetching analytics overview:', error);
        res.status(500).json({ message: 'Failed to fetch analytics overview.' });
    }
});

/**
 * GET /api/analytics/students
 * Get detailed analytics for each student
 */
router.get('/students', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const { courseId } = req.query;

        // Get teacher's courses
        const teacherCourses = await db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        const courseIds = teacherCourses.map(c => c.id);

        if (courseIds.length === 0) {
            return res.status(200).json([]);
        }

        const targetCourseIds = courseId && typeof courseId === 'string' 
            ? [courseId] 
            : courseIds;

        // Get students enrolled in these courses
        const enrolledStudents = await db
            .select({
                studentId: enrollments.studentId,
                username: users.username,
                fullName: users.fullName,
                email: users.email,
                profilePicture: users.profilePicture,
            })
            .from(enrollments)
            .innerJoin(users, eq(enrollments.studentId, users.id))
            .where(inArray(enrollments.courseId, targetCourseIds))
            .groupBy(enrollments.studentId, users.username, users.fullName, users.email, users.profilePicture);

        // Get assignments for these courses
        const courseAssignments = await db
            .select({ id: assignments.id })
            .from(assignments)
            .where(inArray(assignments.courseId, targetCourseIds));

        const assignmentIds = courseAssignments.map(a => a.id);
        const totalAssignments = assignmentIds.length;

        // Build student analytics
        const studentAnalytics = await Promise.all(
            enrolledStudents.map(async (student) => {
                // Get student's submissions with grades
                const studentSubmissions = assignmentIds.length > 0
                    ? await db
                        .select({ 
                            score: grades.score,
                            submittedAt: submissions.submittedAt
                        })
                        .from(submissions)
                        .leftJoin(grades, eq(submissions.id, grades.submissionId))
                        .where(
                            and(
                                eq(submissions.studentId, student.studentId),
                                inArray(submissions.assignmentId, assignmentIds)
                            )
                        )
                    : [];

                const validGrades = studentSubmissions
                    .map(s => s.score ? Number(s.score) : null)
                    .filter((g): g is number => g !== null && !isNaN(g) && g > 0);

                const averageScore = validGrades.length > 0
                    ? Math.round(validGrades.reduce((a, b) => a + b, 0) / validGrades.length)
                    : 0;

                const completedAssignments = studentSubmissions.length;
                const pendingAssignments = totalAssignments - completedAssignments;

                // Calculate trend (simplified: based on last 3 vs first 3 submissions)
                let trend: 'up' | 'down' | 'stable' = 'stable';
                if (validGrades.length >= 6) {
                    const firstThree = validGrades.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
                    const lastThree = validGrades.slice(-3).reduce((a, b) => a + b, 0) / 3;
                    if (lastThree > firstThree + 5) trend = 'up';
                    else if (lastThree < firstThree - 5) trend = 'down';
                }

                // Get last activity
                const lastSubmission = studentSubmissions.sort((a, b) => 
                    new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
                )[0];

                let lastActivity = 'Never';
                if (lastSubmission) {
                    const daysSince = Math.floor(
                        (Date.now() - new Date(lastSubmission.submittedAt).getTime()) / (1000 * 60 * 60 * 24)
                    );
                    if (daysSince === 0) lastActivity = 'Today';
                    else if (daysSince === 1) lastActivity = '1 day ago';
                    else if (daysSince < 7) lastActivity = `${daysSince} days ago`;
                    else lastActivity = `${Math.floor(daysSince / 7)} weeks ago`;
                }

                // Get enrollment count for this student
                const studentEnrollments = await db
                    .select({ courseId: enrollments.courseId })
                    .from(enrollments)
                    .where(eq(enrollments.studentId, student.studentId));

                return {
                    id: student.studentId,
                    username: student.username,
                    fullName: student.fullName,
                    email: student.email,
                    profilePicture: student.profilePicture,
                    averageScore,
                    totalAssignments,
                    completedAssignments,
                    pendingAssignments,
                    attendanceRate: Math.min(100, Math.round((completedAssignments / (totalAssignments || 1)) * 100)),
                    lastActivity,
                    trend,
                    coursesEnrolled: studentEnrollments.length,
                };
            })
        );

        // Sort by average score descending
        studentAnalytics.sort((a, b) => b.averageScore - a.averageScore);

        res.status(200).json(studentAnalytics);
    } catch (error) {
        console.error('Error fetching student analytics:', error);
        res.status(500).json({ message: 'Failed to fetch student analytics.' });
    }
});

/**
 * GET /api/analytics/courses
 * Get analytics for each course
 */
router.get('/courses', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        // Get teacher's courses
        const teacherCourses = await db
            .select({
                id: courses.id,
                title: courses.title,
            })
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        if (teacherCourses.length === 0) {
            return res.status(200).json([]);
        }

        const courseAnalytics = await Promise.all(
            teacherCourses.map(async (course) => {
                // Get students enrolled
                const enrolledStudents = await db
                    .select({ studentId: enrollments.studentId })
                    .from(enrollments)
                    .where(eq(enrollments.courseId, course.id));

                const totalStudents = enrolledStudents.length;

                // Get assignments for this course
                const courseAssignments = await db
                    .select({ id: assignments.id })
                    .from(assignments)
                    .where(eq(assignments.courseId, course.id));

                const totalAssignments = courseAssignments.length;
                const assignmentIds = courseAssignments.map(a => a.id);

                let averageScore = 0;
                let submittedAssignments = 0;

                if (assignmentIds.length > 0) {
                    // Join with grades table to get scores
                    const submissionStats = await db
                        .select({
                            avgScore: sql<number>`CAST(AVG(CAST(${grades.score} AS DECIMAL)) AS DECIMAL)`,
                            totalSubmissions: count(submissions.id)
                        })
                        .from(submissions)
                        .leftJoin(grades, eq(submissions.id, grades.submissionId))
                        .where(inArray(submissions.assignmentId, assignmentIds));

                    averageScore = Math.round(Number(submissionStats[0]?.avgScore || 0));
                    submittedAssignments = submissionStats[0]?.totalSubmissions || 0;
                }

                const completionRate = totalAssignments > 0 && totalStudents > 0
                    ? Math.round((submittedAssignments / (totalAssignments * totalStudents)) * 100)
                    : 0;

                return {
                    courseId: course.id,
                    courseTitle: course.title,
                    totalStudents,
                    averageScore,
                    completionRate,
                    totalAssignments,
                    submittedAssignments,
                };
            })
        );

        res.status(200).json(courseAnalytics);
    } catch (error) {
        console.error('Error fetching course analytics:', error);
        res.status(500).json({ message: 'Failed to fetch course analytics.' });
    }
});

/**
 * GET /api/analytics/performance-trend
 * Returns weekly average grades for the selected timeframe (defaults to last 60 days)
 */
router.get('/performance-trend', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const { courseId, timeframeDays } = req.query;
        const days = timeframeDays && !Array.isArray(timeframeDays)
            ? Math.max(7, Number.parseInt(timeframeDays, 10) || 60)
            : 60;

        const sinceDate = new Date();
        sinceDate.setHours(0, 0, 0, 0);
        sinceDate.setDate(sinceDate.getDate() - days);

        const teacherCourses = await db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        const courseIds = teacherCourses.map(c => c.id);
        if (courseIds.length === 0) {
            return res.status(200).json([]);
        }

        const targetCourseIds = courseId && typeof courseId === 'string'
            ? [courseId]
            : courseIds;

        const submissionsWithGrades = await db
            .select({
                submittedAt: submissions.submittedAt,
                score: grades.score,
                maxScore: grades.maxScore,
            })
            .from(submissions)
            .leftJoin(grades, eq(submissions.id, grades.submissionId))
            .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
            .where(
                and(
                    inArray(assignments.courseId, targetCourseIds),
                    gte(submissions.submittedAt, sinceDate)
                )
            );

        const weeklyBuckets: Record<string, { total: number; count: number; weekStart: string }> = {};

        const getWeekStart = (date: Date) => {
            const normalized = new Date(date);
            normalized.setHours(0, 0, 0, 0);
            const day = normalized.getDay();
            const diff = normalized.getDate() - day + (day === 0 ? -6 : 1); // Monday as first day
            normalized.setDate(diff);
            return normalized.toISOString();
        };

        for (const entry of submissionsWithGrades) {
            if (!entry.submittedAt || entry.score === null || entry.score === undefined) continue;
            const score = Number(entry.score);
            const maxScore = entry.maxScore ? Number(entry.maxScore) : 100;
            if (Number.isNaN(score) || Number.isNaN(maxScore) || maxScore <= 0) continue;

            const weekStart = getWeekStart(new Date(entry.submittedAt));
            if (!weeklyBuckets[weekStart]) {
                weeklyBuckets[weekStart] = { total: 0, count: 0, weekStart };
            }

            weeklyBuckets[weekStart].total += (score / maxScore) * 100;
            weeklyBuckets[weekStart].count += 1;
        }

        const formatter = new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' });
        const trend = Object.values(weeklyBuckets)
            .map(bucket => ({
                weekStart: bucket.weekStart,
                label: `Week of ${formatter.format(new Date(bucket.weekStart))}`,
                averageGrade: bucket.count > 0 ? Math.round(bucket.total / bucket.count) : 0,
            }))
            .sort((a, b) => new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime());

        return res.status(200).json(trend);
    } catch (error) {
        console.error('Error fetching performance trend:', error);
        return res.status(500).json({ message: 'Failed to fetch performance trend.' });
    }
});

/**
 * GET /api/analytics/submission-status
 * Returns on-time, late, pending, and missing submission counts for the teacher's courses
 */
router.get('/submission-status', isAuthenticated, async (req, res) => {
    try {
        const user = (req as any).user;
        if (!user || user.role !== 'teacher') {
            return res.status(403).json({ message: 'Forbidden: Teachers only.' });
        }

        const { courseId } = req.query;

        const teacherCourses = await db
            .select({ id: courses.id })
            .from(courses)
            .where(eq(courses.teacherId, user.id));

        const courseIds = teacherCourses.map(c => c.id);
        if (courseIds.length === 0) {
            return res.status(200).json({
                totalAssignments: 0,
                totalSubmissions: 0,
                onTime: 0,
                late: 0,
                missing: 0,
                pending: 0,
            });
        }

        const targetCourseIds = courseId && typeof courseId === 'string'
            ? [courseId]
            : courseIds;

        const assignmentsForCourses = await db
            .select({ id: assignments.id, dueDate: assignments.dueDate })
            .from(assignments)
            .where(inArray(assignments.courseId, targetCourseIds));

        const assignmentIds = assignmentsForCourses.map(a => a.id);
        if (assignmentIds.length === 0) {
            return res.status(200).json({
                totalAssignments: 0,
                totalSubmissions: 0,
                onTime: 0,
                late: 0,
                missing: 0,
                pending: 0,
            });
        }

        const submissionsData = await db
            .select({
                assignmentId: submissions.assignmentId,
                submittedAt: submissions.submittedAt,
            })
            .from(submissions)
            .where(inArray(submissions.assignmentId, assignmentIds));

        const earliestSubmissionByAssignment = new Map<string, Date>();
        for (const sub of submissionsData) {
            const submittedAt = sub.submittedAt ? new Date(sub.submittedAt) : null;
            if (!submittedAt) continue;

            const current = earliestSubmissionByAssignment.get(sub.assignmentId);
            if (!current || submittedAt < current) {
                earliestSubmissionByAssignment.set(sub.assignmentId, submittedAt);
            }
        }

        let onTime = 0;
        let late = 0;
        let missing = 0;
        let pending = 0;
        const now = new Date();

        for (const assignment of assignmentsForCourses) {
            const firstSubmission = earliestSubmissionByAssignment.get(assignment.id);
            const due = assignment.dueDate ? new Date(assignment.dueDate) : null;

            if (firstSubmission) {
                if (due && firstSubmission > due) {
                    late++;
                } else {
                    onTime++;
                }
            } else {
                if (due && due < now) {
                    missing++;
                } else {
                    pending++;
                }
            }
        }

        return res.status(200).json({
            totalAssignments: assignmentsForCourses.length,
            totalSubmissions: submissionsData.length,
            onTime,
            late,
            missing,
            pending,
        });
    } catch (error) {
        console.error('Error fetching submission status:', error);
        return res.status(500).json({ message: 'Failed to fetch submission status.' });
    }
});

export default router;
