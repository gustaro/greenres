import bcrypt from "bcrypt";
import { prisma } from "../config/prisma.js";
import { getActiveSettings } from "./settings.controller.js";

export const createUser = async (req, res, next) => {
  try {
    const { email, name, password, role = "CUSTOMER", phone } = req.body;
    if (!email || !password) return res.status(400).json({ message: "email and password are required" });
    if (password.length < 6) return res.status(400).json({ message: "Password must be at least 6 characters" });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ message: "Email already in use" });
    const validRoles = ["CUSTOMER", "STAFF", "KITCHEN", "ADMIN"];
    const hashed = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: { email, name: name || null, phone: phone || null, password: hashed, role: validRoles.includes(role) ? role : "CUSTOMER" },
      select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, points: true, createdAt: true },
    });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (req, res, next) => {

  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (role) where.role = role;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        select: { id: true, email: true, name: true, phone: true, role: true, isActive: true, points: true, avatarUrl: true, createdAt: true },
      }),
      prisma.user.count({ where }),
    ]);

    res.json({ users, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, email: true, name: true, phone: true, role: true, isActive: true, points: true, avatarUrl: true, createdAt: true,
        addresses: true,
        _count: { select: { orders: true } },
      },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, avatarUrl } = req.body;
    const data = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data,
      select: { id: true, email: true, name: true, phone: true, role: true, avatarUrl: true, points: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    const avatarUrl = req.file ? req.file.path : req.body.avatarUrl;
    if (!avatarUrl) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        avatarUrl: true,
        points: true,
        isActive: true,
        createdAt: true,
      },
    });

    res.json({ avatarUrl, user });
  } catch (error) {
    next(error);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both passwords are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) return res.status(400).json({ message: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 12);
    await prisma.user.update({ where: { id: req.user.id }, data: { password: hashed } });

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};

export const updateUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;
    if (isActive === undefined) return res.status(400).json({ message: "isActive is required" });
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: isActive === true || isActive === "true" },
      select: { id: true, email: true, name: true, role: true, isActive: true, points: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const validRoles = ["CUSTOMER", "STAFF", "KITCHEN", "ADMIN"];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });
    res.json(user);
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// Addresses
export const addAddress = async (req, res, next) => {
  try {
    const { label, street, city, state, zip, isDefault, phone } = req.body;
    if (!street || !state || !zip) {
      return res.status(400).json({ message: "street, state, and zip are required" });
    }

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.create({
      data: { userId: req.user.id, label: label || "Home", street, city: city || '', state, zip, phone, isDefault: !!isDefault },
    });
    res.status(201).json(address);
  } catch (error) {
    next(error);
  }
};

export const updateAddress = async (req, res, next) => {
  try {
    const { isDefault, ...data } = req.body;

    const existing = await prisma.address.findFirst({
      where: { id: req.params.addressId, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: "Address not found" });

    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: req.params.addressId },
      data: { ...data, isDefault: !!isDefault },
    });
    res.json(address);
  } catch (error) {
    next(error);
  }
};

export const deleteAddress = async (req, res, next) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: req.params.addressId, userId: req.user.id },
    });
    if (!existing) return res.status(404).json({ message: "Address not found" });
    await prisma.address.delete({ where: { id: req.params.addressId } });
    res.json({ message: "Address deleted" });
  } catch (error) {
    next(error);
  }
};

export const getPointsHistory = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, points: true, createdAt: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const activeSettings = getActiveSettings();
    const earnRate = activeSettings.pointsEarnRate || 10;

    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        total: true,
        status: true,
        notes: true,
        createdAt: true,
      },
    });

    const history = [];
    let totalFromOrders = 0;
    let totalSpentPoints = 0;

    for (const order of orders) {
      if (order.status === "CANCELLED") continue;

      const orderTotal = parseFloat(order.total) || 0;
      const pts = Math.floor(orderTotal / earnRate);
      if (pts > 0) {
        const isDelivered = order.status === "DELIVERED";
        if (isDelivered) totalFromOrders += pts;
        history.push({
          id: `order-${order.id}`,
          type: "earned",
          title: `สั่งซื้ออาหาร #${order.id.slice(-6).toUpperCase()}`,
          titleEn: `Order #${order.id.slice(-6).toUpperCase()}`,
          points: pts,
          amount: orderTotal,
          status: isDelivered ? "completed" : "pending",
          date: order.createdAt,
        });
      }

      // Check if points were redeemed on this order
      const metaMatch = (order.notes || "").match(/LIMELEAF_META:(\{.*\})/);
      if (metaMatch) {
        try {
          const meta = JSON.parse(metaMatch[1]);
          if (meta.pointsUsed && Number(meta.pointsUsed) > 0) {
            const usedPts = Number(meta.pointsUsed);
            totalSpentPoints += usedPts;
            history.push({
              id: `order-spent-${order.id}`,
              type: "used",
              title: `ใช้แต้มแลกส่วนลด #${order.id.slice(-6).toUpperCase()}`,
              titleEn: `Points Redeemed #${order.id.slice(-6).toUpperCase()}`,
              points: -usedPts,
              amount: Number(meta.pointsDiscount || 0),
              status: "completed",
              date: order.createdAt,
            });
          }
        } catch {}
      }
    }

    const currentPoints = user.points || 0;
    const netCalculated = totalFromOrders - totalSpentPoints;
    const diff = currentPoints - netCalculated;
    if (diff > 0) {
      history.push({
        id: `bonus-${user.id}`,
        type: "earned",
        title: "โบนัสต้อนรับและแต้มพิเศษสมาชิก",
        titleEn: "Welcome & Member Bonus",
        points: diff,
        amount: 0,
        status: "completed",
        date: user.createdAt,
      });
    }

    history.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      currentPoints,
      totalEarned: totalFromOrders + (diff > 0 ? diff : 0),
      totalSpent: totalSpentPoints,
      history,
    });
  } catch (error) {
    next(error);
  }
};

