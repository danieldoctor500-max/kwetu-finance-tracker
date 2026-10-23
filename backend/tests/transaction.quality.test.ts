import { describe, expect, it } from "vitest";
import { Prisma } from "../src/generated/prisma/client";
import {
  findDuplicateTransactions,
  type TransactionQualityRecord,
} from "../src/modules/transactions/transaction.quality";

const category = {
  id: "category-id",
  name: "Food",
  type: "EXPENSE" as const,
};

function transaction(
  id: string,
  overrides: Partial<TransactionQualityRecord> = {},
): TransactionQualityRecord {
  return {
    id,
    type: "EXPENSE",
    categoryId: category.id,
    amount: new Prisma.Decimal("250.00"),
    occurredAt: new Date("2026-10-07T08:30:00.000Z"),
    description: null,
    merchant: null,
    category,
    ...overrides,
  };
}

describe("findDuplicateTransactions", () => {
  it("groups same-day transactions with equal type, amount, and category", () => {
    const duplicates = findDuplicateTransactions([
      transaction("first"),
      transaction("second", {
        occurredAt: new Date("2026-10-07T18:10:00.000Z"),
      }),
      transaction("different-category", {
        categoryId: "another-category",
      }),
      transaction("different-type", { type: "INCOME" }),
      transaction("different-amount", {
        amount: new Prisma.Decimal("251.00"),
      }),
      transaction("different-day", {
        occurredAt: new Date("2026-10-08T08:30:00.000Z"),
      }),
    ]);

    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].transactions.map(({ id }) => id)).toEqual([
      "first",
      "second",
    ]);
  });

  it("returns no duplicates when transaction keys are unique", () => {
    expect(
      findDuplicateTransactions([
        transaction("first"),
        transaction("second", {
          amount: new Prisma.Decimal("251.00"),
        }),
      ]),
    ).toEqual([]);
  });
});
