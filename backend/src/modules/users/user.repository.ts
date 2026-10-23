import type { UpdateUserInput } from "./user.schemas";
import { publicUserSelect } from "./user.model";
import { prisma } from "../../lib/prisma";

export function findUserById(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: publicUserSelect,
  });
}

export function updateUserById(userId: string, input: UpdateUserInput) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: publicUserSelect,
  });
}
