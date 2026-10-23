import { Prisma } from "../../generated/prisma/client";

export const transactionQualitySelect = {
  id: true,
  type: true,
  categoryId: true,
  amount: true,
  occurredAt: true,
  description: true,
  merchant: true,
  category: {
    select: {
      id: true,
      name: true,
      type: true,
    },
  },
} satisfies Prisma.TransactionSelect;

export type TransactionQualityRecord = Prisma.TransactionGetPayload<{
  select: typeof transactionQualitySelect;
}>;

export interface DuplicateTransactionGroup {
  key: string;
  transactions: TransactionQualityRecord[];
}

export function findDuplicateTransactions(
  transactions: TransactionQualityRecord[],
): DuplicateTransactionGroup[] {
  const grouped = new Map<string, TransactionQualityRecord[]>();

  for (const transaction of transactions) {
    const date = transaction.occurredAt.toISOString().slice(0, 10);
    const key = [
      date,
      transaction.type,
      transaction.amount.toFixed(2),
      transaction.categoryId,
    ].join("|");
    const group = grouped.get(key);
    if (group) {
      group.push(transaction);
    } else {
      grouped.set(key, [transaction]);
    }
  }

  return Array.from(grouped, ([key, group]) => ({ key, transactions: group }))
    .filter(({ transactions: group }) => group.length > 1);
}
