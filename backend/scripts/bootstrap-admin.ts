import { prisma } from "../src/lib/prisma";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run admin:bootstrap -- <existing-active-user-email>");
  }

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { isActive: true },
  });
  if (!existing) {
    throw new Error("No existing account matched that email.");
  }
  if (!existing.isActive) {
    throw new Error("The matching account is suspended; reactivate it before granting administrator access.");
  }

  const result = await prisma.user.updateMany({
    where: { email, isActive: true },
    data: { role: "ADMIN" },
  });
  if (result.count !== 1) {
    throw new Error("The active account could not be promoted. Please retry or inspect the database.");
  }
  const account = await prisma.user.findUnique({
    where: { email },
    select: { role: true, isActive: true },
  });
  if (account?.role !== "ADMIN" || !account.isActive) {
    throw new Error("The account update could not be verified.");
  }
  console.log("Administrator role granted to the specified active account.");
}

main()
  .catch((error: unknown) => {
    console.error("Administrator bootstrap failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
