import { Router } from "express";
import {
  getProducts, getProductBySlug, getTopProducts,
  createProduct, updateProduct, deleteProduct,
} from "../controllers/product.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Public
router.get("/", getProducts);
router.get("/top", getTopProducts);
router.get("/:slug", getProductBySlug);

// Admin only
router.post("/", authenticate, isAdmin, upload.single("image"), createProduct);
router.put("/:id", authenticate, isAdmin, upload.single("image"), updateProduct);
router.delete("/:id", authenticate, isAdmin, deleteProduct);

export default router;
