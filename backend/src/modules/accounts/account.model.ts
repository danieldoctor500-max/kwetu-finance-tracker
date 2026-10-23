import { Prisma } from "../../generated/prisma/client";

export const accountSelect = {
  id: true,
  name: true,
  type: true,
  provider: true,
  openingBalance: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: {
      transactions: true,
      outgoingTransfers: true,
      incomingTransfers: true,
    },
  },
} satisfies Prisma.FinancialAccountSelect;

export const transferInclude = {
  fromAccount: { select: { id: true, name: true, type: true } },
  toAccount: { select: { id: true, name: true, type: true } },
} satisfies Prisma.TransferInclude;
