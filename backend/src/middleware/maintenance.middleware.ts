import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";

interface MaintenanceSettings {
  enabled: boolean;
  message: string;
}

let cachedSettings: MaintenanceSettings | null = null;
let cachedAt = 0;
const CACHE_DURATION_MS = 5000;

export function updateMaintenanceSettingsCache(settings: MaintenanceSettings): void {
  cachedSettings = settings;
  cachedAt = Date.now();
}

async function readMaintenanceSettings(): Promise<MaintenanceSettings> {
  if (cachedSettings && Date.now() - cachedAt < CACHE_DURATION_MS) {
    return cachedSettings;
  }
  const [mode, message] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: "maintenanceMode" } }),
    prisma.platformSetting.findUnique({ where: { key: "maintenanceMessage" } }),
  ]);
  cachedSettings = {
    enabled: mode?.value === true,
    message: typeof message?.value === "string"
      ? message.value
      : "Kwetu is temporarily unavailable while we carry out maintenance.",
  };
  cachedAt = Date.now();
  return cachedSettings;
}

export async function maintenanceMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  if (
    req.path.startsWith("/admin") ||
    req.path.startsWith("/auth") ||
    req.path.startsWith("/health")
  ) {
    next();
    return;
  }
  try {
    const settings = await readMaintenanceSettings();
    if (settings.enabled) {
      res.status(503).json({
        error: {
          code: "MAINTENANCE_MODE",
          message: settings.message,
        },
      });
      return;
    }
    next();
  } catch (error) {
    next(error);
  }
}
