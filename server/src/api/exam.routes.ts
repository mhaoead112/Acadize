// server/src/api/exam.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';
import { logger } from '../utils/logger.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';
import {
  createExam,
  updateExam,
  deleteExam,
  getExamById,
  getExamsByCourse,
  getAvailableExamsForStudent,
  getExamAttempts,
  addQuestion,
  updateQuestion,
  deleteQuestion,
  reorderQuestions,
} from '../services/exam.service.js';

const router = express.Router();

// Helper to get Org ID — prefers req.tenant (subdomain routing) but falls back to
// req.user.organizationId (JWT claim) for single-domain / dev deployments where
// the tenant middleware resolves to no org from subdomain.
const getOrgId = (req: Request): string | undefined => {
  const tenantOrg = (req as any).tenant?.organizationId as string | undefined;
  const userOrg   = (req as any).user?.organizationId  as string | undefined;
  return tenantOrg || userOrg;
};
const getUser = (req: Request) => (req as any).user;

/**
 * POST /api/exams
 * Create a new exam
 */
router.post('/', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Teacher access required." });
    }

    // Basic validation (service handles stricter checks/defaults)
    if (!req.body.courseId || !req.body.title || !req.body.duration) {
      return res.status(400).json({ message: 'Missing required fields: courseId, title, duration.' });
    }

    const exam = await createExam({
      ...req.body,
      scheduledStartAt: req.body.scheduledStartAt ? new Date(req.body.scheduledStartAt) : undefined,
      scheduledEndAt: req.body.scheduledEndAt ? new Date(req.body.scheduledEndAt) : undefined,
      userId: user.id,
      organizationId: orgId  // Always sourced from server — never trusted from client body
    });

    res.status(201).json({
      message: 'Exam created successfully.',
      examId: exam.id,   // Top-level shortcut so client can redirect without drilling into exam.*
      exam
    });
  } catch (error: any) {
    logger.error('Error creating exam', { error: error.message, stack: error.stack });
    res.status(500).json({ message: error.message || 'Failed to create exam.' });
  }
});

/**
 * GET /api/exams/student/available
 * Get all available exams for the authenticated student
 */
router.get('/student/available', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
    const { limit, offset, page } = getPaginationParams(req);

    const { data, totalCount } = await getAvailableExamsForStudent(user.id, orgId, limit, offset);
    res.status(200).json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error fetching available exams:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch available exams.' });
  }
});

/**
 * GET /api/exams/:id
 * Get exam details by ID
 */
router.get('/:id', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const locale = (req as any).locale;
    const exam = await getExamById(req.params.id, user.id, user.role, orgId, locale);
    if (!exam) {
      return res.status(404).json({ message: 'Exam not found.' });
    }

    res.status(200).json(exam);
  } catch (error: any) {
    console.error('Error fetching exam:', error);
    if (error.message.includes('Forbidden')) {
      return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: 'Failed to fetch exam.' });
  }
});

/**
 * PATCH /api/exams/:id
 * Update exam settings
 */
router.patch('/:id', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Teacher access required." });
    }

    const { scheduledStartAt, scheduledEndAt, ...rest } = req.body;
    const updateData: any = { ...rest };
    if (scheduledStartAt) updateData.scheduledStartAt = new Date(scheduledStartAt);
    if (scheduledEndAt) updateData.scheduledEndAt = new Date(scheduledEndAt);

    const updatedExam = await updateExam(req.params.id, {
      ...updateData,
      userId: user.id,
      organizationId: orgId
    });

    res.status(200).json({
      message: 'Exam updated successfully.',
      exam: updatedExam
    });
  } catch (error: any) {
    console.error('Error updating exam:', error);
    res.status(500).json({ message: error.message || 'Failed to update exam.' });
  }
});

/**
 * DELETE /api/exams/:id
 * Delete an exam
 */
router.delete('/:id', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Teacher access required." });
    }

    await deleteExam(req.params.id, user.id, orgId);

    res.status(200).json({ message: 'Exam deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting exam:', error);
    res.status(500).json({ message: error.message || 'Failed to delete exam.' });
  }
});

/**
 * GET /api/exams/course/:courseId
 * Get all exams for a specific course
 */
router.get('/course/:courseId', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const { getPaginationParams, buildPaginatedResponse } = await import('../utils/pagination.js');
    const { limit, offset, page } = getPaginationParams(req);

    const locale = (req as any).locale;
    const { data, totalCount } = await getExamsByCourse(req.params.courseId, user.id, user.role, orgId, locale, limit, offset);
    res.status(200).json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error fetching course exams:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch exams.' });
  }
});

/**
 * GET /api/exams/:id/attempts
 * Get all attempts for a specific exam (teacher only)
 */
router.get('/:id/attempts', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    if (user.role !== 'teacher' && user.role !== 'admin') {
      return res.status(403).json({ message: "Forbidden: Teacher access required." });
    }

    const { limit, offset, page } = getPaginationParams(req);
    const { data, totalCount } = await getExamAttempts(req.params.id, user.id, orgId, limit, offset);
    
    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error fetching exam attempts:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch attempts.' });
  }
});

// =====================================================
// EXAM STATUS MANAGEMENT SHORTCUTS
// =====================================================

router.patch('/:id/publish', ...requireAuth, async (req: Request, res: Response) => {
  // Determine status based on dates provided or current dates
  // Simplified: Just pass status 'scheduled' or 'active' along with dates to updateExam
  // The previous logic was complex. We'll rely on the client to send correct status or update logic in service.
  // For now, let's map this to updateExam but we need to derive 'active' vs 'scheduled'.

  // Actually, let's just let the client send the status update calling PATCH /:id directly?
  // But to preserve API compatibility:
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    const { scheduledStartAt, scheduledEndAt } = req.body;
 
    const now = new Date();
    const start = scheduledStartAt ? new Date(scheduledStartAt) : undefined;
    // If start is in future, scheduled. Else active.
    // We'll trust client or default logic.
    const status = (start && start > now) ? 'scheduled' : 'active';
 
    const updatedExam = await updateExam(req.params.id, {
      status,
      scheduledStartAt: start,
      scheduledEndAt: scheduledEndAt ? new Date(scheduledEndAt) : undefined,
      organizationId: orgId,
      userId: user.id
    });

    res.status(200).json({
      message: 'Exam published successfully.',
      exam: updatedExam
    });

  } catch (error: any) {
    console.error('Error publishing exam:', error);
    res.status(500).json({ message: error.message || 'Failed to publish exam.' });
  }
});

router.patch('/:id/unpublish', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const updatedExam = await updateExam(req.params.id, {
      status: 'draft',
      organizationId: orgId,
      userId: user.id
    });

    res.status(200).json({
      message: 'Exam unpublished successfully.',
      exam: updatedExam
    });
  } catch (error: any) {
    console.error('Error unpublishing exam:', error);
    res.status(500).json({ message: error.message || 'Failed to unpublish exam.' });
  }
});

router.patch('/:id/archive', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
 
    const updatedExam = await updateExam(req.params.id, {
      status: 'archived',
      organizationId: orgId,
      userId: user.id
    });

    res.status(200).json({
      message: 'Exam archived successfully.',
      exam: updatedExam
    });
  } catch (error: any) {
    console.error('Error archiving exam:', error);
    res.status(500).json({ message: error.message || 'Failed to archive exam.' });
  }
});


// =====================================================
// QUESTIONS
// =====================================================

router.post('/:id/questions', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const question = await addQuestion({
      ...req.body,
      examId: req.params.id,
      userId: user.id,
      organizationId: orgId
    });

    res.status(201).json({
      message: 'Question added successfully.',
      question
    });
  } catch (error: any) {
    console.error('Error adding question:', error);
    res.status(500).json({ message: error.message || 'Failed to add question.' });
  }
});

router.patch('/:examId/questions/:questionId', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    const updated = await updateQuestion({
      ...req.body,
      questionId: req.params.questionId,
      examId: req.params.examId,
      userId: user.id,
      organizationId: orgId
    });

    res.json({ message: 'Question updated successfully.', question: updated });
  } catch (error: any) {
    console.error('Error updating question:', error);
    res.status(500).json({ message: error.message || 'Failed to update question.' });
  }
});

router.delete('/:examId/questions/:questionId', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });

    await deleteQuestion(req.params.questionId, req.params.examId, user.id, orgId);

    res.json({ message: 'Question deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting question:', error);
    res.status(500).json({ message: error.message || 'Failed to delete question.' });
  }
});

router.patch('/:examId/questions/reorder', ...requireAuth, async (req: Request, res: Response) => {
  try {
    const user = getUser(req);
    const orgId = getOrgId(req);
    if (!orgId) return res.status(400).json({ message: "Organization context required" });
    const { questionIds } = req.body;
 
    if (!Array.isArray(questionIds)) {
      return res.status(400).json({ message: "questionIds must be an array" });
    }
 
    await reorderQuestions(req.params.examId, questionIds, user.id, orgId);

    res.json({ message: 'Questions reordered successfully.' });
  } catch (error: any) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ message: error.message || 'Failed to reorder questions.' });
  }
});

// Settings shortcuts (Anti-cheat, Retake) -> Map to updateExam
router.patch('/:id/anti-cheat', ...requireAuth, async (req: Request, res: Response) => {
  // Proxies to updateExam
  const user = getUser(req);
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ message: "Organization context required" });
  try {
    const updated = await updateExam(req.params.id, {
      ...req.body, // spread anti-cheat fields
      userId: user.id,
      organizationId: orgId
    });
    res.status(200).json({ message: 'Anti-cheat settings updated.', settings: updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/:id/anti-cheat', ...requireAuth, async (req: Request, res: Response) => {
  const user = getUser(req);
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ message: "Organization context required" });
  try {
    const locale = (req as any).locale;
    const exam = await getExamById(req.params.id, user.id, user.role, orgId, locale);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    // Filter fields? Or just return exam.
    res.status(200).json(exam);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.patch('/:id/retake-settings', ...requireAuth, async (req: Request, res: Response) => {
  const user = getUser(req);
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ message: "Organization context required" });
  try {
    const updated = await updateExam(req.params.id, {
      ...req.body,
      userId: user.id,
      organizationId: orgId
    });
    res.status(200).json({ message: 'Retake settings updated.', settings: updated });
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

router.get('/:id/retake-settings', ...requireAuth, async (req: Request, res: Response) => {
  const user = getUser(req);
  const orgId = getOrgId(req);
  if (!orgId) return res.status(400).json({ message: "Organization context required" });
  try {
    const locale = (req as any).locale;
    const exam = await getExamById(req.params.id, user.id, user.role, orgId, locale);
    if (!exam) return res.status(404).json({ message: "Exam not found" });
    res.status(200).json(exam);
  } catch (e: any) { res.status(500).json({ message: e.message }); }
});

export default router;
