
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";

import {
  createSavingsGoalSchema,
  listSavingsGoalsSchema,
  updateSavingsGoalSchema,
} from "./savings-goal.schemas";

import {
  createSavingsGoal,
  deleteSavingsGoal,
  getSavingsGoalById,
  listSavingsGoals,
  SavingsGoalServiceError,
  updateSavingsGoal,
} from "./savings-goal.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user?.id) {
    throw new Error("Authenticated user ID is missing.");
  }

  return req.user.id;
}

function getGoalId(req: Request): string {
  const { id } = req.params;

  if (typeof id !== "string") {
    throw new Error("A valid savings goal ID is required.");
  }

  return id;
}

function handleError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "The request contains invalid data.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof SavingsGoalServiceError) {
    const statusByCode: Record<string, number> = {
      SAVINGS_GOAL_NOT_FOUND: 404,
      INVALID_SAVINGS_GOAL_AMOUNT: 400,
      INVALID_SAVINGS_GOAL_STATUS: 400,
    };

    res.status(statusByCode[error.code] ?? 400).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}

export async function createSavingsGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = createSavingsGoalSchema.parse(req.body);
    const userId = getAuthenticatedUserId(req);

    const goal = await createSavingsGoal(userId, input);

    res.status(201).json({
      message: "Savings goal created successfully.",
      data: goal,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function listSavingsGoalsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const filters = listSavingsGoalsSchema.parse(req.query);
    const userId = getAuthenticatedUserId(req);

    const result = await listSavingsGoals(userId, filters);

    res.status(200).json(result);
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function getSavingsGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const goalId = getGoalId(req);

    const goal = await getSavingsGoalById(userId, goalId);

    res.status(200).json({
      data: goal,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateSavingsGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = updateSavingsGoalSchema.parse(req.body);
    const userId = getAuthenticatedUserId(req);
    const goalId = getGoalId(req);

    const goal = await updateSavingsGoal(userId, goalId, input);

    res.status(200).json({
      message: "Savings goal updated successfully.",
      data: goal,
    });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function deleteSavingsGoalHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const goalId = getGoalId(req);

    await deleteSavingsGoal(userId, goalId);

    res.status(200).json({
      message: "Savings goal deleted successfully.",
    });
  } catch (error) {
    handleError(error, res, next);
  }
}
