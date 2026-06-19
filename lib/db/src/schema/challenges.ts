import { pgTable, text, integer, timestamp, jsonb } from "drizzle-orm/pg-core";

export type StoredChoice = { id: string; text: string; rationale?: string | null };
export type StoredScene = { environment: string; params: Record<string, unknown> };

export const challengesTable = pgTable("challenges", {
  id: text("id").primaryKey(),
  learnerId: text("learner_id").notNull(),
  simulationSlug: text("simulation_slug").notNull(),
  category: text("category").notNull().default("engineering"),
  topic: text("topic").notNull(),
  difficulty: integer("difficulty").notNull(),
  title: text("title").notNull(),
  roleIntro: text("role_intro").notNull().default(""),
  scenario: text("scenario").notNull(),
  problem: text("problem").notNull().default(""),
  constraints: jsonb("constraints").$type<string[]>().notNull().default([]),
  question: text("question").notNull(),
  units: text("units"),
  choices: jsonb("choices").$type<StoredChoice[]>().notNull(),
  scene: jsonb("scene").$type<StoredScene>().notNull(),
  correctChoiceId: text("correct_choice_id").notNull(),
  explanation: text("explanation").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export type Challenge = typeof challengesTable.$inferSelect;
export type InsertChallenge = typeof challengesTable.$inferInsert;
