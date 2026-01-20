// server/src/services/email-templates.ts - Additional Templates

import { baseTemplate } from './email-templates.js';

/**
/**
 * Admin Created Account - Temporary Password Email
 * Sent when admin creates a new user account
 */
export const adminCreatedAccountTemplate = (data: {
  fullName: string;
  role: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
}): string => {
  // We use a custom full template here to match the dark theme exact design
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eduverse - Account Ready</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      background-color: #0f172a; /* Dark background matching the image */
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #0f172a;
    }
    .header {
      text-align: center;
      padding: 40px 0 20px 0;
    }
    .logo-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #ffd700;
      font-size: 24px;
      font-weight: bold;
      text-decoration: none;
    }
    .hero-image {
      width: 100%;
      height: auto;
      border-radius: 12px 12px 0 0;
      display: block;
      margin-bottom: -4px; /* Fix small gap */
    }
    .card {
      background-color: #1e293b;
      border-radius: 12px;
      overflow: hidden;
      margin: 0 20px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    }
    .card-content {
      padding: 40px;
    }
    .title {
      color: #ffffff;
      font-size: 28px;
      font-weight: 800;
      margin: 0 0 20px 0;
      text-align: center;
    }
    .role-badge {
      display: table;
      margin: 0 auto 30px auto;
      background-color: #1e3a8a;
      color: #60a5fa;
      padding: 6px 16px;
      border-radius: 50px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .welcome-text {
      color: #cbd5e1;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .welcome-text strong {
      color: #ffffff;
    }
    .credentials-box {
      background-color: #334155;
      border: 1px solid #475569;
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 25px;
    }
    .credentials-header {
      background-color: #3f4c2e; /* Olive/dark yellow tone from image */
      background: linear-gradient(90deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%);
      padding: 12px 20px;
      border-bottom: 1px solid #475569;
      display: flex;
      align-items: center;
    }
    .credentials-title {
      color: #facc15;
      font-weight: 700;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin: 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .credential-row {
      padding: 16px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid #475569;
    }
    .credential-row:last-child {
      border-bottom: none;
    }
    .credential-label {
      color: #94a3b8;
      font-size: 14px;
    }
    .credential-value {
      color: #ffffff;
      font-family: monospace;
      font-size: 16px;
      font-weight: 500;
    }
    .security-notice {
      background-color: rgba(220, 38, 38, 0.1);
      border: 1px solid rgba(220, 38, 38, 0.2);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 30px;
    }
    .security-title {
      color: #f87171;
      font-weight: 700;
      font-size: 14px;
      margin: 0 0 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .security-text {
      color: #cbd5e1;
      font-size: 13px;
      margin: 0;
      line-height: 1.5;
    }
    .login-btn {
      display: block;
      width: 100%;
      background-color: #ffd700;
      color: #0f172a;
      text-align: center;
      padding: 16px 0;
      border-radius: 8px;
      font-weight: 800;
      font-size: 16px;
      text-decoration: none;
      transition: background-color 0.2s;
      margin-bottom: 40px;
    }
    .login-btn:hover {
      background-color: #eab308;
    }
    .next-steps-title {
      color: #94a3b8;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .step-item {
      display: flex;
      gap: 16px;
      margin-bottom: 20px;
    }
    .step-number {
      background-color: #ffd700;
      color: #0f172a;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 12px;
      flex-shrink: 0;
      margin-top: 2px;
    }
    .step-content {
      flex: 1;
    }
    .step-title {
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      margin: 0 0 4px 0;
    }
    .step-desc {
      color: #94a3b8;
      font-size: 13px;
      margin: 0;
      line-height: 1.4;
    }
    .footer {
      text-align: center;
      padding: 40px 20px;
      color: #64748b;
    }
    .social-icons {
      margin-bottom: 20px;
    }
    .social-icon {
      display: inline-block;
      width: 32px;
      height: 32px;
      background-color: #334155;
      border-radius: 50%;
      margin: 0 6px;
      text-decoration: none;
      color: #94a3b8;
      line-height: 32px;
      font-size: 14px;
    }
    .copyright {
      font-size: 12px;
      margin-bottom: 10px;
    }
    .footer-links {
      font-size: 12px;
    }
    .footer-link {
      color: #94a3b8;
      text-decoration: underline;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header with Logo -->
    <div class="header">
      <a href="#" class="logo-container">
        <span style="font-size: 24px;">🎓</span>
        <span>Eduverse</span>
      </a>
    </div>

    <!-- Main Card -->
    <div class="card">
      <!-- Abstract Gold Waves Background Image Placeholder -->
      <!-- In production, replace src with actual hosted image URL -->
      <img src="https://images.unsplash.com/photo-1634128221889-b4933a876a39?q=80&w=1200&auto=format&fit=crop" alt="Eduverse Abstract" class="hero-image" style="height: 160px; object-fit: cover;">
      
      <div class="card-content">
        <h1 class="title">Your Eduverse Account is Ready!</h1>
        
        <div class="role-badge">
          <span>👤 ${data.role.toUpperCase()}</span>
        </div>

        <div class="welcome-text">
          Hello, <strong>${data.fullName}</strong>, welcome to the future of learning. Your ${data.role} account is now active and ready for you to explore.
        </div>

        <!-- Credentials Box -->
        <div class="credentials-box">
          <div class="credentials-header">
            <p class="credentials-title">
              <span>🔑</span> LOGIN CREDENTIALS
            </p>
          </div>
          <div class="credential-row">
            <span class="credential-label">Username</span>
            <span class="credential-value">${data.username}</span>
          </div>
          <div class="credential-row">
            <span class="credential-label">Temporary Password</span>
            <span class="credential-value">${data.temporaryPassword}</span>
          </div>
        </div>

        <!-- Security Notice -->
        <div class="security-notice">
          <p class="security-title">
            <span>⚠️</span> Security Notice
          </p>
          <p class="security-text">
            This temporary password is valid for 24 hours only. For your security, please change it immediately after your first login.
          </p>
        </div>

        <!-- Login Button -->
        <a href="${data.loginUrl}" class="login-btn">
          Login to Eduverse ➔
        </a>

        <!-- Next Steps -->
        <div class="next-steps">
          <div class="next-steps-title">NEXT STEPS</div>
          
          <div class="step-item">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3 class="step-title">Access the Platform</h3>
              <p class="step-desc">Click the button above to go to the Eduverse login page.</p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3 class="step-title">Update Password</h3>
              <p class="step-desc">Use your temporary credentials and follow the prompt to set a new one.</p>
            </div>
          </div>

          <div class="step-item">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3 class="step-title">Complete Profile</h3>
              <p class="step-desc">Upload your avatar and select your preferred learning tracks.</p>
            </div>
          </div>
        </div>

      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="social-icons">
        <a href="#" class="social-icon">🌐</a>
        <a href="#" class="social-icon">💬</a>
        <a href="#" class="social-icon">🔗</a>
      </div>
      <p class="copyright">© 2024 Eduverse LMS. All rights reserved.</p>
      <div class="footer-links">
        <a href="#" class="footer-link">Unsubscribe</a>
        <a href="#" class="footer-link">Privacy Policy</a>
        <a href="#" class="footer-link">Support Center</a>
        <a href="#" class="footer-link">Terms of Service</a>
      </div>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Force Password Change Reminder
 * Sent if user hasn't changed temporary password after 24 hours
 */
export const passwordChangeReminderTemplate = (data: {
  fullName: string;
  username: string;
  loginUrl: string;
  expiresIn: string;
}): string => {
  const content = `
    <h1>⚠️ Password Change Required</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>You haven't changed your temporary password yet. For security reasons, you must change it to continue using Eduverse.</p>
    
    <div class="alert-box">
      <p><strong>⏰ Your temporary password will expire in <span style="color: #ef4444; font-size: 18px;">${data.expiresIn}</span></strong></p>
    </div>
    
    <div class="info-box">
      <p><strong>Your Username:</strong> ${data.username}</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.loginUrl}" class="button">Change Password Now</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">If you're having trouble logging in, please contact support.</p>
  `;

  return baseTemplate(content, `Action required: Change your temporary password`);
};

/**
 * Assignment Posted Notification
 */
export const assignmentPostedTemplate = (data: {
  studentName: string;
  assignmentTitle: string;
  courseTitle: string;
  teacherName: string;
  dueDate: string;
  description: string;
  assignmentUrl: string;
}): string => {
  const content = `
    <h1>📝 New Assignment Posted</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p><strong>${data.teacherName}</strong> has posted a new assignment in <strong>${data.courseTitle}</strong>.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0; color: #1e293b;">${data.assignmentTitle}</h2>
      <p><strong>📅 Due Date:</strong> <span style="color: #f59e0b; font-weight: 600;">${data.dueDate}</span></p>
      <p><strong>📚 Course:</strong> ${data.courseTitle}</p>
      <p><strong>👨‍🏫 Teacher:</strong> ${data.teacherName}</p>
    </div>
    
    ${data.description ? `
      <div class="info-box">
        <p><strong>Description:</strong></p>
        <p>${data.description}</p>
      </div>
    ` : ''}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.assignmentUrl}" class="button">View Assignment</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">Good luck! 🍀</p>
  `;

  return baseTemplate(content, `New assignment: ${data.assignmentTitle}`);
};

/**
 * Assignment Due Soon Reminder
 */
export const assignmentDueSoonTemplate = (data: {
  studentName: string;
  assignmentTitle: string;
  courseTitle: string;
  dueDate: string;
  hoursRemaining: number;
  assignmentUrl: string;
}): string => {
  const urgencyColor = data.hoursRemaining <= 6 ? '#ef4444' : '#f59e0b';

  const content = `
    <h1>⏰ Assignment Due Soon!</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>This is a friendly reminder that your assignment is due soon!</p>
    
    <div class="alert-box" style="border-left-color: ${urgencyColor}; background-color: ${data.hoursRemaining <= 6 ? '#fef2f2' : '#fffbeb'};">
      <h2 style="margin-top: 0; color: ${urgencyColor};">${data.assignmentTitle}</h2>
      <p style="font-size: 24px; font-weight: bold; color: ${urgencyColor}; margin: 15px 0;">
        ${data.hoursRemaining} hours remaining
      </p>
      <p><strong>📅 Due:</strong> ${data.dueDate}</p>
      <p><strong>📚 Course:</strong> ${data.courseTitle}</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.assignmentUrl}" class="button">Submit Assignment</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">Don't wait until the last minute! Submit your work now.</p>
  `;

  return baseTemplate(content, `⏰ ${data.assignmentTitle} due in ${data.hoursRemaining} hours`);
};

/**
 * Assignment Graded Notification
 */
export const assignmentGradedTemplate = (data: {
  studentName: string;
  assignmentTitle: string;
  courseTitle: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  feedback?: string;
  assignmentUrl: string;
}): string => {
  const statusColor = data.passed ? '#10b981' : '#f59e0b';
  const statusBadge = data.passed
    ? '<span class="badge badge-success">Passed ✓</span>'
    : '<span class="badge badge-warning">Needs Improvement</span>';

  const content = `
    <h1>📊 Assignment Graded</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>Your assignment has been graded!</p>
    
    <div class="${data.passed ? 'success-box' : 'info-box'}">
      <h2 style="margin-top: 0;">${data.assignmentTitle}</h2>
      <p style="color: #64748b; margin: 5px 0;">${data.courseTitle}</p>
      
      <div style="text-align: center; margin: 20px 0;">
        <span class="stat-value" style="font-size: 48px; color: ${statusColor};">
          ${data.percentage}%
        </span>
        <p style="margin: 10px 0; color: #64748b;">
          ${data.score} / ${data.maxScore} points
        </p>
        ${statusBadge}
      </div>
    </div>
    
    ${data.feedback ? `
      <div class="info-box">
        <p><strong>📝 Teacher Feedback:</strong></p>
        <p style="font-style: italic;">"${data.feedback}"</p>
      </div>
    ` : ''}
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.assignmentUrl}" class="button">View Details</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">${data.passed ? 'Great work! Keep it up! 🎉' : 'Keep practicing and you\'ll improve! 💪'}</p>
  `;

  return baseTemplate(content, `Grade posted: ${data.assignmentTitle} - ${data.percentage}%`);
};

/**
 * Exam Scheduled Notification
 */
export const examScheduledTemplate = (data: {
  studentName: string;
  examTitle: string;
  courseTitle: string;
  scheduledDate: string;
  duration: number;
  antiCheatEnabled: boolean;
  examUrl: string;
}): string => {
  const content = `
    <h1>📅 New Exam Scheduled</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>A new exam has been scheduled in <strong>${data.courseTitle}</strong>.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0; color: #1e293b;">${data.examTitle}</h2>
      <p><strong>📅 Date & Time:</strong> <span style="color: #f9d406; font-weight: 600;">${data.scheduledDate}</span></p>
      <p><strong>⏱️ Duration:</strong> ${data.duration} minutes</p>
      <p><strong>📚 Course:</strong> ${data.courseTitle}</p>
    </div>
    
    ${data.antiCheatEnabled ? `
      <div class="alert-box">
        <p><strong>🔒 Anti-Cheat Monitoring Enabled</strong></p>
        <p>This exam uses proctoring technology. Please ensure:</p>
        <p>• You have a working webcam</p>
        <p>• You're in a quiet, well-lit environment</p>
        <p>• No unauthorized materials are nearby</p>
        <p>• You won't switch tabs or windows during the exam</p>
      </div>
    ` : ''}
    
    <div class="info-box">
      <p><strong>📋 Preparation Tips:</strong></p>
      <p>• Review your course materials</p>
      <p>• Get a good night's sleep</p>
      <p>• Arrive 10 minutes early</p>
      <p>• Have a stable internet connection</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.examUrl}" class="button">View Exam Details</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">Good luck with your preparation! 📚</p>
  `;

  return baseTemplate(content, `Exam scheduled: ${data.examTitle} on ${data.scheduledDate}`);
};

/**
 * Exam Starting Soon Reminder
 */
export const examStartingSoonTemplate = (data: {
  studentName: string;
  examTitle: string;
  startsAt: string;
  minutesRemaining: number;
  examUrl: string;
}): string => {
  const urgencyColor = data.minutesRemaining <= 15 ? '#ef4444' : '#f59e0b';

  const content = `
    <h1>🚨 Exam Starting Soon!</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>Your exam is starting very soon. Make sure you're ready!</p>
    
    <div class="alert-box" style="border-left-color: ${urgencyColor}; background-color: #fef2f2;">
      <h2 style="margin-top: 0; color: ${urgencyColor};">${data.examTitle}</h2>
      <p style="font-size: 36px; font-weight: bold; color: ${urgencyColor}; margin: 15px 0;">
        ${data.minutesRemaining} minutes
      </p>
      <p><strong>⏰ Starts at:</strong> ${data.startsAt}</p>
    </div>
    
    <div class="info-box">
      <p><strong>✅ Final Checklist:</strong></p>
      <p>• Stable internet connection</p>
      <p>• Webcam working (if required)</p>
      <p>• Quiet environment</p>
      <p>• All materials ready</p>
      <p>• Browser updated</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.examUrl}" class="button">Start Exam</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px; color: #ef4444; font-weight: 600;">⚠️ Don't be late! Join now to avoid missing the exam.</p>
  `;

  return baseTemplate(content, `🚨 ${data.examTitle} starts in ${data.minutesRemaining} minutes!`);
};

/**
 * Exam Retake Available Notification
 */
export const examRetakeAvailableTemplate = (data: {
  studentName: string;
  examTitle: string;
  previousScore: number;
  retakeDeadline: string;
  examUrl: string;
}): string => {
  const content = `
    <h1>🔄 Exam Retake Available</h1>
    <p>Hi <strong>${data.studentName}</strong>,</p>
    <p>Good news! You've been granted permission to retake your exam.</p>
    
    <div class="info-box">
      <h2 style="margin-top: 0;">${data.examTitle}</h2>
      <p><strong>Previous Score:</strong> ${data.previousScore}%</p>
      <p><strong>⏰ Retake Deadline:</strong> <span style="color: #f59e0b; font-weight: 600;">${data.retakeDeadline}</span></p>
    </div>
    
    <div class="success-box">
      <p><strong>💡 Tips for Success:</strong></p>
      <p>• Review the questions you missed</p>
      <p>• Study the relevant course materials</p>
      <p>• Take your time and read carefully</p>
      <p>• Your highest score will be recorded</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.examUrl}" class="button">Start Retake</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">This is your chance to improve! Good luck! 🍀</p>
  `;

  return baseTemplate(content, `Retake available: ${data.examTitle}`);
};
