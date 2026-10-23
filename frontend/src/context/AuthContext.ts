import { createContext } from "react";
import type { User } from "../types/api";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated" | "error";

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegistrationDetails extends LoginCredentials {
  fullName: string;
}

export interface AuthContextValue {
  user: User | null;
  status: AuthStatus;
  error: string | null;
  refreshUser: () => Promise<void>;
  updateUser: (user: User) => void;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (details: RegistrationDetails) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
