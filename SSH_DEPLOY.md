# SSH Deployment Runbook — AlexHost VPS + Cloudflare + Your Domain

Step-by-step guide for hosting this repo on your AlexHost VPS via SSH,
routed through Cloudflare (domain on TrustName → nameservers → Cloudflare).

Your stack is **Node 18 + Express + Prisma (SQLite)**. For v1 this guide uses
SQLite on the VPS (simplest — zero external dependencies). The optional
PostgreSQL section at the end covers the upgrade path.

---

## 0. Prerequisites (already done on your side)
- [x] Domain bought on TrustName
- [x] AlexHost VPS (you have the IP + root password/SSH key)
- [x] Cloudflare account (free plan)

---

## 1. Point your domain at Cloudflare (DNS privacy)

1. Log into Cloudflare → **Add site** → enter your domain (e.g. `yourdomain.com`).
2. Cloudflare shows you **two nameservers**, e.g. `ada.ns.cloudflare.com` / `rob.ns.cloudflare.com`.
3. Log into **TrustName** → Domain → **Nameservers** → replace the default nameservers
   with the two Cloudflare ones. (This hides your real AlexHost IP from public DNS — your privacy goal.)
4. Back in Cloudflare, wait for status to flip to **Active** (usually 5 min–24 h).
5. In Cloudflare **DNS → Records**, add:
   - `A` record: name `@`, IPv4 = **your AlexHost IP**, Proxy status = **Proxied (orange cloud)**
   - `A` record: name `www`, IPv4 = **your AlexHost IP**, Proxied
6. Cloudflare **SSL/TLS → Overview**: set mode to **Full (strict)**.
7. Under **SSL/TLS → Origin Server**, create an **Origin Certificate** (15-year, covers `yourdomain.com` + `*.yourdomain.com`), and copy the cert + key — you'll paste them into Nginx below.

> Note: leave records `Proxied` only AFTER the app is running, so you can test
> on the raw IP first (grey cloud) without Cloudflare caching issues.

---

## 2. SSH into the VPS

```bash
# From your local machine
ssh root@<ALEXHOST_IP>
```

If you created a non-root user during hardening, use that instead:
```bash
ssh deploy@<ALEXHOST_IP>
```

### Quick checklist once logged in
```bash
whoami                     # root or your user
cat /etc/os-release        # distro (Ubuntu/Debian assumed below)
free -h && df -h           # RAM + disk
```

---

## 3. Install prerequisites (Node 18, git, pm2)

> Do this as root (or with sudo). We target Node 18 because the app pins Vitest v1
> for Node 18 compatibility — newer Node also works for the server itself.

```bash
# Update packages
apt update && apt upgrade -y

# Install curl, git, build tools (needed for native deps like bcrypt)
apt install -y curl git build-essential python3

# Install Node 18 LTS via NodeSource
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
node -v    # should print v18.x

# Install pm2 (process manager — keeps the server alive + restarts on boot)
npm install -g pm2
```

---

## 4. Clone the repo

```bash
# Your GitHub repo is: https://github.com/oloridama/broker-platform-.git
mkdir -p /var/www && cd /var/www
git clone https://github.com/oloridama/broker-platform-.git broker
cd broker
```

If the repo is private, use a deploy key or PAT:
```bash
# Option A: SSH deploy key (recommended) — add a new key to GitHub → Settings → Deploy keys
# Option B: PAT in the URL (less secure)
git clone https://<USERNAME>:<PAT>@github.com/oloridama/broker-platform-.git broker
```

---

## 5. Install dependencies

```bash
cd /var/www/broker
npm install                 # root (concurrently)
cd server && npm install && cd ..
cd client && npm install && cd ..
```

> If `bcrypt` fails to build, run: `apt install -y python3 make g++` and retry.

---

## 6. Environment variables

```bash
cd /var/www/broker
cp .env.example .env
nano .env
```

Set **at minimum** these (production values):

```bash
NODE_ENV=production
SERVER_PORT=4000

# SQLite for v1 — file path relative to server/ dir
DATABASE_URL="file:./dev.db"

# Generate strong secrets:
#   openssl rand -base64 48
JWT_ACCESS_SECRET=<paste-64-char-random>
JWT_REFRESH_SECRET=<paste-64-char-random>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

BCRYPT_SALT_ROUNDS=12

# Your public domain (frontend origin). Comma-separate if you use www too.
CORS_ORIGINS=https://yourdomain.com

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=600
```

> ⚠️ **Security:** change the seeded admin/demo passwords BEFORE going live —
> see step 7. Never commit `.env` (it's already gitignored).

---

## 7. Database + seed (SQLite)

```bash
cd /var/www/broker/server

# Create the SQLite schema
npx prisma db push

# Seed initial data (instruments, quotes, deposit methods, admin/demo users)
npx tsx prisma/seed.ts
```

> ⚠️ The seed **deletes all existing data** then recreates it, and creates
> `admin@fxatrade.live` / `demo@fxatrade.live` with password **`Admin123!`**.
> **Immediately change both passwords** after the first seed:
> 1. Log in as admin on the site
> 2. Go to **Profile** → change password
> 3. Repeat for the demo account (or delete it)

---

## 8. Build (server TS → dist, client → dist)

```bash
cd /var/www/broker
npm run build
```

Expected outputs:
- `server/dist/index.js` (compiled Express API)
- `client/dist/` (compiled React app)

---

## 9. Test on the raw IP first (grey-cloud)

Before Cloudflare proxies, verify the app serves everything on one process:

```bash
cd /var/www/broker
NODE_ENV=production node server/dist/index.js
```

Then in another terminal:
```bash
curl -s http://<ALEXHOST_IP>:4000/api/health        # {"success":true,...}
curl -s http://<ALEXHOST_IP>:4000/ | head -c 100    # HTML title FXA Trade
```

- The app serves the built frontend + API + WebSocket (`/ws`) from one process (port 4000).
- Stop it with `Ctrl+C` before continuing.

---

## 10. Run with pm2 (survives reboots, auto-restarts)

```bash
cd /var/www/broker
pm2 start server/dist/index.js --name broker --env production
pm2 save                          # persist the process list
pm2 startup                       # enable boot-on-restart (follow its printed command)
pm2 logs broker                   # watch logs
```

Useful commands:
```bash
pm2 status            # see uptime/restarts
pm2 restart broker    # after code changes + rebuild
pm2 stop broker
```

---

## 11. Nginx reverse proxy (port 80/443 → 4000)

Install Nginx (if not already):
```bash
apt install -y nginx
```

Create the site config:

```bash
nano /etc/nginx/sites-available/broker
```

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # Cloudflare Origin Certificate (from step 1) — enables Full(strict)
    ssl_certificate     /etc/ssl/cloudflare/cert.pem;
    ssl_certificate_key /etc/ssl/cloudflare/key.pem;

    # API proxy
    location /api/ {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy (live prices) — REQUIRED, separate from /api
    location /ws {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # Built React app (served by Express) — fallback for SPA deep links
    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + test:
```bash
mkdir -p /etc/ssl/cloudflare
# paste origin cert into /etc/ssl/cloudflare/cert.pem and key into key.pem

ln -s /etc/nginx/sites-available/broker /etc/nginx/sites-enabled/broker
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx
```

---

## 12. Flip Cloudflare to Proxied + test

1. In Cloudflare DNS, set both `A` records to **Proxied (orange cloud)**.
2. Wait ~1 min, then visit `https://yourdomain.com`.
3. Verify:
   - Login page loads
   - Login works (API through proxy)
   - **Live prices tick** (this proves the `/ws` WebSocket proxy works — open the dashboard and watch the ticker change)
   - `/dashboard`, `/trading`, `/bots`, `/wallet` all work

---

## 13. Firewall (basic hardening recap)

```bash
apt install -y ufw
ufw allow OpenSSH
ufw allow 80,443/tcp
ufw enable
```

- Do **not** open port 4000 to the public — Nginx on 80/443 is the only entry.
- SSH: disable password auth once your key is confirmed (`nano /etc/ssh/sshd_config` → `PasswordAuthentication no`), then `systemctl restart sshd`. Always keep a second terminal open while testing SSH changes.

---

## 14. Updates / redeploys

```bash
cd /var/www/broker
git pull
npm install            # if deps changed
npm run build          # server + client
npx prisma db push     # if schema changed
pm2 restart broker
```

---

# Optional: PostgreSQL upgrade (production database)

SQLite is fine for v1 on a single VPS. When you outgrow it:

1. Install Postgres:
   ```bash
   apt install -y postgresql
   sudo -u postgres createuser --pwprompt broker
   sudo -u postgres createdb -O broker broker_db
   ```
2. In `server/prisma/schema.prisma`, change the datasource:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Update `.env`:
   ```bash
   DATABASE_URL="postgresql://broker:strongpass@localhost:5432/broker_db"
   ```
4. Regenerate + migrate:
   ```bash
   cd server && npx prisma generate
   npx prisma migrate deploy
   npx tsx prisma/seed.ts
   ```
5. Rebuild + restart: `npm run build && pm2 restart broker`

---

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `ERR_CONNECTION_REFUSED` on raw IP | Server not running — check `pm2 status` |
| Site loads but **prices frozen** | `/ws` not proxied in Nginx — re-check the `location /ws` block |
| 502 Bad Gateway | Express down or Nginx → wrong port. `pm2 logs broker`, check `proxy_pass` port |
| 522 (Cloudflare) | Origin down or origin cert mismatch — curl the raw IP directly |
| 429 on login | Auth rate limiter (10/15min per IP) — normal, wait and retry |
| `Missing required environment variable` | `.env` missing a JWT secret — app refuses to start in production |
| CORS errors | `CORS_ORIGINS` must be exactly `https://yourdomain.com` (no trailing slash) |

---

## Final checklist before going live

- [ ] Domain → Cloudflare nameservers active
- [ ] Cloudflare `A` records Proxied
- [ ] Cloudflare SSL = Full (strict) + origin cert in Nginx
- [ ] `.env` has strong JWT secrets, production `DATABASE_URL`, correct `CORS_ORIGINS`
- [ ] Admin + demo passwords changed after seeding
- [ ] `pm2 startup` enabled (survives reboot)
- [ ] UFW firewall active (SSH + 80/443 only)
- [ ] Live prices tick on the dashboard (WebSocket working through proxy)
