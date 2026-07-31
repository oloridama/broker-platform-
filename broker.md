Role: Act as a Senior Full‑Stack Architect. Clone [fxaitrade.live] completely. I will provide HAR exports or raw Network tab logs for every user flow (login, CRUD, payments, WebSocket events). Reverse‑engineer these to build the exact API contracts.

Tech Stack:

· Frontend: [React 18 / Next.js 14 / Vue 3] with [TypeScript]. State: [Zustand / Redux Toolkit / Pinia]. Styling: [Tailwind CSS / CSS Modules].
· Backend: [Node.js + Express / Python FastAPI / NestJS] with [PostgreSQL / MongoDB]. ORM/ODM: [Prisma / Mongoose].
· Infra: Provide docker-compose.yml, .env.example, and a README.md with setup steps.

---

1. BACKEND (Production Logic):

· Build a clean MVC / Service‑Repository pattern.
· Implement JWT authentication (access + refresh tokens with rotation), bcrypt hashing, and role‑based access control (if applicable).
· Mirror all original endpoints (REST or GraphQL). Include robust validation (e.g., Zod/Joi), error handling (global try‑catch with structured JSON responses), rate‑limiting, and request logging.
· Database: Design normalized schemas with proper indexes, migrations, and seeders for dummy data.
· Security: helmet, CORS (strict origins), input sanitization, and environment‑specific configs.

---

2. FRONTEND (Pixel‑Perfect & Reactive):

· Replicate every UI element, interaction (hover, focus, modals, drag‑and‑drop), form validation, and real‑time updates.
· Organize code into atomic/feature‑based components with reusable hooks. Implement Suspense & Error Boundaries for graceful fallbacks.
· Handle loading, empty, and error states everywhere.
· State management: Persist sessions, cache API responses (React Query / SWR), and handle optimistic updates for mutations.

---

3. ULTIMATE RESPONSIVENESS (Desktop ↔ Mobile):

· Mobile‑First CSS using Flexbox, CSS Grid, and Container Queries.
· Fluid Typography & Spacing: Use clamp(), vw/vh, and cqi units—no static px for layout.
· Breakpoints: Explicitly test and optimize for 320px, 375px, 430px, 768px, 1024px, 1280px, 1440px, and 1920px.
· Navigation: Collapsible hamburger menu on < 768px with smooth transitions; tabbed/desktop mega‑menus on large screens.
· Touch & Pointer: Increase hit targets to minimum 44x44px on touch devices; disable hover effects on touch, but keep them on mouse.
· Images/Media: srcset with WebP/AVIF, loading="lazy", and dynamic aspect‑ratio preservation.
· Keyboard Accessible: Full tab navigation, focus indicators, and ARIA labels for screen readers (WCAG 2.1 AA).
· Layout Shift: Reserve space for async content (skeleton screens) to avoid CLS.

---

4. OUTPUT FORMAT:
Generate complete, runnable code in a monorepo structure (/client and /server folders). Include package.json scripts to run both simultaneously. Comment complex logic clearly.
Do not give vague placeholders—use the HAR logs I provide to replace dummy data with the exact original site’s structure.
