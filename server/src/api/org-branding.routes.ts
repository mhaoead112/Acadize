/**
 * Org Branding Route
 * Public endpoint: returns the branding config for the current tenant.
 * Admin endpoint: allows admins to update branding fields.
 */

import express from 'express';
import { db } from '../db/index.js';
import { organizations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { clearTenantCache } from '../middleware/tenant.middleware.js';

const router = express.Router();

// ============================================
// GET /api/org/branding
// Public — returns branding for current tenant
// ============================================
router.get('/', async (req, res) => {
    try {
        // Tenant is resolved by tenantMiddleware, attached to req.tenant
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Return full branding payload
        const [org] = await db
            .select({
                name: organizations.name,
                subdomain: organizations.subdomain,
                plan: organizations.plan,
                logoUrl: organizations.logoUrl,
                faviconUrl: organizations.faviconUrl,
                primaryColor: organizations.primaryColor,
                secondaryColor: organizations.secondaryColor,
                contactEmail: organizations.contactEmail,
                contactPhone: organizations.contactPhone,
                config: organizations.config,
            })
            .from(organizations)
            .where(eq(organizations.id, tenant.organizationId))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        return res.json({
            name: org.name,
            tagline: '', // can later be added as a DB column
            subdomain: org.subdomain,
            plan: org.plan,
            logoUrl: org.logoUrl ?? null,
            faviconUrl: org.faviconUrl ?? null,
            primaryColor: org.primaryColor ?? '#6366f1',
            secondaryColor: org.secondaryColor ?? '#8b5cf6',
            contactEmail: org.contactEmail ?? null,
            contactPhone: org.contactPhone ?? null,
            features: {
                enableCourseDiscussions: true,
                enableParentPortal: true,
                ...(org.config && typeof org.config === 'object' && 'features' in org.config
                    ? (org.config as any).features
                    : {}),
            },
        });
    } catch (error) {
        console.error('[OrgBranding] Error fetching branding:', error);
        return res.status(500).json({ message: 'Failed to fetch branding' });
    }
});

// ============================================
// PATCH /api/org/branding
// Admin-only — update branding fields for current org
// ============================================
router.patch('/', isAuthenticated, async (req, res) => {
    try {
        const tenant = req.tenant;
        if (!tenant) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Only admins can update branding
        if (req.user?.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // Exclude the default Acadize organization from applying custom branding settings
        if (tenant.subdomain === 'acadize' || tenant.subdomain === 'default') {
            return res.status(403).json({ message: 'The default organization cannot apply custom branding settings.' });
        }

        const {
            logoUrl,
            faviconUrl,
            primaryColor,
            secondaryColor,
            contactEmail,
            contactPhone,
        } = req.body;

        // Build update object — only include provided fields
        const updateData: Record<string, unknown> = {};
        if (logoUrl !== undefined) updateData.logoUrl = logoUrl;
        if (faviconUrl !== undefined) updateData.faviconUrl = faviconUrl;
        if (primaryColor !== undefined) updateData.primaryColor = primaryColor;
        if (secondaryColor !== undefined) updateData.secondaryColor = secondaryColor;
        if (contactEmail !== undefined) updateData.contactEmail = contactEmail;
        if (contactPhone !== undefined) updateData.contactPhone = contactPhone;
        updateData.updatedAt = new Date();

        const [updated] = await db
            .update(organizations)
            .set(updateData as any)
            .where(eq(organizations.id, tenant.organizationId))
            .returning({
                name: organizations.name,
                logoUrl: organizations.logoUrl,
                faviconUrl: organizations.faviconUrl,
                primaryColor: organizations.primaryColor,
                secondaryColor: organizations.secondaryColor,
                contactEmail: organizations.contactEmail,
                contactPhone: organizations.contactPhone,
            });

        // Clear tenant cache so changes take effect immediately
        clearTenantCache(tenant.subdomain);

        console.log(`[OrgBranding] Updated branding for org: ${tenant.organizationId}`);
        return res.json(updated);
    } catch (error) {
        console.error('[OrgBranding] Error updating branding:', error);
        return res.status(500).json({ message: 'Failed to update branding' });
    }
});

export default router;
