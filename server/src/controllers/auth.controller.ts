import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { success } from "../utils/response";

export async function register(req: Request, res: Response) {
  const user = await authService.registerUser(req.body);
  res.status(201).json(success(user));
}

export async function login(req: Request, res: Response) {
  const result = await authService.loginUser(req.body.email, req.body.password);
  res.json(success(result));
}

export async function refresh(req: Request, res: Response) {
  const result = await authService.refreshTokens(req.body.refreshToken);
  res.json(success(result));
}

export async function logout(req: Request, res: Response) {
  await authService.logoutUser(req.body.refreshToken);
  res.json(success({ message: "Logged out successfully" }));
}

export async function forgotPassword(req: Request, res: Response) {
  const result = await authService.requestPasswordReset(req.body.email);
  res.json(success(result));
}

export async function resetPassword(req: Request, res: Response) {
  const { token, newPassword } = req.body;
  const result = await authService.resetPassword(token, newPassword);
  res.json(success(result));
}

export async function verifyEmail(req: Request, res: Response) {
  const result = await authService.verifyEmail(req.params.token);
  res.json(success(result));
}
