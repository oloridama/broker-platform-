/**
 * Set a user's password from the server command line.
 *
 * WHY THIS EXISTS
 * ---------------
 * There is no way for an admin to set a password for someone else through the
 * UI (by design — the change flow requires the user's current password plus an
 * emailed code). Without SMTP configured that left no safe way to help a user
 * who lost their password, or to seed a known admin password without passing it
 * through a chat or a ticket.
 *
 * This runs on the server, prompts without echoing, and revokes every existing
 * session so the old password cannot be used anywhere.
 *
 * USAGE
 *   npx tsx prisma/set-password.ts admin@fxatrade.live
 *   npx tsx prisma/set-password.ts user@example.com --generate
 *
 * --generate prints a strong random password once instead of prompting, which
 * is the right choice when you need to hand a temporary password to a user.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import crypto from "crypto";

const prisma = new PrismaClient();

const args = process.argv.slice(2);
const email = (args.find((a) => !a.startsWith("--")) || "").trim().toLowerCase();
const generate = args.includes("--generate");
const BCRYPT_ROUNDS = 12;

/** Minimum policy enforced elsewhere in the app. */
function validate(pw: string): string | null {
  if (pw.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(pw)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(pw)) return "Password must contain a number";
  return null;
}

function randomPassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(18);
  let core = "";
  for (const b of bytes) core += alphabet[b % alphabet.length];
  // Prefix guarantees the policy (uppercase + digit) without weakening entropy.
  return `Aa9${core}`;
}

/** Read a line from the terminal without echoing it. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error("No TTY for a hidden prompt — use --generate instead"));
      return;
    }
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const onData = (chunk: string) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n" || ch === "\u0004") {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.removeListener("data", onData);
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (ch === "\u0003") {
          // Ctrl-C
          stdin.setRawMode(false);
          stdin.pause();
          process.stdout.write("\n");
          process.exit(130);
        }
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });
}

async function main() {
  if (!email || !email.includes("@")) {
    console.error("Usage: npx tsx prisma/set-password.ts <email> [--generate]");
    process.exit(2);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`✗ No user with email ${email}`);
    process.exit(1);
  }

  let password: string;
  if (generate) {
    password = randomPassword();
  } else {
    password = await promptHidden(`New password for ${email}: `);
    const problem = validate(password);
    if (problem) {
      console.error(`✗ ${problem}`);
      process.exit(1);
    }
    const confirm = await promptHidden("Confirm: ");
    if (confirm !== password) {
      console.error("✗ Passwords do not match");
      process.exit(1);
    }
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

  // Force every device to re-authenticate.
  const revoked = await prisma.refreshToken.updateMany({
    where: { userId: user.id },
    data: { revoked: true },
  });

  // Unlock any failed-login lockout by telling the operator to restart, since
  // the attempt map lives in the running process's memory.
  console.log(`✓ Password updated for ${email}`);
  console.log(`✓ Sessions revoked: ${revoked.count}`);
  console.log("ℹ️  If the account is locked out, restart the app to clear it:");
  console.log("     pm2 restart broker --update-env");

  if (generate) {
    console.log("\nTemporary password (shown once — store it now):");
    console.log(`  ${password}\n`);
  }
}

main()
  .catch((err) => {
    console.error("✗", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
