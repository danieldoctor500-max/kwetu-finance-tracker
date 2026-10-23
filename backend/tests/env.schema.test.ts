import { describe, expect, it } from "vitest";
import { envSchema } from "../src/config/env";

const validEnvironment = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://kwetu:secret@localhost:5432/kwetu",
  JWT_ACCESS_SECRET: "a-secure-test-secret-containing-more-than-32-characters",
};

describe("environment configuration", () => {
  it("requires NODE_ENV to be explicitly set", () => {
    const environmentWithoutNodeEnv: Record<string, string> = { ...validEnvironment };
    delete environmentWithoutNodeEnv.NODE_ENV;
    expect(envSchema.safeParse(environmentWithoutNodeEnv).success).toBe(false);
  });

  it("accepts an explicit production environment", () => {
    expect(
      envSchema.safeParse({ ...validEnvironment, NODE_ENV: "production" }).success,
    ).toBe(true);
  });
});
