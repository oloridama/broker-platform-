import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { createOrderSchema, updateOrderSchema } from "../validators";
import { asyncHandler } from "../utils/asyncHandler";
import * as ctrl from "../controllers/trading.controller";

const router = Router();

router.get("/quotes", authenticate, asyncHandler(ctrl.getQuotes));
router.get("/instruments", authenticate, asyncHandler(ctrl.getInstruments));
router.get("/orders", authenticate, asyncHandler(ctrl.getOrders));
router.post("/orders", authenticate, validate(createOrderSchema), asyncHandler(ctrl.createOrder));
router.patch("/orders/:id/cancel", authenticate, asyncHandler(ctrl.cancelOrder));
router.get("/positions", authenticate, asyncHandler(ctrl.getPositions));
router.get("/accounts", authenticate, asyncHandler(ctrl.getAccounts));

export default router;
