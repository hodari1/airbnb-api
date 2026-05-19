import nodemailer from "nodemailer";

console.log("📧 Email config:", {
  host: process.env["EMAIL_HOST"],
  port: process.env["EMAIL_PORT"],
  user: process.env["EMAIL_USER"],
  passLength: process.env["EMAIL_PASS"]?.length,
});

const transporter = nodemailer.createTransport({
  host: process.env["EMAIL_HOST"],
  port: Number(process.env["EMAIL_PORT"]),
  secure: false,
  auth: {
    user: process.env["EMAIL_USER"],
    pass: process.env["EMAIL_PASS"],
  },
});

export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  console.log("📤 Attempting to send email to:", to);
  try {
    const result = await transporter.sendMail({
      from: process.env["EMAIL_FROM"],
      to,
      subject,
      html,
    });
    console.log("✅ Email sent:", result.messageId);
  } catch (error) {
    console.error("❌ Email error:", error);
  }
};