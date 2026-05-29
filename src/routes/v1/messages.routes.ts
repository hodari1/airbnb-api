import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  getConversation,
  getConversations,
  sendMessage,
  getUnreadMessageCount,
  markConversationAsRead,
} from "../../controllers/messages.controller";

const router = Router();

router.use(authenticate);

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Messaging between users
 */

/**
 * @swagger
 * /api/v1/messages:
 *   get:
 *     summary: Get all conversations
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of conversations
 */
router.get("/", getConversations);

/**
 * @swagger
 * /api/v1/messages/unread-count:
 *   get:
 *     summary: Get unread message count
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 */
router.get("/unread-count", getUnreadMessageCount);

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - receiverId
 *               - content
 *             properties:
 *               receiverId:
 *                 type: string
 *               content:
 *                 type: string
 *               bookingId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Message sent
 */
router.post("/", sendMessage);

/**
 * @swagger
 * /api/v1/messages/{otherUserId}:
 *   get:
 *     summary: Get conversation with a specific user
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of messages
 */
router.get("/:otherUserId", getConversation);

/**
 * @swagger
 * /api/v1/messages/{otherUserId}/read:
 *   put:
 *     summary: Mark conversation as read
 *     tags: [Messages]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: otherUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Marked as read
 */
router.put("/:otherUserId/read", markConversationAsRead);

export default router;