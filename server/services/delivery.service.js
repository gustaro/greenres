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
  const searchLat = lat || restaurantLat;
  const searchLng = lng || restaurantLng;

  const riders = await prisma.rider.findMany({
    where: { status: "AVAILABLE", isVerified: true },
    include: { user: { select: { name: true, phone: true } } },
  });
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
  const { restaurantLat, restaurantLng, restaurantAddress } = getActiveSettings();

  const distanceKm = dropLat && dropLng
    ? calcDistance(restaurantLat, restaurantLng, dropLat, dropLng)
    : 5;

  const deliveryFee = calcDeliveryFee(distanceKm);
  const estimatedMinutes = estimateTime(distanceKm);

  const delivery = await prisma.delivery.create({
    data: {
      orderId,
      provider,
      status: "PENDING",
      pickupAddress: restaurantAddress,
      pickupLat: restaurantLat,
      pickupLng: restaurantLng,
      dropAddress,
      dropLat,
      dropLng,
      deliveryFee,
      estimatedMinutes,
    },
  });

  // บันทึก tracking event แรก
  await addTrackingEvent(delivery.id, "PENDING", null, null, "รอ Rider รับงาน");

  return delivery;
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
export const updateDeliveryStatus = async (deliveryId, status, lat, lng, note) => {
  const data = { status };
  if (status === "PICKED_UP") data.pickedUpAt = new Date();
  if (status === "DELIVERED") data.deliveredAt = new Date();

  const delivery = await prisma.delivery.update({
    where: { id: deliveryId },
    data,
    include: { rider: true, order: { include: { user: true } } },
  });

  await addTrackingEvent(deliveryId, status, lat, lng, note);

  // ถ้าส่งแล้ว → คืน rider เป็น AVAILABLE + อัป order status
  if (status === "DELIVERED") {
    await prisma.$transaction([
      prisma.rider.update({ where: { id: delivery.riderId }, data: { status: "AVAILABLE", totalDeliveries: { increment: 1 } } }),
      prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } }),
    ]);
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
