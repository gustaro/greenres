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

  // ── Ingredient categories & recipe-based stock ───────────
  const ingredientCategories = {};
  for (const category of [
    { name: "เนื้อสัตว์", nameEn: "Meat & Seafood", slug: "meat-seafood", sortOrder: 1 },
    { name: "ผักและสมุนไพร", nameEn: "Vegetables & Herbs", slug: "vegetables-herbs", sortOrder: 2 },
    { name: "เครื่องปรุง", nameEn: "Seasonings", slug: "seasonings", sortOrder: 3 },
    { name: "ของแห้ง", nameEn: "Dry Goods", slug: "dry-goods", sortOrder: 4 },
    { name: "นมและเบเกอรี", nameEn: "Dairy & Bakery", slug: "dairy-bakery", sortOrder: 5 },
    { name: "เครื่องดื่มและผลไม้", nameEn: "Beverages & Fruit", slug: "beverages-fruit", sortOrder: 6 },
  ]) {
    ingredientCategories[category.slug] = await prisma.ingredientCategory.upsert({
      where: { slug: category.slug }, update: category, create: category,
    });
  }

  const ingredientSeeds = [
    ["อกไก่", "Chicken Breast", "meat-seafood", 12000, "g", 2000],
    ["กุ้งสด", "Fresh Shrimp", "meat-seafood", 7000, "g", 1200],
    ["ผักสลัดรวม", "Mixed Salad Greens", "vegetables-herbs", 9000, "g", 1500],
    ["ใบกะเพรา", "Holy Basil", "vegetables-herbs", 1800, "g", 300],
    ["อโวคาโด", "Avocado", "vegetables-herbs", 3000, "g", 600],
    ["รากผักรวม", "Mixed Root Vegetables", "vegetables-herbs", 8000, "g", 1200],
    ["กะทิ", "Coconut Milk", "seasonings", 10000, "ml", 1800],
    ["ซอสสมุนไพร", "Herb Sauce", "seasonings", 4000, "ml", 700],
    ["ข้าวกล้อง", "Brown Rice", "dry-goods", 15000, "g", 2500],
    ["แผ่นทาโก้", "Taco Shell", "dry-goods", 180, "ชิ้น", 30],
    ["ผงมัทฉะ", "Matcha Powder", "dry-goods", 1600, "g", 250],
    ["แป้งเค้ก", "Cake Flour", "dairy-bakery", 8000, "g", 1200],
    ["ครีมสด", "Fresh Cream", "dairy-bakery", 6000, "ml", 1000],
    ["ผักผลไม้คั้นน้ำ", "Juicing Fruit & Vegetables", "beverages-fruit", 14000, "g", 2500],
  ] as const;
  const ingredients = {};
  for (const [name, nameEn, categorySlug, quantity, unit, lowThreshold] of ingredientSeeds) {
    ingredients[name] = await prisma.ingredient.upsert({
      where: { name_unit: { name, unit } },
      update: { nameEn, categoryId: ingredientCategories[categorySlug].id, lowThreshold },
      create: { name, nameEn, categoryId: ingredientCategories[categorySlug].id, quantity, unit, lowThreshold },
    });
  }

  const recipes = {
    "garden-bowl": [["ผักสลัดรวม", 180], ["ซอสสมุนไพร", 35]],
    "green-taco": [["แผ่นทาโก้", 2], ["อโวคาโด", 80], ["ผักสลัดรวม", 60], ["ซอสสมุนไพร", 25]],
    "roots-curry": [["รากผักรวม", 180], ["กะทิ", 160], ["ข้าวกล้อง", 120]],
    "green-press": [["ผักผลไม้คั้นน้ำ", 300]],
    "matcha-cake": [["ผงมัทฉะ", 12], ["แป้งเค้ก", 90], ["ครีมสด", 60]],
  } as const;
  for (const product of products) {
    const items = recipes[product.slug] || [];
    for (const [ingredientName, quantityRequired] of items) {
      const ingredient = ingredients[ingredientName];
      await prisma.recipeIngredient.upsert({
        where: { productId_ingredientId: { productId: product.id, ingredientId: ingredient.id } },
        update: { quantityRequired, unit: ingredient.unit },
        create: { productId: product.id, ingredientId: ingredient.id, quantityRequired, unit: ingredient.unit },
      });
    }
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
