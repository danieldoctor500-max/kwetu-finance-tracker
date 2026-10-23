import { z } from "zod";

const transactionTypes = ["INCOME", "EXPENSE"] as const;

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Amount must be a positive monetary value with at most two decimal places.",
  )
  .refine((value) => Number(value) > 0, {
    message: "Amount must be greater than zero.",
  });

const optionalText = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength)
    .optional()
    .transform((value) => (value === "" ? undefined : value));

const optionalUpdateText = (maxLength: number) =>
  z.string().trim().max(maxLength).optional();

const occurredAtSchema = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));

export const createTransactionSchema = z
  .object({
    type: z.enum(transactionTypes),

    categoryId: z.string().uuid(),

    accountId: z.string().uuid().nullable().optional(),

    amount: moneySchema,

    description: optionalText(500),

    merchant: optionalText(120),

    occurredAt: occurredAtSchema.optional(),
  })
  .strict();

export const updateTransactionSchema = z
  .object({
    type: z.enum(transactionTypes).optional(),

    categoryId: z.string().uuid().optional(),

    accountId: z.string().uuid().nullable().optional(),

    amount: moneySchema.optional(),

    description: optionalUpdateText(500),

    merchant: optionalUpdateText(120),

    occurredAt: occurredAtSchema.optional(),
  })
  .strict()
  .refine(
    (value) => Object.values(value).some((item) => item !== undefined),
    {
      message: "Provide at least one field to update.",
    },
  );

export const listTransactionsSchema = z
  .object({
    type: z.enum(transactionTypes).optional(),

    categoryId: z.string().uuid().optional(),

    from: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .optional(),

    to: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .optional(),

    page: z.coerce.number().int().min(1).default(1),

    limit: z.coerce.number().int().min(1).max(100).default(20),

    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  })
  .strict()
  .refine(
    (value) =>
      value.from === undefined ||
      value.to === undefined ||
      value.from <= value.to,
    {
      message: "'from' must be earlier than or equal to 'to'.",
      path: ["from"],
    },
  );

export type CreateTransactionInput = z.infer<
  typeof createTransactionSchema
>;

export type UpdateTransactionInput = z.infer<
  typeof updateTransactionSchema
>;

export type ListTransactionsInput = z.infer<
  typeof listTransactionsSchema
>;