import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { createProfileSchema, updateProfileSchema } from "../validators/profile.validator";

// GET /users/:id/profile
export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string; // ✅ cast to string

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};

// POST /users/:id/profile
export const createProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string; // ✅ cast to string

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { userId } });
    if (existing) {
      res.status(409).json({ message: "Profile already exists for this user" });
      return;
    }

    const result = createProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues }); // ✅ issues not errors
      return;
    }

    const profile = await prisma.profile.create({
      data: { ...result.data, userId },
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
};

// PUT /users/:id/profile
export const updateProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.params.id as string; // ✅ cast to string

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { userId } });
    if (!existing) {
      res.status(404).json({ message: "Profile not found" });
      return;
    }

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues }); // ✅ issues not errors
      return;
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: result.data,
    });

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
};