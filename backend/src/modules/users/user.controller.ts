import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { updateUserSchema } from "./user.schemas";
import { getUserProfile, updateUserProfile, UserServiceError } from "./user.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error("Authenticated user was not attached to the request.");
  }
  return req.user.id;
}

function handleUserError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted user settings.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof UserServiceError) {
    res.status(error.code === "USER_NOT_FOUND" ? 404 : 409).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}

export async function getCurrentUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const user = await getUserProfile(getAuthenticatedUserId(req));
    res.status(200).json({ user });
  } catch (error) {
    handleUserError(error, res, next);
  }
}

export async function updateCurrentUserProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = updateUserSchema.parse(req.body);
    const user = await updateUserProfile(userId, input);
    res.status(200).json({
      message: "User profile updated successfully.",
      user,
    });
  } catch (error) {
    handleUserError(error, res, next);
  }
}
