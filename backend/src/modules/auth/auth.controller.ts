import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";
import { env } from "../../config/env";
import {
  AuthError,
  authenticateUser,
  changeUserPassword,
  findUserById,
  registerUser,
  updateUserProfile,
} from "./auth.service";
import {
  changePasswordSchema,
  loginSchema,
  registerSchema,
  updateProfileSchema,
} from "./auth.schemas";
import { signAccessToken } from "../../utils/jwt";
import { recordAdminAuditEvent } from "../admin/admin.service";
import { getAccessCookieOptions } from "./auth.cookie";

const ACCESS_COOKIE_NAME = "kwetu_access_token";

const cookieOptions = getAccessCookieOptions(env.NODE_ENV);

function setAccessCookie(
  res: Response,
  token: string,
): void {
  res.cookie(ACCESS_COOKIE_NAME, token, cookieOptions);
}

function clearAccessCookie(res: Response): void {
  res.clearCookie(ACCESS_COOKIE_NAME, {
    httpOnly: true,
    secure: cookieOptions.secure,
    sameSite: "lax",
    path: "/",
  });
}

function handleAuthError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted information.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof AuthError) {
    if (error.code === "EMAIL_EXISTS") {
      res.status(409).json({
        error: {
          code: error.code,
          message: error.message,
        },
      });
      return;
    }

    const status = error.code === "INVALID_CREDENTIALS"
      ? 401
      : error.code === "ACCOUNT_INACTIVE"
        ? 403
        : 400;
    res.status(status).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });
    return;
  }

  next(error);
}

export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = registerSchema.parse(req.body);
    const user = await registerUser(input);

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    setAccessCookie(res, token);

    res.status(201).json({
      message: "Account created successfully.",
      user,
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const input = loginSchema.parse(req.body);
    const user = await authenticateUser(input);
    if (user.role === "ADMIN") {
      await recordAdminAuditEvent(user.id, "ADMIN_LOGIN");
    }

    const token = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    setAccessCookie(res, token);

    res.status(200).json({
      message: "Login successful.",
      user,
    });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function updateProfile(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Please log in to access this resource.",
        },
      });
      return;
    }

    const input = updateProfileSchema.parse(req.body);
    const user = await updateUserProfile(req.user.id, input);
    res.status(200).json({ user });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export async function changePassword(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Please log in to access this resource.",
        },
      });
      return;
    }

    const input = changePasswordSchema.parse(req.body);
    await changeUserPassword(req.user.id, input);
    res.status(200).json({ message: "Password updated successfully." });
  } catch (error) {
    handleAuthError(error, res, next);
  }
}

export function logout(
  _req: Request,
  res: Response,
): void {
  clearAccessCookie(res);

  res.status(200).json({
    message: "Logout successful.",
  });
}

export function getCurrentUser(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource.",
      },
    });
    return;
  }

  void findUserById(req.user.id)
    .then((user) => {
      if (!user) {
        clearAccessCookie(res);
        res.status(401).json({
          error: {
            code: "AUTHENTICATION_REQUIRED",
            message: "Please log in to access this resource.",
          },
        });
        return;
      }

      res.status(200).json({ user });
    })
    .catch(next);
}