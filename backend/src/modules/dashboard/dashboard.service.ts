import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import type { DashboardSummaryInput } from "./dashboard.schemas";

export async function getDashboardSummary(
  userId: string,
  filters: DashboardSummaryInput,
) {
  const { from, to } = filters;

  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(from || to
      ? {
          occurredAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const transactions = await prisma.transaction.findMany({
    where,
    select: {
      type: true,
      amount: true,
    },
  });

  let totalIncome = new Prisma.Decimal(0);
  let totalExpenses = new Prisma.Decimal(0);

  for (const transaction of transactions) {
    if (transaction.type === "INCOME") {
      totalIncome = totalIncome.plus(transaction.amount);
    } else {
      totalExpenses = totalExpenses.plus(transaction.amount);
    }
  }

  const balance = totalIncome.minus(totalExpenses);

  return {
    currency: "KES",
    period: {
      from: from?.toISOString() ?? null,
      to: to?.toISOString() ?? null,
    },
    summary: {
      totalIncome: totalIncome.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      balance: balance.toFixed(2),
    },
    transactionCount: transactions.length,
  };
}