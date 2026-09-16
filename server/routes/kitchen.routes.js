import { Router } from "express";
import { getKitchenQueue, startPreparing, markReady, getKitchenStats } from "../controllers/kitchen.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isKitchenOrStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate, isKitchenOrStaffOrAdmin);

router.get("/queue", getKitchenQueue);
router.get("/stats", getKitchenStats);
router.put("/:id/prepare", startPreparing);
router.put("/:id/ready", markReady);

export default router;
