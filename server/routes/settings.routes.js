import express from "express";
import {
    getSiteSettings,
    updateLogo,
    updateSiteSettings,
    getHeroSlides,
    createHeroSlide,
    updateHeroSlide,
    deleteHeroSlide,
    submitContactMessage,
    getContactMessages,
    testStripeConnection,
    testCloudinaryConnection
} from "../controllers/settings.controller.js";
import { authenticate } from "../middleware/auth.js";
import { isAdmin } from "../middleware/role.js";
import { upload } from "../middleware/upload.js";

const router = express.Router();

router.get("/", getSiteSettings);
router.post("/logo", authenticate, isAdmin, upload.single("image"), updateLogo);
router.put("/", authenticate, isAdmin, updateSiteSettings);
router.post("/stripe/test-connection", authenticate, isAdmin, testStripeConnection);
router.post("/cloudinary/test-connection", authenticate, isAdmin, testCloudinaryConnection);

// Contact Messages
router.post("/contact", submitContactMessage);
router.get("/contact", authenticate, isAdmin, getContactMessages);

// Hero Slides
router.get("/hero", getHeroSlides);
router.post("/hero", authenticate, isAdmin, upload.single("image"), createHeroSlide);
router.put("/hero/:id", authenticate, isAdmin, upload.single("image"), updateHeroSlide);
router.delete("/hero/:id", authenticate, isAdmin, deleteHeroSlide);

export default router;
