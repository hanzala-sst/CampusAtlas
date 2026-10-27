import { Router } from 'express';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import {
  generateToken,
  getAuthCookieOptions,
  AUTH_COOKIE_NAME,
  requireAuth,
} from '../middleware/auth.js';
import { calculateUserReputation } from '../services/reputationService.js';

const router = Router();

// In-memory rate limiting map for authentication attempts (IP -> timestamps[])
const authRateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const MAX_AUTH_ATTEMPTS = 30; // Max attempts per window

function authRateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress || 'unknown';
  const now = Date.now();
  const timestamps = (authRateLimitMap.get(ip) || []).filter(
    (t) => now - t < RATE_LIMIT_WINDOW_MS
  );

  if (timestamps.length >= MAX_AUTH_ATTEMPTS) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again in 15 minutes.',
        code: 'RATE_LIMIT_EXCEEDED',
      },
    });
  }

  timestamps.push(now);
  authRateLimitMap.set(ip, timestamps);
  next();
}

// POST /api/auth/register
router.post('/register', authRateLimiter, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Name is required and must be at least 2 characters long.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (!email || typeof email !== 'string' || !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Please provide a valid email address.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(422).json({
        success: false,
        error: {
          message: 'Password must be at least 6 characters long.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'An account with this email address already exists.',
          code: 'DUPLICATE_KEY',
        },
      });
    }

    // Server-enforced role assignment: never accept role from client input
    const role = config.ADMIN_EMAILS.includes(normalizedEmail)
      ? 'moderator'
      : 'student';

    const passwordHash = await User.hashPassword(password);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role,
    });

    const token = generateToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Email and password are required.',
          code: 'VALIDATION_ERROR',
        },
      });
    }

    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Invalid email or password.',
          code: 'INVALID_CREDENTIALS',
        },
      });
    }

    // Automatically elevate role if email is now present in ADMIN_EMAILS
    if (config.ADMIN_EMAILS.includes(normalizedEmail) && user.role !== 'moderator') {
      user.role = 'moderator';
      await user.save();
    }

    const token = generateToken(user);
    res.cookie(AUTH_COOKIE_NAME, token, getAuthCookieOptions());

    res.json({
      success: true,
      message: 'Login successful',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });

  res.json({
    success: true,
    message: 'Logged out successfully',
  });
});

// GET /api/auth/me
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const reputation = await calculateUserReputation(req.user._id);

    res.json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role,
        createdAt: req.user.createdAt,
        reputation,
      },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
