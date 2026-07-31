import { describe, it, expect, vi } from "vitest";

// Must mock prisma before any app import
vi.mock("./db", () => ({ default: { $connect: vi.fn(), $disconnect: vi.fn() } }));

import app from "./app";
import request from "supertest";

describe("API Integration Tests", () => {
  describe("GET /api/health", () => {
    it("should return healthy status", async () => {
      const res = await request(app).get("/api/health");
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        success: true,
        data: {
          status: "healthy",
        },
      });
      expect(res.body.data).toHaveProperty("timestamp");
    });
  });

  describe("POST /api/auth/register — validation", () => {
    it("should reject empty body", async () => {
      const res = await request(app).post("/api/auth/register").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
      expect(res.body.error.details).toHaveProperty("email");
      expect(res.body.error.details).toHaveProperty("password");
    });

    it("should reject weak password", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "test@test.com",
        password: "short",
        firstName: "Test",
        lastName: "User",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.details.password).toBeDefined();
    });

    it("should reject invalid email", async () => {
      const res = await request(app).post("/api/auth/register").send({
        email: "not-an-email",
        password: "Password1",
        firstName: "Test",
        lastName: "User",
      });
      expect(res.status).toBe(400);
      expect(res.body.error.details.email).toBeDefined();
    });
  });

  describe("POST /api/auth/login — validation", () => {
    it("should reject empty body", async () => {
      const res = await request(app).post("/api/auth/login").send({});
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });

  describe("GET /api/bots/templates", () => {
    it("should return bot templates without auth", async () => {
      const res = await request(app).get("/api/bots/templates");
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      expect(res.body.data[0]).toHaveProperty("name");
      expect(res.body.data[0]).toHaveProperty("type");
      expect(res.body.data[0]).toHaveProperty("strategy");
    });
  });

  describe("Protected routes — no token", () => {
    it("should reject GET /api/bots without token", async () => {
      const res = await request(app).get("/api/bots");
      expect(res.status).toBe(401);
    });

    it("should reject POST /api/bots without token", async () => {
      const res = await request(app).post("/api/bots").send({ templateIndex: 0 });
      expect(res.status).toBe(401);
    });

    it("should reject GET /api/wallets without token", async () => {
      const res = await request(app).get("/api/wallets");
      expect(res.status).toBe(401);
    });
  });

  describe("404 handler", () => {
    it("should return 404 for unknown endpoints", async () => {
      const res = await request(app).get("/api/nonexistent");
      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe("NOT_FOUND");
    });
  });
});
