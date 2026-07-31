import { Request, Response } from "express";
import * as walletService from "../services/wallet.service";
import { success } from "../utils/response";

export async function getWallets(req: Request, res: Response) {
  const wallets = await walletService.getUserWallets(req.user!.sub);
  res.json(success(wallets));
}

export async function deposit(req: Request, res: Response) {
  const tx = await walletService.deposit(
    req.user!.sub,
    req.body.walletId,
    req.body.amount,
    req.body.currency,
  );
  res.status(201).json(success(tx));
}

export async function withdraw(req: Request, res: Response) {
  const tx = await walletService.withdraw(
    req.user!.sub,
    req.body.walletId,
    req.body.amount,
    req.body.currency,
  );
  res.status(201).json(success(tx));
}

export async function getTransactions(req: Request, res: Response) {
  const walletId = req.query.walletId as string | undefined;
  const txs = await walletService.getTransactions(req.user!.sub, walletId);
  res.json(success(txs));
}
