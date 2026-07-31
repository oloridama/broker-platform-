import { ZodError } from "zod";

/** Structured API error response. */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/** Standard JSON envelope for all API responses. */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

/** Build a success response envelope. */
export function success<T>(data: T, meta?: ApiResponse["meta"]): ApiResponse<T> {
  return { success: true, data, ...(meta && { meta }) };
}

/** Build an error response envelope. */
export function error(code: string, message: string, details?: unknown): ApiResponse {
  return { success: false, error: { code, message, details } };
}

/** Map Zod validation errors into a user-friendly format. */
export function formatZodErrors(err: ZodError): Record<string, string[]> {
  const formatted: Record<string, string[]> = {};
  for (const issue of err.issues) {
    const path = issue.path.join(".");
    if (!formatted[path]) formatted[path] = [];
    formatted[path].push(issue.message);
  }
  return formatted;
}
