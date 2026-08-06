import { Request, Response } from "express";
import * as botService from "../services/bot.service";
import { success } from "../utils/response";

export async function getAvailable(req: Request, res: Response) {
  const bots = await botService.getAvailableBots();
  res.json(success(bots));
}

export async function calculateRoi(req: Request, res: Response) {
  const { strategy, amount, durationDays } = req.body;
  const result = botService.calculateRoi({ strategy, amount, durationDays });
  res.json(success(result));
}

export async function getUserBots(req: Request, res: Response) {
  const bots = await botService.getUserBots(req.user!.sub);
  res.json(success(bots));
}

export async function create(req: Request, res: Response) {
  const { templateIndex, config, allocation } = req.body;
  const bot = await botService.createBot(req.user!.sub, templateIndex, config, allocation);
  res.status(201).json(success(bot));
}

export async function getTrades(req: Request, res: Response) {
  const limit = Number(req.query.limit) || 50;
  const trades = await botService.getBotTrades(req.params.id, req.user!.sub, limit);
  res.json(success(trades));
}

export async function toggle(req: Request, res: Response) {
  const { action } = req.body;
  const bot = await botService.toggleBot(req.params.id, req.user!.sub, action);
  res.json(success(bot));
}

export async function simulate(req: Request, res: Response) {
  const bot = await botService.simulateBotProfit(req.params.id, req.user!.sub);
  res.json(success(bot));
}

export async function remove(req: Request, res: Response) {
  await botService.deleteBot(req.params.id, req.user!.sub);
  res.json(success({ message: "Bot deleted" }));
}
