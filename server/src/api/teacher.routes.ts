import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { addTeacherNote, getNotesForStudent } from '../services/teacher-notes.service.js';

const router = Router();

// POST /api/teacher/notes -> { studentId, content } => { id }
router.post('/notes', isAuthenticated, async (req, res) => {
  try {
    const teacherId = req.user?.id;
    const { studentId, content } = req.body || {};

    if (!teacherId) return res.status(401).json({ message: 'Unauthorized' });
    if (!studentId || typeof studentId !== 'string') {
      return res.status(400).json({ message: 'studentId is required' });
    }
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ message: 'content is required' });
    }

    const result = await addTeacherNote(studentId, teacherId, content.trim());
    return res.status(201).json(result);
  } catch (err) {
    console.error('Error creating teacher note:', err);
    return res.status(500).json({ message: 'Failed to create note' });
  }
});

// GET /api/teacher/students/:studentId/notes -> notes array
router.get('/students/:studentId/notes', isAuthenticated, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (!studentId) return res.status(400).json({ message: 'studentId is required' });

    const notes = await getNotesForStudent(studentId);
    return res.json({ notes });
  } catch (err) {
    console.error('Error fetching notes:', err);
    return res.status(500).json({ message: 'Failed to fetch notes' });
  }
});

export default router;