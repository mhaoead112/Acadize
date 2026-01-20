import express from 'express';
import { logger } from '../utils/logger.js';

const router = express.Router();

// POST /api/contacts - Send contact form via email
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'email', 'subject', 'message']
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Log the contact submission
    logger.info(`📧 New contact submission from ${email}: ${subject}`, {
      name,
      email,
      subject,
      messagePreview: message.substring(0, 100)
    });

    // TODO: Integrate with email service provider (SendGrid, AWS SES, etc.)
    // Send email using SendGrid
    const { EmailService } = await import('../services/email.service.js');
    await EmailService.sendContactFormEmail({ name, email, subject, message });
    // For now, just log and return success
    // Example with SendGrid:
    // await sendGrid.send({
    //   to: process.env.CONTACT_EMAIL || 'support@eduverse.com',
    //   from: process.env.FROM_EMAIL || 'noreply@eduverse.com',
    //   replyTo: email,
    //   subject: `Contact Form: ${subject}`,
    //   text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    //   html: `<p><strong>Name:</strong> ${name}</p><p><strong>Email:</strong> ${email}</p><p><strong>Subject:</strong> ${subject}</p><p><strong>Message:</strong></p><p>${message}</p>`
    // });

    res.status(200).json({
      success: true,
      message: 'Thank you for contacting us! We will get back to you soon.'
    });
  } catch (error) {
    logger.error('Error processing contact submission:', error);
    res.status(500).json({
      error: 'Failed to submit contact form',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
