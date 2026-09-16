import Stripe from "stripe";
import { prisma } from "../config/prisma.js";
import { env } from "../config/env.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

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

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(parseFloat(order.total) * 100), // cents
      currency: "usd",
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

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, env.STRIPE_WEBHOOK_SECRET);
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
