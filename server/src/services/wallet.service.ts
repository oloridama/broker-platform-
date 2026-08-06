import prisma from "../db";
import { AppError } from "../utils/response";
import { toMoney } from "../utils/money";

// ── Wallets ─────────────────────────────────────────────
export async function getUserWallets(userId: string) {
  return prisma.wallet.findMany({
    where: { userId },
    include: {
      _count: { select: { transactions: true } },
    },
  });
}

export async function deposit(userId: string, walletId: string, amount: number, currency = "USD") {
  // Defense-in-depth: reject Infinity/NaN (e.g. 1e309) even if validator bypassed
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    throw new AppError("Amount must be a valid positive number", 400);
  }
  amount = toMoney(amount); // round to cents
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) throw new AppError("Wallet not found", 404);

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        walletId,
        type: "DEPOSIT",
        amount,
        currency,
        status: "COMPLETED",
        description: `Deposit of ${amount} ${currency}`,
      },
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { increment: amount } },
    }),
  ]);

  return transaction;
}

export async function withdraw(userId: string, walletId: string, amount: number, currency = "USD") {
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    throw new AppError("Amount must be a valid positive number", 400);
  }
  if (!Number.isFinite(amount) || amount <= 0 || amount > 100_000_000) {
    throw new AppError("Amount must be a valid positive number", 400);
  }
  amount = toMoney(amount); // round to cents
  const wallet = await prisma.wallet.findFirst({ where: { id: walletId, userId } });
  if (!wallet) throw new AppError("Wallet not found", 404);
  if (Number(wallet.balance) < amount) throw new AppError("Insufficient balance", 400);

  const [transaction] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        walletId,
        type: "WITHDRAWAL",
        amount,
        currency,
        status: "PENDING",
        description: `Withdrawal request of ${amount} ${currency}`,
      },
    }),
    prisma.wallet.update({
      where: { id: walletId },
      data: { balance: { decrement: amount } },
    }),
  ]);

  return transaction;
}

export async function getTransactions(userId: string, walletId?: string) {
  const wallets = walletId
    ? [{ id: walletId }]
    : await prisma.wallet.findMany({ where: { userId }, select: { id: true } });

  return prisma.transaction.findMany({
    where: { walletId: { in: wallets.map((w) => w.id) } },
    orderBy: { createdAt: "desc" },
    include: { wallet: { select: { currency: true } } },
    take: 50,
  });
}
