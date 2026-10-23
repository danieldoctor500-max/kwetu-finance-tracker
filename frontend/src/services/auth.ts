import type { AuthResponse, User } from "../types/api";
import api from "./app";
import { assertUser } from "./users";

interface AuthInput {
  email: string;
  password: string;
}

interface RegisterInput extends AuthInput {
  fullName: string;
}

export interface UpdateProfileInput {
  fullName?: string;
  profilePhoto?: string | null;
  themePreference?: User["themePreference"];
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
}

function assertAuthResponse(value: AuthResponse): AuthResponse {
  if (!value || typeof value !== "object" || typeof value.message !== "string") {
    throw new Error("The authentication API returned an unexpected response.");
  }
  return { ...value, user: assertUser(value.user) };
}

export async function register(input: RegisterInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/register", input);
  return assertAuthResponse(response.data);
}

export async function login(input: AuthInput): Promise<AuthResponse> {
  const response = await api.post<AuthResponse>("/auth/login", input);
  return assertAuthResponse(response.data);
}

export async function logout(): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>("/auth/logout");
  return response.data;
}

export async function getCurrentUser(): Promise<User> {
  const response = await api.get<{ user: unknown }>("/auth/me");
  return assertUser(response.data?.user);
}

export async function updateProfile(
  input: UpdateProfileInput,
): Promise<User> {
  const response = await api.patch<{ user: unknown }>("/auth/profile", input);
  return assertUser(response.data?.user);
}

export async function changePassword(
  input: ChangePasswordInput,
): Promise<void> {
  const response = await api.patch<{ message: string }>("/auth/password", input);
  if (typeof response.data?.message !== "string") {
    throw new Error("The password API returned an unexpected response.");
  }
}
