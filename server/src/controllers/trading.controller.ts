import { Request, Response } from "express";
import * as tradingService from "../services/trading.service";
import { success } from "../utils/response";

export async function getQuotes(req: Request, res: Response) {
  const symbols = req.query.symbols
    ? (req.query.symbols as string).split(",")
    : undefined;
  const quotes = await tradingService.getQuotes(symbols);
  res.json(success(quotes));
}

export async function getInstruments(req: Request, res: Response) {
  const type = req.query.type as string | undefined;
  const instruments = await tradingService.getInstruments(type);
  res.json(success(instruments));
}

export async function createOrder(req: Request, res: Response) {
  const order = await tradingService.createOrder({
    ...req.body,
    userId: req.user!.sub,
  });
  res.status(201).json(success(order));
}

export async function getOrders(req: Request, res: Response) {
  const status = req.query.status as string | undefined;
  const orders = await tradingService.getUserOrders(req.user!.sub, status);
  res.json(success(orders));
}

export async function cancelOrder(req: Request, res: Response) {
  const order = await tradingService.cancelOrder(req.params.id, req.user!.sub);
  res.json(success(order));
}

export async function getPositions(req: Request, res: Response) {
  const positions = await tradingService.getUserPositions(req.user!.sub);
  res.json(success(positions));
}

export async function getAccounts(req: Request, res: Response) {
  const accounts = await tradingService.getUserAccounts(req.user!.sub);
  res.json(success(accounts));
}
