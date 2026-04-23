/**
 * Admin Organizations Routes
 * Super-admin only routes for managing organizations
 */

import express from 'express';
import { db } from '../db/index.js';
import { organizations, organizationInvites, users, courses, exams } from '../db/schema.js';
import { eq, desc, sql, count, and, isNull } from 'drizzle-orm';
import { isAuthenticated } from '../middleware/auth.middleware.js';
import { createId } from '@paralleldrive/cuid2';

const router = express.Router();

/**
 * Middleware: Check if user is super-admin
 * For now, any admin can manage organizations
 */
const isSuperAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }

    // TODO: Add super-admin org check after migration
    // const userOrgId = (req.user as any).organizationId;
    // if (userOrgId !== 'org_default_system') { ... }

    next();
};

// Apply auth middleware to all routes
router.use(isAuthenticated);
router.use(isSuperAdmin);

// ============================================
// GET /api/admin/organizations
// List all organizations with stats
// ============================================
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;
        const search = req.query.search as string;

        // Build base query
        let query = db
            .select({
                id: organizations.id,
                name: organizations.name,
                subdomain: organizations.subdomain,
                customDomain: organizations.customDomain,
                plan: organizations.plan,
                isActive: organizations.isActive,
                createdAt: organizations.createdAt,
                logoUrl: organizations.logoUrl,
                primaryColor: organizations.primaryColor,
            })
            .from(organizations)
            .orderBy(desc(organizations.createdAt))
            .limit(limit)
            .offset(offset);

        const orgs = await query;

        // Get stats for each org
        const orgsWithStats = await Promise.all(
            orgs.map(async (org) => {
                const [userCount] = await db
                    .select({ count: count() })
                    .from(users)
                    .where(eq(users.organizationId, org.id));

                const [courseCount] = await db
                    .select({ count: count() })
                    .from(courses)
                    .where(eq(courses.organizationId, org.id));

                return {
                    ...org,
                    userCount: userCount?.count || 0,
                    courseCount: courseCount?.count || 0,
                };
            })
        );

        // Get total count
        const [totalResult] = await db
            .select({ count: count() })
            .from(organizations);

        res.json({
            organizations: orgsWithStats,
            pagination: {
                page,
                limit,
                total: totalResult?.count || 0,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('[AdminOrganizations] Error listing organizations:', error);
        res.status(500).json({ message: 'Failed to list organizations' });
    }
});

// ============================================
// GET /api/admin/organizations/:id
// Get single organization details
// ============================================
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const [org] = await db
            .select()
            .from(organizations)
            .where(eq(organizations.id, id))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Get stats
        const [userCount] = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.organizationId, id));

        const [courseCount] = await db
            .select({ count: count() })
            .from(courses)
            .where(eq(courses.organizationId, id));

        const [examCount] = await db
            .select({ count: count() })
            .from(exams)
            .where(eq(exams.organizationId, id));

        res.json({
            ...org,
            stats: {
                userCount: userCount?.count || 0,
                courseCount: courseCount?.count || 0,
                examCount: examCount?.count || 0,
            },
        });
    } catch (error) {
        console.error('[AdminOrganizations] Error getting organization:', error);
        res.status(500).json({ message: 'Failed to get organization' });
    }
});

// ============================================
// POST /api/admin/organizations
// Create new organization
// ============================================
router.post('/', async (req, res) => {
    try {
        const {
            name,
            subdomain,
            customDomain,
            plan = 'free',
            contactEmail,
            contactPhone,
            logoUrl,
            primaryColor,
            secondaryColor,
            config,
            maxUsers,
        } = req.body;

        // Validate required fields
        if (!name || !subdomain) {
            return res.status(400).json({ message: 'Name and subdomain are required' });
        }

        // Check subdomain uniqueness
        const [existing] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.subdomain, subdomain.toLowerCase()))
            .limit(1);

        if (existing) {
            return res.status(409).json({ message: 'Subdomain already exists' });
        }

        // Create organization
        const [newOrg] = await db
            .insert(organizations)
            .values({
                id: `org_${createId()}`,
                name,
                subdomain: subdomain.toLowerCase(),
                customDomain: customDomain || null,
                plan,
                contactEmail: contactEmail || null,
                contactPhone: contactPhone || null,
                logoUrl: logoUrl || null,
                primaryColor: primaryColor || '#6366f1',
                secondaryColor: secondaryColor || '#8b5cf6',
                config: config || {},
                maxUsers: maxUsers || null,
                isActive: true,
            })
            .returning();

        console.log(`[AdminOrganizations] Created organization: ${newOrg.name} (${newOrg.subdomain})`);

        res.status(201).json(newOrg);
    } catch (error) {
        console.error('[AdminOrganizations] Error creating organization:', error);
        res.status(500).json({ message: 'Failed to create organization' });
    }
});

// ============================================
// PUT /api/admin/organizations/:id
// Update organization
// ============================================
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name,
            subdomain,
            customDomain,
            plan,
            contactEmail,
            contactPhone,
            logoUrl,
            primaryColor,
            secondaryColor,
            config,
            maxUsers,
            isActive,
        } = req.body;

        // Check org exists
        const [existing] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, id))
            .limit(1);

        if (!existing) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // If changing subdomain, check uniqueness
        if (subdomain) {
            const [subdomainConflict] = await db
                .select({ id: organizations.id })
                .from(organizations)
                .where(
                    and(
                        eq(organizations.subdomain, subdomain.toLowerCase()),
                        sql`${organizations.id} != ${id}`
                    )
                )
                .limit(1);

            if (subdomainConflict) {
                return res.status(409).json({ message: 'Subdomain already exists' });
            }
        }

        // Update organization
        const [updatedOrg] = await db
            .update(organizations)
            .set({
                name,
                subdomain: subdomain?.toLowerCase(),
                customDomain,
                plan,
                contactEmail,
                contactPhone,
                logoUrl,
                primaryColor,
                secondaryColor,
                config,
                maxUsers,
                isActive,
                updatedAt: new Date(),
            })
            .where(eq(organizations.id, id))
            .returning();

        console.log(`[AdminOrganizations] Updated organization: ${updatedOrg.id}`);

        const { AuditService } = await import('../services/audit.service.js');
        await AuditService.logAction({
            organizationId: id,
            actorId: req.user!.id,
            action: 'update_organization',
            targetId: id,
            targetType: 'organization',
            metadata: { 
                plan: updatedOrg.plan, 
                isActive: updatedOrg.isActive 
            }
        });

        res.json(updatedOrg);
    } catch (error) {
        console.error('[AdminOrganizations] Error updating organization:', error);
        res.status(500).json({ message: 'Failed to update organization' });
    }
});

// ============================================
// DELETE /api/admin/organizations/:id
// Soft-delete organization (set inactive)
// ============================================
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const hardDelete = req.query.hard === 'true';

        // Prevent deleting system org
        if (id === 'org_default_system') {
            return res.status(403).json({ message: 'Cannot delete system organization' });
        }

        if (hardDelete) {
            // Hard delete (cascades to users, courses, etc.)
            await db.delete(organizations).where(eq(organizations.id, id));
            console.log(`[AdminOrganizations] Hard deleted organization: ${id}`);
        } else {
            // Soft delete (just deactivate)
            await db
                .update(organizations)
                .set({ isActive: false, updatedAt: new Date() })
                .where(eq(organizations.id, id));
            console.log(`[AdminOrganizations] Soft deleted organization: ${id}`);
        }

        res.json({ message: 'Organization deleted successfully' });
    } catch (error) {
        console.error('[AdminOrganizations] Error deleting organization:', error);
        res.status(500).json({ message: 'Failed to delete organization' });
    }
});

// ============================================
// GET /api/admin/organizations/:id/users
// List users in organization
// ============================================
router.get('/:id/users', async (req, res) => {
    try {
        const { id } = req.params;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const offset = (page - 1) * limit;

        const orgUsers = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                fullName: users.fullName,
                role: users.role,
                profilePicture: users.profilePicture,
                createdAt: users.createdAt,
                emailVerified: users.emailVerified,
            })
            .from(users)
            .where(eq(users.organizationId, id))
            .orderBy(desc(users.createdAt))
            .limit(limit)
            .offset(offset);

        const [totalResult] = await db
            .select({ count: count() })
            .from(users)
            .where(eq(users.organizationId, id));

        res.json({
            users: orgUsers,
            pagination: {
                page,
                limit,
                total: totalResult?.count || 0,
                totalPages: Math.ceil((totalResult?.count || 0) / limit),
            },
        });
    } catch (error) {
        console.error('[AdminOrganizations] Error listing org users:', error);
        res.status(500).json({ message: 'Failed to list users' });
    }
});

// ============================================
// POST /api/admin/organizations/:id/invite
// Create invitation for organization
// ============================================
router.post('/:id/invite', async (req, res) => {
    try {
        const { id: organizationId } = req.params;
        const { email, role = 'student' } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Check org exists
        const [org] = await db
            .select({ id: organizations.id })
            .from(organizations)
            .where(eq(organizations.id, organizationId))
            .limit(1);

        if (!org) {
            return res.status(404).json({ message: 'Organization not found' });
        }

        // Create invite token
        const token = createId();
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

        const [invite] = await db
            .insert(organizationInvites)
            .values({
                id: `inv_${createId()}`,
                organizationId,
                email: email.toLowerCase(),
                role,
                token,
                expiresAt,
                invitedBy: req.user!.id,
            })
            .returning();

        // TODO: Send invitation email

        console.log(`[AdminOrganizations] Created invite for ${email} to org ${organizationId}`);

        res.status(201).json({
            invite,
            inviteLink: `/join?token=${token}`,
        });
    } catch (error) {
        console.error('[AdminOrganizations] Error creating invite:', error);
        res.status(500).json({ message: 'Failed to create invitation' });
    }
});

// ============================================
// GET /api/admin/organizations/:id/invites
// List pending invites for organization
// ============================================
router.get('/:id/invites', async (req, res) => {
    try {
        const { id: organizationId } = req.params;

        const invites = await db
            .select()
            .from(organizationInvites)
            .where(
                and(
                    eq(organizationInvites.organizationId, organizationId),
                    isNull(organizationInvites.acceptedAt)
                )
            )
            .orderBy(desc(organizationInvites.createdAt));

        res.json({ invites });
    } catch (error) {
        console.error('[AdminOrganizations] Error listing invites:', error);
        res.status(500).json({ message: 'Failed to list invites' });
    }
});

// ============================================
// DELETE /api/admin/organizations/:id/invites/:inviteId
// Cancel/delete invite
// ============================================
router.delete('/:id/invites/:inviteId', async (req, res) => {
    try {
        const { inviteId } = req.params;

        await db
            .delete(organizationInvites)
            .where(eq(organizationInvites.id, inviteId));

        res.json({ message: 'Invite cancelled' });
    } catch (error) {
        console.error('[AdminOrganizations] Error cancelling invite:', error);
        res.status(500).json({ message: 'Failed to cancel invite' });
    }
});

export default router;
