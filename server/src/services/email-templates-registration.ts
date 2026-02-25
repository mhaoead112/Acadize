// server/src/services/email-templates-registration.ts

/**
 * Email Templates for Registration and Payment Flow
 * These templates are specifically for the registration payment gateway feature
 */

import { baseTemplate } from './email-templates';

/**
 * Registration Success Email Template
 * Sent when user successfully completes registration and payment
 */
export const registrationSuccessTemplate = (data: {
    fullName: string;
    role: string;
    email: string;
    subscriptionPlan: 'monthly' | 'annual';
    amountPaid: string;
    currency: string;
    nextBillingDate: string;
    dashboardUrl: string;
    invoiceUrl?: string;
}): string => {
    const planDisplay = data.subscriptionPlan === 'monthly' ? 'Monthly' : 'Annual';

    const content = `
    <h1>🎉 Welcome to Acadize!</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>Congratulations! Your registration is complete and your account is now active.</p>
    
    <div class="success-box">
      <p><strong>✅ Payment Successful</strong></p>
      <p>Your payment of <strong>${data.amountPaid} ${data.currency}</strong> has been processed successfully.</p>
    </div>
    
    <div class="info-box">
      <p><strong>📋 Account Details:</strong></p>
      <p>• Email: ${data.email}</p>
      <p>• Role: <span class="badge badge-info">${data.role}</span></p>
      <p>• Subscription: <span class="badge badge-success">${planDisplay} Plan</span></p>
      <p>• Next Billing Date: ${data.nextBillingDate}</p>
    </div>
    
    <h2>🚀 What's Next?</h2>
    <p>Get started with your learning journey:</p>
    
    <div class="info-box">
      ${data.role === 'student' ? `
        <p>• <strong>Explore Courses:</strong> Browse our extensive course catalog</p>
        <p>• <strong>Track Progress:</strong> Monitor your learning achievements</p>
        <p>• <strong>Join Community:</strong> Connect with fellow students</p>
        <p>• <strong>Access Resources:</strong> Download materials and study guides</p>
      ` : data.role === 'teacher' ? `
        <p>• <strong>Create Courses:</strong> Design engaging learning experiences</p>
        <p>• <strong>Manage Students:</strong> Track student progress and performance</p>
        <p>• <strong>Create Exams:</strong> Build assessments with our exam builder</p>
        <p>• <strong>Analytics:</strong> View detailed performance insights</p>
      ` : `
        <p>• <strong>Monitor Progress:</strong> Track your child's learning journey</p>
        <p>• <strong>View Reports:</strong> Access detailed performance reports</p>
        <p>• <strong>Communicate:</strong> Stay connected with teachers</p>
        <p>• <strong>Support Learning:</strong> Help your child succeed</p>
      `}
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.dashboardUrl}" class="button">Go to Dashboard</a>
        </td>
      </tr>
    </table>
    
    ${data.invoiceUrl ? `
      <p style="margin-top: 30px; text-align: center;">
        <a href="${data.invoiceUrl}" style="color: #f9d406; text-decoration: none; font-weight: 500;">
          📄 Download Invoice
        </a>
      </p>
    ` : ''}
    
    <div class="info-box" style="margin-top: 30px;">
      <p><strong>💡 Pro Tip:</strong></p>
      <p>Complete your profile to get personalized course recommendations and connect with the community!</p>
    </div>
    
    <p style="margin-top: 30px;">Need help getting started? Our support team is here for you 24/7.</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Welcome to Acadize! Your account is now active.`);
};

/**
 * Trial Activation Email Template
 * Sent when user activates a free trial
 */
export const trialActivationTemplate = (data: {
    fullName: string;
    role: string;
    trialDays: number;
    trialEndDate: string;
    dashboardUrl: string;
}): string => {
    const content = `
    <h1>🎁 Your Free Trial is Active!</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>Great news! Your <strong>${data.trialDays}-day free trial</strong> has been activated.</p>
    
    <div class="success-box">
      <p><strong>✅ Trial Started</strong></p>
      <p>You now have full access to all Acadize features until <strong>${data.trialEndDate}</strong>.</p>
    </div>
    
    <div class="info-box">
      <p><strong>🎯 What's Included:</strong></p>
      <p>• Full platform access</p>
      <p>• All premium features</p>
      <p>• Unlimited courses and materials</p>
      <p>• Priority support</p>
      <p>• No credit card required</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.dashboardUrl}" class="button">Start Exploring</a>
        </td>
      </tr>
    </table>
    
    <div class="info-box" style="margin-top: 30px;">
      <p><strong>⏰ Trial Reminder:</strong></p>
      <p>We'll send you a reminder 3 days before your trial ends. You can upgrade to a paid plan anytime to continue enjoying Acadize.</p>
    </div>
    
    <p style="margin-top: 30px;">Make the most of your trial and explore everything Acadize has to offer!</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Your ${data.trialDays}-day free trial is now active!`);
};

/**
 * Payment Retry Email Template
 * Sent when payment fails and user needs to retry
 */
export const paymentRetryTemplate = (data: {
    fullName: string;
    email: string;
    role: string;
    subscriptionPlan: 'monthly' | 'annual';
    amountDue: string;
    currency: string;
    retryUrl: string;
    expiresIn: string;
    attemptNumber: number;
    maxAttempts: number;
}): string => {
    const planDisplay = data.subscriptionPlan === 'monthly' ? 'Monthly' : 'Annual';
    const attemptsRemaining = data.maxAttempts - data.attemptNumber;

    const content = `
    <h1>⚠️ Payment Unsuccessful</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>We encountered an issue processing your payment for your Acadize ${planDisplay} subscription.</p>
    
    <div class="alert-box">
      <p><strong>Payment Failed</strong></p>
      <p>Amount: <strong>${data.amountDue} ${data.currency}</strong></p>
      <p>Subscription: ${planDisplay} Plan</p>
    </div>
    
    <h2>🔄 Retry Your Payment</h2>
    <p>Don't worry! You can easily retry your payment and activate your account.</p>
    
    <div class="info-box">
      <p><strong>Your Registration Details:</strong></p>
      <p>• Email: ${data.email}</p>
      <p>• Role: <span class="badge badge-info">${data.role}</span></p>
      <p>• Selected Plan: ${planDisplay}</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.retryUrl}" class="button">Retry Payment Now</a>
        </td>
      </tr>
    </table>
    
    <div class="info-box" style="margin-top: 30px;">
      <p><strong>⏰ Important:</strong></p>
      <p>• This retry link will expire in <strong>${data.expiresIn}</strong></p>
      <p>• Attempts remaining: <strong>${attemptsRemaining} of ${data.maxAttempts}</strong></p>
      <p>• Your registration information is saved - no need to re-enter details</p>
    </div>
    
    <h2>💳 Common Payment Issues</h2>
    <div class="info-box">
      <p>If your payment failed, it might be due to:</p>
      <p>• Insufficient funds in your account</p>
      <p>• Incorrect card details</p>
      <p>• Card expired or blocked</p>
      <p>• Bank security restrictions</p>
      <p>• Daily transaction limit reached</p>
    </div>
    
    <p style="margin-top: 30px;"><strong>Need Help?</strong></p>
    <p>If you continue to experience issues, please contact your bank or our support team for assistance.</p>
    
    <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <span style="word-break: break-all; color: #3b82f6;">${data.retryUrl}</span>
    </p>
    
    <p style="margin-top: 30px;">We're here to help you get started!</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Retry your payment to activate your Acadize account`);
};

/**
 * Payment Retry Reminder Email Template
 * Sent as a reminder before retry link expires
 */
export const paymentRetryReminderTemplate = (data: {
    fullName: string;
    retryUrl: string;
    expiresIn: string;
    amountDue: string;
    currency: string;
}): string => {
    const content = `
    <h1>⏰ Reminder: Complete Your Payment</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>This is a friendly reminder that your payment retry link will expire soon.</p>
    
    <div class="alert-box">
      <p><strong>⚠️ Action Required</strong></p>
      <p>Your payment link expires in <strong>${data.expiresIn}</strong></p>
      <p>Amount due: <strong>${data.amountDue} ${data.currency}</strong></p>
    </div>
    
    <p>Complete your payment now to activate your Acadize account and start your learning journey!</p>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.retryUrl}" class="button">Complete Payment</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">If you have any questions or need assistance, our support team is ready to help.</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Complete your Acadize payment - link expiring soon`);
};

/**
 * Payment Maximum Attempts Reached Template
 * Sent when user has exhausted all payment retry attempts
 */
export const paymentMaxAttemptsTemplate = (data: {
    fullName: string;
    email: string;
    supportUrl: string;
}): string => {
    const content = `
    <h1>❌ Payment Attempts Exceeded</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>We noticed that you've reached the maximum number of payment attempts for your Acadize registration.</p>
    
    <div class="alert-box">
      <p><strong>What This Means:</strong></p>
      <p>Your payment retry link is no longer active. To complete your registration, please contact our support team.</p>
    </div>
    
    <h2>🤝 We're Here to Help</h2>
    <p>Our support team can:</p>
    
    <div class="info-box">
      <p>• Help troubleshoot payment issues</p>
      <p>• Provide alternative payment methods</p>
      <p>• Reset your registration if needed</p>
      <p>• Answer any questions you have</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.supportUrl}" class="button">Contact Support</a>
        </td>
      </tr>
    </table>
    
    <div class="info-box" style="margin-top: 30px;">
      <p><strong>Your Information:</strong></p>
      <p>Email: ${data.email}</p>
      <p>Please reference this email when contacting support for faster assistance.</p>
    </div>
    
    <p style="margin-top: 30px;">We apologize for any inconvenience and look forward to helping you join Acadize!</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Payment assistance needed for your Acadize account`);
};

/**
 * Subscription Activated Email Template
 * Sent when payment is successful after a retry
 */
export const subscriptionActivatedTemplate = (data: {
    fullName: string;
    subscriptionPlan: 'monthly' | 'annual';
    amountPaid: string;
    currency: string;
    nextBillingDate: string;
    dashboardUrl: string;
}): string => {
    const planDisplay = data.subscriptionPlan === 'monthly' ? 'Monthly' : 'Annual';

    const content = `
    <h1>✅ Payment Successful!</h1>
    <p>Hi <strong>${data.fullName}</strong>,</p>
    <p>Great news! Your payment has been processed successfully and your Acadize account is now active.</p>
    
    <div class="success-box">
      <p><strong>🎉 Account Activated</strong></p>
      <p>Payment of <strong>${data.amountPaid} ${data.currency}</strong> received</p>
      <p>Subscription: <span class="badge badge-success">${planDisplay} Plan</span></p>
    </div>
    
    <div class="info-box">
      <p><strong>📅 Billing Information:</strong></p>
      <p>Next billing date: ${data.nextBillingDate}</p>
      <p>You can manage your subscription anytime from your account settings.</p>
    </div>
    
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
      <tr>
        <td align="center">
          <a href="${data.dashboardUrl}" class="button">Access Your Dashboard</a>
        </td>
      </tr>
    </table>
    
    <p style="margin-top: 30px;">Thank you for choosing Acadize. We're excited to be part of your learning journey!</p>
    <p>Best regards,<br><strong>The Acadize Team</strong></p>
  `;

    return baseTemplate(content, `Your Acadize subscription is now active!`);
};
