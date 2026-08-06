import prisma from "./db";
import { tickBot, persistTick } from "./services/bot.engine";

// ── Bot scheduler ──────────────────────────────────────
// Every 5 minutes, tick every ACTIVE bot:
//   - MA + RSI bot runs REAL technical signals (EMA9/EMA21 + RSI14 on live candles)
//   - other strategies run their strategy-flavored simulations
// Trades are recorded, totals updated, and realized P&L is credited to wallets.

const TICK_MS = 5 * 60 * 1000; // 5 minutes
let running = false;

export async function tickAllBots() {
  if (running) return; // avoid overlapping ticks
  running = true;
  try {
    const bots = await prisma.bot.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, userId: true, strategy: true, targetPairs: true, allocation: true },
    });
    if (!bots.length) return;

    for (const bot of bots) {
      try {
        const trade = await tickBot(bot);
        if (trade) {
          await persistTick(bot.id, bot.userId, trade);
        }
      } catch (err) {
        console.warn(`[bots] tick failed for ${bot.id}:`, (err as Error).message);
      }
    }
  } catch (err) {
    console.warn("[bots] scheduler error:", (err as Error).message);
  } finally {
    running = false;
  }
}

export function startBotScheduler() {
  // Initial tick shortly after boot, then every 5 minutes
  setTimeout(() => {
    tickAllBots().catch(() => {});
  }, 10_000);
  setInterval(() => {
    tickAllBots().catch(() => {});
  }, TICK_MS);
  console.log("🤖 Bot scheduler started (ticks every 5 min)");
}
