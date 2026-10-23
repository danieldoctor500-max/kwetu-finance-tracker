import { describe, expect, it } from "vitest";
import { updateUserSchema } from "../src/modules/users/user.schemas";

describe("updateUserSchema", () => {
  it("normalizes email and currency and accepts profile preferences", () => {
    const result = updateUserSchema.parse({
      email: "  PERSON@EXAMPLE.COM ",
      currency: "kes",
      phone: "+254 700 123456",
      financialPreferences: { budgetPeriod: "MONTHLY" },
      notificationPreferences: { budgetAlerts: true },
    });

    expect(result).toMatchObject({
      email: "person@example.com",
      currency: "KES",
      phone: "+254 700 123456",
      financialPreferences: { budgetPeriod: "MONTHLY" },
      notificationPreferences: { budgetAlerts: true },
    });
  });

  it("allows clearing the phone number", () => {
    expect(updateUserSchema.parse({ phone: null })).toEqual({ phone: null });
  });

  it("rejects empty updates, malformed currency, and oversized preference objects", () => {
    expect(() => updateUserSchema.parse({})).toThrow();
    expect(() => updateUserSchema.parse({ currency: "KES1" })).toThrow();
    expect(() =>
      updateUserSchema.parse({
        financialPreferences: { notes: "x".repeat(10_001) },
      }),
    ).toThrow();
  });
});
