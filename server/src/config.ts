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
  appUrl: process.env.APP_URL || "http://localhost:5173",

  mail: {
    host: process.env.SMTP_HOST || "",
    port: parseInt(process.env.SMTP_PORT || "587", 10),
    secure: (process.env.SMTP_SECURE || "false") === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.MAIL_FROM || "no-reply@fxatrade.live",
  },

  webhook: {
    // Shared secret used by the standalone bot engine (server-to-server).
    botProfitToken: process.env.WEBHOOK_BOT_PROFIT_TOKEN || "dev-webhook-token-change-me",
  },


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
    // Account creation is capped far tighter than general traffic (anti-bot).
    registerWindowMs: parseInt(process.env.REGISTER_RATE_WINDOW_MS || "3600000", 10),
    registerMax: parseInt(process.env.REGISTER_RATE_MAX || "3", 10),
  },

  backup: {
    // Where retained snapshots live (relative paths resolve from the process CWD).
    dir: process.env.BACKUP_DIR || "backups",
    // Snapshots kept on the box before the oldest are pruned.
    retention: parseInt(process.env.BACKUP_RETENTION || "14", 10),
    // Automatic snapshot cadence in hours. 0 disables the scheduler.
    intervalHours: parseFloat(process.env.BACKUP_INTERVAL_HOURS || "6"),
    // Optional off-box copy command run after each snapshot.
    // `{file}` is replaced with the snapshot path, e.g.
    //   BACKUP_REMOTE_CMD="rclone copy {file} remote:fxa-backups"
    remoteCmd: process.env.BACKUP_REMOTE_CMD || "",
  },
};
