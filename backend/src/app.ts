
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import { env } from "./config/env";
import { prisma } from "./lib/prisma";

import authRoutes from "./modules/auth/auth.routes";
import transactionRoutes from "./modules/transactions/transaction.routes";
import categoryRoutes from "./modules/categories/category.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import budgetRoutes from "./modules/budgets/budget.routes";
import savingsGoalRoutes from "./modules/savings-goals/savings-goal.routes";
import userRoutes from "./modules/users/user.routes";
import accountRoutes from "./modules/accounts/account.routes";
import transferRoutes from "./modules/accounts/transfer.routes";
import adminRoutes from "./modules/admin/admin.routes";
import issueRoutes from "./modules/admin/issue.routes";

import { maintenanceMiddleware } from "./middleware/maintenance.middleware";
import {
  errorHandler,
  notFoundHandler,
} from "./middleware/error.middleware";

const app = express();

// Trust the single reverse-proxy hop in front of the API.
// Ensure the deployment topology matches this assumption.
app.set("trust proxy", 1);

app.disable("x-powered-by");

// Security headers. HSTS is enabled only in production.
app.use(
  helmet({
    strictTransportSecurity:
      env.NODE_ENV === "production" ? undefined : false,
  }),
);

// Allow the configured frontend origin and authentication cookies.
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  }),
);

// Parse JSON request bodies and cookies.
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

// General API rate limiting.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 100,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});

app.use("/api/v1", apiLimiter);
app.use("/api/v1", maintenanceMiddleware);

// Basic API health check.
app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    application: "Kwetu Finance Tracker",
    timestamp: new Date().toISOString(),
  });
});

// Database readiness check.
app.get("/api/v1/health/ready", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ready",
      database: "connected",
    });
  } catch (error) {
    console.error(
      "Database readiness check failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    res.status(503).json({
      status: "not_ready",
      database: "unavailable",
    });
  }
});

// Authentication and administration.
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/issues", issueRoutes);

// User profile and preferences.
app.use("/api/v1/users", userRoutes);

// Financial accounts and transfers.
app.use("/api/v1/accounts", accountRoutes);
app.use("/api/v1/transfers", transferRoutes);

// Transactions and categories.
app.use("/api/v1/transactions", transactionRoutes);
app.use("/api/v1/categories", categoryRoutes);

// Dashboard, budgets, and savings goals.
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/savings-goals", savingsGoalRoutes);

// Handle unknown routes and application errors.
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
