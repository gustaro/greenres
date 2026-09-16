import "dotenv/config";
export const env = {
  PORT: process.env.PORT || 5002,
  NODE_ENV: process.env.NODE_ENV || "development",

  DATABASE_URL: process.env.DATABASE_URL,

  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
  JWT_ACCESS_EXPIRES: process.env.JWT_ACCESS_EXPIRES || "15m",
  JWT_REFRESH_EXPIRES: process.env.JWT_REFRESH_EXPIRES || "7d",

  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME || "ugwcfi0n",
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY || "348982582897793",
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET || "DKShqxv5sFzFh0j_ae-r3CL-IGk",

  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,

  CLIENT_URL: process.env.CLIENT_URL || "http://localhost:5173",

  // Delivery
  DELIVERY_FEE: parseFloat(process.env.DELIVERY_FEE || "35"),
  FREE_DELIVERY_THRESHOLD: parseFloat(process.env.FREE_DELIVERY_THRESHOLD || "300"),
  RESTAURANT_LAT: parseFloat(process.env.RESTAURANT_LAT || "13.7563"),
  RESTAURANT_LNG: parseFloat(process.env.RESTAURANT_LNG || "100.5018"),
  RESTAURANT_ADDRESS: process.env.RESTAURANT_ADDRESS || "123 Restaurant St, Bangkok",
  RESTAURANT_PHONE: process.env.RESTAURANT_PHONE || "+66800000000",

  // External delivery (optional — leave blank to skip)
  GRAB_API_URL: process.env.GRAB_API_URL || "https://partner-api.grab.com/grabexpress/v1",
  GRAB_CLIENT_SECRET: process.env.GRAB_CLIENT_SECRET || "",
  LALAMOVE_API_URL: process.env.LALAMOVE_API_URL || "https://rest.lalamove.com",
  LALAMOVE_API_KEY: process.env.LALAMOVE_API_KEY || "",
};

const required = [
  "DATABASE_URL",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required env: ${key}`);
}
