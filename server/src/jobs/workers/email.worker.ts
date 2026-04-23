import { EmailService, EmailOptions } from '../../services/email.service.js';

export async function handleSendEmail(jobData: EmailOptions) {
    const success = await EmailService.sendEmailSync(jobData);
    if (!success) {
        throw new Error('Email sending failed in EmailService');
    }
}
