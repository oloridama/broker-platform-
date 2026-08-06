import { describe, it, expect } from "vitest";
import { moneyAmount } from "./validators";
import { toMoney, isValidMoney } from "./utils/money";

describe("Security Regression: Money Validation", () => {
  it("rejects Infinity (1e309) — the DoS vector", () => {
    const r = moneyAmount.safeParse(1e309);
    expect(r.success).toBe(false);
  });

  it("rejects NaN", () => {
    expect(moneyAmount.safeParse(NaN).success).toBe(false);
  });

  it("rejects negative amounts", () => {
    expect(moneyAmount.safeParse(-1).success).toBe(false);
  });

  it("rejects zero", () => {
    expect(moneyAmount.safeParse(0).success).toBe(false);
  });

  it("rejects amounts over max (100M)", () => {
    expect(moneyAmount.safeParse(1e9).success).toBe(false);
  });

  it("accepts valid amount", () => {
    expect(moneyAmount.safeParse(150.25).success).toBe(true);
  });

  it("accepts small valid amount", () => {
    expect(moneyAmount.safeParse(0.01).success).toBe(true);
  });
});

describe("Money utils", () => {
  it("rounds to 2 decimal places", () => {
    expect(toMoney(0.1 + 0.2)).toBe(0.3);
    expect(toMoney(99.999)).toBe(100);
    expect(toMoney(150.256)).toBe(150.26);
  });

  it("isValidMoney rejects Infinity/NaN/strings", () => {
    expect(isValidMoney(100)).toBe(true);
    expect(isValidMoney(Infinity)).toBe(false);
    expect(isValidMoney(NaN)).toBe(false);
    expect(isValidMoney("100")).toBe(false);
  });
});
