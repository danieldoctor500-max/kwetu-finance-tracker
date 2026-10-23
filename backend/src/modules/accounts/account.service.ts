import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { calculateAccountBalance } from "./account.balance";
import {
  createAccountRecord,
  createTransferRecord,
  deleteAccountRecord,
  deleteTransferRecord,
  findAccountRecord,
  getAccountEntryTotals,
  listAccountRecords,
  listTransferRecords,
  updateAccountRecord,
} from "./account.repository";
import type {
  CreateAccountInput,
  CreateTransferInput,
  UpdateAccountInput,
} from "./account.schemas";

export class AccountServiceError extends Error {
  constructor(
    public readonly code:
      | "ACCOUNT_NOT_FOUND"
      | "ACCOUNT_NAME_EXISTS"
      | "ACCOUNT_IN_USE"
      | "INVALID_TRANSFER_ACCOUNTS"
      | "TRANSFER_NOT_FOUND",
    message: string,
  ) {
    super(message);
    this.name = "AccountServiceError";
  }
}

function zero(): Prisma.Decimal {
  return new Prisma.Decimal(0);
}

function isPrismaCode(error: unknown, code: string): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === code
  );
}

export async function createAccount(userId: string, input: CreateAccountInput) {
  try {
    return await createAccountRecord(userId, input);
  } catch (error) {
    if (isPrismaCode(error, "P2002")) {
      throw new AccountServiceError(
        "ACCOUNT_NAME_EXISTS",
        "An account with this name already exists.",
      );
    }
    throw error;
  }
}

export async function listAccounts(userId: string) {
  const accounts = await listAccountRecords(userId);
  const totals = await getAccountEntryTotals(userId, accounts.map(({ id }) => id));
  const income = new Map<string, Prisma.Decimal>();
  const expenses = new Map<string, Prisma.Decimal>();
  const outgoing = new Map<string, Prisma.Decimal>();
  const incoming = new Map<string, Prisma.Decimal>();

  for (const group of totals.transactions) {
    if (!group.accountId) continue;
    const target = group.type === "INCOME" ? income : expenses;
    target.set(group.accountId, group._sum.amount ?? zero());
  }
  for (const group of totals.outgoing) {
    outgoing.set(group.fromAccountId, group._sum.amount ?? zero());
  }
  for (const group of totals.incoming) {
    incoming.set(group.toAccountId, group._sum.amount ?? zero());
  }

  const data = accounts.map((account) => {
    const balance = calculateAccountBalance(
      new Prisma.Decimal(account.openingBalance),
      income.get(account.id) ?? zero(),
      expenses.get(account.id) ?? zero(),
      incoming.get(account.id) ?? zero(),
      outgoing.get(account.id) ?? zero(),
    );
    return { ...account, openingBalance: account.openingBalance.toFixed(2), balance: balance.toFixed(2) };
  });

  const totalBalance = data.reduce(
    (total, account) => total.plus(account.balance),
    zero(),
  );
  return { data, total: data.length, totalBalance: totalBalance.toFixed(2), currency: "KES" as const };
}

export async function getAccount(userId: string, accountId: string) {
  const account = await findAccountRecord(userId, accountId);
  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "The account was not found.");
  }
  const result = await listAccounts(userId);
  const withBalance = result.data.find(({ id }) => id === accountId);
  if (!withBalance) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "The account was not found.");
  }
  return withBalance;
}

export async function updateAccount(
  userId: string,
  accountId: string,
  input: UpdateAccountInput,
) {
  try {
    const result = await updateAccountRecord(userId, accountId, input);
    if (result.count === 0) {
      throw new AccountServiceError("ACCOUNT_NOT_FOUND", "The account was not found.");
    }
    return getAccount(userId, accountId);
  } catch (error) {
    if (error instanceof AccountServiceError) throw error;
    if (isPrismaCode(error, "P2002")) {
      throw new AccountServiceError(
        "ACCOUNT_NAME_EXISTS",
        "An account with this name already exists.",
      );
    }
    throw error;
  }
}

export async function deleteAccount(userId: string, accountId: string): Promise<void> {
  const account = await findAccountRecord(userId, accountId);
  if (!account) {
    throw new AccountServiceError("ACCOUNT_NOT_FOUND", "The account was not found.");
  }
  if (
    account._count.transactions > 0 ||
    account._count.outgoingTransfers > 0 ||
    account._count.incomingTransfers > 0
  ) {
    throw new AccountServiceError(
      "ACCOUNT_IN_USE",
      "This account has transactions or transfers. Remove those links before deleting it.",
    );
  }
  try {
    const result = await deleteAccountRecord(userId, accountId);
    if (result.count === 0) {
      throw new AccountServiceError("ACCOUNT_NOT_FOUND", "The account was not found.");
    }
  } catch (error) {
    if (error instanceof AccountServiceError) throw error;
    if (isPrismaCode(error, "P2003")) {
      throw new AccountServiceError(
        "ACCOUNT_IN_USE",
        "This account has transactions or transfers and cannot be deleted.",
      );
    }
    throw error;
  }
}

export async function createTransfer(
  userId: string,
  input: CreateTransferInput,
) {
  if (input.fromAccountId === input.toAccountId) {
    throw new AccountServiceError(
      "INVALID_TRANSFER_ACCOUNTS",
      "Choose two different accounts for a transfer.",
    );
  }
  const accounts = await prisma.financialAccount.findMany({
    where: {
      userId,
      id: { in: [input.fromAccountId, input.toAccountId] },
    },
    select: { id: true },
  });
  if (accounts.length !== 2) {
    throw new AccountServiceError(
      "INVALID_TRANSFER_ACCOUNTS",
      "Both transfer accounts must belong to your account.",
    );
  }
  return createTransferRecord(userId, input);
}

export async function listTransfers(userId: string) {
  return listTransferRecords(userId, 100);
}

export async function deleteTransfer(userId: string, transferId: string): Promise<void> {
  const result = await deleteTransferRecord(userId, transferId);
  if (result.count === 0) {
    throw new AccountServiceError("TRANSFER_NOT_FOUND", "The transfer was not found.");
  }
}
