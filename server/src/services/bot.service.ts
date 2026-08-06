import { Prisma } from "@prisma/client";
import prisma from "../db";
import { AppError } from "../utils/response";

// ── Default bot templates ──────────────────────────────
const BOT_TEMPLATES = [
  {
    name: "MA Crossover + RSI Strategy Bot",
    type: "CRYPTO" as const,
    strategy: "ma_rsi_crossover",
    dailyYieldMin: 1.50,
    dailyYieldMax: 6.00,
    riskLevel: "Medium",
    targetPairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "ADAUSDT", "AVAXUSDT"],
    exchanges: ["Binance", "Bybit", "OKX"],
    // Special: runs on 5-min timeframe with EMA9/EMA21 crossover confirmed by RSI14
  },
  {
    name: "Perpetual Contract Execution Bot",
    type: "CRYPTO" as const,
    strategy: "perpetual_arbitrage",
    dailyYieldMin: 1.00,
    dailyYieldMax: 5.00,
    riskLevel: "Medium",
    targetPairs: ["BTCUSDT", "ETHUSDT", "BCHUSDT", "XRPUSDT", "LTCUSDT"],
    exchanges: ["Binance", "Bybit", "OKX", "KuCoin", "Bitget"],
  },
  {
    name: "Spot Grid Trading Bot",
    type: "CRYPTO" as const,
    strategy: "spot_grid",
    dailyYieldMin: 0.50,
    dailyYieldMax: 2.50,
    riskLevel: "Low",
    targetPairs: ["SKRUSDT", "LABUSDT", "B3USDT", "UNIUSDT", "DOTUSDT"],
    exchanges: ["Binance", "Bybit", "OKX"],
  },
  {
    name: "Futures Scalping Algorithm",
    type: "CRYPTO" as const,
    strategy: "futures_scalping",
    dailyYieldMin: 2.00,
    dailyYieldMax: 8.00,
    riskLevel: "High",
    targetPairs: ["ONGUSDT", "AIAUSDT", "ARCUSDT", "TRXUSDT", "MATICUSDT"],
    exchanges: ["Binance", "Bybit"],
  },
  {
    name: "Forex Correlation Trader",
    type: "FOREX" as const,
    strategy: "forex_correlation",
    dailyYieldMin: 0.30,
    dailyYieldMax: 1.50,
    riskLevel: "Low",
    targetPairs: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "NZDUSD"],
    exchanges: ["Multiple LPs"],
  },
  {
    name: "Index Momentum Bot",
    type: "INDEX" as const,
    strategy: "index_momentum",
    dailyYieldMin: 0.80,
    dailyYieldMax: 3.00,
    riskLevel: "Medium",
    targetPairs: ["US30", "US500", "NAS100", "UK100", "GER40"],
    exchanges: ["Multiple LPs"],
  },
  {
    name: "Commodity Swing Trader",
    type: "COMMODITY" as const,
    strategy: "commodity_swing",
    dailyYieldMin: 1.20,
    dailyYieldMax: 4.00,
    riskLevel: "Medium",
    targetPairs: ["XAUUSD", "XAGUSD", "USOIL", "UKOIL", "NGAS"],
    exchanges: ["Multiple LPs"],
  },
];

// ── Service functions ──────────────────────────────────

export async function getAvailableBots() {
  return BOT_TEMPLATES;
}

export async function getUserBots(userId: string) {
  return prisma.bot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { trades: true } } },
  });
}

export async function getBotTrades(botId: string, userId: string, limit = 50) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError("Bot not found", 404);

  return prisma.botTrade.findMany({
    where: { botId },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 100),
  });
}

export async function createBot(
  userId: string,
  templateIndex: number,
  config?: Record<string, unknown>,
  allocation: number = 1000,
) {
  const template = BOT_TEMPLATES[templateIndex];
  if (!template) throw new AppError("Bot template not found", 404);

  const safeAllocation = Number.isFinite(allocation) && allocation > 0
    ? Math.min(allocation, 1_000_000)
    : 1000;

  const bot = await prisma.bot.create({
    data: {
      userId,
      name: template.name,
      type: template.type,
      strategy: template.strategy,
      dailyYieldMin: template.dailyYieldMin,
      dailyYieldMax: template.dailyYieldMax,
      riskLevel: template.riskLevel,
      targetPairs: template.targetPairs.join(","),
      exchanges: template.exchanges.join(","),
      config: JSON.stringify(config || {}),
      allocation: safeAllocation,
    },
  });

  return bot;
}

export async function toggleBot(botId: string, userId: string, action: "start" | "pause" | "stop") {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError("Bot not found", 404);

  const statusMap = {
    start: "ACTIVE",
    pause: "PAUSED",
    stop: "INACTIVE",
  } as const;

  const updateData: Record<string, unknown> = { status: statusMap[action] };
  if (action === "start") updateData.lastRunAt = new Date();

  return prisma.bot.update({ where: { id: botId }, data: updateData });
}

/**
 * Manual bot tick (used by POST /api/bots/:id/simulate).
 * Delegates to the real engine: MA+RSI uses live signals, others simulate.
 */
export async function simulateBotProfit(botId: string, userId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError("Bot not found", 404);
  if (bot.status !== "ACTIVE") throw new AppError("Bot is not active", 400);

  const { tickBot, persistTick } = await import("./bot.engine");
  const trade = await tickBot({
    id: bot.id,
    strategy: bot.strategy,
    targetPairs: bot.targetPairs,
    allocation: bot.allocation,
  });
  if (!trade) {
    throw new AppError("No trade signal this tick — try again later", 202);
  }
  const record = await persistTick(bot.id, bot.userId, trade);
  return { botId: bot.id, trade: record };
}

// ── ROI Calculator ─────────────────────────────────────
export interface RoiInput {
  strategy: string;
  amount: number;
  durationDays: number;
}

export interface RoiResult {
  strategy: string;
  amount: number;
  durationDays: number;
  projectedProfit: number;
  netPayout: number;
  annualizedRoi: number;
  compoundOptimized: boolean;
  maturityDate: string;
}

export function calculateRoi(input: RoiInput): RoiResult {
  const strategies: Record<string, number> = {
    "High-Yield SavingsPlus": 3.50,
    "Bitcoin Accumulator": 5.50,
    "Overnight Liquidity Pool": 2.50,
    "Emerging Markets": 15.00,
    "Metaverse Index Fund": 18.00,
    "GameFi Development": 16.50,
  };

  const annualRoi = strategies[input.strategy] || 3.50;
  const dailyRate = annualRoi / 365 / 100;
  const projectedProfit = input.amount * dailyRate * input.durationDays;
  const netPayout = input.amount + projectedProfit;
  const maturityDate = new Date(Date.now() + input.durationDays * 86400000).toISOString().split("T")[0];

  return {
    strategy: input.strategy,
    amount: input.amount,
    durationDays: input.durationDays,
    projectedProfit: Math.round(projectedProfit * 100) / 100,
    netPayout: Math.round(netPayout * 100) / 100,
    annualizedRoi: annualRoi,
    compoundOptimized: input.durationDays >= 30,
    maturityDate,
  };
}

export async function deleteBot(botId: string, userId: string) {
  const bot = await prisma.bot.findFirst({ where: { id: botId, userId } });
  if (!bot) throw new AppError("Bot not found", 404);
  if (bot.status === "ACTIVE") throw new AppError("Stop the bot before deleting", 400);
  return prisma.bot.delete({ where: { id: botId } });
}
