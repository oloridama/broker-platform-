import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma, bcrypt, and the mailer before importing the service
vi.mock("../db", () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  __esModule: true,
  default: { compare: vi.fn(), hash: vi.fn() },
  compare: vi.fn(),
  hash: vi.fn(),
}));

vi.mock("./mailer", () => ({
  sendMail: vi.fn().mockResolvedValue(undefined),
}));

import * as userService from "./user.service";
import prisma from "../db";
import bcrypt from "bcrypt";
import { sendMail } from "./mailer";

describe("User Service — change password (email OTP)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValue(true);
    (bcrypt.hash as ReturnType<typeof vi.fn>).mockResolvedValue("hashed");
    (sendMail as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  describe("requestPasswordChange", () => {
    it("should reject a wrong current password and not email", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "h" });
      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

      await expect(userService.requestPasswordChange("u1", "wrong")).rejects.toThrow("Current password is incorrect");
      expect(sendMail).not.toHaveBeenCalled();
    });

    it("should email a 6-digit verification code on success", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "h" });

      const res = await userService.requestPasswordChange("u1", "Admin123!");

      expect(res.message).toContain("Verification code sent");
      expect(sendMail).toHaveBeenCalledTimes(1);
      const opts = (sendMail as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(opts.to).toBe("a@b.com");
      expect(opts.subject.toLowerCase()).toContain("verification code");
      expect(opts.text).toMatch(/\b\d{6}\b/);
    });
  });

  describe("confirmPasswordChange", () => {
    it("should reject a code that was never issued", async () => {
      await expect(userService.confirmPasswordChange("u-unknown", "123456", "NewPass123!")).rejects.toThrow(
        "Invalid or expired verification code",
      );
    });

    it("should update the password when the emailed code is valid", async () => {
      let generatedCode = "";
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1", email: "a@b.com", passwordHash: "h" });
      (bcrypt.hash as ReturnType<typeof vi.fn>).mockImplementation(async (v: string) => {
        generatedCode = v;
        return "h:" + v;
      });

      await userService.requestPasswordChange("u1", "Admin123!");
      expect(generatedCode).toMatch(/^\d{6}$/);

      (bcrypt.compare as ReturnType<typeof vi.fn>).mockImplementation(async (a: string) => a === generatedCode);
      const res = await userService.confirmPasswordChange("u1", generatedCode, "NewPass123!");

      expect(res.message).toContain("Password updated successfully");
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "u1" }, data: { passwordHash: expect.any(String) } }),
      );
      // request email + confirmation email
      expect(sendMail).toHaveBeenCalledTimes(2);
    });

    it("should reject a wrong code", async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u2", email: "b@b.com", passwordHash: "h" });
      await userService.requestPasswordChange("u2", "Admin123!");

      (bcrypt.compare as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
      await expect(userService.confirmPasswordChange("u2", "000000", "NewPass123!")).rejects.toThrow(
        "Invalid verification code",
      );
    });
  });
});
