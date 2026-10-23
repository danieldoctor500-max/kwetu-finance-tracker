import type { ApiResponse, DashboardSummary } from "../types/api";
import api from "./app";

export interface DashboardFilters {
  from?: string;
  to?: string;
}

export async function getDashboardSummary(
  filters: DashboardFilters = {},
): Promise<DashboardSummary> {
  const response = await api.get<ApiResponse<DashboardSummary>>(
    "/dashboard/summary",
    { params: filters },
  );

  const summary = response.data?.data;
  if (
    !summary ||
    typeof summary !== "object" ||
    !summary.summary ||
    typeof summary.summary.balance !== "string" ||
    typeof summary.summary.totalIncome !== "string" ||
    typeof summary.summary.totalExpenses !== "string"
  ) {
    throw new Error("The dashboard API returned an unexpected summary response.");
  }

  return summary;
}
