import argon2 from "argon2";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { publicUserSelect } from "../users/user.model";
import type {
  ChangePasswordInput,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "./auth.schemas";

// Generate a valid dummy hash once per server process.
// This helps reduce timing differences for nonexistent email addresses.
const dummyPasswordHashPromise = argon2.hash(
  "kwetu-dummy-password-never-used-for-login",
  {
    type: argon2.argon2id,
  },
);

export class AuthError extends Error {
  constructor(
    public readonly code:
      | "EMAIL_EXISTS"
      | "INVALID_CREDENTIALS"
      | "INVALID_CURRENT_PASSWORD"
      | "ACCOUNT_INACTIVE",
    message: string,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
) {
  return prisma.user.update({
    where: { id: userId },
    data: input,
    select: publicUserSelect,
  });
}

export async function changeUserPassword(
  userId: string,
  input: ChangePasswordInput,
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, isActive: true },
  });

  if (!user) {
    throw new AuthError(
      "INVALID_CURRENT_PASSWORD",
      "The current password is incorrect.",
    );
  }

  if (!user.isActive) {
    throw new AuthError(
      "ACCOUNT_INACTIVE",
      "This account is not active. Contact support if you need help.",
    );
  }

  const validPassword = await argon2
    .verify(user.passwordHash, input.currentPassword)
    .catch(() => false);

  if (!validPassword) {
    throw new AuthError(
      "INVALID_CURRENT_PASSWORD",
      "The current password is incorrect.",
    );
  }

  const passwordHash = await argon2.hash(input.newPassword, {
    type: argon2.argon2id,
  });

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });
}

export async function registerUser(input: RegisterInput) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
  });

  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.create({
        data: {
          fullName: input.fullName,
          email: input.email,
          passwordHash,
        },
        select: publicUserSelect,
      });
      const templates = await transaction.platformCategoryTemplate.findMany({
        where: { isActive: true },
        select: { name: true, type: true },
      });
      if (templates.length) {
        await transaction.category.createMany({
          data: templates.map((template) => ({
            userId: user.id,
            name: template.name,
            type: template.type,
          })),
        });
      }
      return user;
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AuthError(
        "EMAIL_EXISTS",
        "An account with this email already exists.",
      );
    }

    throw error;
  }
}

export function findUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

export async function authenticateUser(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email,
    },
  });

  if (!user) {
    const dummyHash = await dummyPasswordHashPromise;

    await argon2
      .verify(dummyHash, input.password)
      .catch(() => false);

    throw new AuthError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  const validPassword = await argon2
    .verify(user.passwordHash, input.password)
    .catch(() => false);

  if (!validPassword) {
    throw new AuthError(
      "INVALID_CREDENTIALS",
      "Email or password is incorrect.",
    );
  }

  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    currency: user.currency,
    financialPreferences: user.financialPreferences,
    notificationPreferences: user.notificationPreferences,
    role: user.role,
    profilePhoto: user.profilePhoto,
    themePreference: user.themePreference,
    createdAt: user.createdAt,
  };
}