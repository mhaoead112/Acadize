import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required!');
}
const JWT_SECRET = process.env.JWT_SECRET;

interface AuthenticatedUser {
  id: string;
  organizationId: string; // Multi-tenant organization ID
  role: "student" | "teacher" | "admin" | "parent";
  email?: string;
  fullName?: string;
  phone?: string | null;
  bio?: string | null;
  profilePicture?: string | null;
  preferredLocale?: string | null; // i18n
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const isAuthenticated = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;

    // STRICT TENANT CHECK
    // If request has a tenant context, user MUST belong to it
    if (req.tenant && req.user.organizationId !== req.tenant.organizationId) {
      return res.status(403).json({
        message: "Forbidden: Access denied to this organization."
      });
    }

    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      // Don't log stack trace for expired tokens, just return 401
      return res.status(401).json({ message: "Unauthorized: Token expired." });
    }
    console.error("JWT verification failed:", error);
    return res.status(401).json({ message: "Unauthorized: Invalid token." });
  }
};

// Optional auth middleware - allows requests without token but parses token if provided
export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // No token provided, but that's OK - continue without user
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
    req.user = decoded;
  } catch (error) {
    // Invalid token, but we'll allow the request to continue without user
    console.warn("Optional auth: invalid token provided");
  }

  next();
};

export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Admin access required." });
  }
};

export const isStudent = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "student") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Student access required." });
  }
};

export const isTeacher = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.role === "teacher") {
    next();
  } else {
    return res.status(403).json({ message: "Forbidden: Teacher access required." });
  }
};
