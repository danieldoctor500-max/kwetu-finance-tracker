import type { CookieOptions } from "express";

type NodeEnvironment = "development" | "test" | "production";

export function getAccessCookieOptions(
  nodeEnvironment: NodeEnvironment,
): CookieOptions {
  return {
    httpOnly: true,
    secure: nodeEnvironment === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  };
}
