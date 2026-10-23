import { describe, expect, it } from "vitest";
import { createAccountSchema, createTransferSchema } from "../src/modules/accounts/account.schemas";

describe("account and transfer schemas", () => {
  it("defaults the account opening balance to zero", () => {
    expect(createAccountSchema.parse({ name: "M-Pesa", type: "MOBILE_MONEY" }))
      .toMatchObject({ name: "M-Pesa", openingBalance: "0" });
  });

  it("rejects transfer between the same account and non-positive amounts", () => {
    const accountId = "11111111-1111-4111-8111-111111111111";
    expect(() => createTransferSchema.parse({
      fromAccountId: accountId,
      toAccountId: accountId,
      amount: "1",
    })).toThrow();
    expect(() => createTransferSchema.parse({
      fromAccountId: accountId,
      toAccountId: "22222222-2222-4222-8222-222222222222",
      amount: "0",
    })).toThrow();
  });
});
