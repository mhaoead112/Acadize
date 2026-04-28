/**
 * Tenant Middleware - Multi-tenant organization resolution
 * Resolves the organization from subdomain or custom domain
 */

import { Request, Response, NextFunction } from "express";
import { db } from "../db/index.js";
import { organizations } from "../db/schema.js";
import { eq, or } from "drizzle-orm";
import { getRedisClient } from "../db/redis.js";

const isProduction = process.env.NODE_ENV === 'production';
const ROOT_TENANT_SUBDOMAIN = 'acadize';
const ROOT_DOMAIN_HOSTS = new Set(['acadize.com', 'www.acadize.com']);
// Fallback org subdomain for single-org / non-subdomain deployments (e.g. *.onrender.com)
const DEFAULT_ORG_SUBDOMAIN = process.env.DEFAULT_ORG_SUBDOMAIN || null;

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
    /** Per-user subscription pricing (for activate/checkout pages) */
    userMonthlyPricePiasters: number | null;
    userAnnualPricePiasters: number | null;
    userCurrency: string;
}

// Extend Express Request to include tenant context
declare global {
    namespace Express {
        interface Request {
            tenant?: TenantContext;
        }
    }
}

// Process-local fallback cache if Redis is unavailable
const tenantCache = new Map<string, { data: TenantContext; expires: number }>();
const CACHE_TTL_SEC = 5 * 60; // 5 minutes in seconds
const CACHE_TTL_MS = CACHE_TTL_SEC * 1000;

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

    // Map the marketing/root domain to the platform tenant so auth and public
    // API calls on acadize.com resolve to the Acadize organization.
    if (ROOT_DOMAIN_HOSTS.has(host)) {
        return ROOT_TENANT_SUBDOMAIN;
    }

    // Handle localhost or IP addresses
    if (host === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
        // Check for subdomain header in development
        return 'default';
    }

    // Split hostname and get first part as subdomain
    const parts = host.split('.');

    // If only 2 parts, it's the main/apex domain.
    if (parts.length <= 2) {
        return 'default';
    }

    // Treat www.acadize.com like the root domain, not a real tenant.
    if (parts[0] === 'www' && ROOT_DOMAIN_HOSTS.has(host)) {
        return ROOT_TENANT_SUBDOMAIN;
    }

    // Return the subdomain (first part)
    return parts[0];
}

function sanitizeSubdomain(input: string | undefined): string | undefined {
    if (!input) return undefined;
    const normalized = input.trim().toLowerCase();
    if (!/^[a-z0-9-]{1,63}$/.test(normalized)) {
        return undefined;
    }
    return normalized;
}

function getRequestHostname(req: Request): string {
    const forwardedHost = req.headers['x-forwarded-host'];
    const rawHost = Array.isArray(forwardedHost)
        ? forwardedHost[0]
        : (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0] : req.headers.host || req.hostname || 'localhost');
    const normalized = rawHost.trim().toLowerCase();
    const withoutPort = normalized.startsWith('[')
        ? normalized.replace(/^\[([^\]]+)\](?::\d+)?$/, '$1')
        : normalized.split(':')[0];
    return withoutPort;
}

/**
 * Lookup organization by subdomain or custom domain
 */
async function lookupOrganization(subdomain: string, hostname: string): Promise<TenantContext | null> {
    // Check cache first
    const cacheKey = `tenant:${subdomain}`;
    const redis = getRedisClient();

    if (redis) {
        try {
            const cachedParams = await redis.get(cacheKey);
            if (cachedParams) {
                return JSON.parse(cachedParams) as TenantContext;
            }
        } catch (error) {
            // Log but don't fail, fall back to DB
            console.error('[Tenant Middleware] Redis get error', error);
        }
    } else {
        const cached = tenantCache.get(cacheKey);
        if (cached && cached.expires > Date.now()) {
            return cached.data;
        }
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
            userMonthlyPricePiasters: org.userMonthlyPricePiasters ?? null,
            userAnnualPricePiasters: org.userAnnualPricePiasters ?? null,
            userCurrency: org.userCurrency ?? 'EGP',
        };

        if (redis) {
            try {
                await redis.setex(cacheKey, CACHE_TTL_SEC, JSON.stringify(tenant));
            } catch (error) {
                console.error('[Tenant Middleware] Redis set error', error);
            }
        } else {
            tenantCache.set(cacheKey, { data: tenant, expires: Date.now() + CACHE_TTL_MS });
        }

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
    // Accept an explicit tenant header from the frontend. This is required when
    // the UI is served from acadize.com but the API is called on a separate
    // backend host like *.onrender.com.
    const rawHeaderSubdomain = req.headers['x-tenant-subdomain'] as string | undefined;
    const headerSubdomain = sanitizeSubdomain(rawHeaderSubdomain);
    const hostname = getRequestHostname(req);

    // In non-production only, optionally use Origin/Referer as fallback for local multi-host setups.
    let originSubdomain: string | undefined;
    if (!isProduction) {
        const origin = req.headers.origin as string;
        const referer = req.headers.referer as string;

        if (origin) {
            try {
                const originUrl = new URL(origin);
                originSubdomain = sanitizeSubdomain(extractSubdomain(originUrl.hostname));
            } catch { }
        } else if (referer) {
            try {
                const refererUrl = new URL(referer);
                originSubdomain = sanitizeSubdomain(extractSubdomain(refererUrl.hostname));
            } catch { }
        }
    }

    // Determine subdomain:
    // production -> explicit header > host
    // non-production -> explicit header > origin/referer > host
    const hostSubdomain = sanitizeSubdomain(extractSubdomain(hostname)) || 'default';
    const subdomain = !isProduction
        ? (headerSubdomain || originSubdomain || hostSubdomain)
        : (headerSubdomain || hostSubdomain);

    // Skip tenant resolution for certain paths (health checks, registration, webhooks)
    // Note: req.path doesn't include /api when middleware is mounted at /api
    if (req.path === '/health' ||
        req.path.startsWith('/registration/') ||
        req.path.startsWith('/webhooks/')) {
        return next();
    }

    // Lookup organization
    let tenant = await lookupOrganization(subdomain, hostname);

    // Fallback: if subdomain resolved to 'default' and no org found, try DEFAULT_ORG_SUBDOMAIN env var.
    // This handles single-org deployments on generic hosts (*.onrender.com, *.railway.app, etc.)
    if (!tenant && DEFAULT_ORG_SUBDOMAIN && subdomain === 'default') {
        console.log('[TenantMiddleware] Falling back to DEFAULT_ORG_SUBDOMAIN:', DEFAULT_ORG_SUBDOMAIN);
        tenant = await lookupOrganization(DEFAULT_ORG_SUBDOMAIN, hostname);
    }

    if (!tenant) {
        return res.status(404).json({
            error: 'Organization not found',
            message: 'Organization not found',
        });
    }

    // Attach tenant context to request
    req.tenant = tenant;

    // Add tenant info headers only in non-production for local debugging.
    if (!isProduction) {
        res.setHeader('X-Tenant-Id', tenant.organizationId);
        res.setHeader('X-Tenant-Subdomain', tenant.subdomain);
    }

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
