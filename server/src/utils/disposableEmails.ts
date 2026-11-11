// ── Disposable / throwaway email blocking ──────────────
// Bots use throwaway inboxes to mass-register. This is a pragmatic blocklist
// of the most common providers (plus domains observed probing this platform).

const DISPOSABLE_DOMAINS = new Set<string>([
  "mailinator.com",
  "yopmail.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "guerrillamailblock.com",
  "sharklasers.com",
  "grr.la",
  "pokemail.net",
  "spam4.me",
  "10minutemail.com",
  "10minutemail.net",
  "tempmail.com",
  "tempmailo.com",
  "temp-mail.org",
  "tempr.email",
  "throwawaymail.com",
  "trashmail.com",
  "mailnesia.com",
  "maildrop.cc",
  "mailcatch.com",
  "mintemail.com",
  "fakeinbox.com",
  "dispostable.com",
  "getnada.com",
  "inboxkitten.com",
  "moakt.com",
  "mohmal.com",
  "emailondeck.com",
  "discard.email",
  "burnermail.io",
  "anonaddy.me",
  // Seen used for junk signups on this platform
  "koboywin.com",
  "olipii.com",
]);

export function isDisposableEmail(email: string): boolean {
  const domain = email.toLowerCase().split("@")[1]?.trim().replace(/\.$/, "");
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}

export function disposableDomainCount(): number {
  return DISPOSABLE_DOMAINS.size;
}
