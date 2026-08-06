import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/bot.controller";

const router = Router();

router.get("/templates", asyncHandler(ctrl.getAvailable));
router.post("/calculate-roi", asyncHandler(ctrl.calculateRoi));

router.use(authenticate);
router.get("/", asyncHandler(ctrl.getUserBots));
router.post("/", asyncHandler(ctrl.create));
router.post("/:id/toggle", asyncHandler(ctrl.toggle));
router.post("/:id/simulate", asyncHandler(ctrl.simulate));
router.get("/:id/trades", asyncHandler(ctrl.getTrades));
router.delete("/:id", asyncHandler(ctrl.remove));

export default router;
