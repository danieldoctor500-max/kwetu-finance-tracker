
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";

import type {
  CreateSavingsGoalInput,
  ListSavingsGoalsInput,
  UpdateSavingsGoalInput,
} from "./savings-goal.schemas";

export class SavingsGoalServiceError extends Error {
  constructor(
    public readonly code:
      | "SAVINGS_GOAL_NOT_FOUND"
      | "INVALID_SAVINGS_GOAL_AMOUNT"
      | "INVALID_SAVINGS_GOAL_STATUS",
    message: string,
  ) {
    super(message);
    this.name = "SavingsGoalServiceError";
  }
}

type SavingsGoalRecord = Prisma.SavingsGoalGetPayload<{}>;

function toDecimal(value: string | Prisma.Decimal): Prisma.Decimal {
  return new Prisma.Decimal(value);
}

function serializeSavingsGoal(goal: SavingsGoalRecord) {
  const targetAmount = toDecimal(goal.targetAmount);
  const currentAmount = toDecimal(goal.currentAmount);

  const progressPercentage = Number(
    currentAmount
      .dividedBy(targetAmount)
      .times(100)
      .toDecimalPlaces(2)
      .toString(),
  );

  return {
    id: goal.id,
    name: goal.name,
    targetAmount: targetAmount.toFixed(2),
    currentAmount: currentAmount.toFixed(2),
    remainingAmount: targetAmount.minus(currentAmount).toFixed(2),
    progressPercentage,
    deadline: goal.deadline,
    status: goal.status,
    isCompleted: goal.status === "COMPLETED",
    createdAt: goal.createdAt,
    updatedAt: goal.updatedAt,
  };
}

function validateGoalAmounts(
  targetAmount: Prisma.Decimal,
  currentAmount: Prisma.Decimal,
): void {
  if (!targetAmount.greaterThan(0)) {
    throw new SavingsGoalServiceError(
      "INVALID_SAVINGS_GOAL_AMOUNT",
      "Target amount must be greater than zero.",
    );
  }

  if (currentAmount.lessThan(0) || currentAmount.greaterThan(targetAmount)) {
    throw new SavingsGoalServiceError(
      "INVALID_SAVINGS_GOAL_AMOUNT",
      "Current amount must be between zero and the target amount.",
    );
  }
}

function validateStatusTransition(
  currentStatus: "ACTIVE" | "COMPLETED" | "CANCELLED",
  nextStatus: "ACTIVE" | "COMPLETED" | "CANCELLED" | undefined,
): void {
  if (!nextStatus || nextStatus === currentStatus) {
    return;
  }

  if (currentStatus !== "ACTIVE") {
    throw new SavingsGoalServiceError(
      "INVALID_SAVINGS_GOAL_STATUS",
      "Completed or cancelled goals cannot change status.",
    );
  }
}

/**
 * Create a savings goal for the authenticated user.
 */
export async function createSavingsGoal(
  userId: string,
  input: CreateSavingsGoalInput,
) {
  const targetAmount = toDecimal(input.targetAmount);
  const currentAmount = toDecimal(input.currentAmount ?? "0");

  validateGoalAmounts(targetAmount, currentAmount);

  const goal = await prisma.savingsGoal.create({
    data: {
      userId,
      name: input.name,
      targetAmount,
      currentAmount,
      ...(input.deadline !== undefined
        ? { deadline: input.deadline }
        : {}),
      status: currentAmount.equals(targetAmount)
        ? "COMPLETED"
        : "ACTIVE",
    },
  });

  return serializeSavingsGoal(goal);
}

/**
 * List the authenticated user's savings goals.
 */
export async function listSavingsGoals(
  userId: string,
  filters: ListSavingsGoalsInput,
) {
  const goals = await prisma.savingsGoal.findMany({
    where: {
      userId,
      ...(filters.status ? { status: filters.status } : {}),
    },
    orderBy: [
      { createdAt: "desc" },
      { name: "asc" },
    ],
  });

  const data = goals.map(serializeSavingsGoal);

  return {
    data,
    total: data.length,
  };
}

/**
 * Retrieve one savings goal belonging to the authenticated user.
 */
export async function getSavingsGoalById(
  userId: string,
  goalId: string,
) {
  const goal = await prisma.savingsGoal.findFirst({
    where: {
      id: goalId,
      userId,
    },
  });

  if (!goal) {
    throw new SavingsGoalServiceError(
      "SAVINGS_GOAL_NOT_FOUND",
      "The savings goal does not exist or is not available to your account.",
    );
  }

  return serializeSavingsGoal(goal);
}

/**
 * Update a savings goal owned by the authenticated user.
 */
export async function updateSavingsGoal(
  userId: string,
  goalId: string,
  input: UpdateSavingsGoalInput,
) {
  const existingGoal = await prisma.savingsGoal.findFirst({
    where: {
      id: goalId,
      userId,
    },
  });

  if (!existingGoal) {
    throw new SavingsGoalServiceError(
      "SAVINGS_GOAL_NOT_FOUND",
      "The savings goal does not exist or is not available to your account.",
    );
  }

  validateStatusTransition(existingGoal.status, input.status);

  const targetAmount = toDecimal(
    input.targetAmount ?? existingGoal.targetAmount,
  );

  const currentAmount = toDecimal(
    input.currentAmount ?? existingGoal.currentAmount,
  );

  validateGoalAmounts(targetAmount, currentAmount);

  const nextStatus =
    input.status ??
    (currentAmount.equals(targetAmount)
      ? "COMPLETED"
      : existingGoal.status === "COMPLETED"
        ? "COMPLETED"
        : "ACTIVE");

  if (
    nextStatus === "COMPLETED" &&
    !currentAmount.equals(targetAmount)
  ) {
    throw new SavingsGoalServiceError(
      "INVALID_SAVINGS_GOAL_STATUS",
      "A goal can only be completed when its current amount reaches its target.",
    );
  }

  const updatedGoal = await prisma.savingsGoal.update({
    where: {
      id: existingGoal.id,
    },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      targetAmount,
      currentAmount,
      ...(input.deadline !== undefined
        ? { deadline: input.deadline }
        : {}),
      status: nextStatus,
    },
  });

  return serializeSavingsGoal(updatedGoal);
}

/**
 * Delete a savings goal belonging to the authenticated user.
 */
export async function deleteSavingsGoal(
  userId: string,
  goalId: string,
): Promise<void> {
  const result = await prisma.savingsGoal.deleteMany({
    where: {
      id: goalId,
      userId,
    },
  });

  if (result.count === 0) {
    throw new SavingsGoalServiceError(
      "SAVINGS_GOAL_NOT_FOUND",
      "The savings goal does not exist or is not available to your account.",
    );
  }
}
