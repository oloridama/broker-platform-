/**
 * Restore recovered user accounts into a fresh database.
 *
 * WHY THIS EXISTS
 * ---------------
 * The previous production host expired with no backup, destroying the live
 * SQLite database. The account states below were recovered from an earlier
 * audit of that database (emails, wallet balances, order and bot counts) and
 * are re-imported here so real customers keep their money and history.
 *
 * WHAT IS AND IS NOT RECOVERED
 * ----------------------------
 *  - Recovered: email, wallet balance, order count, bot count.
 *  - NOT recovered: password hashes, names, trade history, KYC, deposit
 *    history. Password hashes did not survive, so every restored account gets a
 *    fresh random temporary password written to the credentials CSV. Users MUST
 *    change it on first login; distribute credentials out-of-band only.
 *
 * Balances are restored to the default USD wallet. Order/bot counts are
 * recorded in the audit log rather than fabricated as fake orders/trades —
 * inventing trade history would misstate what a customer actually did.
 *
 * USAGE
 *   npx tsx prisma/restore-recovered-users.ts                    # dry run
 *   npx tsx prisma/restore-recovered-users.ts --apply            # write
 *   npx tsx prisma/restore-recovered-users.ts --apply --overwrite-balance
 *
 * Flags:
 *   --apply              Actually write to the database (default: dry run).
 *   --overwrite-balance  Reset the balance of an already-existing account.
 *   --file <path>        Manifest path (default: prisma/recovered-users.json).
 *   --creds <path>       Credentials output (default: prisma/recovered-credentials.csv).
 */
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

interface RecoveredUser {
  email: string;
  balance: number;
  orders?: number;
  bots?: number;
  firstName?: string;
  lastName?: string;
  note?: string;
}

interface Manifest {
  source?: string;
  capturedAt?: string;
  currency?: string;
  users: RecoveredUser[];
}

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};

const APPLY = flag("--apply");
const OVERWRITE_BALANCE = flag("--overwrite-balance");
const MANIFEST_PATH = path.resolve(process.cwd(), opt("--file", "prisma/recovered-users.json"));
const CREDS_PATH = path.resolve(process.cwd(), opt("--creds", "prisma/recovered-credentials.csv"));
const BCRYPT_ROUNDS = 12;

/** Generate a temporary password that satisfies the password policy. */
function tempPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(14);
  let core = "";
  for (const b of bytes) core += alphabet[b % alphabet.length];
  // "Aa9" prefix guarantees uppercase + digit for the validator.
  return `Aa9${core}`;
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return email;
  const shown = local.slice(0, 2);
  return `${shown}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
}

function money(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function readManifest(): Manifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error(`\n✗ Manifest not found: ${MANIFEST_PATH}`);
    console.error("  Copy prisma/recovered-users.example.json and fill in the real values.\n");
    process.exit(1);
  }
  const parsed = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8")) as Manifest;
  if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
    console.error("✗ Manifest has no users");
    process.exit(1);
  }

  const seen = new Set<string>();
  for (const u of parsed.users) {
    if (!u.email || !u.email.includes("@")) {
      console.error(`✗ Invalid email in manifest: ${JSON.stringify(u.email)}`);
      process.exit(1);
    }
    if (typeof u.balance !== "number" || !Number.isFinite(u.balance) || u.balance < 0) {
      console.error(`✗ Invalid balance for ${u.email}: ${JSON.stringify(u.balance)}`);
      process.exit(1);
    }
    const key = u.email.toLowerCase();
    if (seen.has(key)) {
      console.error(`✗ Duplicate email in manifest: ${u.email}`);
      process.exit(1);
    }
    seen.add(key);
  }
  return parsed;
}

async function main() {
  const manifest = readManifest();
  const currency = manifest.currency || "USD";

  console.log(`\n${"═".repeat(66)}`);
  console.log(`  Recovered account import — ${APPLY ? "APPLY" : "DRY RUN (no writes)"}`);
  console.log(`${"═".repeat(66)}`);
  console.log(`  Manifest : ${MANIFEST_PATH}`);
  if (manifest.source) console.log(`  Source   : ${manifest.source}`);
  if (manifest.capturedAt) console.log(`  Captured : ${manifest.capturedAt}`);
  console.log(`  Accounts : ${manifest.users.length}`);
  console.log(`${"═".repeat(66)}\n`);

  // Audit trail needs an admin to attribute the import to.
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });

  const creds: string[] = ["email,tempPassword,balance,status"];
  const summary: string[] = [];
  let created = 0;
  let skipped = 0;
  let balanceUpdated = 0;
  let totalRestored = 0;

  for (const u of manifest.users) {
    const email = u.email.trim().toLowerCase();
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      if (!OVERWRITE_BALANCE) {
        skipped++;
        summary.push(`  = ${email.padEnd(32)} exists, left untouched (balance ${money(u.balance)})`);
        creds.push(`${email},,${u.balance.toFixed(2)},skipped-exists`);
        continue;
      }

      // Balance reset on an existing account, logging the delta for the audit trail.
      const wallet =
        (await prisma.wallet.findFirst({ where: { userId: existing.id, currency, isDefault: true } })) ??
        (await prisma.wallet.findFirst({ where: { userId: existing.id, currency } }));

      const before = wallet?.balance ?? 0;
      if (APPLY) {
        if (wallet) {
          await prisma.wallet.update({ where: { id: wallet.id }, data: { balance: u.balance } });
        } else {
          await prisma.wallet.create({
            data: { userId: existing.id, currency, balance: u.balance, isDefault: true },
          });
        }
        if (admin) {
          await prisma.adminAction.create({
            data: {
              adminId: admin.id,
              actionType: "RECOVERY_BALANCE_RESET",
              description: `Recovery import set ${email} balance to ${money(u.balance)} ${currency} (was ${money(before)})`,
              metadata: JSON.stringify({ email, before, after: u.balance, currency }),
            },
          });
        }
      }
      balanceUpdated++;
      totalRestored += u.balance;
      summary.push(`  ~ ${email.padEnd(32)} balance ${money(before)} → ${money(u.balance)}`);
      creds.push(`${email},,${u.balance.toFixed(2)},balance-reset`);
      continue;
    }

    // ── New account ──────────────────────────────────
    const password = tempPassword();
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const fallbackName = email.split("@")[0].replace(/[^a-zA-Z]/g, " ").trim() || "Client";
    const firstName = (u.firstName || fallbackName).slice(0, 40);
    const lastName = (u.lastName || "").slice(0, 40);

    if (APPLY) {
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role: "USER",
          isActive: true,
          createdAt: manifest.capturedAt ? new Date(manifest.capturedAt) : undefined,
          wallets: {
            create: { currency, balance: u.balance, isDefault: true },
          },
        },
      });

      if (admin) {
        await prisma.adminAction.create({
          data: {
            adminId: admin.id,
            actionType: "RECOVERY_USER_IMPORTED",
            description: `Recovered account ${email} with ${money(u.balance)} ${currency}`,
            metadata: JSON.stringify({
              email,
              userId: user.id,
              balance: u.balance,
              currency,
              recoveredOrders: u.orders ?? 0,
              recoveredBots: u.bots ?? 0,
              note: u.note ?? "",
              source: manifest.source ?? "",
            }),
          },
        });
      }
    }

    created++;
    totalRestored += u.balance;
    summary.push(`  + ${email.padEnd(32)} ${money(u.balance)} ${currency}` +
      (u.bots ? `, ${u.bots} bot(s) noted` : "") +
      (u.orders ? `, ${u.orders} order(s) noted` : ""));
    creds.push(`${email},${password},${u.balance.toFixed(2)},created`);
  }

  console.log("Results:");
  console.log(summary.join("\n"));
  console.log(`\n${"─".repeat(66)}`);
  console.log(`  created: ${created}   balance-reset: ${balanceUpdated}   skipped: ${skipped}`);
  console.log(`  total balance restored: ${money(totalRestored)} ${currency}`);
  console.log(`${"─".repeat(66)}\n`);

  if (created > 0) {
    if (APPLY) {
      fs.mkdirSync(path.dirname(CREDS_PATH), { recursive: true });
      fs.writeFileSync(CREDS_PATH, creds.join("\n") + "\n", { mode: 0o600 });
      console.log(`🔑 Temporary credentials written to: ${CREDS_PATH}`);
      console.log("   ⚠️  Distribute these out-of-band and have each user change the password.");
      console.log("   ⚠️  NEVER commit this file — it contains live credentials.\n");
    } else {
      console.log("Dry run: no accounts written and no credentials generated.");
      console.log("Re-run with --apply to import.\n");
    }
  } else if (!APPLY) {
    console.log("Dry run complete.\n");
  }
}

main()
  .catch((err) => {
    console.error("\n✗ Recovery import failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
