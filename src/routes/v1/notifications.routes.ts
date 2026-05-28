import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from "../controllers/notifications.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all notifications
router.get("/", getNotifications);

// Get unread count
router.get("/unread-count", getUnreadCount);

// Mark a notification as read
router.put("/:notificationId/read", markAsRead);

// Mark all notifications as read
router.put("/mark-all-read", markAllAsRead);

// Delete a notification
router.delete("/:notificationId", deleteNotification);

export default router;
