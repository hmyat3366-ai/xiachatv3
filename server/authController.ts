import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { db, DbUser } from './db.js';
import { AuthRequest, sanitizeUser } from './authMiddleware.js';
import { sendPasswordResetEmail, sendVerificationEmail } from './emailService.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

// SECURITY: Reject startup with default JWT_SECRET in production
if (process.env.NODE_ENV === 'production' && JWT_SECRET === 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e') {
  throw new Error('[SECURITY] JWT_SECRET is using the insecure dev default. Set a strong, random JWT_SECRET in production environment variables.');
}


const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTokenCookie(res: Response, userId: string) {
  const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
  const isCrossSite = process.env.NODE_ENV === 'production' || (FRONTEND_URL && FRONTEND_URL.startsWith('https://'));

  res.cookie('auth_token', token, {
    httpOnly: true,
    secure: isCrossSite,
    sameSite: isCrossSite ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });

  return token;
}

// Atomic account & workspace provisioning helper
export function provisionNewAccount(params: {
  userId: string;
  name: string;
  email: string;
  username: string;
  passwordHash: string | null;
  authProvider: 'local' | 'google' | 'both';
  googleId: string | null;
  emailVerified: boolean;
}): DbUser {
  const now = new Date().toISOString();

  const createAccountTx = db.transaction(() => {
    // 1. Insert User
    db.prepare(`
      INSERT INTO users (
        id, name, email, username, password_hash, auth_provider, google_id, 
        email_verified, onboarding_completed, onboarding_step, created_at, updated_at, last_login_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 1, ?, ?, ?)
    `).run(
      params.userId,
      params.name.trim(),
      params.email.trim().toLowerCase(),
      params.username,
      params.passwordHash,
      params.authProvider,
      params.googleId,
      params.emailVerified ? 1 : 0,
      now,
      now,
      now
    );

    // 2. Create Default Workspace if not present
    const existingWs = db.prepare('SELECT id FROM workspaces WHERE user_id = ?').get(params.userId) as { id: string } | undefined;

    if (!existingWs) {
      const workspaceId = crypto.randomUUID();
      const firstName = params.name.trim().split(' ')[0] || 'My';
      const cleanWsName = `${firstName}'s Workspace`;
      const baseSlug = `${firstName.toLowerCase().replace(/[^a-z0-9]+/g, '')}-workspace-${crypto.randomBytes(2).toString('hex')}`;

      db.prepare(`
        INSERT INTO workspaces (id, user_id, name, slug, business_type, customer_channels, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
      `).run(workspaceId, params.userId, cleanWsName, baseSlug, now, now);

      // 3. Create WorkspaceMember (Owner role)
      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
        VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
      `).run(crypto.randomUUID(), workspaceId, params.userId, now, now, now);

      // 4. Create Default AI Assistant
      db.prepare(`
        INSERT INTO ai_assistants (id, workspace_id, name, instructions, created_at, updated_at)
        VALUES (?, ?, 'Xia Assistant', 'You are a helpful customer support AI assistant.', ?, ?)
      `).run(crypto.randomUUID(), workspaceId, now, now);
    }
  });

  createAccountTx();

  return db.prepare('SELECT * FROM users WHERE id = ?').get(params.userId) as DbUser;
}

// 1. SIGN UP
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, username, email, password, confirmPassword } = req.body;

    // Frontend & Backend validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    let cleanUsername = '';
    if (username && typeof username === 'string' && username.trim()) {
      cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
      if (cleanUsername.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 alphanumeric characters long.' });
      }
    } else {
      const emailPrefix = email.trim().split('@')[0].toLowerCase().replace(/[^a-z0-9_-]/g, '');
      cleanUsername = `${emailPrefix}_${Math.floor(100 + Math.random() * 900)}`;
    }

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const now = new Date().toISOString();

    // Check existing email
    const existingEmailStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const existingEmailUser = existingEmailStmt.get(normalizedEmail) as DbUser | undefined;

    if (existingEmailUser) {
      if (existingEmailUser.password_hash || existingEmailUser.auth_provider === 'local' || existingEmailUser.auth_provider === 'both') {
        return res.status(409).json({ error: 'An account with this email address already exists. Please sign in instead.' });
      }

      // Existing user was registered via Google only, now setting up email/password
      const passwordHash = bcrypt.hashSync(password, 10);
      const updateUserStmt = db.prepare(`
        UPDATE users
        SET username = COALESCE(username, ?), password_hash = ?, auth_provider = 'both', updated_at = ?, last_login_at = ?
        WHERE id = ?
      `);
      updateUserStmt.run(cleanUsername, passwordHash, now, now, existingEmailUser.id);

      const updatedUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const updatedUser = updatedUserStmt.get(existingEmailUser.id) as DbUser;

      generateTokenCookie(res, updatedUser.id);
      return res.status(201).json({
        message: 'Account updated successfully.',
        user: sanitizeUser(updatedUser),
      });
    }

    // Check existing username
    const existingUsernameStmt = db.prepare('SELECT id FROM users WHERE username = ?');
    if (existingUsernameStmt.get(cleanUsername)) {
      return res.status(409).json({ error: 'Username is already taken. Please choose another username.' });
    }

    // Create brand new user atomically with default Workspace & WorkspaceMember
    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    const newUser = provisionNewAccount({
      userId,
      name: name.trim(),
      email: normalizedEmail,
      username: cleanUsername,
      passwordHash,
      authProvider: 'local',
      googleId: null,
      emailVerified: false,
    });

    // Generate Verification Token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const insertVerifyStmt = db.prepare(`
      INSERT INTO email_verifications (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertVerifyStmt.run(crypto.randomUUID(), userId, verifyTokenHash, expiresAt, now);

    sendVerificationEmail(normalizedEmail, name.trim(), verifyToken).catch(() => {});

    const token = generateTokenCookie(res, newUser.id);

    return res.status(201).json({
      message: 'Account created successfully.',
      user: sanitizeUser(newUser),
      token,
    });
  } catch {
    return res.status(500).json({ error: 'An unexpected server error occurred during signup.' });
  }
};

// 2. LOGIN (Email OR Username)
export const login = async (req: Request, res: Response) => {
  try {
    const { email, username, identifier, password } = req.body;
    const inputIdentifier = (identifier || email || username || '').toString().trim().toLowerCase();

    if (!inputIdentifier || !password || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email/username and password are required.' });
    }

    // Query user by matching email OR username
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ? OR username = ?');
    const user = userStmt.get(inputIdentifier, inputIdentifier) as DbUser | undefined;

    const GENERIC_LOGIN_ERROR = 'Email/username or password is incorrect.';

    if (!user || !user.password_hash) {
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    const isPasswordValid = bcrypt.compareSync(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({ error: GENERIC_LOGIN_ERROR });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);

    user.last_login_at = now;
    const token = generateTokenCookie(res, user.id);

    return res.status(200).json({
      message: 'Logged in successfully.',
      user: sanitizeUser(user),
      token,
    });
  } catch {
    return res.status(500).json({ error: 'An unexpected server error occurred during login.' });
  }
};

// 3. LOGOUT
export const logout = async (req: Request, res: Response) => {
  res.clearCookie('auth_token', { path: '/' });
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// 4. ME (GET CURRENT USER SESSION)
export const getMe = async (req: AuthRequest, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  return res.status(200).json({ user: req.user });
};

// 5. FORGOT PASSWORD (STEP 1 — SEND CODE)
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const GENERIC_SUCCESS_RESPONSE = {
      message: 'If an account matches that email address, verification code instructions have been sent.',
    };

    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
      return res.status(200).json(GENERIC_SUCCESS_RESPONSE);
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = userStmt.get(normalizedEmail) as DbUser | undefined;

    if (!user) {
      return res.status(200).json(GENERIC_SUCCESS_RESPONSE);
    }

    // Invalidate existing active reset tokens/codes for this user
    const now = new Date().toISOString();
    db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now, user.id);

    // Generate 6-digit numeric verification code & token hash
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = crypto.createHash('sha256').update(code).digest('hex');

    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 mins

    db.prepare(`
      INSERT INTO password_resets (id, user_id, token_hash, code_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), user.id, tokenHash, codeHash, expiresAt, now);

    // Send password reset email (non-blocking)
    sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {});

    return res.status(200).json({
      ...GENERIC_SUCCESS_RESPONSE,
      codeDev: code,
      resetTokenDev: resetToken,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

// 5b. VERIFY FORGOT PASSWORD CODE (STEP 2)
export const verifyPasswordResetCode = async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;

    if (!email || !code || typeof email !== 'string' || typeof code !== 'string') {
      return res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = userStmt.get(normalizedEmail) as DbUser | undefined;

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
    const recordStmt = db.prepare(`
      SELECT * FROM password_resets
      WHERE user_id = ? AND (code_hash = ? OR token_hash = ?) AND used_at IS NULL
    `);
    const record = recordStmt.get(user.id, codeHash, codeHash) as { id: string; user_id: string; token_hash: string; expires_at: string } | undefined;

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    if (Date.now() > new Date(record.expires_at).getTime()) {
      return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
    }

    return res.status(200).json({
      message: 'Verification code confirmed successfully.',
      resetToken: record.token_hash,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to verify verification code.' });
  }
};

// 6. RESET PASSWORD (STEP 3)
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing password reset token.' });
    }

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetRecordStmt = db.prepare(`
      SELECT * FROM password_resets 
      WHERE (token_hash = ? OR token_hash = ?) AND used_at IS NULL
    `);
    const resetRecord = resetRecordStmt.get(token, tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

    if (!resetRecord) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const expiresAt = new Date(resetRecord.expires_at).getTime();
    if (Date.now() > expiresAt) {
      return res.status(400).json({ error: 'Password reset token has expired. Please request a new link.' });
    }

    const now = new Date().toISOString();

    // Update password hash & mark token as used
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);
    db.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?').run(newPasswordHash, now, resetRecord.user_id);
    db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(now, resetRecord.id);

    return res.status(200).json({ message: 'Password reset successfully. You can now sign in with your new password.' });
  } catch {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
};

// 7. VERIFY EMAIL
export const verifyEmail = async (req: Request, res: Response) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      return res.status(400).json({ error: 'Verification token is required.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const verifyRecordStmt = db.prepare(`
      SELECT * FROM email_verifications
      WHERE token_hash = ? AND verified_at IS NULL
    `);
    const record = verifyRecordStmt.get(tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

    if (!record) {
      return res.status(400).json({ error: 'Invalid or already used verification token.' });
    }

    if (Date.now() > new Date(record.expires_at).getTime()) {
      return res.status(400).json({ error: 'Verification token has expired.' });
    }

    const now = new Date().toISOString();
    db.prepare('UPDATE users SET email_verified = 1, updated_at = ? WHERE id = ?').run(now, record.user_id);
    db.prepare('UPDATE email_verifications SET verified_at = ? WHERE id = ?').run(now, record.id);

    return res.status(200).json({ message: 'Email address verified successfully.' });
  } catch {
    return res.status(500).json({ error: 'Failed to verify email.' });
  }
};

// 8. GOOGLE OAUTH REDIRECT INITIATION
// NOTE: We embed both the nonce and intent inside a short-lived signed JWT passed as the OAuth
// `state` parameter. This avoids all cross-domain cookie issues that arise when the frontend is
// hosted on a different domain (e.g. Vercel) from the backend (e.g. Railway) and the Vercel proxy
// forwards the request — meaning any state cookies would be scoped to the wrong domain.
export const googleAuth = async (req: Request, res: Response) => {
  const nonce = crypto.randomBytes(16).toString('hex');
  const intent = (req.query.intent as string) || (req.query.prompt === 'signup' ? 'signup' : 'login');
  const isMockNew = req.query.mock_new === 'true';

  // Sign a short-lived JWT that encodes both nonce and intent — no cookies needed
  const signedState = jwt.sign({ nonce, intent, mockNew: isMockNew }, JWT_SECRET, { expiresIn: '10m' });

  const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock_google_client_id_dev';

  if (isConfigured) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state: signedState,
      prompt: 'select_account',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  // Developer / Local testing mock flow if real Google credentials are not yet configured in .env
  const referer = req.headers.referer || '';
  const isSignupPrompt = intent === 'signup' || req.query.prompt === 'signup' || isMockNew || referer.includes('signup');
  const mockFlag = isSignupPrompt ? '&mock_new=true' : '';
  const mockRedirectUrl = `${GOOGLE_CALLBACK_URL}?code=mock_oauth_code_12345&state=${encodeURIComponent(signedState)}&intent=${intent}${mockFlag}`;
  return res.redirect(mockRedirectUrl);
};

// 9. GOOGLE OAUTH CALLBACK HANDLER
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;

    // Handle user cancellation or provider failure
    if (error) {
      return res.redirect(`${FRONTEND_URL}/login?auth_error=oauth_cancelled`);
    }

    // State validation: verify the signed JWT state parameter (no cookies required)
    if (!state || typeof state !== 'string') {
      return res.redirect(`${FRONTEND_URL}/login?auth_error=invalid_state`);
    }

    let statePayload: { nonce: string; intent: string; mockNew?: boolean };
    try {
      statePayload = jwt.verify(state, JWT_SECRET) as { nonce: string; intent: string; mockNew?: boolean };
    } catch {
      return res.redirect(`${FRONTEND_URL}/login?auth_error=invalid_state`);
    }

    const intent = (req.query.intent as string) || statePayload.intent || 'login';

    if (!code || typeof code !== 'string') {
      return res.redirect(`${FRONTEND_URL}/login?auth_error=invalid_code`);
    }

    let googleProfile: { id: string; email: string; name: string; email_verified: boolean };

    const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock_google_client_id_dev';
    // Prefer isMockNew from signed state payload; fall back to query param for direct test calls
    const isMockNew = Boolean(statePayload.mockNew) || String(req.query.mock_new || '') === 'true';

    if (isConfigured) {
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code',
        }),
      });

      if (!tokenRes.ok) {
        return res.redirect(`${FRONTEND_URL}?auth_error=token_exchange_failed`);
      }

      const tokenData = (await tokenRes.json()) as { access_token?: string; id_token?: string };
      if (!tokenData.access_token) {
        return res.redirect(`${FRONTEND_URL}?auth_error=token_missing`);
      }

      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!userRes.ok) {
        return res.redirect(`${FRONTEND_URL}?auth_error=userinfo_failed`);
      }

      const googleData = (await userRes.json()) as { id: string; email: string; name: string; verified_email?: boolean };
      googleProfile = {
        id: googleData.id,
        email: googleData.email.trim().toLowerCase(),
        name: googleData.name || googleData.email.split('@')[0],
        email_verified: Boolean(googleData.verified_email),
      };
    } else {
      if (isMockNew) {
        const uniqueId = crypto.randomBytes(4).toString('hex');
        googleProfile = {
          id: `google_user_sub_${uniqueId}`,
          email: `google_new_${uniqueId}@example.com`,
          name: 'Google New User',
          email_verified: true,
        };
      } else {
        googleProfile = {
          id: 'google_user_sub_9988776655',
          email: 'alex.dev@example.com',
          name: 'Alex Rivera',
          email_verified: true,
        };
      }
    }

    const now = new Date().toISOString();

    // Check if user exists by google_id OR matching email
    const existingGoogleUserStmt = db.prepare('SELECT * FROM users WHERE google_id = ?');
    let user = existingGoogleUserStmt.get(googleProfile.id) as DbUser | undefined;

    if (!user) {
      const existingEmailUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
      user = existingEmailUserStmt.get(googleProfile.email) as DbUser | undefined;
    }

    // ─── FLOW HANDLING BASED ON INTENT ───
    if (intent === 'signup') {
      // 1. User clicked "Continue with Google" on Signup Page
      if (user) {
        // User already exists -> Do NOT create duplicate account! Show warning banner.
        return res.redirect(`${FRONTEND_URL}/signup?google_account_exists=true&email=${encodeURIComponent(googleProfile.email)}`);
      }

      // New user -> Create account atomically with Workspace & WorkspaceMember
      const newUserId = crypto.randomUUID();
      const defaultUsername = `user_${crypto.randomBytes(3).toString('hex')}`;
      user = provisionNewAccount({
        userId: newUserId,
        name: googleProfile.name,
        email: googleProfile.email,
        username: defaultUsername,
        passwordHash: null,
        authProvider: 'google',
        googleId: googleProfile.id,
        emailVerified: true,
      });

      const token = generateTokenCookie(res, user.id);
      return res.redirect(`${FRONTEND_URL}/set-password?auth=google_success&token=${token}`);
    } else {
      // 2. User clicked "Continue with Google" on Login Page (intent === 'login')
      if (user) {
        // User exists -> Authenticate directly
        if (!user.google_id) {
          const newProvider = user.password_hash ? 'both' : 'google';
          db.prepare('UPDATE users SET google_id = ?, auth_provider = ?, email_verified = 1, last_login_at = ?, updated_at = ? WHERE id = ?')
            .run(googleProfile.id, newProvider, now, now, user.id);
          user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as DbUser;
        } else {
          db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);
        }

        const token = generateTokenCookie(res, user.id);
        const hasLocalPassword = Boolean(user.password_hash);
        const redirectTarget = hasLocalPassword ? (user.onboarding_completed ? '/dashboard' : '/onboarding') : '/set-password';
        return res.redirect(`${FRONTEND_URL}${redirectTarget}?auth=google_success&token=${token}`);
      }

      // New Google User from Login page -> DO NOT immediately create account! Show Signup Confirmation Modal!
      const tempToken = crypto.randomBytes(24).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO pending_google_signups (id, token, google_id, email, name, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), tempToken, googleProfile.id, googleProfile.email, googleProfile.name, expiresAt, now);

      return res.redirect(`${FRONTEND_URL}/login?google_signup_pending=true&temp_token=${tempToken}&email=${encodeURIComponent(googleProfile.email)}&name=${encodeURIComponent(googleProfile.name)}`);
    }
  } catch {
    return res.redirect(`${FRONTEND_URL}?auth_error=server_error`);
  }
};

// 9b. CONFIRM GOOGLE SIGNUP (FROM LOGIN MODAL)
export const confirmGoogleSignup = async (req: Request, res: Response) => {
  try {
    const { tempToken } = req.body;

    if (!tempToken || typeof tempToken !== 'string') {
      return res.status(400).json({ error: 'Invalid or missing confirmation token.' });
    }

    const pendingStmt = db.prepare('SELECT * FROM pending_google_signups WHERE token = ?');
    const pending = pendingStmt.get(tempToken) as { id: string; google_id: string; email: string; name: string; expires_at: string } | undefined;

    if (!pending) {
      return res.status(400).json({ error: 'Signup session expired or invalid. Please try again.' });
    }

    if (Date.now() > new Date(pending.expires_at).getTime()) {
      db.prepare('DELETE FROM pending_google_signups WHERE id = ?').run(pending.id);
      return res.status(400).json({ error: 'Signup confirmation expired. Please try signing up again.' });
    }

    const now = new Date().toISOString();
    const existingUser = db.prepare('SELECT * FROM users WHERE email = ? OR google_id = ?').get(pending.email, pending.google_id) as DbUser | undefined;

    let user: DbUser;
    if (existingUser) {
      user = existingUser;
    } else {
      const newUserId = crypto.randomUUID();
      const defaultUsername = `user_${crypto.randomBytes(3).toString('hex')}`;
      user = provisionNewAccount({
        userId: newUserId,
        name: pending.name,
        email: pending.email,
        username: defaultUsername,
        passwordHash: null,
        authProvider: 'google',
        googleId: pending.google_id,
        emailVerified: true,
      });
    }

    db.prepare('DELETE FROM pending_google_signups WHERE id = ?').run(pending.id);

    const token = generateTokenCookie(res, user.id);

    return res.status(200).json({
      message: 'Account created successfully.',
      user: sanitizeUser(user),
      token,
      redirectTo: '/set-password',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to confirm Google signup.' });
  }
};

// 10. RESEND VERIFICATION EMAIL
export const resendVerification = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(req.user.id) as DbUser | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Your email is already verified.' });
    }

    const now = new Date().toISOString();

    // Invalidate any existing unused verification tokens for this user
    db.prepare(
      'UPDATE email_verifications SET verified_at = ? WHERE user_id = ? AND verified_at IS NULL'
    ).run(now, user.id);

    // Create a fresh verification token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO email_verifications (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), user.id, verifyTokenHash, expiresAt, now);

    // Send the verification email
    await sendVerificationEmail(user.email, user.name, verifyToken);

    return res.status(200).json({
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch {
    return res.status(500).json({ error: 'Failed to resend verification email.' });
  }
};

// 11. ONBOARDING STEP 1 — WORKSPACE SETUP
export const saveOnboardingStep1 = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { workspaceName, workspaceSlug } = req.body;

    if (!workspaceName || typeof workspaceName !== 'string' || !workspaceName.trim()) {
      return res.status(400).json({ error: 'Workspace name is required.' });
    }

    const cleanName = workspaceName.trim();
    let slug = (workspaceSlug && typeof workspaceSlug === 'string' ? workspaceSlug.trim() : '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    if (!slug) {
      slug = cleanName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace';
    }

    const now = new Date().toISOString();

    // Check if workspace already exists for user
    const existingWsStmt = db.prepare('SELECT * FROM workspaces WHERE user_id = ?');
    const existingWs = existingWsStmt.get(req.user.id) as { id: string } | undefined;

    let finalSlug = slug;
    // Handle slug collisions with other users
    const checkSlugStmt = db.prepare('SELECT id FROM workspaces WHERE slug = ? AND user_id != ?');
    if (checkSlugStmt.get(finalSlug, req.user.id)) {
      finalSlug = `${slug}-${crypto.randomBytes(2).toString('hex')}`;
    }

    let workspaceId: string;
    if (existingWs) {
      workspaceId = existingWs.id;
      db.prepare(`
        UPDATE workspaces SET name = ?, slug = ?, updated_at = ? WHERE id = ?
      `).run(cleanName, finalSlug, now, workspaceId);
    } else {
      workspaceId = crypto.randomUUID();
      db.prepare(`
        INSERT INTO workspaces (id, user_id, name, slug, business_type, customer_channels, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
      `).run(workspaceId, req.user.id, cleanName, finalSlug, now, now);

      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
        VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
      `).run(crypto.randomUUID(), workspaceId, req.user.id, now, now, now);
    }

    // Advance onboarding step to 2
    db.prepare('UPDATE users SET onboarding_step = 2, updated_at = ? WHERE id = ?').run(now, req.user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as DbUser;

    return res.status(200).json({
      message: 'Workspace saved.',
      workspace: { id: workspaceId, name: cleanName, slug: finalSlug },
      user: sanitizeUser(updatedUser),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to save workspace details.' });
  }
};

// 12. ONBOARDING STEP 2 — BUSINESS SETUP
export const saveOnboardingStep2 = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { businessType, customerChannels } = req.body;

    const channelsJson = Array.isArray(customerChannels) ? JSON.stringify(customerChannels) : null;
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE workspaces
      SET business_type = ?, customer_channels = ?, updated_at = ?
      WHERE user_id = ?
    `).run(businessType || null, channelsJson, now, req.user.id);

    // Advance onboarding step to 3
    db.prepare('UPDATE users SET onboarding_step = 3, updated_at = ? WHERE id = ?').run(now, req.user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as DbUser;

    return res.status(200).json({
      message: 'Business profile saved.',
      user: sanitizeUser(updatedUser),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to save business setup.' });
  }
};

// 13. ONBOARDING STEP 3 — COMPLETE SETUP
export const completeOnboarding = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const { assistantName, assistantInstructions } = req.body;

    const nameToUse = (assistantName && typeof assistantName === 'string' && assistantName.trim()) 
      ? assistantName.trim() 
      : 'Xia Assistant';
    const now = new Date().toISOString();

    // Get user workspace
    const wsStmt = db.prepare('SELECT id FROM workspaces WHERE user_id = ?');
    let ws = wsStmt.get(req.user.id) as { id: string } | undefined;

    if (!ws) {
      const defaultWsId = crypto.randomUUID();
      const defaultName = `${req.user.name.split(' ')[0]}'s Support`;
      const defaultSlug = `${defaultName.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${crypto.randomBytes(2).toString('hex')}`;
      db.prepare(`
        INSERT INTO workspaces (id, user_id, name, slug, business_type, customer_channels, created_at, updated_at)
        VALUES (?, ?, ?, ?, NULL, NULL, ?, ?)
      `).run(defaultWsId, req.user.id, defaultName, defaultSlug, now, now);

      db.prepare(`
        INSERT INTO workspace_members (id, workspace_id, user_id, role, status, joined_at, created_at, updated_at)
        VALUES (?, ?, ?, 'owner', 'active', ?, ?, ?)
      `).run(crypto.randomUUID(), defaultWsId, req.user.id, now, now, now);

      ws = { id: defaultWsId };
    }

    // Save AI Assistant configuration
    const existingAssistantStmt = db.prepare('SELECT id FROM ai_assistants WHERE workspace_id = ?');
    const existingAssistant = existingAssistantStmt.get(ws.id) as { id: string } | undefined;

    if (existingAssistant) {
      db.prepare(`
        UPDATE ai_assistants SET name = ?, instructions = ?, updated_at = ? WHERE id = ?
      `).run(nameToUse, assistantInstructions || null, now, existingAssistant.id);
    } else {
      db.prepare(`
        INSERT INTO ai_assistants (id, workspace_id, name, instructions, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(crypto.randomUUID(), ws.id, nameToUse, assistantInstructions || null, now, now);
    }

    // Mark onboarding as completed
    db.prepare(`
      UPDATE users SET onboarding_completed = 1, onboarding_step = 3, updated_at = ? WHERE id = ?
    `).run(now, req.user.id);

    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id) as DbUser;

    return res.status(200).json({
      message: 'Onboarding completed successfully!',
      user: sanitizeUser(updatedUser),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to complete onboarding.' });
  }
};

// 14. GET ONBOARDING DATA (FOR HYDRATING PROGRESS ON REFRESH)
export const getOnboardingData = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Authentication required.' });

    const wsStmt = db.prepare('SELECT * FROM workspaces WHERE user_id = ?');
    const ws = wsStmt.get(req.user.id) as { id: string; name: string; slug: string; business_type: string; customer_channels: string } | undefined;

    let assistant: { name: string; instructions: string } | undefined;
    if (ws) {
      const astStmt = db.prepare('SELECT name, instructions FROM ai_assistants WHERE workspace_id = ?');
      assistant = astStmt.get(ws.id) as { name: string; instructions: string } | undefined;
    }

    return res.status(200).json({
      workspace: ws ? {
        name: ws.name,
        slug: ws.slug,
        businessType: ws.business_type,
        customerChannels: ws.customer_channels ? JSON.parse(ws.customer_channels) : [],
      } : null,
      assistant: assistant || null,
    });
  } catch {
    return res.status(500).json({ error: 'Failed to retrieve onboarding data.' });
  }
};

// 15. FIRST-TIME PASSWORD SETUP (FOR GOOGLE USERS)
export const setupPassword = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { password, confirmPassword } = req.body;

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(req.user.id) as DbUser | undefined;

    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    const now = new Date().toISOString();
    const newPasswordHash = bcrypt.hashSync(password, 10);
    const updatedProvider = user.auth_provider === 'google' ? 'both' : user.auth_provider;

    db.prepare(`
      UPDATE users
      SET password_hash = ?, auth_provider = ?, updated_at = ?
      WHERE id = ?
    `).run(newPasswordHash, updatedProvider, now, user.id);

    const updatedUser = userStmt.get(user.id) as DbUser;

    return res.status(200).json({
      message: 'Password set successfully!',
      user: sanitizeUser(updatedUser),
    });
  } catch {
    return res.status(500).json({ error: 'Failed to set password.' });
  }
};

