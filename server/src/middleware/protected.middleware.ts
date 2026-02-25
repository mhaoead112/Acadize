import { Request, Response, NextFunction } from 'express';
import { isAuthenticated } from './auth.middleware.js';
import { requireSubscription } from './subscription.middleware.js';

/**
 * Combined middleware for protected routes that require both authentication and subscription
 * Usage: router.get('/endpoint', ...requireAuth, async (req, res) => {...})
 */
export const requireAuth = [isAuthenticated, requireSubscription];

/**
 * Middleware for routes that require authentication but NOT subscription
 * (e.g., subscription management routes, profile setup)
 * Usage: router.get('/endpoint', ...authOnly, async (req, res) => {...})
 */
export const authOnly = [isAuthenticated];
