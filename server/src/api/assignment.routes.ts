// server/src/api/assignment.routes.ts
//
// NOTE (i18n): Assignment title/description are single-language (no assignment_translations table).
// Course titles in the response come from courses table; for translated course names use
// GET /api/courses with X-Locale. When assignment_translations is added, pass req.locale
// into the service and resolve titles/descriptions with fallback to en.

import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import { requireSubscription } from "../middleware/subscription.middleware.js";

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import {
  createAssignment,
  getAssignmentsForCourse,
  submitAssignment,
  gradeSubmission,
  getStudentProgress, // Not fully used in routes, but available
} from "../services/assignment.service.js";
import pushNotificationService from "../services/push-notification.service.js";
import { db } from "../db/index.js";
import { assignments, submissions, courses, enrollments, grades, users } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads", "submissions");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${createId()}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx|txt|zip|jpg|jpeg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, DOC, DOCX, TXT, ZIP, and images are allowed."));
    }
  }
});

/**
 * PROTECTED (STUDENT)
 * GET /api/assignments/student
 * Get all assignments for student's enrolled courses with submission status
 */
router.get("/student", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
    const { limit, offset, page } = getPaginationParams(req);

    // Get student's enrolled courses scoped to organization
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .innerJoin(courses, eq(enrollments.courseId, courses.id))
      .where(and(
        eq(enrollments.studentId, user.id),
        eq(courses.organizationId, orgId)
      ));

    const courseIds = studentEnrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return res.json(buildPaginatedResponse([], 0, page, limit));
    }

    const { count } = await import('drizzle-orm');
    const countResult = await db.select({ count: count() }).from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`,
        eq(courses.organizationId, orgId)
      ));
    const totalCount = countResult[0].count;

    // Get all assignments for these courses
    // Assignments belong to courses, which we already verified belong to org via courseIds
    const allAssignments = await db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        lessonId: assignments.lessonId,
        title: assignments.title,
        description: assignments.description,
        dueDate: assignments.dueDate,
        maxScore: assignments.maxScore,
        isPublished: assignments.isPublished,
        createdAt: assignments.createdAt,
        courseTitle: courses.title,
        courseDescription: courses.description,
      })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id)) // Use inner join to be safe
      .where(and(
        sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`,
        eq(courses.organizationId, orgId) // Redundant but safe
      ))
      .orderBy(desc(assignments.dueDate))
      .limit(limit)
      .offset(offset);

    // Get all student's submissions with grades
    // Join with assignments -> courses to verify org
    const assignmentIds = allAssignments.map(a => a.id);
    let studentSubmissions: any[] = [];

    if (assignmentIds.length > 0) {
      studentSubmissions = await db
        .select({
          submissionId: submissions.id,
          assignmentId: submissions.assignmentId,
          content: submissions.content,
          filePath: submissions.filePath,
          fileName: submissions.fileName,
          submittedAt: submissions.submittedAt,
          status: submissions.status,
          score: grades.score,
          maxScore: grades.maxScore,
          feedback: grades.feedback,
          gradedAt: grades.gradedAt,
        })
        .from(submissions)
        .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
        .innerJoin(courses, eq(assignments.courseId, courses.id))
        .leftJoin(grades, eq(submissions.id, grades.submissionId))
        .where(and(
          eq(submissions.studentId, user.id),
          sql`${submissions.assignmentId} IN (${sql.raw(assignmentIds.map(id => `'${id}'`).join(','))})`,
          eq(courses.organizationId, orgId) // Enforce org
        ));
    }

    // Combine assignments with submission status
    const assignmentsWithStatus = allAssignments.map(assignment => {
      const submission = studentSubmissions.find(
        sub => sub.assignmentId === assignment.id
      );

      let status = 'pending';
      if (submission) {
        if (submission.gradedAt) {
          status = 'graded';
        } else {
          status = 'submitted';
        }
      } else if (assignment.dueDate) {
        const dueDate = new Date(assignment.dueDate);
        const now = new Date();
        if (now > dueDate) {
          status = 'overdue';
        }
      }

      return {
        ...assignment,
        submission: submission ? {
          id: submission.submissionId,
          content: submission.content,
          filePath: submission.filePath,
          fileName: submission.fileName,
          submittedAt: submission.submittedAt,
          status: submission.status,
          score: submission.score,
          feedback: submission.feedback,
        } : null,
        status,
        grade: submission?.score ? parseFloat(submission.score) : null,
        feedback: submission?.feedback || null,
        submittedAt: submission?.submittedAt || null,
      };
    });

    res.json(buildPaginatedResponse(assignmentsWithStatus, totalCount, page, limit));
  } catch (error: any) {
    console.error("Error fetching student assignments:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch assignments" });
  }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/assignments/teacher
 * Get all assignments for teacher's courses
 */
router.get("/teacher", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
    const { limit, offset, page } = getPaginationParams(req);

    // Get all courses taught by this teacher in this org
    const teacherCourses = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(and(
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ));

    const courseIds = teacherCourses.map(c => c.id);

    if (courseIds.length === 0) {
      return res.json(buildPaginatedResponse([], 0, page, limit));
    }

    const { count } = await import('drizzle-orm');
    const countResult = await db.select({ count: count() }).from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`,
        eq(courses.organizationId, orgId)
      ));
    const totalCount = countResult[0].count;

    // Get all assignments for these courses with submission counts
    // Verify org via course join
    const teacherAssignments = await db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        lessonId: assignments.lessonId,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        dueDate: assignments.dueDate,
        maxScore: assignments.maxScore,
        isPublished: assignments.isPublished,
        createdAt: assignments.createdAt,
        courseTitle: courses.title,
      })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`,
        eq(courses.organizationId, orgId)
      ))
      .orderBy(desc(assignments.createdAt))
      .limit(limit)
      .offset(offset);

    // Get submission counts for each assignment
    // Verify org via assignments -> courses
    const assignmentsWithCounts = await Promise.all(
      teacherAssignments.map(async (assignment) => {
        const submissionCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
          .innerJoin(courses, eq(assignments.courseId, courses.id))
          .where(and(
            eq(submissions.assignmentId, assignment.id),
            eq(courses.organizationId, orgId)
          ));

        const gradedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
          .innerJoin(courses, eq(assignments.courseId, courses.id))
          .leftJoin(grades, eq(submissions.id, grades.submissionId))
          .where(and(
            eq(submissions.assignmentId, assignment.id),
            sql`${grades.id} IS NOT NULL`,
            eq(courses.organizationId, orgId)
          ));

        return {
          ...assignment,
          submissionCount: Number(submissionCount[0]?.count || 0),
          gradedCount: Number(gradedCount[0]?.count || 0),
        };
      })
    );

    res.json(buildPaginatedResponse(assignmentsWithCounts, totalCount, page, limit));
  } catch (error: any) {
    console.error("Error fetching teacher assignments:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch assignments" });
  }
});

// Teacher creates an assignment for a course
router.post("/courses/:courseId/assignments", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only." });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { title, description, type, dueDate, maxScore } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({ message: "title and dueDate are required" });
    }

    // Verify teacher owns the course AND course is in org
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, req.params.courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (course.length === 0) {
      return res.status(403).json({ message: "You do not have permission to add assignments to this course" });
    }

    // Use service to create (which also verifies org)
    const assignment = await createAssignment({
      courseId: req.params.courseId,
      title,
      description: description, // Pass description correctly to the service
      dueDate: new Date(dueDate),
      organizationId: orgId
    });

    // We might want to update other fields not in createAssignment DTO like description, type, maxScore
    // The service only takes title, instructions, dueDate. 
    // Let's update it immediately or update the service. 
    // Updating service is better, but to avoid breaking changes let's do an update here (scoping to org).

    await db.update(assignments).set({
      description: description || null,
      type: type || 'homework',
      maxScore: maxScore?.toString() || '100',
      isPublished: false,
    }).where(eq(assignments.id, assignment.id)); // ID is unique, but we just created it.

    // Send push notification to all enrolled students
    try {
      const enrolledStudents = await db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(eq(enrollments.courseId, req.params.courseId));

      const studentIds = enrolledStudents.map(e => e.studentId);
      if (studentIds.length > 0) {
        const payload = pushNotificationService.createNotificationPayload('ASSIGNMENT', {
          isNew: true,
          title,
          courseName: course[0].title,
          assignmentId: assignment.id,
          courseId: req.params.courseId
        });
        await pushNotificationService.sendPushNotificationToUsers(studentIds, payload);
      }
    } catch (notifError) {
      console.error('Error sending push notification for new assignment:', notifError);
    }

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to create assignment" });
  }
});

// Get assignments for a course (teacher or enrolled student)
router.get("/courses/:courseId/assignments", ...requireAuth, async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
    const { limit, offset, page } = getPaginationParams(req);

    // Use service which enforces org
    const { data, totalCount } = await getAssignmentsForCourse(req.params.courseId, orgId, limit, offset);
    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error("Error fetching assignments:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch assignments" });
  }
});

/**
 * PROTECTED (TEACHER/STUDENT)
 * GET /api/assignments/:id
 * Get a single assignment by ID
 */
router.get("/:id", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    // Verify assignment exists and is in org
    const [assignment] = await db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        lessonId: assignments.lessonId,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        dueDate: assignments.dueDate,
        maxScore: assignments.maxScore,
        isPublished: assignments.isPublished,
        createdAt: assignments.createdAt,
        courseName: courses.title,
      })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Verify access: teacher owns course or student is enrolled
    if (user.role === 'teacher' || user.role === 'admin') {
      const [course] = await db
        .select()
        .from(courses)
        .where(and(
          eq(courses.id, assignment.courseId),
          eq(courses.teacherId, user.id),
          eq(courses.organizationId, orgId)
        ))
        .limit(1);

      if (!course && user.role !== 'admin') {
        return res.status(403).json({ message: "You do not have permission to view this assignment" });
      }
    } else if (user.role === 'student') {
      // Check enrollment AND org
      const [enrollment] = await db
        .select()
        .from(enrollments)
        .innerJoin(courses, eq(enrollments.courseId, courses.id))
        .where(and(
          eq(enrollments.studentId, user.id),
          eq(enrollments.courseId, assignment.courseId),
          eq(courses.organizationId, orgId)
        ))
        .limit(1);

      if (!enrollment) {
        return res.status(403).json({ message: "You are not enrolled in this course" });
      }
    }

    res.json(assignment);
  } catch (error: any) {
    console.error("Error fetching assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch assignment" });
  }
});

/**
 * PROTECTED (TEACHER)
 * PUT /api/assignments/:id
 * Update an assignment
 */
router.put("/:id", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { title, description, type, dueDate, maxScore } = req.body;

    // Verify teacher owns the course AND org
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: "You do not have permission to update this assignment" });
    }

    const [updated] = await db
      .update(assignments)
      .set({
        title,
        description,
        type,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        maxScore: maxScore?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, req.params.id))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to update assignment" });
  }
});

/**
 * PROTECTED (TEACHER)
 * PATCH /api/assignments/:assignmentId
 * Update an assignment (legacy route)
 */
router.patch("/:assignmentId", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { title, description, type, dueDate, maxScore } = req.body;

    // Verify teacher owns the course AND org
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.assignmentId),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: "You do not have permission to update this assignment" });
    }

    const [updated] = await db
      .update(assignments)
      .set({
        title,
        description,
        type,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        maxScore: maxScore?.toString(),
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, req.params.assignmentId))
      .returning();

    res.json(updated);
  } catch (error: any) {
    console.error("Error updating assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to update assignment" });
  }
});

/**
 * PROTECTED (TEACHER)
 * PATCH /api/assignments/:id/publish
 * Toggle publish status of an assignment
 */
router.patch("/:id/publish", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { isPublished } = req.body;

    // Verify teacher owns the course AND org
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: "You do not have permission to publish this assignment" });
    }

    const [updated] = await db
      .update(assignments)
      .set({
        isPublished,
        updatedAt: new Date(),
      })
      .where(eq(assignments.id, req.params.id))
      .returning();

    res.json({ assignment: updated });
  } catch (error: any) {
    console.error("Error publishing assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to publish assignment" });
  }
});

/**
 * PROTECTED (TEACHER)
 * DELETE /api/assignments/:id
 * Delete an assignment
 */
router.delete("/:id", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    // Verify teacher owns the course AND org
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: "You do not have permission to delete this assignment" });
    }

    await db
      .delete(assignments)
      .where(eq(assignments.id, req.params.id));

    res.json({ message: "Assignment deleted successfully" });
  } catch (error: any) {
    console.error("Error deleting assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to delete assignment" });
  }
});

// Student submits an assignment
router.post("/:assignmentId/submit", ...requireAuth, upload.single('file'), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Forbidden: Students only." });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { content } = req.body;
    const file = req.file;

    if (!content && !file) {
      return res.status(400).json({ message: "Either content or file is required" });
    }

    // Verify assignment exists and student is enrolled in the course AND org
    const [assignment] = await db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        title: assignments.title,
        maxScore: assignments.maxScore,
      })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.assignmentId),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if student is enrolled in the course
    const [enrollment] = await db
      .select()
      .from(enrollments)
      .where(and(
        eq(enrollments.studentId, user.id),
        eq(enrollments.courseId, assignment.courseId)
      ))
      .limit(1);

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    // Use service to submit (which also checks duplicates)
    // NOTE: service takes fileUrl, but here we have file object or content.
    // We need to construct the submission data correctly.
    // The service might need updates to handle 'content' field if it doesn't already.
    // Looking at service: `submitAssignment` takes `fileUrl` and assumes only that.
    // But schema `submissions` has `content`.
    // The route code handles both.
    // Let's stick to route code logic BUT hardened with orgId checks (already done above for assignment lookup).

    // Check duplication
    const [existingSubmission] = await db
      .select()
      .from(submissions)
      .where(and(
        eq(submissions.assignmentId, req.params.assignmentId),
        eq(submissions.studentId, user.id)
      ))
      .limit(1);

    let submission;

    if (existingSubmission) {
      // Hardened check: Ensure existing submission belongs to assignment which belongs to org (done via assignment lookup initially)

      // Delete existing grade
      await db
        .delete(grades)
        .where(eq(grades.submissionId, existingSubmission.id));

      [submission] = await db
        .update(submissions)
        .set({
          content: content || existingSubmission.content,
          filePath: file ? file.path : existingSubmission.filePath,
          fileName: file ? file.originalname : existingSubmission.fileName,
          fileType: file ? file.mimetype : existingSubmission.fileType,
          fileSize: file ? file.size.toString() : existingSubmission.fileSize,
          submittedAt: new Date(),
          status: 'submitted',
        })
        .where(eq(submissions.id, existingSubmission.id))
        .returning();
    } else {
      [submission] = await db
        .insert(submissions)
        .values({
          assignmentId: req.params.assignmentId,
          studentId: user.id,
          content: content || null,
          filePath: file ? file.path : null,
          fileName: file ? file.originalname : null,
          fileType: file ? file.mimetype : null,
          fileSize: file ? file.size.toString() : null,
          status: 'submitted',
        })
        .returning();
    }

    let xpResult = undefined;
    try {
      if (!existingSubmission) { // Only award XP on first submission
        const { awardXp } = await import('../services/xp.service.js');
        const { checkAndUpdateQuests } = await import('../services/quest.service.js');
        
        xpResult = await awardXp(user.id, orgId, 'assignment_complete', 20, submission.id, 'assignment_submission');
        
        // Check for daily/weekly quest completions
        const completedQuests = await checkAndUpdateQuests(user.id, orgId, 'assignment_submit');
        if (completedQuests.length > 0) {
          (res.locals as any) = { ...(res.locals || {}), completedQuests };
        }
      }
    } catch (gamErr) {
      console.warn('[Gamification] Error awarding XP on assignment submit:', gamErr);
    }

    res.status(201).json({
      message: existingSubmission ? "Assignment resubmitted successfully" : "Assignment submitted successfully",
      submission: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        content: submission.content,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        status: submission.status,
      },
      xp: xpResult,
      completedQuests: (res.locals as any)?.completedQuests
    });
  } catch (error: any) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to submit assignment" });
  }
});

// Teacher grades a submission
router.post("/submissions/:submissionId/grade", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only." });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { grade, feedback } = req.body;
    if (grade == null) {
      return res.status(400).json({ message: "grade is required" });
    }

    // Get submission info before grading AND verify org
    const [submissionInfo] = await db
      .select({
        studentId: submissions.studentId,
        assignmentId: submissions.assignmentId,
      })
      .from(submissions)
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(submissions.id, req.params.submissionId),
        eq(courses.organizationId, orgId)
      ))
      .limit(1);

    if (!submissionInfo) {
      return res.status(404).json({ message: "Submission not found or access denied." });
    }

    // Use service to grade (enforces orgId)
    const updated = await gradeSubmission({
      submissionId: req.params.submissionId,
      grade,
      feedback,
      gradedBy: user.id,
      organizationId: orgId
    });

    // Send push notification
    if (submissionInfo) {
      try {
        const [assignmentInfo] = await db
          .select({
            title: assignments.title,
            maxScore: assignments.maxScore,
            courseId: assignments.courseId,
          })
          .from(assignments)
          .where(eq(assignments.id, submissionInfo.assignmentId))
          .limit(1);

        const payload = pushNotificationService.createNotificationPayload('GRADE', {
          score: grade,
          maxScore: assignmentInfo?.maxScore || '100',
          assignmentTitle: assignmentInfo?.title || 'Assignment',
          assignmentId: submissionInfo.assignmentId,
          courseId: assignmentInfo?.courseId
        });
        await pushNotificationService.sendPushNotification(submissionInfo.studentId, payload);
      } catch (notifError) {
        console.error('Error sending push notification for grade:', notifError);
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error("Error grading submission:", error);
    res.status(500).json({ message: error?.message || "Failed to grade submission" });
  }
});

/**
 * PROTECTED (TEACHER)
 * GET /api/assignments/:assignmentId/submissions
 * Get all submissions for an assignment with student info
 */
router.get("/:assignmentId/submissions", ...requireAuth, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const orgId = (req as any).tenant?.organizationId;
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    // Verify teacher owns the course AND org
    const [assignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .innerJoin(courses, eq(assignments.courseId, courses.id))
      .where(and(
        eq(assignments.id, req.params.assignmentId),
        eq(courses.organizationId, orgId),
        eq(courses.teacherId, user.id)
      ))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found or access denied" });
    }

    // Get submissions
    // Explicitly scope to org via assignment -> course join
    const assignmentSubmissions = await db
      .select({
        id: submissions.id,
        studentId: submissions.studentId,
        studentName: users.fullName,
        studentEmail: users.email,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
        score: grades.score,
        feedback: grades.feedback,
        fileName: submissions.fileName,
        fileUrl: submissions.filePath, // map filePath to fileUrl for frontend
        filePath: submissions.filePath,
        content: submissions.content
      })
      .from(submissions)
      .innerJoin(users, eq(submissions.studentId, users.id))
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .innerJoin(assignments, eq(submissions.assignmentId, assignments.id)) // Join assignments
      .innerJoin(courses, eq(assignments.courseId, courses.id)) // Join courses
      .where(and(
        eq(submissions.assignmentId, req.params.assignmentId),
        eq(courses.organizationId, orgId) // Enforce org
      ))
      .orderBy(desc(submissions.submittedAt));

    res.json(assignmentSubmissions);
  } catch (error: any) {
    console.error("Error fetching submissions:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch submissions" });
  }
});

export default router;
