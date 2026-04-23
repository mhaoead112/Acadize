/**
 * Base Repository
 * Provides organization-scoped query helpers for multi-tenant data access
 */

import { db } from '../db/index.js';
import {
    PgTable,
    TableConfig,
} from 'drizzle-orm/pg-core';
import { eq, and, SQL } from 'drizzle-orm';

type OrgScopedTable = PgTable<TableConfig> & {
    organizationId: any; // Column type
};

/**
 * Create organization-scoped query conditions
 */
export function scopeToOrganization<T extends OrgScopedTable>(
    table: T,
    organizationId: string,
    additionalConditions?: SQL
): SQL {
    const orgCondition = eq(table.organizationId, organizationId);

    if (additionalConditions) {
        return and(orgCondition, additionalConditions)!;
    }

    return orgCondition;
}

/**
 * Base Repository class with organization-scoped methods
 */
export class BaseRepository<T extends OrgScopedTable> {
    constructor(
        protected table: T,
        protected organizationId: string
    ) { }

    /**
     * Add organization scope to any query condition
     */
    protected scoped(condition?: SQL): SQL {
        return scopeToOrganization(this.table, this.organizationId, condition);
    }

    /**
     * Find all records in the organization
     */
    async findAll() {
        return db
            .select()
            .from(this.table as any)
            .where(this.scoped());
    }

    /**
     * Find one record by ID within the organization
     */
    async findById(id: string, idColumn: any) {
        const [result] = await db
            .select()
            .from(this.table as any)
            .where(this.scoped(eq(idColumn, id)))
            .limit(1);

        return result || null;
    }
}

/**
 * Example usage:
 * 
 * const courseRepo = new BaseRepository(courses, req.tenant!.organizationId);
 * const allCourses = await courseRepo.findAll();
 * 
 * Or use the helper:
 * 
 * const scopedCourses = await db
 *   .select()
 *   .from(courses)
 *   .where(scopeToOrganization(courses, organizationId, eq(courses.isPublished, true)));
 */
