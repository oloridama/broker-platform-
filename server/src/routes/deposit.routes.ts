import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/deposit.controller";

const router = Router();

// User-facing
router.get("/methods", authenticate, asyncHandler(ctrl.getMethods));
router.post("/", authenticate, asyncHandler(ctrl.createDeposit));
router.get("/history", authenticate, asyncHandler(ctrl.getMyDeposits));

// Admin: methods
router.get("/admin/methods", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminGetAllMethods));
router.post("/admin/methods", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminCreateMethod));
router.patch("/admin/methods/:id", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminUpdateMethod));
router.post("/admin/methods/:id/toggle", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminToggleMethod));
router.delete("/admin/methods/:id", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminDeleteMethod));

// Admin: pending deposits
router.get("/admin/pending", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminGetDeposits));
router.post("/admin/pending/:id/confirm", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminConfirmDeposit));
router.post("/admin/pending/:id/reject", authenticate, authorize("ADMIN"), asyncHandler(ctrl.adminRejectDeposit));

export default router;
