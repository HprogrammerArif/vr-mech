import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import {
  db,
  challengesTable,
  attemptsTable,
  learnersTable,
} from "@workspace/db";
import {
  GenerateNextMissionBody,
  GenerateNextMissionResponse,
  SubmitMissionParams,
  SubmitMissionBody,
  SubmitMissionResponse,
  GetMissionHintParams,
  GetMissionHintResponse,
} from "@workspace/api-zod";
import { getSimulation } from "../lib/simulations";
import {
  generateMission,
  generateEncouragement,
  generateHint,
} from "../lib/aiChallenge";
import {
  getOrCreateLearner,
  levelFromXp,
  recommendedDifficulty,
  xpForResult,
} from "../lib/progress";

const router: IRouter = Router();

router.post("/missions/next", async (req, res): Promise<void> => {
  const parsed = GenerateNextMissionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sim = getSimulation(parsed.data.simulationSlug);
  if (!sim || !sim.available) {
    res.status(404).json({ error: "Simulation not available" });
    return;
  }

  const learner = await getOrCreateLearner(parsed.data.learnerId);
  const targetDifficulty =
    parsed.data.targetDifficulty ?? recommendedDifficulty(learner);

  req.log.info(
    { learnerId: learner.id, targetDifficulty, slug: sim.slug, category: sim.category },
    "Generating mission",
  );

  const generated = await generateMission({
    simulation: sim,
    difficulty: targetDifficulty,
    avoidTopics: parsed.data.avoidTopics ?? [],
  });

  const id = randomUUID();
  const [stored] = await db
    .insert(challengesTable)
    .values({
      id,
      learnerId: learner.id,
      simulationSlug: sim.slug,
      category: sim.category,
      topic: generated.topic,
      difficulty: targetDifficulty,
      title: generated.title,
      roleIntro: generated.roleIntro,
      scenario: generated.scenario,
      problem: generated.problem,
      constraints: generated.constraints,
      question: generated.question,
      units: generated.units,
      choices: generated.choices,
      scene: generated.scene,
      correctChoiceId: generated.correctChoiceId,
      explanation: generated.explanation,
    })
    .returning();

  res.json(
    GenerateNextMissionResponse.parse({
      id: stored.id,
      simulationSlug: stored.simulationSlug,
      category: stored.category,
      topic: stored.topic,
      difficulty: stored.difficulty,
      title: stored.title,
      roleIntro: stored.roleIntro,
      scenario: stored.scenario,
      problem: stored.problem,
      constraints: stored.constraints,
      question: stored.question,
      choices: stored.choices,
      scene: stored.scene,
      createdAt: stored.createdAt.toISOString(),
    }),
  );
});

router.post("/missions/:id/submit", async (req, res): Promise<void> => {
  const params = SubmitMissionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = SubmitMissionBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  const [challenge] = await db
    .select()
    .from(challengesTable)
    .where(eq(challengesTable.id, params.data.id));

  if (!challenge) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  const sim = getSimulation(challenge.simulationSlug);
  const learner = await getOrCreateLearner(body.data.learnerId);
  const correct = body.data.choiceId === challenge.correctChoiceId;
  const xpAwarded = xpForResult(challenge.difficulty, correct);
  const newStreak = correct ? learner.streak + 1 : 0;
  const newTotalXp = learner.totalXp + xpAwarded;
  const newLevel = levelFromXp(newTotalXp);

  await db.insert(attemptsTable).values({
    challengeId: challenge.id,
    learnerId: learner.id,
    choiceId: body.data.choiceId,
    correct,
    xpAwarded,
  });

  await db
    .update(learnersTable)
    .set({
      totalXp: newTotalXp,
      level: newLevel,
      streak: newStreak,
      bestStreak: Math.max(learner.bestStreak, newStreak),
      challengesCompleted: learner.challengesCompleted + 1,
      challengesCorrect: learner.challengesCorrect + (correct ? 1 : 0),
      updatedAt: new Date(),
    })
    .where(eq(learnersTable.id, learner.id));

  const encouragement = await generateEncouragement({
    correct,
    topic: challenge.topic,
    careerTitle: sim?.title ?? "professional",
    streak: newStreak,
  });

  res.json(
    SubmitMissionResponse.parse({
      missionId: challenge.id,
      correct,
      correctChoiceId: challenge.correctChoiceId,
      explanation: challenge.explanation,
      encouragement,
      xpAwarded,
      newStreak,
      newLevel,
      newTotalXp,
    }),
  );
});

router.post("/missions/:id/hint", async (req, res): Promise<void> => {
  const params = GetMissionHintParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [challenge] = await db
    .select()
    .from(challengesTable)
    .where(eq(challengesTable.id, params.data.id));

  if (!challenge) {
    res.status(404).json({ error: "Mission not found" });
    return;
  }

  const sim = getSimulation(challenge.simulationSlug);
  const hint = await generateHint({
    scenario: challenge.scenario,
    problem: challenge.problem,
    question: challenge.question,
    topic: challenge.topic,
    careerTitle: sim?.title ?? "professional",
  });

  res.json(GetMissionHintResponse.parse({ hint }));
});

export default router;
