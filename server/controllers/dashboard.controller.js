import { prisma } from "../config/prisma.js";

export const getOverview = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const [
      totalOrders, todayOrders, totalRevenue, todayRevenue,
      totalProducts, totalUsers, pendingOrders,
    ] = await Promise.all([
      prisma.order.count({ where: { paymentStatus: "PAID" } }),
      prisma.order.count({ where: { createdAt: { gte: today, lt: tomorrow }, paymentStatus: "PAID" } }),
      prisma.order.aggregate({ where: { paymentStatus: "PAID" }, _sum: { total: true } }),
      prisma.order.aggregate({
        where: { paymentStatus: "PAID", createdAt: { gte: today, lt: tomorrow } },
        _sum: { total: true },
      }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: "CUSTOMER" } }),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING"] } } }),
    ]);

    res.json({
      totalOrders,
      todayOrders,
      totalRevenue: parseFloat(totalRevenue._sum.total || 0),
      todayRevenue: parseFloat(todayRevenue._sum.total || 0),
      totalProducts,
      totalCustomers: totalUsers,
      pendingOrders,
    });
  } catch (error) {
    next(error);
  }
};

export const getRevenueChart = async (req, res, next) => {
  try {
    const { period = "7d" } = req.query;

    const days = period === "30d" ? 30 : period === "90d" ? 90 : 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const orders = await prisma.order.findMany({
      where: { paymentStatus: "PAID", createdAt: { gte: startDate } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });

    // Group by day
    const grouped = {};
    for (const order of orders) {
      const day = order.createdAt.toISOString().split("T")[0];
      if (!grouped[day]) grouped[day] = { date: day, revenue: 0, orders: 0 };
      grouped[day].revenue += parseFloat(order.total);
      grouped[day].orders += 1;
    }

    // Fill missing days
    const result = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      result.push(grouped[key] || { date: key, revenue: 0, orders: 0 });
    }

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getTopProducts = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;

    const topItems = await prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true, subtotal: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: parseInt(limit),
    });

    const productIds = topItems.map((i) => i.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, imageUrl: true, category: { select: { name: true } } },
    });

    const result = topItems.map((item) => ({
      product: products.find((p) => p.id === item.productId),
      totalSold: item._sum.quantity,
      totalRevenue: parseFloat(item._sum.subtotal || 0),
    }));

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getOrderStatusBreakdown = async (req, res, next) => {
  try {
    const breakdown = await prisma.order.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    res.json(breakdown.map((b) => ({ status: b.status, count: b._count._all })));
  } catch (error) {
    next(error);
  }
};

export const getRecentOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
        _count: { select: { items: true } },
      },
    });
    res.json(orders);
  } catch (error) {
    next(error);
  }
};
