import { Request, Response } from "express";
import prisma from "../prisma";
import stripe from "../config/stripe";

// ─── Payment Methods ──────────────────────────────────────────

export const getPaymentMethods = async (req: any, res: Response) => {
  try {
    const methods = await prisma.paymentMethod.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: methods });
  } catch (error) {
    console.error("getPaymentMethods error:", error);
    res.status(500).json({ error: "Failed to get payment methods" });
  }
};

export const addPaymentMethod = async (req: any, res: Response) => {
  try {
    const { type, label, details, isDefault } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "Type and label are required" });
    }
    if (isDefault) {
      await prisma.paymentMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }
    const method = await prisma.paymentMethod.create({
      data: {
        type,
        label,
        details: details || {},
        isDefault: isDefault || false,
        userId: req.user.id,
      },
    });
    res.status(201).json({ data: method, message: "Payment method added" });
  } catch (error) {
    console.error("addPaymentMethod error:", error);
    res.status(500).json({ error: "Failed to add payment method" });
  }
};

export const deletePaymentMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ message: "Payment method removed" });
  } catch (error) {
    console.error("deletePaymentMethod error:", error);
    res.status(500).json({ error: "Failed to remove payment method" });
  }
};

export const setDefaultPaymentMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.paymentMethod.updateMany({
      where: { userId: req.user.id },
      data: { isDefault: false },
    });
    await prisma.paymentMethod.update({
      where: { id },
      data: { isDefault: true },
    });
    res.json({ message: "Default payment method updated" });
  } catch (error) {
    console.error("setDefaultPaymentMethod error:", error);
    res.status(500).json({ error: "Failed to update default" });
  }
};

// ─── Payout Methods ───────────────────────────────────────────

export const getPayoutMethods = async (req: any, res: Response) => {
  try {
    const methods = await prisma.payoutMethod.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: methods });
  } catch (error) {
    console.error("getPayoutMethods error:", error);
    res.status(500).json({ error: "Failed to get payout methods" });
  }
};

export const addPayoutMethod = async (req: any, res: Response) => {
  try {
    const { type, label, details, isDefault } = req.body;
    if (!type || !label) {
      return res.status(400).json({ error: "Type and label are required" });
    }
    if (isDefault) {
      await prisma.payoutMethod.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }
    const method = await prisma.payoutMethod.create({
      data: {
        type,
        label,
        details: details || {},
        isDefault: isDefault || false,
        userId: req.user.id,
      },
    });
    res.status(201).json({ data: method, message: "Payout method added" });
  } catch (error) {
    console.error("addPayoutMethod error:", error);
    res.status(500).json({ error: "Failed to add payout method" });
  }
};

export const deletePayoutMethod = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.payoutMethod.delete({
      where: { id, userId: req.user.id },
    });
    res.json({ message: "Payout method removed" });
  } catch (error) {
    console.error("deletePayoutMethod error:", error);
    res.status(500).json({ error: "Failed to remove payout method" });
  }
};

// ─── Create Payment Intent (called when user taps Reserve) ────

export const createPaymentIntent = async (req: any, res: Response) => {
  try {
    const { bookingId } = req.body;
    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { listing: true },
    });

    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    if (booking.guestId !== req.user.id) {
      return res.status(403).json({ error: "Not your booking" });
    }

    if (booking.status !== "PENDING") {
      return res.status(400).json({ error: "Payment can only be created for pending bookings" });
    }

    const amount = Math.round((booking.totalPrice || 0) * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        bookingId: booking.id,
        userId: req.user.id,
        listingId: booking.listingId,
      },
    });

    // Save payment record
    await prisma.payment.create({
      data: {
        amount: booking.totalPrice || 0,
        currency: "usd",
        status: "PENDING",
        bookingId: booking.id,
        userId: req.user.id,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      amount: booking.totalPrice,
    });
  } catch (error) {
    console.error("createPaymentIntent error:", error);
    res.status(500).json({ error: "Failed to create payment intent" });
  }
};

// ─── Confirm Payment (called after Stripe confirms) ───────────

export const confirmPayment = async (req: any, res: Response) => {
  try {
    const { paymentIntentId, bookingId } = req.body;

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status === "succeeded") {
      // Update payment status
      await prisma.payment.updateMany({
        where: { bookingId },
        data: { status: "COMPLETED" },
      });

      // Confirm the booking
      await prisma.booking.update({
        where: { id: bookingId },
        data: { status: "CONFIRMED" },
      });

      // Notify host
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { listing: true, guest: true },
      });

      if (booking) {
        await prisma.notification.create({
          data: {
            type: "BOOKING_CONFIRMED",
            title: "Booking Confirmed!",
            message: `${booking.guest.name} has paid for ${booking.listing.title}`,
            userId: booking.listing.hostId,
            bookingId: booking.id,
            listingId: booking.listingId,
          },
        });

        await prisma.notification.create({
          data: {
            type: "BOOKING_CONFIRMED",
            title: "Payment Successful!",
            message: `Your payment for ${booking.listing.title} was successful. Check-in: ${new Date(booking.checkIn).toDateString()}`,
            userId: booking.guestId,
            bookingId: booking.id,
            listingId: booking.listingId,
          },
        });
      }

      res.json({ message: "Payment confirmed", status: "CONFIRMED" });
    } else {
      res.status(400).json({ error: "Payment not completed" });
    }
  } catch (error) {
    console.error("confirmPayment error:", error);
    res.status(500).json({ error: "Failed to confirm payment" });
  }
};

// ─── Get Payment History ──────────────────────────────────────

export const getPayments = async (req: any, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payments });
  } catch (error) {
    console.error("getPayments error:", error);
    res.status(500).json({ error: "Failed to get payments" });
  }
};

// ─── Get Payout History ───────────────────────────────────────

export const getPayouts = async (req: any, res: Response) => {
  try {
    const payouts = await prisma.payout.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    res.json({ data: payouts });
  } catch (error) {
    console.error("getPayouts error:", error);
    res.status(500).json({ error: "Failed to get payouts" });
  }
};