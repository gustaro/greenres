# Frontend Realtime sync patch

ปรับเฉพาะ Frontend ให้ Cashier / Kitchen / Delivery ใช้ Supabase Realtime เป็นช่องทาง sync หลัก โดยไม่แก้ Server source

- Cashier/Admin รับ event จาก `orders`, `order_items`, `deliveries`, `tracking_events` แล้ว refetch ผ่าน Server API ทันที
- Kitchen รับ event จาก `orders`, `order_items` แล้วโหลด Kitchen queue ใหม่ทันที
- Delivery รับ event จาก `deliveries`, `tracking_events`, `orders` แล้วโหลดงานใหม่ทันที
- ยังคง optimistic UI หลังผู้ใช้กดเปลี่ยนสถานะ
- ยังคง local event + localStorage sync สำหรับแท็บใน browser/origin เดียวกัน
- มี polling สำรองทุก 30 วินาที เผื่อ WebSocket หลุดหรือถูก network block
- ป้องกัน request ซ้อนด้วย single-flight request ที่มีอยู่เดิม
- ย้าย frontend delivery setup ไปที่ `MainApp` เพื่อให้ Cashier/Admin ยังจัดเตรียม Delivery ได้แม้เปลี่ยนไปหน้า staff อื่น
- รองรับกรณี Cashier/Admin หลายเครื่องตอบสนองต่อ READY พร้อมกัน โดย reuse Delivery เมื่อ Server ตอบ 409

## Supabase

ดู `REALTIME_SETUP.md` และรัน `supabase/realtime.sql` เพื่อเพิ่มตารางต่อไปนี้เข้า publication `supabase_realtime`:

- `orders`
- `order_items`
- `deliveries`
- `tracking_events`

ข้อจำกัดของ Server ปัจจุบัน: การสร้าง Delivery ยังเป็น frontend compatibility logic สำหรับ role Cashier/Admin เพราะ Server ยังไม่ได้สร้าง Delivery อัตโนมัติจาก Kitchen READY ภายใน transaction/event ของ Server เอง
