import { z } from "zod";

const moneySchema = z
  .string()
  .trim()
  .regex(/^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/, "Amount must have at most two decimal places.")
  .refine((value) => Number.isFinite(Number(value)), "Enter a valid monetary amount.");

const optionalText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional().transform((value) => value || undefined);

export const createAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    type: z.enum(["CASH", "BANK", "MOBILE_MONEY", "OTHER"]),
    provider: optionalText(80),
    openingBalance: moneySchema.default("0"),
  })
  .strict();

export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    type: z.enum(["CASH", "BANK", "MOBILE_MONEY", "OTHER"]).optional(),
    provider: z.string().trim().max(80).nullable().optional(),
    openingBalance: moneySchema.optional(),
  })
  .strict()
  .refine((value) => Object.values(value).some((item) => item !== undefined), {
    message: "Provide at least one account field to update.",
  });

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().uuid(),
    toAccountId: z.string().uuid(),
    amount: moneySchema.refine((value) => Number(value) > 0, {
      message: "Transfer amount must be greater than zero.",
    }),
    description: optionalText(240),
    occurredAt: z.string().datetime({ offset: true }).transform((value) => new Date(value)).optional(),
  })
  .strict()
  .refine((value) => value.fromAccountId !== value.toAccountId, {
    message: "Choose two different accounts for a transfer.",
    path: ["toAccountId"],
  });

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
export type CreateTransferInput = z.infer<typeof createTransferSchema>;
