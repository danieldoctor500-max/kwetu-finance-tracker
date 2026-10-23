import { Router, type NextFunction, type Request, type Response } from "express";
import { requireAdmin, requireAuth } from "../../middleware/auth.middleware";
import {
  adminOverviewHandler,
  createCategoryTemplateHandler,
  getAdminSettingsHandler,
  listAdminAuditEventsHandler,
  listAdminUsersHandler,
  listCategoryTemplatesHandler,
  listIssueReportsHandler,
  updateAdminSettingsHandler,
  updateAdminUserStatusHandler,
  updateCategoryTemplateHandler,
  updateIssueReportHandler,
} from "./admin.controller";
import { recordAdminAuditEvent } from "./admin.service";

const router = Router();

async function auditAdminAccess(req: Request, _res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== "ADMIN") {
    next(new Error("Administrator was not attached to the request."));
    return;
  }
  try {
    const resource = req.path.split("/").filter(Boolean)[0] ?? "overview";
    await recordAdminAuditEvent(req.user.id, "ADMIN_ACCESS", {
      method: req.method,
      resource,
    });
    next();
  } catch (error) {
    next(error);
  }
}

router.use(requireAuth, requireAdmin, auditAdminAccess);

router.get("/overview", adminOverviewHandler);
router.get("/users", listAdminUsersHandler);
router.patch("/users/:id/status", updateAdminUserStatusHandler);

router.get("/categories", listCategoryTemplatesHandler);
router.post("/categories", createCategoryTemplateHandler);
router.patch("/categories/:id", updateCategoryTemplateHandler);

router.get("/settings", getAdminSettingsHandler);
router.patch("/settings", updateAdminSettingsHandler);

router.get("/audit-events", listAdminAuditEventsHandler);
router.get("/issues", listIssueReportsHandler);
router.patch("/issues/:id", updateIssueReportHandler);

export default router;
