import { Request, Response } from "express";
import * as webhookService from "../services/webhook.service";
import { success } from "../utils/response";

/** POST /api/webhooks/bot-profit — called by the standalone bot engine. */
export async function botProfit(req: Request, res: Response) {
  const { userId, botId, pnl, currency, idempotencyKey } = req.body;
  const result = await webhookService.applyBotProfit({ userId, botId, pnl, currency, idempotencyKey });
  res.json(success(result));
}
