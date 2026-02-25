// server/src/services/email-templates.ts

/**
 * Professional HTML Email Templates for Eduverse
 * All templates are mobile-responsive and follow modern email design best practices
 */

import { getEmailStrings } from '../i18n/emails/index.js';

export interface EmailTemplateData {
    [key: string]: any;
}

/**
 * Base HTML template with header, footer, and consistent styling
 */
export const baseTemplate = (content: string, preheader?: string, lang: string = 'en'): string => `
<!DOCTYPE html>
<html lang="${lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  ${preheader ? `<meta name="description" content="${preheader}">` : ''}
  <title>Eduverse</title>
  <style>
    /* Reset styles */
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    
    /* Base styles */
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    
    /* Container */
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    
    /* Header */
    .header {
      background: linear-gradient(135deg, #f9d406 0%, #f5c400 100%);
      padding: 30px 20px;
      text-align: center;
    }
    
    .logo {
      font-size: 32px;
      font-weight: bold;
      color: #1e293b;
      margin: 0;
      text-decoration: none;
    }
    
    /* Content */
    .content {
      padding: 40px 30px;
      color: #1e293b;
      line-height: 1.6;
    }
    
    .content h1 {
      font-size: 24px;
      margin: 0 0 20px 0;
      color: #1e293b;
    }
    
    .content h2 {
      font-size: 20px;
      margin: 30px 0 15px 0;
      color: #334155;
    }
    
    .content p {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #475569;
    }
    
    /* Button */
    .button {
      display: inline-block;
      padding: 14px 32px;
      margin: 20px 0;
      background: linear-gradient(135deg, #f9d406 0%, #f5c400 100%);
      color: #1e293b !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      font-size: 16px;
      box-shadow: 0 4px 6px rgba(249, 212, 6, 0.3);
      transition: all 0.3s ease;
    }
    
    .button:hover {
      box-shadow: 0 6px 12px rgba(249, 212, 6, 0.4);
      transform: translateY(-2px);
    }
    
    /* Info Box */
    .info-box {
      background-color: #f8fafc;
      border-left: 4px solid #f9d406;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .info-box p {
      margin: 5px 0;
    }
    
    /* Alert Box */
    .alert-box {
      background-color: #fef2f2;
      border-left: 4px solid #ef4444;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    .success-box {
      background-color: #f0fdf4;
      border-left: 4px solid #10b981;
      padding: 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    
    /* Badge */
    .badge {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge-success { background-color: #10b981; color: white; }
    .badge-warning { background-color: #f59e0b; color: white; }
    .badge-error { background-color: #ef4444; color: white; }
    .badge-info { background-color: #3b82f6; color: white; }
    
    /* Stats */
    .stats-container {
      display: table;
      width: 100%;
      margin: 20px 0;
    }
    
    .stat-item {
      display: table-cell;
      text-align: center;
      padding: 15px;
      background-color: #f8fafc;
      border-radius: 8px;
    }
    
    .stat-value {
      font-size: 28px;
      font-weight: bold;
      color: #f9d406;
      display: block;
    }
    
    .stat-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 5px;
    }
    
    /* Footer */
    .footer {
      background-color: #f8fafc;
      padding: 30px 20px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
    }
    
    .footer p {
      margin: 5px 0;
      font-size: 14px;
      color: #64748b;
    }
    
    .footer a {
      color: #f9d406;
      text-decoration: none;
      font-weight: 500;
    }
    
    .footer a:hover {
      text-decoration: underline;
    }
    
    .social-links {
      margin: 20px 0;
    }
    
    .social-links a {
      display: inline-block;
      margin: 0 10px;
      color: #64748b;
      text-decoration: none;
    }
    
    /* Responsive */
    @media only screen and (max-width: 600px) {
      .email-container {
        width: 100% !important;
      }
      
      .content {
        padding: 30px 20px !important;
      }
      
      .content h1 {
        font-size: 22px !important;
      }
      
      .button {
        display: block !important;
        width: 100% !important;
        box-sizing: border-box;
      }
      
      .stat-item {
        display: block !important;
        margin-bottom: 10px;
      }
    }
  </style>
</head>
<body>
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6; padding: 20px 0;">
    <tr>
      <td align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" class="email-container">
          <!-- Header -->
          <tr>
            <td class="header">
              <h1 class="logo">🎓 Eduverse</h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td class="content">
              ${content}
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td class="footer">
              <p style="margin-bottom: 15px;">
                <strong>Eduverse Learning Platform</strong>
              </p>
              <p>© ${new Date().getFullYear()} Eduverse. All rights reserved.</p>
              <p style="margin-top: 15px;">
                <a href="{{unsubscribeUrl}}">Unsubscribe</a> | 
                <a href="{{preferencesUrl}}">Email Preferences</a> | 
                <a href="{{supportUrl}}">Support</a>
              </p>
              <div class="social-links">
                <a href="#">Twitter</a> | 
                <a href="#">Facebook</a> | 
                <a href="#">LinkedIn</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

const EN_WELCOME: Record<string, string> = {
    heading: "Welcome to Eduverse! 🎉",
    hi: "Hi",
    thankYou: "Thank you for joining Eduverse as a",
    intro: "We're excited to have you on board! Eduverse is your all-in-one learning platform designed to make education engaging, interactive, and effective.",
    gettingStarted: "🚀 Getting Started:",
    goToDashboard: "Go to Dashboard",
    support: "If you have any questions, our support team is here to help!",
    bestRegards: "Best regards,",
    team: "The Eduverse Team",
    subject: "Welcome to Eduverse! Start your learning journey today.",
};

/**
 * Welcome Email Template (locale-aware when locale is provided)
 */
export const welcomeEmailTemplate = (data: {
    fullName: string;
    role: string;
    dashboardUrl: string;
}, locale?: string): string => {
    let s: Record<string, string> | null = null;
    if (locale) {
        try {
            s = getEmailStrings(locale).welcome ?? null;
        } catch (_) {}
    }
    const t = (key: string) => (s && s[key]) ?? EN_WELCOME[key];

    const content = `
    <h1>${t('heading')}</h1>
    <p>${t('hi')} <strong>${data.fullName}</strong>,</p>
    <p>${t('thankYou')} <span class="badge badge-info">${data.role}</span>.</p>
    <p>${t('intro')}</p>
    
    <div class="info-box">
      <p><strong>${t('gettingStarted')}</strong></p>
      <p>• Explore your personalized dashboard</p>
      <p>• ${data.role === 'student' ? 'Browse available courses and enroll' : 'Create your first course'}</p>
      <p>• ${data.role === 'student' ? 'Track your progress and achievements' : 'Manage your students and assignments'}</p>
      <p>• Connect with peers and instructors</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.dashboardUrl}" class="button">${t('goToDashboard')}</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">${t('support')}</p>
    <p>${t('bestRegards')}<br><strong>${t('team')}</strong></p>
  `;

    const preheader = t('subject');
    return baseTemplate(content, preheader, locale?.startsWith('ar') ? 'ar' : 'en');
};

/**
 * Email Verification Template
 */
export const emailVerificationTemplate = (data: {
    fullName: string;
    verificationUrl: string;
    expiresIn: string;
}): string => {
    const content = `
    <h1>Verify Your Email Address</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>Thank you for signing up for Eduverse! To complete your registration and activate your account, please verify your email address.</p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.verificationUrl}" class="button">Verify Email Address</a>
        </td>
      </tr>
    </table>
    
    <div class="info-box">
      <p><strong>⏰ Important:</strong> This verification link will expire in <strong>${data.expiresIn}</strong>.</p>
    </div>
    
    <p>If you didn't create an account with Eduverse, you can safely ignore this email.</p>
    
    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="word-break: break-all; color: #3b82f6;">${data.verificationUrl}</span>
    </p>
  `;

    return baseTemplate(content, `Verify your email to activate your Eduverse account`);
};

/**
 * Password Reset Template
 */
export const passwordResetTemplate = (data: {
    fullName: string;
    resetUrl: string;
    expiresIn: string;
}): string => {
    const content = `
    <h1>Reset Your Password</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>We received a request to reset your password for your Eduverse account. Click the button below to create a new password:</p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.resetUrl}" class="button">Reset Password</a>
        </td>
      </tr>
    </table>
    
    <div class="alert-box">
      <p><strong>⚠️ Security Notice:</strong></p>
      <p>• This link will expire in <strong>${data.expiresIn}</strong></p>
      <p>• If you didn't request this, please ignore this email</p>
      <p>• Your password won't change until you create a new one</p>
    </div>
    
    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      If the button doesn't work, copy and paste this link:<br>
      <span style="word-break: break-all; color: #3b82f6;">${data.resetUrl}</span>
    </p>
  `;

    return baseTemplate(content, `Reset your Eduverse password`);
};

/**
 * Password Changed Confirmation Template
 */
export const passwordChangedTemplate = (data: {
    fullName: string;
    changedAt: string;
    ipAddress: string;
}): string => {
    const content = `
    <h1>Password Changed Successfully</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    
    <div class="success-box">
      <p><strong>✅ Your password has been changed successfully.</strong></p>
    </div>
    
    <div class="info-box">
      <p><strong>Change Details:</strong></p>
      <p>• Time: ${data.changedAt}</p>
      <p>• IP Address: ${data.ipAddress}</p>
    </div>
    
    <div class="alert-box">
      <p><strong>⚠️ Didn't make this change?</strong></p>
      <p>If you didn't change your password, please contact our support team immediately and secure your account.</p>
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
        <tr>
          <td align="center">
            <a href="{{supportUrl}}" class="button">Contact Support</a>
          </td>
        </tr>
      </table>
    </div>
  `;

    return baseTemplate(content, `Your Eduverse password has been changed`);
};

/**
 * Suspicious Login Alert Template
 */
export const suspiciousLoginTemplate = (data: {
    fullName: string;
    loginTime: string;
    ipAddress: string;
    location: string;
    device: string;
    secureAccountUrl: string;
}): string => {
    const content = `
    <h1>🔒 Unusual Login Detected</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>We detected a login to your Eduverse account from a new device or location.</p>
    
    <div class="alert-box">
      <p><strong>Login Details:</strong></p>
      <p>• Time: ${data.loginTime}</p>
      <p>• Location: ${data.location}</p>
      <p>• IP Address: ${data.ipAddress}</p>
      <p>• Device: ${data.device}</p>
    </div>
    
    <p><strong>Was this you?</strong></p>
    <p>If you recognize this activity, you can safely ignore this email.</p>
    
    <p><strong>Don't recognize this login?</strong></p>
    <p>Please secure your account immediately:</p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.secureAccountUrl}" class="button">Secure My Account</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 20px; font-size: 14px; color: #64748b;">
      This will allow you to change your password and review recent account activity.
    </p>
  `;

    return baseTemplate(content, `Unusual login detected on your Eduverse account`);
};

/**
 * Grade Notification Template
 */
export const gradeNotificationTemplate = (data: {
    studentName: string;
    examTitle: string;
    score: number;
    percentage: number;
    passed: boolean;
    feedback?: string;
    viewResultsUrl: string;
}): string => {
    const statusBadge = data.passed
        ? '<span class="badge badge-success">Passed ✓</span>'
        : '<span class="badge badge-error">Needs Improvement</span>';

    const content = `
    <h1>📊 New Grade Posted</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>Your exam has been graded and the results are now available!</p>
    
    <div class="${data.passed ? 'success-box' : 'info-box'}">
      <h2 style="margin-top: 0;">${data.examTitle}</h2>
      <div style="text-align: center; margin: 20px 0;">
        <span class="stat-value" style="font-size: 48px; color: ${data.passed ? '#10b981' : '#f59e0b'};">
          ${data.percentage}%
        </span>
        <p style="margin: 10px 0;">Score: ${data.score} points</p>
        ${statusBadge}
      </div>
    </div>
    
    ${data.feedback ? `
      <div class="info-box">
        <p><strong>Teacher Feedback:</strong></p>
        <p>${data.feedback}</p>
      </div>
    ` : ''}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.viewResultsUrl}" class="button">View Full Results</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">Keep up the great work!</p>
    <p>Best regards,<br><strong>The Eduverse Team</strong></p>
  `;

    return baseTemplate(content, `Your grade for ${data.examTitle} is ready`);
};

/**
 * Helper function to replace placeholders in templates
 */
export const replacePlaceholders = (template: string, data: Record<string, string>): string => {
    let result = template;
    Object.keys(data).forEach(key => {
        const placeholder = `{{${key}}}`;
        result = result.replace(new RegExp(placeholder, 'g'), data[key]);
    });
    return result;
};
