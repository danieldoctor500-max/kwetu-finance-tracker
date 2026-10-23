import { describe, expect, it } from "vitest";
import { Prisma } from "../src/generated/prisma/client";
import { calculateAccountBalance } from "../src/modules/accounts/account.balance";

describe("calculateAccountBalance", () => {
  it("applies income, spending, and two-sided transfers without losing precision", () => {
    const balance = calculateAccountBalance(
      new Prisma.Decimal("12500"),
      new Prisma.Decimal("80000"),
      new Prisma.Decimal("20000"),
      new Prisma.Decimal("5000"),
      new Prisma.Decimal("7500"),
    );

    expect(balance.toFixed(2)).toBe("70000.00");
  });
});
