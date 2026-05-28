import { Request, Response } from "express";
import prisma from "../prisma";

// Get all notifications for the logged-in user
export const getNotifications = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            photos: { take: 1 },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      status: "success",
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch notifications" });
  }
};

// Get unread notification count
export const getUnreadCount = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const count = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      status: "success",
      data: { unreadCount: count },
    });
  } catch (error) {
    console.error("Error fetching unread count:", error);
    res.status(500).json({ status: "error", message: "Failed to fetch unread count" });
  }
};

// Mark a notification as read
export const markAsRead = async (req: Request, res: Response) => {
  try {
    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;
    const userId = (req as any).userId;

    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
      },
      data: {
        isRead: true,
      },
    });

    if (notification.count === 0) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    res.json({
      status: "success",
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({ status: "error", message: "Failed to mark as read" });
  }
};

// Mark all notifications as read
export const markAllAsRead = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      status: "success",
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error("Error marking all as read:", error);
    res.status(500).json({ status: "error", message: "Failed to mark all as read" });
  }
};

// Delete a notification
export const deleteNotification = async (req: Request, res: Response) => {
  try {
    const notificationId = Array.isArray(req.params.notificationId)
      ? req.params.notificationId[0]
      : req.params.notificationId;
    const userId = (req as any).userId;

    const notification = await prisma.notification.deleteMany({
      where: {
        id: notificationId,
        userId,
      },
    });

    if (notification.count === 0) {
      return res.status(404).json({ status: "error", message: "Notification not found" });
    }

    res.json({
      status: "success",
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({ status: "error", message: "Failed to delete notification" });
  }
};
