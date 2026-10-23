import express, { type Request, type Response, type NextFunction } from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { requireAdmin } from "../src/middleware/auth.middleware";
import app from "../src/app";

function appForRole(role: "USER" | "ADMIN") {
  const app = express();
  app.use((req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { user: { id: string; email: string; role: "USER" | "ADMIN" } }).user = {
      id: "00000000-0000-4000-8000-000000000001",
      email: "test@example.com",
      role,
    };
    next();
  });
  app.get("/admin", requireAdmin, (_req, res) => {
    res.status(200).json({ allowed: true });
  });
  return app;
}

describe("requireAdmin", () => {
  it("denies a regular authenticated user", async () => {
    const response = await request(appForRole("USER")).get("/admin");
    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ADMIN_ACCESS_REQUIRED");
  });

  it("allows an administrator", async () => {
    const response = await request(appForRole("ADMIN")).get("/admin");
    expect(response.status).toBe(200);
    expect(response.body.allowed).toBe(true);
  });

  it("mounts administrator endpoints behind authentication", async () => {
    const response = await request(app).get("/api/v1/admin/overview");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });

  it("requires authentication before accepting user issue reports", async () => {
    const response = await request(app).post("/api/v1/issues").send({});
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("AUTHENTICATION_REQUIRED");
  });
});
