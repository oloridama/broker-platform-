import app from "./app";
import { config } from "./config";
import prisma from "./db";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { startBotScheduler } from "./botScheduler";

async function main() {
  try {
    await prisma.$connect();
    console.log("✅ Database connected");
  } catch (err) {
    console.warn("⚠️  Database unavailable — auth & data endpoints will return 503.");
  }

  const server = http.createServer(app);

  // ── WebSocket server for real-time prices ────────────
  const wss = new WebSocketServer({ server, path: "/ws" });
  const clients = new Set<WebSocket>();

  // Simulate live prices for connected clients
  const basePrices: Record<string, number> = {
    "BTC/USD": 63250, "ETH/USD": 3125, "EUR/USD": 1.0856,
    "GBP/USD": 1.2645, "XAU/USD": 2350.80, "AAPL": 195.50,
    "NVDA": 190.01, "TSLA": 298.32,
  };

  setInterval(() => {
    if (clients.size === 0) return;
    const updates: Record<string, { price: number; change: number }> = {};
    for (const [symbol, price] of Object.entries(basePrices)) {
      const jitter = (Math.random() - 0.5) * 0.002;
      const newPrice = price * (1 + jitter);
      basePrices[symbol] = newPrice;
      updates[symbol] = { price: newPrice, change: jitter * 100 };
    }
    const msg = JSON.stringify({ type: "price_update", data: updates, ts: Date.now() });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  }, 2000);

  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "connected", message: "Live prices active" }));
    ws.on("close", () => clients.delete(ws));
  });

  server.listen(config.port, () => {
    console.log(`\n🚀 Server running on http://localhost:${config.port}`);
    console.log(`   WebSocket:   ws://localhost:${config.port}/ws`);
    console.log(`   Health:      http://localhost:${config.port}/api/health\n`);
  });

  // Start the automated trading-bot scheduler
  startBotScheduler();
}

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

main();
