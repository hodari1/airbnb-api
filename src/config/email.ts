export const sendEmail = async (
  to: string,
  subject: string,
  html: string
): Promise<void> => {
  console.log("📤 Attempting to send email to:", to);

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": process.env["BREVO_API_KEY"] as string,
    },
    body: JSON.stringify({
      sender: { name: "Airbnb", email: "hodaribaba@gmail.com" },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    console.error("❌ Email error:", error);
    throw new Error("Failed to send email");
  }

  console.log("✅ Email sent successfully");
};