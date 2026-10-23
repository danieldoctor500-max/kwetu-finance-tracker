import type {
  ErrorRequestHandler,
  Request,
  Response,
} from "express";

export function notFoundHandler(
  _req: Request,
  res: Response,
): void {
  res.status(404).json({
    error: {
      code: "ROUTE_NOT_FOUND",
      message: "The requested API endpoint does not exist.",
    },
  });
}

export const errorHandler: ErrorRequestHandler = (
  error: unknown,
  _req,
  res: Response,
  _next,
): void => {
  if (res.headersSent) {
    return;
  }

  console.error(
    "Unhandled application error:",
    error instanceof Error
      ? error.message
      : "Unknown error",
  );

  res.status(500).json({
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An unexpected server error occurred.",
    },
  });
};