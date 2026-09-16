import { prisma } from "../config/prisma.js";

export const getKitchenQueue = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: {
        status: { in: ["CONFIRMED", "PREPARING"] },
        paymentStatus: { in: ["PAID", "PENDING"] }, // Include cash orders
      },
      orderBy: { createdAt: "asc" },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, prepTime: true } },
          },
        },
        user: { select: { name: true } },
      },
    });

    // Estimate ready times
    const queue = orders.map((order) => {
      const maxPrepTime = Math.max(...order.items.map((i) => i.product.prepTime * i.quantity));
      return { ...order, estimatedReadyTime: maxPrepTime };
    });

    res.json(queue);
  } catch (error) {
    next(error);
  }
};

export const startPreparing = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "CONFIRMED") {
      return res.status(400).json({ message: "Order must be CONFIRMED before preparing" });
    }

    const maxPrepTime = await prisma.orderItem.findMany({
      where: { orderId: order.id },
      include: { product: { select: { prepTime: true } } },
    }).then((items) => Math.max(...items.map((i) => i.product.prepTime * i.quantity)));

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: "PREPARING", estimatedTime: maxPrepTime },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const markReady = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status !== "PREPARING") {
      return res.status(400).json({ message: "Order must be PREPARING to mark as ready" });
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: "READY" },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const getKitchenStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [pending, preparing, ready, completedToday] = await Promise.all([
      prisma.order.count({ where: { status: "CONFIRMED" } }),
      prisma.order.count({ where: { status: "PREPARING" } }),
      prisma.order.count({ where: { status: "READY" } }),
      prisma.order.count({
        where: { status: "DELIVERED", updatedAt: { gte: today } },
      }),
    ]);

    res.json({ pending, preparing, ready, completedToday });
  } catch (error) {
    next(error);
  }
};
