import { prisma } from "../config/prisma.js";

export const getInventory = async (req, res, next) => {
  try {
    const { lowStock } = req.query;

    const inventory = await prisma.inventory.findMany({
      include: {
        product: {
          select: { id: true, name: true, imageUrl: true, isActive: true, category: { select: { name: true } } },
        },
      },
      orderBy: { quantity: "asc" },
    });

    const result = lowStock === "true"
      ? inventory.filter((i) => i.quantity <= i.lowThreshold)
      : inventory;

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const updateInventory = async (req, res, next) => {
  try {
    const { quantity, lowThreshold } = req.body;
    if (quantity === undefined) return res.status(400).json({ message: "quantity is required" });

    const inventory = await prisma.inventory.findUnique({
      where: { productId: req.params.productId },
    });
    if (!inventory) return res.status(404).json({ message: "Inventory record not found" });

    const data = { quantity: parseInt(quantity) };
    if (lowThreshold !== undefined) data.lowThreshold = parseInt(lowThreshold);

    const [updatedInventory] = await prisma.$transaction([
      prisma.inventory.update({ where: { productId: req.params.productId }, data }),
      prisma.product.update({
        where: { id: req.params.productId },
        data: { stock: parseInt(quantity) },
      }),
    ]);

    res.json(updatedInventory);
  } catch (error) {
    next(error);
  }
};

export const adjustInventory = async (req, res, next) => {
  try {
    const { adjustment, reason } = req.body; // positive = restock, negative = shrinkage
    if (adjustment === undefined) return res.status(400).json({ message: "adjustment is required" });

    const inventory = await prisma.inventory.findUnique({
      where: { productId: req.params.productId },
    });
    if (!inventory) return res.status(404).json({ message: "Inventory record not found" });

    const newQty = Math.max(0, inventory.quantity + parseInt(adjustment));

    const [updated] = await prisma.$transaction([
      prisma.inventory.update({
        where: { productId: req.params.productId },
        data: { quantity: newQty },
      }),
      prisma.product.update({
        where: { id: req.params.productId },
        data: { stock: newQty },
      }),
    ]);

    res.json({ ...updated, previousQuantity: inventory.quantity, adjustment: parseInt(adjustment), reason });
  } catch (error) {
    next(error);
  }
};

export const getLowStockAlerts = async (req, res, next) => {
  try {
    const items = await prisma.inventory.findMany({
      where: { quantity: { lte: prisma.inventory.fields.lowThreshold } },
      include: {
        product: { select: { id: true, name: true, isActive: true } },
      },
    });

    // Prisma doesn't support column comparisons in where directly, so filter in JS
    const allInventory = await prisma.inventory.findMany({
      include: { product: { select: { id: true, name: true, isActive: true } } },
    });
    const lowStock = allInventory.filter((i) => i.quantity <= i.lowThreshold);

    res.json(lowStock);
  } catch (error) {
    next(error);
  }
};
