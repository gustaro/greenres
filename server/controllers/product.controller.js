import { prisma } from "../config/prisma.js";
import { deleteImage } from "../middleware/upload.js";

export const getProducts = async (req, res, next) => {
  try {
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
        include: { category: { select: { id: true, name: true, slug: true } }, inventory: { select: { quantity: true, lowThreshold: true } } },
      }),
      prisma.product.count({ where }),
    ]);

    res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

export const getProductBySlug = async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: { category: true },
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
        include: { category: { select: { id: true, name: true, slug: true } }, inventory: { select: { quantity: true, lowThreshold: true } } },
      });
      products = products.sort((a, b) => productIds.indexOf(a.id) - productIds.indexOf(b.id));
    }

    if (products.length < parseInt(limit)) {
      const moreProducts = await prisma.product.findMany({
        where: { isActive: true, id: { notIn: productIds } },
        orderBy: { createdAt: "desc" },
        take: parseInt(limit) - products.length,
        include: { category: { select: { id: true, name: true, slug: true } }, inventory: { select: { quantity: true, lowThreshold: true } } },
      });
      products = [...products, ...moreProducts];
    }

    res.json({ products });
  } catch (error) {
    next(error);
  }
};

export const createProduct = async (req, res, next) => {
  try {
    const { categoryId, name, description, price, isFeatured, prepTime, stock } = req.body;
    if (!categoryId || !name || !price) {
      return res.status(400).json({ message: "categoryId, name, and price are required" });
    }

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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
      data.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
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
    res.json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};
