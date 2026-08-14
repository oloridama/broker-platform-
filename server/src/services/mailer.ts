import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { config } from "../config";

// ── Mailer ─────────────────────────────────────────────
// Sends transactional email via SMTP (configured with SMTP_* env vars).
// When SMTP is NOT configured (local dev / tests), emails are logged to the
// console instead of being sent so flows can still be exercised end-to-end.

function buildTransporter(): Transporter | null {
  const m = config.mail;
  if (!m.host) return null;
  return nodemailer.createTransport({
    host: m.host,
    port: m.port,
    secure: m.secure,
    auth: m.user ? { user: m.user, pass: m.pass } : undefined,
  });
}

let transporter: Transporter | null = buildTransporter();

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const from = config.mail.from || "no-reply@fxatrade.live";

  if (!transporter) {
    // Dev/test fallback — no SMTP configured, just log.
    console.log(`📧 [dev mail] To: ${opts.to} | Subject: ${opts.subject}\n${opts.text}\n`);
    return;
  }

  try {
    await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html || undefined,
    });
  } catch (err) {
    console.error("[mailer] send failed:", (err as Error).message);
    throw err;
  }
}

// Allow tests / hot config to rebuild the transporter.
export function __reloadTransporter() {
  transporter = buildTransporter();
}
