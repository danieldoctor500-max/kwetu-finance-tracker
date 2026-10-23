import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware";

import {
  createCategoryHandler,
  deleteCategoryHandler,
  getCategoryHandler,
  listCategoriesHandler,
  listCategorySuggestionsHandler,
  updateCategoryHandler,
} from "./category.controller";

const router = Router();

// All category endpoints require authentication.
router.use(requireAuth);

// GET /api/v1/categories
router.get("/", listCategoriesHandler);

// GET /api/v1/categories/suggestions
router.get("/suggestions", listCategorySuggestionsHandler);

// POST /api/v1/categories
router.post("/", createCategoryHandler);

// GET /api/v1/categories/:id
router.get("/:id", getCategoryHandler);

// PATCH /api/v1/categories/:id
router.patch("/:id", updateCategoryHandler);

// DELETE /api/v1/categories/:id
router.delete("/:id", deleteCategoryHandler);

export default router;
