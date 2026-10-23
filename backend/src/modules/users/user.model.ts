import { Prisma } from "../../generated/prisma/client";

export const publicUserSelect = {
  id: true,
  fullName: true,
  email: true,
  phone: true,
  currency: true,
  financialPreferences: true,
  notificationPreferences: true,
  role: true,
  profilePhoto: true,
  themePreference: true,
  createdAt: true,
} satisfies Prisma.UserSelect;
