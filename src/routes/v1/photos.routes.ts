import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import upload from "../../config/multer";
import { uploadListingPhotos, deleteListingPhoto } from "../../controllers/upload.controller";

const router = Router({ mergeParams: true });

router.post("/", authenticate, upload.array("photos", 5), uploadListingPhotos);
router.delete("/:photoId", authenticate, deleteListingPhoto);

export default router;