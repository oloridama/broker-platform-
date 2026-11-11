// ── Cloudflare Turnstile (bot challenge) ───────────────
// Env-gated: if TURNSTILE_SECRET_KEY is not set, verification is skipped so the
// app works without keys. When set, the client must send a `turnstileToken`.

export async function verifyTurnstile(token?: string, ip?: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY || "";
  if (!secret) return true; // not configured — skip
  if (!token) return false;

  try {
    const body = new URLSearchParams({ secret, response: String(token) });
    if (ip) body.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return !!data.success;
  } catch {
    return false;
  }
}

export function turnstileEnabled(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}
