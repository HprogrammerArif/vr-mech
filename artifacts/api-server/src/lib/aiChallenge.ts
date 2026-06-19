import { openai } from "./openai";
import type { SimulationDefinition } from "./simulations";

export type GeneratedChoice = { id: string; text: string; rationale?: string | null };
export type GeneratedScene = {
  environment: string;
  params: Record<string, unknown>;
};

export type GeneratedMission = {
  topic: string;
  title: string;
  roleIntro: string;
  scenario: string;
  problem: string;
  constraints: string[];
  question: string;
  units: string | null;
  choices: GeneratedChoice[];
  correctChoiceId: string;
  explanation: string;
  scene: GeneratedScene;
};

const ID_OPTIONS = ["a", "b", "c", "d"];

const ROLE_PERSPECTIVES = [
  "a first-year professional who just landed this job and is handling a real challenge solo for the first time",
  "a mid-level practitioner with 3-5 years of experience who is the go-to person on the team for this type of problem",
  "a senior specialist called in to advise on a high-stakes situation",
  "a team lead or supervisor responsible for making the final call and guiding junior staff",
  "an independent consultant hired by a client to diagnose and solve a specific problem",
  "a department manager who must balance competing priorities and make a resource decision",
  "an inspector or compliance officer evaluating whether standards are being met",
  "a project lead coordinating with multiple stakeholders to hit a critical deadline",
];

const SYSTEM_PROMPT = `You design immersive, realistic CAREER MISSIONS for a high school student exploring careers on the 1WayMirror platform.

A mission puts the student INSIDE a workplace, gives them a real-world problem with constraints, and asks them to make a single high-impact decision. It is NOT a textbook quiz.

Every mission MUST:
- Be solvable using common sense, basic math, or one career-relevant principle. NEVER PhD-level depth.
- Be calibrated to the requested difficulty (1 = very approachable, 10 = challenging but still high-school appropriate).
- Use the EXACT career, role, environment, and topics provided. Do not switch careers.
- Place the student in a VARIED professional role — sometimes a junior hire, sometimes a consultant, manager, team lead, inspector, or independent expert. Use the role perspective provided in the user prompt.
- Set up a vivid concrete situation: who the student is, where they are, what just happened, and what is at stake.
- List 2-4 specific constraints (budget, time, safety, customer expectations, ethics, regulations, equipment, weather, etc).
- Have exactly four answer choices that are all defensible-sounding decisions a real professional might consider — only one is the BEST choice. Distractors should be tempting traps (impressive but wrong, fast but unsafe, cheap but illegal, etc).
- Provide a short rationale (one phrase) on each choice describing the kind of mistake or insight it represents.
- Tone: vivid, friendly, professional, never preachy. No emojis.

Return ONLY valid JSON matching this exact shape (no prose, no markdown):
{
  "topic": "<one short topic from the provided list>",
  "title": "<5-7 word action-oriented mission title>",
  "roleIntro": "<one sentence naming the student's specific role and realistic setting in plain English, matching the role perspective given. E.g. 'You are the lead consultant called in by Meridian Hospital to audit their supply chain.' Never use the environment kind slug verbatim.>",
  "scenario": "<2-3 sentences setting up what just happened>",
  "problem": "<one sharp sentence stating the core problem>",
  "constraints": ["<constraint 1>", "<constraint 2>", "<constraint 3>"],
  "question": "<the precise decision the student must make>",
  "units": "<unit string for a numeric answer, or null>",
  "choices": [
    { "id": "a", "text": "<option a>", "rationale": "<why someone might pick this>" },
    { "id": "b", "text": "<option b>", "rationale": "<why someone might pick this>" },
    { "id": "c", "text": "<option c>", "rationale": "<why someone might pick this>" },
    { "id": "d", "text": "<option d>", "rationale": "<why someone might pick this>" }
  ],
  "correctChoiceId": "a" | "b" | "c" | "d",
  "explanation": "<2-4 sentence walkthrough explaining WHY the right choice wins and what the others sacrifice>",
  "scene": { "environment": "<the exact environment kind provided>", "params": { ... iconic 3D props/labels/colors that match the scenario, for example: { "stationLabel": "Bay 3", "highlight": "panel" } ... } }
}`;

function safeJsonParse(content: string): Record<string, unknown> | null {
  const fenced = content.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : content;
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function coerceMission(raw: unknown, environment: string): GeneratedMission | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const str = (v: unknown) => (typeof v === "string" ? v : null);
  const arrStr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

  const topic = str(r.topic);
  const title = str(r.title);
  const roleIntro = str(r.roleIntro) ?? "";
  const scenario = str(r.scenario);
  const problem = str(r.problem) ?? "";
  const constraints = arrStr(r.constraints);
  const question = str(r.question);
  const explanation = str(r.explanation);
  const units = typeof r.units === "string" ? r.units : null;

  const rawChoices = Array.isArray(r.choices) ? r.choices : null;
  if (!topic || !title || !scenario || !question || !explanation || !rawChoices || rawChoices.length !== 4)
    return null;

  const choices: GeneratedChoice[] = [];
  for (let i = 0; i < 4; i += 1) {
    const c = rawChoices[i] as Record<string, unknown>;
    const id =
      typeof c?.id === "string" && ID_OPTIONS.includes(c.id) ? c.id : ID_OPTIONS[i];
    const text = typeof c?.text === "string" && c.text.trim().length > 0 ? c.text : null;
    if (!text) return null;
    const rationale =
      typeof c?.rationale === "string" && c.rationale.trim().length > 0
        ? c.rationale
        : null;
    choices.push({ id, text, rationale });
  }

  const correctChoiceId =
    typeof r.correctChoiceId === "string" &&
    choices.some((c) => c.id === r.correctChoiceId)
      ? (r.correctChoiceId as string)
      : null;
  if (!correctChoiceId) return null;

  const scene = (r.scene as Record<string, unknown> | undefined) ?? {};
  const params =
    scene?.params && typeof scene.params === "object"
      ? (scene.params as Record<string, unknown>)
      : {};

  return {
    topic,
    title,
    roleIntro,
    scenario,
    problem,
    constraints: constraints.slice(0, 4),
    question,
    units,
    choices,
    correctChoiceId,
    explanation,
    scene: { environment, params },
  };
}

export async function generateMission(input: {
  simulation: SimulationDefinition;
  difficulty: number;
  avoidTopics?: string[];
}): Promise<GeneratedMission> {
  const sim = input.simulation;
  const rolePerspective = ROLE_PERSPECTIVES[Math.floor(Math.random() * ROLE_PERSPECTIVES.length)];
  const userPrompt = `Generate ONE career mission.

CAREER: ${sim.title} (${sim.category})
TAGLINE: ${sim.tagline}
DESCRIPTION: ${sim.description}
TOPICS YOU CAN USE: ${sim.topics.join("; ")}
ENVIRONMENT KIND (use this exact value ONLY in scene.environment, NEVER write this slug into roleIntro/scenario): ${sim.environment}
DIFFICULTY: ${input.difficulty} on a scale of 1 (very approachable) to 10 (challenging high schooler).
ROLE PERSPECTIVE: Place the student as ${rolePerspective}.
${
  input.avoidTopics && input.avoidTopics.length > 0
    ? `AVOID these recently-used topics: ${input.avoidTopics.join("; ")}.`
    : ""
}

Return ONLY the JSON object.`;

  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 1600,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "";
  const parsed = safeJsonParse(content);
  const coerced = coerceMission(parsed, sim.environment);
  if (!coerced) {
    throw new Error("AI returned an unparseable mission: " + content.slice(0, 200));
  }
  return coerced;
}

export async function generateHint(input: {
  scenario: string;
  problem: string;
  question: string;
  topic: string;
  careerTitle: string;
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.4",
    max_completion_tokens: 220,
    messages: [
      {
        role: "system",
        content:
          "You are a patient, professional mentor for a high school student exploring careers. Give ONE short hint (1-2 sentences) that nudges the learner toward the right approach without revealing the answer. Reference the relevant principle, framework, or rule of thumb a working professional would use. No emojis.",
      },
      {
        role: "user",
        content: `Career: ${input.careerTitle}\nTopic: ${input.topic}\nScenario: ${input.scenario}\nProblem: ${input.problem}\nQuestion: ${input.question}\n\nGive me one short hint.`,
      },
    ],
  });
  const text = response.choices[0]?.message?.content?.trim();
  return (
    text ||
    "Think about what a working professional would prioritize first — safety, the customer, or the long-term impact — and let that guide your decision."
  );
}

export async function generateEncouragement(input: {
  correct: boolean;
  topic: string;
  careerTitle: string;
  streak: number;
}): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 100,
    messages: [
      {
        role: "system",
        content:
          "You write a one-sentence, warm, age-appropriate note for a high school student practicing a career mission. No emojis. Reference the topic and career when it sounds natural.",
      },
      {
        role: "user",
        content: input.correct
          ? `The student just made the right call on a ${input.topic} mission as a ${input.careerTitle}. Their streak is now ${input.streak}. One short encouraging sentence.`
          : `The student just made the wrong call on a ${input.topic} mission as a ${input.careerTitle}. One short encouraging sentence reminding them mistakes are part of how professionals learn.`,
      },
    ],
  });
  return (
    response.choices[0]?.message?.content?.trim() ||
    (input.correct
      ? "Strong call — the next mission is on its way."
      : "Good attempt — the next mission is loading.")
  );
}
