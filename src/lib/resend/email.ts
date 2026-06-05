import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  console.warn('RESEND_API_KEY is not configured. Transactional emails will fail.');
}

const resend = new Resend(resendApiKey);

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  return resend.emails.send({
    from: 'SimpleComm <no-reply@simplecomm.com.ar>',
    to,
    subject,
    html,
  });
}
