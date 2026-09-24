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
          order: {
            include: {
              user: { select: { name: true, phone: true } },
              address: true,
              items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
            },
          },
          rider: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
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
        rider: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
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
        rider: { include: { user: { select: { name: true, phone: true, avatarUrl: true } } } },
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
    let { orderId, dropAddress, dropLat, dropLng, provider = "INTERNAL" } = req.body;
    if (!orderId || !dropAddress) {
      return res.status(400).json({ message: "orderId and dropAddress required" });
    }
    const existing = await prisma.delivery.findUnique({ where: { orderId } });
    if (existing) return res.status(409).json({ message: "Delivery already exists for this order" });

    // Fallback: If dropLat / dropLng not provided in request body, retrieve from order notes or address
    if (dropLat == null || dropLng == null) {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { address: true },
      });
      if (order) {
        if (order.notes && order.notes.startsWith("LIMELEAF_META:")) {
          try {
            const meta = JSON.parse(order.notes.replace("LIMELEAF_META:", ""));
            if (meta.dropLat != null && meta.dropLng != null) {
              dropLat = Number(meta.dropLat);
              dropLng = Number(meta.dropLng);
            }
          } catch (_) {}
        }
        if ((dropLat == null || dropLng == null) && order.address?.street) {
          const match = order.address.street.match(/(?:<!--geo:([0-9.-]+),([0-9.-]+)-->|\[geo:([0-9.-]+),([0-9.-]+)\])/);
          if (match) {
            const lat = match[1] || match[3];
            const lng = match[2] || match[4];
            if (lat && lng) {
              dropLat = parseFloat(lat);
              dropLng = parseFloat(lng);
            }
          }
        }
      }
    }

    const cleanDropAddress = typeof dropAddress === 'string'
      ? dropAddress.replace(/<!--geo:[^>]+-->/g, '').replace(/\[geo:[^\]]+\]/g, '').trim()
      : dropAddress;

    const delivery = await createDelivery(
      orderId,
      cleanDropAddress || dropAddress,
      dropLat != null && !isNaN(Number(dropLat)) ? Number(dropLat) : null,
      dropLng != null && !isNaN(Number(dropLng)) ? Number(dropLng) : null,
      provider
    );

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
    const { status, lat, lng, note, proofImageUrl } = req.body;
    const delivery = await updateDeliveryStatus(req.params.id, status, lat, lng, note, proofImageUrl);
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
    let rider = await prisma.rider.findUnique({
      where: { userId: req.user.id },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
        deliveries: {
          where: { status: { in: ["ASSIGNED", "PICKED_UP", "ON_THE_WAY"] } },
          include: { order: { include: { user: { select: { name: true, phone: true } } } } },
          take: 1,
        },
      },
    });

    // Auto-create test rider profile for admin if testing
    if (!rider && req.user.role === "ADMIN") {
      rider = await prisma.rider.create({
        data: {
          userId: req.user.id,
          vehicleType: "motorcycle",
          licensePlate: "แอดมิน-9999",
          isVerified: true,
          status: "AVAILABLE",
        },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } },
          deliveries: true,
        },
      });
    }

    if (!rider) return res.status(404).json({ message: "Rider profile not found" });
    res.json(rider);
  } catch (err) { next(err); }
};

// PUT /riders/me/profile — อัปเดตข้อมูลส่วนตัวของ rider
export const updateRiderProfile = async (req, res, next) => {
  try {
    const { name, phone, vehicleType, licensePlate, emergencyContact, avatarUrl } = req.body;
    let rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (!rider && req.user.role === "ADMIN") {
      rider = await prisma.rider.create({
        data: {
          userId: req.user.id,
          vehicleType: vehicleType || "motorcycle",
          licensePlate: licensePlate || "แอดมิน-9999",
          isVerified: true,
          status: "AVAILABLE",
        },
      });
    }
    if (!rider) return res.status(404).json({ message: "Rider profile not found" });

    if (name || phone || avatarUrl !== undefined) {
      await prisma.user.update({
        where: { id: req.user.id },
        data: {
          ...(name && { name: name.trim() }),
          ...(phone && { phone: phone.trim() }),
          ...(avatarUrl !== undefined && { avatarUrl: avatarUrl ? avatarUrl.trim() : null }),
        },
      });
    }

    const updated = await prisma.rider.update({
      where: { id: rider.id },
      data: {
        ...(vehicleType && { vehicleType }),
        ...(licensePlate !== undefined && { licensePlate: licensePlate.trim() }),
      },
      include: { user: { select: { id: true, name: true, phone: true, email: true, avatarUrl: true } } },
    });

    res.json({ ...updated, emergencyContact, avatarUrl });
  } catch (err) { next(err); }
};

// PUT /riders/me/status
export const updateMyStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!["AVAILABLE", "OFFLINE"].includes(status)) {
      return res.status(400).json({ message: "Status must be AVAILABLE or OFFLINE" });
    }
    let rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    if (!rider && req.user.role === "ADMIN") {
      rider = await prisma.rider.create({
        data: {
          userId: req.user.id,
          vehicleType: "motorcycle",
          licensePlate: "แอดมิน-9999",
          isVerified: true,
          status: "AVAILABLE",
        },
      });
    }
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
    
    // If admin testing without a dedicated rider row, return all deliveries
    const where = rider && req.user.role !== "ADMIN" ? { riderId: rider.id } : {};
    if (status) where.status = status;

    const deliveries = await prisma.delivery.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 40,
      include: {
        order: {
          include: {
            user: { select: { name: true, phone: true } },
            address: true,
            items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
          },
        },
        trackingEvents: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    });
    res.json(deliveries);
  } catch (err) { next(err); }
};

// PUT /riders/deliveries/:id/status — rider อัปเดตสถานะ
export const riderUpdateStatus = async (req, res, next) => {
  try {
    const { status, lat, lng, note, proofImageUrl } = req.body;
    const allowed = ["PICKED_UP", "ON_THE_WAY", "ARRIVED", "DELIVERED", "FAILED"];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: `Status must be one of: ${allowed.join(", ")}` });
    }
    const rider = await prisma.rider.findUnique({ where: { userId: req.user.id } });
    const where = req.user.role === "ADMIN" ? { id: req.params.id } : { id: req.params.id, riderId: rider?.id };
    const delivery = await prisma.delivery.findFirst({ where });
    if (!delivery) return res.status(404).json({ message: "Delivery not found or not yours" });

    const updated = await updateDeliveryStatus(delivery.id, status, lat, lng, note, proofImageUrl);
    res.json(updated);
  } catch (err) { next(err); }
};

// POST /riders/deliveries/:id/proof — อัปโหลดหลักฐานการส่งมอบหรือสลิปการชำระเงิน
export const uploadProof = async (req, res, next) => {
  try {
    const imagePath = req.file ? req.file.path : req.body.proofUrl || req.body.imageUrl;
    if (!imagePath) return res.status(400).json({ message: "No image uploaded" });

    let delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: { order: true },
    });
    if (!delivery) {
      delivery = await prisma.delivery.findUnique({
        where: { orderId: req.params.id },
        include: { order: true },
      });
    }

    const type = req.body.type || req.query.type || 'delivery';
    if (type === 'payment') {
      const orderId = delivery?.orderId || req.params.id;
      const order = delivery?.order || (orderId ? await prisma.order.findUnique({ where: { id: orderId } }) : null);
      if (order) {
        let updatedNotes = order.notes || "";
        const match = updatedNotes.match(/LIMELEAF_META:(\{.*\})/);
        if (match) {
          try {
            const meta = JSON.parse(match[1]);
            meta.paymentProofUrl = imagePath;
            updatedNotes = updatedNotes.replace(match[0], `LIMELEAF_META:${JSON.stringify(meta)}`);
          } catch {}
        } else {
          updatedNotes += ` LIMELEAF_META:{"paymentProofUrl":"${imagePath}"}`;
        }
        await prisma.order.update({
          where: { id: order.id },
          data: { notes: updatedNotes },
        });
      }
      return res.json({ success: true, type: 'payment', url: imagePath, paymentProofUrl: imagePath });
    }

    // Default: delivery proof image
    if (delivery?.proofImageUrl && !delivery.proofImageUrl.startsWith('data:')) {
      await deleteImage(delivery.proofImageUrl);
    }
    const targetDeliveryId = delivery ? delivery.id : req.params.id;
    const updated = await prisma.delivery.update({
      where: { id: targetDeliveryId },
      data: { proofImageUrl: imagePath },
    });

    // Also mirror to order notes for easy retrieval in orders view
    if (delivery?.orderId) {
      const order = delivery.order || await prisma.order.findUnique({ where: { id: delivery.orderId } });
      if (order) {
        let updatedNotes = order.notes || "";
        const match = updatedNotes.match(/LIMELEAF_META:(\{.*\})/);
        if (match) {
          try {
            const meta = JSON.parse(match[1]);
            meta.proofImageUrl = imagePath;
            updatedNotes = updatedNotes.replace(match[0], `LIMELEAF_META:${JSON.stringify(meta)}`);
            await prisma.order.update({ where: { id: order.id }, data: { notes: updatedNotes } });
          } catch {}
        }
      }
    }

    res.json({ success: true, type: 'delivery', url: updated.proofImageUrl, proofImageUrl: updated.proofImageUrl });
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
