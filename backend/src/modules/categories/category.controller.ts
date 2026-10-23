import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import {
  createCategorySchema,
  listCategoriesSchema,
  updateCategorySchema,
} from "./category.schemas";

import {
  CategoryServiceError,
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  listCategorySuggestions,
  updateCategory,
} from "./category.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error(
      "Authenticated user was not attached to the request.",
    );
  }

  return req.user.id;
}

function getCategoryId(
  req: Request,
  res: Response,
): string | undefined {
  const categoryId = req.params.id;

  if (
    typeof categoryId !== "string" ||
    !categoryId.trim()
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_CATEGORY_ID",
        message: "A valid category ID is required.",
      },
    });

    return undefined;
  }

  return categoryId;
}

function handleCategoryError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted category data.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  if (error instanceof CategoryServiceError) {
    const statusByCode = {
      CATEGORY_NOT_FOUND: 404,
      CATEGORY_NAME_EXISTS: 409,
      CATEGORY_IN_USE: 409,
    } as const;

    res.status(statusByCode[error.code]).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  next(error);
}

export async function createCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = createCategorySchema.parse(req.body);

    const category = await createCategory(userId, input);

    res.status(201).json({
      message: "Category created successfully.",
      data: category,
    });
  } catch (error) {
    handleCategoryError(error, res, next);
  }
}

export async function listCategoriesHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const filters = listCategoriesSchema.parse(req.query);

    const categories = await listCategories(userId, filters);

    res.status(200).json({
      data: categories,
      total: categories.length,
    });
  } catch (error) {
    handleCategoryError(error, res, next);
  }
}

export async function listCategorySuggestionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const suggestions = await listCategorySuggestions(getAuthenticatedUserId(req));
    res.status(200).json({
      data: suggestions,
      total: suggestions.length,
    });
  } catch (error) {
    next(error);
  }
}

export async function getCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = getCategoryId(req, res);

    if (!categoryId) {
      return;
    }

    const category = await getCategoryById(
      userId,
      categoryId,
    );

    res.status(200).json({
      data: category,
    });
  } catch (error) {
    handleCategoryError(error, res, next);
  }
}

export async function updateCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = getCategoryId(req, res);

    if (!categoryId) {
      return;
    }

    const input = updateCategorySchema.parse(req.body);

    const category = await updateCategory(
      userId,
      categoryId,
      input,
    );

    res.status(200).json({
      message: "Category updated successfully.",
      data: category,
    });
  } catch (error) {
    handleCategoryError(error, res, next);
  }
}

export async function deleteCategoryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const categoryId = getCategoryId(req, res);

    if (!categoryId) {
      return;
    }

    await deleteCategory(userId, categoryId);

    res.status(200).json({
      message: "Category deleted successfully.",
    });
  } catch (error) {
    handleCategoryError(error, res, next);
  }
}