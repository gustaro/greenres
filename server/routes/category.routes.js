import { Router } from "express";
import {
  getCategories, getCategoryBySlug,
  createCategory, updateCategory, deleteCategory,
} from "../controllers/category.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = Router();

// Public
router.get("/", getCategories);
router.get("/:slug", getCategoryBySlug);

// Admin only
router.post("/", authenticate, isAdmin, upload.single("image"), createCategory);
router.put("/:id", authenticate, isAdmin, upload.single("image"), updateCategory);
router.delete("/:id", authenticate, isAdmin, deleteCategory);

export default router;
