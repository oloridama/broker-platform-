import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import tradingRoutes from "./routes/trading.routes";
import walletRoutes from "./routes/wallet.routes";
import userRoutes from "./routes/user.routes";
import botRoutes from "./routes/bot.routes";
import adminRoutes from "./routes/admin.routes";
import depositRoutes from "./routes/deposit.routes";
import marketRoutes from "./routes/market.routes";

// ── Initialise Express ──────────────────────────────────
const app = express();

// ── Security headers ────────────────────────────────────
// CSP is configured to allow the live-data sources the frontend needs:
// Binance (crypto prices), Google Fonts, same-origin API/WebSocket, and the
// Cloudflare Insights beacon. Helmet's default CSP would block all of these.
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://static.cloudflareinsights.com"],
        "connect-src": ["'self'", "https://api.binance.com", "wss:", "https:"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https:"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
        "upgrade-insecure-requests": [],
      },
    },
    crossOriginEmbedderPolicy: false,
  }),
);

// ── CORS ────────────────────────────────────────────────
app.use(
  cors({
    origin: config.cors.origins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

// ── Rate limiting (global) ─────────────────────────────
app.use(
  rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMIT", message: "Too many requests" } },
  }),
);

// ── Strict rate limit for auth (brute-force protection) ─
// Separate limiter applied to /api/auth/* — max 10 attempts per 15 min per IP.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: { success: false, error: { code: "AUTH_RATE_LIMIT", message: "Too many attempts. Try again later." } },
});
app.use("/api/auth", authLimiter);

// ── Body parsing ────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Compression ─────────────────────────────────────────
app.use(compression());

// ── Request logging ─────────────────────────────────────
if (config.env !== "test") {
  app.use(morgan(config.env === "development" ? "dev" : "combined"));
}

// ── Health check ────────────────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({ success: true, data: { status: "healthy", timestamp: new Date().toISOString() } });
});

// ── Routes ──────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/trading", tradingRoutes);
app.use("/api/wallets", walletRoutes);
app.use("/api/users", userRoutes);
app.use("/api/bots", botRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/deposits", depositRoutes);
app.use("/api/markets", marketRoutes);

// ── Production: serve built client + SPA fallback ─────
// In production, Express serves the compiled React app (client/dist) so a
// single process can host both the API and the frontend. In development the
// Vite dev server handles the client, so this block is skipped.
if (config.env === "production") {
  const clientDist = path.resolve(__dirname, "../../client/dist");
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    // SPA fallback — all non-API GETs return index.html (client-side routing)
    app.get(/^\/(?!api|ws).*/, (_req, res) => {
      res.sendFile(path.join(clientDist, "index.html"));
    });
  } else {
    console.warn(`⚠️  client/dist not found at ${clientDist} — frontend will not be served. Run "npm run build:client".`);
  }
}

// ── 404 handler ─────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, error: { code: "NOT_FOUND", message: "Endpoint not found" } });
});

// ── Global error handler (must be last) ─────────────────
app.use(errorHandler);

export default app;
