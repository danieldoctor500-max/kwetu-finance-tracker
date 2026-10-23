import dotenv from "dotenv";
import { resolve } from "node:path";
import { z } from "zod";

dotenv.config({
  path: resolve(process.cwd(), "../.env"),
});

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]),

  CORS_ORIGIN: z
    .string()
    .url()
    .default("http://localhost:5173"),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  JWT_ACCESS_SECRET: z
    .string()
    .min(32, "JWT_ACCESS_SECRET must contain at least 32 characters"),

  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error("Invalid environment configuration:");

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join(".")}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = result.data;