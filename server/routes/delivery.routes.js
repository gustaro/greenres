import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { isAdmin, isStaffOrAdmin, isRiderOrAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";
import {
  // Admin/Staff
  getDeliveries, getDeliveryById, getDeliveryByOrder,
  createDeliveryForOrder, assignRiderToDelivery, autoAssign,
  dispatchToExternal, updateStatus, cancelDelivery,
  getAvailableRiders, getAllRiders, verifyRider,
  // Webhooks
  grabWebhook, lalamoveWebhook,
  // Rider
  getMyRiderProfile, updateMyStatus, updateMyLocation,
  getMyDeliveries, riderUpdateStatus, uploadProof, registerAsRider, updateRiderProfile,
} from "../controllers/delivery.controller.js";

const router = Router();

// ── Webhooks (no auth) ───────────────────────────────────────
router.post("/webhooks/grab",      grabWebhook);
router.post("/webhooks/lalamove",  lalamoveWebhook);

// ── Rider self-service ───────────────────────────────────────
router.post("/rider/register",                   authenticate, registerAsRider);
router.get ("/rider/me",                         authenticate, isRiderOrAdmin, getMyRiderProfile);
router.put ("/rider/me/profile",                 authenticate, isRiderOrAdmin, updateRiderProfile);
router.put ("/rider/me/status",                  authenticate, isRiderOrAdmin, updateMyStatus);
router.put ("/rider/me/location",                authenticate, isRiderOrAdmin, updateMyLocation);
router.get ("/rider/me/deliveries",              authenticate, isRiderOrAdmin, getMyDeliveries);
router.put ("/rider/deliveries/:id/status",      authenticate, isRiderOrAdmin, riderUpdateStatus);
router.post("/rider/deliveries/:id/proof",       authenticate, isRiderOrAdmin, upload.single("proof"), uploadProof);
router.post("/rider/deliveries/:id/payment-proof", authenticate, isRiderOrAdmin, upload.single("proof"), uploadProof);

// ── Customer ─────────────────────────────────────────────────
router.get("/order/:orderId", authenticate, getDeliveryByOrder);

// ── Admin / Staff ─────────────────────────────────────────────
router.get ("/riders/available",   authenticate, isStaffOrAdmin, getAvailableRiders);
router.get ("/riders",             authenticate, isAdmin,        getAllRiders);
router.put ("/riders/:id/verify",  authenticate, isAdmin,        verifyRider);

router.get   ("/",          authenticate, isStaffOrAdmin, getDeliveries);
router.post  ("/",          authenticate, isStaffOrAdmin, createDeliveryForOrder);
router.get   ("/:id",       authenticate, isStaffOrAdmin, getDeliveryById);
router.put   ("/:id/status",authenticate, isStaffOrAdmin, updateStatus);
router.post  ("/:id/proof", authenticate, isStaffOrAdmin, upload.single("proof"), uploadProof);
router.post  ("/:id/payment-proof", authenticate, isStaffOrAdmin, upload.single("proof"), uploadProof);
router.post  ("/:id/assign",authenticate, isStaffOrAdmin, assignRiderToDelivery);
router.post  ("/:id/auto",  authenticate, isStaffOrAdmin, autoAssign);
router.post  ("/:id/external", authenticate, isStaffOrAdmin, dispatchToExternal);
router.delete("/:id",       authenticate, isStaffOrAdmin, cancelDelivery);

export default router;
