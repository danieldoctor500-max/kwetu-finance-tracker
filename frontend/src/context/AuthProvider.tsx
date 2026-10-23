import axios from "axios";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ApiErrorResponse, User } from "../types/api";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
} from "../services/auth";
import { AuthContext } from "./AuthContext";
import type {
  AuthStatus,
  LoginCredentials,
  RegistrationDetails,
} from "./AuthContext";

function isUnauthorized(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 401;
}

function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const message = error.response?.data.error?.message;
    if (message) return message;
    if (!error.response) {
      return "Unable to reach Kwetu. Check your connection and try again.";
    }
  }

  if (error instanceof Error && error.message) return error.message;
  return "Something went wrong. Please try again.";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus("authenticated");
    } catch (requestError) {
      setUser(null);
      if (isUnauthorized(requestError)) {
        setStatus("unauthenticated");
        return;
      }

      setError(getErrorMessage(requestError));
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    let active = true;

    getCurrentUser()
      .then((currentUser) => {
        if (!active) return;
        setUser(currentUser);
        setStatus("authenticated");
      })
      .catch((requestError: unknown) => {
        if (!active) return;
        setUser(null);
        if (isUnauthorized(requestError)) {
          setStatus("unauthenticated");
          return;
        }

        setError(getErrorMessage(requestError));
        setStatus("error");
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (user) {
      document.documentElement.dataset.theme = user.themePreference.toLowerCase();
    } else {
      delete document.documentElement.dataset.theme;
    }
  }, [user]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    const result = await loginRequest(credentials);
    setUser(result.user);
    setError(null);
    setStatus("authenticated");
  }, []);

  const register = useCallback(async (details: RegistrationDetails) => {
    const result = await registerRequest(details);
    setUser(result.user);
    setError(null);
    setStatus("authenticated");
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
    setError(null);
    setStatus("unauthenticated");
  }, []);

  const updateAuthenticatedUser = useCallback((updatedUser: User) => {
    setUser(updatedUser);
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      refreshUser,
      updateUser: updateAuthenticatedUser,
      login,
      register,
      logout,
    }),
    [user, status, error, refreshUser, updateAuthenticatedUser, login, register, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
