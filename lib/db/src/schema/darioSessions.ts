import { pgTable, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export const darioSessionsTable = pgTable("dario_sessions", {
  sessionId:             text("session_id").primaryKey(),
  userId:                text("user_id").notNull(),
  userName:              text("user_name").notNull().default("Unknown"),
  userEmail:             text("user_email").notNull().default(""),
  sessionTitle:          text("session_title").notNull().default("Career Session"),
  school:                text("school").default(""),
  graduationYear:        integer("graduation_year"),
  gpa:                   text("gpa").default(""),
  sat:                   text("sat").default(""),
  careerInterest:        text("career_interest").default(""),
  careersDiscussed:      jsonb("careers_discussed").notNull().default([]),
  messageCount:          integer("message_count").notNull().default(0),
  conversationExcerpt:   jsonb("conversation_excerpt").notNull().default([]),
  opportunitiesSearched: jsonb("opportunities_searched").notNull().default([]),
  actionItemCount:       integer("action_item_count").notNull().default(0),
  roadmapMilestoneCount: integer("roadmap_milestone_count").notNull().default(0),
  totalSessionsCount:    integer("total_sessions_count").notNull().default(1),
  allCareersEver:        jsonb("all_careers_ever").notNull().default([]),
  personalityGenerated:  boolean("personality_generated").notNull().default(false),
  reportGenerated:       boolean("report_generated").notNull().default(false),
  sessionStartedAt:      text("session_started_at").default(""),
  sessionEndedAt:        text("session_ended_at").default(""),
  loggedAt:              timestamp("logged_at", { withTimezone: true }).defaultNow().notNull(),
});

export type DarioSessionLog    = typeof darioSessionsTable.$inferSelect;
export type InsertDarioSession = typeof darioSessionsTable.$inferInsert;
