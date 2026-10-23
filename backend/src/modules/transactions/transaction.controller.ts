import type {
  NextFunction,
  Request,
  Response,
} from "express";
import { ZodError } from "zod";

import {
  createTransactionSchema,
  listTransactionsSchema,
  updateTransactionSchema,
} from "./transaction.schemas";

import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactionQuality,
  listTransactions,
  TransactionServiceError,
  updateTransaction,
} from "./transaction.service";

function getAuthenticatedUserId(req: Request): string {
  if (!req.user) {
    throw new Error(
      "Authenticated user was not attached to the request.",
    );
  }

  return req.user.id;
}

function getTransactionId(
  req: Request,
  res: Response,
): string | undefined {
  const transactionId = req.params.id;

  if (
    typeof transactionId !== "string" ||
    !transactionId.trim()
  ) {
    res.status(400).json({
      error: {
        code: "INVALID_TRANSACTION_ID",
        message: "A valid transaction ID is required.",
      },
    });

    return undefined;
  }

  return transactionId;
}

function handleTransactionError(
  error: unknown,
  res: Response,
  next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the submitted transaction data.",
        details: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message,
        })),
      },
    });

    return;
  }

  if (error instanceof TransactionServiceError) {
    const statusByCode = {
      CATEGORY_NOT_FOUND: 404,
      TRANSACTION_NOT_FOUND: 404,
      INVALID_CATEGORY_TYPE: 400,
      ACCOUNT_NOT_FOUND: 404,
    } as const;

    res.status(statusByCode[error.code]).json({
      error: {
        code: error.code,
        message: error.message,
      },
    });

    return;
  }

  next(error);
}

export async function createTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const input = createTransactionSchema.parse(req.body);

    const transaction = await createTransaction(userId, input);

    res.status(201).json({
      message: "Transaction created successfully.",
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

export async function listTransactionsHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const filters = listTransactionsSchema.parse(req.query);

    const result = await listTransactions(userId, filters);

    res.status(200).json(result);
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

export async function transactionQualityHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const quality = await getTransactionQuality(userId);
    res.status(200).json(quality);
  } catch (error) {
    next(error);
  }
}

export async function getTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const transactionId = getTransactionId(req, res);

    if (!transactionId) {
      return;
    }

    const transaction = await getTransactionById(
      userId,
      transactionId,
    );

    res.status(200).json({
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

export async function updateTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const transactionId = getTransactionId(req, res);

    if (!transactionId) {
      return;
    }

    const input = updateTransactionSchema.parse(req.body);

    const transaction = await updateTransaction(
      userId,
      transactionId,
      input,
    );

    res.status(200).json({
      message: "Transaction updated successfully.",
      data: transaction,
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}

export async function deleteTransactionHandler(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = getAuthenticatedUserId(req);
    const transactionId = getTransactionId(req, res);

    if (!transactionId) {
      return;
    }

    await deleteTransaction(userId, transactionId);

    res.status(200).json({
      message: "Transaction deleted successfully.",
    });
  } catch (error) {
    handleTransactionError(error, res, next);
  }
}