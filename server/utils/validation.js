/**
 * Lightweight validation helpers (ไม่ต้องติดตั้ง lib เพิ่ม)
 * ใช้แทน express-validator สำหรับ validation พื้นฐาน
 */

export const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

export const isStrongPassword = (password) =>
  password.length >= 6; // ปรับ regex ได้ตามต้องการ

export const isPositiveNumber = (value) => !isNaN(value) && parseFloat(value) > 0;

export const isNonNegativeInt = (value) =>
  Number.isInteger(Number(value)) && Number(value) >= 0;

/**
 * ตรวจ required fields — คืน field แรกที่หายไป หรือ null ถ้าครบ
 * @example requireFields(req.body, ['email','password'])
 */
export const requireFields = (obj, fields) => {
  for (const field of fields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === "") {
      return field;
    }
  }
  return null;
};

/**
 * Sanitise string input — trim + ป้องกัน injection เบื้องต้น
 */
export const sanitize = (str) =>
  typeof str === "string" ? str.trim().replace(/<[^>]*>/g, "") : str;

/**
 * แปลง pagination query params เป็น { skip, take, page, limit }
 */
export const parsePagination = (query, defaultLimit = 20, maxLimit = 100) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(maxLimit, Math.max(1, parseInt(query.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  return { page, limit, skip, take: limit };
};

/**
 * แปลง sort query → Prisma orderBy object
 * @example parseSort('price', 'desc', ['name','price','createdAt'])
 */
export const parseSort = (sortBy, sortOrder, allowed) => {
  const field = allowed.includes(sortBy) ? sortBy : allowed[0];
  const direction = sortOrder === "desc" ? "desc" : "asc";
  return { [field]: direction };
};
