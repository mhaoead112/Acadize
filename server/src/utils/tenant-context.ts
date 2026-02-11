/**
 * Tenant Context Manager
 * Handles setting and clearing tenant context for RLS
 */

import { db } from '../db/index.js';
import { sql } from 'drizzle-orm';

/**
 * Set the current tenant context for RLS policies
 * Must be called before any tenant-scoped queries
 */
export async function setTenantContext(organizationId: string): Promise<void> {
    await db.execute(sql`SELECT set_config('app.current_organization_id', ${organizationId}, false)`);
}

/**
 * Clear the current tenant context
 * Should be called after request completes
 */
export async function clearTenantContext(): Promise<void> {
    await db.execute(sql`SELECT set_config('app.current_organization_id', '', false)`);
}

/**
 * Get the current tenant context
 */
export async function getTenantContext(): Promise<string | null> {
    const result = await db.execute(sql`SELECT current_setting('app.current_organization_id', true)`);
    const rows = result as unknown as { current_setting: string }[];
    return rows[0]?.current_setting || null;
}

/**
 * Execute a function within a tenant context
 * Automatically sets and clears the context
 */
export async function withTenantContext<T>(
    organizationId: string,
    fn: () => Promise<T>
): Promise<T> {
    try {
        await setTenantContext(organizationId);
        return await fn();
    } finally {
        await clearTenantContext();
    }
}
