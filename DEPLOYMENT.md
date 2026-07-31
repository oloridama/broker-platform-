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
