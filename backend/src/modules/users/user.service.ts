import { Prisma } from "../../generated/prisma/client";
import type { UpdateUserInput } from "./user.schemas";
import { findUserById, updateUserById } from "./user.repository";

export class UserServiceError extends Error {
  constructor(
    public readonly code: "USER_NOT_FOUND" | "EMAIL_EXISTS",
    message: string,
  ) {
    super(message);
    this.name = "UserServiceError";
  }
}

export async function getUserProfile(userId: string) {
  const user = await findUserById(userId);
  if (!user) {
    throw new UserServiceError(
      "USER_NOT_FOUND",
      "The user does not exist or is not available to your account.",
    );
  }
  return user;
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserInput,
) {
  try {
    return await updateUserById(userId, input);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      input.email !== undefined
    ) {
      throw new UserServiceError(
        "EMAIL_EXISTS",
        "An account with this email already exists.",
      );
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      throw new UserServiceError(
        "USER_NOT_FOUND",
        "The user does not exist or is not available to your account.",
      );
    }

    throw error;
  }
}
