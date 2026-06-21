import { Router } from "express";
import {
  db, usersTable, learnersTable, safetyAccountsTable,
  parentAccountsTable, trustScoresTable
} from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const router = Router();

const JWT_SECRET         = process.env.JWT_SECRET         || "fallback-access-secret-min-32-chars!!";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "fallback-refresh-secret-min-64-chars-long!!";

const ACCESS_EXPIRES_SECS  = 15 * 60;           // 15 minutes
const REFRESH_EXPIRES_SECS = 7 * 24 * 60 * 60;  // 7 days

// ── Token helpers ──────────────────────────────────────────────────────────

function signAccessToken(userId: string, role: string): string {
  return jwt.sign({ sub: userId, role }, JWT_SECRET, { expiresIn: ACCESS_EXPIRES_SECS });
}

function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: "refresh" }, JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_SECS });
}

/** Stores the refresh token in an httpOnly cookie — invisible to JavaScript */
function setRefreshCookie(res: any, token: string) {
  res.cookie("refresh_token", token, {
    httpOnly: true,                                        // JS cannot read this
    secure: process.env.NODE_ENV === "production",         // HTTPS only in prod
    sameSite: "lax",                                       // CSRF protection
    maxAge: REFRESH_EXPIRES_SECS * 1000,
    path: "/api/auth",                                     // Only sent on auth routes
  });
}

function clearRefreshCookie(res: any) {
  res.clearCookie("refresh_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth",
  });
}

/** Consistent user shape returned in all auth responses */
function userPayload(u: { id: string; name: string; email: string; role: string; plan: string }) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, plan: u.plan };
}

/** Standard auth success response shape */
function authResponse(user: ReturnType<typeof userPayload>, accessToken: string) {
  return {
    accessToken,                     // Store in JS memory (React context/state)
    expiresIn: ACCESS_EXPIRES_SECS,  // Seconds until accessToken expires (900)
    tokenType: "Bearer",
    user,
  };
}

// ── Trust score helpers ────────────────────────────────────────────────────

function calcTrustScore(components: {
  schoolEmailVerified: boolean; parentVerified: boolean; phoneVerified: boolean;
  accountAgeDays: number; noFlagsBonus: boolean; tier2Flags: number; tier3Flags: number;
  ageConsistencyFailed: boolean; noParentContact: boolean;
}): number {
  let s = 25;
  if (components.schoolEmailVerified) s += 30;
  if (components.parentVerified) s += 20;
  if (components.phoneVerified) s += 10;
  if (components.accountAgeDays >= 30 && components.noFlagsBonus) s += 15;
  if (components.accountAgeDays >= 7) s += 5;
  if (!components.ageConsistencyFailed) s += 5;
  s -= components.tier2Flags * 15;
  s -= components.tier3Flags * 50;
  if (components.ageConsistencyFailed) s -= 25;
  if (components.noParentContact) s = Math.min(s, 75);
  return Math.max(0, Math.min(100, s));
}

function trustBadge(score: number): string {
  if (score >= 70) return "verified";
  if (score >= 40) return "active";
  if (score < 0)   return "review";
  return "new";
}

function deriveVerificationTier(schoolEmailVerified: boolean, parentVerified: boolean): string {
  if (schoolEmailVerified) return "A";
  if (parentVerified) return "B";
  return "C";
}

/* ─────────────────────────────────────────────────────────
   POST /api/auth/register
   Comprehensive primary signup + safety profile registration
   ─────────────────────────────────────────────────────────
   Response: { accessToken, expiresIn, tokenType, user }
   Cookie:   refresh_token (httpOnly, path=/api/auth)
   ───────────────────────────────────────────────────────── */
router.post("/register", async (req, res): Promise<void> => {
  const {
    name, email, password,
    birthdate, grade, graduationYear, schoolName, schoolEmail,
    careerInterests,
    parentName, parentEmail, parentPhone,
    noParentContact, counselorEmail
  } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  try {
    const existing = await db.select().from(usersTable).where(eq(usersTable.email, normEmail)).limit(1);
    if (existing[0]) {
      res.status(400).json({ error: "An account with this email already exists" });
      return;
    }

    // Hash password with bcryptjs
    const passwordHash = await bcrypt.hash(password, 12);
    const userId = crypto.randomUUID();
    const studentId = crypto.randomUUID(); // safety account ID

    // Calculate verification and safety properties
    const schoolEmailVerified = typeof schoolEmail === "string"
      ? /\.(edu|k12\.[a-z]{2}|k12)$/i.test(schoolEmail) || /school|district|isd|cusd|usd/i.test(schoolEmail)
      : false;
    const parentVerified = !noParentContact && !!parentEmail;
    const tier = deriveVerificationTier(schoolEmailVerified, parentVerified);
    const supervisedModeUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    const dmEnabledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const score = calcTrustScore({
      schoolEmailVerified,
      parentVerified,
      phoneVerified: false,
      accountAgeDays: 0,
      noFlagsBonus: true,
      tier2Flags: 0,
      tier3Flags: 0,
      ageConsistencyFailed: false,
      noParentContact: !!noParentContact,
    });

    // Run everything in a single transaction to guarantee atomic database updates
    await db.transaction(async (tx) => {
      // 1. Create Core User record
      await tx.insert(usersTable).values({
        id: userId,
        email: normEmail,
        name: name.trim(),
        passwordHash,
        role: "student",
        plan: "free",
      });

      // 2. Initialize Learner Stats
      await tx.insert(learnersTable).values({
        id: userId,
        totalXp: 0,
        level: 1,
        streak: 0,
        bestStreak: 0,
        challengesCompleted: 0,
        challengesCorrect: 0,
      });

      // 3. Create Safety Account // student
      await tx.insert(safetyAccountsTable).values({
        id: studentId,
        learnerId: userId,
        userId: userId,
        email: normEmail,
        name: name.trim(),
        birthdate: birthdate as string | undefined,
        grade: grade ? parseInt(grade, 10) : undefined,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : undefined,
        schoolName: schoolName as string | undefined,
        schoolEmail: schoolEmail as string | undefined,
        personalEmail: normEmail,
        careerInterests: Array.isArray(careerInterests) ? careerInterests : [],
        verificationTier: tier,
        emailVerified: false,
        schoolEmailVerified,
        noParentContact: !!noParentContact,
        counselorEmail: counselorEmail as string | undefined,
        supervisedModeUntil,
        dmEnabledAt,
      });

      // 4. Create Parent Account if provided
      if (parentVerified) {
        const parentId = crypto.randomUUID();
        const parentToken = crypto.randomBytes(16).toString("hex");
        const tokenExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await tx.insert(parentAccountsTable).values({
          id: parentId, studentId, userId,
          name: parentName as string,
          email: (parentEmail as string).toLowerCase().trim(),
          phone: parentPhone as string | undefined,
          relationship: "parent",
          emailVerified: false,
          accessToken: parentToken,
          tokenExpiresAt,
        });
      }

      // 5. Create Trust Score record
      await tx.insert(trustScoresTable).values({
        studentId,
        userId: userId,
        score,
        tier,
        schoolEmailVerified,
        parentVerified,
        phoneVerified: false,
        accountAgeDays: 0,
        noFlagsBonus: true,
        tier2Flags: 0,
        tier3Flags: 0,
        ageConsistencyFailed: false,
        badge: trustBadge(score),
      });
    });

    const user         = userPayload({ id: userId, name: name.trim(), email: normEmail, role: "student", plan: "free" });
    const accessToken  = signAccessToken(userId, "student");
    const refreshToken = signRefreshToken(userId);

    setRefreshCookie(res, refreshToken);
    res.status(201).json(authResponse(user, accessToken));

  } catch (err) {
    console.error("[register] Transaction failed:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/login
   ─────────────────────────────────────────────────────────
   Response: { accessToken, expiresIn, tokenType, user }
   Cookie:   refresh_token (httpOnly, path=/api/auth)
   ───────────────────────────────────────────────────────── */
router.post("/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  try {
    const rows   = await db.select().from(usersTable).where(eq(usersTable.email, normEmail)).limit(1);
    const dbUser = rows[0];

    // Always run bcrypt even if user not found → prevents timing attacks
    const dummyHash = "$2a$12$invalidhashusedfortimingnormalizationonly......";
    const isValid = dbUser
      ? await bcrypt.compare(password, dbUser.passwordHash)
      : await bcrypt.compare(password, dummyHash).then(() => false);

    if (!dbUser || !isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const user         = userPayload(dbUser);
    const accessToken  = signAccessToken(dbUser.id, dbUser.role);
    const refreshToken = signRefreshToken(dbUser.id);

    setRefreshCookie(res, refreshToken);
    res.json(authResponse(user, accessToken));

  } catch (err) {
    console.error("[login] Failed:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/refresh
   Silently called by frontend when accessToken expires.
   Reads httpOnly refresh_token cookie → returns new accessToken.
   ─────────────────────────────────────────────────────────
   Response: { accessToken, expiresIn, tokenType }
   ───────────────────────────────────────────────────────── */
router.post("/refresh", async (req, res): Promise<void> => {
  const token = req.cookies?.refresh_token;
  if (!token) {
    res.status(401).json({ error: "No refresh token" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_REFRESH_SECRET) as { sub: string; type: string };
    if (payload.type !== "refresh") throw new Error("Not a refresh token");

    const rows = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);
    if (!rows[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    const newAccessToken = signAccessToken(rows[0].id, rows[0].role);
    res.json({ accessToken: newAccessToken, expiresIn: ACCESS_EXPIRES_SECS, tokenType: "Bearer" });

  } catch (err) {
    clearRefreshCookie(res);
    res.status(401).json({ error: "Refresh token expired or invalid. Please log in again." });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/logout
   Clears the httpOnly refresh_token cookie.
   ───────────────────────────────────────────────────────── */
router.post("/logout", (req, res) => {
  clearRefreshCookie(res);
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────
   GET /api/auth/me
   Reads Bearer accessToken from Authorization header.
   ─────────────────────────────────────────────────────────
   Header: Authorization: Bearer <accessToken>
   Response: { user }
   ───────────────────────────────────────────────────────── */
router.get("/me", async (req, res): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const rows = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);

    if (!rows[0]) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    res.json({ user: userPayload(rows[0]) });

  } catch (err) {
    res.status(401).json({ error: "Access token expired or invalid" });
  }
});

export default router;
