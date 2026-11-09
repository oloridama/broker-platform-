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
router.post("/adjust-balance", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adjustBalance));
router.get("/password-codes", authenticate, authorize("ADMIN"), asyncHandler(ctrl.getPasswordChangeCodes));
router.delete("/users/:id", authenticate, authorize("ADMIN"), asyncHandler(ctrl.deleteUser));
router.get("/withdrawals", authenticate, authorize("ADMIN"), asyncHandler(ctrl.getAllWithdrawals));
router.post("/withdrawals/:id/review", authenticate, authorize("ADMIN"), asyncHandler(ctrl.reviewWithdrawal));

// User-facing withdrawal routes
// NOTE: must NOT reuse GET /withdrawals — the admin-only GET above matches first
// and 403s normal users. Use a distinct path for the user's own requests.
router.post("/withdrawals/request", authenticate, asyncHandler(ctrl.requestWithdrawal));
router.get("/withdrawals/mine", authenticate, asyncHandler(ctrl.getUserWithdrawals));

export default router;
