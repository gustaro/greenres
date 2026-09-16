/**
 * External Delivery Service
 * รองรับ Grab Express และ Lalamove
 * ใช้ mock/sandbox API — swap URL + token จาก .env ได้ทันที
 */
import axios from "axios";
import { prisma } from "../config/prisma.js";
import { addTrackingEvent } from "./delivery.service.js";

// ============ GRAB EXPRESS ============
const grab = axios.create({
  baseURL: process.env.GRAB_API_URL || "https://partner-api.grab.com/grabexpress/v1",
  headers: { Authorization: `Bearer ${process.env.GRAB_CLIENT_SECRET}` },
  timeout: 10000,
});

export const createGrabDelivery = async (delivery) => {
  try {
    const { data } = await grab.post("/deliveries", {
      serviceType: "INSTANT",
      packages: [{ name: "Food Order", quantity: 1, dimensions: { height: 10, width: 20, depth: 20, weight: 1 } }],
      origin: {
        address: delivery.pickupAddress,
        coordinates: { latitude: delivery.pickupLat, longitude: delivery.pickupLng },
      },
      destination: {
        address: delivery.dropAddress,
        coordinates: { latitude: delivery.dropLat, longitude: delivery.dropLng },
      },
      cashOnDelivery: { amount: 0 },
    });

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { provider: "GRAB", externalRef: data.deliveryID, status: "ASSIGNED" },
    });

    await addTrackingEvent(delivery.id, "ASSIGNED", null, null, `Grab Express รับงาน (${data.deliveryID})`);
    return data;
  } catch (err) {
    console.error("Grab API error:", err.response?.data || err.message);
    throw new Error("Grab delivery creation failed");
  }
};

export const getGrabDeliveryStatus = async (externalRef) => {
  const { data } = await grab.get(`/deliveries/${externalRef}`);
  return data;
};

export const cancelGrabDelivery = async (externalRef) => {
  await grab.delete(`/deliveries/${externalRef}`);
};

// ============ LALAMOVE ============
const lalamove = axios.create({
  baseURL: process.env.LALAMOVE_API_URL || "https://rest.lalamove.com",
  headers: {
    Authorization: `hmac ${process.env.LALAMOVE_API_KEY}`,
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

export const createLalamoveDelivery = async (delivery) => {
  try {
    // Step 1: get quotation
    const { data: quote } = await lalamove.post("/v3/quotations", {
      serviceType: "MOTORCYCLE",
      stops: [
        { coordinates: { lat: String(delivery.pickupLat), lng: String(delivery.pickupLng) }, address: delivery.pickupAddress },
        { coordinates: { lat: String(delivery.dropLat), lng: String(delivery.dropLng) }, address: delivery.dropAddress },
      ],
      item: { quantity: "1", weight: "LESS_THAN_3KG", categories: ["FOOD_DELIVERY"] },
      language: "th_TH",
    });

    // Step 2: place order
    const { data: order } = await lalamove.post("/v3/orders", {
      quotationId: quote.quotationId,
      sender: { stopId: quote.stops[0].stopId, name: "Restaurant", phone: process.env.RESTAURANT_PHONE || "+66800000000" },
      recipients: [{ stopId: quote.stops[1].stopId, name: delivery.order?.user?.name || "Customer", phone: delivery.order?.user?.phone || "+66800000000" }],
    });

    await prisma.delivery.update({
      where: { id: delivery.id },
      data: { provider: "LALAMOVE", externalRef: order.orderId, status: "ASSIGNED" },
    });

    await addTrackingEvent(delivery.id, "ASSIGNED", null, null, `Lalamove รับงาน (${order.orderId})`);
    return order;
  } catch (err) {
    console.error("Lalamove API error:", err.response?.data || err.message);
    throw new Error("Lalamove delivery creation failed");
  }
};

export const getLalamoveStatus = async (externalRef) => {
  const { data } = await lalamove.get(`/v3/orders/${externalRef}`);
  return data;
};

export const cancelLalamoveDelivery = async (externalRef) => {
  await lalamove.delete(`/v3/orders/${externalRef}`);
};

// ============ WEBHOOK HANDLER (Grab & Lalamove callbacks) ============
const GRAB_TO_DELIVERY_STATUS = {
  PENDING: "PENDING", ALLOCATING: "ASSIGNED", PICKING_UP: "PICKED_UP",
  IN_DELIVERY: "ON_THE_WAY", COMPLETED: "DELIVERED", CANCELED: "CANCELLED", FAILED: "FAILED",
};
const LALAMOVE_TO_DELIVERY_STATUS = {
  ASSIGNING_DRIVER: "ASSIGNED", ON_GOING: "PICKED_UP", PICKED_UP: "ON_THE_WAY",
  COMPLETE: "DELIVERED", CANCELED: "CANCELLED", REJECTED: "FAILED",
};

export const handleExternalWebhook = async (provider, payload) => {
  let externalRef, rawStatus, driverLat, driverLng;

  if (provider === "grab") {
    externalRef = payload.deliveryID;
    rawStatus = payload.status;
    driverLat = payload.driver?.coordinates?.latitude;
    driverLng = payload.driver?.coordinates?.longitude;
  } else if (provider === "lalamove") {
    externalRef = payload.orderId;
    rawStatus = payload.status;
    driverLat = payload.driverCoordinates?.lat;
    driverLng = payload.driverCoordinates?.lng;
  }

  const delivery = await prisma.delivery.findFirst({ where: { externalRef } });
  if (!delivery) return;

  const statusMap = provider === "grab" ? GRAB_TO_DELIVERY_STATUS : LALAMOVE_TO_DELIVERY_STATUS;
  const newStatus = statusMap[rawStatus];
  if (!newStatus) return;

  await prisma.delivery.update({ where: { id: delivery.id }, data: { status: newStatus } });
  await addTrackingEvent(delivery.id, newStatus, driverLat ? parseFloat(driverLat) : null, driverLng ? parseFloat(driverLng) : null, `${provider} update: ${rawStatus}`);

  if (newStatus === "DELIVERED") {
    await prisma.order.update({ where: { id: delivery.orderId }, data: { status: "DELIVERED" } });
  }
};
