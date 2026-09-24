import { prisma } from "../config/prisma.js";

export const getCoupons = async (req, res, next) => {
  try {
    const isAdminUser = req.user?.role === "ADMIN" || req.user?.role === "SUPERADMIN";
    const where = isAdminUser ? {} : { isActive: true };
    const coupons = await prisma.coupon.findMany({ where, orderBy: { createdAt: "desc" } });
    res.json(coupons);
  } catch (error) {
    next(error);
  }
};

export const validateCoupon = async (req, res, next) => {
  try {
    const { code, orderAmount } = req.body;
    if (!code) return res.status(400).json({ message: "Coupon code is required" });

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (!coupon) return res.status(404).json({ message: "Invalid coupon code" });
    if (!coupon.isActive) return res.status(400).json({ message: "Coupon is inactive" });
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return res.status(400).json({ message: "Coupon has expired" });
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return res.status(400).json({ message: "Coupon usage limit reached" });
    }
    if (coupon.minOrderAmount && parseFloat(orderAmount) < parseFloat(coupon.minOrderAmount)) {
      return res.status(400).json({
        message: `Minimum order amount of $${coupon.minOrderAmount} required`,
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.discountType === "PERCENT") {
      discount = (parseFloat(orderAmount) * parseFloat(coupon.discountValue)) / 100;
      if (coupon.maxDiscount) discount = Math.min(discount, parseFloat(coupon.maxDiscount));
    } else {
      discount = Math.min(parseFloat(coupon.discountValue), parseFloat(orderAmount));
    }

    res.json({ valid: true, coupon, discount: parseFloat(discount.toFixed(2)) });
  } catch (error) {
    next(error);
  }
};

export const createCoupon = async (req, res, next) => {
  try {
    const {
      code, description, discountType, discountValue,
      minOrderAmount, maxDiscount, usageLimit, expiresAt,
      title, buttonLabel, buttonLink, imageUrl
    } = req.body;

    if (!code || !discountType || !discountValue) {
      return res.status(400).json({ message: "code, discountType, and discountValue are required" });
    }
    if (!["PERCENT", "FIXED"].includes(discountType)) {
      return res.status(400).json({ message: "discountType must be PERCENT or FIXED" });
    }

    const finalImageUrl = req.file ? req.file.path : (imageUrl || "/assets/basil-rice.png");

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase(), description, discountType,
        discountValue: parseFloat(discountValue),
        minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
        maxDiscount: maxDiscount ? parseFloat(maxDiscount) : null,
        usageLimit: usageLimit ? parseInt(usageLimit) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        metadata: {
          title: title || description || code,
          buttonLabel: buttonLabel || "ดูเมนู",
          buttonLink: buttonLink || "/order",
          imageUrl: finalImageUrl,
        }
      },
    });
    res.status(201).json(coupon);
  } catch (error) {
    next(error);
  }
};

export const updateCoupon = async (req, res, next) => {
  try {
    const { isActive, usageLimit, expiresAt, title, buttonLabel, buttonLink, imageUrl, history, ...rest } = req.body;
    const data = { ...rest };
    if (isActive !== undefined) data.isActive = isActive === "true" || isActive === true;
    if (usageLimit !== undefined) data.usageLimit = usageLimit ? parseInt(usageLimit) : null;
    if (expiresAt !== undefined) data.expiresAt = expiresAt ? new Date(expiresAt) : null;

    const existing = await prisma.coupon.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ message: "Coupon not found" });

    const existingMetadata = (existing.metadata && typeof existing.metadata === 'object') ? existing.metadata : {};
    const finalImageUrl = req.file ? req.file.path : (imageUrl || existingMetadata.imageUrl || "/assets/basil-rice.png");

    let parsedHistory = existingMetadata.history || [];
    if (history) {
      try {
        parsedHistory = typeof history === 'string' ? JSON.parse(history) : history;
      } catch {
        parsedHistory = existingMetadata.history || [];
      }
    }

    data.metadata = {
      ...existingMetadata,
      ...(title !== undefined && { title }),
      ...(buttonLabel !== undefined && { buttonLabel }),
      ...(buttonLink !== undefined && { buttonLink }),
      history: parsedHistory,
      imageUrl: finalImageUrl,
    };

    const coupon = await prisma.coupon.update({ where: { id: req.params.id }, data });
    res.json(coupon);
  } catch (error) {
    next(error);
  }
};

export const deleteCoupon = async (req, res, next) => {
  try {
    await prisma.coupon.delete({ where: { id: req.params.id } });
    res.json({ message: "Coupon deleted" });
  } catch (error) {
    next(error);
  }
};
