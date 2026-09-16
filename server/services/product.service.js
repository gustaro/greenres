import { prisma } from "../config/prisma.js";

export const slugify = (name) =>
  name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

export const findProductBySlug = (slug) =>
  prisma.product.findUnique({
    where: { slug },
    include: { category: true },
  });

export const findProductById = (id) =>
  prisma.product.findUnique({
    where: { id },
    include: { category: { select: { id: true, name: true, slug: true } } },
  });

export const buildProductWhere = ({ categoryId, categorySlug, search, isFeatured, isActive }) => {
  const where = {};
  if (isActive !== "all") where.isActive = isActive !== "false";
  if (categoryId) where.categoryId = categoryId;
  if (categorySlug) where.category = { slug: categorySlug };
  if (isFeatured === "true") where.isFeatured = true;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }
  return where;
};

export const syncInventory = (tx, productId, quantity) =>
  tx.inventory.upsert({
    where: { productId },
    update: { quantity: parseInt(quantity) },
    create: { productId, quantity: parseInt(quantity) },
  });
