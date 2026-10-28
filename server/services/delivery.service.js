import { prisma } from "../config/prisma.js";
import { AppError } from "../utils/asyncHandler.js";
import { getActiveSettings } from "../controllers/settings.controller.js";

// คำนวณ distance (km) จาก lat/lng สองจุด
export const calcDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// คำนวณค่าส่งตามระยะทาง
export const calcDeliveryFee = (distanceKm) => {
  const base = 20;       // ฿20 แรก 3km
  const perKm = 7;       // ฿7/km หลังจากนั้น
  if (distanceKm <= 3) return base;
  return base + Math.ceil(distanceKm - 3) * perKm;
};

// ประมาณเวลาส่ง (นาที)
export const estimateTime = (distanceKm) => Math.ceil(10 + distanceKm * 4);

// หา rider ที่ว่างและใกล้ที่สุด
export const findNearestRider = async (lat, lng) => {
  const { restaurantLat, restaurantLng } = getActiveSettings();
  const searchLat = lat != null ? parseFloat(lat) : (restaurantLat != null ? parseFloat(restaurantLat) : 13.75664);
  const searchLng = lng != null ? parseFloat(lng) : (restaurantLng != null ? parseFloat(restaurantLng) : 100.541838);

  // Admins get a rider record just for previewing the rider page; never auto-assign real jobs to it,
  // otherwise the food never shows up for actual riders.
  const notAdmin = { user: { role: { not: "ADMIN" } } };
  let riders = await prisma.rider.findMany({
    where: { status: "AVAILABLE", isVerified: true, ...notAdmin },
    include: { user: { select: { name: true, phone: true } } },
  });
  if (!riders.length) {
    riders = await prisma.rider.findMany({
      where: { status: "AVAILABLE", ...notAdmin },
      include: { user: { select: { name: true, phone: true } } },
    });
  }
  if (!riders.length) return null;

  return riders
    .map((r) => ({
      ...r,
      distance: r.lat && r.lng ? calcDistance(searchLat, searchLng, r.lat, r.lng) : 999,
    }))
    .sort((a, b) => a.distance - b.distance)[0];
};

// สร้าง delivery record
export const createDelivery = async (orderId, dropAddress, dropLat, dropLng, provider = "INTERNAL") => {
  const existing = await prisma.delivery.findUnique({ where: { orderId } });
  if (existing) return existing;

  const { restaurantLat, restaurantLng, restaurantAddress } = getActiveSettings();
  const restLat = restaurantLat != null ? parseFloat(restaurantLat) : 13.75664;
  const restLng = restaurantLng != null ? parseFloat(restaurantLng) : 100.541838;

  const distanceKm = dropLat && dropLng
    ? calcDistance(restLat, restLng, parseFloat(dropLat), parseFloat(dropLng))
    : 5;

  const deliveryFee = calcDeliveryFee(distanceKm);
  const estimatedMinutes = estimateTime(distanceKm);

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      provider,
      status: "PENDING",
      pickupAddress: restaurantAddress || "ร้านอาหาร",
      pickupLat: restLat,
      pickupLng: restLng,
      dropAddress,
      dropLat: dropLat != null ? parseFloat(dropLat) : null,
      dropLng: dropLng != null ? parseFloat(dropLng) : null,
      deliveryFee,
      estimatedMinutes,
    },
  });

  // บันทึก tracking event แรก
  await addTrackingEvent(delivery.id, "PENDING", null, null, "รอ Rider รับงาน");

  return delivery;
};

// ตรวจสอบและสร้าง delivery record สำหรับ order ถ้ายังไม่มี
export const ensureDeliveryForOrder = async (orderId) => {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { address: true, delivery: true, user: true },
  });
  if (!order) return null;
  if (order.delivery) {
    if (order.delivery.status === "PENDING" && !order.delivery.riderId) {
      try { await autoAssignRider(order.delivery.id); } catch (_) {}
    }
    return order.delivery;
  }

  // แยก meta จาก notes
  const notes = order.notes || "";
  let meta = {};
  const prefix = "LIMELEAF_META:";
  const idx = notes.indexOf(prefix);
  if (idx !== -1) {
    try {
      meta = JSON.parse(notes.slice(idx + prefix.length));
    } catch (_) {}
  }

  const isDelivery = meta.deliveryType === "ให้จัดส่ง" || Boolean(order.addressId) || Boolean(meta.deliveryAddress);
  if (!isDelivery) return null;

  let dropAddress = meta.deliveryAddress || order.address?.street || "ที่อยู่จัดส่ง";
  dropAddress = typeof dropAddress === "string"
    ? dropAddress.replace(/<!--geo:[^>]+-->/g, "").replace(/\[geo:[^\]]+\]/g, "").trim()
    : dropAddress;

  let dropLat = meta.dropLat != null ? Number(meta.dropLat) : null;
  let dropLng = meta.dropLng != null ? Number(meta.dropLng) : null;

  if ((dropLat == null || dropLng == null) && order.address?.street) {
    const match = order.address.street.match(/(?:<!--geo:([0-9.-]+),([0-9.-]+)-->|\[geo:([0-9.-]+),([0-9.-]+)\])/);
    if (match) {
      dropLat = parseFloat(match[1] || match[3]);
      dropLng = parseFloat(match[2] || match[4]);
    }
  }

  const delivery = await createDelivery(
    order.id,
    dropAddress,
    dropLat != null && !isNaN(dropLat) ? dropLat : null,
    dropLng != null && !isNaN(dropLng) ? dropLng : null,
    "INTERNAL"
  );

  // Auto assign rider
  try {
    await autoAssignRider(delivery.id);
  } catch (err) {
    console.warn("[autoAssignRider] Failed to auto assign rider:", err.message);
  }

  return await prisma.delivery.findUnique({
    where: { id: delivery.id },
    include: { rider: { include: { user: true } }, order: { include: { user: true } } },
  });
};

// Assign rider ให้ delivery
export const assignRider = async (deliveryId, riderId) => {
  const [delivery] = await prisma.$transaction([
    prisma.delivery.update({
      where: { id: deliveryId },
      data: { riderId, status: "ASSIGNED", assignedAt: new Date() },
      include: { rider: { include: { user: true } }, order: true },
    }),
    prisma.rider.update({
      where: { id: riderId },
      data: { status: "BUSY" },
    }),
  ]);
  await addTrackingEvent(deliveryId, "ASSIGNED", null, null, "Rider รับงานแล้ว");
  return delivery;
};

// Auto-assign rider ที่ใกล้ที่สุด
export const autoAssignRider = async (deliveryId) => {
  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
  });
  if (!delivery) throw new AppError("Delivery not found", 404);

  const { restaurantLat, restaurantLng } = getActiveSettings();
  const rider = await findNearestRider(
    delivery.pickupLat || restaurantLat,
    delivery.pickupLng || restaurantLng
  );
  if (!rider) return null; // ไม่มี rider ว่าง — fallback ภายนอก

  return assignRider(deliveryId, rider.id);
};

// อัปเดตสถานะ delivery
export const updateDeliveryStatus = async (deliveryId, status, lat, lng, note, proofImageUrl) => {
  const data = { status };
  if (status === "PICKED_UP") data.pickedUpAt = new Date();
  if (status === "DELIVERED") data.deliveredAt = new Date();
  if (proofImageUrl) data.proofImageUrl = proofImageUrl;

  const delivery = await prisma.delivery.update({
    where: { id: deliveryId },
    data,
    include: { rider: true, order: { include: { user: true } } },
  });

  await addTrackingEvent(deliveryId, status, lat, lng, note);

  // ไรเดอร์รับอาหารแล้ว → order เป็น DELIVERING (หน้าแคชเชียร์จะแสดงปุ่มสีเทา)
  if (["PICKED_UP", "ON_THE_WAY", "ARRIVED"].includes(status)) {
    await prisma.order.updateMany({
      where: { id: delivery.orderId, status: { notIn: ["DELIVERING", "DELIVERED", "CANCELLED"] } },
      data: { status: "DELIVERING" },
    });
  }

  // ถ้าส่งแล้ว → คืน rider เป็น AVAILABLE (ถ้ามี) + อัป order status + คำนวณแต้มสะสมให้ลูกค้า
  if (status === "DELIVERED") {
    const ops = [prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } })];
    if (delivery.riderId) {
      ops.push(prisma.rider.update({ where: { id: delivery.riderId }, data: { status: "AVAILABLE", totalDeliveries: { increment: 1 } } }));
    }
    const activeSettings = getActiveSettings();
    if (activeSettings.pointsEnabled !== false && delivery.order?.userId) {
      const earnRate = activeSettings.pointsEarnRate || 10;
      const pts = Math.floor(parseFloat(delivery.order.total) / earnRate);
      if (pts > 0) {
        ops.push(prisma.user.update({
          where: { id: delivery.order.userId },
          data: { points: { increment: pts } },
        }));
      }
    }
    await prisma.$transaction(ops);
  }

  if (status === "FAILED" || status === "CANCELLED") {
    if (delivery.riderId) {
      await prisma.rider.update({ where: { id: delivery.riderId }, data: { status: "AVAILABLE" } });
    }
  }

  return delivery;
};

export const addTrackingEvent = (deliveryId, status, lat, lng, note) =>
  prisma.trackingEvent.create({ data: { deliveryId, status, lat, lng, note } });

export const updateRiderLocation = (riderId, lat, lng) =>
  prisma.rider.update({ where: { id: riderId }, data: { lat, lng } });
