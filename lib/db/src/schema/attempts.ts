import {
  pgTable,
  text,
  integer,
  timestamp,
  boolean,
  serial,
} from "drizzle-orm/pg-core";

export const attemptsTable = pgTable("attempts", {
  id: serial("id").primaryKey(),
  challengeId: text("challenge_id").notNull(),
  learnerId: text("learner_id").notNull(),
  choiceId: text("choice_id").notNull(),
  correct: boolean("correct").notNull(),
  xpAwarded: integer("xp_awarded").notNull(),
  attemptedAt: timestamp("attempted_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Attempt = typeof attemptsTable.$inferSelect;
export type InsertAttempt = typeof attemptsTable.$inferInsert;
