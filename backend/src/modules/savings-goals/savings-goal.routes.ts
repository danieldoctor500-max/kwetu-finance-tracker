
import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";

import {
  createSavingsGoalHandler,
  deleteSavingsGoalHandler,
  getSavingsGoalHandler,
  listSavingsGoalsHandler,
  updateSavingsGoalHandler,
} from "./savings-goal.controller";

const router = Router();

// Every savings goal endpoint requires authentication.
router.use(requireAuth);

router.get("/", listSavingsGoalsHandler);
router.post("/", createSavingsGoalHandler);
router.get("/:id", getSavingsGoalHandler);
router.patch("/:id", updateSavingsGoalHandler);
router.delete("/:id", deleteSavingsGoalHandler);

export default router;
