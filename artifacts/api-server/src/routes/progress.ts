import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, attemptsTable, challengesTable } from "@workspace/db";
import {
  GetProgressQueryParams,
  GetProgressResponse,
  GetRecentMissionsQueryParams,
  GetRecentMissionsResponseItem,
} from "@workspace/api-zod";
import { getOrCreateLearner, nextLevelXp } from "../lib/progress";

const router: IRouter = Router();

const ALL_CATEGORIES = [
  "engineering",
  "business",
  "healthcare",
  "trades",
  "technology",
  "law",
] as const;

router.get("/progress", async (req, res): Promise<void> => {
  const query = GetProgressQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const learner = await getOrCreateLearner(query.data.learnerId);

  const rows = await db
    .select({
      topic: challengesTable.topic,
      category: challengesTable.category,
      correct: attemptsTable.correct,
    })
    .from(attemptsTable)
    .innerJoin(challengesTable, eq(attemptsTable.challengeId, challengesTable.id))
    .where(eq(attemptsTable.learnerId, learner.id));

  const correctByTopic = new Map<string, number>();
  const byCategory = new Map<string, { attempted: number; correct: number }>();
  for (const cat of ALL_CATEGORIES) byCategory.set(cat, { attempted: 0, correct: 0 });

  for (const row of rows) {
    if (row.correct)
      correctByTopic.set(row.topic, (correctByTopic.get(row.topic) ?? 0) + 1);
    const c = byCategory.get(row.category) ?? { attempted: 0, correct: 0 };
    c.attempted += 1;
    if (row.correct) c.correct += 1;
    byCategory.set(row.category, c);
  }

  const topicsMastered = Array.from(correctByTopic.entries())
    .filter(([, c]) => c >= 3)
    .map(([t]) => t);

  const accuracy =
    learner.challengesCompleted === 0
      ? 0
      : learner.challengesCorrect / learner.challengesCompleted;

  res.json(
    GetProgressResponse.parse({
      learnerId: learner.id,
      totalXp: learner.totalXp,
      level: learner.level,
      streak: learner.streak,
      bestStreak: learner.bestStreak,
      missionsCompleted: learner.challengesCompleted,
      missionsCorrect: learner.challengesCorrect,
      accuracy,
      topicsMastered,
      nextLevelXp: nextLevelXp(learner.level),
      categoryProgress: ALL_CATEGORIES.map((category) => ({
        category,
        attempted: byCategory.get(category)?.attempted ?? 0,
        correct: byCategory.get(category)?.correct ?? 0,
      })),
    }),
  );
});

router.get("/progress/recent", async (req, res): Promise<void> => {
  const query = GetRecentMissionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const rows = await db
    .select({
      id: attemptsTable.id,
      challengeId: attemptsTable.challengeId,
      title: challengesTable.title,
      topic: challengesTable.topic,
      simulationSlug: challengesTable.simulationSlug,
      category: challengesTable.category,
      difficulty: challengesTable.difficulty,
      correct: attemptsTable.correct,
      xpAwarded: attemptsTable.xpAwarded,
      attemptedAt: attemptsTable.attemptedAt,
    })
    .from(attemptsTable)
    .innerJoin(challengesTable, eq(attemptsTable.challengeId, challengesTable.id))
    .where(eq(attemptsTable.learnerId, query.data.learnerId))
    .orderBy(desc(attemptsTable.attemptedAt))
    .limit(20);

  res.json(
    rows.map((r) =>
      GetRecentMissionsResponseItem.parse({
        id: String(r.id),
        missionId: r.challengeId,
        title: r.title,
        topic: r.topic,
        simulationSlug: r.simulationSlug,
        category: r.category,
        difficulty: r.difficulty,
        correct: r.correct,
        xpAwarded: r.xpAwarded,
        attemptedAt: r.attemptedAt.toISOString(),
      }),
    ),
  );
});

export default router;
