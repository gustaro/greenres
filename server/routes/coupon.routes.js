import { Router } from "express";
import { getCoupons, validateCoupon, createCoupon, updateCoupon, deleteCoupon } from "../controllers/coupon.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = Router();

router.post("/validate", authenticate, validateCoupon);

// Public / Customers get active coupons; Admin gets all
router.get("/", optionalAuthenticate, getCoupons);
router.post("/", authenticate, isAdmin, upload.single("image"), createCoupon);
router.put("/:id", authenticate, isAdmin, upload.single("image"), updateCoupon);
router.delete("/:id", authenticate, isAdmin, deleteCoupon);

export default router;
