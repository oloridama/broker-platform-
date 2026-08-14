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

export async function requestPasswordChange(req: Request, res: Response) {
  const result = await userService.requestPasswordChange(req.user!.sub, req.body.currentPassword);
  res.json(success(result));
}

export async function confirmPasswordChange(req: Request, res: Response) {
  const result = await userService.confirmPasswordChange(req.user!.sub, req.body.code, req.body.newPassword);
  res.json(success(result));
}

export async function submitKyc(req: Request, res: Response) {
  const kyc = await userService.submitKyc(req.user!.sub, req.body);
  res.status(201).json(success(kyc));
}
