import { db } from './index.js';
import { sql } from 'drizzle-orm';

/**
 * Executes a Drizzle query or transaction with Row-Level Security (RLS)
 * enforced for the specific tenant.
 * 
 * @param tenantId The organization ID (e.g. req.tenant.organizationId)
 * @param callback The Drizzle operations to perform securely
 */
export async function withTenantRLS<T>(tenantId: string, callback: (tx: typeof db) => Promise<T>): Promise<T> {
    return db.transaction(async (tx) => {
        // Set the Postgres session variable for RLS policies
        // true = is_local (applied entirely to current transaction only)
        await tx.execute(sql`SELECT set_config('app.current_tenant_id', ${tenantId}, true)`);
        
        // Execute the user operations
        return await callback(tx as any);
    });
}
