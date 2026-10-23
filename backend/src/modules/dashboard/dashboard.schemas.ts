import { z } from "zod";

export const dashboardSummarySchema = z
  .object({
    from: z
      .string()
      .date()
      .transform((value) => new Date(`${value}T00:00:00.000Z`))
      .optional(),

    to: z
      .string()
      .date()
      .transform((value) => new Date(`${value}T23:59:59.999Z`))
      .optional(),
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

export type DashboardSummaryInput = z.infer<
  typeof dashboardSummarySchema
>;