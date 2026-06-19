import { Router, type IRouter } from "express";
import OpenAI from "openai";
import { db, darioSessionsTable } from "@workspace/db";
import { desc, sql } from "drizzle-orm";

const router: IRouter = Router();

function getClient(): OpenAI {
  return new OpenAI({
    baseURL: process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"],
    apiKey:  process.env["AI_INTEGRATIONS_OPENAI_API_KEY"] ?? "placeholder",
  });
}

/* ── Activity log payload type ── */
interface ActivityLog {
  userId: string;
  userName: string;
  userEmail: string;
  sessionId: string;
  sessionTitle: string;
  school?: string;
  graduationYear?: number;
  gpa?: string;
  sat?: string;
  careerInterest?: string;
  careersDiscussed: string[];
  messageCount: number;
  conversationExcerpt?: { role: string; content: string }[];
  opportunitiesSearched: string[];
  actionItemCount: number;
  roadmapMilestoneCount?: number;
  totalSessionsCount?: number;
  allCareersEver?: string[];
  personalityGenerated: boolean;
  reportGenerated: boolean;
  sessionStartedAt?: string;
  sessionEndedAt?: string;
}

/* ── Prompts ── */
const DARIO_SYSTEM = `You are Dario, a warm, knowledgeable, and encouraging AI career guidance counselor at 1WayMirror — a career exploration platform for high school students.

Your personality:
- Friendly, conversational, enthusiastic about helping students find their path
- Ask thoughtful follow-up questions to better understand the student
- Share honest, research-based information about careers
- Be encouraging but realistic
- Keep responses concise — 2-4 sentences per message, never more than a short paragraph
- Speak naturally like a real person — use contractions, be warm and direct

Your goals:
1. Learn about the student's interests, strengths, values, and preferences through natural conversation
2. Help them explore career paths that align with who they are
3. Give concrete information about careers: average salaries, growth outlooks, education requirements, day-to-day work
4. After gathering enough information, suggest 2-3 specific career paths they should explore on 1WayMirror
5. When wrapping up a session, briefly summarize the careers discussed

Guidelines:
- Ask one question at a time
- Reference specific careers by name when discussing them (e.g. "biomedical engineer", "data analyst", "nurse practitioner")
- When a student shows interest in a career area, mention 1-2 related careers they may not have considered
- Use "you" language — make it personal
- Don't use bullet lists — conversational paragraphs only
- When you mention specific career names, note them in your responses naturally

Start with a warm, brief introduction and ONE engaging opening question.`;

const ROADMAP_SYSTEM = `You are Dario, an AI career counselor. Based on a student's conversation history, generate a detailed 5-phase career roadmap.

Return a JSON array of milestone objects. Each milestone:
{
  "phase": "0-3mo" | "3-6mo" | "6-12mo" | "1-3yr" | "3-5yr",
  "phaseLabel": "Now — 3 months" | "3 — 6 months" | "6 — 12 months" | "1 — 3 years" | "3 — 5 years",
  "title": "Short action title",
  "description": "1-2 sentence description of what to do and why"
}

Include 2-3 milestones per phase. Focus on concrete, actionable steps specific to the careers discussed.
Return ONLY the JSON array, no other text.`;

const COMPARE_SYSTEM = `You are a career research expert. Compare two careers for a high school student making a decision.

Return a JSON object with EXACTLY this structure:
{
  "career1": {
    "name": "Career name",
    "avgSalary": "$XX,000/yr",
    "salaryRange": "$XX,000 – $XX,000",
    "jobGrowth": "+XX% (faster than average)",
    "educationRequired": "Bachelor's degree in ...",
    "keySkills": ["Skill 1", "Skill 2", "Skill 3", "Skill 4"],
    "prosForStudents": "1-2 sentence summary of why this career is appealing for a student starting out",
    "typicalDay": "1 sentence describing what you actually do day-to-day",
    "entryLevel": "What entry-level jobs look like and typical starting salary"
  },
  "career2": { same structure }
}

Return ONLY valid JSON, no markdown, no extra text.`;

const PERSONALITY_SYSTEM = `You are Dario, an AI career counselor. Analyze this student's conversation history and return a personality and work-style profile.

Return a JSON object with EXACTLY this structure:
{
  "summary": "2-3 sentence overall personality summary written directly to the student (use 'you/your')",
  "traits": [
    { "name": "Trait Name", "score": 85, "description": "1 sentence about how this trait shows up in them" }
  ],
  "workStyle": "2 sentence description of how they like to work — collaborative vs. solo, creative vs. structured, etc.",
  "strengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4"],
  "careerCorrelations": ["Career 1", "Career 2", "Career 3", "Career 4"],
  "learningStyle": "1-2 sentence description of how they learn best based on the conversation",
  "motivators": ["What drives them 1", "What drives them 2", "What drives them 3"]
}

Include 5-7 traits. Score is 0-100 representing how strongly this trait was observed.
Traits to consider: Analytical Thinker, Creative Problem Solver, People-Oriented, Detail-Focused, Big Picture Thinker, Leadership Drive, Empathy, Curiosity, Resilience, Communication, Entrepreneurial Spirit, Technical Aptitude.
Return ONLY valid JSON, no markdown, no extra text.`;

const REPORT_SYSTEM = `You are Dario, an AI career counselor. Generate a comprehensive career exploration report for a student.

Return a JSON object with EXACTLY this structure:
{
  "headline": "Short 8-10 word headline capturing their career direction (e.g. 'A Natural Problem-Solver Drawn to Healthcare and Tech')",
  "overallSummary": "3-4 sentence summary of who this student is and where they're headed",
  "careerMatches": [
    { "career": "Career Name", "fit": 92, "reason": "1-2 sentences on why this career fits them" }
  ],
  "personalitySummary": "2 sentences on their personality as it relates to career",
  "keyStrengths": ["Strength 1", "Strength 2", "Strength 3", "Strength 4", "Strength 5"],
  "areasToExplore": ["Area or question they should think about 1", "Area 2", "Area 3"],
  "educationRecommendations": ["Specific recommendation 1", "Specific recommendation 2", "Specific recommendation 3"],
  "nextSteps": ["Concrete next step 1", "Concrete next step 2", "Concrete next step 3", "Concrete next step 4"]
}

Include 3-5 career matches with fit scores 0-100. Be specific and personalized.
Return ONLY valid JSON, no markdown, no extra text.`;

const OPPORTUNITIES_SYSTEM = `You are Dario, a career guidance AI. A high school student is looking for real-world career experience opportunities.

Given their location and career interest, generate a list of 4 realistic local organizations where they could find internships, job shadowing, volunteer work, or entry-level positions. These should be plausible organizations for that region and field (hospitals, engineering firms, tech companies, law firms, etc.).

For each opportunity, also write a professional, personalized outreach email the student can send to request the opportunity.

Return a JSON array with this structure:
[
  {
    "orgName": "Organization Name",
    "type": "internship" | "job-shadowing" | "volunteer" | "entry-level",
    "location": "City, State",
    "careerField": "Career field",
    "description": "1-2 sentences about this org and what the student would do there",
    "contactName": "Realistic first and last name of a hiring contact or HR person",
    "contactTitle": "Their job title",
    "contactEmail": "realistic.name@orgname.com",
    "emailSubject": "Subject line for the outreach email",
    "emailDraft": "Full professional email from the student to this person requesting the opportunity. Include placeholder [Student Name] and [Student Email] where appropriate. Keep it genuine, enthusiastic, and under 200 words."
  }
]

Return ONLY valid JSON array, no markdown, no extra text.`;

const ACTION_ITEMS_SYSTEM = `You are Dario, an AI career counselor. Based on a student's career conversation history, generate a list of concrete, actionable next steps they should take in the next 30-60 days.

Return a JSON array with this structure:
[
  {
    "title": "Short action title (under 8 words)",
    "description": "1-2 sentence description of exactly what to do and why it matters",
    "category": "research" | "experience" | "skills" | "network" | "apply",
    "dueDate": "YYYY-MM-DD (within the next 30-60 days from today)"
  }
]

Generate 6-8 action items. Mix categories — don't give all research items. Make them specific to the careers discussed.
Return ONLY valid JSON array, no markdown, no extra text.`;

/* ── POST /api/dario/chat ── */
router.post("/dario/chat", async (req, res) => {
  try {
    const { messages, pastContext } = req.body as {
      messages: { role: string; content: string }[];
      pastContext?: string;
    };
    if (!Array.isArray(messages)) {
      res.status(400).json({ error: "messages array required" });
      return;
    }

    const systemContent = pastContext && pastContext.trim().length > 0
      ? `${DARIO_SYSTEM}

---
MEMORY — THIS STUDENT'S PREVIOUS SESSIONS WITH YOU:
${pastContext}

Use this memory to:
- Greet returning students warmly and reference what you talked about before (e.g. "Last time we were exploring biomedical engineering — how did you feel about that?")
- Avoid repeating questions you've already covered in past sessions
- Build on interests and details the student has already shared
- Feel free to refer back to specific things they said or careers they seemed excited about
Do NOT re-introduce yourself as if it's the first time meeting. This is a returning student.`
      : DARIO_SYSTEM;

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemContent },
        ...messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
      ],
      max_tokens: 300,
      temperature: 0.85,
    });

    const message = completion.choices[0]?.message?.content ?? "I'm here to help you explore your career path. What interests you most?";
    res.json({ message });
  } catch (err) {
    req.log.error({ err }, "dario/chat error");
    res.status(500).json({ error: "AI service unavailable", message: "I'm having a quick technical issue. Please try again in a moment!" });
  }
});

/* ── POST /api/dario/roadmap ── */
router.post("/dario/roadmap", async (req, res) => {
  try {
    const { sessionMessages, careersDiscussed } = req.body as {
      sessionMessages: { role: string; content: string }[];
      careersDiscussed: string[];
    };

    const conversationSummary = sessionMessages
      .slice(-12)
      .map(m => `${m.role === "user" ? "Student" : "Dario"}: ${m.content}`)
      .join("\n");

    const userPrompt = `Based on this career counseling conversation, generate a roadmap for a student interested in: ${careersDiscussed.join(", ") || "careers discussed below"}.

Conversation:
${conversationSummary}

Generate specific milestones based on the actual careers and interests discussed.`;

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ROADMAP_SYSTEM },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 1200,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const milestones = JSON.parse(cleaned) as { phase: string; phaseLabel: string; title: string; description: string }[];
    res.json({ milestones });
  } catch (err) {
    req.log.error({ err }, "dario/roadmap error");
    res.status(500).json({ error: "Roadmap generation failed", milestones: [] });
  }
});

/* ── POST /api/dario/compare ── */
router.post("/dario/compare", async (req, res) => {
  try {
    const { career1, career2 } = req.body as { career1: string; career2: string };
    if (!career1 || !career2) {
      res.status(400).json({ error: "career1 and career2 required" });
      return;
    }

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: COMPARE_SYSTEM },
        { role: "user", content: `Compare these two careers for a high school student: "${career1}" vs "${career2}"` },
      ],
      max_tokens: 800,
      temperature: 0.5,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "dario/compare error");
    res.status(500).json({ error: "Comparison failed" });
  }
});

/* ── POST /api/dario/personality ── */
router.post("/dario/personality", async (req, res) => {
  try {
    const { allMessages } = req.body as { allMessages: { role: string; content: string }[] };
    if (!Array.isArray(allMessages) || allMessages.length < 2) {
      res.status(400).json({ error: "At least 2 messages required for personality analysis" });
      return;
    }

    const conversation = allMessages
      .slice(0, 40)
      .map(m => `${m.role === "user" ? "Student" : "Dario"}: ${m.content}`)
      .join("\n");

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: PERSONALITY_SYSTEM },
        { role: "user", content: `Analyze this student's personality based on their conversation with Dario:\n\n${conversation}` },
      ],
      max_tokens: 800,
      temperature: 0.65,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "dario/personality error");
    res.status(500).json({ error: "Personality analysis failed" });
  }
});

/* ── POST /api/dario/career-report ── */
router.post("/dario/career-report", async (req, res) => {
  try {
    const { allMessages, careersDiscussed, sessionCount } = req.body as {
      allMessages: { role: string; content: string }[];
      careersDiscussed: string[];
      sessionCount: number;
    };

    if (!Array.isArray(allMessages) || allMessages.length < 2) {
      res.status(400).json({ error: "At least one completed session required" });
      return;
    }

    const conversation = allMessages
      .slice(0, 50)
      .map(m => `${m.role === "user" ? "Student" : "Dario"}: ${m.content}`)
      .join("\n");

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: REPORT_SYSTEM },
        { role: "user", content: `Generate a career report for this student. Careers discussed: ${careersDiscussed.join(", ") || "various"}. Sessions completed: ${sessionCount}.\n\nConversation excerpt:\n${conversation}` },
      ],
      max_tokens: 1000,
      temperature: 0.65,
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const result = JSON.parse(cleaned);
    res.json({ ...result, sessionCount, careersExplored: careersDiscussed });
  } catch (err) {
    req.log.error({ err }, "dario/career-report error");
    res.status(500).json({ error: "Career report generation failed" });
  }
});

/* ── POST /api/dario/opportunities ── */
router.post("/dario/opportunities", async (req, res) => {
  try {
    const { location, careerInterest, opportunityType, studentName, studentEmail } = req.body as {
      location: string;
      careerInterest: string;
      opportunityType: string;
      studentName: string;
      studentEmail: string;
    };
    if (!location || !careerInterest) {
      res.status(400).json({ error: "location and careerInterest required" });
      return;
    }

    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: OPPORTUNITIES_SYSTEM },
        { role: "user", content: `Find ${opportunityType || "various"} opportunities for a high school student interested in ${careerInterest} near ${location}. The student's name is ${studentName || "[Student Name]"} and their email is ${studentEmail || "[Student Email]"}.` },
      ],
      max_tokens: 1500,
      temperature: 0.8,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const opportunities = JSON.parse(cleaned) as object[];
    res.json({ opportunities });
  } catch (err) {
    req.log.error({ err }, "dario/opportunities error");
    res.status(500).json({ error: "Opportunity search failed" });
  }
});

/* ── POST /api/dario/action-items ── */
router.post("/dario/action-items", async (req, res) => {
  try {
    const { allMessages, careersDiscussed } = req.body as {
      allMessages: { role: string; content: string }[];
      careersDiscussed: string[];
    };

    if (!Array.isArray(allMessages) || allMessages.length < 2) {
      res.status(400).json({ error: "At least one completed session required" });
      return;
    }

    const conversation = allMessages
      .slice(0, 40)
      .map(m => `${m.role === "user" ? "Student" : "Dario"}: ${m.content}`)
      .join("\n");

    const today = new Date().toISOString().split("T")[0];
    const client = getClient();
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: ACTION_ITEMS_SYSTEM },
        { role: "user", content: `Today is ${today}. Generate action items for a student interested in: ${careersDiscussed.join(", ") || "careers discussed"}.\n\nConversation:\n${conversation}` },
      ],
      max_tokens: 900,
      temperature: 0.7,
    });

    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const items = JSON.parse(cleaned) as { title: string; description: string; category: string; dueDate?: string }[];
    res.json({ items });
  } catch (err) {
    req.log.error({ err }, "dario/action-items error");
    res.status(500).json({ error: "Action items generation failed" });
  }
});

/* ── POST /api/dario/log-activity ── */
router.post("/dario/log-activity", async (req, res) => {
  try {
    const log = req.body as ActivityLog;
    if (!log.sessionId) { res.status(400).json({ error: "sessionId required" }); return; }

    await db.insert(darioSessionsTable).values({
      sessionId:             log.sessionId,
      userId:                log.userId,
      userName:              log.userName,
      userEmail:             log.userEmail,
      sessionTitle:          log.sessionTitle,
      school:                log.school ?? "",
      graduationYear:        log.graduationYear ?? null,
      gpa:                   log.gpa ?? "",
      sat:                   log.sat ?? "",
      careerInterest:        log.careerInterest ?? "",
      careersDiscussed:      log.careersDiscussed,
      messageCount:          log.messageCount,
      conversationExcerpt:   log.conversationExcerpt ?? [],
      opportunitiesSearched: log.opportunitiesSearched,
      actionItemCount:       log.actionItemCount,
      roadmapMilestoneCount: log.roadmapMilestoneCount ?? 0,
      totalSessionsCount:    log.totalSessionsCount ?? 1,
      allCareersEver:        log.allCareersEver ?? log.careersDiscussed,
      personalityGenerated:  log.personalityGenerated,
      reportGenerated:       log.reportGenerated,
      sessionStartedAt:      log.sessionStartedAt ?? "",
      sessionEndedAt:        log.sessionEndedAt ?? "",
    }).onConflictDoUpdate({
      target: darioSessionsTable.sessionId,
      set: {
        careersDiscussed:      sql`excluded.careers_discussed`,
        messageCount:          sql`excluded.message_count`,
        conversationExcerpt:   sql`excluded.conversation_excerpt`,
        opportunitiesSearched: sql`excluded.opportunities_searched`,
        actionItemCount:       sql`excluded.action_item_count`,
        roadmapMilestoneCount: sql`excluded.roadmap_milestone_count`,
        totalSessionsCount:    sql`excluded.total_sessions_count`,
        allCareersEver:        sql`excluded.all_careers_ever`,
        personalityGenerated:  sql`excluded.personality_generated`,
        reportGenerated:       sql`excluded.report_generated`,
        sessionEndedAt:        sql`excluded.session_ended_at`,
        loggedAt:              sql`now()`,
      },
    });

    res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "dario/log-activity error");
    res.status(500).json({ error: "Failed to log activity" });
  }
});

/* ── GET /api/dario/activity ── */
router.get("/dario/activity", async (req, res) => {
  const pin = req.headers["x-admin-pin"] as string;
  if (!pin || pin.length < 4) { res.status(401).json({ error: "Admin PIN required" }); return; }
  try {
    const logs = await db.select().from(darioSessionsTable)
      .orderBy(desc(darioSessionsTable.loggedAt))
      .limit(500);
    res.json({ logs });
  } catch (err) {
    req.log.error({ err }, "dario/activity error");
    res.status(500).json({ error: "Failed to load activity" });
  }
});

export default router;
