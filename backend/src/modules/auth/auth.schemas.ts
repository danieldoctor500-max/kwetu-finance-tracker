import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),

  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(12).max(128),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email()
    .max(254)
    .transform((value) => value.toLowerCase()),

  password: z.string().min(1).max(128),
});

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(120).optional(),
    profilePhoto: z
      .string()
      .max(80_000)
      .regex(/^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/)
      .nullable()
      .optional(),
    themePreference: z.enum(["LIGHT", "DARK"]).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "Provide at least one profile setting to update.",
  });

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1).max(128),
    newPassword: z.string().min(12).max(128),
  })
  .strict()
  .refine((value) => value.currentPassword !== value.newPassword, {
    message: "Choose a new password different from your current password.",
    path: ["newPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;