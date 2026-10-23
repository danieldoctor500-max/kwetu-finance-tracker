import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createTransferHandler,
  deleteTransferHandler,
  listTransfersHandler,
} from "./account.controller";

const router = Router();
router.use(requireAuth);
router.get("/", listTransfersHandler);
router.post("/", createTransferHandler);
router.delete("/:id", deleteTransferHandler);

export default router;
