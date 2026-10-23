import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

import type {
  CreateCategoryInput,
  ListCategoriesInput,
  UpdateCategoryInput,
} from "./category.schemas";

export class CategoryServiceError extends Error {
  constructor(
    public readonly code:
      | "CATEGORY_NOT_FOUND"
      | "CATEGORY_NAME_EXISTS"
      | "CATEGORY_IN_USE",
    message: string,
  ) {
    super(message);
    this.name = "CategoryServiceError";
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function createCategory(
  userId: string,
  input: CreateCategoryInput,
) {
  try {
    return await prisma.category.create({
      data: {
        userId,
        name: input.name,
        type: input.type,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new CategoryServiceError(
        "CATEGORY_NAME_EXISTS",
        "A category with this name and type already exists in your account.",
      );
    }

    throw error;
  }
}

export async function listCategories(
  userId: string,
  filters: ListCategoriesInput,
) {
  return prisma.category.findMany({
    where: {
      userId,
      ...(filters.type ? { type: filters.type } : {}),
    },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          transactions: true,
          budgets: true,
        },
      },
    },
    orderBy: [
      { type: "asc" },
      { name: "asc" },
    ],
  });
}

export async function listCategorySuggestions(userId: string) {
  const [templates, categories] = await Promise.all([
    prisma.platformCategoryTemplate.findMany({
      where: { isActive: true },
      select: { name: true, type: true },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    prisma.category.findMany({
      where: { userId },
      select: { name: true, type: true },
    }),
  ]);
  const existing = new Set(
    categories.map((category) => `${category.type}:${category.name.toLocaleLowerCase()}`),
  );
  return templates.filter(
    (template) => !existing.has(`${template.type}:${template.name.toLocaleLowerCase()}`),
  );
}

export async function getCategoryById(
  userId: string,
  categoryId: string,
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      id: true,
      name: true,
      type: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          transactions: true,
          budgets: true,
        },
      },
    },
  });

  if (!category) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      "The category does not exist or is not available to your account.",
    );
  }

  return category;
}

export async function updateCategory(
  userId: string,
  categoryId: string,
  input: UpdateCategoryInput,
) {
  const existing = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      id: true,
      type: true,
    },
  });

  if (!existing) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      "The category does not exist or is not available to your account.",
    );
  }

  // Prevent changing a category's type when it already has
  // transactions or budgets, preserving financial consistency.
  if (
    input.type !== undefined &&
    input.type !== existing.type
  ) {
    const usageCount = await prisma.$transaction([
      prisma.transaction.count({
        where: {
          categoryId,
          userId,
        },
      }),
      prisma.budget.count({
        where: {
          categoryId,
          userId,
        },
      }),
    ]);

    if (usageCount.some((count) => count > 0)) {
      throw new CategoryServiceError(
        "CATEGORY_IN_USE",
        "The category type cannot be changed while transactions or budgets use it.",
      );
    }
  }

  try {
    const result = await prisma.category.updateMany({
      where: {
        id: categoryId,
        userId,
      },
      data: {
        ...(input.name !== undefined
          ? { name: input.name }
          : {}),
        ...(input.type !== undefined
          ? { type: input.type }
          : {}),
      },
    });

    if (result.count === 0) {
      throw new CategoryServiceError(
        "CATEGORY_NOT_FOUND",
        "The category does not exist or is not available to your account.",
      );
    }

    return await getCategoryById(userId, categoryId);
  } catch (error) {
    if (error instanceof CategoryServiceError) {
      throw error;
    }

    if (isUniqueConstraintError(error)) {
      throw new CategoryServiceError(
        "CATEGORY_NAME_EXISTS",
        "A category with this name and type already exists in your account.",
      );
    }

    throw error;
  }
}

export async function deleteCategory(
  userId: string,
  categoryId: string,
): Promise<void> {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      userId,
    },
    select: {
      id: true,
      _count: {
        select: {
          transactions: true,
          budgets: true,
        },
      },
    },
  });

  if (!category) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      "The category does not exist or is not available to your account.",
    );
  }

  if (
    category._count.transactions > 0 ||
    category._count.budgets > 0
  ) {
    throw new CategoryServiceError(
      "CATEGORY_IN_USE",
      "This category cannot be deleted while transactions or budgets use it.",
    );
  }

  const result = await prisma.category.deleteMany({
    where: {
      id: categoryId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new CategoryServiceError(
      "CATEGORY_NOT_FOUND",
      "The category does not exist or is not available to your account.",
    );
  }
}