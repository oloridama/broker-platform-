import prisma from "../db";
import { AppError } from "../utils/response";

// ── Quotes ──────────────────────────────────────────────
export async function getQuotes(symbols?: string[]) {
  const where = symbols?.length
    ? { instrument: { symbol: { in: symbols } } }
    : {};

  return prisma.quote.findMany({
    where,
    include: {
      instrument: { select: { symbol: true, name: true, type: true, spread: true } },
    },
    orderBy: { timestamp: "desc" },
  });
}

// ── Instruments ─────────────────────────────────────────
export async function getInstruments(type?: string) {
  return prisma.instrument.findMany({
    where: { isActive: true, ...(type ? { type: type as never } : {}) },
    include: {
      quotes: { orderBy: { timestamp: "desc" }, take: 1 },
    },
  });
}

// ── Orders ──────────────────────────────────────────────
export async function createOrder(data: {
  userId: string;
  instrumentId: string;
  accountId: string;
  type: string;
  side: string;
  lotSize: number;
  price?: number;
  stopLoss?: number;
  takeProfit?: number;
}) {
  // Guard against Infinity/NaN (e.g. lotSize: 1e309) bypassing .positive()
  if (!Number.isFinite(data.lotSize) || data.lotSize <= 0 || data.lotSize > 1000) {
    throw new AppError("Lot size must be a valid positive number", 400);
  }
  for (const field of ["price", "stopLoss", "takeProfit"] as const) {
    const v = data[field];
    if (v !== undefined && (!Number.isFinite(v) || v <= 0)) {
      throw new AppError(`${field} must be a valid positive number`, 400);
    }
  }
  // Verify account belongs to user
  const account = await prisma.tradingAccount.findFirst({
    where: { id: data.accountId, userId: data.userId },
  });
  if (!account) throw new AppError("Trading account not found", 404);

  // Verify instrument
  const instrument = await prisma.instrument.findUnique({
    where: { id: data.instrumentId },
  });
  if (!instrument || !instrument.isActive) throw new AppError("Instrument not available", 404);

  // For MARKET orders, execute immediately with latest quote
  let status: "PENDING" | "EXECUTED" = "PENDING";
  let filledPrice: number | undefined;

  if (data.type === "MARKET") {
    const latestQuote = await prisma.quote.findFirst({
      where: { instrumentId: data.instrumentId },
      orderBy: { timestamp: "desc" },
    });
    if (!latestQuote) throw new AppError("No quote available for this instrument", 400);

    filledPrice = data.side === "BUY" ? Number(latestQuote.ask) : Number(latestQuote.bid);
    status = "EXECUTED";
  }

  const order = await prisma.order.create({
    data: {
      userId: data.userId,
      accountId: data.accountId,
      instrumentId: data.instrumentId,
      type: data.type as never,
      side: data.side as never,
      lotSize: data.lotSize,
      price: data.price ?? filledPrice,
      stopLoss: data.stopLoss,
      takeProfit: data.takeProfit,
      status,
      filledPrice,
      filledAt: status === "EXECUTED" ? new Date() : null,
      commission: status === "EXECUTED" ? Number(instrument.commission) * data.lotSize : 0,
    },
    include: {
      instrument: { select: { symbol: true, name: true } },
    },
  });

  // If executed, create/update position
  if (status === "EXECUTED" && filledPrice) {
    await upsertPosition(data.accountId, data.instrumentId, data.side as "BUY" | "SELL", data.lotSize, filledPrice);
  }

  return order;
}

async function upsertPosition(
  accountId: string,
  instrumentId: string,
  side: "BUY" | "SELL",
  lotSize: number,
  price: number,
) {
  const existing = await prisma.position.findFirst({
    where: { accountId, instrumentId, side, isOpen: true },
  });

  if (existing) {
    // Average into position
    const totalLots = Number(existing.lotSize) + lotSize;
    const avgPrice =
      (Number(existing.openPrice) * Number(existing.lotSize) + price * lotSize) / totalLots;
    await prisma.position.update({
      where: { id: existing.id },
      data: { lotSize: totalLots, openPrice: avgPrice },
    });
  } else {
    await prisma.position.create({
      data: {
        accountId,
        instrumentId,
        side,
        lotSize,
        openPrice: price,
        currentPrice: price,
      },
    });
  }
}

export async function getUserOrders(userId: string, status?: string) {
  return prisma.order.findMany({
    where: { userId, ...(status ? { status: status as never } : {}) },
    include: {
      instrument: { select: { symbol: true, name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function cancelOrder(orderId: string, userId: string) {
  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
  });
  if (!order) throw new AppError("Order not found", 404);
  if (order.status !== "PENDING") throw new AppError("Only pending orders can be cancelled", 400);

  return prisma.order.update({
    where: { id: orderId },
    data: { status: "CANCELLED" },
  });
}

// ── Positions ───────────────────────────────────────────
export async function getUserPositions(userId: string) {
  // Get accounts for user
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    select: { id: true },
  });
  const accountIds = accounts.map((a) => a.id);

  return prisma.position.findMany({
    where: { accountId: { in: accountIds }, isOpen: true },
    include: {
      instrument: { select: { symbol: true, name: true, type: true, spread: true } },
      account: { select: { id: true, accountType: true, leverage: true } },
    },
    orderBy: { openedAt: "desc" },
  });
}

// ── Accounts ────────────────────────────────────────────
export async function getUserAccounts(userId: string) {
  return prisma.tradingAccount.findMany({
    where: { userId, isActive: true },
    include: {
      _count: { select: { orders: true, positions: true } },
    },
  });
}
