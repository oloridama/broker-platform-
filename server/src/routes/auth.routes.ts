import { Router } from "express";
import { validate } from "../middleware/validate";
import { registerSchema, loginSchema, refreshSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/auth.controller";

const router = Router();

router.post("/register", validate(registerSchema), asyncHandler(ctrl.register));
router.post("/login", validate(loginSchema), asyncHandler(ctrl.login));
router.post("/refresh", validate(refreshSchema), asyncHandler(ctrl.refresh));
router.post("/logout", asyncHandler(ctrl.logout));
router.post("/forgot-password", asyncHandler(ctrl.forgotPassword));
router.post("/reset-password", asyncHandler(ctrl.resetPassword));
router.get("/verify-email/:token", asyncHandler(ctrl.verifyEmail));

export default router;
