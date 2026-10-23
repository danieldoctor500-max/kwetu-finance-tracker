import { accountSelect, transferInclude } from "./account.model";
import type {
  CreateAccountInput,
  CreateTransferInput,
  UpdateAccountInput,
} from "./account.schemas";
import { prisma } from "../../lib/prisma";

export function createAccountRecord(userId: string, input: CreateAccountInput) {
  return prisma.financialAccount.create({
    data: { ...input, userId },
    select: accountSelect,
  });
}

export function listAccountRecords(userId: string) {
  return prisma.financialAccount.findMany({
    where: { userId },
    select: accountSelect,
    orderBy: [{ createdAt: "asc" }, { name: "asc" }],
  });
}

export function findAccountRecord(userId: string, accountId: string) {
  return prisma.financialAccount.findFirst({
    where: { userId, id: accountId },
    select: accountSelect,
  });
}

export function updateAccountRecord(
  userId: string,
  accountId: string,
  input: UpdateAccountInput,
) {
  return prisma.financialAccount.updateMany({
    where: { userId, id: accountId },
    data: input,
  });
}

export function deleteAccountRecord(userId: string, accountId: string) {
  return prisma.financialAccount.deleteMany({ where: { userId, id: accountId } });
}

export function getAccountEntryTotals(userId: string, accountIds: string[]) {
  if (!accountIds.length) {
    return Promise.resolve({ transactions: [], outgoing: [], incoming: [] });
  }

  return Promise.all([
    prisma.transaction.groupBy({
      by: ["accountId", "type"],
      where: { userId, accountId: { in: accountIds } },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["fromAccountId"],
      where: { userId, fromAccountId: { in: accountIds } },
      _sum: { amount: true },
    }),
    prisma.transfer.groupBy({
      by: ["toAccountId"],
      where: { userId, toAccountId: { in: accountIds } },
      _sum: { amount: true },
    }),
  ]).then(([transactions, outgoing, incoming]) => ({
    transactions,
    outgoing,
    incoming,
  }));
}

export function createTransferRecord(userId: string, input: CreateTransferInput) {
  return prisma.transfer.create({
    data: { ...input, userId },
    include: transferInclude,
  });
}

export function listTransferRecords(userId: string, limit: number) {
  return prisma.transfer.findMany({
    where: { userId },
    include: transferInclude,
    orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

export function deleteTransferRecord(userId: string, transferId: string) {
  return prisma.transfer.deleteMany({ where: { userId, id: transferId } });
}
