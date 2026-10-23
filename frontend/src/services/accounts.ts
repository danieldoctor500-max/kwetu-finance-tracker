import type {
  ApiResponse,
  FinancialAccount,
  FinancialAccountType,
  Transfer,
} from "../types/api";
import api from "./app";

export interface CreateAccountInput {
  name: string;
  type: FinancialAccountType;
  provider?: string;
  openingBalance: string;
}

export interface UpdateAccountInput {
  name?: string;
  type?: FinancialAccountType;
  provider?: string | null;
  openingBalance?: string;
}

export interface CreateTransferInput {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  description?: string;
  occurredAt?: string;
}

export async function listAccounts(): Promise<{
  data: FinancialAccount[];
  total: number;
  totalBalance: string;
  currency: "KES";
}> {
  const response = await api.get("/accounts");
  const result = response.data;
  if (
    !Array.isArray(result?.data) ||
    typeof result.total !== "number" ||
    typeof result.totalBalance !== "string" ||
    result.currency !== "KES"
  ) {
    throw new Error("The accounts API returned an unexpected response.");
  }
  return result;
}

export async function createAccount(input: CreateAccountInput): Promise<FinancialAccount> {
  const response = await api.post<ApiResponse<FinancialAccount>>("/accounts", input);
  if (!response.data?.data || typeof response.data.data.id !== "string") {
    throw new Error("The account API returned an unexpected response.");
  }
  return response.data.data;
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
): Promise<FinancialAccount> {
  const response = await api.patch<ApiResponse<FinancialAccount>>(
    `/accounts/${encodeURIComponent(id)}`,
    input,
  );
  if (!response.data?.data || typeof response.data.data.id !== "string") {
    throw new Error("The account API returned an unexpected response.");
  }
  return response.data.data;
}

export async function deleteAccount(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(`/accounts/${encodeURIComponent(id)}`);
  if (typeof response.data?.message !== "string") {
    throw new Error("The account API returned an unexpected delete response.");
  }
}

export async function createTransfer(input: CreateTransferInput): Promise<Transfer> {
  const response = await api.post<ApiResponse<Transfer>>("/transfers", input);
  if (!response.data?.data || typeof response.data.data.id !== "string") {
    throw new Error("The transfer API returned an unexpected response.");
  }
  return response.data.data;
}

export async function listTransfers(): Promise<Transfer[]> {
  const response = await api.get<{ data: Transfer[]; total: number }>("/transfers");
  if (!Array.isArray(response.data?.data) || typeof response.data.total !== "number") {
    throw new Error("The transfers API returned an unexpected response.");
  }
  return response.data.data;
}

export async function deleteTransfer(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(`/transfers/${encodeURIComponent(id)}`);
  if (typeof response.data?.message !== "string") {
    throw new Error("The transfer API returned an unexpected delete response.");
  }
}
