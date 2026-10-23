import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import {
  getCurrentUserProfile,
  updateCurrentUserProfile,
} from "./user.controller";

const router = Router();

router.use(requireAuth);
router.get("/me", getCurrentUserProfile);
router.patch("/me", updateCurrentUserProfile);

export default router;
