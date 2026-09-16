import { Router } from "express";
import { createPaymentIntent, handleWebhook, refundPayment } from "../controllers/payment.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import express from "express";

const router = Router();

// Stripe webhook — raw body required, no auth
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// Authenticated routes
router.post("/create-intent", authenticate, createPaymentIntent);
router.post("/refund/:orderId", authenticate, isAdmin, refundPayment);

export default router;
