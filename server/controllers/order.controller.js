import { prisma } from "../config/prisma.js";
import { getActiveSettings } from "./settings.controller.js";
import { ensureDeliveryForOrder } from "../services/delivery.service.js";
import { clearProductsCache } from "./product.controller.js";
import { createRefund } from "../services/stripe.service.js";

const META_PREFIX = "LIMELEAF_META:";

// Order metadata lives in notes as "[source] ... LIMELEAF_META:{json}".
const readNotesMeta = (notes) => {
  const text = notes || "";
  const idx = text.indexOf(META_PREFIX);
  if (idx === -1) return { meta: {}, head: text.trim() };
  try {
    return { meta: JSON.parse(text.slice(idx + META_PREFIX.length)), head: text.slice(0, idx).trim() };
  } catch {
    return { meta: {}, head: text.trim() };
  }
};

const writeNotesMeta = (notes, meta) => {
  const { head } = readNotesMeta(notes);
  return `${head ? `${head} ` : ""}${META_PREFIX}${JSON.stringify(meta)}`;
};

// Light delivery summary so cashier cards can show rider pickup state.
const deliverySummaryInclude = {
  select: {
    id: true,
    status: true,
    pickedUpAt: true,
    riderId: true,
    rider: { select: { id: true, user: { select: { name: true, phone: true } } } },
  },
};

// Close the delivery and free the rider when an order is delivered or cancelled.
const syncDeliveryOnOrderEnd = async (orderId, status) => {
  try {
    const relatedDelivery = await prisma.delivery.findUnique({ where: { orderId } });
    if (!relatedDelivery) return;
    const newDeliveryStatus = status === "DELIVERED" ? "DELIVERED" : "CANCELLED";
    if (relatedDelivery.status !== newDeliveryStatus) {
      await prisma.delivery.update({
        where: { id: relatedDelivery.id },
        data: {
          status: newDeliveryStatus,
          ...(status === "DELIVERED" && !relatedDelivery.deliveredAt ? { deliveredAt: new Date() } : {}),
        },
      });
    }
    if (relatedDelivery.riderId) {
      const activeDeliveriesCount = await prisma.delivery.count({
        where: {
          riderId: relatedDelivery.riderId,
          id: { not: relatedDelivery.id },
          status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] },
        },
      });
      if (activeDeliveriesCount === 0) {
        await prisma.rider.update({
          where: { id: relatedDelivery.riderId },
          data: {
            status: "AVAILABLE",
            ...(status === "DELIVERED" ? { totalDeliveries: { increment: 1 } } : {}),
          },
        });
      }
    }
  } catch (e) {
    console.warn("[order] Delivery sync warning:", e.message);
  }
};

const calcDeliveryFee = (subtotal) => {
  const { freeDeliveryThreshold, deliveryFee } = getActiveSettings();
  return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
};

const optionGroupInclude = {
  optionGroups: {
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    include: {
      options: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: { ingredient: { select: { id: true, name: true, quantity: true, unit: true, isActive: true } } },
      },
    },
  },
};

const resolveSelectedOptions = (product, item) => {
  const requestedIds = new Set(Array.isArray(item.selectedOptionIds) ? item.selectedOptionIds.map(String) : []);
  const validIds = new Set((product.optionGroups || []).flatMap(group => group.options.map(option => option.id)));
  const unknown = [...requestedIds].find(id => !validIds.has(id));
  if (unknown) throw Object.assign(new Error(`ตัวเลือกของ ${product.name} ไม่ถูกต้อง`), { status: 400 });

  const snapshots = [];
  for (const group of product.optionGroups || []) {
    const selected = group.options.filter(option => requestedIds.has(option.id));
    const minimum = group.isRequired ? Math.max(1, Number(group.minSelections || 1)) : Number(group.minSelections || 0);
    const maximum = group.selectionType === "SINGLE" ? 1 : Math.max(1, Number(group.maxSelections || group.options.length));
    if (selected.length < minimum || selected.length > maximum) {
      throw Object.assign(new Error(`กรุณาเลือก ${group.name} ${minimum === maximum ? `${minimum} รายการ` : `${minimum}-${maximum} รายการ`}`), { status: 400 });
    }
    for (const option of selected) {
      snapshots.push({
        groupId: group.id,
        groupName: group.name,
        groupNameEn: group.nameEn || "",
        optionId: option.id,
        name: option.name,
        nameEn: option.nameEn || "",
        priceAdjustment: Number(option.priceAdjustment || 0),
        ingredientId: option.ingredientId || null,
        ingredientName: option.ingredient?.name || null,
        ingredientQuantity: option.ingredientQuantity == null ? null : Number(option.ingredientQuantity),
        unit: option.ingredient?.unit || null,
      });
    }
  }

  return snapshots;
};

const getIngredientUsage = async (client, items) => {
  const productQuantities = new Map();
  for (const item of items) {
    const quantity = Number(item.quantity || 0);
    if (quantity > 0) productQuantities.set(item.productId, (productQuantities.get(item.productId) || 0) + quantity);
  }
  const productIds = [...productQuantities.keys()];
  if (productIds.length === 0) return [];

  const recipeItems = await client.recipeIngredient.findMany({
    where: { productId: { in: productIds } },
    include: { ingredient: true },
  });
  const usage = new Map();
  for (const recipeItem of recipeItems) {
    const required = Number(recipeItem.quantityRequired) * (productQuantities.get(recipeItem.productId) || 0);
    const current = usage.get(recipeItem.ingredientId);
    usage.set(recipeItem.ingredientId, {
      ingredient: recipeItem.ingredient,
      required: (current?.required || 0) + required,
    });
  }

  const optionIngredientQuantities = new Map();
  for (const item of items) {
    for (const option of Array.isArray(item.selectedOptions) ? item.selectedOptions : []) {
      if (!option?.ingredientId || Number(option.ingredientQuantity || 0) <= 0) continue;
      const required = Number(option.ingredientQuantity) * Number(item.quantity || 0);
      optionIngredientQuantities.set(option.ingredientId, (optionIngredientQuantities.get(option.ingredientId) || 0) + required);
    }
  }
  if (optionIngredientQuantities.size > 0) {
    const ingredients = await client.ingredient.findMany({ where: { id: { in: [...optionIngredientQuantities.keys()] } } });
    for (const ingredient of ingredients) {
      const current = usage.get(ingredient.id);
      usage.set(ingredient.id, {
        ingredient,
        required: (current?.required || 0) + (optionIngredientQuantities.get(ingredient.id) || 0),
      });
    }
  }
  return [...usage.values()];
};

// Products without a recipe use their own stock count; zero means sold out.
const findSoldOutProduct = async (products) => {
  const zeroStock = products.filter(product => product && Number(product.stock ?? 1) <= 0);
  if (zeroStock.length === 0) return null;
  const withRecipe = await prisma.recipeIngredient.findMany({
    where: { productId: { in: zeroStock.map(product => product.id) } },
    select: { productId: true },
    distinct: ["productId"],
  });
  const recipeIds = new Set(withRecipe.map(row => row.productId));
  return zeroStock.find(product => !recipeIds.has(product.id)) || null;
};

const findInsufficientIngredient = (usage) => usage.find(({ ingredient, required }) =>
  !ingredient.isActive || Number(ingredient.quantity) < required
);

export const createOrder = async (req, res, next) => {
  try {
    const { addressId, couponCode, notes, paymentMethod = "STRIPE", orderSource = "online", overrideItems, itemNotes, stripePaymentId, pointsUsed } = req.body;
    const isCounterOrder = orderSource === "walkin" || orderSource === "takeaway";

    let cartItems = [];
    let cartId = null;

    if (overrideItems && overrideItems.length > 0) {
      const productIds = overrideItems.map(i => i.productId);
      const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: optionGroupInclude });
      const productMap = {};
      for (const p of products) productMap[p.id] = p;

      for (const item of overrideItems) {
        const p = productMap[item.productId];
        if (p) {
          const selectedOptions = resolveSelectedOptions(p, item);
          const optionTotal = selectedOptions.reduce((sum, option) => sum + Number(option.priceAdjustment || 0), 0);
          cartItems.push({
            productId: p.id,
            lineKey: item.lineKey || p.id,
            quantity: Math.max(1, Number(item.quantity) || 1),
            product: p,
            selectedOptions,
            unitPrice: Number(p.price) + optionTotal,
          });
        }
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

    // Product availability is controlled by active state; physical stock comes from recipes.
    for (const item of cartItems) {
      if (!item.product.isActive) {
        return res.status(400).json({ message: `${item.product.name} is no longer available` });
      }
    }
    const soldOut = await findSoldOutProduct(cartItems.map(item => item.product));
    if (soldOut) {
      return res.status(400).json({ message: `${soldOut.name} หมดแล้ว` });
    }

    const ingredientUsage = await getIngredientUsage(prisma, cartItems);
    const insufficient = findInsufficientIngredient(ingredientUsage);
    if (insufficient) {
      return res.status(400).json({
        message: `วัตถุดิบ ${insufficient.ingredient.name} ไม่เพียงพอ (ต้องใช้ ${insufficient.required} ${insufficient.ingredient.unit})`,
      });
    }

    // Calculate subtotal
    const subtotal = cartItems.reduce(
      (sum, item) => sum + Number(item.unitPrice ?? item.product.price) * item.quantity, 0
    );

    // Validate coupon
    let coupon = null;
    let couponDiscount = 0;
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
        couponDiscount = (subtotal * parseFloat(coupon.discountValue)) / 100;
        if (coupon.maxDiscount) couponDiscount = Math.min(couponDiscount, parseFloat(coupon.maxDiscount));
      } else {
        couponDiscount = Math.min(parseFloat(coupon.discountValue), subtotal);
      }
    }

    // Validate and calculate Loyalty Points redemption
    const activeSettings = getActiveSettings();
    const pointsToRedeem = Math.max(0, parseInt(pointsUsed || 0));
    let pointsDiscount = 0;

    if (pointsToRedeem > 0) {
      if (activeSettings.pointsEnabled === false) {
        return res.status(400).json({ message: "ระบบแต้มสะสมถูกปิดใช้งานชั่วคราว" });
      }

      const currentUser = await prisma.user.findUnique({
        where: { id: req.user.id },
        select: { points: true },
      });

      if (!currentUser || (currentUser.points || 0) < pointsToRedeem) {
        return res.status(400).json({ message: "คะแนนสะสมของคุณไม่เพียงพอ" });
      }

      const minRedeem = activeSettings.pointsMinRedeem || 0;
      if (pointsToRedeem < minRedeem) {
        return res.status(400).json({ message: `ต้องใช้แต้มสะสมขั้นต่ำ ${minRedeem} แต้ม` });
      }

      const redeemRate = activeSettings.pointsRedeemRate || 10;
      const rawPointsDiscount = Math.floor(pointsToRedeem / redeemRate);
      const maxDiscountPct = activeSettings.pointsMaxDiscountPercent !== undefined ? activeSettings.pointsMaxDiscountPercent : 100;
      const maxDiscountFromPct = (subtotal * maxDiscountPct) / 100;
      const remainingSubtotal = Math.max(0, subtotal - couponDiscount);

      pointsDiscount = Math.min(rawPointsDiscount, maxDiscountFromPct, remainingSubtotal);
    }

    const totalDiscount = couponDiscount + pointsDiscount;
    const deliveryFee = calcDeliveryFee(subtotal);
    const total = Math.max(0, subtotal - totalDiscount + deliveryFee);

    // Merge points information into notes metadata
    let finalNotes = notes || "";
    if (pointsToRedeem > 0) {
      const metaMatch = finalNotes.match(/LIMELEAF_META:(\{.*\})/);
      if (metaMatch) {
        try {
          const metaObj = JSON.parse(metaMatch[1]);
          metaObj.pointsUsed = pointsToRedeem;
          metaObj.pointsDiscount = pointsDiscount;
          finalNotes = finalNotes.replace(metaMatch[0], `LIMELEAF_META:${JSON.stringify(metaObj)}`);
        } catch {}
      } else {
        finalNotes = `${finalNotes} LIMELEAF_META:${JSON.stringify({ pointsUsed: pointsToRedeem, pointsDiscount })}`;
      }
    }
    const taggedNotes = `[${orderSource}]${finalNotes ? ` ${finalNotes}` : ""}`;

    // Create order in transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          userId: req.user.id,
          addressId: addressId || null,
          couponId: coupon?.id || null,
          paymentMethod: stripePaymentId ? "STRIPE" : paymentMethod,
          paymentStatus: stripePaymentId ? "PAID" : "PENDING",
          stripePaymentId: stripePaymentId || null,
          status: (isCounterOrder || stripePaymentId) ? "CONFIRMED" : "PENDING",
          subtotal: parseFloat(subtotal.toFixed(2)),
          discount: parseFloat(totalDiscount.toFixed(2)),
          deliveryFee: parseFloat(deliveryFee.toFixed(2)),
          total: parseFloat(total.toFixed(2)),
          notes: taggedNotes,
          items: {
            create: cartItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice ?? item.product.price),
              subtotal: parseFloat((Number(item.unitPrice ?? item.product.price) * item.quantity).toFixed(2)),
              note: itemNotes?.[item.lineKey] || itemNotes?.[item.productId] || null,
              selectedOptions: item.selectedOptions || [],
            })),
          },
        },
        include: { items: { include: { product: true } }, address: true },
      });

      // Deduct loyalty points from user
      if (pointsToRedeem > 0) {
        await tx.user.update({
          where: { id: req.user.id },
          data: { points: { decrement: pointsToRedeem } },
        });
      }

      // Decrement physical ingredients according to each product recipe.
      await Promise.all(ingredientUsage.map(({ ingredient, required }) =>
        tx.ingredient.update({
          where: { id: ingredient.id },
          data: { quantity: { decrement: required } },
        })
      ));

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

    clearProductsCache();
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
      own,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    const isStaffOrAdmin = ["STAFF", "ADMIN", "KITCHEN"].includes(req.user.role);

    // If 'own' is specified or user is not operational staff (e.g. CUSTOMER, DELIVERY/Rider),
    // strictly limit to their own orders!
    if (own === "true" || own === true || !isStaffOrAdmin) {
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
          delivery: deliverySummaryInclude,
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
        delivery: deliverySummaryInclude,
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

    // Restore recipe ingredients if cancelling
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      const items = await prisma.orderItem.findMany({ where: { orderId: order.id } });
      const ingredientUsage = await getIngredientUsage(prisma, items);
      await prisma.$transaction(
        ingredientUsage.map(({ ingredient, required }) =>
          prisma.ingredient.update({
            where: { id: ingredient.id },
            data: { quantity: { increment: required } },
          })
        )
      );
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { items: { include: { product: true } } },
    });

    if (status === "READY") {
      try {
        await ensureDeliveryForOrder(updated.id);
      } catch (deliveryErr) {
        console.warn("[updateOrderStatus READY] ensureDeliveryForOrder error:", deliveryErr.message);
      }
    }

    // Award loyalty points when order is marked DELIVERED
    if (status === "DELIVERED") {
      const activeSettings = getActiveSettings();
      if (activeSettings.pointsEnabled !== false) {
        const earnRate = activeSettings.pointsEarnRate || 10;
        const pts = Math.floor(parseFloat(updated.total) / earnRate);
        if (pts > 0) {
          await prisma.user.update({
            where: { id: updated.userId },
            data: { points: { increment: pts } },
          });
        }
      }
    }

    // Refund loyalty points if order is cancelled
    if (status === "CANCELLED" && order.status !== "CANCELLED") {
      const metaMatch = (order.notes || "").match(/LIMELEAF_META:(\{.*\})/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          if (meta.pointsUsed && Number(meta.pointsUsed) > 0) {
            await prisma.user.update({
              where: { id: order.userId },
              data: { points: { increment: Number(meta.pointsUsed) } },
            });
          }
        } catch {}
      }
    }

    // Sync related delivery & rider if order is delivered or cancelled
    if (status === "DELIVERED" || status === "CANCELLED") {
      await syncDeliveryOnOrderEnd(req.params.id, status);
    }
    if (status === "CANCELLED") clearProductsCache();

    res.json(updated);
  } catch (error) {
    next(error);
  }
};

const REFUND_METHOD_LABELS = {
  CASH: "คืนเงินสด",
  TRANSFER: "โอนเงินคืน",
  STRIPE: "คืนเงินผ่าน Stripe",
};

export const cancelOrder = async (req, res, next) => {
  try {
    const isStaff = req.user.role === "ADMIN" || req.user.role === "STAFF";
    const where = isStaff ? { id: req.params.id } : { id: req.params.id, userId: req.user.id };
    const order = await prisma.order.findFirst({
      where,
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "CANCELLED") {
      return res.status(400).json({ message: "ออเดอร์นี้ถูกยกเลิกไปแล้ว" });
    }

    const cancellableStatuses = ["PENDING", "CONFIRMED"];
    if (!cancellableStatuses.includes(order.status) && !isStaff) {
      return res.status(400).json({ message: "Order cannot be cancelled at this stage" });
    }

    const { meta } = readNotesMeta(order.notes);
    const pointsToRefund = Number(meta.pointsUsed) > 0 ? Number(meta.pointsUsed) : 0;

    // Money already collected: the full total when PAID, or the earlier paid amount
    // when items were added after payment (order is back to PENDING with a balance).
    const paidAmount = order.paymentStatus === "PAID"
      ? Number(order.total)
      : Math.max(0, Number(meta.paidAmount || 0));
    const needsRefund = order.paymentStatus !== "REFUNDED" && paidAmount > 0;

    const reason = String(req.body?.reason || "").trim();
    let refundMethod = String(req.body?.refundMethod || "").toUpperCase();
    if (needsRefund) {
      if (!isStaff) {
        // Customers can only self-cancel a paid order when it can be refunded automatically.
        if (!order.stripePaymentId) {
          return res.status(400).json({ message: "ออเดอร์นี้ชำระเงินแล้ว กรุณาติดต่อร้านเพื่อยกเลิกและขอคืนเงิน" });
        }
        refundMethod = "STRIPE";
      }
      if (!REFUND_METHOD_LABELS[refundMethod]) {
        return res.status(400).json({ message: "กรุณาเลือกวิธีคืนเงินสำหรับออเดอร์ที่ชำระแล้ว" });
      }
      if (refundMethod === "STRIPE") {
        if (!order.stripePaymentId) {
          return res.status(400).json({ message: "ออเดอร์นี้ไม่ได้ชำระผ่าน Stripe จึงคืนเงินอัตโนมัติไม่ได้" });
        }
        try {
          await createRefund(order.stripePaymentId);
        } catch (stripeErr) {
          return res.status(502).json({ message: `คืนเงินผ่าน Stripe ไม่สำเร็จ: ${stripeErr.message}` });
        }
      }
    }

    const nextMeta = { ...meta, cancelledAt: new Date().toISOString(), cancelledBy: req.user.id };
    if (reason) nextMeta.cancelReason = reason;
    if (needsRefund) {
      nextMeta.refund = {
        amount: paidAmount,
        method: refundMethod,
        label: REFUND_METHOD_LABELS[refundMethod],
        at: new Date().toISOString(),
        by: req.user.id,
      };
    }

    const ingredientUsage = await getIngredientUsage(prisma, order.items);
    const txOps = [
      prisma.order.update({
        where: { id: order.id },
        data: {
          status: "CANCELLED",
          notes: writeNotesMeta(order.notes, nextMeta),
          ...(needsRefund ? { paymentStatus: "REFUNDED" } : {}),
        },
      }),
      ...ingredientUsage.map(({ ingredient, required }) =>
        prisma.ingredient.update({
          where: { id: ingredient.id },
          data: { quantity: { increment: required } },
        })
      ),
    ];

    if (pointsToRefund > 0) {
      txOps.push(
        prisma.user.update({
          where: { id: order.userId },
          data: { points: { increment: pointsToRefund } },
        })
      );
    }

    await prisma.$transaction(txOps);
    await syncDeliveryOnOrderEnd(order.id, "CANCELLED");
    clearProductsCache();

    res.json({
      message: needsRefund ? "ยกเลิกออเดอร์และบันทึกการคืนเงินเรียบร้อย" : "Order cancelled successfully",
      refund: nextMeta.refund || null,
    });
  } catch (error) {
    next(error);
  }
};

// Mark an order as paid (Cash, QR / PromptPay, Credit Card)
export const markPaymentPaid = async (req, res, next) => {
  try {
    const { paymentMethod = "CASH", paymentDetail, stripePaymentId, paymentProofUrl } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ message: "Order already paid" });
    }

    // Prisma enum only supports STRIPE or CASH
    const prismaPaymentMethod = (paymentMethod === "STRIPE" || paymentMethod === "CARD" || paymentMethod === "PROMPTPAY_STRIPE" || stripePaymentId) ? "STRIPE" : "CASH";
    const detailLabel = paymentDetail || (paymentMethod === "STRIPE" || paymentMethod === "CARD" ? "บัตรเครดิต" : paymentMethod === "QR" || paymentMethod === "PROMPTPAY_STRIPE" ? "สแกนคิวอาร์ (PromptPay)" : "เงินสด");

    let updatedNotes = order.notes || "";
    const match = updatedNotes.match(/LIMELEAF_META:(\{.*\})/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        meta.paymentMethodDetail = detailLabel;
        meta.paymentMethod = detailLabel;
        meta.paidAmount = Number(order.total);
        if (stripePaymentId) meta.stripePaymentId = stripePaymentId;
        if (paymentProofUrl) meta.paymentProofUrl = paymentProofUrl;
        updatedNotes = updatedNotes.replace(match[0], `LIMELEAF_META:${JSON.stringify(meta)}`);
      } catch {}
    } else {
      updatedNotes += ` [${detailLabel}]`;
      if (paymentProofUrl) updatedNotes += ` LIMELEAF_META:{"paymentProofUrl":"${paymentProofUrl}"}`;
    }

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        paymentStatus: "PAID",
        paymentMethod: prismaPaymentMethod,
        notes: updatedNotes,
        status: order.status === "PENDING" ? "CONFIRMED" : order.status,
        ...(stripePaymentId ? { stripePaymentId } : {}),
      },
      include: { user: { select: { id: true, name: true, email: true } }, items: { include: { product: true } }, address: true },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const updateOrderDetails = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const order = await prisma.order.findUnique({ where: { id: req.params.id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    const updated = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        ...(notes !== undefined && { notes }),
      },
      include: {
        items: { include: { product: true } },
        address: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const appendOrderItems = async (req, res, next) => {
  try {
    const { items, itemNotes } = req.body;
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "items must be a non-empty array" });
    }

    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.status === "CANCELLED" || order.paymentStatus === "REFUNDED") {
      return res.status(400).json({ message: "Cannot add items to cancelled orders" });
    }
    if (order.status === "DELIVERING") {
      return res.status(400).json({ message: "ไรเดอร์รับออเดอร์ไปแล้ว ไม่สามารถเพิ่มเมนูได้" });
    }
    const wasPaid = order.paymentStatus === "PAID";

    const productIds = items.map(i => i.productId);
    const products = await prisma.product.findMany({ where: { id: { in: productIds } }, include: optionGroupInclude });
    const productMap = new Map(products.map(p => [p.id, p]));

    const unavailable = products.find(product => !product.isActive) || await findSoldOutProduct(products);
    if (unavailable) {
      return res.status(400).json({ message: `${unavailable.name} หมดแล้ว` });
    }

    let addedSubtotal = 0;
    const itemsToCreate = [];
    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) continue;
      const selectedOptions = resolveSelectedOptions(product, item);
      const unitPrice = parseFloat(product.price) + selectedOptions.reduce((sum, option) => sum + Number(option.priceAdjustment || 0), 0);
      const subtotal = parseFloat((unitPrice * item.quantity).toFixed(2));
      addedSubtotal += subtotal;
      itemsToCreate.push({
        orderId: order.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        subtotal,
        note: itemNotes?.[item.lineKey] || itemNotes?.[item.productId] || item.note || null,
        selectedOptions,
      });
    }

    const ingredientUsage = await getIngredientUsage(prisma, itemsToCreate);
    const insufficient = findInsufficientIngredient(ingredientUsage);
    if (insufficient) {
      return res.status(400).json({
        message: `วัตถุดิบ ${insufficient.ingredient.name} ไม่เพียงพอ (ต้องใช้ ${insufficient.required} ${insufficient.ingredient.unit})`,
      });
    }

    const newSubtotal = parseFloat(order.subtotal) + addedSubtotal;
    const newTotal = parseFloat(order.total) + addedSubtotal;

    // Parse existing meta
    const existingNotes = order.notes || "";
    const sourceMatch = existingNotes.match(/^\[([a-z]+)\]/);
    const orderSource = sourceMatch ? sourceMatch[1] : "walkin";
    const remainingNotes = existingNotes.replace(/^\[[a-z]+\]\s*/, "");

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

    // Items added after payment open a new balance: remember what was already paid
    // so the cashier only collects the difference.
    if (wasPaid) meta.paidAmount = parseFloat(order.total);

    // Determine batch / round count
    const nextRound = (meta.roundCount || 1) + 1;
    meta.roundCount = nextRound;

    // If previous order was READY or DELIVERED or items were already cooked,
    // preserve existing items as READY so kitchen does not re-cook them!
    const isPriorCompleted = order.status === "READY" || order.status === "DELIVERED";
    for (const oldItem of order.items) {
      if (!meta.itemStatuses[oldItem.id]) {
        meta.itemStatuses[oldItem.id] = isPriorCompleted ? "READY" : (order.status === "PREPARING" ? "PREPARING" : "CONFIRMED");
      }
    }

    let nextStatus = "CONFIRMED";

    const updated = await prisma.$transaction(async (tx) => {
      // Always create new OrderItem for added items (never merge into old items)
      // This ensures previous items already served are isolated and kitchen cooks only new items
      for (const it of itemsToCreate) {
        const roundTag = `[สั่งเพิ่ม รอบ ${nextRound}]`;
        const itemNote = it.note ? `${roundTag} ${it.note}` : roundTag;
        const created = await tx.orderItem.create({
          data: {
            ...it,
            note: itemNote,
          },
        });
        // Set newly created item to CONFIRMED (waiting to cook in kitchen)
        meta.itemStatuses[created.id] = "CONFIRMED";
      }

      for (const { ingredient, required } of ingredientUsage) {
        await tx.ingredient.update({
          where: { id: ingredient.id },
          data: { quantity: { decrement: required } },
        });
      }

      const updatedNotes = `[${orderSource}] ${prefix}${JSON.stringify(meta)}`;

      return tx.order.update({
        where: { id: order.id },
        data: {
          subtotal: parseFloat(newSubtotal.toFixed(2)),
          total: parseFloat(newTotal.toFixed(2)),
          status: nextStatus,
          notes: updatedNotes,
          ...(wasPaid ? { paymentStatus: "PENDING" } : {}),
        },
        include: {
          items: { include: { product: true } },
          address: true,
          user: { select: { id: true, name: true, email: true, phone: true } },
        },
      });
    });

    clearProductsCache();
    res.json(updated);
  } catch (error) {
    next(error);
  }
};

export const uploadOrderSlip = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Allow order owner or staff/admin
    if (order.userId !== req.user.id && req.user.role === 'CUSTOMER') {
      return res.status(403).json({ message: "Forbidden" });
    }
    if (req.user.role === 'CUSTOMER' && ["DELIVERED", "CANCELLED"].includes(order.status)) {
      return res.status(400).json({ message: "ออเดอร์นี้ปิดแล้ว ไม่สามารถแนบสลิปได้" });
    }

    const slipUrl = req.file ? req.file.path : (req.body.slipUrl || req.body.paymentProofUrl);
    if (!slipUrl) return res.status(400).json({ message: "No slip image provided" });

    let updatedNotes = order.notes || "";
    const match = updatedNotes.match(/LIMELEAF_META:(\{.*\})/);
    if (match) {
      try {
        const meta = JSON.parse(match[1]);
        meta.paymentProofUrl = slipUrl;
        meta.slipUrl = slipUrl;
        meta.slipUploadedAt = new Date().toISOString();
        updatedNotes = updatedNotes.replace(match[0], `LIMELEAF_META:${JSON.stringify(meta)}`);
      } catch {}
    } else {
      updatedNotes += ` LIMELEAF_META:{"paymentProofUrl":"${slipUrl}","slipUrl":"${slipUrl}","slipUploadedAt":"${new Date().toISOString()}"}`;
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { notes: updatedNotes },
      include: {
        items: { include: { product: true } },
        address: true,
        user: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
};
