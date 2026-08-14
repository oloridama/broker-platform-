import { Request, Response } from "express";
import * as userService from "../services/user.service";
import { success } from "../utils/response";

export async function getProfile(req: Request, res: Response) {
  const profile = await userService.getUserProfile(req.user!.sub);
  res.json(success(profile));
}

export async function updateProfile(req: Request, res: Response) {
  const updated = await userService.updateProfile(req.user!.sub, req.body);
  res.json(success(updated));
}

export async function changePassword(req: Request, res: Response) {
  const { currentPassword, newPassword } = req.body;
  const result = await userService.changePassword(req.user!.sub, currentPassword, newPassword);
  res.json(success(result));
}

export async function submitKyc(req: Request, res: Response) {
  const kyc = await userService.submitKyc(req.user!.sub, req.body);
  res.status(201).json(success(kyc));
}
