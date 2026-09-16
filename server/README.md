# 🌿 Green Roots — Backend API

Node.js + Express + Prisma + Supabase · Port 5002

## เริ่มใช้งาน

```bash
cp .env.example .env       # ใส่ค่าจริงทุกตัว
npm install
npm run db:generate        # generate Prisma Client
npm run db:push            # sync schema → Supabase
npm run db:seed            # ข้อมูลตั้งต้น
npm run dev                # → http://localhost:5002
```

## Default Users (หลัง seed)

| Role    | Email                        | Password     |
|---------|------------------------------|--------------|
| ADMIN   | admin@restaurant.com         | Admin@123    |
| KITCHEN | kitchen@restaurant.com       | Kitchen@123  |
| RIDER   | rider@restaurant.com         | Rider@123    |

## โครงสร้าง

```
backend/
├── prisma/
│   ├── schema.prisma     ← 13 models + RIDER role + Delivery models
│   └── seed.ts           ← users, categories, products, coupons
├── src/
│   ├── app.js            ← Express + 12 route groups
│   ├── server.js         ← start + graceful shutdown
│   ├── config/
│   │   ├── env.js        ← validate + export env vars
│   │   └── prisma.js     ← Prisma singleton
│   ├── middleware/
│   │   ├── auth.js       ← JWT Bearer → req.user
│   │   ├── role.js       ← requireRole, isAdmin, isRiderOrAdmin…
│   │   ├── upload.js     ← multer + Cloudinary auto-upload
│   │   └── errorHandler.js
│   ├── controllers/      ← 12 controllers (รวม delivery)
│   ├── routes/           ← 12 routes (รวม delivery)
│   ├── services/         ← auth, order, cloudinary, stripe, email,
│   │                        delivery, externalDelivery
│   └── utils/            ← asyncHandler, response, validation, date, format
└── .env.example
```

## API Endpoints

### `/api/auth`
| Method | Path | Description |
|--------|------|-------------|
| POST | /register | สมัครสมาชิก |
| POST | /login | login → accessToken + refreshToken |
| POST | /refresh | ต่ออายุ token |
| POST | /logout | ออกจากระบบ |
| GET  | /me | ข้อมูล user ปัจจุบัน |

### `/api/products`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | / | — | รายการสินค้า + filter/search/sort/page |
| GET  | /:slug | — | รายละเอียด |
| POST | / | Admin | สร้าง + upload รูป |
| PUT  | /:id | Admin | แก้ไข |
| DELETE | /:id | Admin | ลบ + ลบรูป Cloudinary |

### `/api/orders`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | / | ✓ | สร้างออเดอร์ (transaction: หักสต็อก + clear cart) |
| GET  | / | ✓ | รายการออเดอร์ |
| GET  | /:id | ✓ | รายละเอียด |
| PUT  | /:id/status | Staff+ | อัปเดตสถานะ |
| PUT  | /:id/cancel | ✓ | ยกเลิก + คืนสต็อก |

### `/api/delivery`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET  | /order/:orderId | ✓ | customer track งาน |
| GET  | / | Staff+ | รายการทั้งหมด |
| POST | / | Staff+ | สร้าง + auto-assign rider |
| PUT  | /:id/status | Staff+ | อัปเดตสถานะ (manual) |
| POST | /:id/assign | Staff+ | manual assign rider |
| POST | /:id/auto | Staff+ | auto-assign rider ใกล้สุด |
| POST | /:id/external | Staff+ | dispatch → Grab / Lalamove |
| DELETE | /:id | Staff+ | ยกเลิก |
| GET  | /riders/available | Staff+ | rider ว่าง เรียงตามระยะ |
| GET  | /riders | Admin | rider ทั้งหมด |
| PUT  | /riders/:id/verify | Admin | verify rider |
| POST | /rider/register | ✓ | สมัคร rider |
| GET  | /rider/me | Rider | profile + งานปัจจุบัน |
| PUT  | /rider/me/status | Rider | online / offline |
| PUT  | /rider/me/location | Rider | อัปเดต GPS ทุก 30 วิ |
| GET  | /rider/me/deliveries | Rider | ประวัติงาน |
| PUT  | /rider/deliveries/:id/status | Rider | PICKED_UP→ON_THE_WAY→ARRIVED→DELIVERED |
| POST | /rider/deliveries/:id/proof | Rider | อัปโหลดรูปหลักฐาน |
| POST | /webhooks/grab | — | Grab callback |
| POST | /webhooks/lalamove | — | Lalamove callback |

### `/api/payments`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | /create-intent | ✓ | สร้าง Stripe PaymentIntent |
| POST | /webhook | — | Stripe event (raw body) |
| POST | /refund/:orderId | Admin | คืนเงิน |

### `/api/kitchen`
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | /queue | Kitchen+ | คิวออเดอร์ที่รอทำ |
| GET | /stats | Kitchen+ | สถิติวันนี้ |
| PUT | /:id/prepare | Kitchen+ | เริ่มทำ (CONFIRMED→PREPARING) |
| PUT | /:id/ready | Kitchen+ | เสร็จ (PREPARING→READY) |

### `/api/dashboard` (Staff+)
`/overview` `/revenue?period=7d` `/top-products` `/order-status` `/recent-orders`

---

## DB Schema

```
User ─── Address
     ─── Cart ─── CartItem ─── Product ─── Category
     ─── Order ── OrderItem              ─── Inventory
     │        └── Coupon
     │        └── Delivery ─── TrackingEvent
     └── Rider ───┘
```

**Models (13):** User, Address, Category, Product, Inventory, Cart, CartItem, Coupon, Order, OrderItem, Rider, Delivery, TrackingEvent

**Roles:** CUSTOMER · KITCHEN · RIDER · STAFF · ADMIN

---

## Delivery Flow

```
Order READY → Staff กด "ส่ง"
  ↓
POST /api/delivery { orderId, dropAddress, provider: "INTERNAL" }
  ↓
Auto-assign: หา Rider ว่าง + ใกล้สุด (Haversine formula)
  ↓ ถ้าไม่มี Rider ว่าง
POST /api/delivery/:id/external { provider: "GRAB" | "LALAMOVE" }
  ↓
Rider อัปเดต: PICKED_UP → ON_THE_WAY → ARRIVED → DELIVERED
  ↓
Order.status → DELIVERED (auto)
  ↓
Customer tracks at /orders/:id/tracking (auto-refresh 15s)
```

---

## Stripe Webhook Setup (local dev)

```bash
stripe listen --forward-to localhost:5002/api/payments/webhook
# copy whsec_... → STRIPE_WEBHOOK_SECRET ใน .env
```

## Grab / Lalamove Webhook

ตั้ง webhook URL ใน dashboard ของแต่ละ provider:
- Grab: `https://yourdomain.com/api/delivery/webhooks/grab`
- Lalamove: `https://yourdomain.com/api/delivery/webhooks/lalamove`
