import { Request, Response, NextFunction } from "express";
import prisma from "../prisma";
import { createUserSchema, updateUserSchema } from "../validators/users.validator";

// GET /users - Get all users
export const getAllUsers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: "desc" } }),
      prisma.user.count(),
    ]);

    res.json({
      data: users,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// GET /users/:id - Get a single user
export const getUserById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const userWithDetails = await prisma.user.findUnique({
      where: { id },
      include:
        user.role === "HOST"
          ? { listings: { include: { _count: { select: { bookings: true } } } } }
          : { bookings: { include: { listing: { select: { title: true, location: true } } } } },
    });

    res.json(userWithDetails);
  } catch (error) {
    next(error);
  }
};

// POST /users - Create a new user
export const createUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues }); // ✅ issues not errors
      return;
    }

    const user = await prisma.user.create({ data: result.data });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};

// PUT /users/:id - Update a user
export const updateUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string
    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues }); // ✅ issues not errors
      return;
    }

    const user = await prisma.user.update({
      where: { id },
      data: result.data,
    });

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

// DELETE /users/:id - Delete a user
export const deleteUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = req.params.id as string; // ✅ cast to string
    await prisma.user.delete({ where: { id } });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};