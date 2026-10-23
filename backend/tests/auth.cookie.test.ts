import { describe, expect, it } from "vitest";
import { getAccessCookieOptions } from "../src/modules/auth/auth.cookie";

describe("getAccessCookieOptions", () => {
  it("requires secure cookies in production", () => {
    expect(getAccessCookieOptions("production").secure).toBe(true);
  });

  it("keeps local development cookies usable without HTTPS", () => {
    expect(getAccessCookieOptions("development").secure).toBe(false);
  });
});
