import { Router } from "express";
import {
  getInventory, createIngredient, updateInventory, adjustInventory, deleteIngredient,
  getLowStockAlerts, getIngredientCategories, createIngredientCategory, getRecipes, replaceRecipe,
} from "../controllers/inventory.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isKitchenOrStaffOrAdmin } from "../middleware/role.js";

const router = Router();

router.use(authenticate, isKitchenOrStaffOrAdmin);

router.get("/", getInventory);
router.post("/", createIngredient);
router.get("/alerts", getLowStockAlerts);
router.get("/categories", getIngredientCategories);
router.post("/categories", createIngredientCategory);
router.get("/recipes", getRecipes);
router.put("/recipes/:productId", replaceRecipe);
router.put("/:ingredientId", updateInventory);
router.post("/:ingredientId/adjust", adjustInventory);
router.delete("/:ingredientId", deleteIngredient);

export default router;
