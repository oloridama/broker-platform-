import { Request, Response } from "express";
import * as depositService from "../services/deposit.service";
import { success } from "../utils/response";

// ── User-facing ────────────────────────────────────────
export async function getMethods(req: Request, res: Response) {
  const methods = await depositService.getActiveDepositMethods();
  res.json(success(methods));
}

export async function createDeposit(req: Request, res: Response) {
  const { methodId, amount, currency } = req.body;
  const deposit = await depositService.createCryptoDeposit(req.user!.sub, methodId, amount, currency);
  res.status(201).json(success(deposit));
}

export async function getMyDeposits(req: Request, res: Response) {
  const deposits = await depositService.getUserDeposits(req.user!.sub);
  res.json(success(deposits));
}

// ── Admin: methods ─────────────────────────────────────
export async function adminGetAllMethods(req: Request, res: Response) {
  const methods = await depositService.getAllMethods();
  res.json(success(methods));
}

export async function adminCreateMethod(req: Request, res: Response) {
  const method = await depositService.createMethod(req.body);
  res.status(201).json(success(method));
}

export async function adminUpdateMethod(req: Request, res: Response) {
  const method = await depositService.updateMethod(req.params.id, req.body);
  res.json(success(method));
}

export async function adminToggleMethod(req: Request, res: Response) {
  const method = await depositService.toggleMethodActive(req.params.id);
  res.json(success(method));
}

export async function adminDeleteMethod(req: Request, res: Response) {
  const result = await depositService.deleteMethod(req.params.id);
  res.json(success(result));
}

// ── Admin: pending deposits ────────────────────────────
export async function adminGetDeposits(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const deposits = await depositService.getPendingDeposits(status);
  res.json(success(deposits));
}

export async function adminConfirmDeposit(req: Request, res: Response) {
  const { txHash, note } = req.body;
  const result = await depositService.confirmDeposit(req.user!.sub, req.params.id, txHash, note);
  res.json(success(result));
}

export async function adminRejectDeposit(req: Request, res: Response) {
  const { reason } = req.body;
  const result = await depositService.rejectDeposit(req.user!.sub, req.params.id, reason);
  res.json(success(result));
}
