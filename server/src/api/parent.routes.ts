import express from 'express';
import {
  linkChild,
  getParentChildren,
  getChildGrades,
  getChildAttendance,
  getStudentTeachers,
  getParentTeacherMessages,
  sendParentTeacherMessage,
  unlinkChild,
  getDashboardOverview,
  getChildAssignments,
  getChildAnalytics,
  getChildCourses,
  getChildLessonCompletion,
  getChildProgressReport,
  getChildReportCards,
  getChildCalendarEvents
} from '../services/parent.service.js';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

const router = express.Router();

// All parent routes require authentication and subscription
router.use(isAuthenticated, requireSubscription);

/**
 * GET /api/parent/dashboard/overview
 * Get comprehensive dashboard overview with all children data
 */
router.get('/dashboard/overview', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const overview = await getDashboardOverview(parentId);
    res.json(overview);
  } catch (error) {
    console.error('Error fetching dashboard overview:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard overview',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children
 * Get all children linked to the parent
 */
router.get('/children', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const children = await getParentChildren(parentId);
    res.json({ children });
  } catch (error) {
    console.error('Error fetching children:', error);
    res.status(500).json({
      error: 'Failed to fetch children',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/parent/link-child
 * Link a child to the parent using a link code
 */
router.post('/link-child', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { linkCode } = req.body;

    if (!linkCode) {
      return res.status(400).json({ error: 'Link code is required' });
    }

    const child = await linkChild(parentId, linkCode);
    res.json({
      message: 'Child linked successfully',
      child
    });
  } catch (error) {
    console.error('Error linking child:', error);
    if (error instanceof Error && error.message.includes('Invalid link code')) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to link child',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * DELETE /api/parent/children/:childId
 * Unlink a child from the parent
 */
router.delete('/children/:childId', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    await unlinkChild(parentId, childId);
    res.json({ message: 'Child unlinked successfully' });
  } catch (error) {
    console.error('Error unlinking child:', error);
    res.status(500).json({
      error: 'Failed to unlink child',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/grades
 * Get grades for a specific child
 */
router.get('/children/:childId/grades', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    const grades = await getChildGrades(parentId, childId);
    res.json({ grades });
  } catch (error) {
    console.error('Error fetching child grades:', error);
    res.status(500).json({
      error: 'Failed to fetch grades',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/attendance
 * Get attendance for a specific child
 */
router.get('/children/:childId/attendance', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    const attendance = await getChildAttendance(parentId, childId);
    res.json(attendance);
  } catch (error) {
    console.error('Error fetching child attendance:', error);
    res.status(500).json({
      error: 'Failed to fetch attendance',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/teachers
 * Get all teachers of parent's children
 */
router.get('/teachers', async (req, res) => {
  try {
    const parentId = req.user!.id;

    // Get all children
    const children = await getParentChildren(parentId);

    // Get teachers for all children
    const teachersMap = new Map();

    for (const child of children) {
      const teachers = await getStudentTeachers(child.id);
      teachers.forEach(teacher => {
        if (!teachersMap.has(teacher.id)) {
          teachersMap.set(teacher.id, teacher);
        }
      });
    }

    const teachers = Array.from(teachersMap.values());
    res.json({ teachers });
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({
      error: 'Failed to fetch teachers',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/messages/:teacherId
 * Get messages with a specific teacher
 */
router.get('/messages/:teacherId', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { teacherId } = req.params;

    const messages = await getParentTeacherMessages(parentId, teacherId);
    res.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({
      error: 'Failed to fetch messages',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/parent/messages/:teacherId
 * Send a message to a teacher
 */
router.post('/messages/:teacherId', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { teacherId } = req.params;
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    const message = await sendParentTeacherMessage(parentId, teacherId, content);
    res.json({
      message: 'Message sent successfully',
      data: message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({
      error: 'Failed to send message',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/assignments
 * Get assignments for a specific child with optional filters
 */
router.get('/children/:childId/assignments', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;
    const { status, days, courseId } = req.query;

    const options: any = {};
    if (status) options.status = status as string;
    if (days) options.days = parseInt(days as string);
    if (courseId) options.courseId = courseId as string;

    const assignments = await getChildAssignments(parentId, childId, options);
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching child assignments:', error);
    res.status(500).json({
      error: 'Failed to fetch assignments',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/analytics
 * Get analytics and performance trends for a child
 */
router.get('/children/:childId/analytics', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;
    const { period, startDate, endDate } = req.query;

    const options: any = {};
    if (period) options.period = period as string;
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    const analytics = await getChildAnalytics(parentId, childId, options);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching child analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/courses
 * Get all courses enrolled by a child with progress
 */
router.get('/children/:childId/courses', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    const courses = await getChildCourses(parentId, childId);
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching child courses:', error);
    res.status(500).json({
      error: 'Failed to fetch courses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/courses/:courseId/lessons
 * Get lesson completion status for a specific course
 */
router.get('/children/:childId/courses/:courseId/lessons', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId, courseId } = req.params;

    const lessons = await getChildLessonCompletion(parentId, childId, courseId);
    res.json(lessons);
  } catch (error) {
    console.error('Error fetching lesson completion:', error);
    res.status(500).json({
      error: 'Failed to fetch lesson completion',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/progress
 * Get overall progress report for a child
 */
router.get('/children/:childId/progress', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    const progress = await getChildProgressReport(parentId, childId);
    res.json(progress);
  } catch (error) {
    console.error('Error fetching progress report:', error);
    res.status(500).json({
      error: 'Failed to fetch progress report',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/reports
 * Get all report cards for a child
 */
router.get('/children/:childId/reports', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;

    const reports = await getChildReportCards(parentId, childId);
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching report cards:', error);
    res.status(500).json({
      error: 'Failed to fetch report cards',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/parent/children/:childId/calendar
 * Get calendar events for a child
 */
router.get('/children/:childId/calendar', async (req, res) => {
  try {
    const parentId = req.user!.id;
    const { childId } = req.params;
    const { startDate, endDate } = req.query;

    const options: any = {};
    if (startDate) options.startDate = new Date(startDate as string);
    if (endDate) options.endDate = new Date(endDate as string);

    const events = await getChildCalendarEvents(parentId, childId, options);
    res.json({ events });
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    res.status(500).json({
      error: 'Failed to fetch calendar events',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
