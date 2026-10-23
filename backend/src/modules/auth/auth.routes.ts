import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
  getCurrentUser,
  changePassword,
  login,
  logout,
  register,
  updateProfile,
} from "./auth.controller";

import { requireAuth } from "../../middleware/auth.middleware";

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    error: {
      code: "TOO_MANY_AUTH_REQUESTS",
      message:
        "Too many authentication attempts. Please try again later.",
    },
  },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);
router.post("/logout", logout);
router.get("/me", requireAuth, getCurrentUser);
router.patch("/profile", requireAuth, updateProfile);
router.patch("/password", requireAuth, changePassword);

export default router;