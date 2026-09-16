import Stripe from "stripe";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const stripe = new Stripe(env.STRIPE_SECRET_KEY);

export const createPaymentIntent = async ({ orderId, amount, currency = "usd", metadata = {} }) => {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // convert to cents
    currency,
    metadata: { orderId, ...metadata },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: { stripePaymentId: paymentIntent.id },
  });

  return paymentIntent;
};

export const constructWebhookEvent = (payload, sig) =>
  stripe.webhooks.constructEvent(payload, sig, env.STRIPE_WEBHOOK_SECRET);

export const createRefund = (paymentIntentId) =>
  stripe.refunds.create({ payment_intent: paymentIntentId });

export const retrievePaymentIntent = (id) => stripe.paymentIntents.retrieve(id);

export const getStripeInstance = () => stripe;
