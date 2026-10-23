import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";

import {
  createTransactionHandler,
  deleteTransactionHandler,
  getTransactionHandler,
  listTransactionsHandler,
  transactionQualityHandler,
  updateTransactionHandler,
} from "./transaction.controller";

const router = Router();

// Every transaction endpoint requires authentication.
router.use(requireAuth);

// GET /api/v1/transactions
router.get("/", listTransactionsHandler);

// GET /api/v1/transactions/quality
router.get("/quality", transactionQualityHandler);

// POST /api/v1/transactions
router.post("/", createTransactionHandler);

// GET /api/v1/transactions/:id
router.get("/:id", getTransactionHandler);

// PATCH /api/v1/transactions/:id
router.patch("/:id", updateTransactionHandler);

// DELETE /api/v1/transactions/:id
router.delete("/:id", deleteTransactionHandler);

export default router;