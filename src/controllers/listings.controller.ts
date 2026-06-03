import { Response, NextFunction } from "express";
import prisma from "../prisma";
import { AuthRequest } from "../middlewares/auth.middleware";
import { createListingSchema, updateListingSchema } from "../validators/listings.validator";
import { getCache, setCache, clearCacheByPrefix } from "../config/cache";

// Helper function to geocode location using OpenStreetMap Nominatim
const geocodeLocation = async (location: string): Promise<{ latitude: number; longitude: number } | null> => {
  try {
    const encoded = encodeURIComponent(location);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`,
      {
        headers: {
          "User-Agent": "AirbnbCloneApp/1.0",
        },
      }
    );
    const data = await response.json();
    if (data && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
    }
    return null;
  } catch (error) {
    console.error("Geocoding error:", error);
    return null;
  }
};

// GET /listings
export const getListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cacheKey = `listings:${JSON.stringify(req.query)}`;
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        skip,
        take: limit,
        include: {
          host: { select: { id: true, name: true, email: true, avatar: true } },
          photos: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count(),
    ]);

    const result = {
      data: listings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };

    setCache(cacheKey, result, 60);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /listings/search
export const searchListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const { location, type, minPrice, maxPrice, guests } = req.query;

    const where: any = {};
    if (location) where.location = { contains: location as string, mode: "insensitive" };
    if (type) where.type = type as string;
    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) where.pricePerNight.gte = parseFloat(minPrice as string);
      if (maxPrice) where.pricePerNight.lte = parseFloat(maxPrice as string);
    }
    if (guests) where.guests = { gte: parseInt(guests as string) };

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        skip,
        take: limit,
        include: {
          host: { select: { id: true, name: true, email: true, avatar: true } },
          photos: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.listing.count({ where }),
    ]);

    res.json({
      data: listings,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /listings/stats
export const getListingsStats = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const cacheKey = "listings:stats";
    const cached = getCache(cacheKey);
    if (cached) {
      res.json(cached);
      return;
    }

    const [totalListings, averagePriceResult, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({ _avg: { pricePerNight: true } }),
      prisma.listing.groupBy({
        by: ["location"],
        _count: { location: true },
        orderBy: { _count: { location: "desc" } },
      }),
      prisma.listing.groupBy({
        by: ["type"],
        _count: { type: true },
        orderBy: { _count: { type: "desc" } },
      }),
    ]);

    const result = {
      totalListings,
      averagePrice: averagePriceResult._avg.pricePerNight ?? 0,
      byLocation,
      byType,
    };

    setCache(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

// GET /listings/:id
export const getListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const listing = await prisma.listing.findUnique({
      where: { id },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
        photos: true,
        reviews: {
          include: {
            user: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    res.json(listing);
  } catch (error) {
    next(error);
  }
};

// POST /listings
export const createListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const parsed = createListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    const coords = await geocodeLocation(parsed.data.location);

    const listing = await prisma.listing.create({
      data: {
        ...parsed.data,
        hostId: req.userId!,
        latitude: coords?.latitude || null,
        longitude: coords?.longitude || null,
      },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    clearCacheByPrefix("listings:");
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
};

// PUT /listings/:id
export const updateListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only update your own listings" });
      return;
    }

    const parsed = updateListingSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.issues });
      return;
    }

    let coords = null;
    if (parsed.data.location && parsed.data.location !== existing.location) {
      coords = await geocodeLocation(parsed.data.location);
    }

    const listing = await prisma.listing.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(coords && {
          latitude: coords.latitude,
          longitude: coords.longitude,
        }),
      },
      include: {
        host: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });

    clearCacheByPrefix("listings:");
    res.json(listing);
  } catch (error) {
    next(error);
  }
};

// DELETE /listings/:id
export const deleteListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own listings" });
      return;
    }

    await prisma.listing.delete({ where: { id } });

    clearCacheByPrefix("listings:");
    res.json({ message: "Listing deleted successfully" });
  } catch (error) {
    next(error);
  }
};

// POST /listings/:id/geocode — update coordinates for a single listing
export const geocodeListing = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string;

    const existing = await prisma.listing.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    const coords = await geocodeLocation(existing.location);
    if (!coords) {
      res.status(400).json({ error: "Could not geocode location" });
      return;
    }

    await prisma.listing.update({
      where: { id },
      data: { latitude: coords.latitude, longitude: coords.longitude },
    });

    clearCacheByPrefix("listings:");
    res.json({ message: "Coordinates updated", latitude: coords.latitude, longitude: coords.longitude });
  } catch (error) {
    next(error);
  }
};

// POST /listings/geocode-all — geocode all listings with missing coordinates
export const geocodeAllListings = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const listings = await prisma.listing.findMany({
      where: {
        OR: [{ latitude: null }, { longitude: null }],
      },
    });

    const results = [];
    for (const listing of listings) {
      try {
        const coords = await geocodeLocation(listing.location + ", Rwanda");
        if (coords) {
          await prisma.listing.update({
            where: { id: listing.id },
            data: { latitude: coords.latitude, longitude: coords.longitude },
          });
          results.push({ id: listing.id, title: listing.title, ...coords });
          console.log(`✅ Geocoded: ${listing.title} → ${coords.latitude}, ${coords.longitude}`);
        }
      } catch (err) {
        console.error(`Failed to geocode listing ${listing.id}:`, err);
      }
      // Rate limit: 1 request per second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    clearCacheByPrefix("listings:");
    res.json({ message: `Geocoded ${results.length} listings`, results });
  } catch (error) {
    next(error);
  }
};