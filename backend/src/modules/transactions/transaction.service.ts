import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type {
  CreateTransactionInput,
  ListTransactionsInput,
  UpdateTransactionInput,
} from "./transaction.schemas";
import {
  findDuplicateTransactions,
  transactionQualitySelect,
} from "./transaction.quality";

export class TransactionServiceError extends Error {
  constructor(
    public readonly code:
      | "CATEGORY_NOT_FOUND"
      | "TRANSACTION_NOT_FOUND"
      | "INVALID_CATEGORY_TYPE"
      | "ACCOUNT_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "TransactionServiceError";
  }
}

const transactionInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
  account: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} satisfies Prisma.TransactionInclude;

type TransactionRecord = Prisma.TransactionGetPayload<{
  include: typeof transactionInclude;
}>;

async function verifyCategory(
  userId: string,
  categoryId: string,
  expectedType: "INCOME" | "EXPENSE",
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
    throw new TransactionServiceError(
      "CATEGORY_NOT_FOUND",
      "The selected category does not exist or is not available to your account.",
    );
  }

  if (category.type !== expectedType) {
    throw new TransactionServiceError(
      "INVALID_CATEGORY_TYPE",
      "The category type must match the transaction type.",
    );
  }
}

async function verifyAccount(
  userId: string,
  accountId: string | null | undefined,
): Promise<void> {
  if (!accountId) return;
  const account = await prisma.financialAccount.findFirst({
    where: { userId, id: accountId },
    select: { id: true },
  });
  if (!account) {
    throw new TransactionServiceError(
      "ACCOUNT_NOT_FOUND",
      "The selected account does not exist or is not available to your account.",
    );
  }
}

function toTransactionData(
  input: CreateTransactionInput,
): Omit<Prisma.TransactionUncheckedCreateInput, "userId"> {
  return {
    type: input.type,
    categoryId: input.categoryId,
    ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
    amount: new Prisma.Decimal(input.amount),
    description: input.description ?? null,
    merchant: input.merchant ?? null,
    ...(input.occurredAt
      ? { occurredAt: input.occurredAt }
      : {}),
  };
}

export async function createTransaction(
  userId: string,
  input: CreateTransactionInput,
): Promise<TransactionRecord> {
  await verifyCategory(
    userId,
    input.categoryId,
    input.type,
  );
  await verifyAccount(userId, input.accountId);

  return prisma.transaction.create({
    data: {
      ...toTransactionData(input),
      userId,
    },
    include: transactionInclude,
  });
}

export async function listTransactions(
  userId: string,
  filters: ListTransactionsInput,
) {
  const {
    type,
    categoryId,
    from,
    to,
    page,
    limit,
    sortOrder,
  } = filters;

  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(type ? { type } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const skip = (page - 1) * limit;

  const [transactions, total] = await prisma.$transaction([
    prisma.transaction.findMany({
      where,
      include: transactionInclude,
      orderBy: {
        occurredAt: sortOrder,
      },
      skip,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data: transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page * limit < total,
      hasPreviousPage: page > 1,
    },
  };
}

export async function getTransactionQuality(userId: string) {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    select: transactionQualitySelect,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
  });

  const duplicates = findDuplicateTransactions(transactions);
  return {
    summary: {
      totalTransactions: transactions.length,
      categorizedTransactions: transactions.filter(({ categoryId }) => Boolean(categoryId)).length,
      datedTransactions: transactions.filter(({ occurredAt }) => !Number.isNaN(occurredAt.getTime())).length,
    },
    duplicates,
  };
}

export async function getTransactionById(
  userId: string,
  transactionId: string,
): Promise<TransactionRecord> {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
    },
    include: transactionInclude,
  });

  if (!transaction) {
    throw new TransactionServiceError(
      "TRANSACTION_NOT_FOUND",
      "The transaction does not exist or is not available to your account.",
    );
  }

  return transaction;
}

export async function updateTransaction(
  userId: string,
  transactionId: string,
  input: UpdateTransactionInput,
): Promise<TransactionRecord> {
  const existing = await prisma.transaction.findFirst({
    where: {
      id: transactionId,
      userId,
    },
    select: {
      id: true,
      type: true,
      categoryId: true,
      accountId: true,
    },
  });

  if (!existing) {
    throw new TransactionServiceError(
      "TRANSACTION_NOT_FOUND",
      "The transaction does not exist or is not available to your account.",
    );
  }

  const nextType = input.type ?? existing.type;
  const nextCategoryId =
    input.categoryId ?? existing.categoryId;
  await verifyAccount(userId, input.accountId);

  if (
    input.type !== undefined ||
    input.categoryId !== undefined
  ) {
    await verifyCategory(
      userId,
      nextCategoryId,
      nextType,
    );
  }

  const data: Prisma.TransactionUpdateManyMutationInput = {
    ...(input.type !== undefined
      ? { type: input.type }
      : {}),
    ...(input.categoryId !== undefined
      ? { categoryId: input.categoryId }
      : {}),
    ...(input.accountId !== undefined
      ? { accountId: input.accountId }
      : {}),
    ...(input.amount !== undefined
      ? { amount: new Prisma.Decimal(input.amount) }
      : {}),
    ...(input.description !== undefined
      ? { description: input.description || null }
      : {}),
    ...(input.merchant !== undefined
      ? { merchant: input.merchant || null }
      : {}),
    ...(input.occurredAt !== undefined
      ? { occurredAt: input.occurredAt }
      : {}),
  };

  const result = await prisma.transaction.updateMany({
    where: {
      id: transactionId,
      userId,
    },
    data,
  });

  if (result.count === 0) {
    throw new TransactionServiceError(
      "TRANSACTION_NOT_FOUND",
      "The transaction does not exist or is not available to your account.",
    );
  }

  return getTransactionById(userId, transactionId);
}

export async function deleteTransaction(
  userId: string,
  transactionId: string,
): Promise<void> {
  const result = await prisma.transaction.deleteMany({
    where: {
      id: transactionId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new TransactionServiceError(
      "TRANSACTION_NOT_FOUND",
      "The transaction does not exist or is not available to your account.",
    );
  }
}