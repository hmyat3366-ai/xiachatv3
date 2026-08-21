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

// 1. SIGN UP
export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword } = req.body;

    // Frontend & Backend validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Name is required.' });
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

    // Check existing user
    const existingUserStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const existingUser = existingUserStmt.get(normalizedEmail) as DbUser | undefined;

    const now = new Date().toISOString();

    if (existingUser) {
      // If user already has a password or local account
      if (existingUser.password_hash || existingUser.auth_provider === 'local' || existingUser.auth_provider === 'both') {
        return res.status(409).json({ error: 'An account with this email already exists. Please sign in instead.' });
      }

      // Existing user was registered via Google only, now setting up email/password
      const passwordHash = bcrypt.hashSync(password, 10);
      const updateUserStmt = db.prepare(`
        UPDATE users
        SET password_hash = ?, auth_provider = 'both', updated_at = ?, last_login_at = ?
        WHERE id = ?
      `);
      updateUserStmt.run(passwordHash, now, now, existingUser.id);

      const updatedUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
      const updatedUser = updatedUserStmt.get(existingUser.id) as DbUser;

      generateTokenCookie(res, updatedUser.id);
      return res.status(201).json({
        message: 'Account updated successfully.',
        user: sanitizeUser(updatedUser),
      });
    }

    // Create brand new user
    const userId = crypto.randomUUID();
    const passwordHash = bcrypt.hashSync(password, 10);

    const insertStmt = db.prepare(`
      INSERT INTO users (id, name, email, password_hash, auth_provider, google_id, email_verified, created_at, updated_at, last_login_at)
      VALUES (?, ?, ?, ?, 'local', NULL, 0, ?, ?, ?)
    `);

    insertStmt.run(userId, name.trim(), normalizedEmail, passwordHash, now, now, now);

    const newUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const newUser = newUserStmt.get(userId) as DbUser;

    // Generate Verification Token
    const verifyToken = crypto.randomBytes(32).toString('hex');
    const verifyTokenHash = crypto.createHash('sha256').update(verifyToken).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    const insertVerifyStmt = db.prepare(`
      INSERT INTO email_verifications (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertVerifyStmt.run(crypto.randomUUID(), userId, verifyTokenHash, expiresAt, now);

    // Send verification email (non-blocking — do not await to keep signup fast)
    sendVerificationEmail(normalizedEmail, name.trim(), verifyToken).catch(() => {
      // Email failure is non-fatal; token is stored and can be resent
    });

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

// 2. LOGIN
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userStmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = userStmt.get(normalizedEmail) as DbUser | undefined;

    // Generic error message - do not reveal if email exists
    const GENERIC_LOGIN_ERROR = 'Email or password is incorrect.';

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

// 5. FORGOT PASSWORD
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    // Security response: generic message regardless of email presence
    const GENERIC_SUCCESS_RESPONSE = {
      message: 'If an account matches that email address, password reset instructions have been sent.',
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

    // Invalidate existing active reset tokens for this user
    const now = new Date().toISOString();
    db.prepare('UPDATE password_resets SET used_at = ? WHERE user_id = ? AND used_at IS NULL').run(now, user.id);

    // Create new reset token (15 mins expiration)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    db.prepare(`
      INSERT INTO password_resets (id, user_id, token_hash, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(crypto.randomUUID(), user.id, tokenHash, expiresAt, now);

    // Send password reset email (non-blocking)
    sendPasswordResetEmail(user.email, user.name, resetToken).catch(() => {
      // Email failure is non-fatal; generic response is still returned
    });

    return res.status(200).json(GENERIC_SUCCESS_RESPONSE);
  } catch {
    return res.status(500).json({ error: 'Failed to process password reset request.' });
  }
};

// 6. RESET PASSWORD
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
      WHERE token_hash = ? AND used_at IS NULL
    `);
    const resetRecord = resetRecordStmt.get(tokenHash) as { id: string; user_id: string; expires_at: string } | undefined;

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
export const googleAuth = async (req: Request, res: Response) => {
  const state = crypto.randomBytes(16).toString('hex');
  const isCrossSite = process.env.NODE_ENV === 'production' || (FRONTEND_URL && FRONTEND_URL.startsWith('https://'));
  res.cookie('oauth_state', state, {
    httpOnly: true,
    maxAge: 10 * 60 * 1000, // 10 mins
    sameSite: isCrossSite ? 'none' : 'lax',
    secure: isCrossSite,
  });

  const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock_google_client_id_dev';
  const referer = req.headers.referer || '';
  const isSignupPrompt = req.query.prompt === 'signup' || req.query.mock_new === 'true' || referer.includes('signup');

  if (isConfigured) {
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: GOOGLE_CALLBACK_URL,
      response_type: 'code',
      scope: 'openid email profile',
      state: state,
      prompt: 'select_account',
    });
    return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
  }

  // Developer / Local testing mock flow if real Google credentials are not yet configured in .env
  const mockFlag = isSignupPrompt ? '&mock_new=true' : '';
  const mockRedirectUrl = `${GOOGLE_CALLBACK_URL}?code=mock_oauth_code_12345&state=${state}${mockFlag}`;
  return res.redirect(mockRedirectUrl);
};

// 9. GOOGLE OAUTH CALLBACK HANDLER
export const googleCallback = async (req: Request, res: Response) => {
  try {
    const { code, state, error } = req.query;
    const storedState = req.cookies?.oauth_state;

    res.clearCookie('oauth_state');

    // Handle user cancellation or provider failure
    if (error) {
      return res.redirect(`${FRONTEND_URL}?auth_error=oauth_cancelled`);
    }

    // State validation: check state parameter presence and cookie match
    if (!state || !storedState || state !== storedState) {
      return res.redirect(`${FRONTEND_URL}?auth_error=invalid_state`);
    }

    if (!code || typeof code !== 'string') {
      return res.redirect(`${FRONTEND_URL}?auth_error=invalid_code`);
    }

    let googleProfile: { id: string; email: string; name: string; email_verified: boolean };

    const isConfigured = GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'mock_google_client_id_dev';
    const isMockNew = String(req.query.mock_new || '') === 'true';

    if (isConfigured) {
      // Real Google OAuth code exchange
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

      // Fetch user profile from Google UserInfo endpoint
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
      // Simulated Google OAuth profile for local dev testing
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

      if (user) {
        // Link existing email account to Google profile without duplicate account creation!
        const newProvider = user.password_hash ? 'both' : 'google';
        db.prepare(`
          UPDATE users
          SET google_id = ?, auth_provider = ?, email_verified = 1, last_login_at = ?, updated_at = ?
          WHERE id = ?
        `).run(googleProfile.id, newProvider, now, now, user.id);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id) as DbUser;
      } else {
        // Create new user via Google authentication (onboarding_completed = 0)
        const newUserId = crypto.randomUUID();
        db.prepare(`
          INSERT INTO users (id, name, email, password_hash, auth_provider, google_id, email_verified, onboarding_completed, onboarding_step, created_at, updated_at, last_login_at)
          VALUES (?, ?, ?, NULL, 'google', ?, 1, 0, 1, ?, ?, ?)
        `).run(newUserId, googleProfile.name, googleProfile.email, googleProfile.id, now, now, now);
        user = db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId) as DbUser;
      }
    } else {
      // Existing Google User update timestamps (preserve onboarding_completed)
      db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(now, now, user.id);
      user.last_login_at = now;
    }

    const token = generateTokenCookie(res, user.id);

    // Source of truth: backend user account state determines destination
    const hasLocalPassword = Boolean(user.password_hash);
    let redirectTarget: string;
    if (!hasLocalPassword) {
      redirectTarget = '/set-password';
    } else {
      const isCompleted = Boolean(user.onboarding_completed);
      redirectTarget = isCompleted ? '/dashboard' : '/onboarding';
    }
    // Pass token via URL for cross-domain (Vercel<->Railway) where cookies may not transfer
    return res.redirect(`${FRONTEND_URL}${redirectTarget}?auth=google_success&token=${token}`);
  } catch {
    return res.redirect(`${FRONTEND_URL}?auth_error=server_error`);
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

