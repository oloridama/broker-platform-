import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    refreshToken: { updateMany: vi.fn(), create: vi.fn() },
    tradingAccount: { create: vi.fn() },
    wallet: { create: vi.fn() },
  },
}));
vi.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import * as authService from "../services/auth.service";
import prisma from "../db";
import bcrypt from "bcrypt";

describe("Auth Service: Account Lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the in-memory lockout map between tests
    authService.resetFailedAttempts();
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1", email: "lock@test.com", passwordHash: "hash", isActive: true, role: "USER", firstName: "L", lastName: "T",
    });
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("locks account after 5 failed attempts", async () => {
    // Attempts 1-4: generic invalid message (with attempts left)
    for (let i = 0; i < 4; i++) {
      await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow("Invalid email");
    }
    // 5th attempt triggers the lock message
    await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow("Too many failed attempts");
    // 6th attempt → account is now locked
    await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow("locked");
  });

  it("resets counter on successful login", async () => {
    // Fail twice
    for (let i = 0; i < 2; i++) {
      await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow("Invalid email");
    }
    // Now succeed
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({ token: "rt" });
    const result = await authService.loginUser("lock@test.com", "right");
    expect(result).toHaveProperty("accessToken");
    // Counter reset → next failure says 4 attempts left (fresh)
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(false);
    await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow("Invalid email");
  });
});
