import { Router } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { getLiveMarketPrices } from "../controllers/market.controller";

const router = Router();

// Public endpoint — no auth required (used by landing page + markets page)
router.get("/live", asyncHandler(getLiveMarketPrices));

export default router;
