import { Response } from "express";
import prisma from "../prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";
import { AuthRequest } from "../middlewares/auth.middleware";

export const uploadAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    if (req.userId !== id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: "No file uploaded" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    const { url, publicId } = await uploadToCloudinary(
      req.file.buffer,
      "airbnb/avatars"
    );

    const updated = await prisma.user.update({
      where: { id },
      data: { avatar: url, avatarPublicId: publicId },
    });

    const { password: _, ...userWithoutPassword } = updated;
    res.status(200).json(userWithoutPassword);
  } catch (error) {
    console.error("Upload avatar error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteAvatar = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    if (req.userId !== id) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    if (!user.avatar) {
      res.status(400).json({ message: "No avatar to remove" });
      return;
    }

    await deleteFromCloudinary(user.avatarPublicId!);

    await prisma.user.update({
      where: { id },
      data: { avatar: null, avatarPublicId: null },
    });

    res.status(200).json({ message: "Avatar removed successfully" });
  } catch (error) {
    console.error("Delete avatar error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const uploadListingPhotos = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string; // ✅ cast to string

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({
      where: { listingId: id },
    });

    if (existingCount >= 5) {
      res.status(400).json({ message: "Maximum of 5 photos allowed per listing" });
      return;
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ message: "No files uploaded" });
      return;
    }

    const remainingSlots = 5 - existingCount;
    const filesToUpload = files.slice(0, remainingSlots);

    for (const file of filesToUpload) {
      const { url, publicId } = await uploadToCloudinary(
        file.buffer,
        "airbnb/listings"
      );
      await prisma.listingPhoto.create({
        data: { url, publicId, listingId: id },
      });
    }

    const updated = await prisma.listing.findUnique({
      where: { id },
      include: { photos: true },
    });

    res.status(200).json(updated);
  } catch (error) {
    console.error("Upload listing photos error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};

export const deleteListingPhoto = async (req: AuthRequest, res: Response) => {
  try {
    const id = req.params.id as string;       // ✅ cast to string
    const photoId = req.params.photoId as string; // ✅ cast to string

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ message: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }

    const photo = await prisma.listingPhoto.findUnique({
      where: { id: photoId },
    });
    if (!photo) {
      res.status(404).json({ message: "Photo not found" });
      return;
    }

    if (photo.listingId !== id) {
      res.status(403).json({ message: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.status(200).json({ message: "Photo deleted successfully" });
  } catch (error) {
    console.error("Delete listing photo error:", error);
    res.status(500).json({ message: "Server error", error });
  }
};