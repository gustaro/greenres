import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { getActiveSettings } from "../controllers/settings.controller.js";

export const getCloudinary = () => {
  try {
    const settings = getActiveSettings();
    cloudinary.config({
      cloud_name: settings.cloudinaryCloudName || env.CLOUDINARY_CLOUD_NAME,
      api_key: settings.cloudinaryApiKey || env.CLOUDINARY_API_KEY,
      api_secret: settings.cloudinaryApiSecret || env.CLOUDINARY_API_SECRET,
    });
  } catch {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
    });
  }
  return cloudinary;
};

// Initial config
getCloudinary();

/**
 * Extract Cloudinary public_id from a full URL.
 * e.g. "https://res.cloudinary.com/.../restaurant/abc123.webp" → "restaurant/abc123"
 */
export const extractPublicId = (url) => {
  if (!url) return null;
  try {
    const parts = url.split("/");
    const file = parts[parts.length - 1].split(".")[0];
    const folder = parts[parts.length - 2];
    return `${folder}/${file}`;
  } catch {
    return null;
  }
};

export const deleteCloudinaryImage = async (url) => {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    const c = getCloudinary();
    await c.uploader.destroy(publicId);
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
};

export const uploadBuffer = (buffer, options = {}) => {
  const c = getCloudinary();
  return new Promise((resolve, reject) => {
    const stream = c.uploader.upload_stream(
      { folder: "restaurant", ...options },
      (error, result) => (error ? reject(error) : resolve(result))
    );
    stream.end(buffer);
  });
};
