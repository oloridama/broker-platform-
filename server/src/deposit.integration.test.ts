import { describe, it, expect, vi, beforeAll } from "vitest";

// Mock prisma BEFORE app import
vi.mock("./db", () => ({
  default: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    depositMethod: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    pendingDeposit: { create: vi.fn() },
    wallet: { findFirst: vi.fn() },
    user: { findUnique: vi.fn() },
  },
}));

import app from "./app";
import request from "supertest";
import prisma from "./db";

let authToken: string;

beforeAll(() => {
  // Simulate an authenticated admin by mocking user lookup used by authenticate
  (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
    id: "test-admin",
    email: "admin@fxatrade.live",
    firstName: "Admin",
    lastName: "User",
    role: "ADMIN",
  });
  // Craft a real signed token using the app's configured access secret
  const jwt = require("jsonwebtoken");
  authToken = jwt.sign(
    { sub: "test-admin", email: "admin@fxatrade.live", role: "ADMIN" },
    process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
    { expiresIn: "15m" },
  );
});

describe("Deposit API Integration", () => {
  it("GET /api/deposits/methods requires auth", async () => {
    const res = await request(app).get("/api/deposits/methods");
    expect(res.status).toBe(401);
  });

  it("POST /api/deposits requires auth", async () => {
    const res = await request(app).post("/api/deposits").send({ methodId: "m1", amount: 100 });
    expect(res.status).toBe(401);
  });

  it("rejects Infinity amount with 400", async () => {
    (prisma.depositMethod.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "m1", minAmount: 50, maxAmount: 50000,
      config: JSON.stringify({ custodianAddress: "bc1abc" }),
    });
    const res = await request(app)
      .post("/api/deposits")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ methodId: "m1", amount: 1e309, currency: "USD" });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("rejects negative amount with 400", async () => {
    const res = await request(app)
      .post("/api/deposits")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ methodId: "m1", amount: -100, currency: "USD" });
    expect(res.status).toBe(400);
  });

  it("admin endpoints require ADMIN role", async () => {
    // User token (no admin role) → 403
    const jwt = require("jsonwebtoken");
    const userToken = jwt.sign(
      { sub: "u1", email: "u@x.com", role: "USER" },
      process.env.JWT_ACCESS_SECRET || "dev-access-secret-change-me",
      { expiresIn: "15m" },
    );
    const res = await request(app)
      .get("/api/deposits/admin/methods")
      .set("Authorization", `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
