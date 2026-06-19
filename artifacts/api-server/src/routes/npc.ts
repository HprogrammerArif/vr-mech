import { Router, type IRouter } from "express";
import { z } from "zod";
import { openai } from "../lib/openai";

const router: IRouter = Router();

const ChatBody = z.object({
  npcName: z.string(),
  npcRole: z.string(),
  npcCategory: z.string(),
  npcTagline: z.string(),
  question: z.string().max(500),
});

router.post("/npc/chat", async (req, res): Promise<void> => {
  const parsed = ChatBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { npcName, npcRole, npcCategory, npcTagline, question } = parsed.data;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You are ${npcName}, a ${npcRole} in the ${npcCategory} field (${npcTagline}). You are standing in a 3D career city helping students explore career paths. Give a brief, enthusiastic, real, and encouraging response (2–4 sentences). Focus on practical insights, your personal experience, and actionable advice relevant to the student's question. Sound like a real person, not a textbook. Keep it conversational and specific to ${npcCategory}.`,
        },
        {
          role: "user",
          content: question,
        },
      ],
    });

    const reply = completion.choices[0]?.message?.content ?? "That's a great question! Keep exploring this path.";
    res.json({ reply });
  } catch (err) {
    req.log.error({ err }, "NPC chat error");
    res.status(500).json({ error: "Could not generate response" });
  }
});

export default router;
