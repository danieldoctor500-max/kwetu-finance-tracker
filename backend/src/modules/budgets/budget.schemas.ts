import { z } from "zod";

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Amount must be a valid monetary value with at most two decimal places.",
  )
  .refine((value) => Number(value) > 0, {
    message: "Budget amount must be greater than zero.",
  });

const budgetMonthSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must use YYYY-MM format.");

export const createBudgetSchema = z
  .object({
    categoryId: z.string().uuid(),
    periodMonth: budgetMonthSchema,
    amount: moneySchema,
  })
  .strict();

export const updateBudgetSchema = z
  .object({
    amount: moneySchema,
  })
  .strict();

export const listBudgetsSchema = z
  .object({
    month: budgetMonthSchema.optional(),
  })
  .strict();

export type CreateBudgetInput = z.infer<typeof createBudgetSchema>;
export type UpdateBudgetInput = z.infer<typeof updateBudgetSchema>;
export type ListBudgetsInput = z.infer<typeof listBudgetsSchema>;