import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies
vi.mock("../db", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tradingAccount: { create: vi.fn() },
    wallet: { create: vi.fn() },
    refreshToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

import * as authService from "../services/auth.service";
import prisma from "../db";

describe("Auth Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registerUser", () => {
    it("should throw if email already exists", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "existing" });
      await expect(
        authService.registerUser({
          email: "test@test.com",
          password: "Password1",
          firstName: "Test",
          lastName: "User",
        }),
      ).rejects.toThrow("already exists");
    });

    it("should create user with valid data", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (prisma.user.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "new-user",
        email: "test@test.com",
        firstName: "Test",
        lastName: "User",
        role: "USER",
        createdAt: new Date(),
      });
      (prisma.tradingAccount.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (prisma.wallet.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      const user = await authService.registerUser({
        email: "test@test.com",
        password: "Password1",
        firstName: "Test",
        lastName: "User",
      });

      expect(user.email).toBe("test@test.com");
      expect(user.firstName).toBe("Test");
    });
  });

  describe("loginUser", () => {
    it("should throw with invalid email", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(
        authService.loginUser("bad@test.com", "password"),
      ).rejects.toThrow("Invalid email or password");
    });

    it("should throw if account is deactivated", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "user-1",
        email: "test@test.com",
        passwordHash: "$2b$12$hash",
        isActive: false,
      });
      await expect(
        authService.loginUser("test@test.com", "password"),
      ).rejects.toThrow("deactivated");
    });
  });
});
