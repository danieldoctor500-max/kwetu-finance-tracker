import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import { dashboardSummarySchema } from "./dashboard.schemas";
import { getDashboardSummary } from "./dashboard.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error(
      "Authenticated user was not attached to the request.",
    );
  }

  return req.user.id;
}

export async function getDashboardSummaryHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const filters = dashboardSummarySchema.parse(req.query);

    const result = await getDashboardSummary(userId, filters);

    res.status(200).json({
      message: "Dashboard summary retrieved successfully.",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the supplied date filters.",
          details: error.issues.map((issue) => ({
            field: issue.path.join("."),
            message: issue.message,
          })),
        },
      });

      return;
    }

    next(error);
  }
}