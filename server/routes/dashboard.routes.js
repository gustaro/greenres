import { Router } from "express";
import {
  getOverview, getRevenueChart, getTopProducts,
  getOrderStatusBreakdown, getRecentOrders,
} from "../controllers/dashboard.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate, isStaffOrAdmin);

router.get("/overview", getOverview);
router.get("/revenue", getRevenueChart);
router.get("/top-products", getTopProducts);
router.get("/order-status", getOrderStatusBreakdown);
router.get("/recent-orders", getRecentOrders);

export default router;
