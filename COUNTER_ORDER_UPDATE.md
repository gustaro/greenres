# Counter order update

เพิ่มความสามารถหน้า Cashier > รับออเดอร์

- กรอกชื่อลูกค้าได้ (ไม่บังคับ)
- ออเดอร์ทานที่ร้านต้องกรอกเบอร์โต๊ะ
- ชื่อลูกค้าและเบอร์โต๊ะถูกเก็บใน order notes metadata เดิม จึงไม่ต้อง migrate database
- เบอร์โต๊ะแสดงบนการ์ด Cashier, การ์ด Kitchen, ประวัติ Cashier และใบเสร็จ
- หน้า Cashier แยกเมนูตาม Categories ที่ตั้งใน Admin และเรียงตาม sortOrder
- ช่องค้นหา Cashier ค้นหาด้วยชื่อลูกค้าและเบอร์โต๊ะได้
- CSV ยอดขายเพิ่มคอลัมน์โต๊ะ

ไฟล์ที่แก้:
- src/lib/database.js
- src/components/CashierDashboard.jsx
- src/components/KitchenDashboard.jsx
- src/components/RoleDashboards.css

หมายเหตุ: source ฝั่ง server ไม่ได้แก้ไขสำหรับ feature นี้
