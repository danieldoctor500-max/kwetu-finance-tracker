import { Prisma } from "../../generated/prisma/client";

export function calculateAccountBalance(
  openingBalance: Prisma.Decimal,
  income: Prisma.Decimal,
  expenses: Prisma.Decimal,
  incomingTransfers: Prisma.Decimal,
  outgoingTransfers: Prisma.Decimal,
): Prisma.Decimal {
  return openingBalance
    .plus(income)
    .minus(expenses)
    .plus(incomingTransfers)
    .minus(outgoingTransfers);
}
