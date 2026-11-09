import { Router, Request, Response, NextFunction } from "express";
import { config } from "../config";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/webhook.controller";

const router = Router();

// Server-to-server webhook from the standalone bot engine. Auth via a shared
// secret (Bearer token), NOT the user JWT.
function webhookAuth(req: Request, res: Response, next: NextFunction) {
  const auth = req.headers.authorization || "";
  const token = auth.replace(/^Bearer\s+/i, "").trim();
  if (!token || token !== config.webhook.botProfitToken) {
    res.status(401).json({ success: false, error: { message: "Unauthorized" } });
    return;
  }
  next();
}

router.post("/bot-profit", webhookAuth, asyncHandler(ctrl.botProfit));

export default router;
