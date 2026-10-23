import type {
  ApiResponse,
  CreateSavingsGoalInput,
  SavingsGoal,
  UpdateSavingsGoalInput,
} from "../types/api";
import api from "./app";

function assertSavingsGoal(value: SavingsGoal | undefined): SavingsGoal {
  if (
    !value ||
    typeof value !== "object" ||
    typeof value.id !== "string" ||
    typeof value.targetAmount !== "string" ||
    typeof value.currentAmount !== "string" ||
    typeof value.progressPercentage !== "number"
  ) {
    throw new Error("The savings goals API returned an unexpected goal response.");
  }
  return value;
}

export async function listSavingsGoals(): Promise<SavingsGoal[]> {
  const response = await api.get<{ data: SavingsGoal[]; total: number }>(
    "/savings-goals",
  );
  if (!Array.isArray(response.data?.data)) {
    throw new Error("The savings goals API returned an unexpected list response.");
  }
  return response.data.data;
}

export async function createSavingsGoal(
  input: CreateSavingsGoalInput,
): Promise<SavingsGoal> {
  const response = await api.post<ApiResponse<SavingsGoal>>(
    "/savings-goals",
    input,
  );
  return assertSavingsGoal(response.data?.data);
}

export async function updateSavingsGoal(
  id: string,
  input: UpdateSavingsGoalInput,
): Promise<SavingsGoal> {
  const response = await api.patch<ApiResponse<SavingsGoal>>(
    `/savings-goals/${encodeURIComponent(id)}`,
    input,
  );
  return assertSavingsGoal(response.data?.data);
}

export async function deleteSavingsGoal(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(
    `/savings-goals/${encodeURIComponent(id)}`,
  );
  if (typeof response.data?.message !== "string") {
    throw new Error("The savings goals API returned an unexpected delete response.");
  }
}
