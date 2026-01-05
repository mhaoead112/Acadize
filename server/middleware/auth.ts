import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

interface AuthenticatedRequest extends Request {
  userId?: string;
  userRole?: string;
}

interface JWTPayload {
  sub: string; // user ID
  role: string;
  exp: number; // expiration timestamp
  iat: number; // issued at timestamp
}

// Get JWT secret from environment
const getJWTSecret = (): string => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET environment variable is required for JWT signing');
  }
  return secret;
};

// Secure JWT authentication middleware - supports both cookies and headers for transition
export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  // Try to get token from HttpOnly cookie first (preferred), then fallback to Authorization header
  let token: string | undefined;
  
  // Check for token in HttpOnly cookie (secure approach)
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  } else {
    // Fallback to Authorization header for backward compatibility
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }
  
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  try {
    // Verify JWT signature and decode payload
    const decoded = jwt.verify(token, getJWTSecret(), { algorithms: ['HS256'] }) as JWTPayload;
    
    // Check if token has required fields
    if (!decoded.sub || !decoded.role) {
      return res.status(401).json({ message: 'Invalid token format' });
    }

    // Check if token is expired (jwt.verify already does this, but being explicit)
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ message: 'Token expired' });
    }

    // Set user information on request
    req.userId = decoded.sub;
    req.userRole = decoded.role;
    
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ message: 'Token expired' });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    return res.status(401).json({ message: 'Authentication failed' });
  }
};

// Role-based permission middleware
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Secure JWT token generation
export const generateToken = (userId: string, role: string): string => {
  const payload: JWTPayload = {
    sub: userId,
    role: role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (2 * 60 * 60), // 2 hours for enhanced security
  };
  
  return jwt.sign(payload, getJWTSecret(), { algorithm: 'HS256' });
};

export type { AuthenticatedRequest };