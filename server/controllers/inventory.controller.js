import { prisma } from "../config/prisma.js";
import { clearProductsCache } from "./product.controller.js";

const ingredientInclude = {
  category: { select: { id: true, name: true, nameEn: true, slug: true, sortOrder: true } },
  recipeItems: { select: { productId: true, quantityRequired: true, product: { select: { id: true, name: true } } } },
};

const slugify = (value) => {
  const slug = String(value || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return slug || `ingredient-category-${Date.now()}`;
};

export const getInventory = async (req, res, next) => {
  try {
    const { lowStock, categoryId, search } = req.query;
    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { nameEn: { contains: search, mode: "insensitive" } },
      ];
    }

    const inventory = await prisma.ingredient.findMany({
      where,
      include: ingredientInclude,
      orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
    });

    const result = lowStock === "true"
      ? inventory.filter((item) => Number(item.quantity) <= Number(item.lowThreshold))
      : inventory;

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const createIngredient = async (req, res, next) => {
  try {
    const { categoryId, name, nameEn, quantity = 0, unit = "g", lowThreshold = 0, expiresAt } = req.body;
    if (!categoryId || !name || !unit) {
      return res.status(400).json({ message: "categoryId, name, and unit are required" });
    }

    const ingredient = await prisma.ingredient.create({
      data: {
        categoryId,
        name: String(name).trim(),
        nameEn: nameEn ? String(nameEn).trim() : null,
        quantity: Number(quantity),
        unit: String(unit).trim(),
        lowThreshold: Number(lowThreshold),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: ingredientInclude,
    });
    clearProductsCache();
    res.status(201).json(ingredient);
  } catch (error) {
    next(error);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const { quantity, lowThreshold, categoryId, name, nameEn, unit, isActive, expiresAt } = req.body;
    const data = {};
    if (quantity !== undefined) data.quantity = Math.max(0, Number(quantity));
    if (lowThreshold !== undefined) data.lowThreshold = Math.max(0, Number(lowThreshold));
    if (categoryId !== undefined) data.categoryId = categoryId;
    if (name !== undefined) data.name = String(name).trim();
    if (nameEn !== undefined) data.nameEn = nameEn ? String(nameEn).trim() : null;
    if (unit !== undefined) data.unit = String(unit).trim();
    if (isActive !== undefined) data.isActive = Boolean(isActive);
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (Object.keys(data).length === 0) return res.status(400).json({ message: "No inventory changes provided" });

    const updated = await prisma.ingredient.update({
      where: { id: req.params.ingredientId },
      data,
      include: ingredientInclude,
    });
    clearProductsCache();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const adjustInventory = async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body;
    if (adjustment === undefined) return res.status(400).json({ message: "adjustment is required" });

    const ingredient = await prisma.ingredient.findUnique({ where: { id: req.params.ingredientId } });
    if (!ingredient) return res.status(404).json({ message: "Ingredient not found" });

    const previousQuantity = Number(ingredient.quantity);
    const quantity = Math.max(0, previousQuantity + Number(adjustment));
    const updated = await prisma.ingredient.update({
      where: { id: ingredient.id },
      data: { quantity },
      include: ingredientInclude,
    });
    clearProductsCache();
    res.json({ ...updated, previousQuantity, adjustment: Number(adjustment), reason });
  } catch (error) {
    next(error);
  }
};

export const deleteIngredient = async (req, res, next) => {
  try {
    const recipeCount = await prisma.recipeIngredient.count({ where: { ingredientId: req.params.ingredientId } });
    if (recipeCount > 0) return res.status(409).json({ message: "Ingredient is used by one or more recipes" });
    await prisma.ingredient.delete({ where: { id: req.params.ingredientId } });
    clearProductsCache();
    res.json({ message: "Ingredient deleted" });
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (_req, res, next) => {
  try {
    const inventory = await prisma.ingredient.findMany({ include: ingredientInclude });
    res.json(inventory.filter((item) => Number(item.quantity) <= Number(item.lowThreshold)));
  } catch (error) {
    next(error);
  }
};

export const getIngredientCategories = async (_req, res, next) => {
  try {
    const categories = await prisma.ingredientCategory.findMany({
      include: { _count: { select: { ingredients: true } } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const createIngredientCategory = async (req, res, next) => {
  try {
    const { name, nameEn, sortOrder = 0 } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });
    const category = await prisma.ingredientCategory.create({
      data: { name: String(name).trim(), nameEn: nameEn ? String(nameEn).trim() : null, slug: slugify(nameEn || name), sortOrder: Number(sortOrder) },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const getRecipes = async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, imageUrl: true,
        category: { select: { id: true, name: true } },
        recipeItems: {
          select: {
            id: true, ingredientId: true, quantityRequired: true, unit: true,
            ingredient: { select: { id: true, name: true, nameEn: true, unit: true, quantity: true, categoryId: true } },
          },
          orderBy: { ingredient: { name: "asc" } },
        },
      },
      orderBy: { name: "asc" },
    });
    res.json(products);
  } catch (error) {
    next(error);
  }
};

export const replaceRecipe = async (req, res, next) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];
    const normalized = items
      .map((item) => ({ ingredientId: item.ingredientId, quantityRequired: Number(item.quantityRequired) }))
      .filter((item) => item.ingredientId && item.quantityRequired > 0);

    const ingredientIds = [...new Set(normalized.map((item) => item.ingredientId))];
    const ingredients = await prisma.ingredient.findMany({ where: { id: { in: ingredientIds } } });
    if (ingredients.length !== ingredientIds.length) return res.status(400).json({ message: "One or more ingredients are invalid" });
    const ingredientMap = new Map(ingredients.map((item) => [item.id, item]));

    await prisma.$transaction(async (tx) => {
      await tx.recipeIngredient.deleteMany({ where: { productId: req.params.productId } });
      if (normalized.length > 0) {
        await tx.recipeIngredient.createMany({
          data: normalized.map((item) => ({
            productId: req.params.productId,
            ingredientId: item.ingredientId,
            quantityRequired: item.quantityRequired,
            unit: ingredientMap.get(item.ingredientId).unit,
          })),
        });
      }
    });

    const recipe = await prisma.product.findUnique({
      where: { id: req.params.productId },
      select: { id: true, name: true, recipeItems: { include: { ingredient: true }, orderBy: { ingredient: { name: "asc" } } } },
    });
    clearProductsCache();
    res.json(recipe);
  } catch (error) {
    next(error);
  }
};
