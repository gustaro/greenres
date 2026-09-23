import { Router } from "express";
import {
  createPaymentIntent,
  createPromptPayIntent,
  simulatePromptPaySuccess,
  handleWebhook,
  refundPayment,
} from "../controllers/payment.controller.js";
import { authenticate, optionalAuthenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import express from "express";

const router = Router();

// Stripe webhook — raw body required, no auth
router.post("/webhook", express.raw({ type: "application/json" }), handleWebhook);

// PromptPay QR routes
router.post("/promptpay/create-intent", optionalAuthenticate, createPromptPayIntent);
router.post("/promptpay/simulate-success", optionalAuthenticate, simulatePromptPaySuccess);

// Authenticated routes
router.post("/create-intent", authenticate, createPaymentIntent);
router.post("/refund/:orderId", authenticate, isAdmin, refundPayment);

export default router;
