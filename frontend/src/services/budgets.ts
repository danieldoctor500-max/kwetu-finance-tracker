import type {
  ApiResponse,
  Budget,
  CreateBudgetInput,
} from "../types/api";
import api from "./app";

function assertBudget(value: Budget | undefined): Budget {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.id !== "string" ||
    typeof value.amount !== "string" ||
    typeof value.spent !== "string" ||
    !value.category
  ) {
    throw new Error("The budgets API returned an unexpected budget response.");
  }
  return value;
}

export async function listBudgets(month?: string): Promise<Budget[]> {
  const response = await api.get<{ data: Budget[]; total: number }>("/budgets", {
    params: month ? { month } : {},
  });
  if (!Array.isArray(response.data?.data)) {
    throw new Error("The budgets API returned an unexpected list response.");
  }
  return response.data.data;
}

export async function createBudget(input: CreateBudgetInput): Promise<Budget> {
  const response = await api.post<ApiResponse<Budget>>("/budgets", input);
  return assertBudget(response.data?.data);
}

export async function updateBudget(
  id: string,
  amount: string,
): Promise<Budget> {
  const response = await api.patch<ApiResponse<Budget>>(
    `/budgets/${encodeURIComponent(id)}`,
    { amount },
  );
  return assertBudget(response.data?.data);
}

export async function deleteBudget(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(
    `/budgets/${encodeURIComponent(id)}`,
  );
  if (typeof response.data?.message !== "string") {
    throw new Error("The budgets API returned an unexpected delete response.");
  }
}
