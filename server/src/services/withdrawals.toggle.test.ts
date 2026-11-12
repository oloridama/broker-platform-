import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Per-account withdrawal switch.
 *
 * The important guarantee is that disabling withdrawals is enforced on the
 * SERVER: hiding a button in the UI is not a control. These tests assert the
 * service refuses the request even when a caller hits the API directly.
 */
vi.mock("../db", () => ({
  default: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    wallet: { findFirst: vi.fn() },
    withdrawalRequest: { aggregate: vi.fn(), create: vi.fn() },
    adminAction: { create: vi.fn() },
  },
}));

import * as adminService from "./admin.service";
import prisma from "../db";

const WALLET_ADDRESS = "0x1234567890abcdef1234";

describe("withdrawal switch (per account)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.adminAction.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("rejects a withdrawal when the admin has disabled withdrawals", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      withdrawalsEnabled: false,
    });

    await expect(
      adminService.createWithdrawalRequest("u1", WALLET_ADDRESS, 100),
    ).rejects.toThrow(/withdrawals are currently disabled/i);

    // Critically: nothing was written and the balance was never inspected.
    expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
    expect(prisma.wallet.findFirst).not.toHaveBeenCalled();
  });

  it("allows a withdrawal when withdrawals are enabled", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      withdrawalsEnabled: true,
    });
    (prisma.wallet.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "w1",
      balance: 500,
    });
    (prisma.withdrawalRequest.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { amount: 0 },
    });
    (prisma.withdrawalRequest.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "wr1",
      status: "PENDING",
    });

    const result = await adminService.createWithdrawalRequest("u1", WALLET_ADDRESS, 100);
    expect(result).toMatchObject({ id: "wr1", status: "PENDING" });
    expect(prisma.withdrawalRequest.create).toHaveBeenCalledOnce();
  });

  it("still enforces pending-balance reservation when enabled", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      withdrawalsEnabled: true,
    });
    (prisma.wallet.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "w1",
      balance: 150,
    });
    (prisma.withdrawalRequest.aggregate as ReturnType<typeof vi.fn>).mockResolvedValue({
      _sum: { amount: 100 },
    });

    await expect(
      adminService.createWithdrawalRequest("u1", WALLET_ADDRESS, 100),
    ).rejects.toThrow(/already pending approval/i);
    expect(prisma.withdrawalRequest.create).not.toHaveBeenCalled();
  });

  it("rejects an unknown user instead of silently allowing the request", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      adminService.createWithdrawalRequest("ghost", WALLET_ADDRESS, 10),
    ).rejects.toThrow(/user not found/i);
  });
});

describe("setUserWithdrawals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.adminAction.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
  });

  it("updates the flag and writes an audit entry when disabling", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: "trader@example.com",
      withdrawalsEnabled: true,
    });
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      email: "trader@example.com",
      withdrawalsEnabled: false,
    });

    const result = await adminService.setUserWithdrawals("admin1", "u1", false);

    expect(result.withdrawalsEnabled).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "u1" },
        data: { withdrawalsEnabled: false },
      }),
    );

    const logged = (prisma.adminAction.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(logged.actionType).toBe("WITHDRAWALS_DISABLED");
    expect(logged.adminId).toBe("admin1");
    expect(JSON.parse(logged.metadata)).toMatchObject({
      userId: "u1",
      enabled: false,
      previous: true,
    });
  });

  it("audit-logs re-enabling with a distinct action type", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      email: "trader@example.com",
      withdrawalsEnabled: false,
    });
    (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "u1",
      email: "trader@example.com",
      withdrawalsEnabled: true,
    });

    await adminService.setUserWithdrawals("admin1", "u1", true);

    const logged = (prisma.adminAction.create as ReturnType<typeof vi.fn>).mock.calls[0][0].data;
    expect(logged.actionType).toBe("WITHDRAWALS_ENABLED");
  });

  it("refuses to touch a user that does not exist", async () => {
    (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(
      adminService.setUserWithdrawals("admin1", "ghost", false),
    ).rejects.toThrow(/user not found/i);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});
