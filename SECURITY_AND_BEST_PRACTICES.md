# 🛡️ Professional Authentication, Security & Best Practices Guide

This guide outlines how to transform the current prototype codebase into a production-grade system. It covers migrating to database-backed session authentication, writing middleware, securing routes, integrating Stripe, validating environment variables, and organizing a monorepo workspace for multiple developers.

---

## 1. Migrating to Professional Backend Authentication

### The Current Problem
Currently, student authentication is managed entirely client-side. The frontend:
1. Hashes passwords using SHA-256 in the browser.
2. Compares the hash against a list stored in `localStorage` under `1waymirror_accounts_v1`.
3. Stores active user sessions in `localStorage` under `1waymirror_auth_v1`.
4. Gates features (like subscription tiers) purely in client-side code (`profile.ts`).

**Why this is dangerous:**
* **No Server-Side Guarding**: A user can open browser developer tools, manually set their subscription plan to `"accelerator"`, and bypass payment verification.
* **Lack of Session Integrity**: If a user clears their browser cache or uses a different device, their account credentials are lost.
* **XSS Vulnerabilities**: Storing session tokens or credentials in `localStorage` makes them accessible to malicious scripts (Cross-Site Scripting).

---

### Step 1: Create the Database Schema
First, we must define a centralized `users` table on the backend. This table will serve as the single source of truth for accounts, credentials, roles, and subscriptions.

Create a new schema file `lib/db/src/schema/users.ts`:

```typescript
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const usersTable = pgTable("users", {
  id: text("id").primaryKey(), // Generate UUID on the server
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(), // Strong backend hash (bcrypt/argon2)
  role: text("role").notNull().default("student"), // "student" | "admin"
  plan: text("plan").notNull().default("free"), // "free" | "starter" | "explorer" | "builder" | "accelerator"
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof usersTable.$inferSelect;
export type InsertUser = typeof usersTable.$inferInsert;
```

Remember to export this table in `lib/db/src/schema/index.ts`:
```typescript
export * from "./users";
// ... other exports
```

---

### Step 2: Implement Secure HttpOnly Cookie Session/JWT
Storing JWTs in `localStorage` makes them susceptible to XSS. A professional solution is to store the session JWT inside a secure, `HttpOnly` cookie.

#### Install Dependencies
In the backend project (`artifacts/api-server/package.json`):
```json
"dependencies": {
  "bcryptjs": "^2.4.3",
  "jsonwebtoken": "^9.0.2",
  "cookie-parser": "^1.4.7"
}
```
*(Also install their `@types/` as devDependencies)*

#### Create Auth Router (`artifacts/api-server/src/routes/auth.ts`)
```typescript
import { Router } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key";

// Helper: Sign JWT and Set HttpOnly Cookie
function setAuthCookie(res: any, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });

  res.cookie("auth_token", token, {
    httpOnly: true, // Prevents Javascript from reading the cookie (protects from XSS)
    secure: process.env.NODE_ENV === "production", // Sent only over HTTPS in production
    sameSite: "lax", // Protects against CSRF attacks
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// 1. POST /api/auth/register
router.post("/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  try {
    // Check if user already exists
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normEmail)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "Account with this email already exists" });
      return;
    }

    // Hash password on the server
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();

    // Insert user into DB
    await db.insert(usersTable).values({
      id: userId,
      email: normEmail,
      name: name.trim(),
      passwordHash,
      role: "student",
      plan: "free",
    });

    // Generate token and write cookie
    setAuthCookie(res, userId);

    res.status(201).json({
      id: userId,
      name,
      email: normEmail,
      role: "student",
      plan: "free",
    });
  } catch (err) {
    res.status(500).json({ error: "Registration failed" });
  }
});

// 2. POST /api/auth/login
router.post("/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  try {
    const user = await db.select().from(usersTable).where(eq(usersTable.email, normEmail)).limit(1);
    if (!user[0]) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isValid = await bcrypt.compare(password, user[0].passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    setAuthCookie(res, user[0].id);

    res.json({
      id: user[0].id,
      name: user[0].name,
      email: user[0].email,
      role: user[0].role,
      plan: user[0].plan,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed" });
  }
});

// 3. POST /api/auth/logout
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
});

export default router;
```

---

### Step 3: Write Authentication & Authorization Middlewares
Middlewares act as security checkpoints on the Express server. We need to create:
1. `authenticate`: Resolves the cookie, validates the JWT, and loads the active user into `req.user`.
2. `requireAuth`: Rejects request if the user is not logged in.
3. `requireRole`: Gates routes to specific roles (like admin).
4. `requirePlan`: Gates routes to specific subscription tiers (like explorer/builder).

Create `artifacts/api-server/src/middlewares/auth.ts`:

```typescript
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key";

// Extend Request type definition to attach user details
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name: string;
        role: "student" | "admin";
        plan: "free" | "starter" | "explorer" | "builder" | "accelerator";
      };
    }
  }
}

// 1. Authenticate Middleware (Soft check — decorates req.user if token exists)
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;

  if (!token) {
    return next();
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);

    if (users[0]) {
      req.user = {
        id: users[0].id,
        email: users[0].email,
        name: users[0].name,
        role: users[0].role as "student" | "admin",
        plan: users[0].plan as any,
      };
    }
  } catch (err) {
    // Token is invalid or expired; clear cookie and continue anonymously
    res.clearCookie("auth_token");
  }
  next();
}

// 2. Require Authentication (Hard check — rejects if not logged in)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized. Please log in." });
    return;
  }
  next();
}

// 3. Require Role Middleware
export function requireRole(allowedRoles: ("student" | "admin")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: You do not have permission." });
      return;
    }
    next();
  };
}

// 4. Require Subscription Plan Middleware
export function requirePlan(minimumPlan: "free" | "starter" | "explorer" | "builder" | "accelerator") {
  const planWeights = {
    free: 0,
    starter: 1,
    explorer: 2,
    builder: 3,
    accelerator: 4,
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userWeight = planWeights[req.user.plan] ?? 0;
    const minWeight = planWeights[minimumPlan];

    if (userWeight < minWeight) {
      res.status(403).json({
        error: `Upgrade Required: This feature requires a ${minimumPlan} subscription or higher.`,
      });
      return;
    }
    next();
  };
}
```

---

### Step 4: Mount Cookies parser and Auth middlewares
Register the new modules in `artifacts/api-server/src/app.ts`:

```typescript
import express from "express";
import cookieParser from "cookie-parser";
import authRouter from "./routes/auth";
import { authenticate } from "./middlewares/auth";

const app = express();

app.use(cookieParser()); // Required to parse cookies from browser headers
app.use(express.json());
app.use(authenticate); // Automatically resolve user sessions globally

app.use("/api/auth", authRouter);
```

To secure database-sensitive routes (e.g. Dario chat):
```typescript
import { requireAuth, requirePlan } from "../middlewares/auth";

// Only authenticated Builder plan users can access the full report
router.post("/dario/career-report", requireAuth, requirePlan("builder"), async (req, res) => {
  // Safe server-side processing using validated req.user.id
});
```

---

## 2. Additional Monorepo & Backend Best Practices

Here are key patterns currently missing in the codebase that should be resolved to elevate it to professional standards:

### 1. Strictly Validated Environment Variables
Currently, variables like `DATABASE_URL` or `ADMIN_PIN` are accessed inline as `process.env.DATABASE_URL`. If a variable is missing or wrong, the server might fail silent-randomly.

**Solution:** Use **Zod** to validate env parameters at startup. 
Create `artifacts/api-server/src/lib/env.ts`:

```typescript
import { z } from "zod";
import dotenv from "dotenv";
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(8080),
  JWT_SECRET: z.string().min(32),
  AI_INTEGRATIONS_OPENAI_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ADMIN_PIN: z.string().default("1WAY2026"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment configurations:", parsed.error.format());
  process.exit(1); // Crash immediately with a clean error layout
}

export const env = parsed.data;
```

---

### 2. Lock Down CORS Origins
Currently, CORS uses `app.use(cors())` which exposes endpoints to any domain (`*`). This permits cross-site requests to read API data if credentials are sent.

**Solution:** Limit domains using a dynamic config mapping in production:
```typescript
import cors from "cors";

const allowedOrigins = process.env.NODE_ENV === "production"
  ? ["https://1waymirror.com"]
  : ["http://localhost:22303", "http://localhost:5173"];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true, // Crucial! Allows the browser to send HttpOnly cookies to the API
}));
```

---

### 3. Move Large Data Schemas Out of Code
* The career catalog of 85 careers in `artifacts/api-server/src/lib/simulations.ts` is a massive static structure (49KB).
* The 1000+ news articles in `artifacts/mech-vr-lab/src/lib/feedArticles.ts` are stored directly as JS objects.

**Why it's a bad practice:**
* Storing large dataset assets directly in source code inflates Javascript bundles, increasing download size and page load times.
* To change a typos in an article, you have to push a code change, rebuild, and redeploy the servers.

**Solution:**
* Store the content inside your PostgreSQL database (`careers` and `feed_articles` tables).
* Implement simple admin routes to create, read, update, and delete (CRUD) them.
* Fetch them dynamically in the React frontend using **TanStack React Query** with standard caching.

---

### 4. Shared Monorepo Tooling
In a multi-developer setup, enforce consistency using a root configuration strategy:

1. **Root Formatter & Linter**: Define a shared `.prettierrc` and `.eslintrc.json` at the root workspace directory.
2. **Atomic workspace commands**:
   Add script entries in the root `package.json` to handle tasks across all subfolders:
   ```json
   "scripts": {
     "typecheck": "pnpm -r exec tsc --noEmit",
     "format": "prettier --write \"**/*.{ts,tsx,js,json,md}\"",
     "build": "pnpm -r build"
   }
   ```
3. **Commit Protections**: Use `husky` and `lint-staged` to run linter/typescript audits automatically on staged files during commit attempts.
