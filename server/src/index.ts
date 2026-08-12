import app from "./app";
import { config } from "./config";
import prisma from "./db";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import { startBotScheduler } from "./botScheduler";
import { fetchAllMarketPrices } from "./services/market.service";

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

  // Broadcast REAL market prices (Binance crypto + Yahoo forex/gold/stocks)
  // every 15s so the floating ticker matches the markets page / API prices.
  async function broadcastPrices() {
    if (clients.size === 0) return;
    try {
      const prices = await fetchAllMarketPrices();
      if (!prices.length) return;
      const data: Record<string, { price: number; change: number }> = {};
      for (const p of prices) data[p.symbol] = { price: p.price, change: p.change };
      const msg = JSON.stringify({ type: "price_update", data, ts: Date.now() });
      for (const ws of clients) {
        if (ws.readyState === WebSocket.OPEN) ws.send(msg);
      }
    } catch (err) {
      console.warn("[ws] price broadcast error:", (err as Error).message);
    }
  }

  // Push a snapshot on connect, then every 15s
  wss.on("connection", (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: "connected", message: "Live prices active" }));
    broadcastPrices().catch(() => {});
    ws.on("close", () => clients.delete(ws));
  });

  setInterval(() => {
    broadcastPrices().catch(() => {});
  }, 15_000);

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
