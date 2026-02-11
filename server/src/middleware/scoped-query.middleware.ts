/**
 * Scoped Query Middleware
 * Automatically sets tenant context before each request
 * and clears it after the response
 */

import { Request, Response, NextFunction } from 'express';
import { setTenantContext, clearTenantContext } from '../utils/tenant-context.js';

/**
 * Middleware to set RLS tenant context from req.tenant
 * Must be used AFTER tenantMiddleware and AFTER auth middleware
 */
export const scopedQueryMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Skip if no tenant context
    if (!req.tenant) {
        return next();
    }

    try {
        // Set the tenant context for RLS policies
        await setTenantContext(req.tenant.organizationId);

        // Clear context when response finishes
        res.on('finish', async () => {
            try {
                await clearTenantContext();
            } catch (error) {
                console.error('[ScopedQueryMiddleware] Error clearing tenant context:', error);
            }
        });

        next();
    } catch (error) {
        console.error('[ScopedQueryMiddleware] Error setting tenant context:', error);
        next(error);
    }
};
