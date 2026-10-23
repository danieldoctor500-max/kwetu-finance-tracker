import type {
  ApiResponse,
  Category,
  TransactionType,
} from "../types/api";
import api from "./app";

export interface CategorySuggestion {
  name: string;
  type: TransactionType;
}

export async function createCategory(input: {
  name: string;
  type: TransactionType;
}): Promise<Category> {
  const response = await api.post<ApiResponse<Category>>("/categories", input);
  return assertCategory(response.data?.data);
}

function assertCategory(category: Category | undefined): Category {
  if (
    !category ||
    typeof category !== "object" ||
    typeof category.id !== "string" ||
    typeof category.name !== "string" ||
    (category.type !== "INCOME" && category.type !== "EXPENSE")
  ) {
    throw new Error("The categories API returned an unexpected category response.");
  }

  return category;
}

export async function listCategories(
  type?: TransactionType,
): Promise<Category[]> {
  const response = await api.get<ApiResponse<Category[]> & { total: number }>(
    "/categories",
    { params: type ? { type } : {} },
  );

  if (!Array.isArray(response.data?.data)) {
    throw new Error("The categories API returned an unexpected list response.");
  }

  return response.data.data;
}

export async function listCategorySuggestions(): Promise<CategorySuggestion[]> {
  const response = await api.get<ApiResponse<CategorySuggestion[]> & { total: number }>(
    "/categories/suggestions",
  );

  if (!Array.isArray(response.data?.data)) {
    throw new Error("The category suggestions API returned an unexpected list response.");
  }

  return response.data.data;
}

export async function updateCategoryName(
  id: string,
  name: string,
): Promise<Category> {
  const response = await api.patch<ApiResponse<Category>>(
    `/categories/${encodeURIComponent(id)}`,
    { name },
  );
  return assertCategory(response.data?.data);
}

export async function deleteCategory(id: string): Promise<void> {
  const response = await api.delete<{ message: string }>(
    `/categories/${encodeURIComponent(id)}`,
  );
  if (typeof response.data?.message !== "string") {
    throw new Error("The categories API returned an unexpected delete response.");
  }
}
