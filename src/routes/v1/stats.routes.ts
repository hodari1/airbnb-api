import { Router } from "express";
import { getListingsStats, getUsersStats } from "../../controllers/stats.controller";

const router = Router();

router.get("/listings/stats", getListingsStats);
router.get("/users/stats", getUsersStats);

export default router;