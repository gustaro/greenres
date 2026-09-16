/**
 * ครอบ async controller ให้ไม่ต้องเขียน try/catch ซ้ำ
 *
 * @example
 * router.get('/', asyncHandler(async (req, res) => {
 *   const data = await someService();
 *   res.json(data);
 * }));
 */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/**
 * สร้าง AppError ที่มี status code — ใช้ใน service layer
 *
 * @example
 * throw new AppError('Product not found', 404);
 */
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.status = statusCode;
    this.name = "AppError";
  }
}
