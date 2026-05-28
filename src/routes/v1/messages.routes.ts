import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import {
  getConversation,
  getConversations,
  sendMessage,
  getUnreadMessageCount,
  markConversationAsRead,
} from "../controllers/messages.controller";

const router = Router();

// All routes require authentication
router.use(authMiddleware);

// Get all conversations
router.get("/", getConversations);

// Get unread message count
router.get("/unread-count", getUnreadMessageCount);

// Send a message
router.post("/", sendMessage);

// Get conversation with a specific user
router.get("/:otherUserId", getConversation);

// Mark conversation as read
router.put("/:otherUserId/read", markConversationAsRead);

export default router;
