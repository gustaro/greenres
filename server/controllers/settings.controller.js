import fs from "fs";
import path from "path";
import os from "os";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";

const configDir = path.resolve(process.cwd(), "data");
const configPath = path.join(configDir, "settings.json");
const tmpSettingsPath = path.join(os.tmpdir(), "limeleaf_settings.json");
const tmpMessagesPath = path.join(os.tmpdir(), "limeleaf_contact_messages.json");

// In-memory cache for ultra-fast access and serverless resiliency
let inMemorySettings = null;
let isTableInitialized = false;

const ensureSettingsTable = async () => {
    if (isTableInitialized) return;
    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS system_settings (
                key VARCHAR(100) PRIMARY KEY,
                value JSONB NOT NULL,
                updated_at TIMESTAMP DEFAULT NOW()
            );
        `);
        isTableInitialized = true;
    } catch (err) {
        console.warn("[Settings] system_settings table check:", err?.message || err);
    }
};

const loadSettingsFromDb = async () => {
    try {
        await ensureSettingsTable();
        const rows = await prisma.$queryRawUnsafe(`
            SELECT value FROM system_settings WHERE key = 'site_settings' LIMIT 1;
        `);
        if (Array.isArray(rows) && rows.length > 0 && rows[0]?.value) {
            return rows[0].value;
        }
    } catch (err) {
        console.warn("[Settings] Could not query settings from database:", err?.message || err);
    }
    return null;
};

const saveSettingsToDb = async (settings) => {
    try {
        await ensureSettingsTable();
        await prisma.$executeRawUnsafe(`
            INSERT INTO system_settings (key, value, updated_at)
            VALUES ('site_settings', $1::jsonb, NOW())
            ON CONFLICT (key) DO UPDATE
            SET value = EXCLUDED.value, updated_at = NOW();
        `, JSON.stringify(settings));
    } catch (err) {
        console.warn("[Settings] Could not persist settings to database:", err?.message || err);
    }
};

const getLocalFileSettings = () => {
    try {
        if (fs.existsSync(configPath)) {
            return JSON.parse(fs.readFileSync(configPath, "utf8"));
        }
    } catch {}
    try {
        if (fs.existsSync(tmpSettingsPath)) {
            return JSON.parse(fs.readFileSync(tmpSettingsPath, "utf8"));
        }
    } catch {}
    return { logoUrl: null };
};

const saveSettingsToFile = (settings) => {
    // Attempt local configDir write (works in local dev)
    try {
        if (!fs.existsSync(configDir)) fs.mkdirSync(configDir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(settings, null, 2));
        return;
    } catch (err) {
        // Read-only filesystem (e.g. Vercel /var/task)
    }

    // Fallback to /tmp (writable in serverless)
    try {
        fs.writeFileSync(tmpSettingsPath, JSON.stringify(settings, null, 2));
    } catch {}
};

// Asynchronously bootstrap cache on module load
loadSettingsFromDb().then(dbSettings => {
    if (dbSettings) {
        inMemorySettings = dbSettings;
    } else {
        inMemorySettings = getLocalFileSettings();
    }
}).catch(() => {
    inMemorySettings = getLocalFileSettings();
});

const getSettings = () => {
    return inMemorySettings || getLocalFileSettings();
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

export const getSiteSettings = async (req, res) => {
    try {
        if (!inMemorySettings) {
            const dbSettings = await loadSettingsFromDb();
            if (dbSettings) inMemorySettings = dbSettings;
        }
        res.set("Cache-Control", "public, max-age=10, s-maxage=30, stale-while-revalidate=60");
        res.json(getActiveSettings());
    } catch (err) {
        console.warn("[Settings] getSiteSettings fallback:", err?.message || err);
        res.json(getActiveSettings());
    }
};

export const updateSiteSettings = async (req, res) => {
    try {
        const payload = req.body || {};
        if (!inMemorySettings) {
            const dbSettings = await loadSettingsFromDb();
            inMemorySettings = dbSettings || getLocalFileSettings();
        }
        const settings = { ...(inMemorySettings || {}) };

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

        inMemorySettings = settings;

        // Persist safely in both DB and local/tmp file
        await saveSettingsToDb(settings);
        saveSettingsToFile(settings);

        res.json(getActiveSettings());
    } catch (err) {
        console.error("[Settings] updateSiteSettings error:", err);
        res.json(getActiveSettings());
    }
};

export const updateLogo = async (req, res, next) => {
    try {
        const logoUrl = req.file ? req.file.path : null;
        if (!logoUrl) return res.status(400).json({ message: "No file uploaded" });

        if (!inMemorySettings) {
            const dbSettings = await loadSettingsFromDb();
            inMemorySettings = dbSettings || getLocalFileSettings();
        }
        const settings = { ...(inMemorySettings || {}) };
        settings.logoUrl = logoUrl;
        inMemorySettings = settings;

        await saveSettingsToDb(settings);
        saveSettingsToFile(settings);

        res.json({ logoUrl });
    } catch (err) {
        next(err);
    }
};

const saveSettings = async (settings) => {
    inMemorySettings = settings;
    await saveSettingsToDb(settings);
    saveSettingsToFile(settings);
};

export const getHeroSlides = (req, res, next) => {
    try {
        const settings = getSettings();
        res.set("Cache-Control", "public, max-age=30, s-maxage=60, stale-while-revalidate=120");
        res.json(Array.isArray(settings.heroSlides) ? settings.heroSlides : []);
    } catch (err) { next(err); }
};

export const createHeroSlide = async (req, res, next) => {
    try {
        const settings = { ...getSettings() };
        if (!Array.isArray(settings.heroSlides)) settings.heroSlides = [];
        const { eyebrow = '', title, description = '', buttonLabel = 'สั่งเลย', buttonLink = '/order', imageUrl = '/assets/hero-food.png', backgroundColor = '#b8ff35', sortOrder } = req.body;
        if (!title) return res.status(400).json({ message: 'title is required' });
        const id = `hero-${Date.now()}`;
        const slide = { id, eyebrow, title, description, buttonLabel, buttonLink, imageUrl, backgroundColor, sortOrder: sortOrder !== undefined ? Number(sortOrder) : settings.heroSlides.length + 1, isActive: true };
        settings.heroSlides.push(slide);
        settings.heroSlides.sort((a, b) => a.sortOrder - b.sortOrder);
        await saveSettings(settings);
        res.status(201).json(slide);
    } catch (err) { next(err); }
};

export const updateHeroSlide = async (req, res, next) => {
    try {
        const settings = { ...getSettings() };
        if (!Array.isArray(settings.heroSlides)) return res.status(404).json({ message: 'not found' });
        const idx = settings.heroSlides.findIndex(s => s.id === req.params.id);
        if (idx === -1) return res.status(404).json({ message: 'slide not found' });
        settings.heroSlides[idx] = { ...settings.heroSlides[idx], ...req.body, id: req.params.id };
        settings.heroSlides.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
        await saveSettings(settings);
        res.json(settings.heroSlides[idx]);
    } catch (err) { next(err); }
};

export const deleteHeroSlide = async (req, res, next) => {
    try {
        const settings = { ...getSettings() };
        if (!Array.isArray(settings.heroSlides)) return res.status(404).json({ message: 'not found' });
        settings.heroSlides = settings.heroSlides.filter(s => s.id !== req.params.id);
        await saveSettings(settings);
        res.json({ ok: true });
    } catch (err) { next(err); }
};

let inMemoryMessages = null;

export const submitContactMessage = async (req, res, next) => {
    try {
        const { name, contact, subject, message } = req.body || {};
        if (!name || !contact || !message) {
            return res.status(400).json({ message: "กรุณากรอกข้อมูลให้ครบถ้วน" });
        }

        let messages = inMemoryMessages || [];
        if (messages.length === 0) {
            try {
                if (fs.existsSync(tmpMessagesPath)) {
                    messages = JSON.parse(fs.readFileSync(tmpMessagesPath, "utf8"));
                }
            } catch {}
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
        inMemoryMessages = messages;

        // Try writing to tmp
        try {
            fs.writeFileSync(tmpMessagesPath, JSON.stringify(messages, null, 2));
        } catch {}

        res.status(201).json({ success: true, message: "บันทึกข้อความเรียบร้อยแล้ว", data: newMessage });
    } catch (err) {
        next(err);
    }
};

export const getContactMessages = (req, res, next) => {
    try {
        let messages = inMemoryMessages || [];
        if (messages.length === 0) {
            try {
                if (fs.existsSync(tmpMessagesPath)) {
                    messages = JSON.parse(fs.readFileSync(tmpMessagesPath, "utf8"));
                }
            } catch {}
        }
        res.json(messages);
    } catch (err) {
        next(err);
    }
};

export const testStripeConnection = async (req, res) => {
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
