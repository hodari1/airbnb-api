/**
 * @swagger
 * /api/v1/ai/search:
 *   post:
 *     summary: AI-powered smart listing search
 *     tags: [AI]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: "apartment in Kigali under $100 for 2 guests"
 *     responses:
 *       200:
 *         description: Filtered listings with pagination
 *       400:
 *         description: Query too vague or missing
 */

/**
 * @swagger
 * /api/v1/ai/listings/{id}/generate-description:
 *   post:
 *     summary: Generate AI listing description with tone control
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *                 default: professional
 *     responses:
 *       200:
 *         description: Generated description and updated listing
 *       403:
 *         description: Not the owner of this listing
 *       404:
 *         description: Listing not found
 */

/**
 * @swagger
 * /api/v1/ai/chat:
 *   post:
 *     summary: Guest support chatbot with optional listing context
 *     tags: [AI]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, message]
 *             properties:
 *               sessionId:
 *                 type: string
 *                 example: "user-123-session-1"
 *               message:
 *                 type: string
 *                 example: "Does this place have WiFi?"
 *               listingId:
 *                 type: string
 *                 example: "7d2a07f5-ea3c-4702-a30c-ed4afd5a8eea"
 *     responses:
 *       200:
 *         description: AI response with session info
 *       400:
 *         description: Missing sessionId or message
 */

/**
 * @swagger
 * /api/v1/ai/recommend:
 *   post:
 *     summary: AI booking recommendations based on history
 *     tags: [AI]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended listings based on booking history
 *       400:
 *         description: No booking history found
 */

/**
 * @swagger
 * /api/v1/ai/listings/{id}/review-summary:
 *   get:
 *     summary: AI-generated review summary for a listing
 *     tags: [AI]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Listing ID
 *     responses:
 *       200:
 *         description: AI summary with positives, negatives, and average rating
 *       400:
 *         description: Not enough reviews (minimum 3 required)
 *       404:
 *         description: Listing not found
 */

import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  aiSearch,
  generateDescription,
  chatbot,
  recommend,
  reviewSummary,
} from "../../controllers/ai.controller";

const router = Router();

router.post("/search", aiSearch);
router.post("/listings/:id/generate-description", authenticate, generateDescription);
router.post("/chat", chatbot);
router.post("/recommend", authenticate, recommend);
router.get("/listings/:id/review-summary", reviewSummary);

export default router;