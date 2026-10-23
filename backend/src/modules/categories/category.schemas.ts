import { z } from "zod";

const categoryTypes = ["INCOME", "EXPENSE"] as const;

export const createCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must contain at least 2 characters.")
      .max(80, "Category name cannot exceed 80 characters."),

    type: z.enum(categoryTypes),
  })
  .strict();

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Category name must contain at least 2 characters.")
      .max(80, "Category name cannot exceed 80 characters.")
      .optional(),

    type: z.enum(categoryTypes).optional(),
  })
  .strict()
  .refine(
    (value) =>
      value.name !== undefined ||
      value.type !== undefined,
    {
      message: "Provide at least one field to update.",
    },
  );

export const listCategoriesSchema = z
  .object({
    type: z.enum(categoryTypes).optional(),
  })
  .strict();

export type CreateCategoryInput = z.infer<
  typeof createCategorySchema
>;

export type UpdateCategoryInput = z.infer<
  typeof updateCategorySchema
>;

export type ListCategoriesInput = z.infer<
  typeof listCategoriesSchema
>;