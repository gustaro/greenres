import { prisma } from "../config/prisma.js";

export const getKitchenQueue = async (req, res, next) => {
  try {
    const { status } = req.query;
    const allowed = status ? status.split(",") : ["CONFIRMED", "PREPARING", "READY", "CANCELLED"];
    const orders = await prisma.order.findMany({
      where: {
        status: { in: allowed },
      },
      orderBy: { createdAt: "asc" },
      take: 50,
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, prepTime: true, imageUrl: true } },
          },
        },
        user: { select: { name: true } },
      },
    });

    // Estimate ready times
    const queue = orders.map((order) => {
      const maxPrepTime = Math.max(10, ...(order.items || []).map((i) => (i.product?.prepTime || 15) * i.quantity));
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

export const updateOrderItemStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { itemId, status } = req.body; // status: 'CONFIRMED' | 'PREPARING' | 'READY' | 'SERVED'

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, prepTime: true, imageUrl: true } } },
        },
      },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const notes = order.notes || "";
    const sourceMatch = notes.match(/^\[([a-z]+)\]/);
    const orderSource = sourceMatch ? sourceMatch[1] : "walkin";
    const remainingNotes = notes.replace(/^\[[a-z]+\]\s*/, "");

    let meta = {};
    const prefix = "LIMELEAF_META:";
    const idx = remainingNotes.indexOf(prefix);
    if (idx !== -1) {
      try {
        meta = JSON.parse(remainingNotes.slice(idx + prefix.length));
      } catch (e) {}
    } else {
      meta = { note: remainingNotes };
    }

    if (!meta.itemStatuses) {
      meta.itemStatuses = {};
    }

    if (itemId) {
      meta.itemStatuses[itemId] = status;
    } else if (req.body.itemStatuses) {
      meta.itemStatuses = { ...meta.itemStatuses, ...req.body.itemStatuses };
    }

    const allItems = order.items || [];
    const allReady = allItems.length > 0 && allItems.every((it) => {
      const st = meta.itemStatuses[it.id];
      return st === "READY" || st === "SERVED";
    });
    const anyPreparingOrReady = allItems.some((it) => {
      const st = meta.itemStatuses[it.id];
      return st === "PREPARING" || st === "READY" || st === "SERVED";
    });

    let nextOrderStatus = order.status;
    if (allReady) {
      nextOrderStatus = "READY";
    } else if (anyPreparingOrReady && order.status === "CONFIRMED") {
      nextOrderStatus = "PREPARING";
    }

    const updatedNotes = `[${orderSource}] ${prefix}${JSON.stringify(meta)}`;

    const updated = await prisma.order.update({
      where: { id },
      data: {
        notes: updatedNotes,
        status: nextOrderStatus,
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, prepTime: true, imageUrl: true } } },
        },
        user: { select: { name: true } },
      },
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
