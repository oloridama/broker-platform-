/**
 * Money helpers — round currency values to 2 decimal places (cents).
 * Avoids float precision issues (0.1 + 0.2 !== 0.3) in SQLite/local dev.
 * In production PostgreSQL, use DECIMAL(18,2) columns for exact storage.
 */
export function toMoney(value: number): number {
  // Preserve at most 2 decimals via integer cents arithmetic
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function isValidMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
