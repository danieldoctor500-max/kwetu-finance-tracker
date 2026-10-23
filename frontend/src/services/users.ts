import type { User } from "../types/api";
import api from "./app";

export interface UpdateUserInput {
  fullName?: string;
  email?: string;
  phone?: string | null;
  currency?: string;
  financialPreferences?: User["financialPreferences"];
  notificationPreferences?: User["notificationPreferences"];
}

function isPreferenceObject(value: unknown): value is Record<string, User["financialPreferences"][string]> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function assertUser(value: unknown): User {
  if (
    !value ||
    typeof value !== "object" ||
    !("id" in value) || typeof value.id !== "string" ||
    !("fullName" in value) || typeof value.fullName !== "string" ||
    !("email" in value) || typeof value.email !== "string" ||
    !("phone" in value) || (value.phone !== null && typeof value.phone !== "string") ||
    !("currency" in value) || typeof value.currency !== "string" || !/^[A-Z]{3}$/.test(value.currency) ||
    !("financialPreferences" in value) || !isPreferenceObject(value.financialPreferences) ||
    !("notificationPreferences" in value) || !isPreferenceObject(value.notificationPreferences) ||
    !("role" in value) || (value.role !== "USER" && value.role !== "ADMIN") ||
    !("profilePhoto" in value) || (value.profilePhoto !== null && typeof value.profilePhoto !== "string") ||
    !("themePreference" in value) || (value.themePreference !== "LIGHT" && value.themePreference !== "DARK") ||
    !("createdAt" in value) || typeof value.createdAt !== "string"
  ) {
    throw new Error("The user API returned an unexpected response.");
  }
  return value as User;
}

export async function updateUserProfile(input: UpdateUserInput): Promise<User> {
  const response = await api.patch<{ user: unknown }>("/users/me", input);
  return assertUser(response.data?.user);
}
