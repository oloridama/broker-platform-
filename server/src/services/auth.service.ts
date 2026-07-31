import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";
import prisma from "../db";
import { config } from "../config";
import { AppError } from "../utils/response";
import {
  signAccessToken,
  storeRefreshToken,
  verifyRefreshToken,
  revokeRefreshTokenFamily,
} from "../utils/jwt";

// ── Registration ────────────────────────────────────────
export async function registerUser(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) {
    throw new AppError("A user with this email already exists", 409);
  }

  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
    },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      createdAt: true,
    },
  });

  // Create default demo trading account and wallet for new users
  await Promise.all([
    prisma.tradingAccount.create({
      data: {
        userId: user.id,
        accountType: "DEMO",
        balance: 10000,
        equity: 10000,
        freeMargin: 10000,
      },
    }),
    prisma.wallet.create({
      data: { userId: user.id, balance: 0, currency: "USD", isDefault: true },
    }),
  ]);

  return user;
}

// ── Login ───────────────────────────────────────────────
export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError("Invalid email or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is deactivated. Contact support.", 403);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new AppError("Invalid email or password", 401);
  }

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const familyId = uuid();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await storeRefreshToken(user.id, familyId);

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

// ── Token refresh (with rotation) ───────────────────────
export async function refreshTokens(oldRefreshToken: string) {
  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw new AppError("Invalid or expired refresh token", 401);
  }

  // Check token exists and is not revoked
  const stored = await prisma.refreshToken.findUnique({
    where: { token: oldRefreshToken },
  });
  if (!stored || stored.revoked) {
    // Possible token theft — revoke family
    await revokeRefreshTokenFamily(payload.sub, payload.jti);
    throw new AppError("Token has been revoked", 401);
  }

  // Fetch user
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, role: true, isActive: true },
  });
  if (!user || !user.isActive) {
    throw new AppError("User not found or deactivated", 403);
  }

  // Rotate: revoke old family, issue new
  const newFamilyId = uuid();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const newRefreshToken = await storeRefreshToken(user.id, newFamilyId);

  // Revoke old family
  await revokeRefreshTokenFamily(payload.sub, payload.jti);

  return { accessToken, refreshToken: newRefreshToken };
}

// ── Logout ──────────────────────────────────────────────
export async function logoutUser(refreshToken: string) {
  try {
    const payload = verifyRefreshToken(refreshToken);
    await revokeRefreshTokenFamily(payload.sub, payload.jti);
  } catch {
    // Token already invalid — no-op
  }
}

// ── Password Reset ─────────────────────────────────────
const resetTokens = new Map<string, { userId: string; expiresAt: Date }>();

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // Don't reveal if email exists

  const token = uuid();
  resetTokens.set(token, { userId: user.id, expiresAt: new Date(Date.now() + 3600000) }); // 1 hour

  // In production, send email. For dev, log to console.
  console.log(`🔑 Password reset token for ${email}: ${token}`);
  return { message: "If the email exists, a reset link has been sent." };
}

export async function resetPassword(token: string, newPassword: string) {
  const entry = resetTokens.get(token);
  if (!entry || entry.expiresAt < new Date()) {
    throw new AppError("Invalid or expired reset token", 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await prisma.user.update({ where: { id: entry.userId }, data: { passwordHash } });
  resetTokens.delete(token);

  // Revoke all refresh tokens (force re-login)
  await prisma.refreshToken.updateMany({
    where: { userId: entry.userId },
    data: { revoked: true },
  });

  return { message: "Password reset successfully" };
}

// ── Email Verification ─────────────────────────────────
const verificationTokens = new Map<string, { userId: string; expiresAt: Date }>();

export async function sendVerificationEmail(userId: string, email: string) {
  const token = uuid();
  verificationTokens.set(token, { userId, expiresAt: new Date(Date.now() + 86400000) }); // 24 hours
  console.log(`📧 Verification token for ${email}: ${token}`);
  return token;
}

export async function verifyEmail(token: string) {
  const entry = verificationTokens.get(token);
  if (!entry || entry.expiresAt < new Date()) {
    throw new AppError("Invalid or expired verification token", 400);
  }
  await prisma.user.update({ where: { id: entry.userId }, data: { isActive: true } });
  verificationTokens.delete(token);
  return { message: "Email verified successfully" };
}
