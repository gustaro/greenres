import { Router } from "express";
import { getInventory, updateInventory, adjustInventory, getLowStockAlerts } from "../controllers/inventory.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isKitchenOrStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate, isKitchenOrStaffOrAdmin);

router.get("/", getInventory);
router.get("/alerts", getLowStockAlerts);
router.put("/:productId", updateInventory);
router.post("/:productId/adjust", adjustInventory);

export default router;
