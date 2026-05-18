import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createReviewSchema } from "../validators/reviews.validator";
import { getCache, setCache, clearCacheByPrefix } from "../config/cache";

// GET /listings/:id/reviews
export const getListingReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params.id as string; // ✅ cast to string
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `reviews:listing:${listingId}:${page}:${limit}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId },
        skip,
        take: limit,
        include: {
          user: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.count({ where: { listingId } }),
    ]);

    const result = {
      data: reviews,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    setCache(cacheKey, result, 30);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// POST /listings/:id/reviews
export const createReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listingId = req.params.id as string; // ✅ cast to string
    const userId = req.userId!;

    const listing = await prisma.listing.findUnique({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const parsed = createReviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues }); // ✅ issues not errors
      return;
    }

    const existing = await prisma.review.findUnique({
      where: { userId_listingId: { userId, listingId } },
    });
    if (existing) {
      res.status(409).json({ error: "You have already reviewed this listing" });
      return;
    }

    const review = await prisma.review.create({
      data: { ...parsed.data, userId, listingId },
      include: {
        user: { select: { id: true, name: true, avatar: true } },
      },
    });

    clearCacheByPrefix(`reviews:listing:${listingId}`);
    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
};

// DELETE /reviews/:id
export const deleteReview = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string
    const userId = req.userId!;
    const role = req.role!;

    const review = await prisma.review.findUnique({ where: { id } });
    if (!review) {
      res.status(404).json({ error: "Review not found" });
      return;
    }

    if (review.userId !== userId && role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own reviews" });
      return;
    }

    await prisma.review.delete({ where: { id } });

    clearCacheByPrefix(`reviews:listing:${review.listingId}`);
    res.json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
};