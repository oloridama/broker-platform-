# Production Deployment Guide

## Docker — Optional, Not Required

Docker is **not required** for deploying to a live domain. It's provided for local development convenience (PostgreSQL + Redis). Most hosting platforms support running Node.js directly.

### With Docker (Recommended for self-managed VPS)
```bash
docker compose up -d    # Starts PostgreSQL + Redis
npm run db:migrate       # Run Prisma migrations
npm run db:seed          # Seed demo data
npm run build            # Build server + client
npm start                # Start production server
```

### Without Docker (Platform as a Service)
Use your platform's managed PostgreSQL:
1. Set `DATABASE_URL` to your managed PostgreSQL connection string
2. Switch Prisma schema to `provider = "postgresql"` and add `@db.Decimal(18,2)` back
3. Run `npx prisma migrate deploy`
4. `npm run build && npm start`

---

## Hosting Options

| Platform | Setup Difficulty | Free Tier | Notes |
|----------|-----------------|-----------|-------|
| **Railway** | Easy | Yes | Auto-detects Node.js, one-click PostgreSQL |
| **Render** | Easy | Yes | Free PostgreSQL for 90 days |
| **Fly.io** | Medium | Yes | Global edge deployment |
| **VPS (Hetzner/DigitalOcean)** | Medium | No ($5/mo) | Full control, Docker or bare metal |
| **Vercel + Railway** | Easy | Yes | Vercel for frontend, Railway for backend |

---

## Pre-Deployment Checklist

### 1. Environment Variables
```bash
NODE_ENV=production
SERVER_PORT=4000
DATABASE_URL=postgresql://user:strong-password@host:5432/dbname
JWT_ACCESS_SECRET=<generate-64-char-random-string>
JWT_REFRESH_SECRET=<generate-64-char-random-string>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
BCRYPT_SALT_ROUNDS=12
CORS_ORIGINS=https://yourdomain.com
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=30
```

### 2. Database
- [ ] Switch Prisma to PostgreSQL provider (uncomment block in `prisma/schema.prisma`)
- [ ] Add `@db.Decimal(18,2)` annotations back to Float fields
- [ ] Run `npx prisma migrate deploy` (not `migrate dev`)
- [ ] Run `npx prisma db seed` for initial data

### 3. Security
- [ ] Generate strong random secrets (use `openssl rand -base64 48`)
- [ ] Set `CORS_ORIGINS` to your exact domain (not wildcard)
- [ ] Enable HTTPS via reverse proxy (Nginx/Caddy) or platform SSL
- [ ] Lower rate limit to 30 requests per 15 minutes
- [ ] Remove demo accounts or change their passwords
- [ ] Ensure `.env` is in `.gitignore` and never committed

### 4. Build
```bash
npm run build:server    # TypeScript → JavaScript
npm run build:client    # Vite production build → dist/
```

### 5. Serve
```bash
# Option A: Serve API + static files from Express
NODE_ENV=production node server/dist/index.js

# Option B: Nginx reverse proxy
# - Proxy /api/* to localhost:4000
# - Serve client/dist/ as static files
# - Add SSL with Let's Encrypt
```

---

## Nginx Configuration Example

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Frontend static files
    root /path/to/broker/client/dist;
    index index.html;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket proxy (live prices) — MUST be separate from /api
    location /ws {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # SPA fallback
    location / {
        try_files $uri /index.html;
    }
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

---

## Monitoring

- Health check: `GET /api/health`
- Logs: Morgan outputs to stdout (use `pm2` or `systemd` to capture)
- Database: Monitor connection pool with Prisma's `connection_limit`

---

## Rollback Plan

1. Keep last 3 deployments in separate directories
2. Database migrations are reversible (Prisma supports `migrate down`)
3. Use `pm2` for zero-downtime reloads: `pm2 reload broker-server`

---

## Backups & Recovery

**This section exists because production data was once lost outright.** The host
expired and, because no backup had ever been taken, every user account, balance
and trade history died with the server. Do not repeat that.

### Automatic snapshots

The server takes a verified snapshot on boot and then every
`BACKUP_INTERVAL_HOURS` (default 6). Snapshots use SQLite's `VACUUM INTO`, which
produces a transactionally consistent copy **while the app keeps serving
traffic** — no downtime, no reads blocked.

| Env var | Default | Meaning |
|---|---|---|
| `BACKUP_DIR` | `backups` | Where snapshots are kept on the server |
| `BACKUP_RETENTION` | `14` | Snapshots retained before the oldest is pruned |
| `BACKUP_INTERVAL_HOURS` | `6` | Snapshot cadence (`0` disables it) |
| `BACKUP_REMOTE_CMD` | *(empty)* | Off-box copy command; `{file}` is substituted |

Every snapshot is **verified before it is reported as successful**:
`PRAGMA integrity_check` must return `ok`, the tables must be readable, and a
SHA-256 checksum is written next to the file. A snapshot that fails verification
is deleted and the run is logged as a failure — an unverified file is never
presented as a backup.

### Off-box copies are mandatory in production

A backup sitting on the same disk as the database is not a backup — it dies with
the server, exactly as before. Set `BACKUP_REMOTE_CMD` so every snapshot is
pushed somewhere else:

```bash
# rclone to any remote (S3, B2, Drive, ...)
BACKUP_REMOTE_CMD="rclone copy {file} remote:fxa-backups"

# or plain scp to another machine
BACKUP_REMOTE_CMD="scp {file} backup@other-host:/srv/fxa-backups/"
```

Failures of the off-box step are logged loudly (`OFF-BOX COPY FAILED`) but do not
abort the local snapshot.

### Taking and downloading a backup

Admin Dashboard → **Database Backups** → *Back Up Now*. The panel shows every
retained snapshot with its age, size, integrity status and user count, and offers
**Download** (streams a gzipped copy to your machine) and **Verify** (re-checks
the checksum).

The panel warns in red when **no backup exists** and in amber when the newest is
older than 24 hours. Treat both as incidents.

Equivalent API: `GET /api/admin/backups`, `POST /api/admin/backups`,
`GET /api/admin/backups/:name/download`, `GET /api/admin/backups/:name/verify`
(all admin-only).

### Restoring

```bash
# 1. Stop the app so nothing writes mid-restore
pm2 stop broker

# 2. Verify the archive you are about to restore
sha256sum fxa-20261112T191500Z.db       # compare against the .sha256 sidecar

# 3. Keep the current (possibly broken) DB — never destroy evidence
mv dev.db dev.db.broken-$(date +%s)

# 4. Restore, and let Prisma confirm the schema matches the build
cp /path/to/fxa-20261112T191500Z.db dev.db
npx prisma migrate deploy

# 5. Restart
pm2 start ecosystem.config.js
curl -s http://127.0.0.1:4000/api/health
```

Downloaded backups arrive gzipped: `gunzip fxa-*.db.gz` first.

### Postgres

The built-in snapshots are SQLite-only. For Postgres use `pg_dump`/`pg_restore`
on the same schedule and push the dump off-box:

```bash
pg_dump "$DATABASE_URL" -Fc -f fxa-$(date -u +%Y%m%dT%H%M%SZ).dump
```

### Rules that prevent a repeat of the data loss

1. **Never let hosting lapse silently** — put the renewal date in a calendar with
   a 30-day warning.
2. **Always have an off-box copy** — verify `BACKUP_REMOTE_CMD` is configured by
   checking the newest snapshot exists on the remote.
3. **Test a restore** — an untested backup is an assumption, not a backup.
4. **Watch the amber warning** — if the newest snapshot is >24h old, snapshots
   have stopped working.
