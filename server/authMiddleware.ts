import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, DbUser } from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'xia_chat_dev_jwt_secret_key_8f9a2b7c4d1e';

export interface AuthenticatedUserPayload {
  id: string;
  name: string;
  email: string;
  username: string | null;
  authProvider: 'local' | 'google' | 'both';
  hasPassword: boolean;
  emailVerified: boolean;
  onboardingCompleted: boolean;
  onboardingStep: number;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUserPayload;
}

export function sanitizeUser(user: DbUser): AuthenticatedUserPayload {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username || null,
    authProvider: user.auth_provider,
    hasPassword: Boolean(user.password_hash),
    emailVerified: Boolean(user.email_verified),
    onboardingCompleted: Boolean(user.onboarding_completed),
    onboardingStep: user.onboarding_step || 1,
    createdAt: user.created_at,
    lastLoginAt: user.last_login_at,
  };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  let token: string | undefined = req.cookies?.auth_token;

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = userStmt.get(decoded.userId) as DbUser | undefined;

    if (!user) {
      res.clearCookie('auth_token');
      return res.status(401).json({ error: 'User session no longer valid.' });
    }

    req.user = sanitizeUser(user);
    next();
  } catch {
    res.clearCookie('auth_token');
    return res.status(401).json({ error: 'Session expired or invalid token.' });
  }
};
