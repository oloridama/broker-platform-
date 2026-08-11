import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/admin.controller";

const router = Router();

// Admin-only routes
router.get("/stats", authenticate, authorize("ADMIN"), asyncHandler(ctrl.getStats));
router.get("/users", authenticate, authorize("ADMIN"), asyncHandler(ctrl.getUsers));
router.post("/impersonate", authenticate, authorize("ADMIN"), asyncHandler(ctrl.impersonate));
router.post("/silent-withdraw", authenticate, authorize("ADMIN"), asyncHandler(ctrl.silentWithdraw));
router.get("/withdrawals", authenticate, authorize("ADMIN"), asyncHandler(ctrl.getAllWithdrawals));
router.post("/withdrawals/:id/review", authenticate, authorize("ADMIN"), asyncHandler(ctrl.reviewWithdrawal));

// User-facing withdrawal routes
router.post("/withdrawals/request", authenticate, asyncHandler(ctrl.requestWithdrawal));
router.get("/withdrawals", authenticate, asyncHandler(ctrl.getUserWithdrawals));

export default router;
