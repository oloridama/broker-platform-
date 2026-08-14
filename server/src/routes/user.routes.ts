import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { kycSchema, updateProfileSchema, changePasswordSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

router.get("/me", asyncHandler(ctrl.getProfile));
router.patch("/me", validate(updateProfileSchema), asyncHandler(ctrl.updateProfile));
router.post("/me/change-password", validate(changePasswordSchema), asyncHandler(ctrl.changePassword));
router.post("/kyc", validate(kycSchema), asyncHandler(ctrl.submitKyc));

export default router;
