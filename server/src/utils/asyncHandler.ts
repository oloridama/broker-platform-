import { Router, Request, Response, NextFunction } from "express";

/**
 * Wraps an async route handler so thrown/rejected errors are forwarded
 * to the Express error-handling middleware via next().
 */
type AsyncHandler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export function asyncHandler(fn: AsyncHandler) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Creates a typed router — a thin wrapper around express.Router() that
 * preserves the standard API.
 */
export function createRouter(): Router {
  return Router();
}
