import { Router, Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import {
  generateRetakeExam,
  getRetakeExam,
  submitRetakeExam,
} from '../services/retake.service.js';

const router = Router();

/**
 * POST /api/retakes
 * Generate a new retake exam from student's mistake pool
 */
router.post('/retakes', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { topicNames, questionCount, difficulty } = req.body;
    const studentId = (req as any).user?.id;

    if (!studentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!topicNames || !Array.isArray(topicNames) || topicNames.length === 0) {
      return res.status(400).json({ message: 'Invalid topic names' });
    }

    if (!questionCount || questionCount < 5 || questionCount > 30) {
      return res.status(400).json({ message: 'Question count must be between 5 and 30' });
    }

    if (!['review', 'challenge'].includes(difficulty)) {
      return res.status(400).json({ message: 'Invalid difficulty level' });
    }

    const retakeData = await generateRetakeExam({
      studentId,
      topicNames,
      questionCount,
      difficulty,
    });

    return res.status(201).json(retakeData);
  } catch (error: any) {
    console.error('Error creating retake exam:', error);
    return res.status(500).json({ message: error.message || 'Failed to create retake exam' });
  }
});

/**
 * GET /api/retakes/:retakeId
 * Fetch a specific retake exam with its questions
 */
router.get('/retakes/:retakeId', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { retakeId } = req.params;
    const studentId = (req as any).user?.id;

    if (!studentId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const retakeData = await getRetakeExam(retakeId, studentId);

    return res.status(200).json(retakeData);
  } catch (error: any) {
    console.error('Error fetching retake exam:', error);

    if (error.message === 'Retake exam not found') {
      return res.status(404).json({ message: 'Retake exam not found' });
    }

    return res.status(500).json({ message: error.message || 'Failed to fetch retake exam' });
  }
});

/**
 * POST /api/retakes/:retakeId/submit
 * Submit retake exam answers and update mistake pool
 */
router.post(
  '/retakes/:retakeId/submit',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { retakeId } = req.params;
      const { answers, durationSeconds } = req.body;
      const studentId = (req as any).user?.id;

      if (!studentId) {
        return res.status(401).json({ message: 'Unauthorized' });
      }

      if (!answers || !Array.isArray(answers)) {
        return res.status(400).json({ message: 'Invalid answers format' });
      }

      if (!durationSeconds || durationSeconds < 0) {
        return res.status(400).json({ message: 'Invalid duration' });
      }

      const result = await submitRetakeExam(
        retakeId,
        studentId,
        answers,
        durationSeconds
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error('Error submitting retake exam:', error);

      if (error.message === 'Retake exam not found') {
        return res.status(404).json({ message: 'Retake exam not found' });
      }

      return res.status(500).json({ message: error.message || 'Failed to submit retake exam' });
    }
  }
);

export default router;
