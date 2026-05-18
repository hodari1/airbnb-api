import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import upload from "../../config/multer";
import { uploadAvatar, deleteAvatar } from "../../controllers/upload.controller";

const router = Router({ mergeParams: true });

router.post("/", authenticate, upload.single("image"), uploadAvatar);
router.delete("/", authenticate, deleteAvatar);

export default router;