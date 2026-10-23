import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import {
  createAccountSchema,
  createTransferSchema,
  updateAccountSchema,
} from "./account.schemas";
import {
  AccountServiceError,
  createAccount,
  createTransfer,
  deleteAccount,
  deleteTransfer,
  getAccount,
  listAccounts,
  listTransfers,
  updateAccount,
} from "./account.service";

function userIdFrom(req: Request): string {
  if (!req.user) throw new Error("Authenticated user was not attached to the request.");
  return req.user.id;
}

function resourceId(
  req: Request,
  res: Response,
  resource: "account" | "transfer",
): string | undefined {
  const id = req.params.id;
  if (typeof id === "string" && id.trim()) return id;
  res.status(400).json({
    error: {
      code: `INVALID_${resource.toUpperCase()}_ID`,
      message: `A valid ${resource} ID is required.`,
    },
  });
  return undefined;
}

function handleError(error: unknown, res: Response, next: NextFunction): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted account or transfer data.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }
  if (error instanceof AccountServiceError) {
    const statuses = {
      ACCOUNT_NOT_FOUND: 404,
      ACCOUNT_NAME_EXISTS: 409,
      ACCOUNT_IN_USE: 409,
      INVALID_TRANSFER_ACCOUNTS: 400,
      TRANSFER_NOT_FOUND: 404,
    } as const;
    res.status(statuses[error.code]).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }
  next(error);
}

export async function createAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await createAccount(userIdFrom(req), createAccountSchema.parse(req.body));
    res.status(201).json({ message: "Account created successfully.", data: account });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function listAccountsHandler(req: Request, res: Response, next: NextFunction) {
  try {
    res.status(200).json(await listAccounts(userIdFrom(req)));
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function getAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = resourceId(req, res, "account");
    if (!id) return;
    res.status(200).json({ data: await getAccount(userIdFrom(req), id) });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function updateAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = resourceId(req, res, "account");
    if (!id) return;
    const account = await updateAccount(userIdFrom(req), id, updateAccountSchema.parse(req.body));
    res.status(200).json({ message: "Account updated successfully.", data: account });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function deleteAccountHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = resourceId(req, res, "account");
    if (!id) return;
    await deleteAccount(userIdFrom(req), id);
    res.status(200).json({ message: "Account deleted successfully." });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function createTransferHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const transfer = await createTransfer(userIdFrom(req), createTransferSchema.parse(req.body));
    res.status(201).json({ message: "Transfer recorded successfully.", data: transfer });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function listTransfersHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await listTransfers(userIdFrom(req));
    res.status(200).json({ data, total: data.length });
  } catch (error) {
    handleError(error, res, next);
  }
}

export async function deleteTransferHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const id = resourceId(req, res, "transfer");
    if (!id) return;
    await deleteTransfer(userIdFrom(req), id);
    res.status(200).json({ message: "Transfer deleted successfully." });
  } catch (error) {
    handleError(error, res, next);
  }
}
