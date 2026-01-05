import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { isAuthenticated } from "../middleware/auth.middleware.js";
import {
  createAssignment,
  getAssignmentsForCourse,
  submitAssignment,
  gradeSubmission,
  getStudentProgress,
} from "../services/assignment.service.js";
import pushNotificationService from "../services/push-notification.service.js";
import { db } from "../db/index.js";
import { assignments, submissions, courses, enrollments, grades, users } from "../db/schema.js";
import { eq, and, desc, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
import fs from "fs";
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
router.get("/student", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get student's enrolled courses
    const studentEnrollments = await db
      .select({ courseId: enrollments.courseId })
      .from(enrollments)
      .where(eq(enrollments.studentId, user.id));

    const courseIds = studentEnrollments.map(e => e.courseId);

    if (courseIds.length === 0) {
      return res.json([]);
    }

    // Get all assignments for these courses
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
      .leftJoin(courses, eq(assignments.courseId, courses.id))
      .where(sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`)
      .orderBy(desc(assignments.dueDate));

    // Get all student's submissions with grades
    const studentSubmissions = await db
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
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(eq(submissions.studentId, user.id));

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

    res.json(assignmentsWithStatus);
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
router.get("/teacher", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    // Get all courses taught by this teacher
    const teacherCourses = await db
      .select({ id: courses.id, title: courses.title })
      .from(courses)
      .where(eq(courses.teacherId, user.id));

    const courseIds = teacherCourses.map(c => c.id);

    if (courseIds.length === 0) {
      return res.json([]);
    }

    // Get all assignments for these courses with submission counts
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
      .leftJoin(courses, eq(assignments.courseId, courses.id))
      .where(sql`${assignments.courseId} IN (${sql.raw(courseIds.map(id => `'${id}'`).join(','))})`)
      .orderBy(desc(assignments.createdAt));

    // Get submission counts for each assignment
    const assignmentsWithCounts = await Promise.all(
      teacherAssignments.map(async (assignment) => {
        const submissionCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .where(eq(submissions.assignmentId, assignment.id));

        const gradedCount = await db
          .select({ count: sql<number>`count(*)` })
          .from(submissions)
          .leftJoin(grades, eq(submissions.id, grades.submissionId))
          .where(and(
            eq(submissions.assignmentId, assignment.id),
            sql`${grades.id} IS NOT NULL`
          ));

        return {
          ...assignment,
          submissionCount: Number(submissionCount[0]?.count || 0),
          gradedCount: Number(gradedCount[0]?.count || 0),
        };
      })
    );

    res.json(assignmentsWithCounts);
  } catch (error: any) {
    console.error("Error fetching teacher assignments:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch assignments" });
  }
});

// Teacher creates an assignment for a course
router.post("/courses/:courseId/assignments", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only." });
    }

    const { title, description, type, dueDate, maxScore } = req.body;
    if (!title || !dueDate) {
      return res.status(400).json({ message: "title and dueDate are required" });
    }

    // Verify teacher owns the course
    const course = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, req.params.courseId),
        eq(courses.teacherId, user.id)
      ))
      .limit(1);

    if (course.length === 0) {
      return res.status(403).json({ message: "You do not have permission to add assignments to this course" });
    }

    const [assignment] = await db
      .insert(assignments)
      .values({
        courseId: req.params.courseId,
        title,
        description: description || null,
        type: type || 'homework',
        dueDate: new Date(dueDate),
        maxScore: maxScore?.toString() || '100',
        isPublished: false,
      })
      .returning();

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
      // Don't fail the request if notification fails
    }

    res.status(201).json(assignment);
  } catch (error: any) {
    console.error("Error creating assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to create assignment" });
  }
});

// Get assignments for a course (teacher or enrolled student)
router.get("/courses/:courseId/assignments", isAuthenticated, async (req, res) => {
  try {
    const assignments = await getAssignmentsForCourse(req.params.courseId);
    res.json(assignments);
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
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

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
      .leftJoin(courses, eq(assignments.courseId, courses.id))
      .where(eq(assignments.id, req.params.id))
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
          eq(courses.teacherId, user.id)
        ))
        .limit(1);

      if (!course && user.role !== 'admin') {
        return res.status(403).json({ message: "You do not have permission to view this assignment" });
      }
    } else if (user.role === 'student') {
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
router.put("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const { title, description, type, dueDate, maxScore } = req.body;

    // Verify teacher owns the course
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .where(eq(assignments.id, req.params.id))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id)
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
router.patch("/:assignmentId", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const { title, description, type, dueDate, maxScore } = req.body;

    // Verify teacher owns the course
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .where(eq(assignments.id, req.params.assignmentId))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id)
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
router.patch("/:id/publish", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    const { isPublished } = req.body;

    // Verify teacher owns the course
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .where(eq(assignments.id, req.params.id))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id)
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
router.delete("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    // Verify teacher owns the course
    const [existingAssignment] = await db
      .select({ courseId: assignments.courseId })
      .from(assignments)
      .where(eq(assignments.id, req.params.id))
      .limit(1);

    if (!existingAssignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, existingAssignment.courseId),
        eq(courses.teacherId, user.id)
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
router.post("/:assignmentId/submit", isAuthenticated, upload.single('file'), async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Forbidden: Students only." });
    }

    const { content } = req.body;
    const file = req.file;

    // Validate that at least one of content or file is provided
    if (!content && !file) {
      return res.status(400).json({ message: "Either content or file is required" });
    }

    // Verify assignment exists and student is enrolled in the course
    const [assignment] = await db
      .select({
        id: assignments.id,
        courseId: assignments.courseId,
        title: assignments.title,
        maxScore: assignments.maxScore,
      })
      .from(assignments)
      .where(eq(assignments.id, req.params.assignmentId))
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

    // Check if there's already a submission for this assignment
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
      // Delete existing grade for this submission (reset grade on resubmit)
      await db
        .delete(grades)
        .where(eq(grades.submissionId, existingSubmission.id));

      // Update existing submission
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
      // Create new submission
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

    res.status(201).json({
      message: existingSubmission ? "Assignment resubmitted successfully" : "Assignment submitted successfully",
      submission: {
        id: submission.id,
        assignmentId: submission.assignmentId,
        content: submission.content,
        fileName: submission.fileName,
        submittedAt: submission.submittedAt,
        status: submission.status,
      }
    });
  } catch (error: any) {
    console.error("Error submitting assignment:", error);
    res.status(500).json({ message: error?.message || "Failed to submit assignment" });
  }
});

// Teacher grades a submission
router.post("/submissions/:submissionId/grade", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only." });
    }

    const { grade, feedback } = req.body;
    if (grade == null) {
      return res.status(400).json({ message: "grade is required" });
    }

    // Get submission info before grading
    const [submissionInfo] = await db
      .select({
        studentId: submissions.studentId,
        assignmentId: submissions.assignmentId,
      })
      .from(submissions)
      .where(eq(submissions.id, req.params.submissionId))
      .limit(1);

    const updated = await gradeSubmission({
      submissionId: req.params.submissionId,
      grade,
      feedback,
      gradedBy: user.id,
    });

    // Send push notification to student about new grade
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
router.get("/:assignmentId/submissions", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "teacher") {
      return res.status(403).json({ message: "Forbidden: Teachers only" });
    }

    // Verify teacher owns the course
    const [assignment] = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        courseId: assignments.courseId,
        maxScore: assignments.maxScore,
        dueDate: assignments.dueDate,
      })
      .from(assignments)
      .where(eq(assignments.id, req.params.assignmentId))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.id, assignment.courseId),
        eq(courses.teacherId, user.id)
      ))
      .limit(1);

    if (!course) {
      return res.status(403).json({ message: "You do not have permission to view these submissions" });
    }

    // Get all students enrolled in the course
    const enrolledStudents = await db
      .select({
        studentId: users.id,
        studentUsername: users.username,
        studentEmail: users.email,
        enrolledAt: enrollments.enrolledAt,
      })
      .from(enrollments)
      .leftJoin(users, eq(enrollments.studentId, users.id))
      .where(eq(enrollments.courseId, assignment.courseId));

    // Get all submissions for this assignment
    const assignmentSubmissions = await db
      .select({
        submissionId: submissions.id,
        studentId: submissions.studentId,
        content: submissions.content,
        filePath: submissions.filePath,
        fileName: submissions.fileName,
        fileType: submissions.fileType,
        fileSize: submissions.fileSize,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
        score: grades.score,
        feedback: grades.feedback,
        gradedAt: grades.gradedAt,
      })
      .from(submissions)
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(eq(submissions.assignmentId, req.params.assignmentId));

    // Combine enrolled students with their submission status
    const studentsWithSubmissions = enrolledStudents.map((enrollment) => {
      const submission = assignmentSubmissions.find(
        sub => sub.studentId === enrollment.studentId
      );

      return {
        studentId: enrollment.studentId,
        studentName: enrollment.studentUsername || 'Unknown',
        studentEmail: enrollment.studentEmail || '',
        enrolledAt: enrollment.enrolledAt,
        hasSubmitted: !!submission,
        submission: submission ? {
          id: submission.submissionId,
          content: submission.content,
          fileName: submission.fileName,
          fileType: submission.fileType,
          fileSize: submission.fileSize,
          submittedAt: submission.submittedAt,
          status: submission.status,
          score: submission.score,
          feedback: submission.feedback,
          gradedAt: submission.gradedAt,
        } : null,
      };
    });

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate,
      },
      totalStudents: studentsWithSubmissions.length,
      submittedCount: studentsWithSubmissions.filter(s => s.hasSubmitted).length,
      students: studentsWithSubmissions,
    });
  } catch (error: any) {
    console.error("Error fetching assignment submissions:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch submissions" });
  }
});

/**
 * PROTECTED (STUDENT)
 * GET /api/assignments/:assignmentId/my-submission
 * Get student's own submission for an assignment
 */
router.get("/:assignmentId/my-submission", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user || user.role !== "student") {
      return res.status(403).json({ message: "Forbidden: Students only" });
    }

    // Verify assignment exists and student is enrolled
    const [assignment] = await db
      .select({
        id: assignments.id,
        title: assignments.title,
        description: assignments.description,
        type: assignments.type,
        courseId: assignments.courseId,
        maxScore: assignments.maxScore,
        dueDate: assignments.dueDate,
      })
      .from(assignments)
      .where(eq(assignments.id, req.params.assignmentId))
      .limit(1);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check enrollment
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

    // Get submission if exists
    const [submission] = await db
      .select({
        id: submissions.id,
        content: submissions.content,
        filePath: submissions.filePath,
        fileName: submissions.fileName,
        fileType: submissions.fileType,
        fileSize: submissions.fileSize,
        submittedAt: submissions.submittedAt,
        status: submissions.status,
        score: grades.score,
        feedback: grades.feedback,
        gradedAt: grades.gradedAt,
      })
      .from(submissions)
      .leftJoin(grades, eq(submissions.id, grades.submissionId))
      .where(and(
        eq(submissions.assignmentId, req.params.assignmentId),
        eq(submissions.studentId, user.id)
      ))
      .limit(1);

    res.json({
      assignment: {
        id: assignment.id,
        title: assignment.title,
        description: assignment.description,
        type: assignment.type,
        maxScore: assignment.maxScore,
        dueDate: assignment.dueDate,
      },
      submission: submission || null,
      hasSubmitted: !!submission,
    });
  } catch (error: any) {
    console.error("Error fetching student submission:", error);
    res.status(500).json({ message: error?.message || "Failed to fetch submission" });
  }
});

/**
 * PROTECTED (STUDENT/TEACHER)
 * GET /api/assignments/submissions/:submissionId/download
 * Download submission file
 */
router.get("/submissions/:submissionId/download", isAuthenticated, async (req, res) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    // Get submission details
    const [submission] = await db
      .select({
        id: submissions.id,
        studentId: submissions.studentId,
        assignmentId: submissions.assignmentId,
        filePath: submissions.filePath,
        fileName: submissions.fileName,
        courseId: assignments.courseId,
        teacherId: courses.teacherId,
      })
      .from(submissions)
      .leftJoin(assignments, eq(submissions.assignmentId, assignments.id))
      .leftJoin(courses, eq(assignments.courseId, courses.id))
      .where(eq(submissions.id, req.params.submissionId))
      .limit(1);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Verify user has permission (student who submitted or teacher of the course)
    const isOwner = submission.studentId === user.id;
    const isTeacher = user.role === 'teacher' && submission.teacherId === user.id;

    if (!isOwner && !isTeacher) {
      return res.status(403).json({ message: "You do not have permission to access this submission" });
    }

    if (!submission.filePath) {
      return res.status(404).json({ message: "No file attached to this submission" });
    }

    // Send file
    res.download(submission.filePath, submission.fileName || 'download');
  } catch (error: any) {
    console.error("Error downloading submission:", error);
    res.status(500).json({ message: error?.message || "Failed to download submission" });
  }
});

export default router;
