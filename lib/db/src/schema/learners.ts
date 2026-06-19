import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

export const learnersTable = pgTable("learners", {
  id: text("id").primaryKey(),
  totalXp: integer("total_xp").notNull().default(0),
  level: integer("level").notNull().default(1),
  streak: integer("streak").notNull().default(0),
  bestStreak: integer("best_streak").notNull().default(0),
  challengesCompleted: integer("challenges_completed").notNull().default(0),
  challengesCorrect: integer("challenges_correct").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Learner = typeof learnersTable.$inferSelect;
export type InsertLearner = typeof learnersTable.$inferInsert;
