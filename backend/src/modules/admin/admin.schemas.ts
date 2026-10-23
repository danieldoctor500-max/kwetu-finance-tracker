import { z } from "zod";

export const listUsersSchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
}).strict();

export const createCategoryTemplateSchema = z.object({
  name: z.string().trim().min(2).max(80),
  type: z.enum(["INCOME", "EXPENSE"]),
}).strict();

export const updateCategoryTemplateSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  type: z.enum(["INCOME", "EXPENSE"]).optional(),
  isActive: z.boolean().optional(),
}).strict().refine(
  (value) => Object.values(value).some((item) => item !== undefined),
  { message: "Provide at least one category template field to update." },
);

export const updatePlatformSettingsSchema = z.object({
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().trim().min(5).max(240).optional(),
}).strict().refine(
  (value) => Object.values(value).some((item) => item !== undefined),
  { message: "Provide at least one platform setting to update." },
);

export const listAdminEventsSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
}).strict();

export const createIssueReportSchema = z.object({
  subject: z.string().trim().min(4).max(160),
  description: z.string().trim().min(10).max(2000),
}).strict();

export const updateIssueReportSchema = z.object({
  status: z.enum(["OPEN", "IN_PROGRESS", "RESOLVED"]).optional(),
  adminNote: z.string().trim().max(1000).nullable().optional(),
}).strict().refine(
  (value) => Object.values(value).some((item) => item !== undefined),
  { message: "Provide a report status or note to update." },
);
