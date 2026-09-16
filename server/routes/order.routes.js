import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, cancelOrder, markPaymentPaid,
} from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isStaffOrAdmin, isKitchenOrStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

// Staff/Admin: update order status
router.put("/:id/status", isKitchenOrStaffOrAdmin, updateOrderStatus);
router.put("/:id/payment", markPaymentPaid);

export default router;
