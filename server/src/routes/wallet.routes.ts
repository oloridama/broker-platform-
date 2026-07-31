import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { depositSchema, withdrawalSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/wallet.controller";

const router = Router();

router.use(authenticate);

router.get("/", asyncHandler(ctrl.getWallets));
router.post("/deposit", validate(depositSchema), asyncHandler(ctrl.deposit));
router.post("/withdraw", validate(withdrawalSchema), asyncHandler(ctrl.withdraw));
router.get("/transactions", asyncHandler(ctrl.getTransactions));

export default router;
