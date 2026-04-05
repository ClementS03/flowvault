import nodemailer from 'nodemailer';

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? `FlowVault <contact@clement-seguin.fr>`;

  if (!apiKey) {
    throw new Error('[sendEmail] RESEND_API_KEY is not set');
  }

  console.log(`[sendEmail] Sending to=${to} from=${from} subject="${subject}"`);

  // Transporter is created per-call so env vars are always read at runtime
  const transporter = nodemailer.createTransport({
    host: 'smtp.resend.com',
    port: 465,
    secure: true,
    auth: { user: 'resend', pass: apiKey },
  });

  const info = await transporter.sendMail({ from, to, subject, html });
  console.log(`[sendEmail] Sent — messageId=${info.messageId}`);
}
