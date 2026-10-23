import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { prisma } from "../lib/prisma";
import { verifyAccessToken } from "../utils/jwt";

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authorization = req.headers.authorization;

  const bearerToken = authorization?.startsWith("Bearer ")
    ? authorization.slice(7).trim()
    : undefined;

  const token = req.cookies?.kwetu_access_token ?? bearerToken;

  if (!token) {
    res.status(401).json({
      error: {
        code: "AUTHENTICATION_REQUIRED",
        message: "Please log in to access this resource.",
      },
    });
    return;
  }

  let payload: ReturnType<typeof verifyAccessToken>;
  try {
    payload = verifyAccessToken(token);
  } catch {
    res.status(401).json({
      error: {
        code: "INVALID_OR_EXPIRED_TOKEN",
        message:
          "Your session is invalid or has expired. Please log in again.",
      },
    });
    return;
  }

  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, role: true, isActive: true },
    });
    if (!currentUser || !currentUser.isActive) {
      res.status(401).json({
        error: {
          code: "ACCOUNT_INACTIVE",
          message: "This account is not active. Contact support if you need help.",
        },
      });
      return;
    }

    req.user = {
      id: currentUser.id,
      email: currentUser.email,
      role: currentUser.role,
    };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.user?.role !== "ADMIN") {
    res.status(403).json({
      error: {
        code: "ADMIN_ACCESS_REQUIRED",
        message: "Administrator access is required for this resource.",
      },
    });
    return;
  }
  next();
}