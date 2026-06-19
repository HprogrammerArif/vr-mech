import { pgTable, text, integer, boolean, timestamp, jsonb, serial, uniqueIndex } from "drizzle-orm/pg-core";

/* ─── Safety Accounts (extended student profiles) ─── */
export const safetyAccountsTable = pgTable("safety_accounts", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  birthdate: text("birthdate"),
  grade: integer("grade"),
  graduationYear: integer("graduation_year"),
  schoolName: text("school_name"),
  schoolEmail: text("school_email"),
  personalEmail: text("personal_email"),
  phone: text("phone"),
  careerInterests: text("career_interests").array(),
  verificationTier: text("verification_tier").notNull().default("C"),
  emailVerified: boolean("email_verified").notNull().default(false),
  schoolEmailVerified: boolean("school_email_verified").notNull().default(false),
  noParentContact: boolean("no_parent_contact").notNull().default(false),
  counselorEmail: text("counselor_email"),
  supervisedModeUntil: timestamp("supervised_mode_until", { withTimezone: true }),
  dmEnabledAt: timestamp("dm_enabled_at", { withTimezone: true }),
  ageConsistencyFlags: integer("age_consistency_flags").notNull().default(0),
  lastAgeCheck: timestamp("last_age_check", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type SafetyAccount = typeof safetyAccountsTable.$inferSelect;
export type InsertSafetyAccount = typeof safetyAccountsTable.$inferInsert;

/* ─── Parent Accounts ─── */
export const parentAccountsTable = pgTable("parent_accounts", {
  id: text("id").primaryKey(),
  studentId: text("student_id").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  relationship: text("relationship").notNull().default("parent"),
  emailVerified: boolean("email_verified").notNull().default(false),
  accessToken: text("access_token"),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  messagingPaused: boolean("messaging_paused").notNull().default(false),
  messagingPausedUntil: timestamp("messaging_paused_until", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ParentAccount = typeof parentAccountsTable.$inferSelect;
export type InsertParentAccount = typeof parentAccountsTable.$inferInsert;

/* ─── Trust Scores ─── */
export const trustScoresTable = pgTable("trust_scores", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull().unique(),
  score: integer("score").notNull().default(25),
  tier: text("tier").notNull().default("C"),
  schoolEmailVerified: boolean("school_email_verified").notNull().default(false),
  parentVerified: boolean("parent_verified").notNull().default(false),
  phoneVerified: boolean("phone_verified").notNull().default(false),
  accountAgeDays: integer("account_age_days").notNull().default(0),
  noFlagsBonus: boolean("no_flags_bonus").notNull().default(false),
  tier2Flags: integer("tier2_flags").notNull().default(0),
  tier3Flags: integer("tier3_flags").notNull().default(0),
  ageConsistencyFailed: boolean("age_consistency_failed").notNull().default(false),
  badge: text("badge").notNull().default("new"),
  scoreHistory: jsonb("score_history").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type TrustScore = typeof trustScoresTable.$inferSelect;
export type InsertTrustScore = typeof trustScoresTable.$inferInsert;

/* ─── Moderation Flags ─── */
export const moderationFlagsTable = pgTable("moderation_flags", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  tier: integer("tier").notNull(),
  category: text("category").notNull(),
  messageContent: text("message_content"),
  aiReasoning: text("ai_reasoning"),
  context: jsonb("context").notNull().default({}),
  status: text("status").notNull().default("open"),
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  resolution: text("resolution"),
  trustScoreImpact: integer("trust_score_impact").notNull().default(0),
  parentNotified: boolean("parent_notified").notNull().default(false),
  parentNotifiedAt: timestamp("parent_notified_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ModerationFlag = typeof moderationFlagsTable.$inferSelect;
export type InsertModerationFlag = typeof moderationFlagsTable.$inferInsert;

/* ─── Contact Exchange Logs ─── */
export const contactExchangeLogsTable = pgTable("contact_exchange_logs", {
  id: serial("id").primaryKey(),
  senderId: text("sender_id").notNull(),
  recipientId: text("recipient_id"),
  channel: text("channel").notNull().default("dario"),
  detectedType: text("detected_type").notNull(),
  messageContent: text("message_content").notNull(),
  conversationContext: jsonb("conversation_context").notNull().default([]),
  warningSeen: boolean("warning_seen").notNull().default(false),
  sentAnyway: boolean("sent_anyway").notNull().default(false),
  parentNotified: boolean("parent_notified").notNull().default(false),
  flagCreated: boolean("flag_created").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ContactExchangeLog = typeof contactExchangeLogsTable.$inferSelect;
export type InsertContactExchangeLog = typeof contactExchangeLogsTable.$inferInsert;

/* ─── Login Events ─── */
export const loginEventsTable = pgTable("login_events", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  ipAddress: text("ip_address"),
  country: text("country"),
  region: text("region"),
  city: text("city"),
  vpnDetected: boolean("vpn_detected").notNull().default(false),
  suspicious: boolean("suspicious").notNull().default(false),
  flagReason: text("flag_reason"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type LoginEvent = typeof loginEventsTable.$inferSelect;
export type InsertLoginEvent = typeof loginEventsTable.$inferInsert;

/* ─── Parent Notifications Queue ─── */
export const parentNotificationsTable = pgTable("parent_notifications", {
  id: serial("id").primaryKey(),
  parentId: text("parent_id").notNull(),
  studentId: text("student_id").notNull(),
  type: text("type").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  metadata: jsonb("metadata").notNull().default({}),
  sent: boolean("sent").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  emailProvider: text("email_provider"),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type ParentNotification = typeof parentNotificationsTable.$inferSelect;
export type InsertParentNotification = typeof parentNotificationsTable.$inferInsert;

/* ─── Platform Time Logs (heartbeat-based activity tracking) ─── */
export const platformTimeLogsTable = pgTable("platform_time_logs", {
  id: serial("id").primaryKey(),
  studentId: text("student_id").notNull(),
  sessionDate: text("session_date").notNull(),
  minutesActive: integer("minutes_active").notNull().default(0),
  lastPing: timestamp("last_ping", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => [uniqueIndex("platform_time_unique_idx").on(t.studentId, t.sessionDate)]);

export type PlatformTimeLog = typeof platformTimeLogsTable.$inferSelect;
export type InsertPlatformTimeLog = typeof platformTimeLogsTable.$inferInsert;
