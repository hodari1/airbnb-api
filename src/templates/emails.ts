export const welcomeEmail = (name: string, role: string): string => {
  const roleMessage =
    role === "HOST"
      ? `<p>You're ready to host! <a href="#" style="background:#FF5A5F;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Create Your First Listing</a></p>`
      : `<p>Start exploring amazing places! <a href="#" style="background:#FF5A5F;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">Explore Listings</a></p>`;

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Welcome to Airbnb, ${name}!</h1>
      <p>We're excited to have you on board.</p>
      ${roleMessage}
      <p>Happy travels,<br/>The Airbnb Team</p>
    </div>
  `;
};

export const bookingConfirmationEmail = (
  guestName: string,
  listingTitle: string,
  location: string,
  checkIn: string,
  checkOut: string,
  totalPrice: number
): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Confirmed!</h1>
      <p>Hi ${guestName}, your booking is confirmed.</p>
      <div style="background:#f7f7f7;padding:20px;border-radius:8px;">
        <h2>${listingTitle}</h2>
        <p><strong>Location:</strong> ${location}</p>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
        <p><strong>Total Price:</strong> $${totalPrice}</p>
      </div>
      <p style="color:#888;font-size:13px;">Please note that cancellations made 24 hours before check-in are fully refunded.</p>
      <p>See you soon,<br/>The Airbnb Team</p>
    </div>
  `;
};

export const bookingCancellationEmail = (
  guestName: string,
  listingTitle: string,
  checkIn: string,
  checkOut: string
): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Booking Cancelled</h1>
      <p>Hi ${guestName}, your booking has been cancelled.</p>
      <div style="background:#f7f7f7;padding:20px;border-radius:8px;">
        <h2>${listingTitle}</h2>
        <p><strong>Check-in:</strong> ${checkIn}</p>
        <p><strong>Check-out:</strong> ${checkOut}</p>
      </div>
      <p>We hope to see you again soon! <a href="#" style="color:#FF5A5F;">Explore other listings</a></p>
      <p>The Airbnb Team</p>
    </div>
  `;
};

export const passwordResetEmail = (name: string, resetLink: string): string => {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h1 style="color:#FF5A5F;">Password Reset Request</h1>
      <p>Hi ${name}, we received a request to reset your password.</p>
      <p>Click the button below to reset it. This link expires in <strong>1 hour</strong>.</p>
      <p>
        <a href="${resetLink}" style="background:#FF5A5F;color:white;padding:10px 20px;border-radius:5px;text-decoration:none;">
          Reset Password
        </a>
      </p>
      <p style="color:#888;font-size:13px;">If you did not request this, ignore this email. Your password will not change.</p>
      <p>The Airbnb Team</p>
    </div>
  `;
};