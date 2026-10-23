import { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";

async function main(): Promise<void> {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    throw new Error("Usage: npm run admin:revoke -- <administrator-email>");
  }

  await prisma.$transaction(async (transaction) => {
    const account = await transaction.user.findUnique({
      where: { email },
      select: { id: true, role: true, isActive: true },
    });
    if (!account) {
      throw new Error("No existing account matched that email.");
    }
    if (account.role !== "ADMIN") {
      throw new Error("The matching account is not an administrator.");
    }
    if (account.isActive) {
      const activeAdmins = await transaction.user.count({
        where: { role: "ADMIN", isActive: true },
      });
      if (activeAdmins <= 1) {
        throw new Error("Cannot revoke access from the last active administrator.");
      }
    }

    await transaction.user.update({
      where: { id: account.id },
      data: { role: "USER" },
    });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  const account = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  if (account?.role !== "USER") {
    throw new Error("Administrator revocation could not be verified.");
  }
  console.log("Administrator access revoked from the specified account.");
}

main()
  .catch((error: unknown) => {
    console.error("Administrator revocation failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
