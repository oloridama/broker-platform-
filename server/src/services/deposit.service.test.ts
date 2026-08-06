import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../db", () => ({
  default: {
    depositMethod: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    pendingDeposit: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    wallet: { findFirst: vi.fn(), update: vi.fn() },
    transaction: { create: vi.fn() },
    adminAction: { create: vi.fn() },
    $transaction: vi.fn((ops) => Promise.all(ops)),
  },
}));

import * as depositService from "../services/deposit.service";
import prisma from "../db";

describe("Deposit Service", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  describe("getActiveDepositMethods", () => {
    it("returns only active methods with parsed config", async () => {
      (prisma.depositMethod.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        {
          id: "m1", type: "CUSTODIAN", name: "BTC Wallet", description: "d",
          minAmount: 50, maxAmount: 50000, isActive: true,
          config: JSON.stringify({ custodianAddress: "bc1abc", network: "BTC" }),
        },
      ]);

      const methods = await depositService.getActiveDepositMethods();
      expect(methods).toHaveLength(1);
      expect(methods[0].config.custodianAddress).toBe("bc1abc");
      expect(methods[0].config.network).toBe("BTC");
    });

    it("excludes inactive methods (Prisma filters)", async () => {
      (prisma.depositMethod.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const methods = await depositService.getActiveDepositMethods();
      expect(methods).toEqual([]);
      expect(prisma.depositMethod.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { isActive: true } }));
    });
  });

  describe("createCryptoDeposit", () => {
    const baseMethod = {
      id: "m1", type: "CUSTODIAN", name: "BTC", minAmount: 50, maxAmount: 50000,
      config: JSON.stringify({ custodianAddress: "bc1abc", network: "BTC", instructions: "send btc" }),
    };

    it("returns custodian address and creates PENDING deposit", async () => {
      (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseMethod);
      (prisma.pendingDeposit.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "pd1", userId: "u1", methodId: "m1", amount: 100, currency: "USD", status: "PENDING", createdAt: new Date(),
      });

      const result = await depositService.createCryptoDeposit("u1", "m1", 100);
      expect(result.custodianAddress).toBe("bc1abc");
      expect(result.status).toBe("PENDING");
      expect(result.amount).toBe(100);
    });

    it("rejects Infinity amount (DoS guard)", async () => {
      await expect(depositService.createCryptoDeposit("u1", "m1", 1e309)).rejects.toThrow("valid positive number");
      expect(prisma.pendingDeposit.create).not.toHaveBeenCalled();
    });

    it("rejects negative amount", async () => {
      await expect(depositService.createCryptoDeposit("u1", "m1", -50)).rejects.toThrow("valid positive number");
    });

    it("rejects amount below method minimum", async () => {
      (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseMethod);
      await expect(depositService.createCryptoDeposit("u1", "m1", 10)).rejects.toThrow("Minimum deposit");
    });

    it("rejects amount above method maximum", async () => {
      (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseMethod);
      await expect(depositService.createCryptoDeposit("u1", "m1", 100000)).rejects.toThrow("Maximum deposit");
    });

    it("throws if no custodian address configured", async () => {
      (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...baseMethod, config: JSON.stringify({}),
      });
      await expect(depositService.createCryptoDeposit("u1", "m1", 100)).rejects.toThrow("No custodian wallet");
    });

    it("rounds money to 2 decimal places", async () => {
      (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(baseMethod);
      (prisma.pendingDeposit.create as ReturnType<typeof vi.fn>).mockImplementation(async (args: { data: { amount: number } }) => ({
        ...args.data, id: "pd1", createdAt: new Date(),
      }));
      const result = await depositService.createCryptoDeposit("u1", "m1", 99.999);
      expect(result.amount).toBe(100); // rounded
    });
  });

  describe("confirmDeposit", () => {
    it("credits wallet and marks deposit confirmed", async () => {
      (prisma.pendingDeposit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "pd1", userId: "u1", amount: 200, currency: "USD", status: "PENDING",
      });
      (prisma.wallet.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "w1" });
      (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(async (ops: unknown[]) => ops);

      const result = await depositService.confirmDeposit("admin1", "pd1", "txhash123");
      expect(result.credited).toBe(200);
      expect(prisma.wallet.update).toHaveBeenCalledWith(expect.objectContaining({
        data: { balance: { increment: 200 } },
      }));
    });

    it("rejects already-processed deposit", async () => {
      (prisma.pendingDeposit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "pd1", status: "CONFIRMED",
      });
      await expect(depositService.confirmDeposit("admin1", "pd1")).rejects.toThrow("already processed");
    });

    it("rejects nonexistent deposit", async () => {
      (prisma.pendingDeposit.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(depositService.confirmDeposit("admin1", "nope")).rejects.toThrow("Deposit not found");
    });
  });

  describe("toggleMethodActive", () => {
    it("toggles isActive", async () => {
      (prisma.depositMethod.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1", isActive: true });
      (prisma.depositMethod.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "m1", isActive: false });
      await depositService.toggleMethodActive("m1");
      expect(prisma.depositMethod.update).toHaveBeenCalledWith(expect.objectContaining({ data: { isActive: false } }));
    });

    it("throws for unknown method", async () => {
      (prisma.depositMethod.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(depositService.toggleMethodActive("nope")).rejects.toThrow("Deposit method not found");
    });
  });
});
