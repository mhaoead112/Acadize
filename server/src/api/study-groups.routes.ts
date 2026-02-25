// server/src/api/study-groups.routes.ts

import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import * as StudyGroupsService from '../services/study-groups.service.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/chat';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

/**
 * GET /api/study-groups
 * Get all groups user is part of
 */
router.get('/', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const userGroups = await StudyGroupsService.getUserStudyGroups(userId, orgId);

    res.json(userGroups);
  } catch (error: any) {
    console.error('Error fetching study groups:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch study groups' });
  }
});

/**
 * POST /api/study-groups
 * Create a new study group
 */
router.post('/', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { name, description, courseId, memberIds = [] } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const group = await StudyGroupsService.createStudyGroup({
      name,
      description,
      courseId,
      memberIds,
      createdBy: userId,
      organizationId: orgId,
    });

    res.status(201).json(group);
  } catch (error: any) {
    console.error('Error creating study group:', error);
    res.status(400).json({ error: error.message || 'Failed to create study group' });
  }
});

/**
 * GET /api/study-groups/:id
 * Get group details
 */
router.get('/:id', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const group = await StudyGroupsService.getStudyGroupById(id, userId, orgId);

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error: any) {
    console.error('Error fetching group details:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch group details' });
  }
});

/**
 * POST /api/study-groups/:id/members
 * Add members to group
 */
router.post('/:id/members', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { memberIds } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await StudyGroupsService.addMembersToGroup({
      groupId: id,
      memberIds,
      requestingUserId: userId,
      organizationId: orgId,
    });

    res.json({
      message: `Successfully added ${result.addedCount} member(s)`,
      ...result,
    });
  } catch (error: any) {
    console.error('Error adding members:', error);
    const statusCode = error.message.includes('required') ? 400 :
      error.message.includes('Only group admins') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to add members' });
  }
});

/**
 * DELETE /api/study-groups/:id/members/:memberId
 * Remove member
 */
router.delete('/:id/members/:memberId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, memberId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await StudyGroupsService.removeMemberFromGroup(id, memberId, userId, orgId);

    res.json({ message: 'Member removed successfully' });
  } catch (error: any) {
    console.error('Error removing member:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to remove member' });
  }
});

/**
 * POST /api/study-groups/:id/members/:memberId/promote
 * Promote member to admin
 */
router.post('/:id/members/:memberId/promote', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, memberId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await StudyGroupsService.promoteMemberToAdmin(id, memberId, userId, orgId);

    res.json({ message: 'Member promoted to admin successfully' });
  } catch (error: any) {
    console.error('Error promoting member:', error);
    const statusCode = error.message.includes('Only group creator') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to promote member' });
  }
});

/**
 * POST /api/study-groups/:id/moderate
 * Moderate group member (mute/restrict)
 */
router.post('/:id/moderate', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { targetUserId, action, duration } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await StudyGroupsService.moderateMember({
      groupId: id,
      targetUserId,
      action,
      duration,
      requestingUserId: userId,
      organizationId: orgId,
    });

    res.json({ message: 'Moderation action applied successfully' });
  } catch (error: any) {
    console.error('Error moderating member:', error);
    const statusCode = error.message.includes('Only admins') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to moderate member' });
  }
});

/**
 * POST /api/study-groups/:id/avatar
 * Upload group avatar
 */
router.post('/:id/avatar', ...requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/chat/${req.file.filename}`;

    const result = await StudyGroupsService.updateGroupAvatar(id, avatarUrl, userId, orgId);

    res.json(result);
  } catch (error: any) {
    console.error('Error uploading avatar:', error);
    const statusCode = error.message.includes('Only admins') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to upload avatar' });
  }
});

/**
 * GET /api/study-groups/conversations/:conversationId/messages
 * Get messages
 */
router.get('/conversations/:conversationId/messages', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { limit, before } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const messages = await StudyGroupsService.getConversationMessages({
      conversationId,
      userId,
      limit: limit ? Number(limit) : undefined,
      before: before as string,
      organizationId: orgId,
    });

    res.json(messages);
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch messages' });
  }
});

/**
 * POST /api/study-groups/upload
 * Upload file for chat
 */
router.post('/upload', ...requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const fileUrl = `/uploads/chat/${req.file.filename}`;

    res.json({
      fileUrl,
      fileName: req.file.originalname,
      fileSize: req.file.size.toString(),
      fileType: req.file.mimetype,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Failed to upload file' });
  }
});

/**
 * DELETE /api/study-groups/:id/messages/:messageId
 * Delete message (moderation)
 */
router.delete('/:id/messages/:messageId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { id, messageId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    await StudyGroupsService.deleteMessage(id, messageId, userId, orgId);

    res.json({ message: 'Message deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting message:', error);
    const statusCode = error.message.includes('not found') ? 404 :
      error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to delete message' });
  }
});

/**
 * GET /api/study-groups/direct/:targetUserId
 * Get or create direct conversation
 */
router.get('/direct/:targetUserId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await StudyGroupsService.getOrCreateDirectConversation(userId, targetUserId, orgId);

    res.json(result);
  } catch (error: any) {
    console.error('Error getting direct conversation:', error);
    res.status(500).json({ error: error.message || 'Failed to get conversation' });
  }
});

/**
 * POST /api/study-groups/auto-generate
 * Auto-generate study groups for all courses
 */
router.post('/auto-generate', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await StudyGroupsService.autoGenerateStudyGroups(userId, orgId);

    res.json({
      message: `Successfully created ${result.createdCount} study groups`,
      groups: result.groups,
    });
  } catch (error: any) {
    console.error('Error auto-generating groups:', error);
    const statusCode = error.message.includes('Only teachers') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to auto-generate study groups' });
  }
});

/**
 * GET /api/study-groups/presence/:userId
 * Get user presence
 */
router.get('/presence/:userId', ...requireAuth, async (req, res) => {
  try {
    const { userId } = req.params;

    const presence = await StudyGroupsService.getUserPresence(userId);

    res.json(presence);
  } catch (error) {
    console.error('Error fetching presence:', error);
    res.status(500).json({ error: 'Failed to fetch user presence' });
  }
});

/**
 * GET /api/study-groups/conversations/:conversationId/read-receipts
 * Get read receipts for conversation
 */
router.get('/conversations/:conversationId/read-receipts', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const receipts = await StudyGroupsService.getConversationReadReceipts(conversationId, userId, orgId);

    res.json(receipts);
  } catch (error: any) {
    console.error('Error fetching read receipts:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch read receipts' });
  }
});

export default router;
