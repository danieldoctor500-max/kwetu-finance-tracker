import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  createAccountHandler,
  deleteAccountHandler,
  getAccountHandler,
  listAccountsHandler,
  updateAccountHandler,
} from "./account.controller";

const router = Router();
router.use(requireAuth);
router.get("/", listAccountsHandler);
router.post("/", createAccountHandler);
router.get("/:id", getAccountHandler);
router.patch("/:id", updateAccountHandler);
router.delete("/:id", deleteAccountHandler);

export default router;
