import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ── Clean existing data ───────────────────────────────
  await prisma.pendingDeposit.deleteMany();
  await prisma.depositMethod.deleteMany();
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

  // ── Deposit Methods ──────────────────────────────────
  await prisma.depositMethod.createMany({
    data: [
      {
        type: "CUSTODIAN",
        name: "BTC Custodian Wallet",
        description: "Send Bitcoin to our shared custodian pool. Credited after 1 network confirmation.",
        isActive: true,
        minAmount: 50,
        maxAmount: 50000,
        config: JSON.stringify({
          custodianAddress: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
          network: "Bitcoin (BTC)",
          instructions: "Send only BTC to this address. Other coins will be lost.",
        }),
      },
      {
        type: "CUSTODIAN",
        name: "USDT (TRC-20) Pool",
        description: "Deposit USDT via TRC-20 to our custodian pool. Fast and low-fee.",
        isActive: true,
        minAmount: 20,
        maxAmount: 100000,
        config: JSON.stringify({
          custodianAddress: "TXk1W2dE2j4dE6z9m3vB8nQ7pR5cY2uH1s",
          network: "Tron (TRC-20)",
          instructions: "Send USDT (TRC-20) only.",
        }),
      },
      {
        type: "CUSTODIAN",
        name: "ETH Custodian Wallet",
        description: "Deposit Ethereum or ERC-20 tokens to our custodian pool.",
        isActive: false,
        minAmount: 50,
        maxAmount: 50000,
        config: JSON.stringify({
          custodianAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d8976F",
          network: "Ethereum (ERC-20)",
          instructions: "Send ETH or ERC-20 tokens only.",
        }),
      },
      {
        type: "BANK_WIRE",
        name: "Bank Wire Transfer",
        description: "SWIFT / SEPA bank transfer. Processed within 1-2 business days.",
        isActive: false,
        minAmount: 500,
        maxAmount: 500000,
        config: JSON.stringify({
          bankName: "Global Trust Bank",
          accountName: "FXA Trade Ltd",
          iban: "GB29NWBK60161331926819",
          swift: "NWBKGB2L",
          reference: "FXA-USERID",
        }),
      },
    ],
  });

  console.log("✅ Seed complete!");
  console.log("   Admin: admin@fxatrade.live / Admin123!");
  console.log("   Demo:  demo@fxatrade.live / Admin123!");
  console.log("   Deposit methods: BTC, USDT pools seeded (ETH & Bank wire inactive)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
