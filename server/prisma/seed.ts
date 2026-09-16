import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Users ──────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: "admin@restaurant.com" }, update: {},
    create: { email: "admin@restaurant.com", password: await bcrypt.hash("Admin@123", 12), name: "Admin User", role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { email: "kitchen@restaurant.com" }, update: {},
    create: { email: "kitchen@restaurant.com", password: await bcrypt.hash("Kitchen@123", 12), name: "Kitchen Staff", role: "KITCHEN" },
  });

  const riderUser = await prisma.user.upsert({
    where: { email: "rider@restaurant.com" }, update: {},
    create: { email: "rider@restaurant.com", password: await bcrypt.hash("Rider@123", 12), name: "สมชาย Rider", phone: "081-234-5678", role: "RIDER" },
  });

  // ── Rider profile ──────────────────────────────────────────
  await prisma.rider.upsert({
    where: { userId: riderUser.id }, update: {},
    create: { userId: riderUser.id, vehicleType: "motorcycle", licensePlate: "กข 1234", isVerified: true, rating: 4.9 },
  });

  // ── Categories ─────────────────────────────────────────────
  const cats = await Promise.all([
    prisma.category.upsert({ where: { slug: "salads" },   update: {}, create: { name: "สลัด",       slug: "salads",   sortOrder: 1 } }),
    prisma.category.upsert({ where: { slug: "mains" },    update: {}, create: { name: "อาหารหลัก",  slug: "mains",    sortOrder: 2 } }),
    prisma.category.upsert({ where: { slug: "drinks" },   update: {}, create: { name: "เครื่องดื่ม", slug: "drinks",   sortOrder: 3 } }),
    prisma.category.upsert({ where: { slug: "desserts" }, update: {}, create: { name: "ของหวาน",    slug: "desserts", sortOrder: 4 } }),
  ]);

  // ── Products ───────────────────────────────────────────────
  const products = await Promise.all([
    prisma.product.upsert({ where: { slug: "garden-bowl" }, update: {}, create: {
      categoryId: cats[0].id, name: "Garden Bowl", slug: "garden-bowl",
      description: "ผักสดจากไร่ น้ำสลัดงาอ่อน วิตามินสูง", price: 189, isFeatured: true, prepTime: 8, stock: 50 } }),
    prisma.product.upsert({ where: { slug: "green-taco" }, update: {}, create: {
      categoryId: cats[1].id, name: "Green Taco", slug: "green-taco",
      description: "ผักย่าง อโวคาโด ซอสสมุนไพรออร์แกนิก", price: 219, isFeatured: true, prepTime: 12, stock: 40 } }),
    prisma.product.upsert({ where: { slug: "roots-curry" }, update: {}, create: {
      categoryId: cats[1].id, name: "Roots Curry", slug: "roots-curry",
      description: "แกงรากผัก กะทิออร์แกนิก ข้าวกล้อง", price: 249, prepTime: 15, stock: 30 } }),
    prisma.product.upsert({ where: { slug: "green-press" }, update: {}, create: {
      categoryId: cats[2].id, name: "Green Press", slug: "green-press",
      description: "น้ำผักผลไม้คั้นสด ไม่ใส่น้ำตาล", price: 149, prepTime: 3, stock: 80 } }),
    prisma.product.upsert({ where: { slug: "matcha-cake" }, update: {}, create: {
      categoryId: cats[3].id, name: "Matcha Cake", slug: "matcha-cake",
      description: "เค้กมัทฉะออร์แกนิก ไม่ใส่สารกันบูด", price: 179, prepTime: 5, stock: 20 } }),
  ]);

  // ── Inventory ──────────────────────────────────────────────
  for (const p of products) {
    await prisma.inventory.upsert({
      where: { productId: p.id }, update: {},
      create: { productId: p.id, quantity: p.stock, lowThreshold: 10 },
    });
  }

  // ── Coupons ────────────────────────────────────────────────
  await prisma.coupon.upsert({ where: { code: "WELCOME10" }, update: {}, create: {
    code: "WELCOME10", description: "ลด 10% สำหรับออเดอร์แรก",
    discountType: "PERCENT", discountValue: 10, minOrderAmount: 200, maxDiscount: 100, usageLimit: 200 } });

  await prisma.coupon.upsert({ where: { code: "GREEN50" }, update: {}, create: {
    code: "GREEN50", description: "ลด ฿50 เมื่อสั่งครบ ฿500",
    discountType: "FIXED", discountValue: 50, minOrderAmount: 500, usageLimit: 50 } });

  console.log("\n✅ Seed complete!");
  console.log("   Admin:   admin@restaurant.com   / Admin@123");
  console.log("   Kitchen: kitchen@restaurant.com / Kitchen@123");
  console.log("   Rider:   rider@restaurant.com   / Rider@123");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
