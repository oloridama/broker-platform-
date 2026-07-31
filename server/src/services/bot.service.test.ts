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
