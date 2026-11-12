import prisma from "../db";
import { AppError } from "../utils/response";
import { toMoney } from "../utils/money";
import { signAccessToken, storeRefreshToken } from "../utils/jwt";
import { v4 as uuid } from "uuid";

// ── Admin: delete a user account ───────────────────────
// Removes the account and everything cascaded from it (wallet, transactions,
// orders, bots, KYC, refresh tokens, deposits, withdrawals).
export async function deleteUser(adminId: string, userId: string) {
  if (adminId === userId) throw new AppError("You cannot delete your own account", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  if (user.role === "ADMIN") {
    const admins = await prisma.user.count({ where: { role: "ADMIN" } });
    if (admins <= 1) throw new AppError("Cannot delete the last admin account", 400);
  }

  await prisma.user.delete({ where: { id: userId } });

  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: "USER_DELETED",
      targetId: userId,
      description: `Deleted user account ${user.email}`,
    },
  });

  return { message: "User deleted" };
}

// ── Admin: backup audit trail ──────────────────────────
// Never throws: an audit-log failure must not lose a backup the admin already
// created (the file on disk is the important artefact).
export async function logBackupCreated(
  adminId: string,
  record: { name: string; bytes: number; sha256: string }
) {
  try {
    await prisma.adminAction.create({
      data: {
        adminId,
        actionType: "BACKUP_CREATED",
        description: `Created database backup ${record.name} (${record.bytes} bytes)`,
        metadata: JSON.stringify({ name: record.name, sha256: record.sha256 }),
      },
    });
  } catch (err) {
    console.warn("[backup] could not write audit log:", (err as Error).message);
  }
}

// ── Admin: Impersonation (act as a user) ───────────────
// Issues a full access+refresh token for the target user so an admin can view
// the platform exactly as that user (and trade / manage on their behalf).
export async function impersonateUser(adminId: string, userId: string) {
  if (adminId === userId) throw new AppError("Cannot impersonate yourself", 400);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);
  if (!user.isActive) throw new AppError("User is deactivated", 403);

  const familyId = uuid();
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
  });
  const refreshToken = await storeRefreshToken(user.id, familyId);

  // Log the impersonation for audit
  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: "IMPERSONATE",
      targetId: user.id,
      description: `Admin impersonated ${user.email}`,
      metadata: JSON.stringify({ userId: user.id }),
    },
  });

  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    accessToken,
    refreshToken,
  };
}

// ── Admin: Silent withdrawal (adjust balance without user notification) ──
export async function silentWithdraw(
  adminId: string,
  userId: string,
  amount: number,
  description: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) throw new AppError("Amount must be a valid positive number", 400);
  amount = toMoney(amount); // round to cents

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

/**
 * Admin balance adjustment — add (+) or deduct (−) from a user's wallet,
 * recorded as an admin action but NOT visible to the user as a normal
 * transaction (used to credit deposits, bonuses, corrections, etc.).
 */
export async function adjustBalance(
  adminId: string,
  userId: string,
  amount: number,
  description: string,
) {
  if (!Number.isFinite(amount) || amount === 0) {
    throw new AppError("Amount must be a valid non-zero number", 400);
  }
  amount = toMoney(amount);

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });
  if (!wallet) throw new AppError("No wallet found", 404);

  const newBalance = Number(wallet.balance) + amount;
  if (newBalance < 0) throw new AppError("Insufficient balance", 400);

  await prisma.wallet.update({
    where: { id: wallet.id },
    data: { balance: newBalance },
  });

  const direction = amount > 0 ? "credit" : "debit";
  const actionType = amount > 0 ? "BALANCE_CREDIT" : "BALANCE_DEBIT";
  await prisma.adminAction.create({
    data: {
      adminId,
      actionType,
      targetId: userId,
      description: `${description} — ${direction} $${Math.abs(amount)} for ${user.email}`,
      metadata: JSON.stringify({ amount, userId, walletId: wallet.id, newBalance }),
    },
  });

  return { success: true, newBalance };
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

  // Admin-controlled switch — enforced here so it holds even if a client calls
  // the API directly, not merely by hiding the button.
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { withdrawalsEnabled: true },
  });
  if (!account) throw new AppError("User not found", 404);
  if (!account.withdrawalsEnabled) {
    throw new AppError(
      "Withdrawals are currently disabled on this account. Please contact support.",
      403,
    );
  }

  const wallet = await prisma.wallet.findFirst({
    where: { userId, isDefault: true },
  });
  if (!wallet) throw new AppError("No wallet found", 404);

  // Reserve funds that are already requested but not yet reviewed, so a user
  // cannot submit multiple requests that together exceed their balance.
  const pending = await prisma.withdrawalRequest.aggregate({
    where: { userId, status: "PENDING" },
    _sum: { amount: true },
  });
  const pendingAmount = Number(pending._sum.amount || 0);
  const available = Number(wallet.balance) - pendingAmount;

  if (amount > available) {
    throw new AppError(
      pendingAmount > 0
        ? `Insufficient available balance — $${Math.max(available, 0).toFixed(2)} available ($${pendingAmount.toFixed(2)} is already pending approval)`
        : "Insufficient balance",
      400,
    );
  }

  // Created as PENDING — no funds move until an admin approves it.
  return prisma.withdrawalRequest.create({
    data: { userId, walletAddress, amount, currency, status: "PENDING" },
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

  // Funds only move on approval — and are recorded in the user's history.
  if (decision === "APPROVED") {
    const wallet = await prisma.wallet.findFirst({
      where: { userId: wr.userId, isDefault: true },
    });
    if (wallet) {
      if (Number(wallet.balance) < Number(wr.amount)) {
        throw new AppError("Insufficient balance to complete this withdrawal", 400);
      }
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { balance: { decrement: Number(wr.amount) } },
      });
      await prisma.transaction.create({
        data: {
          walletId: wallet.id,
          type: "WITHDRAWAL",
          amount: Number(wr.amount),
          currency: wr.currency || "USD",
          status: "COMPLETED",
          reference: `Withdrawal ${wr.id.slice(0, 8)}`,
          description: `Withdrawal approved to ${wr.walletAddress.slice(0, 10)}...`,
        },
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
      withdrawalsEnabled: true,
      wallets: { select: { balance: true, currency: true } },
      _count: { select: { orders: true, bots: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

/**
 * Turn withdrawals on or off for one account.
 *
 * Blocks nothing else — the user can still log in, trade and deposit. Only new
 * withdrawal requests are refused, and every change is audit-logged so there is
 * a record of who disabled an account's withdrawals and when.
 */
export async function setUserWithdrawals(adminId: string, userId: string, enabled: boolean) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, withdrawalsEnabled: true },
  });
  if (!user) throw new AppError("User not found", 404);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { withdrawalsEnabled: enabled },
    select: { id: true, email: true, withdrawalsEnabled: true },
  });

  await prisma.adminAction.create({
    data: {
      adminId,
      actionType: enabled ? "WITHDRAWALS_ENABLED" : "WITHDRAWALS_DISABLED",
      description: `${enabled ? "Enabled" : "Disabled"} withdrawals for ${user.email}`,
      metadata: JSON.stringify({ userId, email: user.email, enabled, previous: user.withdrawalsEnabled }),
    },
  });

  return updated;
}
