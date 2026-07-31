import jwt, { SignOptions, JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import { v4 as uuid } from "uuid";
import prisma from "../db";
import { addSeconds } from "./date";

// ── Token payload shape ──────────────────────────────────
export interface AccessTokenPayload extends JwtPayload {
  sub: string; // userId
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  sub: string;
  jti: string; // token family ID
}

// ── Generate tokens ──────────────────────────────────────
export function signAccessToken(payload: Omit<AccessTokenPayload, "iat" | "exp">): string {
  const options: SignOptions = {
    expiresIn: config.jwt.accessExpiresIn as unknown as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.jwt.accessSecret, options);
}

export function signRefreshToken(payload: Omit<RefreshTokenPayload, "iat" | "exp">): string {
  const options: SignOptions = {
    expiresIn: config.jwt.refreshExpiresIn as unknown as SignOptions["expiresIn"],
  };
  return jwt.sign(payload, config.jwt.refreshSecret, options);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret) as RefreshTokenPayload;
}

// ── Token rotation helpers ───────────────────────────────
function expiresInToSeconds(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // default 15 min
  const value = parseInt(match[1], 10);
  switch (match[2]) {
    case "s": return value;
    case "m": return value * 60;
    case "h": return value * 3600;
    case "d": return value * 86400;
    default: return 900;
  }
}

/**
 * Persist a new refresh token in the database.
 * Each family is identified by a UUID (jti) so we can revoke the whole
 * family on suspected theft.
 */
export async function storeRefreshToken(
  userId: string,
  familyId: string,
): Promise<string> {
  // Revoke all tokens in the family (rotation)
  await prisma.refreshToken.updateMany({
    where: { userId, token: { startsWith: familyId } },
    data: { revoked: true },
  });

  const expiresIn = expiresInToSeconds(config.jwt.refreshExpiresIn);
  const token = signRefreshToken({ sub: userId, jti: familyId });

  await prisma.refreshToken.create({
    data: {
      token,
      userId,
      expiresAt: addSeconds(new Date(), expiresIn),
    },
  });

  return token;
}

export async function revokeRefreshTokenFamily(userId: string, jti: string): Promise<void> {
  await prisma.refreshToken.updateMany({
    where: { userId, token: { contains: jti } },
    data: { revoked: true },
  });
}
