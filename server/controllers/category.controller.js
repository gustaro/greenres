import { prisma } from "../config/prisma.js";
import { deleteImage } from "../middleware/upload.js";
import { clearProductsCache } from "./product.controller.js";

const categoryCache = new Map();
const CATEGORY_CACHE_TTL = 60 * 1000;

export const clearCategoriesCache = () => {
  categoryCache.clear();
};

export const getCategories = async (req, res, next) => {
  try {
    const cacheKey = req.originalUrl || req.url;
    const cached = categoryCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CATEGORY_CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
      return res.json(cached.data);
    }

    const { includeInactive } = req.query;
    const where = includeInactive === "true" ? {} : { isActive: true };
    const categories = await prisma.category.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });

    categoryCache.set(cacheKey, { timestamp: Date.now(), data: categories });
    res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
    res.json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryBySlug = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { slug: req.params.slug },
      include: {
        products: {
          where: { isActive: true },
          orderBy: { name: "asc" },
        },
      },
    });
    if (!category) return res.status(404).json({ message: "Category not found" });
    res.json(category);
  } catch (error) {
    next(error);
  }
};

const generateCategorySlug = async (name, excludeId = null) => {
  let baseSlug = (name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!baseSlug) {
    baseSlug = excludeId ? `cat-${excludeId.slice(-6)}` : `cat-${Date.now().toString(36)}`;
  }
  baseSlug = baseSlug.replace(/^-+|-+$/g, '') || `cat-${Date.now().toString(36)}`;

  let slug = baseSlug;
  const where = excludeId ? { slug, NOT: { id: excludeId } } : { slug };
  const existing = await prisma.category.findFirst({ where });
  if (existing) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
  return slug;
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, nameEn, description } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const finalDescription = nameEn !== undefined ? nameEn : (description || null);
    const slug = await generateCategorySlug(nameEn || name);
    const imageUrl = req.file?.path || null;
    const lastCategory = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const nextSortOrder = (lastCategory._max.sortOrder ?? 0) + 1;

    const category = await prisma.category.create({
      data: { name, slug, description: finalDescription, imageUrl, sortOrder: nextSortOrder },
    });
    clearCategoriesCache();
    clearProductsCache();
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const reorderCategories = async (req, res, next) => {
  try {
    const orderedIds = req.body?.orderedIds;
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return res.status(400).json({ message: "orderedIds must be a non-empty array" });
    }

    const normalizedIds = orderedIds.map(id => String(id));
    if (new Set(normalizedIds).size !== normalizedIds.length) {
      return res.status(400).json({ message: "orderedIds must not contain duplicates" });
    }

    const allCategories = await prisma.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    const existingIds = new Set(allCategories.map(category => category.id));
    if (normalizedIds.some(id => !existingIds.has(id))) {
      return res.status(400).json({ message: "One or more category IDs are invalid" });
    }

    // Keep categories not shown in the current view after the submitted categories.
    const submittedIds = new Set(normalizedIds);
    const completeOrder = [
      ...normalizedIds,
      ...allCategories.map(category => category.id).filter(id => !submittedIds.has(id)),
    ];

    await prisma.$transaction(
      completeOrder.map((id, index) => prisma.category.update({
        where: { id },
        data: { sortOrder: index + 1 },
      })),
    );

    clearCategoriesCache();
    clearProductsCache();
    res.json({ orderedIds: normalizedIds });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, nameEn, description, sortOrder, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Category not found" });

    // Delete old image if new one uploaded
    if (req.file && existing.imageUrl) {
      const publicId = existing.imageUrl.split("/").pop().split(".")[0];
      await deleteImage(`restaurant/${publicId}`);
    }

    const data = {};
    const finalDescription = nameEn !== undefined ? nameEn : description;
    if (finalDescription !== undefined) data.description = finalDescription;
    if (name !== undefined) {
      data.name = name;
      data.slug = await generateCategorySlug(nameEn || existing.description || name, existing.id);
    }
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
    if (isActive !== undefined) data.isActive = isActive === "true" || isActive === true;
    if (req.file) data.imageUrl = req.file.path;

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
    clearCategoriesCache();
    clearProductsCache();
    res.json(category);
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const category = await prisma.category.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return res.status(404).json({ message: "Category not found" });
    if (category._count.products > 0) {
      return res.status(400).json({ message: "Cannot delete category with products. Remove products first." });
    }

    if (category.imageUrl) {
      const publicId = category.imageUrl.split("/").pop().split(".")[0];
      await deleteImage(`restaurant/${publicId}`);
    }

    await prisma.category.delete({ where: { id: req.params.id } });
    clearCategoriesCache();
    clearProductsCache();
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};
