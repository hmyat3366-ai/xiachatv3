/**
 * Xia Chat v3 — Email Service
 * Supports two transports, selected by environment configuration:
 *   1. Resend HTTP API  (RESEND_API_KEY set)          ← preferred, simpler
 *   2. Nodemailer SMTP  (EMAIL_HOST + EMAIL_USER set)  ← fallback / self-hosted
 *   3. Console log dev  (neither configured)           ← local dev
 */
import nodemailer from 'nodemailer';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Xia Chat <noreply@xiachat.ai>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

type EmailPayload = { to: string; subject: string; html: string; text: string };

/** Send via Resend HTTP API */
async function sendViaResend(opts: EmailPayload): Promise<boolean> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      console.error('[Resend] Failed to send email:', body);
      return false;
    }
    return true;
  } catch (err) {
    console.error('[Resend] Network error:', (err as Error).message);
    return false;
  }
}

/** Send via Nodemailer SMTP */
async function sendViaSmtp(opts: EmailPayload): Promise<boolean> {
  try {
    const transporter = nodemailer.createTransport({
      host: EMAIL_HOST,
      port: EMAIL_PORT,
      secure: EMAIL_PORT === 465,
      auth: { user: EMAIL_USER, pass: EMAIL_PASS },
    });
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    return true;
  } catch (err) {
    console.error('[SMTP] Failed to send email:', (err as Error).message);
    return false;
  }
}

/** Master send function — picks best available transport */
async function sendEmail(opts: EmailPayload): Promise<boolean> {
  if (RESEND_API_KEY) {
    return sendViaResend(opts);
  }
  if (EMAIL_HOST && EMAIL_USER && EMAIL_PASS) {
    return sendViaSmtp(opts);
  }
  // Dev console fallback
  console.log('\n📧 [Xia Chat Email — Dev Mode / No Transport Configured]');
  console.log(`   To:      ${opts.to}`);
  console.log(`   Subject: ${opts.subject}`);
  console.log(`   Body:\n${opts.text}`);
  console.log('─────────────────────────────────────────────────────────\n');
  return true;
}

// ─── PASSWORD RESET EMAIL ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  codeOrToken: string
): Promise<boolean> {
  const firstName = name.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Xia Chat Password</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #E8E8E5;overflow:hidden;">
        <tr><td style="background:#171717;padding:32px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Xia<span style="color:#FF8A2A;">Chat</span></span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#171717;">Reset your password</h1>
          <p style="margin:0 0 20px;color:#6B6B6B;font-size:15px;line-height:1.6;">
            Hi ${firstName}, we received a request to reset your Xia Chat password. Use the 6-digit verification code below to set a new password.
          </p>
          <div style="background:#FAF9F6;border:2px dashed #FF8A2A;border-radius:16px;padding:24px;text-align:center;margin:28px 0;">
            <div style="font-size:12px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Your 6-Digit Verification Code</div>
            <span style="font-family:monospace,Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#171717;">${codeOrToken}</span>
          </div>
          <p style="margin:24px 0 0;color:#8E8E93;font-size:13px;line-height:1.6;">
            This verification code expires in <strong>15 minutes</strong>. If you didn't request a password reset, you can safely ignore this email.
          </p>
          <p style="margin:8px 0 0;color:#8E8E93;font-size:13px;">For security, never share this code with anyone.</p>
        </td></tr>
        <tr><td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #E8E8E5;">
          <p style="margin:0;color:#8E8E93;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} Xia Chat · Automated email, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Reset your Xia Chat password\n\nHi ${firstName},\n\nYour 6-digit verification code is: ${codeOrToken}\n\nThis code expires in 15 minutes.\n\n— The Xia Chat Team`;

  return sendEmail({ to, subject: `${codeOrToken} is your Xia Chat password reset code`, html, text });
}

// ─── EMAIL VERIFICATION ──────────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  name: string,
  codeOrToken: string
): Promise<boolean> {
  const firstName = name.split(' ')[0] || 'there';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your Xia Chat email</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #E8E8E5;overflow:hidden;">
        <tr><td style="background:#171717;padding:32px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Xia<span style="color:#FF8A2A;">Chat</span></span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#171717;">Welcome to Xia Chat! 🎉</h1>
          <p style="margin:0 0 20px;color:#6B6B6B;font-size:15px;line-height:1.6;">
            Hi ${firstName}, thanks for signing up. Please enter this 6-digit code to verify your account and set up your workspace:
          </p>
          <div style="background:#FAF9F6;border:2px dashed #FF8A2A;border-radius:16px;padding:24px;text-align:center;margin:28px 0;">
            <div style="font-size:12px;font-weight:700;color:#8E8E93;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Your 6-Digit Verification Code</div>
            <span style="font-family:monospace,Courier,monospace;font-size:36px;font-weight:900;letter-spacing:10px;color:#171717;">${codeOrToken}</span>
          </div>
          <p style="margin:24px 0 0;color:#8E8E93;font-size:13px;line-height:1.6;">
            This code expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #E8E8E5;">
          <p style="margin:0;color:#8E8E93;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} Xia Chat · Automated email, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `Welcome to Xia Chat!\n\nHi ${firstName},\n\nYour 6-digit verification code is: ${codeOrToken}\n\nThis code expires in 24 hours.\n\n— The Xia Chat Team`;

  return sendEmail({ to, subject: `${codeOrToken} is your Xia Chat verification code`, html, text });
}

// ─── TEAM INVITATION EMAIL ───────────────────────────────────────────────────

export async function sendTeamInvitationEmail(
  to: string,
  invitedByName: string,
  workspaceName: string,
  role: string,
  inviteToken: string
): Promise<boolean> {
  const inviteUrl = `${FRONTEND_URL}/login?invite=${inviteToken}`;

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to join ${workspaceName} on Xia Chat</title>
</head>
<body style="margin:0;padding:0;background:#F7F7F5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F7F5;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #E8E8E5;overflow:hidden;">
        <tr><td style="background:#171717;padding:32px 40px;text-align:center;">
          <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Xia<span style="color:#FF8A2A;">Chat</span></span>
        </td></tr>
        <tr><td style="padding:40px;">
          <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#171717;">You're invited! 🚀</h1>
          <p style="margin:0 0 24px;color:#6B6B6B;font-size:15px;line-height:1.6;">
            <strong>${invitedByName}</strong> has invited you to join <strong>${workspaceName}</strong> on Xia Chat as a <strong>${role}</strong>.
          </p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${inviteUrl}" style="display:inline-block;background:#FF8A2A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;">
              Accept Invitation →
            </a>
          </div>
          <p style="margin:24px 0 0;color:#8E8E93;font-size:13px;line-height:1.6;">
            This invitation expires in <strong>7 days</strong>. If you weren't expecting this, you can safely ignore this email.
          </p>
        </td></tr>
        <tr><td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #E8E8E5;">
          <p style="margin:0;color:#8E8E93;font-size:12px;text-align:center;">
            © ${new Date().getFullYear()} Xia Chat · Automated email, please do not reply.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim();

  const text = `You're invited to join ${workspaceName} on Xia Chat!\n\n${invitedByName} invited you as ${role}.\n\nAccept your invitation:\n${inviteUrl}\n\nExpires in 7 days.\n\n— The Xia Chat Team`;

  return sendEmail({ to, subject: `${invitedByName} invited you to ${workspaceName} on Xia Chat`, html, text });
}
