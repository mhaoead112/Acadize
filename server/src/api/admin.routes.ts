import express from 'express';
import {
  getSystemStats,
  getUserStats,
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  toggleUserStatus,
  getAllCourses,
  createEnrollment,
  removeEnrollment,
  getPlatformAnalytics,
  getModerationReports,
  updateReportStatus,
  bulkImportUsers,
  linkStudentToParent,
  unlinkStudentFromParent,
  getStudentsWithParents,
  type CreateUserInput,
  type UpdateUserInput
} from '../services/admin.service.js';
import { isAuthenticated, isAdmin } from '../middleware/auth.middleware.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(isAuthenticated);
router.use(isAdmin);

/**
 * GET /api/admin/stats
 * Get system overview statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    const stats = await getSystemStats(orgId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      error: 'Failed to fetch system statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/stats/users
 * Get user statistics by role
 */
router.get('/stats/users', async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    const stats = await getUserStats(orgId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    res.status(500).json({
      error: 'Failed to fetch user statistics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/users
 * Get all users with optional filtering
 * Query params: role, status, search, limit, offset
 */
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, limit, offset } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    const filters = {
      role: role as string | undefined,
      status: status as string | undefined,
      search: search as string | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
      organizationId: orgId,
    };

    const users = await getAllUsers(filters);
    res.json({ users, total: users.length });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      error: 'Failed to fetch users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/users/:userId
 * Get user by ID
 */
router.get('/users/:userId', async (req, res) => {
  try {
    const user = await getUserById(req.params.userId);
    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({
        error: 'Failed to fetch user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * POST /api/admin/users
 * Create a new user
 */
router.post('/users', async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    const input: CreateUserInput = {
      username: req.body.username,
      email: req.body.email,
      fullName: req.body.fullName,
      role: req.body.role,
      password: req.body.password,
      organizationId: orgId,
    };

    // Validate input
    if (!input.username || !input.email || !input.fullName || !input.role || !input.password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!['student', 'teacher', 'admin', 'parent'].includes(input.role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const newUser = await createUser(input);
    res.status(201).json({ user: newUser, message: 'User created successfully' });
  } catch (error) {
    console.error('Error creating user:', error);
    if (error instanceof Error && error.message.includes('already exists')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * PATCH /api/admin/users/:userId
 * Update user details
 */
router.patch('/users/:userId', async (req, res) => {
  try {
    const input: UpdateUserInput = {};

    if (req.body.username) input.username = req.body.username;
    if (req.body.email) input.email = req.body.email;
    if (req.body.fullName) input.fullName = req.body.fullName;
    if (req.body.role) input.role = req.body.role;
    if (req.body.isActive !== undefined) input.isActive = req.body.isActive;

    const updatedUser = await updateUser(req.params.userId, input);
    res.json({ user: updatedUser, message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    if (error instanceof Error && error.message.includes('already in use')) {
      res.status(409).json({ error: error.message });
    } else if (error instanceof Error && error.message === 'User not found') {
      res.status(404).json({ error: 'User not found' });
    } else {
      res.status(500).json({
        error: 'Failed to update user',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * DELETE /api/admin/users/:userId
 * Delete a user
 */
router.delete('/users/:userId', async (req, res) => {
  try {
    // Prevent deleting yourself
    if (req.user?.id === req.params.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await deleteUser(req.params.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      error: 'Failed to delete user',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/admin/users/:userId/status
 * Toggle user active status
 */
router.patch('/users/:userId/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (typeof status !== 'boolean') {
      return res.status(400).json({ error: 'Status must be a boolean' });
    }

    // Prevent deactivating yourself
    if (req.user?.id === req.params.userId && !status) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const updatedUser = await toggleUserStatus(req.params.userId, status);
    res.json({
      user: updatedUser,
      message: `User ${status ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error('Error updating user status:', error);
    res.status(500).json({
      error: 'Failed to update user status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/users/bulk-import
 * Bulk import users
 */
router.post('/users/bulk-import', async (req, res) => {
  try {
    const { users } = req.body;

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(400).json({ error: 'Users array is required' });
    }

    const results = await bulkImportUsers(users);
    res.json({
      message: 'Bulk import completed',
      results
    });
  } catch (error) {
    console.error('Error bulk importing users:', error);
    res.status(500).json({
      error: 'Failed to import users',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/courses
 * Get all courses with optional filtering
 */
router.get('/courses', async (req, res) => {
  try {
    const { published, teacherId, search } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    const filters = {
      published: published === 'true' ? true : published === 'false' ? false : undefined,
      teacherId: teacherId as string | undefined,
      search: search as string | undefined,
      organizationId: orgId,
    };

    const courses = await getAllCourses(filters);
    res.json({ courses });
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({
      error: 'Failed to fetch courses',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/enrollments
 * Create a new enrollment
 */
router.post('/enrollments', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' });
    }

    const enrollment = await createEnrollment(studentId, courseId);
    res.status(201).json({
      enrollment,
      message: 'Student enrolled successfully'
    });
  } catch (error) {
    console.error('Error creating enrollment:', error);
    if (error instanceof Error && error.message.includes('already enrolled')) {
      res.status(409).json({ error: error.message });
    } else {
      res.status(500).json({
        error: 'Failed to create enrollment',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
});

/**
 * DELETE /api/admin/enrollments/:enrollmentId
 * Remove an enrollment
 */
router.delete('/enrollments/:enrollmentId', async (req, res) => {
  try {
    await removeEnrollment(req.params.enrollmentId);
    res.json({ message: 'Enrollment removed successfully' });
  } catch (error) {
    console.error('Error removing enrollment:', error);
    res.status(500).json({
      error: 'Failed to remove enrollment',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/analytics
 * Get platform analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    const analytics = await getPlatformAnalytics(orgId);
    res.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/reports
 * Get moderation reports
 */
router.get('/reports', async (req, res) => {
  try {
    const { status, limit } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    const filters = {
      status: status as 'pending' | 'reviewed' | 'resolved' | undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      organizationId: orgId,
    };

    const reports = await getModerationReports(filters);
    res.json({ reports });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: 'Failed to fetch reports',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/admin/reports/:reportId
 * Update report status
 */
router.patch('/reports/:reportId', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const report = await updateReportStatus(req.params.reportId, status);
    res.json({
      report,
      message: 'Report status updated successfully'
    });
  } catch (error) {
    console.error('Error updating report status:', error);
    res.status(500).json({
      error: 'Failed to update report status',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/announcements
 * Get all platform announcements (admin can see all course announcements)
 */
router.get('/announcements', async (req, res) => {
  try {
    const { db } = await import('../db/index.js');
    const { announcements, users, courses } = await import('../db/schema.js');
    const { desc, sql } = await import('drizzle-orm');

    const { audience, limit = '50' } = req.query;

    // Get all announcements with teacher and course info
    let query = db
      .select({
        id: announcements.id,
        title: announcements.title,
        content: announcements.content,
        isPinned: announcements.isPinned,
        createdAt: announcements.createdAt,
        author: users.fullName,
        authorRole: users.role,
        courseId: announcements.courseId,
        courseName: courses.title,
        readCount: sql<number>`0` // Placeholder - would need separate reads tracking table
      })
      .from(announcements)
      .leftJoin(users, sql`${announcements.teacherId} = ${users.id}`)
      .leftJoin(courses, sql`${announcements.courseId} = ${courses.id}`)
      .orderBy(desc(announcements.isPinned), desc(announcements.createdAt))
      .limit(parseInt(limit as string));

    const allAnnouncements = await query;

    res.json({ announcements: allAnnouncements });
  } catch (error) {
    console.error('Error fetching announcements:', error);
    res.status(500).json({
      error: 'Failed to fetch announcements',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/announcements
 * Create a platform-wide announcement (creates it for a special "Platform" course)
 */
router.post('/announcements', async (req, res) => {
  try {
    const { title, content, audience = 'all' } = req.body;
    const adminUser = (req as any).user;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const { db } = await import('../db/index.js');
    const { announcements, courses } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    // Check if "Platform Announcements" course exists, create if not
    let platformCourse = await db
      .select()
      .from(courses)
      .where(eq(courses.title, 'Platform Announcements'))
      .limit(1);

    if (!platformCourse[0]) {
      const orgId = (req as any).tenant?.organizationId;
      if (!orgId) {
        return res.status(400).json({ error: 'Organization context required' });
      }
      platformCourse = await db.insert(courses).values({
        title: 'Platform Announcements',
        description: 'System-wide announcements and notifications',
        organizationId: orgId,
        teacherId: adminUser.id,
        isPublished: true
      }).returning();
    }

    const newAnnouncement = await db.insert(announcements).values({
      courseId: platformCourse[0].id,
      teacherId: adminUser.id,
      title,
      content,
      isPinned: false
    }).returning();

    res.status(201).json({
      message: 'Announcement created successfully',
      announcement: {
        ...newAnnouncement[0],
        author: adminUser.fullName,
        authorRole: 'admin',
        audience,
        readCount: 0
      }
    });
  } catch (error) {
    console.error('Error creating announcement:', error);
    res.status(500).json({
      error: 'Failed to create announcement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * PATCH /api/admin/announcements/:id
 * Update announcement (toggle pin, edit content)
 */
router.patch('/announcements/:id', async (req, res) => {
  try {
    const { isPinned, title, content } = req.body;
    const { db } = await import('../db/index.js');
    const { announcements } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const updates: any = {};
    if (isPinned !== undefined) updates.isPinned = isPinned;
    if (title) updates.title = title;
    if (content) updates.content = content;

    const updated = await db
      .update(announcements)
      .set(updates)
      .where(eq(announcements.id, req.params.id))
      .returning();

    if (!updated[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({
      announcement: updated[0],
      message: 'Announcement updated successfully'
    });
  } catch (error) {
    console.error('Error updating announcement:', error);
    res.status(500).json({
      error: 'Failed to update announcement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/admin/announcements/:id
 * Delete an announcement
 */
router.delete('/announcements/:id', async (req, res) => {
  try {
    const { db } = await import('../db/index.js');
    const { announcements } = await import('../db/schema.js');
    const { eq } = await import('drizzle-orm');

    const deleted = await db
      .delete(announcements)
      .where(eq(announcements.id, req.params.id))
      .returning();

    if (!deleted[0]) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    res.json({ message: 'Announcement deleted successfully' });
  } catch (error) {
    console.error('Error deleting announcement:', error);
    res.status(500).json({
      error: 'Failed to delete announcement',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/link-student-parent
 * Link a student to a parent
 */
router.post('/link-student-parent', async (req, res) => {
  try {
    const { studentId, parentId } = req.body;

    if (!studentId || !parentId) {
      return res.status(400).json({ error: 'Student ID and Parent ID are required' });
    }

    // Convert to strings since IDs in database are text
    const result = await linkStudentToParent(String(studentId), String(parentId));
    res.status(200).json(result);
  } catch (error) {
    console.error('Error linking student to parent:', error);
    res.status(500).json({
      error: 'Failed to link student with parent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/admin/unlink-student-parent
 * Unlink a student from their parent
 */
router.post('/unlink-student-parent', async (req, res) => {
  try {
    const { studentId } = req.body;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    // Convert to string since IDs in database are text
    const result = await unlinkStudentFromParent(String(studentId));
    res.status(200).json(result);
  } catch (error) {
    console.error('Error unlinking student from parent:', error);
    res.status(500).json({
      error: 'Failed to unlink student from parent',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/admin/students-with-parents
 * Get all students with their parent information
 */
router.get('/students-with-parents', async (req, res) => {
  try {
    const orgId = (req as any).tenant?.organizationId;
    const students = await getStudentsWithParents(orgId);
    res.json(students);
  } catch (error) {
    console.error('Error fetching students with parents:', error);
    res.status(500).json({
      error: 'Failed to fetch students with parent information',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
