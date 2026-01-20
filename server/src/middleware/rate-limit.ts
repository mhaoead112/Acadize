import { Request, Response, NextFunction } from 'express';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const store: RateLimitStore = {};

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetAt < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

/**
 * Rate limiting middleware with configurable thresholds
 */
export function rateLimit(options: {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyGenerator?: (req: Request) => string; // Custom key generator
  skipSuccessfulRequests?: boolean; // Don't count successful requests
  message?: string; // Custom error message
}) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip || 'unknown',
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later.',
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Initialize or get existing record
    if (!store[key] || store[key].resetAt < now) {
      store[key] = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    const record = store[key];

    // Check if limit exceeded
    if (record.count >= maxRequests) {
      const retryAfter = Math.ceil((record.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      res.set('X-RateLimit-Limit', String(maxRequests));
      res.set('X-RateLimit-Remaining', '0');
      res.set('X-RateLimit-Reset', String(record.resetAt));
      
      return res.status(429).json({
        error: message,
        retryAfter,
      });
    }

    // Increment counter (unless skipSuccessfulRequests is enabled)
    if (!skipSuccessfulRequests) {
      record.count++;
    }

    // Set rate limit headers
    res.set('X-RateLimit-Limit', String(maxRequests));
    res.set('X-RateLimit-Remaining', String(maxRequests - record.count));
    res.set('X-RateLimit-Reset', String(record.resetAt));

    // If skipSuccessfulRequests is enabled, increment on error responses
    if (skipSuccessfulRequests) {
      const originalSend = res.send;
      res.send = function (body: any) {
        if (res.statusCode >= 400) {
          record.count++;
        }
        return originalSend.call(this, body);
      };
    }

    next();
  };
}

/**
 * Anti-cheat specific rate limiter
 * Stricter limits for anti-cheat event submissions
 */
export function antiCheatRateLimit() {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100, // Max 100 events per minute per student
    keyGenerator: (req) => {
      // Key by user ID + attempt ID for per-attempt limiting
      const userId = (req as any).user?.id || 'anonymous';
      const attemptId = req.body?.attemptId || 'unknown';
      return `anti-cheat:${userId}:${attemptId}`;
    },
    message: 'Anti-cheat event rate limit exceeded. Please slow down.',
  });
}

/**
 * General API rate limiter
 */
export function generalApiRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 1000, // Max 1000 requests per 15 minutes
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || req.ip || 'anonymous';
      return `api:${userId}`;
    },
    message: 'Too many requests from this user, please try again later.',
  });
}

/**
 * Authentication endpoint rate limiter (stricter for login/signup)
 */
export function authRateLimit() {
  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // Max 5 failed attempts
    keyGenerator: (req) => `auth:${req.ip}`,
    skipSuccessfulRequests: true, // Only count failed attempts
    message: 'Too many authentication attempts, please try again later.',
  });
}

/**
 * Burst rate limiter (very short window for preventing spam)
 */
export function burstRateLimit() {
  return rateLimit({
    windowMs: 1000, // 1 second
    maxRequests: 10, // Max 10 requests per second
    keyGenerator: (req) => {
      const userId = (req as any).user?.id || req.ip || 'anonymous';
      return `burst:${userId}`;
    },
    message: 'Request burst detected. Please slow down.',
  });
}

export default rateLimit;
