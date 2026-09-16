import { prisma } from "../config/prisma.js";
import { getActiveSettings } from "../controllers/settings.controller.js";

export const calcDeliveryFee = (subtotal) => {
  const { freeDeliveryThreshold, deliveryFee } = getActiveSettings();
  return subtotal >= freeDeliveryThreshold ? 0 : deliveryFee;
};

export const calcCouponDiscount = (coupon, subtotal) => {
  if (!coupon) return 0;
  let discount =
    coupon.discountType === "PERCENT"
      ? (subtotal * parseFloat(coupon.discountValue)) / 100
      : parseFloat(coupon.discountValue);
  if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
  return Math.min(discount, subtotal);
};

export const validateCoupon = async (code, subtotal) => {
  const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
  if (!coupon) throw Object.assign(new Error("Invalid coupon code"), { status: 400 });
  if (!coupon.isActive) throw Object.assign(new Error("Coupon is inactive"), { status: 400 });
  if (coupon.expiresAt && new Date() > coupon.expiresAt)
    throw Object.assign(new Error("Coupon has expired"), { status: 400 });
  if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit)
    throw Object.assign(new Error("Coupon usage limit reached"), { status: 400 });
  if (coupon.minOrderAmount && subtotal < parseFloat(coupon.minOrderAmount))
    throw Object.assign(
      new Error(`Minimum order amount of $${coupon.minOrderAmount} required`),
      { status: 400 }
    );
  return coupon;
};

export const getCartWithProducts = (userId) =>
  prisma.cart.findUnique({
    where: { userId },
    include: { items: { include: { product: true } } },
  });

export const getOrderSummary = async (userId, couponCode) => {
  const cart = await getCartWithProducts(userId);
  if (!cart || cart.items.length === 0)
    throw Object.assign(new Error("Cart is empty"), { status: 400 });

  for (const item of cart.items) {
    if (!item.product.isActive)
      throw Object.assign(new Error(`${item.product.name} is no longer available`), { status: 400 });
    if (item.product.stock < item.quantity)
      throw Object.assign(new Error(`Insufficient stock for ${item.product.name}`), { status: 400 });
  }

  const subtotal = cart.items.reduce(
    (sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0
  );

  let coupon = null;
  let discount = 0;
  if (couponCode) {
    coupon = await validateCoupon(couponCode, subtotal);
    discount = calcCouponDiscount(coupon, subtotal);
  }

  const deliveryFee = calcDeliveryFee(subtotal);
  const total = subtotal - discount + deliveryFee;

  return {
    cart,
    coupon,
    subtotal: parseFloat(subtotal.toFixed(2)),
    discount: parseFloat(discount.toFixed(2)),
    deliveryFee: parseFloat(deliveryFee.toFixed(2)),
    total: parseFloat(total.toFixed(2)),
  };
};
