import { prisma } from "../config/prisma.js";
import { getActiveSettings } from "./settings.controller.js";

const calcDeliveryFee = (subtotal) => {
  const { freeDeliveryThreshold, deliveryFee } = getActiveSettings();
  return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
};

export const createOrder = async (req, res, next) => {
  try {
    const { addressId, couponCode, notes, paymentMethod = "STRIPE", orderSource = "online", overrideItems, itemNotes } = req.body;
    const isCounterOrder = orderSource === "walkin" || orderSource === "takeaway";
    const taggedNotes = `[${orderSource}]${notes ? ` ${notes}` : ""}`;

    let cartItems = [];
    let cartId = null;

    if (overrideItems && overrideItems.length > 0) {
      const productIds = overrideItems.map(i => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
      const productMap = {};
      for (const p of products) productMap[p.id] = p;

      for (const item of overrideItems) {
        const p = productMap[item.productId];
        if (p) cartItems.push({ productId: p.id, quantity: item.quantity, product: p });
      }
    } else {
      // Get cart
      const cart = await prisma.cart.findUnique({
        where: { userId: req.user.id },
        include: { items: { include: { product: true } } },
      });
      if (cart) {
        cartItems = cart.items;
        cartId = cart.id;
      }
    }

    if (cartItems.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    // Validate stock
    for (const item of cartItems) {
      if (!item.product.isActive) {
        return res.status(400).json({ message: `${item.product.name} is no longer available` });
      }
      if (item.product.stock < item.quantity) {
        return res.status(400).json({ message: `Insufficient stock for ${item.product.name}` });
      }
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce(
      (sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0
    );

    // Validate coupon
    let coupon = null;
    let discount = 0;
    if (couponCode) {
      coupon = await prisma.coupon.findUnique({ where: { code: couponCode.toUpperCase() } });
      if (!coupon || !coupon.isActive) {
        return res.status(400).json({ message: "Invalid coupon code" });
      }
      if (coupon.expiresAt && new Date() > coupon.expiresAt) {
        return res.status(400).json({ message: "Coupon has expired" });
      }
      if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount)) {
        return res.status(400).json({ message: `Minimum order $${coupon.minOrderAmount} required` });
      }
      if (coupon.discountType === "PERCENT") {
        discount = (subtotal * parseFloat(coupon.discountValue)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
      } else {
        discount = Math.min(parseFloat(coupon.discountValue), subtotal);
      }
    }

    const deliveryFee = calcDeliveryFee(subtotal);
    const total = subtotal - discount + deliveryFee;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          addressId: addressId || null,
          couponId: coupon?.id || null,
          paymentMethod,
          status: isCounterOrder ? "CONFIRMED" : "PENDING",
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat(discount.toFixed(2)),
          deliveryFee: parseFloat(deliveryFee.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          notes: taggedNotes,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.product.price,
              subtotal: parseFloat((parseFloat(item.product.price) * item.quantity).toFixed(2)),
              note: itemNotes?.[item.productId] || null,
            })),
          },
        },
        include: { items: { include: { product: true } }, address: true },
      });

      // Decrement stock and inventory in parallel
      await Promise.all(cartItems.flatMap((item) => [
        tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }),
        tx.inventory.updateMany({
          where: { productId: item.productId },
          data: { quantity: { decrement: item.quantity } },
        }),
      ]));

      // Increment coupon usage
      if (coupon) {
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      // Clear cart
      if (cartId) {
        await tx.cartItem.deleteMany({ where: { cartId: cartId } });
      }

      return newOrder;
    }, {
      maxWait: 5000, // 5 seconds max wait to connect to prisma
      timeout: 10000 // 10 seconds max transaction execution time
    });

    res.status(201).json(order);
  } catch (error) {
    next(error);
  }
};

export const getOrders = async (req, res, next) => {
  try {
    const {
      page = 1, limit = 20, status, userId: filterUserId,
      from, to, sortOrder = "desc",
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    // Customers can only see their own orders
    if (req.user.role === "CUSTOMER") {
      where.userId = req.user.id;
    } else if (filterUserId) {
      where.userId = filterUserId;
    }
    if (status) where.status = status;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: sortOrder },
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
          address: true,
        },
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ orders, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

export const getOrderById = async (req, res, next) => {
  try {
    const where = { id: req.params.id };
    if (req.user.role === "CUSTOMER") where.userId = req.user.id;

    const order = await prisma.order.findFirst({
      where,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        items: { include: { product: true } },
        address: true,
        coupon: true,
      },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  } catch (error) {
    next(error);
  }
};

export const updateOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ["PENDING", "CONFIRMED", "PREPARING", "READY", "DELIVERING", "DELIVERED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.status === "CANCELLED") {
      return res.status(400).json({ message: "Cannot update a cancelled order" });
    }

    // Restore stock if cancelling
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      await prisma.$transaction(
        items.map((item) =>
          prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.quantity } },
          })
        )
      );
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    // Award loyalty points when order is marked DELIVERED
    if (status === "DELIVERED") {
      await prisma.user.update({
        where: { id: updated.userId },
        data: { points: { increment: Math.floor(parseFloat(updated.total) / 10) } },
      });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const cancelOrder = async (req, res, next) => {
  try {
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, userId: req.user.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const cancellableStatuses = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status)) {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
    }

    await prisma.$transaction([
      prisma.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } }),
      ...order.items.map((item) =>
        prisma.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      ),
    ]);

    res.json({ message: "Order cancelled successfully" });
  } catch (error) {
    next(error);
  }
};

// Mark a cash order as paid
export const markPaymentPaid = async (req, res, next) => {
  try {
    const { paymentMethod = "CASH" } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ message: "Order already paid" });
    }
    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { paymentStatus: "PAID", paymentMethod },
      include: { user: { select: { id: true, name: true, email: true } }, items: { include: { product: true } }, address: true },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};
