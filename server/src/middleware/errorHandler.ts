import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', error);

  // Zod validation errors
  if (error.name === 'ZodError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.errors
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  // Database errors
  if (error.code === '23505') { // Unique violation
    return res.status(409).json({
      error: 'Resource already exists'
    });
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error'
  });
}