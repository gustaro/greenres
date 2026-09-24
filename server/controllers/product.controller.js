import { prisma } from "../config/prisma.js";
import { deleteImage } from "../middleware/upload.js";

const productInclude = {
  category: { select: { id: true, name: true, slug: true } },
  inventory: { select: { quantity: true, lowThreshold: true } },
  recipeItems: {
    select: {
      quantityRequired: true,
      ingredient: { select: { id: true, name: true, quantity: true, unit: true, isActive: true } },
    },
  },
};

const productCache = new Map();
const PRODUCT_CACHE_TTL = 60 * 1000;

export const clearProductsCache = () => {
  productCache.clear();
};

export const getProducts = async (req, res, next) => {
  try {
    const cacheKey = req.originalUrl || req.url;
    const cached = productCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
      return res.json(cached.data);
    }

    const {
      page = 1, limit = 20, categoryId, categorySlug,
      search, isFeatured, isActive = "true", sortBy = "name", sortOrder = "asc",
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (isActive !== "all") where.isActive = isActive === "true";
    if (categoryId) where.categoryId = categoryId;
    if (categorySlug) where.category = { slug: categorySlug };
    if (isFeatured === "true") where.isFeatured = true;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const validSortBy = ["name", "price", "createdAt"];
    const orderBy = validSortBy.includes(sortBy) ? { [sortBy]: sortOrder } : { name: "asc" };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where, skip, take: parseInt(limit), orderBy,
        include: productInclude,
      }),
      prisma.product.count({ where }),
    ]);

    const result = { products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) };
    productCache.set(cacheKey, { timestamp: Date.now(), data: result });

    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: productInclude,
    });
    if (!product || (!product.isActive && req.user?.role === "CUSTOMER")) {
      return res.status(404).json({ message: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const cacheKey = req.originalUrl || req.url;
    const cached = productCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PRODUCT_CACHE_TTL) {
      res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
      return res.json(cached.data);
    }

    const { limit = 8 } = req.query;

    const topItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: parseInt(limit),
    });

    const productIds = topItems.map((i) => i.productId);

    let products = [];
    if (productIds.length > 0) {
      products = await prisma.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: productInclude,
      });
      products = products.sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id));
    }

    if (products.length < parseInt(limit)) {
      const moreProducts = await prisma.product.findMany({
        where: { isActive: true, id: { notIn: productIds } },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit) - products.length,
        include: productInclude,
      });
      products = [...products, ...moreProducts];
    }

    const result = { products };
    productCache.set(cacheKey, { timestamp: Date.now(), data: result });

    res.set("Cache-Control", "public, max-age=15, s-maxage=30, stale-while-revalidate=60");
    res.json(result);
  } catch (error) {
    next(error);
  }
};

const generateProductSlug = async (name, description, excludeId = null) => {
  let baseSlug = (name || "").toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  if (!baseSlug && description) {
    baseSlug = description.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  }
  if (!baseSlug) {
    baseSlug = excludeId ? `item-${excludeId.slice(-6)}` : `item-${Date.now().toString(36)}`;
  }
  baseSlug = baseSlug.replace(/^-+|-+$/g, '') || `item-${Date.now().toString(36)}`;

  let slug = baseSlug;
  const where = excludeId ? { slug, NOT: { id: excludeId } } : { slug };
  const existing = await prisma.product.findFirst({ where });
  if (existing) {
    slug = `${baseSlug}-${Date.now().toString(36)}`;
  }
  return slug;
};

export const createProduct = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, isFeatured, prepTime, stock } = req.body;
    if (!categoryId || !name || !price) {
      return res.status(400).json({ message: "categoryId, name, and price are required" });
    }

    const slug = await generateProductSlug(name, description);
    const imageUrl = req.file?.path || null;

    const product = await prisma.product.create({
      data: {
        categoryId, name, slug, description,
        price: parseFloat(price),
        imageUrl,
        isFeatured: isFeatured === "true",
        prepTime: parseInt(prepTime) || 15,
        stock: parseInt(stock) || 999,
      },
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    // Create inventory record
    await prisma.inventory.create({
      data: { productId: product.id, quantity: parseInt(stock) || 999 },
    });

    clearProductsCache();
    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
};

export const updateProduct = async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Product not found" });

    if (req.file && existing.imageUrl) {
      const publicId = existing.imageUrl.split("/").pop().split(".")[0];
      await deleteImage(`restaurant/${publicId}`);
    }

    const {
      categoryId, name, description, price, isActive,
      isFeatured, prepTime, stock,
    } = req.body;

    const data = {};
    if (categoryId) data.categoryId = categoryId;
    if (name !== undefined) {
      data.name = name;
      data.slug = await generateProductSlug(name, description || existing.description, existing.id);
    }
    if (description !== undefined) data.description = description;
    if (price !== undefined) data.price = parseFloat(price);
    if (isActive !== undefined) data.isActive = isActive === "true" || isActive === true;
    if (isFeatured !== undefined) data.isFeatured = isFeatured === "true" || isFeatured === true;
    if (prepTime !== undefined) data.prepTime = parseInt(prepTime);
    if (stock !== undefined) data.stock = parseInt(stock);
    if (req.file) data.imageUrl = req.file.path;

    const product = await prisma.product.update({
      where: { id: req.params.id }, data,
      include: { category: { select: { id: true, name: true, slug: true } } },
    });

    if (stock !== undefined) {
      await prisma.inventory.upsert({
        where: { productId: product.id },
        update: { quantity: parseInt(stock) },
        create: { productId: product.id, quantity: parseInt(stock) },
      });
    }

    clearProductsCache();
    res.json(product);
  } catch (error) {
    next(error);
  }
};

export const deleteProduct = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id } });
    if (!product) return res.status(404).json({ message: "Product not found" });

    if (product.imageUrl) {
      const publicId = product.imageUrl.split("/").pop().split(".")[0];
      await deleteImage(`restaurant/${publicId}`);
    }

    await prisma.product.delete({ where: { id: req.params.id } });
    clearProductsCache();
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
