import { db } from '../db/index.js';
import { antiCheatEvents, examAttempts, exams } from '../db/schema.js';
import { eq, and, gte, count, desc } from 'drizzle-orm';
import crypto from 'crypto';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type AntiCheatEventType =
  | 'tab_switch'
  | 'window_blur'
  | 'copy_paste'
  | 'right_click'
  | 'keyboard_shortcut'
  | 'devtools_open'
  | 'fullscreen_exit'
  | 'multiple_monitors'
  | 'face_not_detected'
  | 'multiple_faces'
  | 'no_face_visible'
  | 'unauthorized_app'
  | 'suspicious_pattern'
  | 'rapid_answers'
  | 'unusual_timing'
  | 'browser_extension_detected'
  | 'screen_share_detected';

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AntiCheatEventPayload {
  attemptId: string;
  eventType: AntiCheatEventType;
  timestamp: Date; // Client timestamp
  questionId?: string;
  metadata?: Record<string, any>;
  deviceInfo?: {
    userAgent?: string;
    screenResolution?: string;
    browser?: string;
    browserVersion?: string;
    os?: string;
    viewportSize?: string;
    timezone?: string;
  };
  // Security: HMAC signature to prevent tampering
  signature?: string;
}

export interface EventValidationResult {
  isValid: boolean;
  errors: string[];
  severity: EventSeverity;
}

// ============================================================================
// CONSTANTS
// ============================================================================

// Event severity mapping
const EVENT_SEVERITY_MAP: Record<AntiCheatEventType, EventSeverity> = {
  tab_switch: 'low',
  window_blur: 'low',
  copy_paste: 'medium',
  right_click: 'low',
  keyboard_shortcut: 'medium',
  devtools_open: 'critical',
  fullscreen_exit: 'high',
  multiple_monitors: 'high',
  face_not_detected: 'critical',
  multiple_faces: 'critical',
  no_face_visible: 'critical',
  unauthorized_app: 'high',
  suspicious_pattern: 'medium',
  rapid_answers: 'medium',
  unusual_timing: 'medium',
  browser_extension_detected: 'high',
  screen_share_detected: 'critical',
};

// Rate limiting thresholds (events per minute)
const RATE_LIMIT_THRESHOLDS: Record<EventSeverity, number> = {
  low: 60,       // 1 per second
  medium: 30,    // 1 per 2 seconds
  high: 10,      // 1 per 6 seconds
  critical: 5,   // 1 per 12 seconds
};

// Maximum allowed timestamp drift (client vs server)
const MAX_TIMESTAMP_DRIFT_MS = 60000; // 1 minute

// Secret key for HMAC (should be in environment variables)
const HMAC_SECRET = process.env.ANTI_CHEAT_HMAC_SECRET || 'default-secret-change-in-production';

// ============================================================================
// SERVICE CLASS
// ============================================================================

export class AntiCheatMonitorService {

  /**
   * Record anti-cheat event with validation and tamper resistance
   */
  static async recordEvent(
    studentId: string,
    payload: AntiCheatEventPayload,
    clientIp?: string
  ): Promise<{ eventId: string; severity: EventSeverity }> {

    // Step 1: Validate attempt exists and belongs to student
    const [attempt] = await db
      .select()
      .from(examAttempts)
      .where(
        and(
          eq(examAttempts.id, payload.attemptId),
          eq(examAttempts.studentId, studentId)
        )
      )
      .limit(1);

    if (!attempt) {
      throw new Error('Exam attempt not found or access denied.');
    }

    // Step 2: Validate attempt is in progress
    if (attempt.status !== 'in_progress') {
      throw new Error('Cannot record events for attempts not in progress.');
    }

    // Fetch exam details separately
    const [exam] = await db
      .select()
      .from(exams)
      .where(eq(exams.id, attempt.examId))
      .limit(1);

    // Step 3: Validate event authenticity
    const validation = this.validateEvent(payload, attempt, exam);
    if (!validation.isValid) {
      console.warn('[ANTI-CHEAT] Invalid event detected:', validation.errors);
      // Still record but mark as potentially spoofed
      payload.metadata = {
        ...payload.metadata,
        validationErrors: validation.errors,
        potentiallySpoofed: true,
      };
    }

    // Step 4: Check rate limiting
    const severity = validation.severity;
    await this.enforceRateLimit(payload.attemptId, severity);

    // Step 5: Determine detection source
    const detectedBy = this.determineDetectionSource(payload.eventType);

    // Step 6: Generate description
    const description = this.generateEventDescription(payload.eventType, payload.metadata);

    // Step 7: Enrich metadata with server-side data
    const enrichedMetadata = {
      ...payload.metadata,
      clientTimestamp: payload.timestamp.toISOString(),
      serverTimestamp: new Date().toISOString(),
      clientIp,
      timeDrift: Date.now() - payload.timestamp.getTime(),
      signatureVerified: !!payload.signature,
    };

    // Step 8: Store event
    const [event] = await db.insert(antiCheatEvents).values({
      attemptId: payload.attemptId,
      eventType: payload.eventType,
      severity: severity,
      description,
      metadata: enrichedMetadata,
      detectedBy,
      timestamp: new Date(), // Use server time
      questionId: payload.questionId || null,
      deviceInfo: payload.deviceInfo || null,
      reviewStatus: 'pending',
    } as any).returning();

    console.log(`[ANTI-CHEAT] Event recorded: ${event.id}, type: ${payload.eventType}, severity: ${severity}`);

    // Step 9: Update attempt violation count (denormalized for performance)
    await db.update(examAttempts)
      .set({
        totalViolations: (attempt.totalViolations || 0) + 1,
      })
      .where(eq(examAttempts.id, payload.attemptId));

    // Step 10: Trigger real-time alerts for critical events
    if (severity === 'critical') {
      await this.triggerCriticalAlert(event.id, payload.attemptId, payload.eventType);
    }

    return {
      eventId: event.id,
      severity,
    };
  }

  /**
   * Validate event authenticity and detect spoofing attempts
   */
  private static validateEvent(
    payload: AntiCheatEventPayload,
    attempt: any,
    exam: any
  ): EventValidationResult {
    const errors: string[] = [];

    // Validation 1: Timestamp drift check
    const timeDrift = Math.abs(Date.now() - payload.timestamp.getTime());
    if (timeDrift > MAX_TIMESTAMP_DRIFT_MS) {
      errors.push(`Timestamp drift too large: ${timeDrift}ms`);
    }

    // Validation 2: Timestamp must be after attempt start
    if (payload.timestamp < new Date(attempt.startedAt)) {
      errors.push('Event timestamp is before attempt start time');
    }

    // Validation 3: Event type must be valid
    const severity = EVENT_SEVERITY_MAP[payload.eventType];
    if (!severity) {
      errors.push(`Invalid event type: ${payload.eventType}`);
      return { isValid: false, errors, severity: 'low' };
    }

    // Validation 4: HMAC signature verification (if provided)
    if (payload.signature) {
      const isValidSignature = this.verifyHMAC(payload, payload.signature);
      if (!isValidSignature) {
        errors.push('HMAC signature verification failed');
      }
    } else {
      // Signature should always be present in production
      if (process.env.NODE_ENV === 'production') {
        errors.push('HMAC signature missing');
      }
    }

    // Validation 5: AI proctoring events must have confidence score
    if (['face_not_detected', 'multiple_faces', 'no_face_visible'].includes(payload.eventType)) {
      if (!payload.metadata?.aiConfidence) {
        errors.push('AI proctoring events must include confidence score');
      }
    }

    // Validation 6: Device info consistency check
    if (payload.deviceInfo && attempt.deviceFingerprint) {
      const storedFingerprint = attempt.deviceFingerprint as any;
      if (payload.deviceInfo.userAgent !== storedFingerprint.userAgent) {
        errors.push('Device fingerprint mismatch detected');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      severity,
    };
  }

  /**
   * Generate HMAC signature for event payload
   * (Used by frontend to sign events)
   */
  static generateHMAC(payload: Omit<AntiCheatEventPayload, 'signature'>): string {
    const data = JSON.stringify({
      attemptId: payload.attemptId,
      eventType: payload.eventType,
      timestamp: payload.timestamp.toISOString(),
      questionId: payload.questionId,
    });

    return crypto
      .createHmac('sha256', HMAC_SECRET)
      .update(data)
      .digest('hex');
  }

  /**
   * Verify HMAC signature
   */
  private static verifyHMAC(payload: AntiCheatEventPayload, signature: string): boolean {
    const expected = this.generateHMAC(payload);
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  }

  /**
   * Enforce rate limiting per attempt per severity
   */
  private static async enforceRateLimit(attemptId: string, severity: EventSeverity): Promise<void> {
    const oneMinuteAgo = new Date(Date.now() - 60000);

    const [result] = await db
      .select({ count: count() })
      .from(antiCheatEvents)
      .where(
        and(
          eq(antiCheatEvents.attemptId, attemptId),
          eq(antiCheatEvents.severity, severity as any),
          gte(antiCheatEvents.timestamp, oneMinuteAgo)
        )
      );

    const eventCount = result?.count || 0;
    const threshold = RATE_LIMIT_THRESHOLDS[severity];

    if (eventCount >= threshold) {
      throw new Error(
        `Rate limit exceeded for ${severity} severity events. ` +
        `Limit: ${threshold}/min, Current: ${eventCount}/min`
      );
    }
  }

  /**
   * Determine detection source based on event type
   */
  private static determineDetectionSource(eventType: AntiCheatEventType): string {
    if (['face_not_detected', 'multiple_faces', 'no_face_visible'].includes(eventType)) {
      return 'ai_model';
    }
    if (['unauthorized_app', 'screen_share_detected'].includes(eventType)) {
      return 'proctor';
    }
    return 'browser_monitor';
  }

  /**
   * Generate human-readable event description
   */
  private static generateEventDescription(
    eventType: AntiCheatEventType,
    metadata?: Record<string, any>
  ): string {
    const descriptions: Record<AntiCheatEventType, string> = {
      tab_switch: 'Student switched browser tabs',
      window_blur: 'Student switched away from exam window',
      copy_paste: 'Copy/paste action detected',
      right_click: 'Right-click menu accessed',
      keyboard_shortcut: 'Suspicious keyboard shortcut detected',
      devtools_open: 'Browser developer tools opened',
      fullscreen_exit: 'Student exited fullscreen mode',
      multiple_monitors: 'Multiple monitors detected',
      face_not_detected: 'Student face not detected by webcam',
      multiple_faces: 'Multiple faces detected in webcam feed',
      no_face_visible: 'No face visible in webcam feed',
      unauthorized_app: 'Unauthorized application detected',
      suspicious_pattern: 'Suspicious behavioral pattern detected',
      rapid_answers: 'Rapid answer submission detected',
      unusual_timing: 'Unusual timing pattern detected',
      browser_extension_detected: 'Suspicious browser extension detected',
      screen_share_detected: 'Screen sharing activity detected',
    };

    let description = descriptions[eventType] || `Unknown event: ${eventType}`;

    // Append metadata details
    if (metadata?.details) {
      description += ` (${metadata.details})`;
    }

    return description;
  }

  /**
   * Trigger real-time alert for critical events
   */
  private static async triggerCriticalAlert(
    eventId: string,
    attemptId: string,
    eventType: AntiCheatEventType
  ): Promise<void> {
    console.warn(`[CRITICAL ALERT] Event ${eventId} on attempt ${attemptId}: ${eventType}`);

    try {
      // Get attempt details to find the teacher
      const { db } = await import('../db/index.js');
      const { examAttempts, exams, users, courses } = await import('../db/schema.js');
      const { eq } = await import('drizzle-orm');
      const { WebSocketService } = await import('./websocket.service.js');

      const [attemptData] = await db
        .select({
          attemptId: examAttempts.id,
          studentId: examAttempts.studentId,
          studentName: users.fullName,
          examTitle: exams.title,
          teacherId: courses.teacherId,
        })
        .from(examAttempts)
        .innerJoin(exams, eq(examAttempts.examId, exams.id))
        .innerJoin(courses, eq(exams.courseId, courses.id))
        .innerJoin(users, eq(examAttempts.studentId, users.id))
        .where(eq(examAttempts.id, attemptId))
        .limit(1);

      if (attemptData) {
        // Send real-time notification to teacher
        WebSocketService.sendToUser(attemptData.teacherId, {
          type: 'ANTI_CHEAT_ALERT',
          severity: 'critical',
          eventId,
          attemptId,
          studentId: attemptData.studentId,
          studentName: attemptData.studentName,
          examTitle: attemptData.examTitle,
          eventType,
          timestamp: new Date().toISOString(),
        });

        console.log(`[WebSocket] Critical alert sent to teacher: ${attemptData.teacherId}`);
      }
    } catch (error) {
      console.error('[WebSocket] Failed to send critical alert:', error);
    }
  }

  /**
   * Batch record multiple events (for reconnection scenarios)
   */
  static async recordBatchEvents(
    studentId: string,
    events: AntiCheatEventPayload[],
    clientIp?: string
  ): Promise<{ recorded: number; failed: number }> {
    let recorded = 0;
    let failed = 0;

    // Process sequentially to maintain order and respect rate limits
    for (const event of events) {
      try {
        await this.recordEvent(studentId, event, clientIp);
        recorded++;
      } catch (error) {
        console.error('[ANTI-CHEAT] Batch event failed:', error);
        failed++;
      }
    }

    console.log(`[ANTI-CHEAT] Batch recording complete: ${recorded} recorded, ${failed} failed`);

    return { recorded, failed };
  }

  /**
   * Get recent events for an attempt (for dashboard/monitoring)
   */
  static async getRecentEvents(
    attemptId: string,
    limit: number = 50
  ): Promise<any[]> {
    const events = await db.query.antiCheatEvents.findMany({
      where: eq(antiCheatEvents.attemptId, attemptId),
      orderBy: [desc(antiCheatEvents.timestamp)],
      limit,
    });

    return events;
  }

  /**
   * Get event statistics for an attempt
   */
  static async getEventStatistics(attemptId: string): Promise<{
    totalEvents: number;
    bySeverity: Record<EventSeverity, number>;
    byType: Record<string, number>;
    criticalEvents: number;
  }> {
    const events = await db.query.antiCheatEvents.findMany({
      where: eq(antiCheatEvents.attemptId, attemptId),
    });

    const stats = {
      totalEvents: events.length,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<EventSeverity, number>,
      byType: {} as Record<string, number>,
      criticalEvents: 0,
    };

    events.forEach((event) => {
      // Count by severity
      stats.bySeverity[event.severity as EventSeverity]++;

      // Count by type
      stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1;

      // Count critical
      if (event.severity === 'critical') {
        stats.criticalEvents++;
      }
    });

    return stats;
  }

  /**
   * Verify exam integrity after submission
   * Returns true if exam appears to have been taken honestly
   */
  static async verifyExamIntegrity(attemptId: string): Promise<{
    isIntegrityMaintained: boolean;
    riskScore: number;
    violations: number;
    criticalViolations: number;
    recommendation: 'accept' | 'manual_review' | 'reject';
  }> {
    const stats = await this.getEventStatistics(attemptId);

    // Calculate risk score (0-100)
    const riskScore = Math.min(
      100,
      stats.bySeverity.low * 1 +
      stats.bySeverity.medium * 5 +
      stats.bySeverity.high * 15 +
      stats.bySeverity.critical * 30
    );

    // Determine recommendation
    let recommendation: 'accept' | 'manual_review' | 'reject';
    if (riskScore >= 75 || stats.criticalEvents > 0) {
      recommendation = 'reject';
    } else if (riskScore >= 50 || stats.bySeverity.high > 2) {
      recommendation = 'manual_review';
    } else {
      recommendation = 'accept';
    }

    return {
      isIntegrityMaintained: riskScore < 25,
      riskScore,
      violations: stats.totalEvents,
      criticalViolations: stats.criticalEvents,
      recommendation,
    };
  }

  /**
   * Get HMAC secret for frontend integration
   * (Only expose in dev mode, never in production)
   */
  static getHMACSecret(): string {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('HMAC secret cannot be exposed in production');
    }
    return HMAC_SECRET;
  }
}

export default AntiCheatMonitorService;
