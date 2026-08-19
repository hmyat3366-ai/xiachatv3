import nodemailer from 'nodemailer';

const EMAIL_HOST = process.env.EMAIL_HOST || '';
const EMAIL_PORT = parseInt(process.env.EMAIL_PORT || '587', 10);
const EMAIL_USER = process.env.EMAIL_USER || '';
const EMAIL_PASS = process.env.EMAIL_PASS || '';
const EMAIL_FROM = process.env.EMAIL_FROM || 'Xia Chat <noreply@xiachat.ai>';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Determine if SMTP is properly configured
function isSmtpConfigured(): boolean {
  return Boolean(EMAIL_HOST && EMAIL_USER && EMAIL_PASS);
}

// Create transporter only when configured
function createTransporter() {
  if (!isSmtpConfigured()) return null;

  return nodemailer.createTransport({
    host: EMAIL_HOST,
    port: EMAIL_PORT,
    secure: EMAIL_PORT === 465,
    auth: {
      user: EMAIL_USER,
      pass: EMAIL_PASS,
    },
  });
}

async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<boolean> {
  const transporter = createTransporter();

  if (!transporter) {
    // Graceful dev fallback: log to console
    console.log('\n📧 [Xia Chat Email Service — Dev Mode / SMTP Not Configured]');
    console.log(`   To:      ${options.to}`);
    console.log(`   Subject: ${options.subject}`);
    console.log(`   Body:\n${options.text}`);
    console.log('─────────────────────────────────────────────────────────\n');
    return true;
  }

  try {
    await transporter.sendMail({
      from: EMAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });
    return true;
  } catch (err) {
    // Never log sensitive email content — just log the failure
    console.error('[Xia Chat Email Service] Failed to send email:', (err as Error).message);
    return false;
  }
}

// ─── PASSWORD RESET EMAIL ────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetToken: string
): Promise<boolean> {
  const resetUrl = `${FRONTEND_URL}?token=${resetToken}`;

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
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #E8E8E5;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#171717;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:#FF8A2A;border-radius:12px;display:inline-block;"></div>
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Xia<span style="color:#FF8A2A;">Chat</span></span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#171717;">Reset your password</h1>
              <p style="margin:0 0 24px;color:#6B6B6B;font-size:15px;line-height:1.6;">
                Hi ${name.split(' ')[0]}, we received a request to reset your Xia Chat password. Click the button below to choose a new password. This link expires in <strong>15 minutes</strong>.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${resetUrl}" style="display:inline-block;background:#FF8A2A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;">
                  Reset Password →
                </a>
              </div>
              <p style="margin:24px 0 0;color:#8E8E93;font-size:13px;line-height:1.6;">
                If you didn't request a password reset, you can safely ignore this email. Your password will not change.
              </p>
              <p style="margin:8px 0 0;color:#8E8E93;font-size:13px;">
                For security, never share this link with anyone.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #E8E8E5;">
              <p style="margin:0;color:#8E8E93;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Xia Chat · Automated email, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Reset your Xia Chat password

Hi ${name.split(' ')[0]},

We received a request to reset your Xia Chat password.
Click the link below to choose a new password (expires in 15 minutes):

${resetUrl}

If you didn't request this, you can safely ignore this email.

— The Xia Chat Team
  `.trim();

  return sendEmail({
    to,
    subject: 'Reset your Xia Chat password',
    html,
    text,
  });
}

// ─── EMAIL VERIFICATION EMAIL ────────────────────────────────────────────────

export async function sendVerificationEmail(
  to: string,
  name: string,
  verificationToken: string
): Promise<boolean> {
  const verifyUrl = `${FRONTEND_URL}/api/auth/verify-email?token=${verificationToken}`;

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
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:24px;border:1px solid #E8E8E5;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#171717;padding:32px 40px;text-align:center;">
              <div style="display:inline-flex;align-items:center;gap:10px;">
                <div style="width:40px;height:40px;background:#FF8A2A;border-radius:12px;display:inline-block;"></div>
                <span style="color:#ffffff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Xia<span style="color:#FF8A2A;">Chat</span></span>
              </div>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <h1 style="margin:0 0 8px;font-size:24px;font-weight:800;color:#171717;">Welcome to Xia Chat! 🎉</h1>
              <p style="margin:0 0 24px;color:#6B6B6B;font-size:15px;line-height:1.6;">
                Hi ${name.split(' ')[0]}, thanks for signing up. Please verify your email address to unlock full access to your Xia Chat dashboard and AI email reporting features.
              </p>
              <div style="text-align:center;margin:32px 0;">
                <a href="${verifyUrl}" style="display:inline-block;background:#FF8A2A;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:100px;">
                  Verify Email Address →
                </a>
              </div>
              <p style="margin:24px 0 0;color:#8E8E93;font-size:13px;line-height:1.6;">
                This link expires in <strong>24 hours</strong>. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#FAF9F6;padding:20px 40px;border-top:1px solid #E8E8E5;">
              <p style="margin:0;color:#8E8E93;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Xia Chat · Automated email, please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const text = `
Welcome to Xia Chat!

Hi ${name.split(' ')[0]},

Please verify your email address to unlock full access:

${verifyUrl}

This link expires in 24 hours.

— The Xia Chat Team
  `.trim();

  return sendEmail({
    to,
    subject: 'Verify your Xia Chat email address',
    html,
    text,
  });
}
