import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { updateMaintenanceSettingsCache } from "../../middleware/maintenance.middleware";
import type {
  createCategoryTemplateSchema,
  createIssueReportSchema,
  listAdminEventsSchema,
  listUsersSchema,
  updateCategoryTemplateSchema,
  updateIssueReportSchema,
  updatePlatformSettingsSchema,
} from "./admin.schemas";

type ListUsersInput = typeof listUsersSchema._output;
type CreateTemplateInput = typeof createCategoryTemplateSchema._output;
type UpdateTemplateInput = typeof updateCategoryTemplateSchema._output;
type UpdateSettingsInput = typeof updatePlatformSettingsSchema._output;
type CreateIssueInput = typeof createIssueReportSchema._output;
type UpdateIssueInput = typeof updateIssueReportSchema._output;
type ListEventsInput = typeof listAdminEventsSchema._output;

export class AdminServiceError extends Error {
  constructor(
    public readonly code:
      | "USER_NOT_FOUND"
      | "SELF_SUSPENSION_NOT_ALLOWED"
      | "LAST_ADMIN_NOT_ALLOWED"
      | "CATEGORY_TEMPLATE_NOT_FOUND"
      | "CATEGORY_TEMPLATE_EXISTS"
      | "ISSUE_REPORT_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AdminServiceError";
  }
}

export async function recordAdminAuditEvent(
  actorUserId: string,
  action: string,
  metadata: Record<string, string | number | boolean | null> = {},
  targetUserId?: string,
): Promise<void> {
  await prisma.adminAuditEvent.create({
    data: {
      actorUserId,
      action,
      ...(targetUserId ? { targetUserId } : {}),
      metadata,
    },
  });
}

export async function getAdminOverview() {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    totalUsers,
    activeUsers,
    newUsersThisMonth,
    totalTransactions,
    totalAccounts,
    openIssues,
    database,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { createdAt: { gte: monthStart } } }),
    prisma.transaction.count(),
    prisma.financialAccount.count(),
    prisma.issueReport.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.$queryRaw`SELECT 1`,
  ]);
  void database;

  return {
    statistics: {
      totalUsers,
      activeUsers,
      suspendedUsers: totalUsers - activeUsers,
      newUsersThisMonth,
      transactionRecords: totalTransactions,
      trackedAccounts: totalAccounts,
      openIssues,
    },
    health: {
      api: "operational" as const,
      database: "connected" as const,
      uptimeSeconds: Math.floor(process.uptime()),
      checkedAt: new Date().toISOString(),
    },
  };
}

export async function listAdminUsers(input: ListUsersInput) {
  const where: Prisma.UserWhereInput = input.search
    ? {
        OR: [
          { fullName: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ],
      }
    : {};
  const [users, total] = await prisma.$transaction([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: [{ createdAt: "desc" }],
      skip: (input.page - 1) * input.limit,
      take: input.limit,
    }),
    prisma.user.count({ where }),
  ]);
  return {
    data: users,
    pagination: {
      page: input.page,
      limit: input.limit,
      total,
      totalPages: Math.ceil(total / input.limit),
    },
  };
}

export async function updateUserStatus(
  actorUserId: string,
  targetUserId: string,
  isActive: boolean,
) {
  if (actorUserId === targetUserId && !isActive) {
    throw new AdminServiceError(
      "SELF_SUSPENSION_NOT_ALLOWED",
      "You cannot suspend your own administrator account.",
    );
  }
  const target = await prisma.$transaction(async (transaction) => {
    const existing = await transaction.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!existing) {
      throw new AdminServiceError("USER_NOT_FOUND", "The account was not found.");
    }
    if (!isActive && existing.role === "ADMIN" && existing.isActive) {
      const activeAdmins = await transaction.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new AdminServiceError(
          "LAST_ADMIN_NOT_ALLOWED",
          "The last active administrator cannot be suspended.",
        );
      }
    }
    await transaction.user.update({
      where: { id: targetUserId },
      data: { isActive },
      select: { id: true },
    });
    return existing;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  await recordAdminAuditEvent(
    actorUserId,
    isActive ? "USER_REACTIVATED" : "USER_SUSPENDED",
    { email: target.email },
    targetUserId,
  );
  return { ...target, isActive };
}

export async function listCategoryTemplates() {
  return prisma.platformCategoryTemplate.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
}

export async function createCategoryTemplate(
  actorUserId: string,
  input: CreateTemplateInput,
) {
  try {
    const template = await prisma.platformCategoryTemplate.create({
      data: input,
    });
    await recordAdminAuditEvent(actorUserId, "CATEGORY_TEMPLATE_CREATED", {
      name: template.name,
      type: template.type,
    });
    return template;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AdminServiceError(
        "CATEGORY_TEMPLATE_EXISTS",
        "A shared template with this name and type already exists.",
      );
    }
    throw error;
  }
}

export async function updateCategoryTemplate(
  actorUserId: string,
  id: string,
  input: UpdateTemplateInput,
) {
  const existing = await prisma.platformCategoryTemplate.findUnique({ where: { id } });
  if (!existing) {
    throw new AdminServiceError(
      "CATEGORY_TEMPLATE_NOT_FOUND",
      "The shared category template was not found.",
    );
  }
  try {
    const template = await prisma.platformCategoryTemplate.update({
      where: { id },
      data: input,
    });
    await recordAdminAuditEvent(actorUserId, "CATEGORY_TEMPLATE_UPDATED", {
      name: template.name,
      type: template.type,
      isActive: template.isActive,
    });
    return template;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AdminServiceError(
        "CATEGORY_TEMPLATE_EXISTS",
        "A shared template with this name and type already exists.",
      );
    }
    throw error;
  }
}

export async function getPlatformSettings() {
  const rows = await prisma.platformSetting.findMany({
    where: { key: { in: ["maintenanceMode", "maintenanceMessage"] } },
  });
  const values = new Map(rows.map(({ key, value }) => [key, value]));
  const maintenanceMode = values.get("maintenanceMode");
  const maintenanceMessage = values.get("maintenanceMessage");
  return {
    maintenanceMode: maintenanceMode === true,
    maintenanceMessage:
      typeof maintenanceMessage === "string"
        ? maintenanceMessage
        : "Kwetu is temporarily unavailable while we carry out maintenance.",
  };
}

export async function updatePlatformSettings(
  actorUserId: string,
  input: UpdateSettingsInput,
) {
  const previous = await getPlatformSettings();
  const next = {
    maintenanceMode: input.maintenanceMode ?? previous.maintenanceMode,
    maintenanceMessage: input.maintenanceMessage ?? previous.maintenanceMessage,
  };
  await prisma.$transaction([
    prisma.platformSetting.upsert({
      where: { key: "maintenanceMode" },
      create: { key: "maintenanceMode", value: next.maintenanceMode },
      update: { value: next.maintenanceMode },
    }),
    prisma.platformSetting.upsert({
      where: { key: "maintenanceMessage" },
      create: { key: "maintenanceMessage", value: next.maintenanceMessage },
      update: { value: next.maintenanceMessage },
    }),
  ]);
  updateMaintenanceSettingsCache({
    enabled: next.maintenanceMode,
    message: next.maintenanceMessage,
  });
  await recordAdminAuditEvent(actorUserId, "PLATFORM_SETTINGS_UPDATED", {
    maintenanceMode: next.maintenanceMode,
  });
  return next;
}

export async function listAdminAuditEvents(input: ListEventsInput) {
  return prisma.adminAuditEvent.findMany({
    take: input.limit,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      action: true,
      metadata: true,
      createdAt: true,
      actor: { select: { id: true, fullName: true, email: true } },
      target: { select: { id: true, fullName: true, email: true } },
    },
  });
}

export async function createIssueReport(userId: string, input: CreateIssueInput) {
  return prisma.issueReport.create({
    data: { userId, ...input },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
    },
  });
}

export async function listIssueReports() {
  return prisma.issueReport.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      subject: true,
      description: true,
      status: true,
      adminNote: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          isActive: true,
        },
      },
    },
  });
}

export async function updateIssueReport(
  actorUserId: string,
  id: string,
  input: UpdateIssueInput,
) {
  const existing = await prisma.issueReport.findUnique({
    where: { id },
    select: { id: true, subject: true },
  });
  if (!existing) {
    throw new AdminServiceError(
      "ISSUE_REPORT_NOT_FOUND",
      "The issue report was not found.",
    );
  }
  const issue = await prisma.issueReport.update({
    where: { id },
    data: input,
    select: {
      id: true,
      subject: true,
      status: true,
      adminNote: true,
      updatedAt: true,
    },
  });
  await recordAdminAuditEvent(actorUserId, "ISSUE_REPORT_UPDATED", {
    reportId: issue.id,
    status: issue.status,
  });
  return issue;
}
