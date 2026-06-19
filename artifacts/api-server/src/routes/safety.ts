import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  safetyAccountsTable, trustScoresTable, moderationFlagsTable,
  contactExchangeLogsTable, loginEventsTable, parentAccountsTable,
  parentNotificationsTable, platformTimeLogsTable,
} from "@workspace/db";
import {
  attemptsTable, challengesTable, darioSessionsTable,
} from "@workspace/db";
import { eq, desc, and, gte, sql, sum } from "drizzle-orm";
import { classifyMessage } from "../lib/moderation";
import { sendEmail } from "../lib/email";
import crypto from "crypto";

const router: IRouter = Router();

/* ── Build the correct parent dashboard URL for the current environment ── */
function parentDashboardUrl(token: string): string {
  const domain = (process.env["REPLIT_DOMAINS"] ?? "").split(",")[0]?.trim();
  const base = domain ? `https://${domain}` : "https://1waymirror.com";
  return `${base}/parent?token=${token}`;
}

/* ── helpers ── */
function uuid() { return crypto.randomUUID(); }

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
   POST /api/safety/register
   Enhanced student registration — saves safety profile + trust score
   ───────────────────────────────────────────────────────── */
router.post("/register", async (req, res): Promise<void> => {
  const {
    learnerId, email, name, birthdate, grade, graduationYear,
    schoolName, schoolEmail, phone, careerInterests,
    parentName, parentEmail, parentPhone, parentRelationship,
    noParentContact, counselorEmail,
  } = req.body as Record<string, unknown>;

  if (!learnerId || !email || !name) {
    res.status(400).json({ error: "learnerId, email, and name are required" });
    return;
  }

  const studentId = uuid();
  const schoolEmailVerified = typeof schoolEmail === "string"
    ? /\.(edu|k12\.[a-z]{2}|k12)$/i.test(schoolEmail) || /school|district|isd|cusd|usd/i.test(schoolEmail)
    : false;
  const parentVerified = !noParentContact && !!parentEmail;
  const tier = deriveVerificationTier(schoolEmailVerified, parentVerified);
  const supervisedModeUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  const dmEnabledAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  try {
    /* Upsert safety account */
    await db.insert(safetyAccountsTable).values({
      id: studentId,
      learnerId: learnerId as string,
      email: (email as string).toLowerCase().trim(),
      name: name as string,
      birthdate: birthdate as string | undefined,
      grade: grade as number | undefined,
      graduationYear: graduationYear as number | undefined,
      schoolName: schoolName as string | undefined,
      schoolEmail: schoolEmail as string | undefined,
      personalEmail: (email as string).toLowerCase().trim(),
      phone: phone as string | undefined,
      careerInterests: Array.isArray(careerInterests) ? careerInterests as string[] : [],
      verificationTier: tier,
      emailVerified: false,
      schoolEmailVerified,
      noParentContact: !!noParentContact,
      counselorEmail: counselorEmail as string | undefined,
      supervisedModeUntil,
      dmEnabledAt,
    }).onConflictDoNothing();

    /* Create trust score */
    const score = calcTrustScore({
      schoolEmailVerified, parentVerified, phoneVerified: false,
      accountAgeDays: 0, noFlagsBonus: true, tier2Flags: 0, tier3Flags: 0,
      ageConsistencyFailed: false, noParentContact: !!noParentContact,
    });

    await db.insert(trustScoresTable).values({
      studentId,
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
      scoreHistory: [{ score, date: new Date().toISOString(), reason: "initial" }],
    }).onConflictDoNothing();

    /* Create parent account if provided */
    if (parentEmail && !noParentContact) {
      const parentId = uuid();
      const accessToken = crypto.randomBytes(32).toString("hex");
      const tokenExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await db.insert(parentAccountsTable).values({
        id: parentId,
        studentId,
        name: (parentName as string) || "Parent/Guardian",
        email: (parentEmail as string).toLowerCase().trim(),
        phone: parentPhone as string | undefined,
        relationship: (parentRelationship as string) || "parent",
        emailVerified: false,
        accessToken,
        tokenExpiresAt: tokenExpiry,
      }).onConflictDoNothing();

      /* Queue welcome notification + send immediately */
      const welcomeSubject = `Your child ${name} joined 1WayMirror`;
      const dashLink = parentDashboardUrl(accessToken);
      const welcomeBody = `Hi ${parentName || "Parent/Guardian"},\n\n${name} has joined 1WayMirror, a safe AI-powered career exploration platform for high school students.\n\nView their parent safety dashboard:\n${dashLink}\n\nOr go to ${dashLink.split("?")[0]} and paste this access token:\n${accessToken}\n\nYou'll receive alerts automatically if there's anything important to know.\n\n— The 1WayMirror Safety Team`;

      const [notif] = await db.insert(parentNotificationsTable).values({
        parentId,
        studentId,
        type: "welcome",
        subject: welcomeSubject,
        body: welcomeBody,
        metadata: { accessToken, studentName: name, tier },
      }).returning();

      /* Send immediately — fire and forget (don't block registration response) */
      void sendEmail({
        to: (parentEmail as string).toLowerCase().trim(),
        subject: welcomeSubject,
        body: welcomeBody,
      }).then(async ({ sent, error }) => {
        if (notif) {
          await db.update(parentNotificationsTable)
            .set({ sent, sentAt: sent ? new Date() : null, error: error ?? null })
            .where(eq(parentNotificationsTable.id, notif.id));
        }
      });
    }

    res.json({
      ok: true, studentId, verificationTier: tier,
      trustScore: score, trustBadge: trustBadge(score),
      supervisedModeUntil: supervisedModeUntil.toISOString(),
      dmEnabledAt: dmEnabledAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "safety/register failed");
    res.status(500).json({ error: "Registration failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /api/safety/profile/:learnerId
   ───────────────────────────────────────────────────────── */
router.get("/profile/:learnerId", async (req, res): Promise<void> => {
  try {
    const account = await db.select().from(safetyAccountsTable)
      .where(eq(safetyAccountsTable.learnerId, req.params.learnerId))
      .limit(1);

    if (!account[0]) { res.status(404).json({ error: "Not found" }); return; }

    const trust = await db.select().from(trustScoresTable)
      .where(eq(trustScoresTable.studentId, account[0].id))
      .limit(1);

    const parent = await db.select({
      id: parentAccountsTable.id,
      email: parentAccountsTable.email,
      name: parentAccountsTable.name,
      verified: parentAccountsTable.emailVerified,
      messagingPaused: parentAccountsTable.messagingPaused,
    }).from(parentAccountsTable)
      .where(eq(parentAccountsTable.studentId, account[0].id))
      .limit(1);

    res.json({
      ...account[0],
      trustScore: trust[0] ?? null,
      parent: parent[0] ?? null,
    });
  } catch (err) {
    req.log.error({ err }, "safety/profile failed");
    res.status(500).json({ error: "Failed to load profile" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/moderate
   Classify a message — Tier 1-4, log if needed
   ───────────────────────────────────────────────────────── */
router.post("/moderate", async (req, res): Promise<void> => {
  const { message, studentId, context } = req.body as {
    message: string;
    studentId?: string;
    context?: Array<{ role: string; content: string }>;
  };

  if (!message) { res.status(400).json({ error: "message required" }); return; }

  try {
    const result = await classifyMessage(message, context ?? []);

    /* Log contact exchanges */
    if (result.contactExchange && studentId) {
      await db.insert(contactExchangeLogsTable).values({
        senderId: studentId,
        channel: "dario",
        detectedType: result.detectedPatterns.join(", "),
        messageContent: message,
        conversationContext: context ?? [],
        warningSeen: false,
        sentAnyway: false,
      });
    }

    /* Log flags for Tier 2+ */
    if (result.tier >= 2 && studentId) {
      const scoreImpact = result.trustScoreImpact;

      await db.insert(moderationFlagsTable).values({
        studentId,
        tier: result.tier,
        category: result.category,
        messageContent: message.slice(0, 500),
        aiReasoning: result.reasoning,
        context: { patterns: result.detectedPatterns },
        status: result.tier >= 3 ? "open" : "auto_warned",
        trustScoreImpact: scoreImpact,
      });

      /* Update trust score */
      const existing = await db.select().from(trustScoresTable)
        .where(eq(trustScoresTable.studentId, studentId)).limit(1);

      if (existing[0]) {
        const newScore = Math.max(0, existing[0].score + scoreImpact);
        const newT2 = result.tier === 2 ? existing[0].tier2Flags + 1 : existing[0].tier2Flags;
        const newT3 = result.tier === 3 ? existing[0].tier3Flags + 1 : existing[0].tier3Flags;
        const history = (existing[0].scoreHistory as { score: number; date: string; reason: string }[]);
        history.push({ score: newScore, date: new Date().toISOString(), reason: `Tier ${result.tier} flag` });

        await db.update(trustScoresTable)
          .set({
            score: newScore,
            tier2Flags: newT2,
            tier3Flags: newT3,
            badge: trustBadge(newScore),
            scoreHistory: history.slice(-50),
            updatedAt: new Date(),
          })
          .where(eq(trustScoresTable.studentId, studentId));
      }

      /* For Tier 3+ flags, notify parent immediately */
      if (result.tier >= 3) {
        const parent = await db.select().from(parentAccountsTable)
          .where(eq(parentAccountsTable.studentId, studentId)).limit(1);

        if (parent[0] && !parent[0].messagingPaused) {
          const account = await db.select({ name: safetyAccountsTable.name })
            .from(safetyAccountsTable).where(eq(safetyAccountsTable.id, studentId)).limit(1);

          const studentName = account[0]?.name ?? "Your student";
          const tierLabel = result.tier === 4 ? "URGENT Safety Alert" : "Safety Alert";
          const alertSubject = `1WayMirror ${tierLabel}: Content flagged for ${studentName}`;
          const dashboardUrl = parentDashboardUrl(parent[0].accessToken ?? "");
          const alertBody = `Hi ${parent[0].name},\n\nOur safety system detected ${result.tier === 4 ? "a serious concern" : "potentially concerning content"} in ${studentName}'s activity on 1WayMirror.\n\nCategory: ${result.category}\nSeverity: Tier ${result.tier} of 4${result.tier === 4 ? " (CRITICAL)" : ""}\nDetails: ${result.reasoning}\n\n${result.tier === 4 ? "This has been immediately escalated to our safety team who will review within 30 minutes.\n\n" : ""}View your parent dashboard:\n${dashboardUrl}\n\nOr paste this token at ${dashboardUrl.split("?")[0]}:\n${parent[0].accessToken ?? ""}\n\nIf you have concerns, reply to this email — our safety team responds within 1 hour.\n\n— 1WayMirror Safety Team`;

          const [notif] = await db.insert(parentNotificationsTable).values({
            parentId: parent[0].id,
            studentId,
            type: result.tier === 4 ? "tier4_alert" : "safety_flag",
            subject: alertSubject,
            body: alertBody,
            metadata: { tier: result.tier, category: result.category, reasoning: result.reasoning },
          }).returning();

          void sendEmail({ to: parent[0].email, subject: alertSubject, body: alertBody })
            .then(async ({ sent, error }) => {
              if (notif) {
                await db.update(parentNotificationsTable)
                  .set({ sent, sentAt: sent ? new Date() : null, error: error ?? null })
                  .where(eq(parentNotificationsTable.id, notif.id));
              }
            });
        }
      }
    }

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "safety/moderate failed");
    res.status(500).json({ error: "Moderation failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/contact-exchange-ack
   Record user acknowledged warning (sent anyway)
   ───────────────────────────────────────────────────────── */
router.post("/contact-exchange-ack", async (req, res): Promise<void> => {
  const { studentId, message, sentAnyway } = req.body as {
    studentId: string; message: string; sentAnyway: boolean;
  };

  try {
    await db.insert(contactExchangeLogsTable).values({
      senderId: studentId || "anonymous",
      channel: "dario",
      detectedType: "user_acknowledged",
      messageContent: message?.slice(0, 500) ?? "",
      conversationContext: [],
      warningSeen: true,
      sentAnyway: !!sentAnyway,
    });

    /* Queue parent notification + send immediately if they sent anyway */
    if (sentAnyway && studentId) {
      const parent = await db.select().from(parentAccountsTable)
        .where(eq(parentAccountsTable.studentId, studentId)).limit(1);

      if (parent[0] && !parent[0].messagingPaused) {
        const account = await db.select({ name: safetyAccountsTable.name }).from(safetyAccountsTable)
          .where(eq(safetyAccountsTable.id, studentId)).limit(1);

        const studentName = account[0]?.name ?? "Your student";
        const alertSubject = `1WayMirror Safety Alert: ${studentName} shared contact info`;
        const dashboardUrl = parentDashboardUrl(parent[0].accessToken ?? "");
        const alertBody = `Hi ${parent[0].name},\n\n${studentName} shared what appears to be contact information in a conversation on 1WayMirror.\n\nMessage (excerpt):\n"${message?.slice(0, 200) ?? "(unavailable)"}"\n\nThis has been automatically logged. If anything looks concerning, reply to this email and our safety team will review within 1 hour.\n\nView your parent dashboard:\n${dashboardUrl}\n\nOr paste this token at ${dashboardUrl.split("?")[0]}:\n${parent[0].accessToken ?? ""}\n\n— 1WayMirror Safety Team`;

        const [notif] = await db.insert(parentNotificationsTable).values({
          parentId: parent[0].id,
          studentId,
          type: "contact_exchange",
          subject: alertSubject,
          body: alertBody,
          metadata: { messagePreview: message?.slice(0, 200), type: "contact_exchange" },
        }).returning();

        void sendEmail({
          to: parent[0].email,
          subject: alertSubject,
          body: alertBody,
        }).then(async ({ sent, error }) => {
          if (notif) {
            await db.update(parentNotificationsTable)
              .set({ sent, sentAt: sent ? new Date() : null, error: error ?? null })
              .where(eq(parentNotificationsTable.id, notif.id));
          }
        });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "contact-exchange-ack failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /api/safety/flags   (admin)
   ───────────────────────────────────────────────────────── */
router.get("/flags", async (req, res): Promise<void> => {
  const pin = req.headers["x-admin-pin"];
  const stored = process.env["ADMIN_PIN"] ?? "1WAY2026";
  if (pin !== stored) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const flags = await db.select().from(moderationFlagsTable)
      .orderBy(desc(moderationFlagsTable.tier), desc(moderationFlagsTable.createdAt))
      .limit(200);

    /* Enrich with student info */
    const enriched = await Promise.all(flags.map(async (f) => {
      const account = await db.select({
        name: safetyAccountsTable.name, email: safetyAccountsTable.email,
        grade: safetyAccountsTable.grade, schoolName: safetyAccountsTable.schoolName,
      }).from(safetyAccountsTable).where(eq(safetyAccountsTable.id, f.studentId)).limit(1);
      return { ...f, student: account[0] ?? null };
    }));

    const summary = {
      total: flags.length,
      open: flags.filter(f => f.status === "open").length,
      tier4: flags.filter(f => f.tier === 4).length,
      tier3: flags.filter(f => f.tier === 3).length,
      tier2: flags.filter(f => f.tier === 2).length,
    };

    res.json({ flags: enriched, summary });
  } catch (err) {
    req.log.error({ err }, "safety/flags failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   PATCH /api/safety/flags/:id   (admin — resolve/escalate)
   ───────────────────────────────────────────────────────── */
router.patch("/flags/:id", async (req, res): Promise<void> => {
  const pin = req.headers["x-admin-pin"];
  const stored = process.env["ADMIN_PIN"] ?? "1WAY2026";
  if (pin !== stored) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { status, resolution, reviewedBy } = req.body as {
    status: string; resolution?: string; reviewedBy?: string;
  };

  try {
    await db.update(moderationFlagsTable)
      .set({ status, resolution, reviewedBy, reviewedAt: new Date() })
      .where(eq(moderationFlagsTable.id, Number(req.params.id)));
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "safety/flags PATCH failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /api/safety/trust/:studentId   (get trust score)
   ───────────────────────────────────────────────────────── */
router.get("/trust/:studentId", async (req, res): Promise<void> => {
  try {
    const trust = await db.select().from(trustScoresTable)
      .where(eq(trustScoresTable.studentId, req.params.studentId)).limit(1);
    if (!trust[0]) { res.status(404).json({ error: "Not found" }); return; }
    res.json(trust[0]);
  } catch (err) {
    req.log.error({ err }, "safety/trust GET failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /api/safety/stats   (admin dashboard stats)
   ───────────────────────────────────────────────────────── */
router.get("/stats", async (req, res): Promise<void> => {
  const pin = req.headers["x-admin-pin"];
  const stored = process.env["ADMIN_PIN"] ?? "1WAY2026";
  if (pin !== stored) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [totalStudents] = await db.select({ count: sql<number>`count(*)` }).from(safetyAccountsTable);
    const [tierC] = await db.select({ count: sql<number>`count(*)` }).from(safetyAccountsTable)
      .where(eq(safetyAccountsTable.verificationTier, "C"));
    const [tierA] = await db.select({ count: sql<number>`count(*)` }).from(safetyAccountsTable)
      .where(eq(safetyAccountsTable.verificationTier, "A"));
    const [openFlags] = await db.select({ count: sql<number>`count(*)` }).from(moderationFlagsTable)
      .where(eq(moderationFlagsTable.status, "open"));
    const [tier3Plus] = await db.select({ count: sql<number>`count(*)` }).from(moderationFlagsTable)
      .where(and(gte(moderationFlagsTable.tier, 3), eq(moderationFlagsTable.status, "open")));
    const [contactExchanges] = await db.select({ count: sql<number>`count(*)` }).from(contactExchangeLogsTable);
    const [pendingEmails] = await db.select({ count: sql<number>`count(*)` }).from(parentNotificationsTable)
      .where(eq(parentNotificationsTable.sent, false));

    res.json({
      totalStudents: Number(totalStudents?.count ?? 0),
      tierAStudents: Number(tierA?.count ?? 0),
      tierCStudents: Number(tierC?.count ?? 0),
      openFlags: Number(openFlags?.count ?? 0),
      criticalFlags: Number(tier3Plus?.count ?? 0),
      contactExchanges: Number(contactExchanges?.count ?? 0),
      pendingParentEmails: Number(pendingEmails?.count ?? 0),
    });
  } catch (err) {
    req.log.error({ err }, "safety/stats failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   GET /api/safety/parent-dashboard
   Parent read-only view via access token
   ───────────────────────────────────────────────────────── */
router.get("/parent-dashboard", async (req, res): Promise<void> => {
  const token = req.query["token"] as string;
  if (!token) { res.status(401).json({ error: "Token required" }); return; }

  try {
    const parent = await db.select().from(parentAccountsTable)
      .where(eq(parentAccountsTable.accessToken, token)).limit(1);

    if (!parent[0]) { res.status(401).json({ error: "Invalid or expired token" }); return; }
    if (parent[0].tokenExpiresAt && new Date() > parent[0].tokenExpiresAt) {
      res.status(401).json({ error: "Token expired — please request a new login link" }); return;
    }

    const studentId = parent[0].studentId;

    const account = await db.select().from(safetyAccountsTable)
      .where(eq(safetyAccountsTable.id, studentId)).limit(1);

    const trust = await db.select().from(trustScoresTable)
      .where(eq(trustScoresTable.studentId, studentId)).limit(1);

    const flags = await db.select().from(moderationFlagsTable)
      .where(eq(moderationFlagsTable.studentId, studentId))
      .orderBy(desc(moderationFlagsTable.createdAt)).limit(50);

    const contacts = await db.select().from(contactExchangeLogsTable)
      .where(eq(contactExchangeLogsTable.senderId, studentId))
      .orderBy(desc(contactExchangeLogsTable.createdAt)).limit(20);

    const logins = await db.select().from(loginEventsTable)
      .where(eq(loginEventsTable.studentId, studentId))
      .orderBy(desc(loginEventsTable.createdAt)).limit(30);

    const notifications = await db.select().from(parentNotificationsTable)
      .where(eq(parentNotificationsTable.parentId, parent[0].id))
      .orderBy(desc(parentNotificationsTable.createdAt)).limit(30);

    /* ── Activity time (from heartbeat logs) ── */
    const learnerId = account[0]?.learnerId ?? "";
    const today = new Date().toISOString().slice(0, 10);
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const timeLogs = await db.select().from(platformTimeLogsTable)
      .where(eq(platformTimeLogsTable.studentId, learnerId));

    const todayMinutes = timeLogs.find(t => t.sessionDate === today)?.minutesActive ?? 0;
    const weekMinutes = timeLogs.filter(t => t.sessionDate >= weekAgo)
      .reduce((a, t) => a + t.minutesActive, 0);
    const totalMinutes = timeLogs.reduce((a, t) => a + t.minutesActive, 0);

    /* ── Dario sessions (from server log-activity calls) ── */
    const darioSessions = learnerId
      ? await db.select({
          sessionId: darioSessionsTable.sessionId,
          sessionTitle: darioSessionsTable.sessionTitle,
          messageCount: darioSessionsTable.messageCount,
          careersDiscussed: darioSessionsTable.careersDiscussed,
          conversationExcerpt: darioSessionsTable.conversationExcerpt,
          sessionStartedAt: darioSessionsTable.sessionStartedAt,
          sessionEndedAt: darioSessionsTable.sessionEndedAt,
          loggedAt: darioSessionsTable.loggedAt,
        }).from(darioSessionsTable)
          .where(eq(darioSessionsTable.userId, learnerId))
          .orderBy(desc(darioSessionsTable.loggedAt)).limit(20)
      : [];

    /* ── Quiz results (from attempts + challenges) ── */
    const attempts = learnerId
      ? await db.select({
          topic: challengesTable.topic,
          category: challengesTable.category,
          simulationSlug: challengesTable.simulationSlug,
          correct: attemptsTable.correct,
          xpAwarded: attemptsTable.xpAwarded,
          attemptedAt: attemptsTable.attemptedAt,
        }).from(attemptsTable)
          .innerJoin(challengesTable, eq(attemptsTable.challengeId, challengesTable.id))
          .where(eq(attemptsTable.learnerId, learnerId))
          .orderBy(desc(attemptsTable.attemptedAt)).limit(200)
      : [];

    const categoryMap = new Map<string, { attempted: number; correct: number }>();
    for (const a of attempts) {
      const c = categoryMap.get(a.category) ?? { attempted: 0, correct: 0 };
      c.attempted += 1;
      if (a.correct) c.correct += 1;
      categoryMap.set(a.category, c);
    }

    const quizResults = {
      totalAttempted: attempts.length,
      totalCorrect: attempts.filter(a => a.correct).length,
      byCategory: Array.from(categoryMap.entries()).map(([category, v]) => ({ category, ...v })),
      recentAttempts: attempts.slice(0, 30).map(a => ({
        topic: a.topic,
        category: a.category,
        simulationSlug: a.simulationSlug,
        correct: a.correct,
        xpAwarded: a.xpAwarded,
        attemptedAt: a.attemptedAt.toISOString(),
      })),
    };

    res.json({
      parent: { name: parent[0].name, email: parent[0].email, messagingPaused: parent[0].messagingPaused },
      student: account[0] ?? null,
      trust: trust[0] ?? null,
      flags,
      contactExchanges: contacts,
      loginHistory: logins,
      notifications,
      activityTime: { todayMinutes, weekMinutes, totalMinutes },
      darioSessions,
      quizResults,
    });
  } catch (err) {
    req.log.error({ err }, "parent-dashboard failed");
    res.status(500).json({ error: "Failed to load dashboard" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/parent/pause-messaging
   Parent quick-action from email
   ───────────────────────────────────────────────────────── */
router.post("/parent/pause-messaging", async (req, res): Promise<void> => {
  const { token, hours = 24 } = req.body as { token: string; hours?: number };
  if (!token) { res.status(400).json({ error: "Token required" }); return; }

  try {
    const parent = await db.select().from(parentAccountsTable)
      .where(eq(parentAccountsTable.accessToken, token)).limit(1);

    if (!parent[0]) { res.status(401).json({ error: "Invalid token" }); return; }

    const pauseUntil = new Date(Date.now() + hours * 60 * 60 * 1000);
    await db.update(parentAccountsTable)
      .set({ messagingPaused: true, messagingPausedUntil: pauseUntil })
      .where(eq(parentAccountsTable.id, parent[0].id));

    res.json({ ok: true, pausedUntil: pauseUntil.toISOString() });
  } catch (err) {
    req.log.error({ err }, "pause-messaging failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/login-event   (record a login)
   ───────────────────────────────────────────────────────── */
router.post("/login-event", async (req, res): Promise<void> => {
  const { studentId, userAgent } = req.body as { studentId: string; userAgent?: string };
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress ?? "unknown";

  try {
    await db.insert(loginEventsTable).values({
      studentId,
      ipAddress: ip,
      country: "US",
      region: "unknown",
      city: "unknown",
      vpnDetected: false,
      suspicious: false,
      userAgent: userAgent as string | undefined,
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "login-event failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/heartbeat   (record 1 min of active time)
   ───────────────────────────────────────────────────────── */
router.post("/heartbeat", async (req, res): Promise<void> => {
  const { studentId } = req.body as { studentId?: string };
  if (!studentId) { res.status(400).json({ error: "studentId required" }); return; }

  const today = new Date().toISOString().slice(0, 10);
  try {
    await db.insert(platformTimeLogsTable).values({
      studentId,
      sessionDate: today,
      minutesActive: 1,
      lastPing: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: [platformTimeLogsTable.studentId, platformTimeLogsTable.sessionDate],
      set: {
        minutesActive: sql`${platformTimeLogsTable.minutesActive} + 1`,
        lastPing: new Date(),
        updatedAt: new Date(),
      },
    });
    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "heartbeat failed");
    res.status(500).json({ error: "Failed" });
  }
});

/* ─────────────────────────────────────────────────────────
   POST /api/safety/notifications/flush   (admin)
   Send all unsent queued parent notifications
   ───────────────────────────────────────────────────────── */
router.post("/notifications/flush", async (req, res): Promise<void> => {
  const pin = req.headers["x-admin-pin"];
  const stored = process.env["ADMIN_PIN"] ?? "1WAY2026";
  if (pin !== stored) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const pending = await db.select({
      id: parentNotificationsTable.id,
      subject: parentNotificationsTable.subject,
      body: parentNotificationsTable.body,
      parentId: parentNotificationsTable.parentId,
    }).from(parentNotificationsTable)
      .where(eq(parentNotificationsTable.sent, false))
      .limit(50);

    if (pending.length === 0) {
      res.json({ ok: true, sent: 0, failed: 0 });
      return;
    }

    /* Enrich with parent email */
    const results = await Promise.allSettled(
      pending.map(async (notif) => {
        const parent = await db.select({ email: parentAccountsTable.email })
          .from(parentAccountsTable)
          .where(eq(parentAccountsTable.id, notif.parentId))
          .limit(1);

        if (!parent[0]) {
          await db.update(parentNotificationsTable)
            .set({ error: "Parent not found" })
            .where(eq(parentNotificationsTable.id, notif.id));
          return { sent: false };
        }

        const { sent, error } = await sendEmail({
          to: parent[0].email,
          subject: notif.subject,
          body: notif.body,
        });

        await db.update(parentNotificationsTable)
          .set({ sent, sentAt: sent ? new Date() : null, error: error ?? null })
          .where(eq(parentNotificationsTable.id, notif.id));

        return { sent };
      })
    );

    const sentCount = results.filter(r => r.status === "fulfilled" && r.value.sent).length;
    const failedCount = results.length - sentCount;

    req.log.info({ sent: sentCount, failed: failedCount }, "Notification flush complete");
    res.json({ ok: true, sent: sentCount, failed: failedCount, total: pending.length });
  } catch (err) {
    req.log.error({ err }, "notifications/flush failed");
    res.status(500).json({ error: "Flush failed" });
  }
});

export default router;
