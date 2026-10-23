import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";
import { getDashboardSummaryHandler } from "./dashboard.controller";

const router = Router();

router.use(requireAuth);

router.get("/summary", getDashboardSummaryHandler);

export default router;