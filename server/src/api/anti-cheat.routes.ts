import express, { Request, Response, Router } from 'express';
import { isAuthenticated, isStudent } from '../middleware/auth.middleware.js';
import { antiCheatRateLimit } from '../middleware/rate-limit.js';
import AntiCheatMonitorService, { AntiCheatEventPayload } from '../services/anti-cheat-monitor.service.js';

const router: Router = express.Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const VALID_EVENT_TYPES = [
  'tab_switch',
  'window_blur',
  'copy_paste',
  'right_click',
  'keyboard_shortcut',
  'devtools_open',
  'fullscreen_exit',
  'multiple_monitors',
  'face_not_detected',
  'multiple_faces',
  'no_face_visible',
  'looking_away',
  'proctoring_started',
  'proctoring_stopped',
  'unauthorized_app',
  'suspicious_pattern',
  'rapid_answers',
  'unusual_timing',
  'browser_extension_detected',
  'screen_share_detected',
];

function validateEventPayload(body: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!body.attemptId || typeof body.attemptId !== 'string') {
    errors.push('attemptId is required and must be a string');
  }

  if (!body.eventType || !VALID_EVENT_TYPES.includes(body.eventType)) {
    errors.push(`eventType must be one of: ${VALID_EVENT_TYPES.join(', ')}`);
  }

  if (!body.timestamp) {
    errors.push('timestamp is required');
  } else {
    const timestamp = new Date(body.timestamp);
    if (isNaN(timestamp.getTime())) {
      errors.push('timestamp must be a valid ISO 8601 date string');
    }
  }

  // Optional fields validation
  if (body.questionId && typeof body.questionId !== 'string') {
    errors.push('questionId must be a string');
  }

  if (body.metadata && typeof body.metadata !== 'object') {
    errors.push('metadata must be an object');
  }

  if (body.deviceInfo && typeof body.deviceInfo !== 'object') {
    errors.push('deviceInfo must be an object');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// ============================================================================
// ROUTES
// ============================================================================

/**
 * POST /api/anti-cheat/events
 * Record a single anti-cheat event
 * 
 * Rate Limited: 100 events per minute per attempt
 * Requires: Authentication, Student role
 */
router.post(
  '/events',
  isAuthenticated,
  isStudent,
  antiCheatRateLimit(),
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;
      const clientIp = req.ip || req.socket.remoteAddress;

      // Validate payload
      const validation = validateEventPayload(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          error: 'Invalid event payload',
          details: validation.errors,
        });
      }

      // Construct event payload
      const payload: AntiCheatEventPayload = {
        attemptId: req.body.attemptId,
        eventType: req.body.eventType,
        timestamp: new Date(req.body.timestamp),
        questionId: req.body.questionId,
        metadata: req.body.metadata,
        deviceInfo: req.body.deviceInfo,
        signature: req.body.signature,
      };

      // Record event
      const result = await AntiCheatMonitorService.recordEvent(
        studentId,
        payload,
        clientIp
      );

      // Return minimal response to avoid leaking detection logic
      res.status(201).json({
        eventId: result.eventId,
        recorded: true,
      });

    } catch (error: any) {
      console.error('[ANTI-CHEAT API] Error recording event:', error);

      if (error.message.includes('Rate limit exceeded')) {
        return res.status(429).json({
          error: 'Rate limit exceeded',
          message: error.message,
        });
      }

      if (error.message.includes('not found') || error.message.includes('access denied')) {
        return res.status(404).json({
          error: 'Exam attempt not found or access denied',
        });
      }

      if (error.message.includes('not in progress')) {
        return res.status(400).json({
          error: 'Cannot record events for completed attempts',
        });
      }

      res.status(500).json({
        error: 'Failed to record anti-cheat event',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * POST /api/anti-cheat/events/batch
 * Record multiple anti-cheat events (for reconnection scenarios)
 * 
 * Rate Limited: Same as single event endpoint
 * Requires: Authentication, Student role
 */
router.post(
  '/events/batch',
  isAuthenticated,
  isStudent,
  antiCheatRateLimit(),
  async (req: Request, res: Response) => {
    try {
      const studentId = (req as any).user.id;
      const clientIp = req.ip || req.socket.remoteAddress;

      // Validate array
      if (!Array.isArray(req.body.events)) {
        return res.status(400).json({
          error: 'events must be an array',
        });
      }

      // Limit batch size
      if (req.body.events.length > 50) {
        return res.status(400).json({
          error: 'Batch size cannot exceed 50 events',
        });
      }

      // Validate each event
      const validationErrors: string[] = [];
      req.body.events.forEach((event: any, index: number) => {
        const validation = validateEventPayload(event);
        if (!validation.valid) {
          validationErrors.push(`Event ${index}: ${validation.errors.join(', ')}`);
        }
      });

      if (validationErrors.length > 0) {
        return res.status(400).json({
          error: 'Invalid event payloads',
          details: validationErrors,
        });
      }

      // Construct event payloads
      const payloads: AntiCheatEventPayload[] = req.body.events.map((event: any) => ({
        attemptId: event.attemptId,
        eventType: event.eventType,
        timestamp: new Date(event.timestamp),
        questionId: event.questionId,
        metadata: event.metadata,
        deviceInfo: event.deviceInfo,
        signature: event.signature,
      }));

      // Record events
      const result = await AntiCheatMonitorService.recordBatchEvents(
        studentId,
        payloads,
        clientIp
      );

      res.status(201).json({
        recorded: result.recorded,
        failed: result.failed,
        total: req.body.events.length,
      });

    } catch (error: any) {
      console.error('[ANTI-CHEAT API] Error recording batch events:', error);

      res.status(500).json({
        error: 'Failed to record batch events',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/anti-cheat/events/:attemptId
 * Get anti-cheat events for an attempt (admin/teacher only)
 * 
 * Requires: Authentication, Teacher/Admin role
 */
router.get(
  '/events/:attemptId',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { attemptId } = req.params;
      const user = (req as any).user;

      // Only teachers, admins, and proctors can view events
      if (!['teacher', 'admin', 'proctor'].includes(user.role)) {
        return res.status(403).json({
          error: 'Access denied. Insufficient permissions.',
        });
      }

      const limit = parseInt(req.query.limit as string) || 50;

      const events = await AntiCheatMonitorService.getRecentEvents(attemptId, limit);

      res.json({
        attemptId,
        events,
        total: events.length,
      });

    } catch (error: any) {
      console.error('[ANTI-CHEAT API] Error fetching events:', error);

      res.status(500).json({
        error: 'Failed to fetch anti-cheat events',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/anti-cheat/statistics/:attemptId
 * Get anti-cheat statistics for an attempt (admin/teacher only)
 * 
 * Requires: Authentication, Teacher/Admin role
 */
router.get(
  '/statistics/:attemptId',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { attemptId } = req.params;
      const user = (req as any).user;

      // Only teachers, admins, and proctors can view statistics
      if (!['teacher', 'admin', 'proctor'].includes(user.role)) {
        return res.status(403).json({
          error: 'Access denied. Insufficient permissions.',
        });
      }

      const stats = await AntiCheatMonitorService.getEventStatistics(attemptId);

      res.json({
        attemptId,
        statistics: stats,
      });

    } catch (error: any) {
      console.error('[ANTI-CHEAT API] Error fetching statistics:', error);

      res.status(500).json({
        error: 'Failed to fetch anti-cheat statistics',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/anti-cheat/integrity/:attemptId
 * Verify exam integrity (admin/teacher only)
 * 
 * Requires: Authentication, Teacher/Admin role
 */
router.get(
  '/integrity/:attemptId',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      const { attemptId } = req.params;
      const user = (req as any).user;

      // Only teachers, admins, and proctors can verify integrity
      if (!['teacher', 'admin', 'proctor'].includes(user.role)) {
        return res.status(403).json({
          error: 'Access denied. Insufficient permissions.',
        });
      }

      const integrity = await AntiCheatMonitorService.verifyExamIntegrity(attemptId);

      res.json({
        attemptId,
        integrity,
      });

    } catch (error: any) {
      console.error('[ANTI-CHEAT API] Error verifying integrity:', error);

      res.status(500).json({
        error: 'Failed to verify exam integrity',
        message: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }
  }
);

/**
 * GET /api/anti-cheat/hmac-secret
 * Get HMAC secret for frontend integration (DEV ONLY)
 * 
 * This endpoint should NEVER be exposed in production
 * Used only for development/testing purposes
 */
router.get(
  '/hmac-secret',
  isAuthenticated,
  async (req: Request, res: Response) => {
    try {
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          error: 'HMAC secret cannot be exposed in production',
        });
      }

      const secret = AntiCheatMonitorService.getHMACSecret();

      res.json({
        secret,
        warning: 'This endpoint is for development only and will not work in production',
      });

    } catch (error: any) {
      res.status(403).json({
        error: error.message,
      });
    }
  }
);

export default router;
