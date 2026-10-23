import { Router, type NextFunction, type Request, type Response } from "express";
import { ZodError } from "zod";
import { requireAuth } from "../../middleware/auth.middleware";
import { createIssueReportSchema } from "./admin.schemas";
import { createIssueReport } from "./admin.service";

const router = Router();

router.use(requireAuth);

router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      res.status(401).json({
        error: { code: "AUTHENTICATION_REQUIRED", message: "Please log in to report an issue." },
      });
      return;
    }
    const input = createIssueReportSchema.parse(req.body);
    const result = await createIssueReport(req.user.id, input);
    res.status(201).json({ data: result });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the issue report.",
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
});

export default router;
