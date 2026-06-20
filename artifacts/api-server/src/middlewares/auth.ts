import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key-32-chars-long";

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

// 1. authenticate: Parses session cookies and populates req.user
export async function authenticate(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.auth_token;
  if (!token) return next();

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
    res.clearCookie("auth_token");
  }
  next();
}

// 2. requireAuth: Gates access to authenticated users
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: "Unauthorized. Please sign in." });
    return;
  }
  next();
}

// 3. requireRole: Restricts endpoints to selected roles
export function requireRole(allowedRoles: ("student" | "admin")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: "Forbidden: Access denied" });
      return;
    }
    next();
  };
}

// 4. requirePlan: Enforces plan gating
export function requirePlan(minimumPlan: "free" | "starter" | "explorer" | "builder" | "accelerator") {
  const weights = { free: 0, starter: 1, explorer: 2, builder: 3, accelerator: 4 };

  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const userWeight = weights[req.user.plan] ?? 0;
    const minWeight = weights[minimumPlan];

    if (userWeight < minWeight) {
      res.status(403).json({
        error: `Upgrade Required: This feature requires a ${minimumPlan} plan or higher.`,
      });
      return;
    }
    next();
  };
}
