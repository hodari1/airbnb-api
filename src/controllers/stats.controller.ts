import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { getCache, setCache } from "../config/cache";

// GET /listings/stats
export const getListingsStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = "listings:stats";
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("✅ CACHE HIT — serving listings stats from cache");
      res.json(cached);
      return;
    }

    console.log("❌ CACHE MISS — hitting database for listings stats");

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

// GET /users/stats
export const getUsersStats = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cacheKey = "users:stats";
    const cached = getCache(cacheKey);
    if (cached) {
      console.log("✅ CACHE HIT — serving users stats from cache");
      res.json(cached);
      return;
    }

    console.log("❌ CACHE MISS — hitting database for users stats");

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({
        by: ["role"],
        _count: { role: true },
      }),
    ]);

    const result = { totalUsers, byRole };

    setCache(cacheKey, result, 300);
    res.json(result);
  } catch (error) {
    next(error);
  }
};