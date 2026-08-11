import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import { success } from "../utils/response";

export async function silentWithdraw(req: Request, res: Response) {
  const { userId, amount, description } = req.body;
  const result = await adminService.silentWithdraw(req.user!.sub, userId, amount, description);
  res.json(success(result));
}

export async function getStats(req: Request, res: Response) {
  const stats = await adminService.getAdminStats();
  res.json(success(stats));
}

export async function getUsers(req: Request, res: Response) {
  const search = req.query.search as string | undefined;
  const users = await adminService.getAllUsers(search);
  res.json(success(users));
}

export async function impersonate(req: Request, res: Response) {
  const { userId } = req.body;
  const result = await adminService.impersonateUser(req.user!.sub, userId);
  res.json(success(result));
}

export async function getAllWithdrawals(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const withdrawals = await adminService.getAllWithdrawals(status);
  res.json(success(withdrawals));
}

export async function reviewWithdrawal(req: Request, res: Response) {
  const { decision, notes } = req.body;
  const result = await adminService.reviewWithdrawal(req.user!.sub, req.params.id, decision, notes);
  res.json(success(result));
}

// ── User-facing withdrawal ─────────────────────────────
export async function requestWithdrawal(req: Request, res: Response) {
  const { walletAddress, amount, currency } = req.body;
  const wr = await adminService.createWithdrawalRequest(req.user!.sub, walletAddress, amount, currency);
  res.status(201).json(success(wr));
}

export async function getUserWithdrawals(req: Request, res: Response) {
  const wrs = await adminService.getUserWithdrawals(req.user!.sub);
  res.json(success(wrs));
}
