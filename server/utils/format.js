/**
 * Format helpers — แปลงข้อมูลก่อนส่งให้ client
 */

/** ปัดทศนิยม 2 ตำแหน่ง */
export const toDecimal = (value) => parseFloat(parseFloat(value).toFixed(2));

/** ลบ fields ออกจาก object */
export const omit = (obj, ...keys) => {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
};

/** แปลง Prisma User ให้ปลอดภัยก่อนส่ง */
export const formatUser = (user) => omit(user, "password", "refreshToken");

/** แปลง Prisma Order ให้มียอดรวมเป็น number */
export const formatOrder = (order) => ({
  ...order,
  subtotal: toDecimal(order.subtotal),
  discount: toDecimal(order.discount),
  deliveryFee: toDecimal(order.deliveryFee),
  total: toDecimal(order.total),
});

/** แปลง Prisma Product ให้ price เป็น number */
export const formatProduct = (product) => ({
  ...product,
  price: toDecimal(product.price),
});

/**
 * จัดกลุ่ม array ด้วย key
 * @example groupBy(orders, o => o.status)
 */
export const groupBy = (arr, keyFn) =>
  arr.reduce((acc, item) => {
    const key = keyFn(item);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {});
