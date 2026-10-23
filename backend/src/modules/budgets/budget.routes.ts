import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";

import {
  createBudgetHandler,
  deleteBudgetHandler,
  getBudgetHandler,
  listBudgetsHandler,
  updateBudgetHandler,
} from "./budget.controller";

const router = Router();

router.use(requireAuth);

router.get("/", listBudgetsHandler);
router.post("/", createBudgetHandler);
router.get("/:id", getBudgetHandler);
router.patch("/:id", updateBudgetHandler);
router.delete("/:id", deleteBudgetHandler);

export default router;