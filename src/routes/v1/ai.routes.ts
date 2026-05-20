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