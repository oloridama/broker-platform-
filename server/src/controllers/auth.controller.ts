import { Request, Response } from "express";
import * as authService from "../services/auth.service";
import { success, AppError } from "../utils/response";
import { isDisposableEmail } from "../utils/disposableEmails";
import { verifyTurnstile } from "../utils/turnstile";

export async function register(req: Request, res: Response) {
  // 1. Honeypot — a hidden field real users never see/fill.
  if (typeof req.body.website === "string" && req.body.website.trim() !== "") {
    throw new AppError("Registration failed", 400);
  }

  // 2. Block throwaway/disposable inboxes used for mass signups.
  if (isDisposableEmail(String(req.body.email || ""))) {
    throw new AppError(
      "Disposable email addresses are not allowed. Please use a permanent email address.",
      400,
    );
  }

  // 3. Bot challenge (only enforced when TURNSTILE_SECRET_KEY is configured).
  const human = await verifyTurnstile(req.body.turnstileToken, req.ip);
  if (!human) {
    throw new AppError("Human verification failed. Please try again.", 400);
  }

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
