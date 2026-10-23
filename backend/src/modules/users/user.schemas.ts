import { z } from "zod";

const preferenceObjectSchema = z
  .record(z.string().min(1).max(64), z.json())
  .refine((value) => JSON.stringify(value).length <= 10_000, {
    message: "Preferences must not exceed 10 KB.",
  });

export const updateUserSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    email: z
      .string()
      .trim()
      .email()
      .max(254)
      .transform((value) => value.toLowerCase())
      .optional(),
    phone: z
      .string()
      .trim()
      .min(7)
      .max(32)
      .regex(/^[+()\d .-]+$/, "Enter a valid phone number.")
      .refine((value) => /\d/.test(value), "Enter a valid phone number.")
      .nullable()
      .optional(),
    currency: z
      .string()
      .trim()
      .regex(/^[A-Z]{3}$/i, "Currency must be a 3-letter ISO code.")
      .transform((value) => value.toUpperCase())
      .optional(),
    financialPreferences: preferenceObjectSchema.optional(),
    notificationPreferences: preferenceObjectSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one user setting to update.",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
