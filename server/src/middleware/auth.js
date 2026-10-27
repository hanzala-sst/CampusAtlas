import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';

export const AUTH_COOKIE_NAME = 'ca_auth_token';

export const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: config.isProduction,
  sameSite: config.isProduction ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
});

export function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Middleware: Strict authentication required
export async function requireAuth(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required. Please log in.',
          code: 'UNAUTHENTICATED',
        },
      });
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'User session invalid or user account no longer exists.',
          code: 'USER_NOT_FOUND',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        },
      });
    }
    return res.status(401).json({
      success: false,
      error: {
        message: 'Invalid session token.',
        code: 'INVALID_TOKEN',
      },
    });
  }
}

// Middleware: Optional authentication (attaches user if valid session exists)
export async function optionalAuth(req, res, next) {
  try {
    const token =
      req.cookies?.[AUTH_COOKIE_NAME] ||
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, config.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    req.user = user || null;
    next();
  } catch {
    req.user = null;
    next();
  }
}

// Middleware: Role-based authorization check
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Authentication required.',
          code: 'UNAUTHENTICATED',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `Access denied. Requires one of: [${roles.join(', ')}] role.`,
          code: 'FORBIDDEN',
        },
      });
    }

    next();
  };
}

// Shorthand for moderator-only access
export const requireModerator = requireRole('moderator');
