import dotenv from "dotenv";
dotenv.config();

const isDev = (process.env.NODE_ENV || "development") !== "production";

function requireEnv(key: string, devFallback: string): string {
  const val = process.env[key];
  if (!val) {
    if (isDev) return devFallback;
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
}

export const config = {
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.SERVER_PORT || "4000", 10),

  jwt: {
    accessSecret: requireEnv("JWT_ACCESS_SECRET", "dev-access-secret-change-me"),
    refreshSecret: requireEnv("JWT_REFRESH_SECRET", "dev-refresh-secret-change-me"),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS || "12", 10),
  },

  cors: {
    origins: (process.env.CORS_ORIGINS || "http://localhost:5173").split(","),
  },

  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || "900000", 10),
    max: parseInt(process.env.RATE_LIMIT_MAX || "600", 10),
  },
};
