// server/src/api/password-reset.routes.ts

import express, { Request, Response } from 'express';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * POST /api/password-reset/request
 * Request a password reset email
 */
router.post('/request', async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        // Find user
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        // Always return success to prevent email enumeration
        if (!user) {
            return res.status(200).json({
                message: 'If that email exists, a reset link has been sent.',
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetExpires = new Date(Date.now() + 3600000); // 1 hour

        // Save token to database
        await db
            .update(users)
            .set({
                passwordResetToken: resetToken,
                passwordResetExpires: resetExpires,
            })
            .where(eq(users.id, user.id));

        // Send email
        try {
            const { EmailService } = await import('../services/email.service.js');
            await EmailService.sendPasswordResetEmail({
                email: user.email,
                fullName: user.fullName,
                resetToken,
            });
            console.log(`✅ Password reset email sent to ${user.email}`);
        } catch (emailError) {
            console.error('❌ Failed to send password reset email:', emailError);
        }

        res.status(200).json({
            message: 'If that email exists, a reset link has been sent.',
        });
    } catch (error) {
        console.error('Error requesting password reset:', error);
        res.status(500).json({ message: 'Failed to process request' });
    }
});

/**
 * POST /api/password-reset/reset
 * Reset password with token
 */
router.post('/reset', async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({ message: 'Token and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long',
            });
        }

        // Find user with valid token
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.passwordResetToken, token))
            .limit(1);

        if (!user || !user.passwordResetExpires) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        // Check if token expired
        if (new Date() > user.passwordResetExpires) {
            return res.status(400).json({ message: 'Reset token has expired' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear reset token
        await db
            .update(users)
            .set({
                password: hashedPassword,
                passwordResetToken: null,
                passwordResetExpires: null,
            })
            .where(eq(users.id, user.id));

        // Send confirmation email
        try {
            const { EmailService } = await import('../services/email.service.js');
            await EmailService.sendPasswordChangedConfirmation({
                email: user.email,
                fullName: user.fullName,
                changedAt: new Date().toLocaleString(),
                ipAddress: req.ip || 'Unknown',
            });
        } catch (emailError) {
            console.error('❌ Failed to send password changed email:', emailError);
        }

        res.status(200).json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ message: 'Failed to reset password' });
    }
});

/**
 * POST /api/password-reset/change
 * Change password (for logged-in users or first-time login)
 */
router.post('/change', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user?.id;

        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ message: 'Current password and new password are required' });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                message: 'Password must be at least 8 characters long',
            });
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

        // Always verify current password for authenticated password changes
        const isValid = await bcrypt.compare(currentPassword, user.password);
        if (!isValid) {
            return res.status(401).json({ message: 'Current password is incorrect' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password and clear expiry (for temporary passwords)
        await db
            .update(users)
            .set({
                password: hashedPassword,
                passwordResetExpires: null, // Clear temporary password expiry
                emailVerified: true, // Mark email as verified on first password change
            })
            .where(eq(users.id, userId));

        // Send confirmation email
        try {
            const { EmailService } = await import('../services/email.service.js');
            await EmailService.sendPasswordChangedConfirmation({
                email: user.email,
                fullName: user.fullName,
                changedAt: new Date().toLocaleString(),
                ipAddress: req.ip || 'Unknown',
            });
        } catch (emailError) {
            console.error('❌ Failed to send password changed email:', emailError);
        }

        res.status(200).json({ message: 'Password changed successfully' });
    } catch (error) {
        console.error('Error changing password:', error);
        res.status(500).json({ message: 'Failed to change password' });
    }
});

export default router;
