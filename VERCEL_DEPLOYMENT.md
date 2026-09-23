# คู่มือการ Deploy LimeLeaf Full-Stack Serverless บน Vercel

เอกสารนี้อธิบายสถาปัตยกรรมและการนำโปรเจกต์ LimeLeaf Kitchen ขึ้นระบบคลาวด์บน **Vercel** ในรูปแบบ **Serverless Full-Stack** ที่รันทั้งหน้าบ้าน (Frontend) และหลังบ้าน (Backend API) ภายใต้โดเมนเดียวกัน

---

## 1. ภาพรวมสถาปัตยกรรม (Architecture)

```
[ผู้ใช้งาน / Browser]
         │
         ▼
[Vercel Edge Network / Routing] ─── vercel.json
   ├── /api/* หรือ /health  ───►  Vercel Serverless Function (api/index.js)
   │                                     │
   │                                     ▼
   │                              Express App (server/app.js)
   │                                     │
   │                                     ▼
   │                              Prisma ORM ──► PostgreSQL (Supabase Pooler: 6543)
   │
   └── /* (เส้นทางหน้าเว็บ) ────►  Vite React SPA (dist/index.html)
```

- **Frontend:** พัฒนาด้วย React + Vite ถูก build เก็บไว้ที่ `dist/` และเสิร์ฟผ่าน CDN ระดับโลกของ Vercel
- **Backend:** Express API ถูกรันผ่าน [api/index.js](file:///c:/limeleaf-mcd-style-v3/api/index.js) ในรูปแบบ Serverless Function แบบ On-demand (จ่าย/คำนวณตามการเรียกใช้งานจริง)
- **Same-Origin:** ทั้งเว็บและ API ทำงานภายใต้โดเมนเดียวกัน จึงไม่มีปัญหาเรื่อง CORS หรือ Third-party cookie blocking

---

## 2. การตั้งค่า Environment Variables บน Vercel Dashboard

เมื่อคุณ Import โปรเจกต์ใน Vercel ให้ไปที่ **Settings > Environment Variables** และกรอกตัวแปรทั้งหมดดังนี้:

### 🔹 ฝั่ง Backend & Database (Serverless Functions)

| ตัวแปร | ความสำคัญ | ตัวอย่างค่า / คำอธิบาย |
| :--- | :--- | :--- |
| `DATABASE_URL` | **สำคัญมาก** | Connection String PostgreSQL แบบ **Transaction Pooler** (Supabase พอร์ต `6543`) เช่น `postgres://postgres.[ref]:[pwd]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true` |
| `DIRECT_URL` | เสริม | Connection String แบบต่อตรง (พอร์ต 5432) สำหรับงาน migration |
| `JWT_ACCESS_SECRET` | **สำคัญ** | คีย์ลับสุ่มยาวๆ สำหรับสร้าง Access Token |
| `JWT_REFRESH_SECRET` | **สำคัญ** | คีย์ลับสุ่มยาวๆ สำหรับสร้าง Refresh Token |
| `JWT_ACCESS_EXPIRES` | ตัวเลือก | `15m` (ค่าเริ่มต้น 15 นาที) |
| `JWT_REFRESH_EXPIRES` | ตัวเลือก | `7d` (ค่าเริ่มต้น 7 วัน) |
| `CLOUDINARY_CLOUD_NAME` | **สำคัญ** | Cloud name จาก Cloudinary |
| `CLOUDINARY_API_KEY` | **สำคัญ** | API Key จาก Cloudinary |
| `CLOUDINARY_API_SECRET` | **สำคัญ** | API Secret จาก Cloudinary |
| `STRIPE_SECRET_KEY` | **สำคัญ** | `sk_test_...` จาก Stripe Dashboard |
| `STRIPE_WEBHOOK_SECRET` | **สำคัญ** | `whsec_...` จาก Stripe Dashboard |
| `CLIENT_URL` | **สำคัญ** | โดเมนของ Vercel เช่น `https://limeleaf.vercel.app` (ใส่เพื่อความปลอดภัยของ CORS) |

### 🔹 ฝั่ง Frontend (Vite Build)

| ตัวแปร | ตัวอย่างค่า / คำอธิบาย |
| :--- | :--- |
| `VITE_API_URL` | ใส่ `/api` หรือเว้นว่างไว้ (เพื่อให้เรียก API ผ่าน Same-Origin) |
| `VITE_SUPABASE_URL` | URL ของ Supabase เช่น `https://xxxx.supabase.co` สำหรับ Realtime |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key (Public) สำหรับ Realtime ออเดอร์ |

> [!WARNING]
> **เรื่อง Database Connection สำหรับ Serverless:**
> ห้ามใช้ `DATABASE_URL` ที่เป็นพอร์ต `5432` แบบต่อตรง (Direct Connection) บน Vercel เพราะ Serverless Instance ที่เพิ่มขึ้นมาพร้อมกันจะทำให้ Connection ของฐานข้อมูลเต็มทันที ต้องใช้ **Connection Pooling (พอร์ต 6543)** ของ Supabase เสมอ

---

## 3. ขั้นตอนการ Deploy (Step-by-Step)

### วิธีที่ 1: Deploy ผ่าน GitHub (แนะนำที่สุด)

1. **Commit และ Push โค้ดทั้งหมดขึ้น GitHub:**
   ```bash
   git add .
   git commit -m "Configure Vercel Serverless Full-Stack"
   git push origin main
   ```
2. **เข้าสู่ Vercel Dashboard:**
   - ไปที่ [vercel.com](https://vercel.com) แล้วล็อกอิน
   - คลิกปุ่ม **"Add New..."** -> **"Project"**
   - เลือก GitHub Repository ของคุณ แล้วกด **"Import"**
3. **ตรวจสอบการตั้งค่าโปรเจกต์ (Project Settings):**
   - **Framework Preset:** `Vite` (Vercel จะตรวจจับให้อัตโนมัติ)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (สคริปต์นี้จะรัน `prisma generate` และ `vite build`)
   - **Output Directory:** `dist`
4. **ใส่ Environment Variables:**
   - คัดลอกตัวแปรจากตารางในข้อ 2 ใส่ลงในช่อง **Environment Variables**
5. **กดปุ่ม "Deploy":**
   - รอ Vercel ทำการ build ประมาณ 1-2 นาที เมื่อเสร็จสิ้นจะได้ URL เช่น `https://your-project.vercel.app`

---

### วิธีที่ 2: Deploy ผ่าน Vercel CLI (จากเครื่องโดยตรง)

1. ติดตั้งหรือเรียกใช้ Vercel CLI:
   ```bash
   npx vercel
   ```
2. ทำตามขั้นตอนบน Terminal:
   - Set up and deploy? `y`
   - Which scope? (เลือก Account ของคุณ)
   - Link to existing project? `n` (ถ้าเป็นโปรเจกต์ใหม่)
   - What's your project's name? `limeleaf-kitchen`
   - In which directory is your code located? `./`
3. ไปใส่ Environment Variables บน Vercel Dashboard ตามข้อ 2
4. Deploy สำหรับ Production:
   ```bash
   npx vercel --prod
   ```

---

## 4. การตรวจสอบและทดสอบระบบหลัง Deploy

เมื่อ Deploy สำเร็จ ให้ทดสอบตามลำดับดังนี้:

1. **ทดสอบ Health Check:**
   - เข้า URL: `https://your-domain.vercel.app/health`
   - ต้องได้ผลลัพธ์เป็น JSON: `{"status":"ok","env":"production",...}`
2. **ทดสอบ API สินค้า:**
   - เข้า URL: `https://your-domain.vercel.app/api/products`
   - ต้องได้รับรายการสินค้าในรูปแบบ JSON
3. **ทดสอบหน้าบ้าน (Frontend):**
   - เปิดหน้าแรก `https://your-domain.vercel.app/`
   - ทดสอบกดสั่งอาหาร, เข้าหน้า `/cashier`, `/kitchen`, `/admin`
   - ทดสอบฟังก์ชันดาวน์โหลด CSV และ PDF ทั้งหน้าแคชเชียร์และแอดมิน
