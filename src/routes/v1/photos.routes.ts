/**
 * @swagger
 * /api/v1/listings/{id}/photos:
 *   post:
 *     summary: Upload photos for a listing
 *     tags: [Photos]
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
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               photos:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Photos uploaded successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Listing not found
 *
 * /api/v1/listings/{id}/photos/{photoId}:
 *   delete:
 *     summary: Delete a listing photo
 *     tags: [Photos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: photoId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Photo deleted successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Photo not found
 */
import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import upload from "../../config/multer";
import { uploadListingPhotos, deleteListingPhoto } from "../../controllers/upload.controller";

const router = Router({ mergeParams: true });

router.post("/", authenticate, upload.array("photos", 5), uploadListingPhotos);
router.delete("/:photoId", authenticate, deleteListingPhoto);

export default router;