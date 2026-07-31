import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean existing data ───────────────────────────────
  await prisma.transaction.deleteMany();
  await prisma.position.deleteMany();
  await prisma.order.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.tradingAccount.deleteMany();
  await prisma.wallet.deleteMany();
  await prisma.kyc.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.instrument.deleteMany();

  // ── Users ─────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("Admin123!", 12);

  const admin = await prisma.user.create({
    data: {
      email: "admin@fxatrade.live",
      passwordHash,
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
    },
  });

  const demoUser = await prisma.user.create({
    data: {
      email: "demo@fxatrade.live",
      passwordHash,
      firstName: "Demo",
      lastName: "Trader",
      role: "USER",
    },
  });

  // ── Trading accounts ──────────────────────────────────
  await prisma.tradingAccount.createMany({
    data: [
      { userId: admin.id, accountType: "VIP", leverage: 500, balance: 100000, equity: 100000, freeMargin: 100000 },
      { userId: demoUser.id, accountType: "STANDARD", leverage: 100, balance: 10000, equity: 10000, freeMargin: 10000 },
      { userId: demoUser.id, accountType: "DEMO", leverage: 200, balance: 50000, equity: 50000, freeMargin: 50000 },
    ],
  });

  // ── Wallets ───────────────────────────────────────────
  await prisma.wallet.createMany({
    data: [
      { userId: admin.id, balance: 50000, currency: "USD", isDefault: true },
      { userId: demoUser.id, balance: 5000, currency: "USD", isDefault: true },
    ],
  });

  // ── Instruments ───────────────────────────────────────
  const instruments = await Promise.all([
    prisma.instrument.create({ data: { symbol: "EUR/USD", name: "Euro / US Dollar", type: "FOREX", category: "Major", spread: 1.0, pipSize: 0.0001, commission: 7 } }),
    prisma.instrument.create({ data: { symbol: "GBP/USD", name: "British Pound / US Dollar", type: "FOREX", category: "Major", spread: 1.3, pipSize: 0.0001, commission: 7 } }),
    prisma.instrument.create({ data: { symbol: "USD/JPY", name: "US Dollar / Japanese Yen", type: "FOREX", category: "Major", spread: 0.8, pipSize: 0.01, commission: 7 } }),
    prisma.instrument.create({ data: { symbol: "BTC/USD", name: "Bitcoin / US Dollar", type: "CRYPTO", category: "Crypto", spread: 35.0, pipSize: 1.0, commission: 0 } }),
    prisma.instrument.create({ data: { symbol: "ETH/USD", name: "Ethereum / US Dollar", type: "CRYPTO", category: "Crypto", spread: 2.5, pipSize: 0.01, commission: 0 } }),
    prisma.instrument.create({ data: { symbol: "XAU/USD", name: "Gold / US Dollar", type: "COMMODITY", category: "Metals", spread: 2.5, pipSize: 0.01, commission: 0 } }),
    prisma.instrument.create({ data: { symbol: "US30", name: "US Wall Street 30", type: "INDEX", category: "Indices", spread: 3.0, pipSize: 1.0, commission: 0 } }),
    prisma.instrument.create({ data: { symbol: "AAPL", name: "Apple Inc.", type: "STOCK", category: "Tech", spread: 0.05, pipSize: 0.01, commission: 0 } }),
  ]);

  // ── Quotes ────────────────────────────────────────────
  const quoteData = [
    { instrumentId: instruments[0].id, bid: 1.0856, ask: 1.0857, high: 1.0872, low: 1.0841, open: 1.0850, change: 0.06 },
    { instrumentId: instruments[1].id, bid: 1.2645, ask: 1.2647, high: 1.2670, low: 1.2620, open: 1.2640, change: 0.05 },
    { instrumentId: instruments[2].id, bid: 149.85, ask: 149.87, high: 150.10, low: 149.50, open: 149.80, change: 0.05 },
    { instrumentId: instruments[3].id, bid: 63250.00, ask: 63285.00, high: 64100.00, low: 62800.00, open: 63500.00, change: -250 },
    { instrumentId: instruments[4].id, bid: 3125.50, ask: 3126.00, high: 3150.00, low: 3100.00, open: 3130.00, change: -4.5 },
    { instrumentId: instruments[5].id, bid: 2350.80, ask: 2351.30, high: 2365.00, low: 2340.00, open: 2350.00, change: 0.80 },
    { instrumentId: instruments[6].id, bid: 38750.00, ask: 38753.00, high: 38900.00, low: 38600.00, open: 38720.00, change: 30 },
    { instrumentId: instruments[7].id, bid: 195.50, ask: 195.55, high: 197.20, low: 194.80, open: 196.00, change: -0.50 },
  ];

  for (const q of quoteData) {
    await prisma.quote.create({ data: q });
  }

  console.log("✅ Seed complete!");
  console.log("   Admin: admin@fxatrade.live / Admin123!");
  console.log("   Demo:  demo@fxatrade.live / Admin123!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
