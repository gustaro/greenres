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
