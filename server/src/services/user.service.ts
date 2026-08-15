import bcrypt from "bcrypt";
import prisma from "../db";
import { config } from "../config";
import { AppError } from "../utils/response";
import { sendMail } from "./mailer";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      kyc: true,
      accounts: {
        where: { isActive: true },
        select: { id: true, accountType: true, balance: true, equity: true, currency: true },
      },
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
}

// ── Change password (email verification code) ──────────
// Professional flow: user proves the current password, we email a 6-digit
// code to their registered address, and only a valid code applies the change.
// If email delivery is unavailable, the code is exposed to admins so they can
// relay it to the user manually (see listPasswordChangeCodes).
interface PasswordChangeEntry {
  userId: string;
  email: string;
  code: string; // plaintext — admin-visible for manual relay
  codeHash: string; // used to verify the code the user enters
  expiresAt: Date;
  attempts: number;
  emailed: boolean; // true if delivered via SMTP
}

const passwordChangeCodes = new Map<string, PasswordChangeEntry>();
const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const CODE_MAX_ATTEMPTS = 5;

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function requestPasswordChange(userId: string, currentPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 8);

  // Try to deliver via email; on failure/absence of SMTP the code stays
  // available to admins for manual relay.
  const emailed = await sendMail({
    to: user.email,
    subject: "Your FXA Trade password change verification code",
    text: `Your FXA Trade verification code is ${code}.\n\nIt expires in 10 minutes. Enter it to confirm the password change.\n\nIf you did not request this, contact support immediately — someone may be trying to access your account.`,
  });

  passwordChangeCodes.set(userId, {
    userId,
    email: user.email,
    code,
    codeHash,
    expiresAt: new Date(Date.now() + CODE_TTL_MS),
    attempts: 0,
    emailed,
  });

  return {
    message: emailed ? "Verification code sent to your email" : "A verification code was generated — request it from support to proceed",
    delivered: (emailed ? "email" : "manual") as "email" | "manual",
  };
}

/** Admin-only: list pending password-change codes (for manual relay). */
export function listPasswordChangeCodes() {
  const now = Date.now();
  const out: { id: string; email: string; code: string; expiresAt: Date; emailed: boolean; attempts: number }[] = [];
  for (const entry of passwordChangeCodes.values()) {
    if (entry.expiresAt.getTime() > now) {
      out.push({
        id: entry.userId,
        email: entry.email,
        code: entry.code,
        expiresAt: entry.expiresAt,
        emailed: entry.emailed,
        attempts: entry.attempts,
      });
    }
  }
  return out;
}

export async function confirmPasswordChange(userId: string, code: string, newPassword: string) {
  const entry = passwordChangeCodes.get(userId);
  if (!entry || entry.expiresAt < new Date()) {
    throw new AppError("Invalid or expired verification code", 400);
  }
  if (entry.attempts >= CODE_MAX_ATTEMPTS) {
    passwordChangeCodes.delete(userId);
    throw new AppError("Too many attempts. Request a new code", 400);
  }

  const ok = await bcrypt.compare(code, entry.codeHash);
  if (!ok) {
    entry.attempts += 1;
    throw new AppError("Invalid verification code", 400);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  passwordChangeCodes.delete(userId);

  await sendMail({
    to: user.email,
    subject: "Your FXA Trade password was changed",
    text: "Your FXA Trade account password was changed successfully.\n\nIf this wasn't you, contact support immediately.",
  });

  return { message: "Password updated successfully" };
}

export async function submitKyc(userId: string, data: {
  documentType: string;
  documentNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}) {
  const existing = await prisma.kyc.findUnique({ where: { userId } });
  if (existing && existing.status !== "REJECTED") {
    throw new AppError("KYC already submitted", 409);
  }

  if (existing) {
    // Resubmit after rejection
    return prisma.kyc.update({
      where: { userId },
      data: { ...data, status: "PENDING", rejectionReason: null },
    });
  }

  return prisma.kyc.create({
    data: { userId, ...data },
  });
}
