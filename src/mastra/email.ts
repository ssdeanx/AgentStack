import nodemailer from 'nodemailer';

type AuthMail = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

const smtpHost = process.env.SMTP_HOST?.trim();
const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const smtpSecure = process.env.SMTP_SECURE === 'true';
const smtpUser = process.env.SMTP_USER?.trim();
const smtpPass = process.env.SMTP_PASS?.trim();
const smtpFrom = process.env.SMTP_FROM?.trim() ?? smtpUser ?? 'no-reply@localhost';

const transport = smtpHost
  ? nodemailer.createTransport({
      host: smtpHost,
      port: Number.isNaN(smtpPort) ? 587 : smtpPort,
      secure: smtpSecure,
      auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
    })
  : null;

/**
 * Sends a transactional email for Better Auth flows.
 */
export async function sendAuthEmail(mail: AuthMail) {
  if (!transport) {
    throw new Error(
      'SMTP_HOST is not configured. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM to send auth emails.',
    );
  }

  await transport.sendMail({
    from: smtpFrom,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });
}

/**
 * Builds the verification email body.
 */
export function buildVerificationEmail(args: {
  name?: string | null;
  url: string;
}) {
  const greeting = args.name ? `Hi ${args.name},` : 'Hi there,';

  return {
    subject: 'Verify your email for AgentStack',
    text: `${greeting}\n\nPlease verify your email address by opening this link:\n${args.url}\n\nIf you did not request this, you can ignore this email.`,
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
        <p>${greeting}</p>
        <p>Please verify your email address by clicking the button below:</p>
        <p>
          <a href="${args.url}" style="display:inline-block;background:#111827;color:#fff;text-decoration:none;padding:12px 18px;border-radius:8px">
            Verify email
          </a>
        </p>
        <p>If the button does not work, copy and paste this URL into your browser:</p>
        <p style="word-break:break-all">${args.url}</p>
        <p>If you did not request this, you can ignore this email.</p>
      </div>
    `,
  };
}