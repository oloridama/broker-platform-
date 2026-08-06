/**
 * Money helpers — round currency values to 2 decimal places (cents).
 * Avoids float precision issues (0.1 + 0.2 !== 0.3) in SQLite/local dev.
 * In production PostgreSQL, use DECIMAL(18,2) columns for exact storage.
 */
export function toMoney(value: number): number {
  // Preserve at most 2 decimals via integer cents arithmetic
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Round a trading price — preserves enough precision for low-priced assets
 * (e.g. SKRUSDT at $0.1 needs 6+ decimals so price moves aren't lost).
 */
export function toPrice(value: number): number {
  const magnitude = Math.max(Math.abs(value), 1e-9);
  // Use more decimals for smaller prices
  const decimals = magnitude < 1 ? 8 : magnitude < 10 ? 6 : magnitude < 1000 ? 4 : 2;
  const factor = Math.pow(10, decimals);
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function isValidMoney(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}
