import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

  // Regression: a lockout used to be effectively permanent. `count` was never
  // reset when the lock expired, so the very next wrong password re-locked the
  // account for another 15 minutes — and that repeated forever.
  describe("lock expiry", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("gives a full set of attempts again once the lock expires", async () => {
      vi.useFakeTimers();

      // Burn all 5 attempts → locked
      for (let i = 0; i < 5; i++) {
        await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow();
      }
      await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow(/locked/i);

      // Wait out the 15 minute lock
      vi.advanceTimersByTime(16 * 60 * 1000);

      // One more typo must NOT re-lock instantly — it should count as attempt 1.
      await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow(/4 attempts left/);
    });

    it("does not stay locked after the window passes", async () => {
      vi.useFakeTimers();

      for (let i = 0; i < 5; i++) {
        await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow();
      }
      vi.advanceTimersByTime(16 * 60 * 1000);

      // Correct password now works instead of returning 423 forever.
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
      (prisma.refreshToken.create as ReturnType<typeof vi.fn>).mockResolvedValue({ token: "rt" });
      await expect(authService.loginUser("lock@test.com", "right")).resolves.toHaveProperty("accessToken");
    });

    it("forgets stale failures after an hour so typos cannot accumulate", async () => {
      vi.useFakeTimers();

      for (let i = 0; i < 4; i++) {
        await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow(/attempts left/);
      }
      // More than a day later, the old failures must not count.
      vi.advanceTimersByTime(24 * 60 * 60 * 1000);
      await expect(authService.loginUser("lock@test.com", "wrong")).rejects.toThrow(/4 attempts left/);
    });
  });
});
