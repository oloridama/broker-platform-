import { Request, Response, NextFunction } from "express";
import { AppError, error, formatZodErrors } from "../utils/response";
import { ZodError } from "zod";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";

/**
 * Global error-handling middleware.
 * Catches every error, normalises it, and returns structured JSON.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // ── Zod validation errors ────────────────────────────
  if (err instanceof ZodError) {
    res.status(400).json(
      error("VALIDATION_ERROR", "Request validation failed", formatZodErrors(err)),
    );
    return;
  }

  // ── JWT errors ───────────────────────────────────────
  if (err instanceof TokenExpiredError) {
    res.status(401).json(error("TOKEN_EXPIRED", "Access token has expired"));
    return;
  }
  if (err instanceof JsonWebTokenError) {
    res.status(401).json(error("TOKEN_INVALID", "Invalid access token"));
    return;
  }

  // ── Known operational errors ─────────────────────────
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      error(err.message.toUpperCase().replace(/\s/g, "_"), err.message),
    );
    return;
  }

  // ── Unknown / programming errors ─────────────────────
  console.error("❌ Unhandled error:", err);
  res.status(500).json(
    error("INTERNAL_ERROR", "An unexpected error occurred"),
  );
}
