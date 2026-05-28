/**
 * @swagger
 * /api/v1/wishlist:
 *   get:
 *     summary: Get user's wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User's wishlist
 *       401:
 *         description: Unauthorized
 *
 * /api/v1/wishlist/{listingId}:
 *   post:
 *     summary: Add listing to wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: Added to wishlist
 *       400:
 *         description: Already in wishlist
 *       401:
 *         description: Unauthorized
 *   delete:
 *     summary: Remove listing from wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Removed from wishlist
 *       404:
 *         description: Not in wishlist
 *
 * /api/v1/wishlist/{listingId}/check:
 *   get:
 *     summary: Check if listing is in wishlist
 *     tags: [Wishlist]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: listingId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wishlist status
 */
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  checkWishlist,
} from "../../controllers/wishlist.controller";

const router = Router();

router.get("/", authenticate, getWishlist);
router.post("/:listingId", authenticate, addToWishlist);
router.delete("/:listingId", authenticate, removeFromWishlist);
router.get("/:listingId/check", authenticate, checkWishlist);

export default router;