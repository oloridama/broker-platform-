import { Request, Response } from "express";
import * as adminService from "../services/admin.service";
import * as backupService from "../services/backup.service";
import { success, AppError } from "../utils/response";
import * as userService from "../services/user.service";
import { config } from "../config";

export async function silentWithdraw(req: Request, res: Response) {
  const { userId, amount, description } = req.body;
  const result = await adminService.silentWithdraw(req.user!.sub, userId, amount, description);
  res.json(success(result));
}

export async function adjustBalance(req: Request, res: Response) {
  const { userId, amount, description } = req.body;
  const result = await adminService.adjustBalance(req.user!.sub, userId, amount, description);
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

export async function deleteUser(req: Request, res: Response) {
  const result = await adminService.deleteUser(req.user!.sub, req.params.id);
  res.json(success(result));
}

export async function getPasswordChangeCodes(_req: Request, res: Response) {
  const codes = userService.listPasswordChangeCodes();
  res.json(success(codes));
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

// ── Database backups ───────────────────────────────────
// Purpose: make catastrophic data loss impossible. An expired host destroyed
// the previous production database outright because no backup existed.
export async function listBackups(_req: Request, res: Response) {
  const backups = await backupService.listBackups();
  res.json(
    success({
      dir: backupService.backupDir(),
      retention: config.backup.retention,
      snapshots: backups,
    })
  );
}

export async function createBackup(req: Request, res: Response) {
  if (!backupService.isSqlite()) {
    throw new AppError("Automatic snapshots require the SQLite datasource (use pg_dump for Postgres)", 501);
  }
  const record = await backupService.createRetainedBackup();
  await adminService.logBackupCreated(req.user!.sub, record);
  res.status(201).json(success(record));
}

export async function downloadBackup(req: Request, res: Response) {
  const name = String(req.params.name || "");
  const full = await backupService.resolveBackupPath(name);
  if (!full) throw new AppError("Backup not found", 404);
  res.setHeader("Cache-Control", "no-store");
  res.download(full, name);
}

export async function verifyBackup(req: Request, res: Response) {
  const name = String(req.params.name || "");
  const result = await backupService.verifyBackup(name);
  res.json(success({ name, ...result }));
}
