# 📚 1WayMirror World — Comprehensive Project Documentation

> **Note:** This document was written by analyzing every file in the project. Use it as your single source of truth for understanding, running, and improving the codebase.

---

## Table of Contents

1. [What Is This Project?](#1-what-is-this-project)
2. [Why Was It Built?](#2-why-was-it-built)
3. [How It Works — Big Picture](#3-how-it-works--big-picture)
4. [Tech Stack (Every Library Explained)](#4-tech-stack-every-library-explained)
5. [Monorepo Structure Explained](#5-monorepo-structure-explained)
6. [How to Run — Frontend & Backend Separately](#6-how-to-run--frontend--backend-separately)
7. [Environment Variables You Need](#7-environment-variables-you-need)
8. [Frontend Deep Dive](#8-frontend-deep-dive)
9. [Backend Deep Dive](#9-backend-deep-dive)
10. [Database Schema](#10-database-schema)
11. [Authentication & Security](#11-authentication--security)
12. [Subscription Plans & Feature Gates](#12-subscription-plans--feature-gates)
13. [Badge System](#13-badge-system)
14. [Career Catalog (85 Careers)](#14-career-catalog-85-careers)
15. [Admin Panel Guide](#15-admin-panel-guide)
16. [API Reference Summary](#16-api-reference-summary)
17. [Known Vulnerabilities & Best Practice Issues](#17-known-vulnerabilities--best-practice-issues)
18. [Deployment (Original Replit Setup)](#18-deployment-original-replit-setup)
19. [AWS Deployment Architecture & Process](#19-aws-deployment-architecture--process)
20. [User Registration, Admin Management & Stripe Subscriptions](#20-user-registration-admin-management--stripe-subscriptions)
21. [Code Architecture: Monorepo vs. Monolith & Developer Collaboration](#21-code-architecture-monorepo-vs-monolith--developer-collaboration)

---

## 1. What Is This Project?

**1WayMirror World** is an **AI-powered career exploration platform for high school students**.

The product name contains a dual meaning:
- **1Way** = one-way mirror used in psychology (observe without being observed) → the student looks at careers from the outside before committing
- **Mirror** = reflects who the student really is back to them through AI personality analysis

### What Students Can Do
- Explore **85 real careers** across 9 industries
- Take **AI-generated missions** (multiple-choice challenges) for each career
- Chat with **Dario**, an AI career counselor (GPT-4o-mini)
- Walk through a **3D career city** (WebXR/Three.js) and talk to career NPCs
- Earn **XP, levels, streaks, and 71 badges** based on engagement
- Generate a **career roadmap**, **personality profile**, and **career comparison**
- Watch **expert talks** and **livestreams** filtered by subscription plan
- Share their **public profile** with a link

### What Parents Can Do
- Receive a **secure dashboard link** via email
- See their child's activity, content flags, and trust score
- Get **real-time email alerts** for serious content moderation events

### What Admins Can Do
- Manage content: articles, videos, talks
- View all Dario AI session logs
- Manage all user accounts and subscription plans
- Monitor safety flags and moderation events
- Upload videos directly to the server

---

## 2. Why Was It Built?

The business goal is to **help high school students make informed career choices before college** using:
- AI simulations that put students in real job scenarios
- A gamification system (XP, badges, streaks) to encourage daily engagement
- A safety-first design (moderation, parent alerts, trust scores) because the users are minors
- A subscription model (Starter → Accelerator) to monetize

**Target customers:** High school students, their parents, and potentially schools/districts.

**Revenue model:** Monthly/annual subscriptions (Stripe integration not yet wired in, plans are manual).

---

## 3. How It Works — Big Picture

```
[Browser / Student]
      │
      ▼
[React Frontend — Vite]        port 22303 (dev) / port 3000 (external)
      │
      │ HTTP REST + Socket.IO
      ▼
[Express API Server]            port 8080 (dev) / port 80 (external via proxy)
      │
      ├── OpenAI API (via proxy)   ← GPT-4o, GPT-4o-mini
      ├── PostgreSQL DB            ← Drizzle ORM
      ├── Resend Email API         ← Parent notifications
      └── Disk uploads             ← artifacts/api-server/uploads/
```

### Request Flow

1. Student opens the browser → hits the **React frontend** at port 22303
2. Frontend makes API calls to `/api/...` → goes to **Express backend** at port 8080
3. Backend runs business logic, calls **OpenAI** for AI features, queries **PostgreSQL** for data
4. Real-time features (multiplayer presence, dashboard chat) go through **Socket.IO** on the same Express server

### Reverse Proxy (Replit / Production only)
In production on Replit, a reverse proxy runs at port 80:
- Requests to `/api/*` → forwarded to Express (port 8080)
- All other requests → forwarded to Vite frontend (port 22303)

When running locally on Windows (outside Replit), you run them separately and handle this yourself.

---

## 4. Tech Stack (Every Library Explained)

### Frontend
| Library | Version | What it Does |
|---------|---------|--------------|
| **React** | 19.1.0 | UI component framework |
| **Vite** | ^7.3.2 | Fast build tool and dev server |
| **TypeScript** | ~5.9.2 | Type safety across the project |
| **Tailwind CSS** | ^4.1.14 | Utility-first CSS styling |
| **Wouter** | ^3.3.5 | Lightweight client-side router (like React Router but 3KB) |
| **TanStack React Query** | ^5.90.21 | Server state management (fetching, caching API data) |
| **Framer Motion** | ^12.23.24 | Animations and transitions |
| **Three.js** | ^0.171.0 | 3D graphics engine |
| **@react-three/fiber** | ^9.1.0 | React bindings for Three.js |
| **@react-three/drei** | ^10.0.5 | Helpers and abstractions for Three.js in React |
| **@react-three/xr** | ^6.6.9 | WebXR (VR/AR) support for the 3D city |
| **Socket.IO Client** | ^4.8.3 | Real-time multiplayer/presence in the dashboard |
| **Radix UI** | Various | Accessible, unstyled component primitives (dialogs, tooltips, etc.) |
| **Lucide React** | ^0.545.0 | Icon library |
| **Recharts** | ^2.15.2 | Charts for the admin panel and progress views |
| **React Hook Form** | ^7.55.0 | Form state management |
| **Zod** | ^3.25.76 | Schema validation |
| **date-fns** | ^3.6.0 | Date formatting utilities |
| **Sonner** | ^2.0.7 | Toast notifications |
| **cmdk** | ^1.1.1 | Command palette component |

### Backend
| Library | Version | What it Does |
|---------|---------|--------------|
| **Express** | ^5 | HTTP web framework (Note: version 5 — latest major) |
| **TypeScript** | ~5.9.2 | Type safety |
| **Socket.IO** | ^4.8.3 | WebSocket server for real-time multiplayer |
| **Drizzle ORM** | ^0.45.2 | Type-safe SQL query builder for PostgreSQL |
| **pg (node-postgres)** | (via drizzle) | PostgreSQL client |
| **OpenAI SDK** | ^6.27.0 | OpenAI API client for GPT-4o/GPT-4o-mini |
| **@anthropic-ai/sdk** | ^0.95.0 | Anthropic Claude SDK (imported but AI features use OpenAI) |
| **Multer** | ^2.1.1 | File upload middleware (video uploads) |
| **Helmet** | ^8.1.0 | Security HTTP headers |
| **express-rate-limit** | ^8.5.1 | Rate limiting middleware |
| **CORS** | ^2 | Cross-Origin Resource Sharing |
| **Pino** | ^9 | Fast, structured JSON logger |
| **pino-http** | ^10 | HTTP request logging with Pino |
| **Resend** | ^6.12.3 | Email delivery API client |
| **Zod** | ^3.25.76 | Request body validation |
| **cookie-parser** | ^1.4.7 | Parse cookies from requests |
| **esbuild** | 0.27.3 | Bundler used to compile the backend TypeScript to single JS file |

### Shared / Tooling
| Tool | Purpose |
|------|---------|
| **pnpm** | Package manager (monorepo workspaces) |
| **pnpm workspaces** | Manage multiple packages from one root |
| **Drizzle Kit** | Database migration tool |
| **Orval** | Code generator — reads OpenAPI YAML → generates React Query hooks + Zod schemas |
| **prettier** | Code formatter |

---

## 5. Monorepo Structure Explained

This project is a **pnpm monorepo** — multiple packages in one repository, all sharing dependencies.

```
VR-Mech-Lab/                    ← Workspace root
│
├── artifacts/                  ← The actual runnable apps
│   ├── api-server/             ← Backend: Express 5 API
│   │   ├── src/
│   │   │   ├── app.ts          ← Express app setup (middlewares, rate limits)
│   │   │   ├── index.ts        ← Server entry point (reads PORT, starts HTTP + Socket.IO)
│   │   │   ├── routes/         ← One file per API route group
│   │   │   │   ├── index.ts    ← Mounts all routers
│   │   │   │   ├── health.ts   ← GET /api/healthz
│   │   │   │   ├── simulations.ts ← GET /api/simulations[/:slug]
│   │   │   │   ├── challenges.ts  ← POST /api/missions/next, submit, hint
│   │   │   │   ├── progress.ts    ← GET /api/progress[/recent]
│   │   │   │   ├── dario.ts       ← POST /api/dario/* (all Dario AI endpoints)
│   │   │   │   ├── npc.ts         ← POST /api/npc/chat
│   │   │   │   ├── safety.ts      ← All /api/safety/* endpoints
│   │   │   │   └── upload.ts      ← POST /api/admin/upload-video
│   │   │   ├── lib/
│   │   │   │   ├── openai.ts      ← OpenAI client singleton
│   │   │   │   ├── aiChallenge.ts ← AI mission generation logic
│   │   │   │   ├── simulations.ts ← 85 career definitions (49KB!)
│   │   │   │   ├── moderation.ts  ← Content moderation AI logic
│   │   │   │   ├── progress.ts    ← XP/level/streak calculation
│   │   │   │   ├── email.ts       ← Resend email templates + send helper
│   │   │   │   ├── multiplayer.ts ← Socket.IO multiplayer/presence logic
│   │   │   │   └── logger.ts      ← Pino logger instance
│   │   │   └── middlewares/       ← Express middlewares
│   │   ├── build.mjs              ← esbuild script to bundle the server
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── mech-vr-lab/            ← Frontend: React + Vite app
│   │   ├── src/
│   │   │   ├── App.tsx         ← Root component, routing, heartbeat
│   │   │   ├── main.tsx        ← React DOM render entry
│   │   │   ├── index.css       ← Global CSS + Tailwind
│   │   │   ├── pages/          ← One file per route/page (see §8)
│   │   │   ├── components/     ← Shared UI components (HeaderBar, etc.)
│   │   │   ├── lib/            ← Client utilities (auth, profile, badges, etc.)
│   │   │   ├── hooks/          ← Custom React hooks
│   │   │   └── data/           ← Static data files
│   │   ├── index.html          ← HTML template
│   │   ├── vite.config.ts      ← Vite configuration
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── mockup-sandbox/         ← Design mockup sandbox (not production)
│
├── lib/                        ← Shared libraries (used by both artifacts)
│   ├── db/                     ← Database layer
│   │   ├── src/
│   │   │   ├── index.ts        ← Drizzle DB client (reads DATABASE_URL)
│   │   │   └── schema/         ← All table definitions
│   │   │       ├── learners.ts
│   │   │       ├── challenges.ts
│   │   │       ├── attempts.ts
│   │   │       ├── darioSessions.ts
│   │   │       ├── safety.ts   ← 8 safety-related tables
│   │   │       └── ...
│   │   ├── drizzle.config.ts   ← Migration config
│   │   └── package.json
│   │
│   ├── api-spec/               ← OpenAPI YAML contract
│   │   └── openapi.yaml        ← Single source of truth for the API shape
│   │
│   ├── api-client-react/       ← Auto-generated React Query hooks (from OpenAPI)
│   │   └── (generated files)   ← DO NOT edit manually — run codegen instead
│   │
│   └── api-zod/                ← Auto-generated Zod schemas (from OpenAPI)
│       └── (generated files)   ← DO NOT edit manually
│
├── scripts/                    ← Utility scripts
│   └── src/                    ← Post-merge and other helper scripts
│
├── pnpm-workspace.yaml         ← Workspace config + package catalog + security settings
├── package.json                ← Root scripts (typecheck, build)
├── tsconfig.base.json          ← Shared TypeScript compiler options
└── tsconfig.json               ← Root tsconfig (references lib packages)
```

### Package Names (Internal)
| Path | Package Name |
|------|-------------|
| `artifacts/api-server` | `@workspace/api-server` |
| `artifacts/mech-vr-lab` | `@workspace/mech-vr-lab` |
| `lib/db` | `@workspace/db` |
| `lib/api-spec` | `@workspace/api-spec` |
| `lib/api-client-react` | `@workspace/api-client-react` |
| `lib/api-zod` | `@workspace/api-zod` |

---

## 6. How to Run — Frontend & Backend Separately

> **Important:** This project was built for Replit. Vite's `vite.config.ts` requires `PORT` and `BASE_PATH` environment variables. You must set them manually when running outside Replit.

### Prerequisites

Make sure you have installed:
- **Node.js** v20+ (project uses `nodejs-24` on Replit)
- **pnpm** — install with: `npm install -g pnpm`
- **PostgreSQL** — either local install or a cloud database (Supabase, Railway, Neon, etc.)

### Step 1 — Install All Dependencies

Open a terminal in the project root:

```powershell
cd C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab
pnpm install
```

### Step 2 — Create Environment Variables

Create a `.env` file in the **api-server** directory:

```
C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\api-server\.env
```

```env
# Required — your PostgreSQL connection string
DATABASE_URL=postgresql://username:password@localhost:5432/your_db_name

# Required — port the backend will bind to
PORT=8080

# Required — OpenAI proxy (or use direct OpenAI if not using Replit proxy)
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1
AI_INTEGRATIONS_OPENAI_API_KEY=sk-your-openai-key-here

# Required — Resend API key for email
RESEND_API_KEY=re_your_resend_key_here

# Optional — Admin PIN for safety dashboard API (default: 1WAY2026)
ADMIN_PIN=1WAY2026

# Optional — session secret (reserved for future use)
SESSION_SECRET=some-random-secret-string

# Optional — for parent dashboard links (use localhost in dev)
REPLIT_DOMAINS=localhost:5173
```

Create a `.env` file in the **mech-vr-lab** directory:

```
C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\mech-vr-lab\.env
```

```env
# Required — port the Vite dev server will bind to
PORT=22303

# Required — base path for the frontend (use / for local dev)
BASE_PATH=/

# The frontend calls /api/... — set this if your backend runs elsewhere
# By default Vite proxies /api to localhost:8080 (you need to configure this)
VITE_API_URL=http://localhost:8080
```

### Step 3 — Set Up the Database

Run migrations to create all tables:

```powershell
# From the project root
pnpm --filter @workspace/db run migrate
```

If the `migrate` script is not defined, use Drizzle Kit directly:

```powershell
cd C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\lib\db
$env:DATABASE_URL="postgresql://username:password@localhost:5432/your_db_name"
npx drizzle-kit push
```

### Step 4 — Run the Backend (Terminal 1)

```powershell
cd C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\api-server

# Set environment variables for this session (PowerShell)
$env:PORT = "8080"
$env:BASE_PATH = "/api"
$env:DATABASE_URL = "postgresql://username:password@localhost:5432/your_db_name"
$env:AI_INTEGRATIONS_OPENAI_BASE_URL = "https://api.openai.com/v1"
$env:AI_INTEGRATIONS_OPENAI_API_KEY = "sk-your-key"
$env:RESEND_API_KEY = "re_your-key"
$env:NODE_ENV = "development"

# Build and start the backend
pnpm run dev
```

The backend will be available at: **http://localhost:8080/api**

Test it:
```powershell
curl http://localhost:8080/api/healthz
# Expected: {"status":"ok"}
```

### Step 5 — Configure Frontend to Talk to Backend

> **Important:** The Vite config reads `PORT` and `BASE_PATH` from env but does NOT have a built-in proxy to the backend. You need to either:
> - Add a proxy to `vite.config.ts`, OR
> - Run both on the same port using the reverse proxy (production setup)

**Recommended: Add a proxy to `vite.config.ts`** so that `/api/*` requests from the browser are forwarded to the backend:

Open `artifacts/mech-vr-lab/vite.config.ts` and add the `proxy` key inside `server`:

```typescript
server: {
  port,
  strictPort: true,
  host: "0.0.0.0",
  allowedHosts: true,
  proxy: {
    "/api": {
      target: "http://localhost:8080",
      changeOrigin: true,
    },
  },
  fs: {
    strict: true,
  },
},
```

### Step 6 — Run the Frontend (Terminal 2)

```powershell
cd C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\mech-vr-lab

# Set environment variables (PowerShell)
$env:PORT = "22303"
$env:BASE_PATH = "/"
$env:NODE_ENV = "development"

# Start Vite dev server
pnpm run dev
```

The frontend will be available at: **http://localhost:22303**

### Summary of Running Services

| Service | Command Directory | Port | URL |
|---------|------------------|------|-----|
| Backend (Express) | `artifacts/api-server` | 8080 | http://localhost:8080/api |
| Frontend (Vite) | `artifacts/mech-vr-lab` | 22303 | http://localhost:22303 |

Open your browser at **http://localhost:22303** to use the app.

### Quick Run Script (PowerShell)

Create a file `run-dev.ps1` in the project root:

```powershell
# run-dev.ps1 — Runs both backend and frontend in separate windows

# Backend
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd 'C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\api-server'; " +
  "`$env:PORT='8080'; `$env:DATABASE_URL='postgresql://user:pass@localhost:5432/db'; " +
  "`$env:AI_INTEGRATIONS_OPENAI_BASE_URL='https://api.openai.com/v1'; " +
  "`$env:AI_INTEGRATIONS_OPENAI_API_KEY='sk-...'; " +
  "`$env:RESEND_API_KEY='re_...'; " +
  "`$env:NODE_ENV='development'; " +
  "pnpm run dev"
)

# Frontend (wait 5 seconds for backend to start)
Start-Sleep -Seconds 5
Start-Process powershell -ArgumentList @(
  "-NoExit",
  "-Command",
  "cd 'C:\Users\workm\Desktop\BACKEND\VR-Mech-Lab\artifacts\mech-vr-lab'; " +
  "`$env:PORT='22303'; `$env:BASE_PATH='/'; `$env:NODE_ENV='development'; " +
  "pnpm run dev"
)

Write-Host "Both services started. Open http://localhost:22303"
```

---

## 7. Environment Variables You Need

| Variable | Required | Where Used | What It Does |
|----------|:--------:|------------|--------------|
| `DATABASE_URL` | ✅ Backend | `lib/db/src/index.ts` | PostgreSQL connection string |
| `PORT` | ✅ Both | `artifacts/api-server/src/index.ts`, `vite.config.ts` | Port the service binds to |
| `BASE_PATH` | ✅ Frontend | `vite.config.ts` | Base URL prefix (use `/` locally) |
| `AI_INTEGRATIONS_OPENAI_BASE_URL` | ✅ Backend | `artifacts/api-server/src/lib/openai.ts` | OpenAI API base URL |
| `AI_INTEGRATIONS_OPENAI_API_KEY` | ✅ Backend | `artifacts/api-server/src/lib/openai.ts` | OpenAI API key |
| `RESEND_API_KEY` | ✅ Backend | `artifacts/api-server/src/lib/email.ts` | Email service API key |
| `ADMIN_PIN` | ⚠️ Optional | `artifacts/api-server/src/routes/safety.ts` | Admin endpoint PIN (default: `1WAY2026`) |
| `SESSION_SECRET` | ⚠️ Optional | Reserved | Future session signing |
| `REPLIT_DOMAINS` | ⚠️ Optional | `artifacts/api-server/src/routes/safety.ts` | Builds parent dashboard URLs |
| `NODE_ENV` | ⚠️ Optional | Various | `development` or `production` |

> ⚠️ **Never commit your `.env` files to git.** They are already in `.gitignore` (via `node_modules` / general exclusions). Add `.env` explicitly to `.gitignore` if not already there.

---

## 8. Frontend Deep Dive

### Pages & Routes

| File | URL Route | Auth? | Description |
|------|-----------|:-----:|-------------|
| `HomePage.tsx` | `/` | No | Public marketing landing page with 11 sections |
| `LoginPage.tsx` | `/login` | No | Sign in / sign up with SHA-256 password hashing |
| `ProfileSetupPage.tsx` | `/profile-setup` | Yes | Avatar and name setup for 3D city |
| `ReplitopolisPage.tsx` | `/replitopolis` | Yes | Main dashboard with 10 tabs |
| `CityPage.tsx` | `/city` | Yes | 3D walkable WebXR career city (Three.js) |
| `UserProfilePage.tsx` | `/my-profile` | Yes | Profile editor — school, GPA, SAT, badges |
| `DarioPage.tsx` | `/dario` | Yes | Dario AI career counselor (chat, compare, roadmap) |
| `SimulationPage.tsx` | `/sim/:slug` | Yes | Individual career simulation + missions |
| `AdminPage.tsx` | `/admin` | Admin | Full admin panel with 9 tabs |
| `ParentDashboard.tsx` | `/parent?token=X` | Token | Parent safety dashboard |
| `ShareProfilePage.tsx` | `/share/:learnerId` | No | Public shareable student profile |
| `FeedPage.tsx` | `/feed` | Yes | Career news articles feed |
| `VideosPage.tsx` | `/videos` | Yes | Career video library |
| `TalksPage.tsx` | `/talks` | Yes | Expert talks + upcoming livestreams |
| `UpgradePage.tsx` | `/upgrade` | Yes | Subscription plan upgrade page |
| `not-found.tsx` | * | — | 404 fallback page |

### Key Client-Side Libraries

| File | Purpose |
|------|---------|
| `lib/auth.ts` | All auth functions — register, login, logout, session via `localStorage` |
| `lib/profile.ts` | `PlayerProfile` type, save/load profile, `hasPlanFeature()` for subscription gating |
| `lib/badges.ts` | 71 badge definitions + `computeEarnedBadgeIds()` |
| `lib/darioData.ts` | Dario session types + localStorage helpers for sessions/roadmap/personality |
| `lib/learner.ts` | `getLearnerId()` — reads from profile or generates UUID |
| `lib/feedArticles.ts` | 1000+ static feed articles (71KB!) |
| `lib/feedDailyArticles.ts` | Daily rotating articles (102KB!) |
| `lib/talksData.ts` | Expert talks + livestream data |
| `lib/safety.ts` | Client-side safety helpers (contact detection, etc.) |
| `lib/socket.ts` | Socket.IO client setup for multiplayer |
| `lib/queryClient.ts` | TanStack React Query client config |
| `lib/adminVideos.ts` | Admin video library localStorage helpers |

### How Routing Works

The router is in `App.tsx` using **Wouter** (not React Router). Routes are lazy-loaded:

```tsx
const DarioPage = lazy(() => import("@/pages/DarioPage"));
```

The `FULLSCREEN_ROUTES` set determines which pages **skip** the `HeaderBar` navigation:
- `/`, `/city`, `/replitopolis`, `/profile-setup`, `/login`, `/my-profile`, `/feed`, `/videos`, `/talks`, `/admin`, `/dario`, `/parent`, `/upgrade`, and all `/share/` paths

### Heartbeat System

Every 60 seconds, `App.tsx` sends `POST /api/safety/heartbeat` with the learner ID. This tracks how long students spend on the platform each day (stored in `platform_time_logs`).

### Branding / Color Palette

| Color | Hex / HSL | Usage |
|-------|-----------|-------|
| Dark Navy | `hsl(217 60% 6%)` | Main background |
| Gold | `#f5a524` | Primary accent, CTAs |
| Orange | `#ea580c` | Secondary accent |
| Blue | `#1d4ed8` | Features section background |

---

## 9. Backend Deep Dive

### Server Entry Flow

```
index.ts
  └── Creates HTTP server from Express app
  └── Calls attachMultiplayer(server)  ← Socket.IO setup
  └── Listens on PORT (must be set as env var)
```

### Middleware Stack (in order)

1. **Trust proxy** — trusts Replit's reverse proxy for real IPs
2. **Helmet** — sets security HTTP headers (CSP, XSS protection, etc.)
3. **Global Rate Limiter** — 200 requests / 15 min per IP
4. **Safety Rate Limiter** — 30 req / 15 min on `/api/safety/register`
5. **Moderation Rate Limiter** — 60 req / 15 min on moderation endpoints
6. **Pino HTTP Logger** — logs every request (method, URL, status)
7. **CORS** — allows cross-origin requests (open CORS — see security notes)
8. **JSON body parser** — 50KB limit
9. **URL-encoded body parser** — 50KB limit
10. **Router** — all `/api/*` routes

### Route Files

| File | Mounts At | Key Endpoints |
|------|-----------|---------------|
| `health.ts` | `/api/healthz` | Server status check |
| `simulations.ts` | `/api/simulations` | Get all 85 careers / one by slug |
| `challenges.ts` | `/api/missions` | Generate, submit, hint for AI missions |
| `progress.ts` | `/api/progress` | Learner XP/level/streak data |
| `dario.ts` | `/api/dario` | All 8 Dario AI endpoints |
| `npc.ts` | `/api/npc` | Career NPC chat in 3D city |
| `safety.ts` | `/api/safety` | All safety/moderation/parent endpoints |
| `upload.ts` | `/api/admin` | Video upload + file serving |

### AI Architecture

The backend uses **two AI models**:

| Use Case | Model | Max Tokens | Temp |
|----------|-------|-----------|------|
| NPC City Chat | `gpt-4o` | 200 | — |
| Dario Chat | `gpt-4o-mini` | 300 | 0.85 |
| Dario Roadmap | `gpt-4o-mini` | 1200 | 0.70 |
| Career Compare | `gpt-4o-mini` | 800 | 0.50 |
| Personality | `gpt-4o-mini` | 800 | 0.65 |
| Career Report | `gpt-4o-mini` | 1000 | 0.65 |
| Opportunities | `gpt-4o-mini` | 1500 | 0.80 |
| Action Items | `gpt-4o-mini` | 900 | 0.70 |
| AI Missions | `gpt-4o-mini` | — | — |
| Content Moderation | `gpt-4o-mini` | — | — |

### Multiplayer / Real-time

Socket.IO is attached to the same HTTP server as Express. The `multiplayer.ts` lib handles:
- Online user presence tracking
- Dashboard chat between users
- Real-time activity events

---

## 10. Database Schema

All tables are in PostgreSQL via Drizzle ORM. The schema files live in `lib/db/src/schema/`.

### Core Tables

#### `learners`
Tracks XP and progress for each student.
```
id                 TEXT PK     UUID (generated client-side)
total_xp           INTEGER     Cumulative XP earned
level              INTEGER     Derived from XP thresholds
streak             INTEGER     Current daily streak
best_streak        INTEGER     All-time best streak
challenges_completed INTEGER   Total missions attempted
challenges_correct INTEGER     Correctly answered missions
```

#### `challenges`
AI-generated mission questions (one per attempt):
```
id                 TEXT PK     UUID
learner_id         TEXT        FK → learners.id
simulation_slug    TEXT        Career slug (e.g., "mechanical-engineer")
category           TEXT        Career category
topic              TEXT        Specific topic within the simulation
difficulty         TEXT        "easy" | "medium" | "hard"
title              TEXT        Mission headline
role_intro         TEXT        Student's fictional role for this scenario
scenario           TEXT        Background story
problem            TEXT        The challenge statement
constraints        JSONB       Array of constraint strings
question           TEXT        The actual question
choices            JSONB       Array of {id, text}
correct_choice_id  TEXT        ID of the correct answer
explanation        TEXT        Why the correct answer is right
scene              TEXT        Optional visual scene description
```

#### `attempts`
Records each student answer:
```
id                 SERIAL PK
challenge_id       TEXT        FK → challenges.id
learner_id         TEXT        FK → learners.id
choice_id          TEXT        The answer submitted
correct            BOOLEAN
xp_awarded         INTEGER
attempted_at       TIMESTAMP
```

#### `dario_sessions`
Logs every Dario AI counseling session for analytics:
```
session_id         TEXT PK     UUID
user_id            TEXT        Learner ID
user_name          TEXT        Display name
user_email         TEXT
session_title      TEXT        Auto-generated title
school             TEXT
graduation_year    INTEGER
gpa / sat          TEXT
career_interest    TEXT
careers_discussed  JSONB       Array of career strings
message_count      INTEGER
conversation_excerpt JSONB     Last few messages
opportunities_searched JSONB
action_item_count  INTEGER
roadmap_milestone_count INTEGER
personality_generated BOOLEAN
report_generated   BOOLEAN
session_started_at TEXT        ISO timestamp
session_ended_at   TEXT        ISO timestamp
logged_at          TIMESTAMP   Server log time
```

### Safety Tables (8 tables in `schema/safety.ts`)

| Table | Purpose |
|-------|---------|
| `safety_accounts` | Extended student profiles (school email, grade, verification tier A/B/C) |
| `parent_accounts` | Parent/guardian records with `access_token` for dashboard |
| `trust_scores` | Per-student trust score (0–100) |
| `moderation_flags` | Every Tier 2+ moderation event |
| `contact_exchange_logs` | Detected contact info sharing attempts |
| `login_events` | Login geo/device tracking |
| `parent_notifications` | Email notification queue + send status |
| `platform_time_logs` | Heartbeat-based activity time per day per student |

---

## 11. Authentication & Security

### Student Authentication (Client-Side Only)

> ⚠️ **Critical Design Decision:** There is **no server-side session** for regular users. Authentication is entirely in the browser's `localStorage`.

**How login works:**
1. User enters email + password
2. `verifyAccount()` in `auth.ts` hashes the password using SHA-256: `SHA256(email.toLowerCase() + ":" + password)`
3. Compares against stored `$sha256$<hex>` hash in `localStorage`
4. On success, writes `{ name, email }` to `localStorage` key `1waymirror_auth_v1`

**What this means:**
- Clearing browser storage logs you out
- No session cookies → no CSRF vulnerability
- Account data is NOT synced across devices (it's local to the browser)
- If someone gets access to your browser, they can access the account

**Key functions in `auth.ts`:**

| Function | What it does |
|----------|-------------|
| `registerAccount(name, email, password)` | Creates hashed account, saves to localStorage |
| `verifyAccount(email, password)` | Returns Account or null, migrates legacy passwords |
| `signIn(name, email)` | Writes session to `1waymirror_auth_v1` |
| `signOut()` | Removes session key |
| `getAuthUser()` | Returns `{ name, email }` or null |
| `isLoggedIn()` | Boolean |
| `updateAccount(email, updates)` | Partial update of any account field |

### Admin Authentication

**Frontend gate** at `/admin`:
- Email: `one.waymirror@outlook.com`
- Password: `Shipnot2020!`
- ⚠️ This is a UI-only gate. If you bypass it, you reach the admin UI.

**Backend gate** for API endpoints:
- Header `x-admin-pin: <pin>`
- Default PIN: `1WAY2026`
- Override via `ADMIN_PIN` environment variable

### Parent Authentication

- Random 32-byte hex `access_token` issued at registration
- Sent in welcome email as URL parameter
- Expires after **30 days**
- Route: `/parent?token=<token>`

### Security Measures in Place

| Measure | Implementation |
|---------|---------------|
| Rate limiting | 200/15min global, 30/15min safety, 60/15min moderation |
| Security headers | Helmet (CSP, HSTS, X-Frame-Options, etc.) |
| File upload sanitization | `path.basename()` + character allowlist regex |
| SQL injection prevention | Drizzle ORM parameterized queries |
| Input validation | Zod schemas on all API endpoints |
| File type restriction | Multer enforces `video/*` MIME + 500MB limit |
| Supply chain protection | pnpm `minimumReleaseAge: 1440` (1 day) |
| AI content moderation | 4-tier classification for minor safety |

---

## 12. Subscription Plans & Feature Gates

Plans are stored **client-side** in `localStorage` key `1waymirror_plan_v1`.

> ⚠️ **Security Note:** Since plans are in localStorage, a user can manually change their plan by editing localStorage. Stripe is not yet integrated to enforce server-side plan validation.

### Plan Comparison

| Plan | Monthly | Annual (billed yearly) | Dario AI Credits | Key Extras |
|------|--------:|----------------------:|----------------:|------------|
| **None** | Free | — | 0 | No platform access |
| **Starter** | $19.99 | $199/yr ($16.59/mo) | 0 | Simulations, videos, feed, progress, profile sharing |
| **Explorer** | $49.99 | $499/yr ($41.49/mo) | 200 | + Dario chat, compare, roadmap, 7 livestreams/mo |
| **Builder** | $99.99 | $995/yr ($82.99/mo) | 700 | + Personality, career report, opportunities, action items |
| **Accelerator** | $199.99 | $1,991/yr ($165.99/mo) | 1,200 | + 1-on-1 advisor sessions |

### Feature Gate Check (Frontend)

```typescript
import { hasPlanFeature } from "@/lib/profile";

if (hasPlanFeature(plan, "dario-chat")) {
  // show Dario
}
```

### All Feature Keys

`simulations` · `videos` · `feed` · `progress` · `profile-sharing` · `dario-chat` · `dario-compare` · `dario-roadmap` · `dario-exploratory` · `recorded-talks` · `personality` · `career-report` · `opportunities` · `action-items` · `athletic-recruiting` · `college-advising` · `advisor-1on1`

---

## 13. Badge System

**71 total badges** defined in `artifacts/mech-vr-lab/src/lib/badges.ts`.

### Level Badges (50 badges)
Auto-awarded when a student reaches each level threshold:
- Level 1: "Rookie"
- Level 5: "Rising Star"
- Level 10: "Career Explorer"
- Level 25: "Career Master"
- Level 50: "LEGEND"

### Achievement Badges (21 badges)

| Badge ID | Trigger |
|----------|---------|
| `first-sim` | Completed first simulation |
| `ten-xp` | Earned first 10 XP |
| `100xp` | Reached 100 total XP |
| `500xp` | Reached 500 total XP |
| `streak3` | Achieved 3-day streak |
| `streak7` | Achieved 7-day streak |
| `cat-engineering` | Attempted an engineering career |
| `cat-business` | Attempted a business career |
| `cat-healthcare` | Attempted a healthcare career |
| `cat-trades` | Attempted a trades career |
| `cat-technology` | Attempted a technology career |
| `cat-law` | Attempted a law career |
| `cat-science` | Attempted a science career |
| `world-explorer` | Played simulations in all 8 categories |
| `first-dario` | First Dario AI session |
| `dario-3` | Completed 3 Dario sessions |
| `dario-10` | Completed 10 Dario sessions |
| `dario-roadmap` | Generated first career roadmap |
| `dario-compare` | Used career comparison feature |
| `dario-xp-50` | Earned 50 Dario XP |

### How to Compute Badges

```typescript
import { computeEarnedBadgeIds } from "@/lib/badges";

const earned = computeEarnedBadgeIds(
  totalXp,      // number
  level,        // number
  streak,       // number
  completedCategories,  // string[]
  {
    darioSessions,           // number
    darioXp,                 // number
    darioRoadmapGenerated,   // boolean
    darioCompareUsed,        // boolean
  }
);
// Returns: string[] of earned badge IDs
```

---

## 14. Career Catalog (85 Careers)

Defined in `artifacts/api-server/src/lib/simulations.ts` (49KB file).

| Category | Count | Careers |
|----------|:-----:|---------|
| `engineering` | 9 | mechanical, civil, electrical, chemical, aerospace, biomedical, industrial, environmental, software |
| `business` | 10 | entrepreneurship, marketing, finance, accounting, management, sales, stock-trader, crypto-analyst, economist, investment-banker |
| `healthcare` | 11 | nursing, physician, PA, pharmacist, PT, radiologist, dentist, vet, psychologist, SLP, health-services-manager |
| `trades` | 10 | electrician, plumber, hvac, carpenter, construction-equipment-operator, solar-installer, wind-turbine-tech, industrial-maintenance, culinary-chef, esthetician |
| `technology` | 10 | AI, cybersecurity, IT, data-analyst, quantum-computing, saas-product-builder, ux-ui-designer, cloud-devops, biocomputing, fusion-engineer |
| `law` | 8 | lawyer, defense-lawyer, prosecutor, police-officer, corporate-lawyer, judge, detective, federal-agent |
| `science` | 9 | neuroscientist, chemist, physicist, astronomer, mathematician, biologist, geologist, quantum-researcher, oceanographer |
| `life-advice` | 8 | tax-advisor, budget-counselor, personal-investing, insurance-agent, retirement-planner, resume-coach, networking-coach, career-counselor |
| `creative-design` | 10 | architect, fashion-designer, art-director, gallery-curator, interior-designer, urban-planner, social-media-manager, brand-strategist, graphic-designer, film-video-producer |

Each simulation has:
- `slug` — URL-safe identifier (e.g., `mechanical-engineer`)
- `title` — Display name
- `category` — One of the 9 above
- `emoji` — Visual icon
- `description` — Short description
- `available` — Boolean flag (all are true currently)
- `topics[]` — List of topics AI uses to generate varied missions

---

## 15. Admin Panel Guide

**URL:** `/admin`

**Login credentials:**
- Email: `one.waymirror@outlook.com`
- Password: `Shipnot2020!`

### Tabs Overview

| Tab | What You Can Do |
|-----|----------------|
| **Overview** | See platform stats — user count, article count, video count, content health metrics |
| **Feed** | Create/edit/delete career news articles; see analytics per article |
| **Videos** | Add videos by URL (YouTube/Vimeo/direct) or upload a file (≤500MB); delete videos |
| **Talks** | Manage expert talks, schedule upcoming livestreams (with Zoom link/password), manage past recordings |
| **Users** | View all registered accounts; edit name and subscription plan; delete accounts; see password hash status |
| **Dario** | View all Dario AI session logs from the database with conversation excerpts |
| **Leads** | View contact form submissions and newsletter signups (from localStorage) with reply-via-email links |
| **Safety** | View moderation flags by severity tier, trust scores, parent notification history |
| **Settings** | Daily article rotation count; platform feature toggles |

### Livestream Scheduling
When creating a livestream, you can:
- Set title, description, speaker, date/time
- Add a Zoom link and password (shown to users in the event card)
- Restrict visibility to specific subscription tiers (Starter/Explorer/Builder/Accelerator)

### Video Upload
Two modes:
1. **URL mode** — Paste a YouTube, Vimeo, or direct video URL → stored in localStorage admin settings
2. **File upload** — Upload MP4/WebM/MOV directly → stored at `artifacts/api-server/uploads/`, served via `/api/admin/files/:filename`

---

## 16. API Reference Summary

**Base URL:** `http://localhost:8080/api` (dev) or `https://<domain>/api` (production)

**Admin endpoints** require header: `x-admin-pin: 1WAY2026` (or your configured PIN)

### Quick Reference

| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/healthz` | — | Server health check |
| GET | `/api/simulations` | — | List all 85 careers |
| GET | `/api/simulations/:slug` | — | Career detail |
| POST | `/api/missions/next` | — | Generate AI mission |
| POST | `/api/missions/:id/submit` | — | Submit answer, get XP |
| POST | `/api/missions/:id/hint` | — | Get AI hint |
| GET | `/api/progress?learnerId=` | — | Learner progress summary |
| GET | `/api/progress/recent?learnerId=` | — | Last 20 mission attempts |
| POST | `/api/dario/chat` | — | Chat with Dario AI |
| POST | `/api/dario/roadmap` | — | Generate career roadmap |
| POST | `/api/dario/compare` | Explorer+ | Compare two careers |
| POST | `/api/dario/personality` | Builder+ | Personality analysis |
| POST | `/api/dario/career-report` | Builder+ | Full career report |
| POST | `/api/dario/opportunities` | Builder+ | Find internship/shadow opportunities |
| POST | `/api/dario/action-items` | Builder+ | 30-60 day action items |
| POST | `/api/dario/log-activity` | — | Log Dario session end |
| GET | `/api/dario/activity` | Admin | All Dario session logs |
| POST | `/api/npc/chat` | — | Chat with 3D city NPC |
| POST | `/api/safety/register` | — | Register student safety profile |
| GET | `/api/safety/profile/:learnerId` | — | Student safety profile |
| POST | `/api/safety/moderate` | — | AI content moderation |
| POST | `/api/safety/contact-exchange-ack` | — | Log contact warning acknowledgment |
| GET | `/api/safety/flags` | Admin | All moderation flags |
| PATCH | `/api/safety/flags/:id` | Admin | Resolve/escalate a flag |
| GET | `/api/safety/trust/:studentId` | — | Trust score |
| GET | `/api/safety/stats` | Admin | Platform safety statistics |
| POST | `/api/safety/heartbeat` | — | Record activity time |
| GET | `/api/safety/parent-dashboard?token=` | Token | Parent dashboard data |
| PATCH | `/api/safety/parent/:parentId/pause` | — | Pause/resume parent notifications |
| POST | `/api/admin/upload-video` | — | Upload video file (multipart) |
| GET | `/api/admin/files/:filename` | — | Serve uploaded video |

---

## 17. Known Vulnerabilities & Best Practice Issues

> This section identifies areas that need improvement from a security and best-practice standpoint.

### 🔴 Critical Issues

1. **Admin credentials hardcoded in frontend source** (`AdminPage.tsx`)
   - Email `one.waymirror@outlook.com` and password `Shipnot2020!` are in plain TypeScript
   - Anyone who can inspect the source bundle can find these
   - **Fix:** Move admin auth to the backend with a proper session or JWT

2. **Admin API PIN has a weak default** (`1WAY2026`)
   - Default is documented publicly in this README
   - **Fix:** Force `ADMIN_PIN` to be set via environment variable with no default

3. **localStorage-only authentication**
   - No server-side session validation for regular users
   - Plan tier can be spoofed by editing `localStorage`
   - Any page that requires auth can be reached by clearing/setting localStorage
   - **Fix:** Issue server-signed JWT or session cookie on login; validate on server

4. **CORS is fully open** (`app.use(cors())` with no config)
   - Any origin can make requests to the API
   - **Fix:** Restrict to known origins: `cors({ origin: ["https://yourdomain.com", "http://localhost:22303"] })`

5. **No authentication on most API endpoints**
   - `/api/missions/next`, `/api/dario/chat`, etc. accept any `learnerId` without verifying the caller owns that ID
   - **Fix:** After implementing server sessions, verify `learnerId` belongs to the authenticated user

### 🟡 Medium Issues

6. **Plan enforcement is client-side only**
   - Feature gates in `profile.ts` only run in the browser
   - **Fix:** Backend should verify plan before serving Builder/Explorer-only content

7. **Parent access token never rotates**
   - 30-day expiry but no revocation mechanism
   - **Fix:** Add token refresh and revocation endpoints

8. **File uploads lack virus scanning**
   - Video files are stored directly without malware scanning
   - **Fix:** Integrate a file scanner or cloud storage with built-in scanning (e.g., S3 + malware scanning)

9. **Upload endpoint has no authentication**
   - `/api/admin/upload-video` accepts files from anyone
   - **Fix:** Require `x-admin-pin` header on upload endpoints too

10. **Anthropic SDK imported but OpenAI is used**
    - `@anthropic-ai/sdk` is in `package.json` but the code uses OpenAI
    - **Fix:** Remove the unused Anthropic dependency to reduce attack surface

### 🟢 Already Well Done

- ✅ Helmet security headers (CSP, HSTS)
- ✅ Rate limiting (global + safety-specific)
- ✅ SQL injection prevention (Drizzle ORM)
- ✅ Input validation (Zod schemas)
- ✅ File sanitization (path.basename + allowlist)
- ✅ SHA-256 password hashing (no plaintext storage)
- ✅ pnpm minimum release age (supply chain protection)
- ✅ AI content moderation for minors
- ✅ Parent notification system for safety events
- ✅ Trust scoring system
- ✅ Supervised mode for new accounts (14 days)

---

## 18. Deployment (Original Replit Setup)

The project was designed to run on **Replit** with the following configuration (from `.replit`):

| Resource | Version |
|----------|---------|
| Node.js | 24 |
| PostgreSQL | 16 |
| Python | 3.11 (tooling only) |

### Port Mapping on Replit

| Internal Port | External Port | Service |
|:------------:|:------------:|---------|
| 8080 | 80 | API server (becomes the main `/api` route) |
| 22303 | 3000 | Frontend Vite dev server |

### Workflow Commands

Replit Workflows manage the services automatically. The equivalent manual commands are:

```bash
# Run backend
PORT=8080 BASE_PATH=/api pnpm --filter @workspace/api-server run dev

# Run frontend  
PORT=22303 BASE_PATH=/ pnpm --filter @workspace/mech-vr-lab run dev

# Run DB migrations
pnpm --filter @workspace/db run migrate

# Re-generate API client after editing OpenAPI spec
pnpm --filter @workspace/api-spec run codegen

# Type-check everything
pnpm run typecheck

# Build everything
pnpm run build
```

### Health Check
```
GET https://<your-domain>/api/healthz
→ {"status": "ok"}
```

---

## 19. AWS Deployment Architecture & Process

This section details how to deploy the **1WayMirror** monorepo to AWS in a production-ready, secure, and scalable manner.

### 19.1 Architecture Diagram

```
                     ┌──────────────────┐
                     │   Route 53 DNS   │
                     └────────┬─────────┘
                              │ (HTTPS on custom domain)
                              ▼
                     ┌──────────────────┐
                     │ CloudFront (CDN) │
                     └───────┬──┬───────┘
          /api/* requests    │  │   Static frontend assets
         ┌───────────────────┘  └──────────────────┐
         ▼                                         ▼
┌──────────────────┐                     ┌──────────────────┐
│ AWS App Runner / │                     │    Amazon S3     │
│   ECS Fargate    │                     │  (Private Bucket)│
└────────┬─────────┘                     └──────────────────┘
         │
         ├── Amazon RDS PostgreSQL
         ├── OpenAI API (External HTTPS)
         └── Resend Email API (External HTTPS)
```

### 19.2 AWS Infrastructure Components

1. **Frontend Hosting (S3 + CloudFront)**:
   - **Amazon S3**: A private bucket holds the compiled React production bundle (HTML, JS, CSS, and media assets). Public read access to the bucket is disabled.
   - **Amazon CloudFront**: Acts as the content distribution network. It serves the frontend static files using **Origin Access Control (OAC)** to securely fetch them from the S3 bucket.
2. **Backend API Server (App Runner / ECS Fargate)**:
   - **AWS App Runner**: The easiest and most managed service for containerized web servers. It automatically handles scaling, load balancing, and SSL.
   - **AWS ECS Fargate**: Alternatively, for complex network setups (VPC), run the backend container in ECS Fargate behind an **Application Load Balancer (ALB)**.
3. **Database (Amazon RDS for PostgreSQL)**:
   - Run a managed PostgreSQL instance on RDS. Ensure it lives in private subnets, only allowing inbound TCP traffic on port `5432` from the backend API container's security group.
4. **Secrets & Configurations (SSM Parameter Store or Secrets Manager)**:
   - Store credentials (e.g., `DATABASE_URL`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `RESEND_API_KEY`) securely. Inject them directly into the App Runner or ECS container as environment variables at startup.
5. **DNS & SSL (Route 53 + ACM)**:
   - Use **AWS Route 53** for domain name management.
   - Request a free SSL/TLS certificate via **AWS Certificate Manager (ACM)** and attach it to CloudFront.

### 19.3 Step-by-Step Deployment Process

#### Step 1: Dockerize the Backend API Server
Create a `Dockerfile` in the root of the workspace to build the backend server and its local database dependencies:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm --filter @workspace/db build
RUN pnpm --filter @workspace/api-server build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY lib/db/package.json ./lib/db/
COPY artifacts/api-server/package.json ./artifacts/api-server/
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist
COPY --from=builder /app/lib/db/dist ./lib/db/dist
EXPOSE 8080
CMD ["node", "artifacts/api-server/dist/index.js"]
```

#### Step 2: Push the Image to ECR
1. Create an ECR repository named `1waymirror-api`.
2. Authenticate Docker with ECR and push the image:
   ```bash
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com
   docker build -t 1waymirror-api .
   docker tag 1waymirror-api:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/1waymirror-api:latest
   docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/1waymirror-api:latest
   ```

#### Step 3: Deploy the Database (RDS)
1. Provision a PostgreSQL instance in Amazon RDS.
2. Update the database's security group to authorize traffic from the App Runner or ECS security group.

#### Step 4: Deploy the Backend (AWS App Runner)
1. In AWS App Runner console, create a service linked to the ECR container repository.
2. Set the port to `8080`.
3. Reference SSM parameters to define the environment variables (`DATABASE_URL`, `PORT=8080`, `AI_INTEGRATIONS_OPENAI_API_KEY`, `RESEND_API_KEY`).

#### Step 5: Deploy the Frontend (S3 + CloudFront)
1. Build frontend assets locally or in CI:
   ```bash
   pnpm --filter @workspace/mech-vr-lab build
   ```
2. Upload the `dist/` directory files to your private Amazon S3 bucket:
   ```bash
   aws s3 sync artifacts/mech-vr-lab/dist/ s3://your-frontend-bucket-name/ --delete
   ```
3. Configure a **CloudFront Distribution**:
   - **Origin 1 (S3)**: Point to your S3 bucket. Configure Origin Access Control (OAC) and let CloudFront update the S3 bucket policy to allow read access.
   - **Origin 2 (Custom API)**: Point to your App Runner URL (e.g., `https://xxxxxx.us-east-1.awsapprunner.com`).
   - **Default Cache Behavior (`*`)**: Point to Origin 1 (S3). All standard page views go to S3. Set default root object to `index.html`.
   - **API Behavior (`/api/*`)**: Point to Origin 2 (App Runner/ALB). Disable caching for this route. Set allowed HTTP methods to `GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE`. Forward headers (`Authorization`, `Content-Type`, `x-admin-pin`, etc.).

---

## 20. User Registration, Admin Management & Stripe Subscriptions

This section clarifies how student and admin accounts are stored, how the present local-only security works, and how subscription gates operate.

### 20.1 User Registration & Storage

#### Current Mechanics
1. **Student Registration**: When a student signs up via the frontend UI, their profile is registered in two locations:
   - **Server Database**: The endpoint `POST /api/safety/register` creates rows in the `safety_accounts` (profile details) and `trust_scores` (verification metrics) tables.
   - **Local Storage**: The credentials (email and password hash) are written directly to `localStorage.getItem("1waymirror_accounts_v1")` on the client.
2. **Authentication Flow**: When logging in, the frontend hashes the password using SHA-256 and validates it against `localStorage`. No session is created on the server.
3. **Implications**:
   - If a student clears their browser data, their credentials are lost.
   - There is no server-side validation. A malicious user can write dummy auth keys to `localStorage` or edit their subscription plan level, bypassing auth checks in the frontend routing.

#### Production Migration Strategy (To fix the issue)
To build a secure, standard authentication layer, make these modifications:
1. **Create a Unified Users Table**: Add a `users` table to `lib/db/src/schema/learners.ts` or as a new table:
   ```typescript
   export const usersTable = pgTable("users", {
     id: text("id").primaryKey(),
     email: text("email").notNull().unique(),
     passwordHash: text("password_hash").notNull(),
     name: text("name").notNull(),
     plan: text("plan").notNull().default("free"), // free, starter, explorer, builder, accelerator
     createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
   });
   ```
2. **Move Auth Logic to API Server**:
   - Write `/api/auth/register` and `/api/auth/login` endpoints on the backend.
   - Use a library like `bcryptjs` or `argon2` to hash and verify passwords on the server instead of client-side SHA-256.
   - Upon successful login, generate a JWT or set a secure HTTP-only session cookie.
3. **Session Verification**: Use a middleware (e.g. `requireAuth`) on backend routes to verify the JWT/cookie, extract the `userId`, and only return data that the user is authorized to see.

### 20.2 Admin Management

#### Current Mechanics
- The admin dashboard is gated in `AdminPage.tsx` using a single hardcoded check for the email `one.waymirror@outlook.com` and password `Shipnot2020!`.
- Backend endpoints verify the requests using a single secret `x-admin-pin` header matching the server's `ADMIN_PIN` variable.
- Consequently, **multiple administrators cannot be registered individually**.

#### Supporting Multiple Admins
1. Add a `role` field to your database `users` table (e.g. `role: text("role").notNull().default("student")`).
2. Add an `admin` role validation in the authentication flow.
3. Replace the `x-admin-pin` check in backend route handlers (like `/api/safety/flags` or `/api/safety/stats`) with a token validation middleware that checks if the authenticated user's database role is `admin`.

### 20.3 Subscription Purchase & Management (Stripe Integration)

Since plans are currently simulated using `localStorage` updates, here is the architecture required to hook up live Stripe billing:

#### 1. Setup Stripe Products
In the Stripe Dashboard, create products for the subscription tiers:
- **Starter Plan**
- **Explorer Plan**
- **Builder Plan**
- **Accelerator Plan**
Each should have a recurring monthly and/or annual price ID.

#### 2. Update DB Schema
Add billing fields to the database `users` table to track Stripe metadata:
```typescript
stripeCustomerId: text("stripe_customer_id"),
stripeSubscriptionId: text("stripe_subscription_id"),
subscriptionStatus: text("subscription_status"), // active, past_due, canceled
```

#### 3. Implement Checkout Flow
Create a backend route `POST /api/billing/create-checkout-session`:
```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2023-10-16" });

router.post("/billing/create-checkout-session", async (req, res) => {
  const { priceId } = req.body;
  const user = req.user; // from auth middleware

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    customer_email: user.email,
    client_reference_id: user.id, // passes user ID to webhook
    success_url: `${process.env.FRONTEND_URL}/replitopolis?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/upgrade`,
  });

  res.json({ url: session.url });
});
```

#### 4. Stripe Webhook Listener
Create a raw request parser route `POST /api/billing/webhook` to capture updates:
```typescript
router.post("/billing/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"]!;
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    // Retrieve subscription details to find the price ID and update database user's plan
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const plan = mapPriceIdToPlanName(subscription.items.data[0].price.id);

    await db.update(usersTable)
      .set({ stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, subscriptionStatus: "active", plan })
      .where(eq(usersTable.id, userId));
  }
  // Handle customer.subscription.updated and customer.subscription.deleted to sync cancellations/failures
  res.json({ received: true });
});
```

#### 5. Provide Customer Billing Portal
Provide a route `POST /api/billing/create-portal-session` that generates a redirect link to Stripe's hosted Billing Portal. This allows users to change payment details, download receipts, or cancel subscriptions on their own.

#### 6. Server-Side Feature Gating
On endpoints that require higher tiers (e.g. Dario chat endpoints), check the database `users.plan` and `users.subscriptionStatus` before running the request logic:
```typescript
if (user.plan !== "explorer" && user.plan !== "builder" && user.plan !== "accelerator") {
  return res.status(403).json({ error: "Explorer subscription or higher required" });
}
```

---

## 21. Code Architecture: Monorepo vs. Monolith & Developer Collaboration

This section explains the difference between repository layouts (monorepo vs. polyrepo) and deployment architectures (monolith vs. microservices), details why this project uses a monorepo, and sets best practices for working with multiple developers.

### 21.1 Definitions: Monolith vs. Monorepo

Many developers confuse these two terms, but they represent entirely separate dimensions:

1. **Deployment Architecture: Monolith vs. Microservices**
   - **Monolith**: A software system where all logic, services, database queries, and client views are combined and run inside a single running server process or app runtime.
   - **Microservices**: A software system composed of several smaller, decoupled services (e.g., Auth service, User service, Payment service) running on separate ports/machines, talking via HTTP, gRPC, or message brokers.
2. **Version Control Strategy: Monorepo vs. Polyrepo**
   - **Monorepo (Mono-Repository)**: A code management style where several independent projects, packages, or services are stored in a single Git repository.
   - **Polyrepo (Multi-Repository)**: The standard style where each individual app or service has its own dedicated Git repository.

#### Is this project a monolith or a monorepo?
* **It is a Monorepo**: It houses multiple packages (the backend `@workspace/api-server`, the React frontend `@workspace/mech-vr-lab`, the database client `@workspace/db`, etc.) in a single Git repo.
* **It is NOT a deployment monolith**: The frontend builds to static HTML/JS/CSS (deployed on CDN / S3) and the backend builds to a Node/Express container (deployed on ECS/App Runner). They are run, built, and scaled as separate workloads.

---

### 21.2 Why This Project Uses a Monorepo

This project utilizes a **pnpm monorepo** with local packages for the following reasons:

1. **Tight Coupling of API Contracts**: 
   The frontend communicates with the backend via a REST API defined in [openapi.yaml](file:///c:/Users/workm/Desktop/BACKEND/VR-Mech-Lab/lib/api-spec/openapi.yaml). 
   - By keeping the spec inside the monorepo under `lib/api-spec`, the codegen tool (Orval) can instantly generate TypeScript API client hooks (`lib/api-client-react`) and backend schemas (`lib/api-zod`) for both folders in one command.
2. **Single Source of Truth Database Schemas**: 
   The database layout (Drizzle ORM schema) resides in the local shared library `lib/db`. 
   - Both the backend API server (`artifacts/api-server`) and database migration scripts import this package locally (using `"@workspace/db": "workspace:*"`). 
   - When a table schema is modified, both projects immediately see the type updates without having to publish a package to a private npm registry first.
3. **Unified Developer Environment**:
   A new developer can configure the whole system by cloning a single repository, running `pnpm install`, and booting up the database.

---

### 21.3 Advantages & Disadvantages

#### Advantages
* **Atomic Commits**: You can change a database column, add an API route, and update the frontend consumer code to use that route in a single Git commit. This completely avoids "sync mismatch" bugs.
* **Easy Code Sharing**: Commonalities like linting rules (Prettier/ESLint) and configurations are defined once at the root level and inherited by all packages.
* **Full-Stack Type Safety**: If a developer changes the type of a database column, TypeScript will immediately highlight any type issues in the frontend components at compile-time.

#### Disadvantages
* **Git Repository Growth**: Since all subprojects, configurations, and mock sandbox modules live together, the repository size grows faster.
* **Tricky CI/CD Pipelines**: Deploying the backend every time a frontend CSS file is updated wastes time and money. Pipelines must be configured with path filtering.
* **Lockfile Commits**: Multiple developers adding different packages can easily corrupt the root `pnpm-lock.yaml`, leading to painful merge conflicts.

---

### 21.4 Handling Monorepos with Multiple Developers (Best Practices)

When collaborating on this repository, developers should follow these rules:

1. **Never run `npm install` or `yarn install`**:
   - Always use **`pnpm`** from the root of the workspace. pnpm uses symlinks (`node_modules/.pnpm`) to wire workspace packages together. Using other package managers will corrupt these links.
2. **Commit Root Lockfiles Only**:
   - Do not commit subfolder lockfiles (like `package-lock.json`). The single source of truth for all dependencies is the root [pnpm-lock.yaml](file:///c:/Users/workm/Desktop/BACKEND/VR-Mech-Lab/pnpm-lock.yaml).
3. **Use Path-Aware CI/CD Pipelines**:
   - Configure your CI/CD runner (e.g. GitHub Actions) to run tests or builds conditionally based on modified paths:
     - Push to `artifacts/mech-vr-lab/**` or `lib/api-client-react/**` → Build & deploy the Frontend.
     - Push to `artifacts/api-server/**` or `lib/db/**` or `lib/api-zod/**` → Run backend tests & deploy Backend.
4. **Use Workspace Add Commands**:
   - To add a dependency (like `lodash`) to the frontend package from the root:
     ```bash
     pnpm --filter @workspace/mech-vr-lab add lodash
     ```
5. **Code Review & Branch Protection**:
   - Enforce branch protection on `main`.
   - Prevent merging if `pnpm run typecheck` or workspace builds fail.

---

*Documentation created by analyzing all source files in the VR-Mech-Lab workspace.*
*Last updated: June 2026*
