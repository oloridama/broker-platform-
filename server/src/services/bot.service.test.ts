import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma before importing the service
vi.mock("../db", () => ({
  default: {
    bot: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
    tradingAccount: {
      findMany: vi.fn(),
    },
    botTrade: {
      findMany: vi.fn(),
    },
  },
}));

import * as botService from "../services/bot.service";
import prisma from "../db";

describe("Bot Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getAvailableBots", () => {
    it("should return 7 bot templates", async () => {
      const bots = await botService.getAvailableBots();
      expect(bots).toHaveLength(7);
      expect(bots[0]).toHaveProperty("name");
      expect(bots[0]).toHaveProperty("type");
      expect(bots[0]).toHaveProperty("strategy");
      expect(bots[0]).toHaveProperty("dailyYieldMin");
      expect(bots[0]).toHaveProperty("dailyYieldMax");
    });

    it("should have all required template properties", async () => {
      const bots = await botService.getAvailableBots();
      for (const bot of bots) {
        expect(bot).toMatchObject({
          name: expect.any(String),
          type: expect.stringMatching(/^(CRYPTO|FOREX|INDEX|COMMODITY)$/),
          strategy: expect.any(String),
          dailyYieldMin: expect.any(Number),
          dailyYieldMax: expect.any(Number),
          riskLevel: expect.stringMatching(/^(Low|Medium|High)$/),
          targetPairs: expect.any(Array),
          exchanges: expect.any(Array),
        });
        expect(bot.dailyYieldMax).toBeGreaterThanOrEqual(bot.dailyYieldMin);
      }
    });

    it("should return different bot types", async () => {
      const bots = await botService.getAvailableBots();
      const types = new Set(bots.map((b) => b.type));
      expect(types.has("CRYPTO")).toBe(true);
    });
  });

  describe("getUserBots", () => {
    it("should return empty array for new user", async () => {
      (prisma.bot.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const bots = await botService.getUserBots("user-123");
      expect(bots).toEqual([]);
      expect(prisma.bot.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123" },
        orderBy: { createdAt: "desc" },
        include: { _count: { select: { trades: true } } },
      });
    });
  });

  describe("getEquityCurve", () => {
    it("should reconstruct equity from closed bot-trade P&L history", async () => {
      (prisma.tradingAccount.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { balance: "100000" },
      ]);
      (prisma.botTrade.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { pnl: 10, createdAt: new Date("2026-08-10T00:00:00.000Z") },
        { pnl: -5, createdAt: new Date("2026-08-11T00:00:00.000Z") },
      ]);

      const points = await botService.getEquityCurve("user-123");

      // start + 2 trades + end anchor
      expect(points.length).toBe(4);
      // start point = current balance minus total realized P&L (10 - 5 = 5)
      expect(points[0].equity).toBe(99995);
      expect(points[0].pnl).toBe(0);
      // after first trade: current - (totalPnl - cum) = 100000 - (5 - 10) = 100005
      expect(points[1].equity).toBe(100005);
      expect(points[1].pnl).toBe(10);
      // end anchor = current balance
      expect(points[points.length - 1].equity).toBe(100000);
      expect(points[points.length - 1].pnl).toBe(5);
    });

    it("should return a flat 2-point curve when there is no history", async () => {
      (prisma.tradingAccount.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
        { balance: "5000" },
      ]);
      (prisma.botTrade.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const points = await botService.getEquityCurve("user-123");

      expect(points.length).toBe(2);
      expect(points[0].equity).toBe(5000);
      expect(points[1].equity).toBe(5000);
    });

    it("should query only closed trades for the requesting user", async () => {
      (prisma.tradingAccount.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (prisma.botTrade.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await botService.getEquityCurve("user-123");

      expect(prisma.tradingAccount.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123", isActive: true },
      });
      expect(prisma.botTrade.findMany).toHaveBeenCalledWith({
        where: { userId: "user-123", status: "CLOSED" },
        orderBy: { createdAt: "asc" },
        select: { pnl: true, createdAt: true },
      });
    });
  });

  describe("createBot", () => {
    it("should create a bot from template index 0", async () => {
      const mockBot = { id: "bot-1", name: "Perpetual Contract Execution Bot", status: "INACTIVE" };
      (prisma.bot.create as ReturnType<typeof vi.fn>).mockResolvedValue(mockBot);

      const bot = await botService.createBot("user-123", 0);
      expect(prisma.bot.create).toHaveBeenCalled();
      expect(bot.name).toBe("Perpetual Contract Execution Bot");
    });

    it("should throw for invalid template index", async () => {
      await expect(botService.createBot("user-123", 999)).rejects.toThrow("Bot template not found");
    });
  });

  describe("toggleBot", () => {
    it("should start an inactive bot", async () => {
      (prisma.bot.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bot-1", userId: "user-123" });
      (prisma.bot.update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bot-1", status: "ACTIVE" });

      const bot = await botService.toggleBot("bot-1", "user-123", "start");
      expect(bot.status).toBe("ACTIVE");
    });

    it("should throw if bot does not belong to user", async () => {
      (prisma.bot.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      await expect(botService.toggleBot("bot-1", "wrong-user", "start")).rejects.toThrow("Bot not found");
    });
  });

  describe("deleteBot", () => {
    it("should delete an inactive bot", async () => {
      (prisma.bot.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bot-1", status: "INACTIVE", userId: "user-123" });
      (prisma.bot.delete as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bot-1" });

      const result = await botService.deleteBot("bot-1", "user-123");
      expect(result).toHaveProperty("id", "bot-1");
    });

    it("should throw if bot is active", async () => {
      (prisma.bot.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "bot-1", status: "ACTIVE", userId: "user-123" });
      await expect(botService.deleteBot("bot-1", "user-123")).rejects.toThrow("Stop the bot before deleting");
    });
  });
});
