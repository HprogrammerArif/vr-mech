import { eq } from "drizzle-orm";
import { db, learnersTable, type Learner } from "@workspace/db";

export const XP_PER_LEVEL = 250;

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
}

export function nextLevelXp(level: number): number {
  return level * XP_PER_LEVEL;
}

export function xpForResult(difficulty: number, correct: boolean): number {
  if (!correct) return Math.max(2, Math.floor(difficulty * 1.5));
  return 10 + difficulty * 8;
}

export async function getOrCreateLearner(learnerId: string): Promise<Learner> {
  const [existing] = await db
    .select()
    .from(learnersTable)
    .where(eq(learnersTable.id, learnerId));
  if (existing) return existing;
  const [created] = await db
    .insert(learnersTable)
    .values({ id: learnerId })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const [reread] = await db
    .select()
    .from(learnersTable)
    .where(eq(learnersTable.id, learnerId));
  if (!reread) throw new Error("Failed to create learner");
  return reread;
}

export function recommendedDifficulty(learner: Learner): number {
  const accuracy =
    learner.challengesCompleted === 0
      ? 0.6
      : learner.challengesCorrect / learner.challengesCompleted;
  const base = 1 + Math.floor((learner.level - 1) * 0.8);
  let target = base;
  if (accuracy > 0.85) target += 1;
  if (accuracy < 0.45) target -= 1;
  if (learner.streak >= 5) target += 1;
  return Math.min(10, Math.max(1, target));
}
