import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';
import { logger } from '../utils/logger.js';

export interface AuditLogEntry {
    organizationId: string;
    actorId: string;
    action: string;
    targetId?: string;
    targetType?: string;
    metadata?: Record<string, any>;
}

export class AuditService {
    /**
     * Logs an admin action to the audit_logs table
     */
    static async logAction(entry: AuditLogEntry): Promise<void> {
        try {
            await db.insert(auditLogs).values({
                organizationId: entry.organizationId,
                actorId: entry.actorId,
                action: entry.action,
                targetId: entry.targetId ?? null,
                targetType: entry.targetType ?? null,
                metadata: entry.metadata ?? null,
            });
            logger.info(`[Audit] Action logged: ${entry.action} by ${entry.actorId}`);
        } catch (error) {
            logger.error('[Audit] Failed to log action', { error: String(error), entry });
        }
    }
}
