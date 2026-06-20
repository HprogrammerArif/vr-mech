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
const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key-32-chars-long";

// Helper to sign JWT and set cookie
function setAuthCookie(res: any, userId: string) {
  const token = jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: "7d" });

  res.cookie("auth_token", token, {
    httpOnly: true, // Safeguard against XSS
    secure: process.env.NODE_ENV === "production", // HTTPS only in production
    sameSite: "lax", // Protect against CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

// Helpers for trust score calculation
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

      // 3. Create Safety Account
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
          id: parentId,
          studentId,
          userId: userId,
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

    setAuthCookie(res, userId);

    res.status(201).json({
      id: userId,
      name: name.trim(),
      email: normEmail,
      role: "student",
      plan: "free",
    });
  } catch (err) {
    console.error("[register] Transaction failed:", err);
    res.status(500).json({ error: "Registration failed. Please try again." });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/login
   ───────────────────────────────────────────────────────── */
router.post("/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const normEmail = email.toLowerCase().trim();

  try {
    const users = await db.select().from(usersTable).where(eq(usersTable.email, normEmail)).limit(1);
    console.log({user: users[0], normEmail})
    if (!users[0]) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }
    

    // const isCorrectPassword: boolean = await bcrypt.compare(payload.password, userData.password);

    // if (!isCorrectPassword) {
    //     throw new Error("Password incorrect!")
    // }

    const isValid: boolean = await bcrypt.compare(password, users[0].passwordHash);
    if (!isValid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    setAuthCookie(res, users[0].id);

    res.json({
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
      plan: users[0].plan,
    });
  } catch (err) {
    res.status(500).json({ error: "Login failed. Please try again." });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/auth/logout
   ───────────────────────────────────────────────────────── */
router.post("/logout", (req, res) => {
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });
  res.json({ ok: true });
});

/* ─────────────────────────────────────────────────────────
   GET /api/auth/me
   Fetch active session details
   ───────────────────────────────────────────────────────── */
router.get("/me", async (req, res): Promise<void> => {
  const token = req.cookies?.auth_token;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as { sub: string };
    const users = await db.select().from(usersTable).where(eq(usersTable.id, payload.sub)).limit(1);

    if (!users[0]) {
      res.status(401).json({ error: "User session not found" });
      return;
    }

    res.json({
      id: users[0].id,
      name: users[0].name,
      email: users[0].email,
      role: users[0].role,
      plan: users[0].plan,
    });
  } catch (err) {
    res.clearCookie("auth_token");
    res.status(401).json({ error: "Session expired or invalid" });
  }
});

export default router;
