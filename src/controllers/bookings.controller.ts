import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { createBookingSchema } from "../validators/bookings.validator";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendEmail } from "../config/email";
import { bookingConfirmationEmail, bookingCancellationEmail } from "../templates/emails";

// GET /bookings - Get my bookings only
export const getAllBookings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: { guestId: userId },
        skip,
        take: limit,
        include: {
          guest: { select: { name: true, avatar: true } },
          listing: {
            select: {
              title: true,
              location: true,
              pricePerNight: true,
              photos: { take: 1 },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.booking.count({ where: { guestId: userId } }),
    ]);

    res.json({
      data: bookings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /bookings/:id - Get a single booking
export const getBookingById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,
        listing: {
          include: { host: { select: { name: true } } },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    res.json(booking);
  } catch (error) {
    next(error);
  }
};

// POST /bookings - Create a booking
export const createBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues }); // ✅ issues not errors
      return;
    }

    const { listingId, checkIn, checkOut } = result.data;

    const guestId = req.userId!;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const nights = Math.ceil(
      (checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const totalPrice = nights * listing.pricePerNight;

    const booking = await prisma.$transaction(async (tx) => {
      const conflict = await tx.booking.findFirst({
        where: {
          listingId,
          status: { in: ["PENDING", "CONFIRMED"] },
          checkIn: { lt: new Date(checkOut) },
          checkOut: { gt: new Date(checkIn) },
        },
      });

      if (conflict) {
        throw new Error("BOOKING_CONFLICT");
      }

      const newBooking = await tx.booking.create({
        data: {
          listingId,
          guestId,
          checkIn: checkInDate,
          checkOut: checkOutDate,
          totalPrice,
          status: "PENDING",
        },
      });

      return newBooking;
    });

    res.status(201).json(booking);

    // Create notification for the host (after transaction completes)
    try {
      const guest = await prisma.user.findUnique({ where: { id: guestId } });
      await prisma.notification.create({
        data: {
          type: "BOOKING_REQUEST",
          title: "New Booking Request",
          message: `You have a new booking request from ${guest?.name} for ${listing.title}`,
          userId: listing.hostId,
          bookingId: booking.id,
          listingId: listingId,
        },
      });
    } catch (notifError) {
      console.error("Error creating booking notification:", notifError);
    }

    try {
      const guest = await prisma.user.findUnique({ where: { id: guestId } });
      if (guest) {
        await sendEmail(
          guest.email,
          "Booking Confirmed!",
          bookingConfirmationEmail(
            guest.name,
            listing.title,
            listing.location,
            checkInDate.toDateString(),
            checkOutDate.toDateString(),
            totalPrice
          )
        );
      }
    } catch (emailError) {
      console.error("Booking confirmation email failed:", emailError);
    }
  } catch (error: any) {
    if (error.message === "BOOKING_CONFLICT") {
      res.status(409).json({ message: "Listing is already booked for these dates" });
      return;
    }
    next(error);
  }
};

// DELETE /bookings/:id - Cancel a booking
export const deleteBooking = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: {
        guest: true,  // ✅ include guest so booking.guest.email works
        listing: true, // ✅ include listing so booking.listing.title works
      },
    });

    if (!booking) {
      res.status(404).json({ message: "Booking not found" });
      return;
    }

    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ message: "You can only cancel your own bookings" });
      return;
    }

    if (booking.status === "CANCELLED") {
      res.status(400).json({ message: "Booking is already cancelled" });
      return;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: "CANCELLED" },
    });

    // Create notification for the host about cancellation
    if (booking.listing) {
      await prisma.notification.create({
        data: {
          type: "BOOKING_CANCELLED",
          title: "Booking Cancelled",
          message: `Booking for ${booking.listing.title} from ${booking.guest.name} has been cancelled`,
          userId: booking.listing.hostId,
          bookingId: booking.id,
          listingId: booking.listingId,
        },
      });

      // Also notify the guest that cancellation was processed
      await prisma.notification.create({
        data: {
          type: "BOOKING_CANCELLED",
          title: "Booking Cancelled",
          message: `Your booking for ${booking.listing.title} has been cancelled`,
          userId: booking.guestId,
          bookingId: booking.id,
          listingId: booking.listingId,
        },
      });
    }

    res.status(200).json({ message: "Booking cancelled successfully", booking: updated });

    try {
      await sendEmail(
        booking.guest.email,
        "Booking Cancelled",
        bookingCancellationEmail(
          booking.guest.name,
          booking.listing.title,
          booking.checkIn.toDateString(),
          booking.checkOut.toDateString()
        )
      );
    } catch (emailError) {
      console.error("Booking cancellation email failed:", emailError);
    }
  } catch (error) {
    next(error);
  }
};