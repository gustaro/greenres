import { Router } from "express";
import {
  createOrder, getOrders, getOrderById,
  updateOrderStatus, cancelOrder, markPaymentPaid,
  updateOrderDetails, appendOrderItems,
} from "../controllers/order.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isStaffOrAdmin, isKitchenOrStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate);

router.post("/", createOrder);
router.get("/", getOrders);
router.get("/:id", getOrderById);
router.put("/:id/cancel", cancelOrder);

// Staff/Admin: update order status, details, items, payment
router.put("/:id/status", isKitchenOrStaffOrAdmin, updateOrderStatus);
router.put("/:id/details", isStaffOrAdmin, updateOrderDetails);
router.post("/:id/items", isStaffOrAdmin, appendOrderItems);
router.put("/:id/payment", markPaymentPaid);

export default router;
