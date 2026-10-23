import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  createCategoryTemplateSchema,
  listAdminEventsSchema,
  listUsersSchema,
  updateCategoryTemplateSchema,
  updateIssueReportSchema,
  updatePlatformSettingsSchema,
  updateUserStatusSchema,
} from "./admin.schemas";
import {
  AdminServiceError,
  createCategoryTemplate,
  getAdminOverview,
  getPlatformSettings,
  listAdminAuditEvents,
  listAdminUsers,
  listCategoryTemplates,
  listIssueReports,
  updateCategoryTemplate,
  updateIssueReport,
  updatePlatformSettings,
  updateUserStatus,
} from "./admin.service";

function authenticatedAdminId(req: Request): string {
  if (!req.user || req.user.role !== "ADMIN") {
    throw new Error("Administrator was not attached to the request.");
  }
  return req.user.id;
}

function sendError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted platform data.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }
  if (error instanceof AdminServiceError) {
    const status = error.code === "USER_NOT_FOUND" ||
      error.code === "CATEGORY_TEMPLATE_NOT_FOUND" ||
      error.code === "ISSUE_REPORT_NOT_FOUND"
      ? 404
      : error.code === "CATEGORY_TEMPLATE_EXISTS"
        ? 409
        : 400;
    res.status(status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }
  next(error);
}

function getId(req: Request, res: Response): string | null {
  const id = req.params.id;
  if (typeof id === "string" && id.trim()) return id;
  res.status(400).json({
    error: { code: "INVALID_RESOURCE_ID", message: "A valid resource ID is required." },
  });
  return null;
}

export async function adminOverviewHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await getAdminOverview();
    res.status(200).json(result);
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function listAdminUsersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listAdminUsers(listUsersSchema.parse(req.query)));
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function updateAdminUserStatusHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req, res);
    if (!id) return;
    const input = updateUserStatusSchema.parse(req.body);
    const result = await updateUserStatus(authenticatedAdminId(req), id, input.isActive);
    res.status(200).json({ data: result });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function listCategoryTemplatesHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await listCategoryTemplates() });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function createCategoryTemplateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await createCategoryTemplate(
      authenticatedAdminId(req),
      createCategoryTemplateSchema.parse(req.body),
    );
    res.status(201).json({ data: result });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function updateCategoryTemplateHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req, res);
    if (!id) return;
    const result = await updateCategoryTemplate(
      authenticatedAdminId(req),
      id,
      updateCategoryTemplateSchema.parse(req.body),
    );
    res.status(200).json({ data: result });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function getAdminSettingsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await getPlatformSettings() });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function updateAdminSettingsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await updatePlatformSettings(
      authenticatedAdminId(req),
      updatePlatformSettingsSchema.parse(req.body),
    );
    res.status(200).json({ data: result });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function listAdminAuditEventsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const query = listAdminEventsSchema.parse(req.query);
    res.status(200).json({ data: await listAdminAuditEvents(query) });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function listIssueReportsHandler(_req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json({ data: await listIssueReports() });
  } catch (error) {
    sendError(error, res, next);
  }
}

export async function updateIssueReportHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = getId(req, res);
    if (!id) return;
    const result = await updateIssueReport(
      authenticatedAdminId(req),
      id,
      updateIssueReportSchema.parse(req.body),
    );
    res.status(200).json({ data: result });
  } catch (error) {
    sendError(error, res, next);
  }
}
