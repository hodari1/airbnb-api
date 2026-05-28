import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middlewares/auth.middleware";

// GET /wishlist — get user's wishlist
export const getWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const wishlist = await prisma.wishlist.findMany({
      where: { userId: req.userId! },
      include: {
        listing: {
          include: {
            host: { select: { id: true, name: true, email: true, avatar: true } },
            photos: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ data: wishlist });
  } catch (error) {
    next(error);
  }
};

// POST /wishlist/:listingId — add to wishlist
export const addToWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    const existing = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.userId!, listingId } },
    });

    if (existing) {
      res.status(400).json({ message: "Already in wishlist" });
      return;
    }

    const wishlist = await prisma.wishlist.create({
      data: { userId: req.userId!, listingId },
      include: {
        listing: {
          include: {
            photos: true,
            host: { select: { id: true, name: true, email: true, avatar: true } },
          },
        },
      },
    });

    res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
};

// DELETE /wishlist/:listingId — remove from wishlist
export const removeFromWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.userId!, listingId } },
    });

    if (!existing) {
      res.status(404).json({ message: "Not in wishlist" });
      return;
    }

    await prisma.wishlist.delete({
      where: { userId_listingId: { userId: req.userId!, listingId } },
    });

    res.json({ message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
};

// GET /wishlist/:listingId/check — check if listing is in wishlist
export const checkWishlist = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { listingId } = req.params;

    const existing = await prisma.wishlist.findUnique({
      where: { userId_listingId: { userId: req.userId!, listingId } },
    });

    res.json({ isWishlisted: !!existing });
  } catch (error) {
    next(error);
  }
};