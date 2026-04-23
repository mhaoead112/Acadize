// server/src/api/admin-users.routes.ts

import express, { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Generate a secure random temporary password
 */
function generateTemporaryPassword(): string {
    const length = 12;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';

    // Ensure at least one of each type
    password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]; // Uppercase
    password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]; // Lowercase
    password += '0123456789'[Math.floor(Math.random() * 10)]; // Number
    password += '!@#$%^&*'[Math.floor(Math.random() * 8)]; // Special char

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
        password += charset[Math.floor(Math.random() * charset.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * POST /api/admin/users
 * Admin creates a new user with temporary password
 */
router.post('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { email, fullName, username, role, temporaryPassword } = req.body;
        const adminId = (req as any).user?.id;

        // Verify admin role
        const [admin] = await db
            .select()
            .from(users)
            .where(eq(users.id, adminId))
            .limit(1);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can create users' });
        }

        // Validate input
        if (!email || !fullName || !role || !temporaryPassword) {
            return res.status(400).json({
                message: 'Email, full name, role, and temporary password are required'
            });
        }

        // Validate password strength
        if (temporaryPassword.length < 8) {
            return res.status(400).json({
                message: 'Temporary password must be at least 8 characters long'
            });
        }

        // Check if user already exists in this organization
        const checkOrgId = (req as any).tenant?.organizationId;
        const emailConditions: any[] = [eq(users.email, email.toLowerCase())];
        if (checkOrgId) {
            emailConditions.push(eq(users.organizationId, checkOrgId));
        }
        const [existingUser] = await db
            .select()
            .from(users)
            .where(and(...emailConditions)!)
            .limit(1);

        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists' });
        }

        // Generate username if not provided
        const finalUsername = username || email.split('@')[0] + '_' + Date.now().toString(36);

        // Check if username exists
        const [existingUsername] = await db
            .select()
            .from(users)
            .where(eq(users.username, finalUsername))
            .limit(1);

        if (existingUsername) {
            return res.status(409).json({ message: 'Username already taken' });
        }

        // Hash the provided temporary password
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Set password expiry (7 days from now)
        const passwordExpiry = new Date();
        passwordExpiry.setDate(passwordExpiry.getDate() + 7);

        // Create user with organization scoping
        const tenantOrgId = (req as any).tenant?.organizationId;
        if (!tenantOrgId) {
            return res.status(403).json({ message: 'Organization context required for user creation' });
        }

        const [newUser] = await db
            .insert(users)
            .values({
                email: email.toLowerCase(),
                fullName,
                username: finalUsername,
                password: hashedPassword,
                role: role as any,
                isActive: true,
                emailVerified: false, // Will be verified on first login
                passwordResetExpires: passwordExpiry, // Temporary password expires in 7 days
                organizationId: tenantOrgId,
            })
            .returning({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                username: users.username,
                role: users.role,
            });

        console.log('✅ User created:', newUser.email);

        const { AuditService } = await import('../services/audit.service.js');
        await AuditService.logAction({
            organizationId: tenantOrgId,
            actorId: adminId,
            action: 'create_user',
            targetId: newUser.id,
            targetType: 'user',
            metadata: { email: newUser.email, role: newUser.role }
        });

        // Send email with credentials (non-blocking)
        try {
            console.log('📧 Attempting to send account creation email...');
            const { EmailService } = await import('../services/email.service.js');

            const emailResult = await EmailService.sendAdminCreatedAccountEmail({
                email: newUser.email,
                fullName: newUser.fullName,
                username: newUser.username,
                role: newUser.role,
                temporaryPassword,
            });

            if (emailResult) {
                console.log(`✅ Account creation email sent successfully to ${newUser.email}`);
            } else {
                console.error(`❌ Email service returned false for ${newUser.email}`);
            }
        } catch (emailError: any) {
            console.error('❌ Failed to send account creation email:');
            console.error('Error name:', emailError.name);
            console.error('Error message:', emailError.message);
            console.error('Error stack:', emailError.stack);
            // Don't fail the request, but log the error
        }

        // Return success (include password so admin can see it)
        res.status(201).json({
            message: 'User created successfully. Credentials sent via email.',
            user: newUser,
            temporaryPassword, // Include in response so admin can see it
        });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Failed to create user' });
    }
});

/**
 * POST /api/admin/users/:userId/reset-password
 * Admin resets a user's password (generates new temporary password)
 */
router.post('/:userId/reset-password', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { userId } = req.params;
        const adminId = (req as any).user?.id;
        const tenantOrgId = (req as any).tenant?.organizationId;

        // Verify admin role
        const [admin] = await db
            .select()
            .from(users)
            .where(eq(users.id, adminId))
            .limit(1);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Only admins can reset passwords' });
        }

        if (!tenantOrgId || admin.organizationId !== tenantOrgId) {
            return res.status(403).json({ message: 'Invalid organization context' });
        }

        // Get user
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.organizationId !== tenantOrgId) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new temporary password
        const temporaryPassword = generateTemporaryPassword();
        const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

        // Set password expiry (7 days)
        const passwordExpiry = new Date();
        passwordExpiry.setDate(passwordExpiry.getDate() + 7);

        // Update user
        await db
            .update(users)
            .set({
                password: hashedPassword,
                passwordResetExpires: passwordExpiry,
                passwordResetToken: null, // Clear any existing reset token
            })
            .where(eq(users.id, userId));

        // Send email with new credentials
        try {
            const { EmailService } = await import('../services/email.service.js');
            await EmailService.sendPasswordResetByAdminEmail({
                email: user.email,
                fullName: user.fullName,
                username: user.username,
                temporaryPassword,
            });
            console.log(`✅ Password reset email sent to ${user.email}`);

            const { AuditService } = await import('../services/audit.service.js');
            await AuditService.logAction({
                organizationId: tenantOrgId,
                actorId: adminId,
                action: 'reset_password',
                targetId: user.id,
                targetType: 'user',
            });
        } catch (emailError) {
            console.error('❌ Failed to send password reset email:', emailError);
        }

        res.status(200).json({
            message: 'Password reset successfully. New credentials sent via email.',
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

/**
 * GET /api/admin/users
 * List all users (admin only) - filtered by organization
 */
router.get('/', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const adminId = (req as any).user?.id;
        const tenantOrgId = (req as any).tenant?.organizationId; // From tenant middleware

        // Verify admin role
        const [admin] = await db
            .select()
            .from(users)
            .where(eq(users.id, adminId))
            .limit(1);

        if (!admin || admin.role !== 'admin') {
            return res.status(403).json({ message: 'Admin access required' });
        }

        // If no tenant context, return empty (don't allow cross-tenant access)
        if (!tenantOrgId) {
            return res.status(200).json({ users: [] });
        }

        // Build query - ALWAYS filter by organization
        const allUsers = await db
            .select({
                id: users.id,
                email: users.email,
                fullName: users.fullName,
                username: users.username,
                role: users.role,
                isActive: users.isActive,
                emailVerified: users.emailVerified,
                lastLoginAt: users.lastLoginAt,
                createdAt: users.createdAt,
                organizationId: users.organizationId,
            })
            .from(users)
            .where(eq(users.organizationId, tenantOrgId))
            .orderBy(users.createdAt);

        res.status(200).json({ users: allUsers });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Failed to fetch users' });
    }
});

export default router;
