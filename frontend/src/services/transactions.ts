import type {
  ApiResponse,
  CreateTransactionInput,
  Transaction,
  TransactionFilters,
  TransactionListResponse,
  TransactionQualityRecord,
  TransactionQualityResponse,
  UpdateTransactionInput,
} from "../types/api";
import api from "./app";

function isQualityTransaction(value: unknown): value is TransactionQualityRecord {
  if (!value || typeof value !== "object") return false;
  const transaction = value as Record<string, unknown>;
  const category = transaction.category;
  return (
    typeof transaction.id === "string" &&
    (transaction.type === "INCOME" || transaction.type === "EXPENSE") &&
    typeof transaction.categoryId === "string" &&
    typeof transaction.amount === "string" &&
    typeof transaction.occurredAt === "string" &&
    (transaction.description === null || typeof transaction.description === "string") &&
    (transaction.merchant === null || typeof transaction.merchant === "string") &&
    Boolean(category) &&
    typeof category === "object" &&
    typeof (category as Record<string, unknown>).id === "string" &&
    typeof (category as Record<string, unknown>).name === "string" &&
    ((category as Record<string, unknown>).type === "INCOME" ||
      (category as Record<string, unknown>).type === "EXPENSE")
  );
}

export async function listTransactions(
  filters: TransactionFilters = {},
): Promise<TransactionListResponse> {
  const response = await api.get<TransactionListResponse>("/transactions", {
    params: filters,
  });

  if (
    !Array.isArray(response.data?.data) ||
    !response.data.pagination ||
    typeof response.data.pagination.total !== "number"
  ) {
    throw new Error("The transactions API returned an unexpected list response.");
  }

  return response.data;
}

export async function getTransactionQuality(): Promise<TransactionQualityResponse> {
  const response = await api.get<TransactionQualityResponse>("/transactions/quality");
  const result: unknown = response.data;
  if (!result || typeof result !== "object") {
    throw new Error("The transaction quality API returned an unexpected response.");
  }

  const quality = result as Record<string, unknown>;
  const summary = quality.summary;
  const duplicates = quality.duplicates;
  if (
    !summary ||
    typeof summary !== "object" ||
    !duplicates ||
    !Array.isArray(duplicates)
  ) {
    throw new Error("The transaction quality API returned an unexpected response.");
  }

  const counts = summary as Record<string, unknown>;
  if (
    typeof counts.totalTransactions !== "number" ||
    typeof counts.categorizedTransactions !== "number" ||
    typeof counts.datedTransactions !== "number" ||
    !duplicates.every(
      (group) =>
        Boolean(group) &&
        typeof group === "object" &&
        typeof (group as Record<string, unknown>).key === "string" &&
        Array.isArray((group as Record<string, unknown>).transactions) &&
        ((group as Record<string, unknown>).transactions as unknown[]).every(isQualityTransaction),
    )
  ) {
    throw new Error("The transaction quality API returned an unexpected response.");
  }

  return response.data;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<Transaction> {
  const response = await api.post<ApiResponse<Transaction>>(
    "/transactions",
    input,
  );

  const transaction = response.data?.data;
  if (
    !transaction ||
    typeof transaction !== "object" ||
    typeof transaction.id !== "string" ||
    typeof transaction.amount !== "string"
  ) {
    throw new Error("The transactions API returned an unexpected transaction response.");
  }

  return transaction;
}

export async function updateTransaction(
  id: string,
  input: UpdateTransactionInput,
): Promise<Transaction> {
  const response = await api.patch<ApiResponse<Transaction>>(
    `/transactions/${encodeURIComponent(id)}`,
    input,
  );
  const transaction = response.data?.data;
  if (
    !transaction ||
    typeof transaction !== "object" ||
    typeof transaction.id !== "string" ||
    typeof transaction.amount !== "string"
  ) {
    throw new Error("The transactions API returned an unexpected transaction response.");
  }

  return transaction;
}

export async function deleteTransaction(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(
    `/transactions/${encodeURIComponent(id)}`,
  );
  if (typeof response.data?.message !== "string") {
    throw new Error("The transactions API returned an unexpected delete response.");
  }
}
