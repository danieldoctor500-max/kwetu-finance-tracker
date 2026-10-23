import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

import type {
  CreateBudgetInput,
  ListBudgetsInput,
  UpdateBudgetInput,
} from "./budget.schemas";

export class BudgetServiceError extends Error {
  constructor(
    public readonly code:
      | "CATEGORY_NOT_FOUND"
      | "BUDGET_NOT_FOUND"
      | "BUDGET_ALREADY_EXISTS"
      | "INVALID_CATEGORY_TYPE",
    message: string,
  ) {
    super(message);
    this.name = "BudgetServiceError";
  }
}

const budgetInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} satisfies Prisma.BudgetInclude;

type BudgetRecord = Prisma.BudgetGetPayload<{
  include: typeof budgetInclude;
}>;

interface SpendingTransaction {
  amount: Prisma.Decimal;
}

/**
 * Verify that the category belongs to the user and is an expense category.
 */
async function verifyExpenseCategory(
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
      type: true,
    },
  });

  if (!category) {
    throw new BudgetServiceError(
      "CATEGORY_NOT_FOUND",
      "The selected category does not exist or is not available to your account.",
    );
  }

  if (category.type !== "EXPENSE") {
    throw new BudgetServiceError(
      "INVALID_CATEGORY_TYPE",
      "Budgets can only be assigned to expense categories.",
    );
  }
}

/**
 * Get the UTC start and exclusive end of a calendar month.
 *
 * Before production, align these boundaries with Africa/Nairobi
 * so spending periods follow Kenya's local calendar.
 */
function getMonthRange(periodMonth: string): {
  start: Date;
  end: Date;
} {
  const [yearText, monthText] = periodMonth.split("-");

  const year = Number(yearText);
  const month = Number(monthText);

  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/**
 * Calculate spending without converting money to floating-point numbers.
 */
function getSpendingAmount(
  transactions: SpendingTransaction[],
): Prisma.Decimal {
  return transactions.reduce(
    (total, transaction) => total.plus(transaction.amount),
    new Prisma.Decimal(0),
  );
}

/**
 * Retrieve expense transactions for a user's budget category and month.
 */
async function getCategorySpending(
  userId: string,
  categoryId: string,
  periodMonth: string,
): Promise<Prisma.Decimal> {
  const { start, end } = getMonthRange(periodMonth);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      categoryId,
      type: "EXPENSE",
      occurredAt: {
        gte: start,
        lt: end,
      },
    },
    select: {
      amount: true,
    },
  });

  return getSpendingAmount(transactions);
}

/**
 * Convert a database budget into a frontend-friendly response.
 */
function serializeBudget(
  budget: BudgetRecord,
  spent: Prisma.Decimal,
) {
  const amount = new Prisma.Decimal(budget.amount);
  const remaining = amount.minus(spent);

  const usagePercentage = amount.isZero()
    ? 0
    : Number(
        spent
          .dividedBy(amount)
          .times(100)
          .toDecimalPlaces(2)
          .toString(),
      );

  return {
    id: budget.id,
    categoryId: budget.categoryId,
    periodMonth: budget.periodMonth,
    amount: amount.toFixed(2),
    spent: spent.toFixed(2),
    remaining: remaining.toFixed(2),
    usagePercentage,
    isOverBudget: spent.greaterThan(amount),
    category: budget.category,
    createdAt: budget.createdAt,
    updatedAt: budget.updatedAt,
  };
}

/**
 * Create a budget for an expense category and calendar month.
 */
export async function createBudget(
  userId: string,
  input: CreateBudgetInput,
) {
  await verifyExpenseCategory(userId, input.categoryId);

  try {
    const budget = await prisma.budget.create({
      data: {
        userId,
        categoryId: input.categoryId,
        periodMonth: input.periodMonth,
        amount: new Prisma.Decimal(input.amount),
      },
      include: budgetInclude,
    });

    // Return actual spending rather than assuming the new budget
    // has no expenses for the selected month.
    return getBudgetById(userId, budget.id);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new BudgetServiceError(
        "BUDGET_ALREADY_EXISTS",
        "A budget already exists for this category and month.",
      );
    }

    throw error;
  }
}

/**
 * List the authenticated user's budgets.
 *
 * An optional month filter uses YYYY-MM format.
 */
export async function listBudgets(
  userId: string,
  filters: ListBudgetsInput,
) {
  const budgets = await prisma.budget.findMany({
    where: {
      userId,
      ...(filters.month
        ? {
            periodMonth: filters.month,
          }
        : {}),
    },
    include: budgetInclude,
    orderBy: [
      {
        periodMonth: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  const data = await Promise.all(
    budgets.map(async (budget) => {
      const spent = await getCategorySpending(
        userId,
        budget.categoryId,
        budget.periodMonth,
      );

      return serializeBudget(budget, spent);
    }),
  );

  return {
    data,
    total: data.length,
  };
}

/**
 * Retrieve one budget belonging to the authenticated user.
 */
export async function getBudgetById(
  userId: string,
  budgetId: string,
) {
  const budget = await prisma.budget.findFirst({
    where: {
      id: budgetId,
      userId,
    },
    include: budgetInclude,
  });

  if (!budget) {
    throw new BudgetServiceError(
      "BUDGET_NOT_FOUND",
      "The budget does not exist or is not available to your account.",
    );
  }

  const spent = await getCategorySpending(
    userId,
    budget.categoryId,
    budget.periodMonth,
  );

  return serializeBudget(budget, spent);
}

/**
 * Update a budget's monetary limit.
 */
export async function updateBudget(
  userId: string,
  budgetId: string,
  input: UpdateBudgetInput,
) {
  const result = await prisma.budget.updateMany({
    where: {
      id: budgetId,
      userId,
    },
    data: {
      amount: new Prisma.Decimal(input.amount),
    },
  });

  if (result.count === 0) {
    throw new BudgetServiceError(
      "BUDGET_NOT_FOUND",
      "The budget does not exist or is not available to your account.",
    );
  }

  return getBudgetById(userId, budgetId);
}

/**
 * Delete a budget belonging to the authenticated user.
 */
export async function deleteBudget(
  userId: string,
  budgetId: string,
): Promise<void> {
  const result = await prisma.budget.deleteMany({
    where: {
      id: budgetId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new BudgetServiceError(
      "BUDGET_NOT_FOUND",
      "The budget does not exist or is not available to your account.",
    );
  }
}