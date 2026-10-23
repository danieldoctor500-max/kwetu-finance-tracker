import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import {
  createBudgetSchema,
  listBudgetsSchema,
  updateBudgetSchema,
} from "./budget.schemas";

import {
  BudgetServiceError,
  createBudget,
  deleteBudget,
  getBudgetById,
  listBudgets,
  updateBudget,
} from "./budget.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error(
      "Authenticated user was not attached to the request.",
    );
  }

  return req.user.id;
}

function getBudgetId(
  req: Request,
  res: Response,
): string | undefined {
  const budgetId = req.params.id;

  if (
    typeof budgetId !== "string" ||
    !budgetId.trim()
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_BUDGET_ID",
        message: "A valid budget ID is required.",
      },
    });

    return undefined;
  }

  return budgetId;
}

function handleBudgetError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted budget information.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  if (error instanceof BudgetServiceError) {
    const statusByCode = {
      CATEGORY_NOT_FOUND: 404,
      BUDGET_NOT_FOUND: 404,
      BUDGET_ALREADY_EXISTS: 409,
      INVALID_CATEGORY_TYPE: 400,
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

export async function createBudgetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = createBudgetSchema.parse(req.body);

    const budget = await createBudget(userId, input);

    res.status(201).json({
      message: "Budget created successfully.",
      data: budget,
    });
  } catch (error) {
    handleBudgetError(error, res, next);
  }
}

export async function listBudgetsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const filters = listBudgetsSchema.parse(req.query);

    const result = await listBudgets(userId, filters);

    res.status(200).json(result);
  } catch (error) {
    handleBudgetError(error, res, next);
  }
}

export async function getBudgetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const budgetId = getBudgetId(req, res);

    if (!budgetId) {
      return;
    }

    const budget = await getBudgetById(userId, budgetId);

    res.status(200).json({
      data: budget,
    });
  } catch (error) {
    handleBudgetError(error, res, next);
  }
}

export async function updateBudgetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const budgetId = getBudgetId(req, res);

    if (!budgetId) {
      return;
    }

    const input = updateBudgetSchema.parse(req.body);

    const budget = await updateBudget(
      userId,
      budgetId,
      input,
    );

    res.status(200).json({
      message: "Budget updated successfully.",
      data: budget,
    });
  } catch (error) {
    handleBudgetError(error, res, next);
  }
}

export async function deleteBudgetHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const budgetId = getBudgetId(req, res);

    if (!budgetId) {
      return;
    }

    await deleteBudget(userId, budgetId);

    res.status(200).json({
      message: "Budget deleted successfully.",
    });
  } catch (error) {
    handleBudgetError(error, res, next);
  }
}