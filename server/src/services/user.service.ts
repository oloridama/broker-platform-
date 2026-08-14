import bcrypt from "bcrypt";
import prisma from "../db";
import { config } from "../config";
import { AppError } from "../utils/response";

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      lastLoginAt: true,
      createdAt: true,
      kyc: true,
      accounts: {
        where: { isActive: true },
        select: { id: true, accountType: true, balance: true, equity: true, currency: true },
      },
    },
  });
  if (!user) throw new AppError("User not found", 404);
  return user;
}

export async function updateProfile(userId: string, data: { firstName?: string; lastName?: string }) {
  return prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, firstName: true, lastName: true, role: true },
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError("User not found", 404);

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new AppError("Current password is incorrect", 400);

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  return { message: "Password updated successfully" };
}

export async function submitKyc(userId: string, data: {
  documentType: string;
  documentNumber: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}) {
  const existing = await prisma.kyc.findUnique({ where: { userId } });
  if (existing && existing.status !== "REJECTED") {
    throw new AppError("KYC already submitted", 409);
  }

  if (existing) {
    // Resubmit after rejection
    return prisma.kyc.update({
      where: { userId },
      data: { ...data, status: "PENDING", rejectionReason: null },
    });
  }

  return prisma.kyc.create({
    data: { userId, ...data },
  });
}
