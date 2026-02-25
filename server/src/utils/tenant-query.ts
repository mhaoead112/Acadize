/**
 * Tenant-Scoped Query Helpers
 * 
 * Utility functions that enforce organizationId filtering on all database queries.
 * Use these to prevent cross-tenant data leaks.
 */

/**
 * Validates that an organizationId is present and returns it.
 * Throws if missing — never silently skips tenant filtering.
 */
export function requireTenantId(orgId: string | undefined | null): string {
    if (!orgId) {
        throw new Error('organizationId is required for tenant-scoped operations. This is a security violation.');
    }
    return orgId;
}
