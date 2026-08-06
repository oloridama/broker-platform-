import prisma from "../db";
import { AppError } from "../utils/response";

// ── Deposit Methods (user-facing) ──────────────────────

/** Return only ACTIVE methods, with config (incl. custodian address) for crypto */
export async function getActiveDepositMethods() {
  const methods = await prisma.depositMethod.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  return methods.map((m) => {
    let config: Record<string, unknown> = {};
    try { config = JSON.parse(m.config); } catch { /* ignore */ }
    // Expose the custodian public address to users for crypto deposits
    return { id: m.id, type: m.type, name: m.name, description: m.description, minAmount: m.minAmount, maxAmount: m.maxAmount, config };
  });
}

/**
 * Create a crypto deposit request. The user sees the custodian public address
 * and sends funds to the pool. Admin confirms once the tx is verified.
 */
export async function createCryptoDeposit(
  userId: string,
  methodId: string,
  amount: number,
  currency = "USD",
) {
  if (!amount || amount <= 0) throw new AppError("Amount must be positive", 400);

  const method = await prisma.depositMethod.findFirst({ where: { id: methodId, isActive: true } });
  if (!method) throw new AppError("Deposit method not found or inactive", 404);

  if (amount < method.minAmount) throw new AppError(`Minimum deposit is $${method.minAmount}`, 400);
  if (amount > method.maxAmount) throw new AppError(`Maximum deposit is $${method.maxAmount}`, 400);

  // Parse config — extract custodian wallet address
  let config: Record<string, unknown> = {};
  try { config = JSON.parse(method.config); } catch { /* ignore */ }

  const custodianAddress = config.custodianAddress as string | undefined;
  if (!custodianAddress) throw new AppError("No custodian wallet configured for this method", 400);

  // Reserve a deposit record in PENDING state
  const pending = await prisma.pendingDeposit.create({
    data: {
      userId,
      methodId,
      amount,
      currency,
      status: "PENDING",
    },
  });

  return {
    id: pending.id,
    amount,
    currency,
    status: pending.status,
    custodianAddress,       // the shared pool address to send funds to
    network: config.network as string | undefined,
    instructions: config.instructions as string | undefined,
    createdAt: pending.createdAt,
  };
}

/** User's own deposit history */
export async function getUserDeposits(userId: string) {
  return prisma.pendingDeposit.findMany({
    where: { userId },
    include: { method: { select: { name: true, type: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ── Admin: Manage methods ──────────────────────────────

/** All methods including inactive (for admin panel) */
export async function getAllMethods() {
  return prisma.depositMethod.findMany({ orderBy: { createdAt: "asc" } });
}

export async function createMethod(data: {
  type: string;
  name: string;
  description?: string;
  minAmount?: number;
  maxAmount?: number;
  config?: Record<string, unknown>;
}) {
  return prisma.depositMethod.create({
    data: {
      type: data.type,
      name: data.name,
      description: data.description || null,
      minAmount: data.minAmount || 0,
      maxAmount: data.maxAmount || 100000,
      config: JSON.stringify(data.config || {}),
    },
  });
}

export async function updateMethod(
  methodId: string,
  data: Partial<{
    name: string;
    description: string;
    minAmount: number;
    maxAmount: number;
    config: Record<string, unknown>;
  }>,
) {
  const method = await prisma.depositMethod.findUnique({ where: { id: methodId } });
  if (!method) throw new AppError("Deposit method not found", 404);

  const update: Record<string, unknown> = {};
  if (data.name !== undefined) update.name = data.name;
  if (data.description !== undefined) update.description = data.description;
  if (data.minAmount !== undefined) update.minAmount = data.minAmount;
  if (data.maxAmount !== undefined) update.maxAmount = data.maxAmount;
  if (data.config !== undefined) update.config = JSON.stringify(data.config);

  return prisma.depositMethod.update({ where: { id: methodId }, data: update });
}

export async function toggleMethodActive(methodId: string) {
  const method = await prisma.depositMethod.findUnique({ where: { id: methodId } });
  if (!method) throw new AppError("Deposit method not found", 404);
  return prisma.depositMethod.update({
    where: { id: methodId },
    data: { isActive: !method.isActive },
  });
}

export async function deleteMethod(methodId: string) {
  const pendingCount = await prisma.pendingDeposit.count({ where: { methodId, status: "PENDING" } });
  if (pendingCount > 0) throw new AppError("Cannot delete method with pending deposits", 400);
  await prisma.depositMethod.delete({ where: { id: methodId } });
  return { success: true };
}

// ── Admin: Manage pending deposits ─────────────────────

export async function getPendingDeposits(status?: string) {
  return prisma.pendingDeposit.findMany({
    where: status ? { status } : {},
    include: {
      user: { select: { email: true, firstName: true, lastName: true } },
      method: { select: { name: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

/**
 * Confirm a pending deposit → credit the user's default wallet.
 * Also records a visible DEPOSIT transaction for the user's history.
 */
export async function confirmDeposit(
  adminId: string,
  depositId: string,
  txHash?: string,
  note?: string,
) {
  const deposit = await prisma.pendingDeposit.findUnique({ where: { id: depositId } });
  if (!deposit) throw new AppError("Deposit not found", 404);
  if (deposit.status !== "PENDING") throw new AppError("Deposit already processed", 400);

  // Credit user's default wallet
  const wallet = await prisma.wallet.findFirst({
    where: { userId: deposit.userId, isDefault: true },
  });
  if (!wallet) throw new AppError("User has no wallet", 404);

  await prisma.$transaction([
    prisma.wallet.update({
      where: { id: wallet.id },
      data: { balance: { increment: deposit.amount } },
    }),
    prisma.transaction.create({
      data: {
        walletId: wallet.id,
        type: "DEPOSIT",
        amount: deposit.amount,
        currency: deposit.currency,
        status: "COMPLETED",
        description: `Deposit via ${deposit.methodId} (${deposit.amount} ${deposit.currency})`,
        metadata: JSON.stringify({ depositId: deposit.id, txHash }),
      },
    }),
    prisma.pendingDeposit.update({
      where: { id: depositId },
      data: { status: "CONFIRMED", txHash: txHash || null, adminNote: note || null, reviewedBy: adminId, reviewedAt: new Date() },
    }),
  ]);

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: "DEPOSIT_CONFIRMED",
      targetId: deposit.userId,
      description: `Confirmed deposit $${deposit.amount} for user`,
      metadata: JSON.stringify({ depositId, txHash }),
    },
  });

  return { success: true, credited: deposit.amount };
}

export async function rejectDeposit(adminId: string, depositId: string, reason?: string) {
  const deposit = await prisma.pendingDeposit.findUnique({ where: { id: depositId } });
  if (!deposit) throw new AppError("Deposit not found", 404);
  if (deposit.status !== "PENDING") throw new AppError("Deposit already processed", 400);

  await prisma.pendingDeposit.update({
    where: { id: depositId },
    data: { status: "REJECTED", adminNote: reason || null, reviewedBy: adminId, reviewedAt: new Date() },
  });

  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: "DEPOSIT_REJECTED",
      targetId: deposit.userId,
      description: `Rejected deposit $${deposit.amount}`,
      metadata: JSON.stringify({ depositId, reason }),
    },
  });

  return { success: true };
}
