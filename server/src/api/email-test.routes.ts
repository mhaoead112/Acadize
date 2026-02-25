// server/src/api/email-test.routes.ts

import express, { Request, Response } from 'express';
import { isAuthenticated } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * GET /api/email-test/config
 * Test email configuration (admin only)
 */
router.get('/config', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { EmailService } = await import('../services/email.service.js');

        const config = {
            smtp_host: process.env.SMTP_HOST || 'NOT SET',
            smtp_port: process.env.SMTP_PORT || 'NOT SET',
            smtp_secure: process.env.SMTP_SECURE || 'NOT SET',
            smtp_user: process.env.SMTP_USER || 'NOT SET',
            smtp_pass: process.env.SMTP_PASS ? '***SET***' : 'NOT SET',
            email_from: process.env.EMAIL_FROM || 'NOT SET',
            support_email: process.env.SUPPORT_EMAIL || 'NOT SET',
            client_url: process.env.CLIENT_URL || 'NOT SET',
        };

        console.log('📧 Email Configuration:', config);

        res.status(200).json({
            message: 'Email configuration',
            config,
        });
    } catch (error: any) {
        console.error('Error checking email config:', error);
        res.status(500).json({ message: 'Failed to check config', error: error.message });
    }
});

/**
 * POST /api/email-test/send
 * Send a test email (admin only)
 */
router.post('/send', isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { to } = req.body;

        if (!to) {
            return res.status(400).json({ message: 'Recipient email is required' });
        }

        console.log(`📧 Sending test email to ${to}...`);

        const { EmailService } = await import('../services/email.service.js');

        const result = await EmailService.sendEmail({
            to,
            subject: '🧪 Acadize Email Test',
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #f9d406;">✅ Email Test Successful!</h1>
          <p>This is a test email from Acadize.</p>
          <p>If you're seeing this, your email configuration is working correctly!</p>
          <hr style="margin: 20px 0;">
          <p style="color: #64748b; font-size: 12px;">
            Sent at: ${new Date().toLocaleString()}<br>
            From: ${process.env.EMAIL_FROM || 'Acadize'}
          </p>
        </div>
      `,
            text: `Email Test Successful!\n\nThis is a test email from Acadize.\nIf you're seeing this, your email configuration is working correctly!\n\nSent at: ${new Date().toLocaleString()}`,
        });

        if (result) {
            console.log(`✅ Test email sent successfully to ${to}`);
            res.status(200).json({
                message: 'Test email sent successfully',
                recipient: to,
            });
        } else {
            console.error(`❌ Test email failed to send to ${to}`);
            res.status(500).json({
                message: 'Email service returned false',
            });
        }
    } catch (error: any) {
        console.error('❌ Error sending test email:', error);
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);

        res.status(500).json({
            message: 'Failed to send test email',
            error: error.message,
            details: error.stack,
        });
    }
});

/**
 * POST /api/email-test/connection
 * Test SMTP connection (admin only)
 */
router.post('/connection', isAuthenticated, async (req: Request, res: Response) => {
    try {
        console.log('🔌 Testing SMTP connection...');

        const { EmailService } = await import('../services/email.service.js');
        const isConnected = await EmailService.testConnection();

        if (isConnected) {
            console.log('✅ SMTP connection successful');
            res.status(200).json({
                message: 'SMTP connection successful',
                connected: true,
            });
        } else {
            console.error('❌ SMTP connection failed');
            res.status(500).json({
                message: 'SMTP connection failed',
                connected: false,
            });
        }
    } catch (error: any) {
        console.error('❌ Error testing SMTP connection:', error);
        res.status(500).json({
            message: 'Failed to test connection',
            error: error.message,
        });
    }
});

export default router;
