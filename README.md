# FXA Trade — Professional Trading Broker Platform

**Full-stack monorepo** — React 18 + TypeScript frontend, Express + Prisma backend with SQLite (local) / PostgreSQL (production).

## Quick Start (No Docker Required)

```bash
cd broker
npm install && cd server && npm install && cd ../client && npm install && cd ..
cp .env.example server/.env
cd server && npx prisma generate && npx prisma db push && npx tsx prisma/seed.ts && cd ..
npm run dev
# App: http://localhost:5173
# API: http://localhost:4000
```

> **Local dev uses SQLite** — no Docker or PostgreSQL needed.  
> For production PostgreSQL, see [DEPLOYMENT.md](DEPLOYMENT.md).

## Architecture

```
broker/
├── client/                  # React 18 + Vite + Tailwind CSS
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   │   ├── layout/      # AppLayout, Sidebar, TopBar
│   │   │   └── ui/          # LoadingScreen, ErrorBoundary
│   │   ├── pages/           # Route pages (lazy-loaded)
│   │   ├── hooks/           # Custom hooks (useForm)
│   │   ├── lib/             # API client (Axios + interceptors)
│   │   └── store/           # Zustand stores (auth, UI)
│   └── ...
├── server/                  # Express + TypeScript + Prisma
│   ├── src/
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── middleware/       # Auth, validation, error handling
│   │   ├── routes/          # Route definitions
│   │   └── utils/           # JWT, response helpers
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.ts          # Seed data
│   └── ...
├── docker-compose.yml       # PostgreSQL + Redis
└── .env.example             # Environment template
```

---

## Quick Start

### 1. Prerequisites

- **Node.js** ≥ 18
- **Docker** & Docker Compose
- **npm** ≥ 9

### 2. Clone & Install

```bash
cd broker

# Install root deps (concurrently)
npm install

# Install server deps
cd server && npm install && cd ..

# Install client deps
cd client && npm install && cd ..
```

### 3. Environment

```bash
cp .env.example .env
# Edit .env with your secrets (or keep defaults for local dev)
```

### 4. Start Infrastructure

```bash
npm run docker:up
# Starts PostgreSQL 16 + Redis 7
```

### 5. Database Setup

```bash
npm run db:migrate   # Run Prisma migrations
npm run db:seed       # Seed demo data
```

### 6. Start Development

```bash
npm run dev
# Server: http://localhost:4000
# Client: http://localhost:5173
```

---

## Demo Credentials

| Role  | Email                | Password    |
|-------|----------------------|-------------|
| Admin | admin@fxatrade.live  | Admin123!   |
| User  | demo@fxatrade.live   | Admin123!   |

---

## API Endpoints

### Auth
| Method | Path              | Description          | Auth |
|--------|-------------------|----------------------|------|
| POST   | /api/auth/register | Register new user   | No   |
| POST   | /api/auth/login    | Login               | No   |
| POST   | /api/auth/refresh  | Refresh tokens      | No   |
| POST   | /api/auth/logout   | Logout              | No   |

### Trading
| Method | Path                     | Description        | Auth    |
|--------|--------------------------|--------------------|---------|
| GET    | /api/trading/quotes       | Live quotes        | Bearer  |
| GET    | /api/trading/instruments  | Available instruments | Bearer |
| GET    | /api/trading/orders       | User orders        | Bearer  |
| POST   | /api/trading/orders       | Place order        | Bearer  |
| PATCH  | /api/trading/orders/:id/cancel | Cancel order | Bearer  |
| GET    | /api/trading/positions    | Open positions     | Bearer  |
| GET    | /api/trading/accounts     | Trading accounts   | Bearer  |

### Wallet
| Method | Path                       | Description       | Auth   |
|--------|----------------------------|-------------------|--------|
| GET    | /api/wallets               | User wallets      | Bearer |
| POST   | /api/wallets/deposit       | Deposit funds     | Bearer |
| POST   | /api/wallets/withdraw      | Withdraw funds    | Bearer |
| GET    | /api/wallets/transactions  | Transaction history | Bearer |

### User
| Method | Path           | Description     | Auth   |
|--------|----------------|-----------------|--------|
| GET    | /api/users/me  | Get profile     | Bearer |
| PATCH  | /api/users/me  | Update profile  | Bearer |
| POST   | /api/users/kyc | Submit KYC      | Bearer |

---

## Key Features

### Security
- **JWT** access + refresh token rotation with family-based revocation
- **bcrypt** password hashing (configurable salt rounds)
- **Helmet** security headers
- **CORS** with strict origin whitelist
- **Rate limiting** (100 req / 15 min window)
- **Zod** input validation on all endpoints

### Frontend
- **Mobile-first** responsive design with fluid typography (`clamp()`)
- **WCAG 2.1 AA** — keyboard navigation, ARIA labels, 44×44px touch targets
- **Code splitting** via `React.lazy()` + Suspense
- **Error Boundaries** for graceful failure handling
- **Optimistic mutations** via React Query
- **Token refresh** interceptor (transparent 401 → refresh → retry)
- **Dark theme** with Tailwind CSS — navy/emerald professional palette
- **Real-time** price ticker with auto-refetch every 5s

### Backend
- **MVC + Service/Repository** pattern
- **Prisma ORM** with PostgreSQL — indexed schemas, migrations, seeders
- **Structured JSON** error responses (consistent envelope)
- **Global error handler** — Zod, JWT, AppError normalization
- **Morgan** request logging

---

## Database Schema

The Prisma schema models:
- **User** — with roles (ADMIN, MANAGER, USER)
- **RefreshToken** — rotation family tracking
- **KYC** — document verification pipeline
- **TradingAccount** — per-user accounts (STANDARD, PRO, VIP, DEMO)
- **Wallet** — multi-currency balances
- **Transaction** — deposit/withdrawal history
- **Instrument** — tradeable assets (FOREX, CRYPTO, INDEX, COMMODITY, STOCK)
- **Quote** — real-time bid/ask prices
- **Order** — market/limit/stop orders
- **Position** — open/closed positions with P&L

---

## Scripts

| Script              | Description                          |
|---------------------|--------------------------------------|
| `npm run dev`       | Start server + client concurrently   |
| `npm run build`     | Build both server and client         |
| `npm run db:migrate`| Run Prisma migrations                |
| `npm run db:seed`   | Seed database with demo data         |
| `npm run db:reset`  | Reset database (drop + migrate + seed)|
| `npm run docker:up` | Start PostgreSQL + Redis containers  |
| `npm run docker:down`| Stop containers                     |
| `npm run lint`      | Lint both server and client          |

---

## Production Considerations

1. **Set strong secrets** in `.env` — never use defaults in production
2. **Enable HTTPS** via a reverse proxy (Nginx/Caddy)
3. **Use a managed PostgreSQL** (RDS, Cloud SQL) instead of Docker
4. **Add a Redis-backed session store** for horizontal scaling
5. **Set up CI/CD** for automated testing, linting, and deployment
6. **Configure monitoring** — health check endpoint at `/api/health`
7. **Enable Prisma connection pooling** with PgBouncer for production loads

---

## Tech Stack Summary

| Layer      | Technology                          |
|------------|-------------------------------------|
| Frontend   | React 18, TypeScript, Vite, Tailwind CSS |
| State      | Zustand, React Query                |
| Routing    | React Router v6 (lazy loading)      |
| Charts     | Recharts                            |
| Backend    | Node.js, Express, TypeScript        |
| ORM        | Prisma                              |
| Database   | PostgreSQL 16                       |
| Cache      | Redis 7                             |
| Auth       | JWT (access + refresh rotation)     |
| Validation | Zod                                 |
| Container  | Docker Compose                      |
