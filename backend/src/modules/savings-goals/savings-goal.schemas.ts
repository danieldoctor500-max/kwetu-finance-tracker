import { z } from "zod";

const moneySchema = z
  .string()
  .trim()
  .regex(
    /^(?:0|[1-9]\d{0,9})(?:\.\d{1,2})?$/,
    "Amount must be a valid monetary value with at most two decimal places.",
  );

const positiveMoneySchema = moneySchema.refine(
  (value) => Number(value) > 0,
  {
    message: "Amount must be greater than zero.",
  },
);

const nonNegativeMoneySchema = moneySchema.refine(
  (value) => Number(value) >= 0,
  {
    message: "Amount cannot be negative.",
  },
);

const deadlineSchema = z
  .string()
  .datetime({
    offset: true,
    message: "Deadline must be a valid ISO 8601 datetime with a timezone.",
  })
  .transform((value) => new Date(value))
  .optional()
  .nullable();

const goalStatuses = [
  "ACTIVE",
  "COMPLETED",
  "CANCELLED",
] as const;

export const createSavingsGoalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Goal name must contain at least 2 characters.")
      .max(120, "Goal name cannot exceed 120 characters."),

    targetAmount: positiveMoneySchema,

    currentAmount: nonNegativeMoneySchema.optional(),

    deadline: deadlineSchema,
  })
  .strict()
  .refine(
    (value) =>
      value.currentAmount === undefined ||
      Number(value.currentAmount) <= Number(value.targetAmount),
    {
      message: "Current amount cannot exceed the target amount.",
      path: ["currentAmount"],
    },
  );

export const updateSavingsGoalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Goal name must contain at least 2 characters.")
      .max(120, "Goal name cannot exceed 120 characters.")
      .optional(),

    targetAmount: positiveMoneySchema.optional(),

    currentAmount: nonNegativeMoneySchema.optional(),

    deadline: deadlineSchema,

    status: z.enum(goalStatuses).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.targetAmount !== undefined ||
      value.currentAmount !== undefined ||
      value.deadline !== undefined ||
      value.status !== undefined,
    {
      message: "Provide at least one field to update.",
    },
  );

export const listSavingsGoalsSchema = z
  .object({
    status: z.enum(goalStatuses).optional(),
  })
  .strict();

export type CreateSavingsGoalInput = z.infer<
  typeof createSavingsGoalSchema
>;

export type UpdateSavingsGoalInput = z.infer<
  typeof updateSavingsGoalSchema
>;

export type ListSavingsGoalsInput = z.infer<
  typeof listSavingsGoalsSchema
>;