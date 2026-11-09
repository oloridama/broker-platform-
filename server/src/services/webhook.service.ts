import prisma from "../db";
import { AppError } from "../utils/response";

// ── Bot-engine webhook handling (M1) ──────────────────
// Receives realized P&L from the standalone bot engine and credits the
// user's default wallet exactly once (idempotent via idempotencyKey).

export interface BotProfitPayload {
  userId: string;
  botId: string;
  pnl: number;
  currency?: string;
  idempotencyKey: string;
}

export async function applyBotProfit(payload: BotProfitPayload) {
  const idempotencyKey = String(payload.idempotencyKey || "").trim();
  if (!idempotencyKey) throw new AppError("idempotencyKey is required", 400);

  // Exactly-once: skip if this delivery was already processed.
  const existing = await prisma.webhookDelivery.findUnique({ where: { idempotencyKey } });
  if (existing) return { applied: true, duplicate: true };

  const pnl = Math.round(Number(payload.pnl) * 100) / 100;
  if (!Number.isFinite(pnl)) throw new AppError("Invalid pnl", 400);
  const currency = payload.currency || "USD";

  const user = await prisma.user.findUnique({ where: { id: payload.userId } });
  if (!user) throw new AppError("User not found", 404);

  if (pnl !== 0) {
    const wallet = await prisma.wallet.findFirst({ where: { userId: payload.userId, isDefault: true } });
    if (wallet) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: pnl } },
      });
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: pnl > 0 ? "BOT_PROFIT" : "BOT_LOSS",
          amount: Math.abs(pnl),
          currency,
          status: "COMPLETED",
          reference: `Engine bot #${String(payload.botId || "").slice(0, 8)}`,
          description: `Bot engine sync: ${pnl > 0 ? "profit" : "loss"} $${Math.abs(pnl)} (${idempotencyKey.slice(0, 12)})`,
        },
      });
    }
  }

  await prisma.webhookDelivery.create({
    data: { idempotencyKey, event: "bot.profit", payload: JSON.stringify(payload), status: "PROCESSED" },
  });

  return { applied: true };
}
