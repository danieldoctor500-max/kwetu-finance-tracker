import jwt, { type SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export interface AccessTokenPayload {
  id: string;
  email: string;
  role: "USER" | "ADMIN";
}

const TOKEN_ISSUER = "kwetu-finance-tracker";
const TOKEN_AUDIENCE = "kwetu-finance-tracker-client";

export function signAccessToken(
  payload: AccessTokenPayload,
): string {
  const options: SignOptions = {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"],
    algorithm: "HS256",
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
    subject: payload.id,
  };

  return jwt.sign(
    {
      email: payload.email,
      role: payload.role,
    },
    env.JWT_ACCESS_SECRET,
    options,
  );
}

export function verifyAccessToken(
  token: string,
): AccessTokenPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
    issuer: TOKEN_ISSUER,
    audience: TOKEN_AUDIENCE,
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.sub !== "string" ||
    typeof decoded.email !== "string" ||
    (decoded.role !== "USER" && decoded.role !== "ADMIN")
  ) {
    throw new Error("Invalid access token payload.");
  }

  return {
    id: decoded.sub,
    email: decoded.email,
    role: decoded.role,
  };
}