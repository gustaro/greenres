/**
 * Email Service
 * ใช้ nodemailer หรือ Resend / SendGrid แล้วแต่ต้องการ
 * ปัจจุบันเป็น console.log placeholder — swap ได้ทันที
 */

const sendMail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === "development") {
    console.log(`📧 [EMAIL] to=${to} | subject=${subject}`);
    return;
  }
  // TODO: ใส่ nodemailer / Resend / SendGrid ที่นี่
  // e.g.
  // const transporter = nodemailer.createTransport({ ... });
  // await transporter.sendMail({ from: process.env.MAIL_FROM, to, subject, html });
};

export const sendOrderConfirmation = (user, order) =>
  sendMail({
    to: user.email,
    subject: `✅ Order #${order.id.slice(-6).toUpperCase()} Confirmed`,
    html: `
      <h2>Thank you, ${user.name}!</h2>
      <p>Your order has been confirmed.</p>
      <p><strong>Total:</strong> $${order.total}</p>
      <p><strong>Status:</strong> ${order.status}</p>
    `,
  });

export const sendOrderStatusUpdate = (user, order) =>
  sendMail({
    to: user.email,
    subject: `Order #${order.id.slice(-6).toUpperCase()} — ${order.status}`,
    html: `
      <h2>Order Update</h2>
      <p>Hi ${user.name}, your order status has been updated to <strong>${order.status}</strong>.</p>
    `,
  });

export const sendWelcomeEmail = (user) =>
  sendMail({
    to: user.email,
    subject: "Welcome! 🎉",
    html: `
      <h2>Welcome, ${user.name}!</h2>
      <p>Your account has been created successfully.</p>
    `,
  });
