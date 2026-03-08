// server/src/services/email.service.ts

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { db } from '../db/index.js';
import { users, organizations } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import {
  welcomeEmailTemplate,
  emailVerificationTemplate,
  passwordResetTemplate,
  passwordChangedTemplate,
  suspiciousLoginTemplate,
  gradeNotificationTemplate,
  replacePlaceholders,
} from './email-templates.js';
import {
  adminCreatedAccountTemplate,
  passwordChangeReminderTemplate,
  assignmentPostedTemplate,
  assignmentDueSoonTemplate,
  assignmentGradedTemplate,
  examScheduledTemplate,
  examStartingSoonTemplate,
  examRetakeAvailableTemplate,
} from './email-templates-phase2.js';

// Initialize Nodemailer transporter
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  // Check if SMTP is configured
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('[Email] SMTP not configured - email functionality disabled');
    console.warn('[Email] Required: SMTP_HOST, SMTP_USER, SMTP_PASS');
    // Return a dummy transporter that logs instead of sending
    return nodemailer.createTransport({
      streamTransport: true,
      newline: 'unix',
      buffer: true,
    });
  }

  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  console.log(`[Email] Nodemailer initialized with ${process.env.SMTP_HOST}`);
  return transporter;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content?: string | Buffer;
    path?: string;
  }>;
}

export class EmailService {
  private static readonly DEFAULT_FROM = process.env.EMAIL_FROM || 'noreply@eduverse.com';
  private static readonly SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@eduverse.com';

  private static async getBrandingForEmail(email: string): Promise<{ orgName?: string; logoUrl?: string; primaryColor?: string } | undefined> {
    try {
      const userResult = await db.select({
        organizationId: users.organizationId
      }).from(users).where(eq(users.email, email)).limit(1);

      if (userResult.length > 0 && userResult[0].organizationId) {
        const orgResult = await db.select({
          name: organizations.name,
          logoUrl: organizations.logoUrl,
          primaryColor: organizations.primaryColor,
          subdomain: organizations.subdomain,
        }).from(organizations).where(eq(organizations.id, userResult[0].organizationId)).limit(1);

        if (orgResult.length > 0) {
          const org = orgResult[0];

          // Exclude default Acadize organization from dynamic email branding replacements
          if (org.subdomain === 'acadize' || org.subdomain === 'default') {
            return undefined;
          }

          return {
            orgName: org.name,
            logoUrl: org.logoUrl || undefined,
            primaryColor: org.primaryColor || undefined
          };
        }
      }
    } catch (error) {
      console.error('[Email] Error fetching branding:', error);
    }
    return undefined;
  }

  /**
   * Send a single email
   */
  static async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const transport = getTransporter();

      let html = options.html;
      let text = options.text;
      let subject = options.subject;
      let fromField = options.from || this.DEFAULT_FROM;

      // Attempt to fetch branding using the first recipient email
      const firstEmail = Array.isArray(options.to) ? options.to[0] : options.to;
      const branding = await this.getBrandingForEmail(firstEmail);

      if (branding && branding.orgName) {
        // Replace mentions of Eduverse with Org Name
        if (branding.orgName) {
          html = html?.replace(/Eduverse/g, branding.orgName);
          text = text?.replace(/Eduverse/g, branding.orgName);
          subject = subject.replace(/Eduverse/g, branding.orgName);
          fromField = `"${branding.orgName}" <${this.DEFAULT_FROM}>`;
        }

        // Replace colors
        if (branding.primaryColor && html) {
          html = html.replace(/#f9d406/gi, branding.primaryColor);
          html = html.replace(/#f5c400/gi, branding.primaryColor);
        }

        // Replace logo
        if (branding.logoUrl && html) {
          html = html.replace(
            /<h1 class="logo">.*?<\/h1>/i,
            `<div class="logo"><img src="${branding.logoUrl}" alt="${branding.orgName || 'Logo'}" style="max-height: 48px; object-fit: contain; vertical-align: middle;" /></div>`
          );
        }
      }

      const mailOptions = {
        from: fromField,
        to: options.to,
        subject: subject,
        text: text,
        html: html,
        replyTo: options.replyTo,
        attachments: options.attachments,
      };

      const info = await transport.sendMail(mailOptions);
      console.log(`[Email] Sent to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
      console.log(`[Email] Message ID: ${info.messageId}`);
      return true;
    } catch (error: any) {
      console.error('[Email] Failed to send:', error.message);
      return false;
    }
  }

  /**
   * Send contact form submission to support
   */
  static async sendContactFormEmail(data: {
    name: string;
    email: string;
    subject: string;
    message: string;
  }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1e293b;">New Contact Form Submission</h2>
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>From:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
        </div>
        <div style="background: #ffffff; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h3 style="color: #334155; margin-top: 0;">Message:</h3>
          <p style="white-space: pre-wrap;">${data.message}</p>
        </div>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e2e8f0;">
        <p style="color: #64748b; font-size: 12px;">
          This email was sent from the Eduverse contact form.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: this.SUPPORT_EMAIL,
      from: this.DEFAULT_FROM,
      replyTo: data.email,
      subject: `Contact Form: ${data.subject}`,
      text: `From: ${data.name} (${data.email})\n\n${data.message}`,
      html,
    });
  }

  /**
   * Send welcome email to new user (locale: recipient's preferred or org default)
   */
  static async sendWelcomeEmail(
    user: { email: string; fullName: string; role: string },
    options?: { locale?: string }
  ): Promise<boolean> {
    const dashboardUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/dashboard`;
    const locale = options?.locale;

    const html = replacePlaceholders(
      welcomeEmailTemplate(
        {
          fullName: user.fullName,
          role: user.role,
          dashboardUrl,
        },
        locale
      ),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    const { getEmailStrings } = await import('../i18n/emails/index.js');
    const strings = locale ? getEmailStrings(locale).welcome : null;
    const subject = strings?.subject ?? 'Welcome to Eduverse! 🎓';

    return this.sendEmail({
      to: user.email,
      subject,
      html,
      text: `Hi ${user.fullName},\n\nWelcome to Eduverse as a ${user.role}!\n\nGet started: ${dashboardUrl}\n\nBest regards,\nThe Eduverse Team`,
    });
  }

  /**
   * Send grade notification to student
   */
  static async sendGradeNotification(data: {
    studentEmail: string;
    studentName: string;
    examTitle: string;
    score: number;
    percentage: number;
    passed: boolean;
    feedback?: string;
  }): Promise<boolean> {
    const viewResultsUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/student/exams`;
    const statusText = data.passed ? 'Passed ✓' : 'Needs Improvement';

    const html = replacePlaceholders(
      gradeNotificationTemplate({
        studentName: data.studentName,
        examTitle: data.examTitle,
        score: data.score,
        percentage: data.percentage,
        passed: data.passed,
        feedback: data.feedback,
        viewResultsUrl,
      }),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `📊 Grade Posted: ${data.examTitle}`,
      html,
      text: `Hi ${data.studentName},\n\nYour exam "${data.examTitle}" has been graded.\nScore: ${data.percentage}% (${data.score} points)\nStatus: ${statusText}\n\nView full results at: ${viewResultsUrl}`,
    });
  }

  /**
   * Send anti-cheat alert to teacher
   */
  static async sendAntiCheatAlert(data: {
    teacherEmail: string;
    teacherName: string;
    studentName: string;
    examTitle: string;
    eventType: string;
    severity: string;
  }): Promise<boolean> {
    const severityColor = data.severity === 'critical' ? '#ef4444' : data.severity === 'high' ? '#f59e0b' : '#eab308';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">⚠️ Anti-Cheat Alert</h2>
        <p>Hi ${data.teacherName},</p>
        <p>A <strong style="color: ${severityColor};">${data.severity}</strong> severity anti-cheat event was detected:</p>
        <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 20px; margin: 20px 0;">
          <p><strong>Student:</strong> ${data.studentName}</p>
          <p><strong>Exam:</strong> ${data.examTitle}</p>
          <p><strong>Event:</strong> ${data.eventType.replace(/_/g, ' ')}</p>
        </div>
        <p>Please review the attempt in the teacher dashboard.</p>
        <p>
          <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/teacher/attempts/flagged" 
             style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Review Now
          </a>
        </p>
      </div>
    `;

    return this.sendEmail({
      to: data.teacherEmail,
      subject: `⚠️ Anti-Cheat Alert: ${data.studentName}`,
      html,
      text: `Anti-Cheat Alert\n\nStudent: ${data.studentName}\nExam: ${data.examTitle}\nEvent: ${data.eventType}\nSeverity: ${data.severity}\n\nReview at: ${process.env.CLIENT_URL || 'http://localhost:5173'}/teacher/attempts/flagged`,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(data: {
    email: string;
    fullName: string;
    resetToken: string;
  }): Promise<boolean> {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${data.resetToken}`;

    const html = replacePlaceholders(
      passwordResetTemplate({
        fullName: data.fullName,
        resetUrl,
        expiresIn: '1 hour',
      }),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.email,
      subject: '🔒 Reset Your Password - Eduverse',
      html,
      text: `Hi ${data.fullName},\n\nYou requested to reset your password.\n\nReset link: ${resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you didn't request this, please ignore this email.`,
    });
  }

  /**
   * Send admin-created account email with temporary password
   */
  static async sendAdminCreatedAccountEmail(data: {
    email: string;
    fullName: string;
    username: string;
    role: string;
    temporaryPassword: string;
  }): Promise<boolean> {
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    const html = replacePlaceholders(
      adminCreatedAccountTemplate({
        fullName: data.fullName,
        role: data.role,
        username: data.username,
        temporaryPassword: data.temporaryPassword,
        loginUrl,
      }),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.email,
      subject: '🎓 Your Eduverse Account is Ready!',
      html,
      text: `Hi ${data.fullName},\n\nYour Eduverse account has been created!\n\nUsername: ${data.username}\nTemporary Password: ${data.temporaryPassword}\n\nLogin at: ${loginUrl}\n\nYou will be required to change your password on first login.`,
    });
  }

  /**
   * Send password reset by admin email
   */
  static async sendPasswordResetByAdminEmail(data: {
    email: string;
    fullName: string;
    username: string;
    temporaryPassword: string;
  }): Promise<boolean> {
    const loginUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/login`;

    const html = replacePlaceholders(
      adminCreatedAccountTemplate({
        fullName: data.fullName,
        role: 'User', // Generic role for reset
        username: data.username,
        temporaryPassword: data.temporaryPassword,
        loginUrl,
      }),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.email,
      subject: '🔒 Your Password Has Been Reset',
      html,
      text: `Hi ${data.fullName},\n\nYour password has been reset by an administrator.\n\nUsername: ${data.username}\nTemporary Password: ${data.temporaryPassword}\n\nLogin at: ${loginUrl}`,
    });
  }

  /**
   * Send password changed confirmation
   */
  static async sendPasswordChangedConfirmation(data: {
    email: string;
    fullName: string;
    changedAt: string;
    ipAddress: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      passwordChangedTemplate({
        fullName: data.fullName,
        changedAt: data.changedAt,
        ipAddress: data.ipAddress,
      }),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.email,
      subject: '✅ Password Changed Successfully',
      html,
      text: `Hi ${data.fullName},\n\nYour password was changed successfully at ${data.changedAt} from IP ${data.ipAddress}.\n\nIf you didn't make this change, contact support immediately.`,
    });
  }

  /**
   * Send assignment posted notification
   */
  static async sendAssignmentPosted(data: {
    studentEmail: string;
    studentName: string;
    assignmentTitle: string;
    courseTitle: string;
    teacherName: string;
    dueDate: string;
    description: string;
    assignmentUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      assignmentPostedTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `📝 New Assignment: ${data.assignmentTitle}`,
      html,
      text: `Hi ${data.studentName},\n\nNew assignment posted: ${data.assignmentTitle}\nCourse: ${data.courseTitle}\nDue: ${data.dueDate}\n\nView at: ${data.assignmentUrl}`,
    });
  }

  /**
   * Send assignment due soon reminder
   */
  static async sendAssignmentDueSoon(data: {
    studentEmail: string;
    studentName: string;
    assignmentTitle: string;
    courseTitle: string;
    dueDate: string;
    hoursRemaining: number;
    assignmentUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      assignmentDueSoonTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `⏰ Assignment Due Soon: ${data.assignmentTitle} (${data.hoursRemaining}h remaining)`,
      html,
      text: `Hi ${data.studentName},\n\nReminder: ${data.assignmentTitle} is due in ${data.hoursRemaining} hours!\nDue: ${data.dueDate}\n\nSubmit at: ${data.assignmentUrl}`,
    });
  }

  /**
   * Send assignment graded notification
   */
  static async sendAssignmentGraded(data: {
    studentEmail: string;
    studentName: string;
    assignmentTitle: string;
    courseTitle: string;
    score: number;
    maxScore: number;
    percentage: number;
    passed: boolean;
    feedback?: string;
    assignmentUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      assignmentGradedTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `📊 Assignment Graded: ${data.assignmentTitle} - ${data.percentage}%`,
      html,
      text: `Hi ${data.studentName},\n\nYour assignment has been graded!\n\n${data.assignmentTitle}\nScore: ${data.score}/${data.maxScore} (${data.percentage}%)\n\nView at: ${data.assignmentUrl}`,
    });
  }

  /**
   * Send exam scheduled notification
   */
  static async sendExamScheduled(data: {
    studentEmail: string;
    studentName: string;
    examTitle: string;
    courseTitle: string;
    scheduledDate: string;
    duration: number;
    antiCheatEnabled: boolean;
    examUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      examScheduledTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `📅 Exam Scheduled: ${data.examTitle}`,
      html,
      text: `Hi ${data.studentName},\n\nNew exam scheduled: ${data.examTitle}\nDate: ${data.scheduledDate}\nDuration: ${data.duration} minutes\n\nView at: ${data.examUrl}`,
    });
  }

  /**
   * Send exam starting soon reminder
   */
  static async sendExamStartingSoon(data: {
    studentEmail: string;
    studentName: string;
    examTitle: string;
    startsAt: string;
    minutesRemaining: number;
    examUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      examStartingSoonTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `🚨 Exam Starting Soon: ${data.examTitle} (${data.minutesRemaining} min)`,
      html,
      text: `Hi ${data.studentName},\n\nYour exam starts in ${data.minutesRemaining} minutes!\n\n${data.examTitle}\nStarts at: ${data.startsAt}\n\nJoin at: ${data.examUrl}`,
    });
  }

  /**
   * Send exam retake available notification
   */
  static async sendExamRetakeAvailable(data: {
    studentEmail: string;
    studentName: string;
    examTitle: string;
    previousScore: number;
    retakeDeadline: string;
    examUrl: string;
  }): Promise<boolean> {
    const html = replacePlaceholders(
      examRetakeAvailableTemplate(data),
      {
        unsubscribeUrl: `${process.env.CLIENT_URL}/unsubscribe`,
        preferencesUrl: `${process.env.CLIENT_URL}/settings/notifications`,
        supportUrl: `${process.env.CLIENT_URL}/support`,
      }
    );

    return this.sendEmail({
      to: data.studentEmail,
      subject: `🔄 Retake Available: ${data.examTitle}`,
      html,
      text: `Hi ${data.studentName},\n\nYou can now retake: ${data.examTitle}\nPrevious Score: ${data.previousScore}%\nDeadline: ${data.retakeDeadline}\n\nStart at: ${data.examUrl}`,
    });
  }

  /**
   * Test email configuration
   */
  static async testConnection(): Promise<boolean> {
    try {
      const transport = getTransporter();
      await transport.verify();
      console.log('[Email] SMTP connection verified successfully');
      return true;
    } catch (error: any) {
      console.error('[Email] SMTP connection failed:', error.message);
      return false;
    }
  }
}
