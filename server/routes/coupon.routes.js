import { Router } from "express";
import { getCoupons, validateCoupon, createCoupon, updateCoupon, deleteCoupon } from "../controllers/coupon.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/validate", authenticate, validateCoupon);

// Admin only
router.get("/", authenticate, isAdmin, getCoupons);
router.post("/", authenticate, isAdmin, upload.single("image"), createCoupon);
router.put("/:id", authenticate, isAdmin, upload.single("image"), updateCoupon);
router.delete("/:id", authenticate, isAdmin, deleteCoupon);

export default router;
