/* ─────────────────────────────────────────────────────────
   AI-powered moderation pipeline — Tier 1-4 classification
   Hybrid: regex pre-filter → Claude Haiku for ambiguous cases
   ───────────────────────────────────────────────────────── */
import Anthropic from "@anthropic-ai/sdk";

export type ModerationTier = 1 | 2 | 3 | 4;

export interface ModerationResult {
  tier: ModerationTier;
  category: string;
  reasoning: string;
  contactExchange: boolean;
  detectedPatterns: string[];
  requiresHumanReview: boolean;
  trustScoreImpact: number;
}

function getClient(): Anthropic {
  return new Anthropic({
    baseURL: process.env["AI_INTEGRATIONS_ANTHROPIC_BASE_URL"],
    apiKey: process.env["AI_INTEGRATIONS_ANTHROPIC_API_KEY"] ?? "placeholder",
  });
}

/* ── Tier 4 keyword patterns (immediate escalation) ── */
const TIER4_PATTERNS = [
  /\b(csam|child\s+porn|nude\s+photo|naked\s+pic|send\s+nudes?)\b/i,
  /\b(kill\s+(you|him|her|them)|threat(en)?)\b/i,
  /\b(meet\s+me\s+(alone|tonight|secretly))\b/i,
];

/* ── Tier 3 patterns ── */
const TIER3_PATTERNS = [
  /\b(don'?t\s+tell\s+anyone|keep\s+this\s+secret|just\s+between\s+us)\b/i,
  /\b(when\s+i\s+was\s+your\s+age|back\s+in\s+college|i('?m|'?\s+am)\s+\d{2}\s+years?\s+old)\b/i,
  /\b(send\s+me\s+(a\s+)?photo|pic(ture)?s?\s+of\s+you|selfie)\b/i,
  /\b(gift\s+card|send\s+money|venmo|cashapp|i'?ll\s+pay\s+you)\b/i,
  /\b(you'?re?\s+so\s+(mature|special|different)|not\s+like\s+other\s+kids)\b/i,
  /\b(sexual|sex\b|porn|xxx|horny|sexy|turn(ed)?\s+on)\b/i,
];

/* ── Tier 2 patterns ── */
const TIER2_PATTERNS = [
  /\b(stupid|idiot|dumb|loser|ugly|fat|hate\s+you)\b/i,
  /\b(shut\s+up|go\s+away|nobody\s+likes\s+you)\b/i,
  /\bshare\s+(your\s+)?(info|details|address|location)\b/i,
];

/* ── Contact exchange patterns ── */
const CONTACT_PATTERNS = [
  /\b\d{3}[\s.\-()]*\d{3}[\s.\-]*\d{4}\b/,
  /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/,
  /@[a-zA-Z0-9._]{2,30}\b/,
  /\b(snapchat|instagram|discord|whatsapp|telegram|tiktok|twitter|facebook)\b/i,
  /\b(text\s+me|dm\s+me|add\s+me|follow\s+me)\b/i,
  /\b(my\s+(number|phone|snap|insta|discord|email)\s+(is|:))/i,
];

function checkPatterns(text: string, patterns: RegExp[]): string[] {
  const found: string[] = [];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) found.push(m[0]);
  }
  return found;
}

const AI_MODERATION_PROMPT = `You are a content safety classifier for a platform exclusively serving students ages 12-18. Classify the following message into one safety tier. Respond with JSON only — no markdown, no extra text.

Tiers:
- Tier 1: Safe or mildly off-topic (no action needed)
- Tier 2: Harassment, repeated contact requests, pressuring for personal info
- Tier 3: Grooming patterns, sexual content, age inconsistency, requests for photos/money, secrecy requests, isolation attempts
- Tier 4: Sexual solicitation of a minor, CSAM, violence threats, confirmed adult posing as minor

Message: "{MESSAGE}"

Respond with JSON only:
{
  "tier": <1|2|3|4>,
  "category": "<brief category label>",
  "reasoning": "<1-2 sentence explanation>",
  "requiresHumanReview": <true|false>
}`;

export async function classifyMessage(
  text: string,
  _conversationContext: Array<{ role: string; content: string }> = []
): Promise<ModerationResult> {
  const contactDetected = checkPatterns(text, CONTACT_PATTERNS);
  const tier4Hits = checkPatterns(text, TIER4_PATTERNS);
  const tier3Hits = checkPatterns(text, TIER3_PATTERNS);
  const tier2Hits = checkPatterns(text, TIER2_PATTERNS);

  /* Fast-path for definite Tier 4 */
  if (tier4Hits.length > 0) {
    return {
      tier: 4,
      category: "severe_violation",
      reasoning: `Matched critical safety pattern: ${tier4Hits[0]}`,
      contactExchange: contactDetected.length > 0,
      detectedPatterns: tier4Hits,
      requiresHumanReview: true,
      trustScoreImpact: -100,
    };
  }

  /* Fast-path for definite Tier 3 (multiple indicators) */
  if (tier3Hits.length >= 2) {
    return {
      tier: 3,
      category: "grooming_or_sexual",
      reasoning: `Multiple Tier 3 indicators detected: ${tier3Hits.join(", ")}`,
      contactExchange: contactDetected.length > 0,
      detectedPatterns: tier3Hits,
      requiresHumanReview: true,
      trustScoreImpact: -50,
    };
  }

  /* Use Claude Haiku for ambiguous cases */
  const needsAI = tier3Hits.length > 0 || tier2Hits.length > 0 || contactDetected.length > 0;

  if (needsAI) {
    try {
      const client = getClient();
      const prompt = AI_MODERATION_PROMPT.replace("{MESSAGE}", text.slice(0, 500));

      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 256,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const raw = message.content[0]?.type === "text" ? message.content[0].text : "{}";
      const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as {
        tier: ModerationTier;
        category: string;
        reasoning: string;
        requiresHumanReview: boolean;
      };

      const impactMap: Record<ModerationTier, number> = { 1: 0, 2: -15, 3: -50, 4: -100 };

      return {
        tier: parsed.tier ?? 1,
        category: parsed.category ?? "general",
        reasoning: parsed.reasoning ?? "AI classification",
        contactExchange: contactDetected.length > 0,
        detectedPatterns: [...tier3Hits, ...tier2Hits, ...contactDetected],
        requiresHumanReview: parsed.requiresHumanReview ?? parsed.tier >= 3,
        trustScoreImpact: impactMap[parsed.tier ?? 1],
      };
    } catch {
      /* Fall back to regex result on AI failure */
      const fallbackTier: ModerationTier = tier3Hits.length > 0 ? 3 : tier2Hits.length > 0 ? 2 : 1;
      const impactMap: Record<ModerationTier, number> = { 1: 0, 2: -15, 3: -50, 4: -100 };
      return {
        tier: fallbackTier,
        category: "pattern_match",
        reasoning: "Regex pattern match (AI unavailable)",
        contactExchange: contactDetected.length > 0,
        detectedPatterns: [...tier3Hits, ...tier2Hits, ...contactDetected],
        requiresHumanReview: fallbackTier >= 3,
        trustScoreImpact: impactMap[fallbackTier],
      };
    }
  }

  /* Tier 1 — safe */
  return {
    tier: 1,
    category: "safe",
    reasoning: "No safety concerns detected",
    contactExchange: false,
    detectedPatterns: [],
    requiresHumanReview: false,
    trustScoreImpact: 0,
  };
}
