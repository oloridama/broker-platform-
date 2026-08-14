import { z } from "zod";

// ── Shared ──────────────────────────────────────────────
// Reject HTML/script content in free-text name fields (XSS defense).
// Allows letters (incl. accents), spaces, hyphens, apostrophes and periods.
export const nameField = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name is too long")
  .regex(/^[A-Za-zÀ-ÖØ-öø-ÿ' .\-]+$/, "Name contains invalid characters");

// ── Auth schemas ────────────────────────────────────────
export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  firstName: nameField,
  lastName: nameField,
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1, "Refresh token is required"),
});

// ── Trading schemas ─────────────────────────────────────
export const createOrderSchema = z.object({
  instrumentId: z.string().uuid("Invalid instrument ID"),
  accountId: z.string().uuid("Invalid account ID"),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  side: z.enum(["BUY", "SELL"]),
  lotSize: z.number().positive("Lot size must be positive"),
  price: z.number().positive("Price must be positive").optional(),
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

export const updateOrderSchema = z.object({
  stopLoss: z.number().positive().optional(),
  takeProfit: z.number().positive().optional(),
});

// ── KYC schema ──────────────────────────────────────────
export const kycSchema = z.object({
  documentType: z.enum(["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID"]),
  documentNumber: z.string().min(1, "Document number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  postalCode: z.string().min(1, "Postal code is required"),
  country: z.string().min(1, "Country is required"),
});

// ── Transaction schemas ─────────────────────────────────
// Guard against Infinity/NaN bypassing .positive() (e.g. amount: 1e309 → Infinity)
export const moneyAmount = z
  .number()
  .positive("Amount must be positive")
  .finite("Amount must be a finite number")
  .max(100_000_000, "Amount exceeds maximum allowed");

export const depositSchema = z.object({
  walletId: z.string().uuid("Invalid wallet ID"),
  amount: moneyAmount,
  currency: z.string().default("USD"),
});

export const withdrawalSchema = z.object({
  walletId: z.string().uuid("Invalid wallet ID"),
  amount: moneyAmount,
  currency: z.string().default("USD"),
});

// ── Profile schema ──────────────────────────────────────
export const updateProfileSchema = z.object({
  firstName: nameField.optional(),
  lastName: nameField.optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
});
