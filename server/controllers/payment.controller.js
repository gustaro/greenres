import Stripe from "stripe";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";
import { getActiveSettings } from "./settings.controller.js";

export const getStripe = () => {
  const settings = getActiveSettings();
  const isLive = settings.stripeMode === "live";
  const secretKey = isLive
    ? (settings.stripeLiveSecretKey || "")
    : (settings.stripeTestSecretKey || env.STRIPE_SECRET_KEY);
  return new Stripe(secretKey);
};

export const createPaymentIntent = async (req, res, next) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ message: "orderId is required" });

    const order = await prisma.order.findFirst({
      where: { id: orderId, userId: req.user.id },
    });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (order.paymentStatus === "PAID") {
      return res.status(400).json({ message: "Order is already paid" });
    }

    const settings = getActiveSettings();
    const stripe = getStripe();
    const captureMethod = settings.stripeCaptureMethod === "manual" ? "manual" : "automatic";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.total) * 100), // satang
      currency: "thb",
      payment_method_types: ["card"],
      capture_method: captureMethod,
      metadata: {
        orderId: order.id,
        userId: req.user.id,
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripePaymentId: paymentIntent.id },
    });

    res.json({ clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id });
  } catch (error) {
    next(error);
  }
};

// Create a PromptPay PaymentIntent and confirm it to obtain genuine QR code
export const createPromptPayIntent = async (req, res, next) => {
  try {
    const { amount, orderId, email, name } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || isNaN(numAmount) || numAmount <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const settings = getActiveSettings();
    const isLive = settings.stripeMode === "live";
    const secretKey = isLive
      ? (settings.stripeLiveSecretKey || "")
      : (settings.stripeTestSecretKey || env.STRIPE_SECRET_KEY);

    if (!secretKey) {
      return res.status(400).json({ message: "Stripe Secret Key is not configured" });
    }

    const stripe = getStripe();
    const customerEmail = email || req.user?.email || "customer@limeleaf.com";
    const customerName = name || req.user?.name || "LimeLeaf Customer";

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(numAmount * 100), // satang
      currency: "thb",
      payment_method_types: ["promptpay"],
      metadata: {
        orderId: orderId || "",
        userId: req.user?.id || "",
        customerEmail,
        customerName,
      },
    });

    const confirmed = await stripe.paymentIntents.confirm(paymentIntent.id, {
      payment_method_data: {
        type: "promptpay",
        billing_details: {
          email: customerEmail,
          name: customerName,
        },
      },
    });

    const qrDetails = confirmed.next_action?.promptpay_display_qr_code || {};

    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId },
        data: { stripePaymentId: confirmed.id },
      });
    }

    res.json({
      clientSecret: confirmed.client_secret,
      paymentIntentId: confirmed.id,
      amount: numAmount,
      currency: "thb",
      status: confirmed.status,
      qrImageUrl: qrDetails.image_url_png || qrDetails.image_url_svg || null,
      hostedInstructionsUrl: qrDetails.hosted_instructions_url || null,
      stripeTestUrl: qrDetails.data || null,
    });
  } catch (error) {
    next(error);
  }
};

// Simulate / Authorize test PromptPay payment into Stripe Sandbox
export const simulatePromptPaySuccess = async (req, res, next) => {
  try {
    const { paymentIntentId, orderId } = req.body;
    if (!paymentIntentId) {
      return res.status(400).json({ message: "paymentIntentId is required" });
    }

    const stripe = getStripe();
    let pi = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (pi.status !== "succeeded") {
      const testUrl = pi.next_action?.promptpay_display_qr_code?.data;
      if (testUrl) {
        try {
          const pageRes = await fetch(testUrl);
          const pageHtml = await pageRes.text();
          const match = pageHtml.match(/data-message="([^"]+)"/);
          if (match && match[1]) {
            const decodedJson = Buffer.from(match[1], "base64").toString("utf-8");
            const payload = JSON.parse(decodedJson);
            if (payload.notify_url_success) {
              await fetch(payload.notify_url_success, { method: "GET" });
            }
          }
        } catch (simErr) {
          console.warn("[simulatePromptPaySuccess] Hook trigger notice:", simErr.message);
        }
      }

      // Poll until succeeded or max 6 attempts
      for (let i = 0; i < 6; i++) {
        await new Promise(r => setTimeout(r, 700));
        pi = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (pi.status === "succeeded") break;
      }
    }

    // Update order in database if orderId is provided
    if (orderId) {
      await prisma.order.updateMany({
        where: { id: orderId },
        data: {
          paymentStatus: "PAID",
          status: "CONFIRMED",
          paymentMethod: "STRIPE",
          stripePaymentId: paymentIntentId,
        },
      });
    }

    res.json({
      success: pi.status === "succeeded",
      status: pi.status,
      paymentIntentId: pi.id,
      amount: (pi.amount_received || pi.amount) / 100,
      currency: pi.currency,
    });
  } catch (error) {
    next(error);
  }
};

// Stripe webhook — must use raw body parser
export const handleWebhook = async (req, res, next) => {
  const sig = req.headers["stripe-signature"];
  const stripe = getStripe();
  const settings = getActiveSettings();
  const webhookSecret = settings.stripeMode === "live"
    ? (settings.stripeLiveWebhookSecret || env.STRIPE_WEBHOOK_SECRET)
    : (settings.stripeTestWebhookSecret || env.STRIPE_WEBHOOK_SECRET);

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ message: `Webhook error: ${err.message}` });
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const pi = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentId: pi.id },
          data: { paymentStatus: "PAID", status: "CONFIRMED" },
        });
        break;
      }
      case "payment_intent.amount_capturable_updated": {
        const pi = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentId: pi.id },
          data: { paymentStatus: "AUTHORIZED", status: "PENDING" },
        });
        break;
      }
      case "payment_intent.payment_failed": {
        const pi = event.data.object;
        await prisma.order.updateMany({
          where: { stripePaymentId: pi.id },
          data: { paymentStatus: "FAILED" },
        });
        break;
      }
      case "charge.refunded": {
        const charge = event.data.object;
        if (charge.payment_intent) {
          await prisma.order.updateMany({
            where: { stripePaymentId: charge.payment_intent },
            data: { paymentStatus: "REFUNDED" },
          });
        }
        break;
      }
      default:
        break;
    }

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
};

export const refundPayment = async (req, res, next) => {
  try {
    const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
    if (!order) return res.status(404).json({ message: "Order not found" });
    if (!order.stripePaymentId) {
      return res.status(400).json({ message: "No payment to refund" });
    }

    const stripe = getStripe();
    const pi = await stripe.paymentIntents.retrieve(order.stripePaymentId).catch(() => null);

    // If payment was authorized / held (uncaptured), release the hold immediately
    if (pi && pi.status === "requires_capture") {
      const canceled = await stripe.paymentIntents.cancel(order.stripePaymentId);
      await prisma.order.update({
        where: { id: order.id },
        data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
      });
      return res.json({ message: "ยกเลิกการกันวงเงิน (Release Hold) เรียบร้อยแล้ว", refundId: canceled.id });
    }

    if (order.paymentStatus !== "PAID") {
      return res.status(400).json({ message: "Order is not paid" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentId,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { paymentStatus: "REFUNDED", status: "CANCELLED" },
    });

    res.json({ message: "Refund processed", refundId: refund.id });
  } catch (error) {
    next(error);
  }
};
