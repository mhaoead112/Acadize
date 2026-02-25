/**
 * Tenant Middleware - Multi-tenant organization resolution
 * Resolves the organization from subdomain or custom domain
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { organizations } from "../db/schema.js";
import { eq, or } from "drizzle-orm";

// Tenant context attached to each request
export interface TenantContext {
    organizationId: string;
    subdomain: string;
    name: string;
    plan: 'free' | 'starter' | 'professional' | 'enterprise';
    config: Record<string, unknown>;
    branding: {
        logoUrl: string | null;
        primaryColor: string;
        secondaryColor: string;
    };
    /** i18n: default locale for this org (e.g. 'en') */
    defaultLocale: string;
    /** i18n: list of enabled locale codes (e.g. ['en', 'ar']) */
    enabledLocales: string[];
}

// Extend Express Request to include tenant context
declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
        }
    }
}

// Cache for tenant lookups (simple in-memory, replace with Redis in production)
const tenantCache = new Map<string, { data: TenantContext; expires: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Extract subdomain from hostname
 * Examples:
 *   "school1.acadize.com" -> "school1"
 *   "school1.localhost:3000" -> "school1"
 *   "localhost:3000" -> "default"
 */
function extractSubdomain(hostname: string): string {
    // Remove port if present
    const host = hostname.split(':')[0];

    // Handle localhost or IP addresses
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        // Check for subdomain header in development
        return 'default';
    }

    // Split hostname and get first part as subdomain
    const parts = host.split('.');

    // If only 2 parts (e.g., acadize.com), it's the main domain
    if (parts.length <= 2) {
        return 'default';
    }

    // Return the subdomain (first part)
    return parts[0];
}

/**
 * Lookup organization by subdomain or custom domain
 */
async function lookupOrganization(subdomain: string, hostname: string): Promise<TenantContext | null> {
    // Check cache first
    const cacheKey = subdomain;
    const cached = tenantCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
        return cached.data;
    }

    try {
        // Query database for organization
        const [org] = await db
            .select()
            .from(organizations)
            .where(
                or(
                    eq(organizations.subdomain, subdomain),
                    eq(organizations.customDomain, hostname)
                )
            )
            .limit(1);

        if (!org || !org.isActive) {
            return null;
        }

        const enabledLocales = Array.isArray(org.enabledLocales) ? org.enabledLocales : ['en'];
        const tenant: TenantContext = {
            organizationId: org.id,
            subdomain: org.subdomain,
            name: org.name,
            plan: org.plan,
            config: (org.config as Record<string, unknown>) || {},
            branding: {
                logoUrl: org.logoUrl,
                primaryColor: org.primaryColor || '#6366f1',
                secondaryColor: org.secondaryColor || '#8b5cf6',
            },
            defaultLocale: org.defaultLocale ?? 'en',
            enabledLocales,
        };

        // Cache the result
        tenantCache.set(cacheKey, {
            data: tenant,
            expires: Date.now() + CACHE_TTL,
        });

        return tenant;
    } catch (error) {
        console.error('[TenantMiddleware] Error looking up organization:', error);
        return null;
    }
}

/**
 * Main tenant resolution middleware
 * Must be added early in the middleware chain
 */
export const tenantMiddleware = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Allow development override via header
    const devSubdomain = req.headers['x-tenant-subdomain'] as string;
    const hostname = req.headers.host || req.hostname || 'localhost';

    // Also check Origin or Referer headers for subdomain (useful when frontend is on different host)
    let originSubdomain: string | undefined;
    const origin = req.headers.origin as string;
    const referer = req.headers.referer as string;

    if (origin) {
        try {
            const originUrl = new URL(origin);
            originSubdomain = extractSubdomain(originUrl.hostname);
        } catch { }
    } else if (referer) {
        try {
            const refererUrl = new URL(referer);
            originSubdomain = extractSubdomain(refererUrl.hostname);
        } catch { }
    }

    // Determine subdomain: explicit header > origin/referer > host header
    const subdomain = devSubdomain || originSubdomain || extractSubdomain(hostname);

    console.log('[TenantMiddleware] Resolved subdomain:', subdomain, { devSubdomain, originSubdomain, hostname });

    // Skip tenant resolution for certain paths (health checks, registration, etc.)
    // Note: req.path doesn't include /api when middleware is mounted at /api
    if (req.path === '/health' ||
        req.path === '/api/health' ||
        req.path.startsWith('/registration/')) {
        return next();
    }

    // Lookup organization
    const tenant = await lookupOrganization(subdomain, hostname);

    if (!tenant) {
        // For API requests, return JSON error
        if (req.path.startsWith('/api/')) {
            return res.status(404).json({
                error: 'Organization not found',
                message: `No organization found for subdomain: ${subdomain}`,
            });
        }
        // For non-API requests, you might redirect to a landing page
        return res.status(404).json({
            error: 'Organization not found',
            subdomain,
        });
    }

    // Attach tenant context to request
    req.tenant = tenant;

    // Add tenant info to response headers for debugging
    res.setHeader('X-Tenant-Id', tenant.organizationId);
    res.setHeader('X-Tenant-Subdomain', tenant.subdomain);

    next();
};

/**
 * Middleware to require tenant context (use after tenantMiddleware)
 */
export const requireTenant = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.tenant) {
        return res.status(400).json({
            error: 'Tenant context required',
            message: 'This endpoint requires a valid organization context',
        });
    }
    next();
};

/**
 * Validate that authenticated user belongs to the request's tenant
 */
export const validateUserTenant = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Skip if no user (will be caught by auth middleware)
    if (!req.user) {
        return next();
    }

    // Skip if no tenant (will be caught by tenantMiddleware)
    if (!req.tenant) {
        return next();
    }

    // Check if user's organizationId matches request tenant
    const userOrgId = (req.user as any).organizationId;
    if (userOrgId && userOrgId !== req.tenant.organizationId) {
        console.warn(`[TenantMiddleware] User ${req.user.id} attempted cross-tenant access`);
        return res.status(403).json({
            error: 'Access denied',
            message: 'You do not have access to this organization',
        });
    }

    next();
};

/**
 * Clear tenant cache (useful for testing or admin operations)
 */
export function clearTenantCache(subdomain?: string): void {
    if (subdomain) {
        tenantCache.delete(subdomain);
    } else {
        tenantCache.clear();
    }
}
