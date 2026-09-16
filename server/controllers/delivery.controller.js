import { prisma } from "../config/prisma.js";
import {
  createDelivery, autoAssignRider, assignRider,
  updateDeliveryStatus, updateRiderLocation, findNearestRider,
} from "../services/delivery.service.js";
import {
  createGrabDelivery, createLalamoveDelivery,
  getGrabDeliveryStatus, getLalamoveStatus,
  cancelGrabDelivery, cancelLalamoveDelivery,
  handleExternalWebhook,
} from "../services/externalDelivery.service.js";
import { deleteImage } from "../middleware/upload.js";

// ─── ADMIN / STAFF ──────────────────────────────────────────

// GET /deliveries — ดูรายการจัดส่งทั้งหมด
export const getDeliveries = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, provider, riderId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const where = {};
    if (status) where.status = status;
    if (provider) where.provider = provider;
    if (riderId) where.riderId = riderId;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          order: { include: { user: { select: { name: true, phone: true } } } },
          rider: { include: { user: { select: { name: true, phone: true } } } },
          trackingEvents: { orderBy: { createdAt: "asc" }, take: 1 },
        },
      }),
      prisma.delivery.count({ where }),
    ]);
    res.json({ deliveries, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
  } catch (err) { next(err); }
};

// GET /deliveries/:id — รายละเอียด + tracking events
export const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: {
        order: { include: { user: true, items: { include: { product: true } } } },
        rider: { include: { user: { select: { name: true, phone: true } } } },
        trackingEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });
    res.json(delivery);
  } catch (err) { next(err); }
};

// GET /deliveries/order/:orderId — tracking ตาม order
export const getDeliveryByOrder = async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({
      where: { orderId: req.params.orderId },
      include: {
        rider: { include: { user: { select: { name: true, phone: true } } } },
        trackingEvents: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!delivery) return res.status(404).json({ message: "No delivery found for this order" });
    res.json(delivery);
  } catch (err) { next(err); }
};

// POST /deliveries — สร้าง delivery จาก order
export const createDeliveryForOrder = async (req, res, next) => {
  try {
    const { orderId, dropAddress, dropLat, dropLng, provider = "INTERNAL" } = req.body;
    if (!orderId || !dropAddress) {
      return res.status(400).json({ message: "orderId and dropAddress required" });
    }
    const existing = await prisma.delivery.findUnique({ where: { orderId } });
    if (existing) return res.status(409).json({ message: "Delivery already exists for this order" });

    const delivery = await createDelivery(orderId, dropAddress, dropLat, dropLng, provider);

    // Auto-assign: ลอง internal rider ก่อน
    let result = delivery;
    if (provider === "INTERNAL") {
      result = (await autoAssignRider(delivery.id)) || delivery;
    }

    // Fallback ไป external ถ้าไม่มี rider
    if (result.status === "PENDING" && (provider === "GRAB" || provider === "LALAMOVE")) {
      const fullDelivery = await prisma.delivery.findUnique({
        where: { id: delivery.id },
        include: { order: { include: { user: true } } },
      });
      if (provider === "GRAB") await createGrabDelivery(fullDelivery);
      else await createLalamoveDelivery(fullDelivery);
      result = await prisma.delivery.findUnique({ where: { id: delivery.id } });
    }

    res.status(201).json(result);
  } catch (err) { next(err); }
};

// POST /deliveries/:id/assign — manual assign rider
export const assignRiderToDelivery = async (req, res, next) => {
  try {
    const { riderId } = req.body;
    if (!riderId) return res.status(400).json({ message: "riderId required" });
    const delivery = await assignRider(req.params.id, riderId);
    res.json(delivery);
  } catch (err) { next(err); }
};

// POST /deliveries/:id/auto-assign
export const autoAssign = async (req, res, next) => {
  try {
    const result = await autoAssignRider(req.params.id);
    if (!result) return res.status(404).json({ message: "ไม่มี rider ว่างขณะนี้" });
    res.json(result);
  } catch (err) { next(err); }
};

// POST /deliveries/:id/external — ส่งงานไป Grab/Lalamove
export const dispatchToExternal = async (req, res, next) => {
  try {
    const { provider } = req.body;
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: { order: { include: { user: true } } },
    });
    if (!delivery) return res.status(404).json({ message: "Delivery not found" });

    let result;
    if (provider === "GRAB") result = await createGrabDelivery(delivery);
    else if (provider === "LALAMOVE") result = await createLalamoveDelivery(delivery);
    else return res.status(400).json({ message: "Invalid provider. Use GRAB or LALAMOVE" });

    res.json({ message: `ส่งงานไป ${provider} แล้ว`, externalData: result });
  } catch (err) { next(err); }
};

// PUT /deliveries/:id/status — admin อัปเดตสถานะ
export const updateStatus = async (req, res, next) => {
  try {
    const { status, lat, lng, note } = req.body;
    const delivery = await updateDeliveryStatus(req.params.id, status, lat, lng, note);
    res.json(delivery);
  } catch (err) { next(err); }
};

// GET /deliveries/external/:id/sync — sync status จาก Grab/Lalamove
export const syncExternalStatus = async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!delivery?.externalRef) return res.status(400).json({ message: "No external reference" });

    let externalData;
    if (delivery.provider === "GRAB") externalData = await getGrabDeliveryStatus(delivery.externalRef);
    else if (delivery.provider === "LALAMOVE") externalData = await getLalamoveStatus(delivery.externalRef);

    res.json(externalData);
  } catch (err) { next(err); }
};

// DELETE /deliveries/:id/cancel
export const cancelDelivery = async (req, res, next) => {
  try {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!delivery) return res.status(404).json({ message: "Not found" });

    if (delivery.externalRef) {
      try {
        if (delivery.provider === "GRAB") await cancelGrabDelivery(delivery.externalRef);
        else if (delivery.provider === "LALAMOVE") await cancelLalamoveDelivery(delivery.externalRef);
      } catch (e) { console.error("Cancel external failed:", e.message); }
    }

    await updateDeliveryStatus(delivery.id, "CANCELLED", null, null, req.body.reason || "ยกเลิกโดย admin");
    res.json({ message: "Delivery cancelled" });
  } catch (err) { next(err); }
};

// GET /deliveries/riders/available
export const getAvailableRiders = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    const riders = await prisma.rider.findMany({
      where: { status: "AVAILABLE", isVerified: true },
      include: { user: { select: { name: true, phone: true } } },
    });
    if (lat && lng) {
      const { calcDistance } = await import("../services/delivery.service.js");
      return res.json(
        riders
          .map(r => ({ ...r, distance: r.lat && r.lng ? calcDistance(parseFloat(lat), parseFloat(lng), r.lat, r.lng) : null }))
          .sort((a, b) => (a.distance ?? 999) - (b.distance ?? 999))
      );
    }
    res.json(riders);
  } catch (err) { next(err); }
};

// ─── WEBHOOKS ─────────────────────────────────────────────────

export const grabWebhook = async (req, res, next) => {
  try {
    await handleExternalWebhook("grab", req.body);
    res.json({ received: true });
  } catch (err) { next(err); }
};

export const lalamoveWebhook = async (req, res, next) => {
  try {
    await handleExternalWebhook("lalamove", req.body);
    res.json({ received: true });
  } catch (err) { next(err); }
};

// ─── RIDER ────────────────────────────────────────────────────

// GET /riders/me — ดูข้อมูล rider ของตัวเอง
export const getMyRiderProfile = async (req, res, next) => {
  try {
    const rider = await prisma.rider.findUnique({
      where: { userId: req.user.id },
      include: {
        deliveries: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } },
          include: { order: { include: { user: { select: { name: true, phone: true } } } } },
          take: 1,
        },
      },
    });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });
    res.json(rider);
  } catch (err) { next(err); }
};

// PUT /riders/me/status
export const updateMyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["AVAILABLE", "OFFLINE"].includes(status)) {
      return res.status(400).json({ message: "Status must be AVAILABLE or OFFLINE" });
    }
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });
    const updated = await prisma.rider.update({ where: { id: rider.id }, data: { status } });
    res.json(updated);
  } catch (err) { next(err); }
};

// PUT /riders/me/location
export const updateMyLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (!lat || !lng) return res.status(400).json({ message: "lat and lng required" });
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (!rider) return res.status(404).json({ message: "Rider not found" });
    await updateRiderLocation(rider.id, parseFloat(lat), parseFloat(lng));
    res.json({ message: "Location updated" });
  } catch (err) { next(err); }
};

// GET /riders/me/deliveries — งานของ rider
export const getMyDeliveries = async (req, res, next) => {
  try {
    const { status } = req.query;
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (!rider) return res.status(404).json({ message: "Rider not found" });

    const where = { riderId: rider.id };
    if (status) where.status = status;

    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        order: { include: { user: { select: { name: true, phone: true } }, items: { include: { product: { select: { name: true } } } } } },
        trackingEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json(deliveries);
  } catch (err) { next(err); }
};

// PUT /riders/deliveries/:id/status — rider อัปเดตสถานะ
export const riderUpdateStatus = async (req, res, next) => {
  try {
    const { status, lat, lng, note } = req.body;
    const allowed = ["PICKED_UP", "ON_THE_WAY", "ARRIVED", "DELIVERED", "FAILED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}` });
    }
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    const delivery = await prisma.delivery.findFirst({
      where: { id: req.params.id, riderId: rider?.id },
    });
    if (!delivery) return res.status(404).json({ message: "Delivery not found or not yours" });

    const updated = await updateDeliveryStatus(delivery.id, status, lat, lng, note);
    res.json(updated);
  } catch (err) { next(err); }
};

// POST /riders/deliveries/:id/proof — อัปโหลดหลักฐานการส่ง
export const uploadProof = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No image uploaded" });
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (delivery?.proofImageUrl) await deleteImage(delivery.proofImageUrl);
    const updated = await prisma.delivery.update({
      where: { id: req.params.id },
      data: { proofImageUrl: req.file.path },
    });
    res.json({ proofImageUrl: updated.proofImageUrl });
  } catch (err) { next(err); }
};

// ─── RIDER MANAGEMENT (ADMIN) ────────────────────────────────

export const getAllRiders = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status) where.status = status;
    const riders = await prisma.rider.findMany({
      where,
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(riders);
  } catch (err) { next(err); }
};

export const verifyRider = async (req, res, next) => {
  try {
    const rider = await prisma.rider.update({
      where: { id: req.params.id },
      data: { isVerified: req.body.isVerified ?? true },
    });
    res.json(rider);
  } catch (err) { next(err); }
};

export const registerAsRider = async (req, res, next) => {
  try {
    const { vehicleType, licensePlate } = req.body;
    const existing = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (existing) return res.status(409).json({ message: "Already registered as rider" });
    const rider = await prisma.rider.create({
      data: { userId: req.user.id, vehicleType: vehicleType || "motorcycle", licensePlate },
    });
    res.status(201).json(rider);
  } catch (err) { next(err); }
};
