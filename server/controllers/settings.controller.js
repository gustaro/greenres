import fs from "fs";
import path from "path";
import { env } from "../config/env.js";

const configDir = path.resolve(process.cwd(), "data");
const configPath = path.join(configDir, "settings.json");

const getSettings = () => {
    try {
        if (!fs.existsSync(configPath)) {
            if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
            fs.writeFileSync(configPath, JSON.stringify({ logoUrl: null }));
        }
        return JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (err) {
        console.warn("Failed to load settings.json:", err);
        return { logoUrl: null };
    }
};

export const getActiveSettings = () => {
    const settings = getSettings();
    return {
        restaurantAddress: settings.restaurantAddress ?? env.RESTAURANT_ADDRESS,
        restaurantPhone: settings.restaurantPhone ?? env.RESTAURANT_PHONE,
        deliveryFee: settings.deliveryFee !== undefined ? parseFloat(settings.deliveryFee) : env.DELIVERY_FEE,
        freeDeliveryThreshold: settings.freeDeliveryThreshold !== undefined ? parseFloat(settings.freeDeliveryThreshold) : env.FREE_DELIVERY_THRESHOLD,
        restaurantLat: settings.restaurantLat !== undefined ? parseFloat(settings.restaurantLat) : env.RESTAURANT_LAT,
        restaurantLng: settings.restaurantLng !== undefined ? parseFloat(settings.restaurantLng) : env.RESTAURANT_LNG,
        stripeMode: settings.stripeMode || "test",
        stripeCaptureMethod: settings.stripeCaptureMethod || "automatic",
        stripeTestPublishableKey: settings.stripeTestPublishableKey || process.env.VITE_STRIPE_PUBLISHABLE_KEY || "",
        stripeTestSecretKey: settings.stripeTestSecretKey || env.STRIPE_SECRET_KEY || "",
        stripeLivePublishableKey: settings.stripeLivePublishableKey || "",
        stripeLiveSecretKey: settings.stripeLiveSecretKey || "",
        pointsEnabled: settings.pointsEnabled ?? true,
        pointsEarnRate: settings.pointsEarnRate !== undefined ? Math.max(1, parseFloat(settings.pointsEarnRate)) : 10,
        pointsRedeemRate: settings.pointsRedeemRate !== undefined ? Math.max(1, parseFloat(settings.pointsRedeemRate)) : 10,
        pointsMinRedeem: settings.pointsMinRedeem !== undefined ? Math.max(0, parseInt(settings.pointsMinRedeem)) : 10,
        pointsMaxDiscountPercent: settings.pointsMaxDiscountPercent !== undefined ? Math.min(100, Math.max(1, parseFloat(settings.pointsMaxDiscountPercent))) : 100,
        colorTheme: settings.colorTheme || "classic-lime",
        ...settings
    };
};

export const getSiteSettings = (req, res, next) => {
    try {
        res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
        res.json(getActiveSettings());
    } catch (err) {
        next(err);
    }
};

export const updateSiteSettings = (req, res, next) => {
    try {
        const payload = req.body;
        const settings = getSettings();

        // Merge allowed settings
        if (payload.colorTheme !== undefined) settings.colorTheme = payload.colorTheme;
        if (payload.mapProvider !== undefined) settings.mapProvider = payload.mapProvider;
        if (payload.googleMapsApiKey !== undefined) settings.googleMapsApiKey = payload.googleMapsApiKey;
        if (payload.siteName !== undefined) settings.siteName = payload.siteName;
        if (payload.restaurantAddress !== undefined) settings.restaurantAddress = payload.restaurantAddress;
        if (payload.restaurantPhone !== undefined) settings.restaurantPhone = payload.restaurantPhone;
        if (payload.deliveryFee !== undefined) settings.deliveryFee = payload.deliveryFee;
        if (payload.freeDeliveryThreshold !== undefined) settings.freeDeliveryThreshold = payload.freeDeliveryThreshold;
        if (payload.restaurantLat !== undefined) settings.restaurantLat = payload.restaurantLat;
        if (payload.restaurantLng !== undefined) settings.restaurantLng = payload.restaurantLng;
        if (payload.facebookUrl !== undefined) settings.facebookUrl = payload.facebookUrl;
        if (payload.instagramUrl !== undefined) settings.instagramUrl = payload.instagramUrl;
        if (payload.lineUrl !== undefined) settings.lineUrl = payload.lineUrl;
        if (payload.footerDescription !== undefined) settings.footerDescription = payload.footerDescription;
        if (payload.footerAbout !== undefined) settings.footerAbout = payload.footerAbout;
        if (payload.footerCopyright !== undefined) settings.footerCopyright = payload.footerCopyright;
        if (payload.footerLinks !== undefined) settings.footerLinks = payload.footerLinks;
        if (payload.storeHours !== undefined) settings.storeHours = payload.storeHours;
        if (payload.contactEmail !== undefined) settings.contactEmail = payload.contactEmail;
        if (payload.stripeMode !== undefined) settings.stripeMode = payload.stripeMode;
        if (payload.stripeCaptureMethod !== undefined) settings.stripeCaptureMethod = payload.stripeCaptureMethod;
        if (payload.stripeTestPublishableKey !== undefined) settings.stripeTestPublishableKey = payload.stripeTestPublishableKey;
        if (payload.stripeTestSecretKey !== undefined) settings.stripeTestSecretKey = payload.stripeTestSecretKey;
        if (payload.stripeLivePublishableKey !== undefined) settings.stripeLivePublishableKey = payload.stripeLivePublishableKey;
        if (payload.stripeLiveSecretKey !== undefined) settings.stripeLiveSecretKey = payload.stripeLiveSecretKey;
        if (payload.pointsEnabled !== undefined) settings.pointsEnabled = Boolean(payload.pointsEnabled);
        if (payload.pointsEarnRate !== undefined) settings.pointsEarnRate = Math.max(1, parseFloat(payload.pointsEarnRate));
        if (payload.pointsRedeemRate !== undefined) settings.pointsRedeemRate = Math.max(1, parseFloat(payload.pointsRedeemRate));
        if (payload.pointsMinRedeem !== undefined) settings.pointsMinRedeem = Math.max(0, parseInt(payload.pointsMinRedeem));
        if (payload.pointsMaxDiscountPercent !== undefined) settings.pointsMaxDiscountPercent = Math.min(100, Math.max(1, parseFloat(payload.pointsMaxDiscountPercent)));

        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));

        res.json(getActiveSettings());
    } catch (err) {
        next(err);
    }
};

export const updateLogo = (req, res, next) => {
    try {
        const logoUrl = req.file ? req.file.path : null;
        if (!logoUrl) return res.status(400).json({ message: "No file uploaded" });

        const settings = getSettings();
        settings.logoUrl = logoUrl;

        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));

        res.json({ logoUrl });
    } catch (err) {
        next(err);
    }
};

const saveSettings = (settings) => {
    if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
};

export const getHeroSlides = (req, res, next) => {
    try {
        const settings = getSettings();
        res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
        res.json(Array.isArray(settings.heroSlides) ? settings.heroSlides : []);
    } catch (err) { next(err); }
};

export const createHeroSlide = (req, res, next) => {
    try {
        const settings = getSettings();
        if (!Array.isArray(settings.heroSlides)) settings.heroSlides = [];
        const { eyebrow = '', title, description = '', buttonLabel = 'สั่งเลย', buttonLink = '/order', imageUrl = '/assets/hero-food.png', backgroundColor = '#b8ff35', sortOrder } = req.body;
        if (!title) return res.status(400).json({ message: 'title is required' });
        const id = `hero-${Date.now()}`;
        const slide = { id, eyebrow, title, description, buttonLabel, buttonLink, imageUrl, backgroundColor, sortOrder: sortOrder !== undefined ? Number(sortOrder) : settings.heroSlides.length + 1, isActive: true };
        settings.heroSlides.push(slide);
        settings.heroSlides.sort((a, b) => a.sortOrder - b.sortOrder);
        saveSettings(settings);
        res.status(201).json(slide);
    } catch (err) { next(err); }
};

export const updateHeroSlide = (req, res, next) => {
    try {
        const settings = getSettings();
        if (!Array.isArray(settings.heroSlides)) return res.status(404).json({ message: 'not found' });
        const idx = settings.heroSlides.findIndex(s => s.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'slide not found' });
        settings.heroSlides[idx] = { ...settings.heroSlides[idx], ...req.body, id: req.params.id };
        settings.heroSlides.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        saveSettings(settings);
        res.json(settings.heroSlides[idx]);
    } catch (err) { next(err); }
};

export const deleteHeroSlide = (req, res, next) => {
    try {
        const settings = getSettings();
        if (!Array.isArray(settings.heroSlides)) return res.status(404).json({ message: 'not found' });
        settings.heroSlides = settings.heroSlides.filter(s => s.id !== req.params.id);
        saveSettings(settings);
        res.json({ ok: true });
    } catch (err) { next(err); }
};

export const submitContactMessage = (req, res, next) => {
    try {
        const { name, contact, subject, message } = req.body || {};
        if (!name || !contact || !message) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }
        const messagesPath = path.join(configDir, "contact_messages.json");
        let messages = [];
        if (fs.existsSync(messagesPath)) {
            try {
                messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
            } catch {
                messages = [];
            }
        }
        const newMessage = {
            id: Date.now().toString(),
            name: String(name).trim(),
            contact: String(contact).trim(),
            subject: String(subject || "General").trim(),
            message: String(message).trim(),
            createdAt: new Date().toISOString()
        };
        messages.unshift(newMessage);
        if (messages.length > 200) messages = messages.slice(0, 200);
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(messagesPath, JSON.stringify(messages, null, 2));
        res.status(201).json({ success: true, message: "บันทึกข้อความเรียบร้อยแล้ว", data: newMessage });
    } catch (err) {
        next(err);
    }
};

export const getContactMessages = (req, res, next) => {
    try {
        const messagesPath = path.join(configDir, "contact_messages.json");
        let messages = [];
        if (fs.existsSync(messagesPath)) {
            try {
                messages = JSON.parse(fs.readFileSync(messagesPath, "utf8"));
            } catch {
                messages = [];
            }
        }
        res.json(messages);
    } catch (err) {
        next(err);
    }
};

export const testStripeConnection = async (req, res, next) => {
    try {
        const { mode, secretKey } = req.body || {};
        const settings = getActiveSettings();
        const targetMode = mode || settings.stripeMode || "test";

        let keyToTest = (secretKey || "").trim();
        if (!keyToTest) {
            keyToTest = targetMode === "live"
                ? (settings.stripeLiveSecretKey || "")
                : (settings.stripeTestSecretKey || env.STRIPE_SECRET_KEY);
        }

        if (!keyToTest) {
            return res.status(400).json({
                ok: false,
                message: `ไม่พบคีย์ Stripe Secret Key สำหรับโหมด ${targetMode === "live" ? "Live (รับเงินจริง)" : "Sandbox (ทดสอบ)"}`
            });
        }

        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(keyToTest);
        const account = await stripe.accounts.retrieve();

        res.json({
            ok: true,
            mode: targetMode,
            accountId: account.id,
            chargesEnabled: account.charges_enabled,
            detailsSubmitted: account.details_submitted,
            country: account.country || "TH",
            defaultCurrency: account.default_currency || "thb",
            businessName: account.business_profile?.name || account.settings?.dashboard?.display_name || account.id,
            message: `เชื่อมต่อกับ Stripe ${targetMode === "live" ? "Live Mode" : "Sandbox Mode"} สำเร็จ (${account.id})`
        });
    } catch (err) {
        res.status(400).json({
            ok: false,
            message: `เกิดข้อผิดพลาดในการเชื่อมต่อ Stripe: ${err.message}`
        });
    }
};
