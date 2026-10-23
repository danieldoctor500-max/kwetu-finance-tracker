import api from "./app";
import type {
  AdminAuditEvent,
  AdminOverview,
  AdminUser,
  AdminUsersResponse,
  IssueReport,
  PlatformCategoryTemplate,
  PlatformSettings,
  TransactionType,
} from "../types/api";

export async function getAdminOverview(): Promise<AdminOverview> {
  const response = await api.get<AdminOverview>("/admin/overview");
  return response.data;
}

export async function getAdminUsers(search = "", page = 1): Promise<AdminUsersResponse> {
  const response = await api.get<AdminUsersResponse>("/admin/users", {
    params: { search: search || undefined, page, limit: 25 },
  });
  return response.data;
}

export async function updateAdminUserStatus(
  id: string,
  isActive: boolean,
): Promise<AdminUser> {
  const response = await api.patch<{ data: AdminUser }>(`/admin/users/${id}/status`, {
    isActive,
  });
  return response.data.data;
}

export async function getCategoryTemplates(): Promise<PlatformCategoryTemplate[]> {
  const response = await api.get<{ data: PlatformCategoryTemplate[] }>("/admin/categories");
  return response.data.data;
}

export async function createCategoryTemplate(input: {
  name: string;
  type: TransactionType;
}): Promise<PlatformCategoryTemplate> {
  const response = await api.post<{ data: PlatformCategoryTemplate }>("/admin/categories", input);
  return response.data.data;
}

export async function updateCategoryTemplate(
  id: string,
  input: Partial<Pick<PlatformCategoryTemplate, "name" | "type" | "isActive">>,
): Promise<PlatformCategoryTemplate> {
  const response = await api.patch<{ data: PlatformCategoryTemplate }>(
    `/admin/categories/${id}`,
    input,
  );
  return response.data.data;
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const response = await api.get<{ data: PlatformSettings }>("/admin/settings");
  return response.data.data;
}

export async function updatePlatformSettings(
  input: PlatformSettings,
): Promise<PlatformSettings> {
  const response = await api.patch<{ data: PlatformSettings }>("/admin/settings", input);
  return response.data.data;
}

export async function getAdminAuditEvents(): Promise<AdminAuditEvent[]> {
  const response = await api.get<{ data: AdminAuditEvent[] }>("/admin/audit-events");
  return response.data.data;
}

export async function getIssueReports(): Promise<IssueReport[]> {
  const response = await api.get<{ data: IssueReport[] }>("/admin/issues");
  return response.data.data;
}

export async function updateIssueReport(
  id: string,
  input: Pick<IssueReport, "status" | "adminNote">,
): Promise<Pick<IssueReport, "id" | "status" | "adminNote" | "updatedAt">> {
  const response = await api.patch<{
    data: Pick<IssueReport, "id" | "status" | "adminNote" | "updatedAt">;
  }>(`/admin/issues/${id}`, input);
  return response.data.data;
}

export async function createIssueReport(input: {
  subject: string;
  description: string;
}): Promise<{ id: string; subject: string; status: IssueReport["status"]; createdAt: string }> {
  const response = await api.post<{
    data: { id: string; subject: string; status: IssueReport["status"]; createdAt: string };
  }>("/issues", input);
  return response.data.data;
}
