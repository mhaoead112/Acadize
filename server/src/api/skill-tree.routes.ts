// server/src/api/skill-tree.routes.ts
/**
 * Sprint C — Skill Tree API Routes
 *
 * GET /api/skill-tree/:courseId   — fetch tree with completion for authed student
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/protected.middleware.js';
import { getSkillTree } from '../services/skill-tree.service.js';

const router = Router();

/**
 * GET /api/skill-tree/:courseId
 * Auth: student (or any authenticated user)
 */
router.get('/:courseId', requireAuth, async (req, res) => {
  try {
    const { courseId } = req.params;
    const user = (req as any).user;

    if (!user?.organizationId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const tree = await getSkillTree(courseId, user.organizationId, user.id);
    return res.json(tree);
  } catch (err) {
    console.error('[SkillTree API]', err);
    return res.status(500).json({ error: 'Failed to load skill tree' });
  }
});

export default router;
