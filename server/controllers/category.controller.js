import { prisma } from "../config/prisma.js";
import { deleteImage } from "../middleware/upload.js";

export const getCategories = async (req, res, next) => {
  try {
    const { includeInactive } = req.query;
    const where = includeInactive === "true" ? {} : { isActive: true };
    const categories = await prisma.category.findMany({
      where,
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { products: { where: { isActive: true } } } } },
    });
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

export const createCategory = async (req, res, next) => {
  try {
    const { name, description, sortOrder } = req.body;
    if (!name) return res.status(400).json({ message: "Name is required" });

    const slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const imageUrl = req.file?.path || null;

    const category = await prisma.category.create({
      data: { name, slug, description, imageUrl, sortOrder: parseInt(sortOrder) || 0 },
    });
    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { name, description, sortOrder, isActive } = req.body;

    const existing = await prisma.category.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Category not found" });

    // Delete old image if new one uploaded
    if (req.file && existing.imageUrl) {
      const publicId = existing.imageUrl.split("/").pop().split(".")[0];
      await deleteImage(`restaurant/${publicId}`);
    }

    const data = {};
    if (name !== undefined) {
      data.name = name;
      data.slug = name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    }
    if (description !== undefined) data.description = description;
    if (sortOrder !== undefined) data.sortOrder = parseInt(sortOrder);
    if (isActive !== undefined) data.isActive = isActive === "true" || isActive === true;
    if (req.file) data.imageUrl = req.file.path;

    const category = await prisma.category.update({ where: { id: req.params.id }, data });
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
    res.json({ message: "Category deleted" });
  } catch (error) {
    next(error);
  }
};
