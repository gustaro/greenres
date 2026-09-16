/**
 * Date/Time helpers
 */

/** วันนี้ตั้งแต่ 00:00:00 */
export const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

/** วันพรุ่งนี้ 00:00:00 */
export const startOfTomorrow = () => {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
};

/** N วันที่แล้ว ตั้งแต่ 00:00:00 */
export const daysAgo = (n) => {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
};

/** แปลง period string ("7d" | "30d" | "90d") → จำนวนวัน */
export const periodToDays = (period) => {
  const map = { "7d": 7, "30d": 30, "90d": 90 };
  return map[period] || 7;
};

/** ฟอร์แมต Date → "YYYY-MM-DD" */
export const toDateString = (date) => date.toISOString().split("T")[0];

/** สร้าง array ของวันที่ระหว่าง startDate และ startDate + days */
export const dateRange = (startDate, days) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return toDateString(d);
  });
