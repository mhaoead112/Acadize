// server/src/api/conversations.routes.ts

import { Router } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { requireSubscription } from '../middleware/subscription.middleware.js';

// Combined auth + subscription middleware
const requireAuth = [isAuthenticated, requireSubscription];
import * as ConversationsService from '../services/conversations.service.js';
import { getPaginationParams, buildPaginatedResponse } from '../utils/pagination.js';

const router = Router();

/**
 * GET /api/conversations/direct
 * Get all direct message conversations
 */
router.get('/direct', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { limit, offset, page } = getPaginationParams(req);

    const { data, totalCount } = await ConversationsService.getDirectConversations(userId, orgId, limit, offset);

    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error fetching direct messages:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch direct messages' });
  }
});

/**
 * GET /api/conversations/:conversationId/messages
 * Get messages in a conversation
 */
router.get('/:conversationId/messages', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { limit, before } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const finalLimit = limit ? Number(limit) : 50;

    const messages = await ConversationsService.getConversationMessages({
      conversationId,
      userId,
      limit: finalLimit,
      before: before as string,
      organizationId: orgId,
    });

    // Cursor-based pagination still returns standardized structure
    res.json({
      data: messages,
      pagination: {
        limit: finalLimit,
        before: before || null,
        nextBefore: messages.length >= finalLimit ? messages[0]?.id : null // messages is reversed, so [0] is oldest in the fetched chunk?
      }
    });
  } catch (error: any) {
    console.error('Error fetching messages:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch messages' });
  }
});

/**
 * POST /api/conversations/:conversationId/messages
 * Send a message
 */
router.post('/:conversationId/messages', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { type, content, fileUrl, fileName, fileSize, fileType } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const message = await ConversationsService.sendMessage({
      conversationId,
      senderId: userId,
      type,
      content,
      fileUrl,
      fileName,
      fileSize,
      fileType,
      organizationId: orgId,
    });

    res.status(201).json(message);
  } catch (error: any) {
    console.error('Error sending message:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to send message' });
  }
});

/**
 * POST /api/conversations/:conversationId/typing
 * Send typing indicator
 */
router.post('/:conversationId/typing', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const { isTyping } = req.body;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await ConversationsService.sendTypingIndicator(
      conversationId,
      userId,
      isTyping,
      orgId
    );

    res.json(result);
  } catch (error: any) {
    console.error('Error sending typing indicator:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to send typing indicator' });
  }
});

/**
 * POST /api/conversations/:conversationId/read
 * Mark messages as read
 */
router.post('/:conversationId/read', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await ConversationsService.markMessagesAsRead(conversationId, userId, orgId);

    res.json({ message: 'Messages marked as read', count: result.count });
  } catch (error: any) {
    console.error('Error marking messages as read:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to mark messages as read' });
  }
});

/**
 * GET /api/conversations/search
 * Search conversations and users
 */
router.get('/search', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { query } = req.query;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { limit, offset, page } = getPaginationParams(req);

    const { data, totalCount } = await ConversationsService.searchUsers(userId, query as string, orgId, limit, offset);

    res.json(buildPaginatedResponse(data, totalCount, page, limit));
  } catch (error: any) {
    console.error('Error searching:', error);
    res.status(500).json({ error: error.message || 'Failed to search' });
  }
});

/**
 * POST /api/conversations/direct/:targetUserId
 * Create or get direct conversation
 */
router.post('/direct/:targetUserId', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { targetUserId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const result = await ConversationsService.getOrCreateDirectConversation(
      userId,
      targetUserId,
      orgId
    );

    const statusCode = result.conversationId ? 200 : 201;
    res.status(statusCode).json(result);
  } catch (error: any) {
    console.error('Error creating/getting direct conversation:', error);
    const statusCode = error.message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to create conversation' });
  }
});

/**
 * GET /api/conversations/:conversationId/participants
 * Get conversation participants
 */
router.get('/:conversationId/participants', ...requireAuth, async (req, res) => {
  try {
    const userId = req.user!.id;
    const { conversationId } = req.params;
    const orgId = (req as any).tenant?.organizationId;

    if (!orgId) {
      return res.status(400).json({ error: 'Organization context required' });
    }

    const { limit, offset, page } = getPaginationParams(req);

    const participants = await ConversationsService.getConversationParticipants(
      conversationId,
      userId,
      orgId
    );
    
    // Pagination for participants (usually small, but for consistency)
    const paginatedData = participants.slice(offset, offset + limit);

    res.json(buildPaginatedResponse(paginatedData, participants.length, page, limit));
  } catch (error: any) {
    console.error('Error fetching participants:', error);
    const statusCode = error.message.includes('Not authorized') ? 403 : 500;
    res.status(statusCode).json({ error: error.message || 'Failed to fetch participants' });
  }
});

export default router;
